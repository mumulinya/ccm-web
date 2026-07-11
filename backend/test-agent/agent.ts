import { runBrowserVerification } from "./browser-verifier";
import { collectBrowserProviderPreflight } from "./browser/registry";
import { createRecordingBrowserToolExecutor } from "./browser/tool-executor";
import { buildBrowserAuthenticationSummary } from "./browser/authentication-summary";
import { browserExistingSessionUsesMinimalEvidence } from "./browser/existing-session";
import { checksForProject } from "./browser/shared";
import { writeTestAgentArtifacts } from "./artifacts";
import { planVerificationCommands } from "./command-planner";
import { runVerificationCommands } from "./command-runner";
import { startDevServersForBrowserChecks } from "./dev-server";
import { runHttpVerification } from "./http-verifier";
import { buildTestAgentReport } from "./result-builder";
import { TestAgentReport, TestAgentRuntimeOptions, TestAgentWorkOrder } from "./types";
import { nowIso } from "./utils";
import { normalizeTestAgentWorkOrder } from "./work-order";

export async function runTestAgent(input: TestAgentWorkOrder, options: TestAgentRuntimeOptions = {}): Promise<TestAgentReport> {
  const startedAt = nowIso();
  const normalized = normalizeTestAgentWorkOrder(input, options);
  const planned = planVerificationCommands(normalized.workOrder, normalized.issues);
  const { workOrder, issues } = planned;
  const suppressBrowserToolDetails = workOrder.projects.some(project =>
    checksForProject(project, workOrder.acceptanceCriteria).some(browserExistingSessionUsesMinimalEvidence)
  );
  const browserToolRecorder = options.browserToolExecutor
    ? createRecordingBrowserToolExecutor(
        options.browserToolExecutor,
        workOrder.options.artifactDir,
        { suppressDetails: suppressBrowserToolDetails },
      )
    : null;
  const runtimeOptions: TestAgentRuntimeOptions = browserToolRecorder
    ? { ...options, browserToolExecutor: browserToolRecorder.executor }
    : options;
  let commandResults = [] as Awaited<ReturnType<typeof runVerificationCommands>>;
  let devServers = [] as Awaited<ReturnType<typeof startDevServersForBrowserChecks>>;
  let httpResults = [] as Awaited<ReturnType<typeof runHttpVerification>>;
  let browserResults = [] as Awaited<ReturnType<typeof runBrowserVerification>>;
  let browserProviderPreflight = [] as Awaited<ReturnType<typeof collectBrowserProviderPreflight>>;

  try {
    browserProviderPreflight = await collectBrowserProviderPreflight(workOrder, runtimeOptions);
    workOrder.metadata = {
      ...workOrder.metadata,
      browserProviderPreflight,
    };
    commandResults = await runVerificationCommands(workOrder);
    devServers = await startDevServersForBrowserChecks(workOrder);
    httpResults = await runHttpVerification(workOrder);
    browserResults = await runBrowserVerification(workOrder, runtimeOptions);
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
  const report = buildTestAgentReport({
    workOrder,
    startedAt,
    issues,
    commandResults,
    devServerResults: devServers.map(server => server.result),
    httpResults,
    browserResults,
    browserToolCalls,
  });
  return writeTestAgentArtifacts(report);
}
