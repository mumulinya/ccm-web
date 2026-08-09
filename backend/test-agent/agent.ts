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
import { testAgentPlanningIsBlocked, resolveTestAgentHardeningPolicy } from "./planning-fallback";
import { prepareTestAgentIsolation, type TestAgentIsolationSession } from "./isolation";
import { buildTestAgentReadonlyCapabilityManifest } from "./readonly-capabilities";
import { applyTestAgentIsolationExecutionGate } from "./isolation-execution-gate";

export async function runTestAgent(input: TestAgentWorkOrder, options: TestAgentRuntimeOptions = {}): Promise<TestAgentReport> {
  const startedAt = nowIso();
  const normalized = normalizeTestAgentWorkOrder(input, options);
  let isolatedSession: TestAgentIsolationSession | null = null;
  let planningInput = normalized.workOrder;
  let planningRuntimeOptions: TestAgentRuntimeOptions = { ...options };
  try {
    const hardeningPolicy = resolveTestAgentHardeningPolicy(normalized.workOrder);
    isolatedSession = await prepareTestAgentIsolation(normalized.workOrder, {
      riskLevel: hardeningPolicy.riskTier,
      mode: hardeningPolicy.isolationMode,
      executionId: normalized.workOrder.id,
    });
    planningInput = isolatedSession.workOrder;
    const selectedSkillNames = Array.isArray((planningInput.metadata as any)?.selectedSkills)
      ? (planningInput.metadata as any).selectedSkills
      : Array.isArray((planningInput.metadata as any)?.workflowDecision?.selectedSkills)
        ? (planningInput.metadata as any).workflowDecision.selectedSkills
        : [];
    const readonlyCapabilities = buildTestAgentReadonlyCapabilityManifest({
      targetName: planningInput.projects[0]?.name || "test-agent",
      workDir: planningInput.projects[0]?.workDir || "",
      taskText: [planningInput.originalUserGoal, ...(planningInput.acceptanceCriteria || [])].join("\n"),
      selectedSkillNames,
    });
    planningInput.metadata = {
      ...(planningInput.metadata || {}),
      verificationHardening: {
        ...((planningInput.metadata as any)?.verificationHardening || {}),
        readonlyCapabilityManifest: readonlyCapabilities.manifest,
        readonlyCapabilityRejected: {
          mcp: readonlyCapabilities.rejectedMcp,
          skill: readonlyCapabilities.rejectedSkills,
        },
      },
    };
    planningRuntimeOptions = {
      ...planningRuntimeOptions,
      readonlyCapabilityPrompt: readonlyCapabilities.prompt,
      readonlyCapabilityManifest: readonlyCapabilities.manifest,
    };
  } catch (error: any) {
    normalized.issues.push({
      severity: "error",
      code: "test_agent_isolation_prepare_failed",
      message: `TestAgent isolation preparation failed: ${String(error?.message || error).slice(0, 500)}`,
    });
  }
  const agentic = await applyAgenticTestPlanning(planningInput, planningRuntimeOptions, normalized.issues);
  const planned = planVerificationCommands(agentic.workOrder, [...normalized.issues, ...agentic.issues]);
  const isolationGate = applyTestAgentIsolationExecutionGate(planned.workOrder, isolatedSession);
  const workOrder = isolationGate.workOrder;
  const issues = [...planned.issues, ...isolationGate.issues];
  const modelSelectedSkills = Array.isArray((workOrder.metadata as any)?.selectedSkills)
    ? (workOrder.metadata as any).selectedSkills
    : Array.isArray((workOrder.metadata as any)?.workflowDecision?.selectedSkills)
      ? (workOrder.metadata as any).workflowDecision.selectedSkills
      : [];
  const roleSkills = selectRoleSkills("test-agent", [
    workOrder.originalUserGoal,
    ...(workOrder.acceptanceCriteria || []),
    ...(workOrder.requiredChecks || []),
  ].join("\n"), { forceWork: true, phase: "verification", selectedSkillNames: modelSelectedSkills });
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
  const semanticPlanningBlocked = testAgentPlanningIsBlocked(workOrder);
  let commandResults = [] as Awaited<ReturnType<typeof runVerificationCommands>>;
  let devServers = [] as Awaited<ReturnType<typeof startDevServersForBrowserChecks>>;
  let httpResults = [] as Awaited<ReturnType<typeof runHttpVerification>>;
  let browserResults = [] as Awaited<ReturnType<typeof runBrowserVerification>>;
  let browserProviderPreflight = [] as Awaited<ReturnType<typeof collectBrowserProviderPreflight>>;

  try {
    if (semanticPlanningBlocked) {
      const planningStatus = String(
        (workOrder.metadata as any)?.planningReceipt?.status
          || (workOrder.metadata as any)?.verificationHardening?.planningReceipt?.status
          || (workOrder.metadata as any)?.agenticPlanning?.status
          || "blocked",
      );
      const blocked: any = new Error(`TestAgent 语义规划未通过（${planningStatus}），已阻止执行验收命令和浏览器检查`);
      blocked.code = "CCM_TEST_AGENT_SEMANTIC_PLANNING_BLOCKED";
      throw blocked;
    }
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
    if (followup.workOrder) {
      const followupWorkOrder = withRuntimeEnvironments(followup.workOrder);
      commandResults.push(...await runVerificationCommands(followupWorkOrder));
      if (wantsBrowser(followupWorkOrder)) {
        const followupBrowserResults = await runBrowserVerification(followupWorkOrder, {
          ...runtimeOptions,
          // Follow-up checks are focused diagnostics. They must not mutate the
          // frozen primary browser execution plan or its lifecycle coverage.
          browserResourceLifecycle: undefined,
        });
        const diagnosticResults = followupBrowserResults.map(result => {
          const { execution: _execution, ...diagnostic } = result;
          return {
            ...diagnostic,
            context: {
              ...(diagnostic.context || {}),
              agenticFollowup: true,
            },
          };
        });
        browserResults.push(...diagnosticResults);
        workOrder.metadata = {
          ...workOrder.metadata,
          agenticFollowup: {
            ...((workOrder.metadata as any)?.agenticFollowup || {}),
            browserResults: diagnosticResults.map(result => ({
              project: result.project,
              name: result.name,
              status: result.status,
              provider: result.provider,
              screenshots: result.screenshots || [],
            })),
          },
        };
      }
    }
    workOrder.metadata = {
      ...workOrder.metadata,
      browserAuthenticationSummary: buildBrowserAuthenticationSummary(browserResults),
    };
  } catch (error: any) {
    if (error?.code !== "CCM_TEST_AGENT_SEMANTIC_PLANNING_BLOCKED") {
      issues.push({ severity: "error", code: "test_agent_runtime_error", message: error.message || String(error) });
    }
  } finally {
    for (const server of devServers) {
      try { server.stop(); } catch {}
    }
    if (isolatedSession) {
      try {
        const cleanupReceipt = await isolatedSession.cleanup();
        const hardening = workOrder.metadata?.verificationHardening && typeof workOrder.metadata.verificationHardening === "object"
          ? workOrder.metadata.verificationHardening
          : {};
        workOrder.metadata = {
          ...workOrder.metadata,
          verificationHardening: {
            ...hardening,
            isolationReceipt: cleanupReceipt,
          },
        };
        if (cleanupReceipt.status === "cleanup_failed" || cleanupReceipt.status === "recovery_required") {
          issues.push({
            severity: "error",
            code: "test_agent_isolation_cleanup_failed",
            message: `TestAgent isolation cleanup failed: ${String(cleanupReceipt.reason || cleanupReceipt.status).slice(0, 500)}`,
          });
        }
      } catch (error: any) {
        issues.push({
          severity: "error",
          code: "test_agent_isolation_cleanup_failed",
          message: `TestAgent isolation cleanup failed: ${String(error?.message || error).slice(0, 500)}`,
        });
      }
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
