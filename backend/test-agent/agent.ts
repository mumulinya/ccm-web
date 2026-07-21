import { runBrowserVerification } from "./browser-verifier";
import { collectBrowserProviderPreflight } from "./browser/registry";
import { createRecordingBrowserToolExecutor } from "./browser/tool-executor";
import { createBrowserResourceLifecycleRecorder } from "./browser/resource-lifecycle";
import { buildBrowserAuthenticationSummary } from "./browser/authentication-summary";
import { browserExistingSessionUsesMinimalEvidence } from "./browser/existing-session";
import { checksForProject, wantsBrowser } from "./browser/shared";
import {
  buildBrowserCheckExecutionPlan,
  reconcileBrowserCheckExecution,
} from "./browser/check-execution-coverage";
import { writeTestAgentArtifacts } from "./artifacts";
import { planVerificationCommands } from "./command-planner";
import { runVerificationCommands } from "./command-runner";
import { startDevServersForBrowserChecks } from "./dev-server";
import { runHttpVerification } from "./http-verifier";
import { buildTestAgentReport } from "./result-builder";
import { TestAgentReport, TestAgentRuntimeOptions, TestAgentWorkOrder } from "./types";
import { nowIso } from "./utils";
import { normalizeTestAgentWorkOrder } from "./work-order";
import { pruneTestAgentArtifacts } from "./artifact-retention";
import { selectRoleSkills } from "../skills/role-skills";
import { applyAgenticTestPlanning, planAgenticTestFollowup } from "./agentic-planner";

export async function runTestAgent(input: TestAgentWorkOrder, options: TestAgentRuntimeOptions = {}): Promise<TestAgentReport> {
  const startedAt = nowIso();
  const normalized = normalizeTestAgentWorkOrder(input, options);
  const agentic = await applyAgenticTestPlanning(normalized.workOrder, options);
  const planned = planVerificationCommands(agentic.workOrder, [...normalized.issues, ...agentic.issues]);
  const { workOrder, issues } = planned;
  const roleSkills = selectRoleSkills("test-agent", [
    workOrder.originalUserGoal,
    ...(workOrder.acceptanceCriteria || []),
    ...(workOrder.requiredChecks || []),
  ].join("\n"), { forceWork: true, phase: "verification" });
  workOrder.metadata = {
    ...workOrder.metadata,
    roleSkills: {
      schema: "ccm-role-skill-selection-v1",
      role: "test-agent",
      phase: "verification",
      applied: true,
      appliedBy: "ccm-native-test-agent-engine",
      selected: roleSkills.map(skill => ({ name: skill.name, kind: skill.kind, reason: skill.reason })),
    },
  };
  if (wantsBrowser(workOrder)) {
    workOrder.metadata = {
      ...workOrder.metadata,
      browserCheckExecutionPlan: buildBrowserCheckExecutionPlan(
        workOrder,
        options.browserProvider || workOrder.options.browserProvider,
      ),
    };
  }
  const suppressBrowserToolDetails = workOrder.projects.some(project =>
    checksForProject(project, workOrder.acceptanceCriteria).some(browserExistingSessionUsesMinimalEvidence)
  );
  const browserToolRecorder = options.browserToolExecutor
    ? createRecordingBrowserToolExecutor(
        options.browserToolExecutor,
        workOrder.options.artifactDir,
        {
          suppressDetails: suppressBrowserToolDetails,
          toolCallTimeoutMs: workOrder.options.browserTimeoutMs,
        },
      )
    : null;
  const browserResourceLifecycle = wantsBrowser(workOrder)
    ? createBrowserResourceLifecycleRecorder()
    : null;
  const runtimeOptions: TestAgentRuntimeOptions = {
    ...options,
    ...(browserToolRecorder ? {
      browserToolExecutor: browserToolRecorder.executor,
      browserToolCallScope: browserToolRecorder.runWithExecutionScope,
      browserToolCallIdsForExecution: browserToolRecorder.getRecordIdsForExecution,
    } : {}),
    ...(browserResourceLifecycle ? { browserResourceLifecycle } : {}),
  };
  const withRuntimeEnvironments = (source: typeof workOrder) => ({
    ...source,
    projects: source.projects.map(project => ({
      ...project,
      env: {
        ...(project.env || {}),
        ...(options.runtimeProjectEnvironments?.[project.name] || {}),
      },
    })),
  });
  const executionWorkOrder = withRuntimeEnvironments(workOrder);
  let commandResults = [] as Awaited<ReturnType<typeof runVerificationCommands>>;
  let devServers = [] as Awaited<ReturnType<typeof startDevServersForBrowserChecks>>;
  let httpResults = [] as Awaited<ReturnType<typeof runHttpVerification>>;
  let browserResults = [] as Awaited<ReturnType<typeof runBrowserVerification>>;
  let browserProviderPreflight = [] as Awaited<ReturnType<typeof collectBrowserProviderPreflight>>;

  try {
    browserProviderPreflight = await collectBrowserProviderPreflight(executionWorkOrder, runtimeOptions);
    workOrder.metadata = {
      ...workOrder.metadata,
      browserProviderPreflight,
    };
    commandResults = await runVerificationCommands(executionWorkOrder);
    devServers = await startDevServersForBrowserChecks(executionWorkOrder);
    httpResults = await runHttpVerification(executionWorkOrder);
    browserResults = await runBrowserVerification(executionWorkOrder, runtimeOptions);
    const followup = await planAgenticTestFollowup({ workOrder, commandResults, httpResults, browserResults }, runtimeOptions);
    workOrder.metadata = { ...workOrder.metadata, agenticFollowup: followup.metadata };
    if (followup.issue) issues.push(followup.issue);
    if (followup.workOrder) commandResults.push(...await runVerificationCommands(withRuntimeEnvironments(followup.workOrder)));
    workOrder.metadata = {
      ...workOrder.metadata,
      browserAuthenticationSummary: buildBrowserAuthenticationSummary(browserResults),
    };
  } catch (error: any) {
    issues.push({ severity: "error", code: "test_agent_runtime_error", message: error.message || String(error) });
  } finally {
    for (const server of devServers) {
      try { server.stop(); } catch {}
    }
  }

  const browserToolCalls = browserToolRecorder?.getRecords() || [];
  if (browserToolCalls.length && browserToolRecorder?.transcriptPath) {
    workOrder.metadata = {
      ...workOrder.metadata,
      browserToolTranscriptPath: browserToolRecorder.transcriptPath,
    };
  }
  const browserExecutionPlan = workOrder.metadata?.browserCheckExecutionPlan;
  if (browserExecutionPlan && !workOrder.metadata?.browserCheckExecutionCoverage) {
    const reconciled = reconcileBrowserCheckExecution(browserExecutionPlan, browserResults);
    browserResults = reconciled.results;
    workOrder.metadata = {
      ...workOrder.metadata,
      browserCheckExecutionCoverage: reconciled.summary,
    };
  }
  const report = buildTestAgentReport({
    workOrder,
    startedAt,
    issues,
    commandResults,
    devServerResults: devServers.map(server => server.result),
    httpResults,
    browserResults,
    browserToolCalls,
    browserResourceLifecycleEvents: browserResourceLifecycle?.getEvents() || [],
  });
  const written = writeTestAgentArtifacts(report);
  pruneTestAgentArtifacts({ excludeDirs: [written.artifactDir] });
  return written;
}
