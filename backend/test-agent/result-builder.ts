import {
  BrowserCheckResult,
  BrowserToolCallRecord,
  CommandRunResult,
  DevServerResult,
  EvidenceItem,
  HttpCheckResult,
  NormalizedTestAgentWorkOrder,
  RequiredCheckCoverageItem,
  TestAgentReport,
  TestAgentStatus,
  WorkOrderIssue,
} from "./types";
import { buildAcceptanceCoverage } from "./coverage";
import { buildRequiredCheckCoverage } from "./required-checks";
import { makeRunId, nowIso } from "./utils";

function resultStatusToAgent(status: string): TestAgentStatus | "skipped" {
  if (status === "passed" || status === "started" || status === "already_running") return "passed";
  if (status === "failed" || status === "timed_out") return "failed";
  if (status === "blocked") return "blocked";
  return "skipped";
}

function buildEvidence(commandResults: CommandRunResult[], devServerResults: DevServerResult[], httpResults: HttpCheckResult[], browserResults: BrowserCheckResult[], browserToolCalls: BrowserToolCallRecord[]): EvidenceItem[] {
  const evidence: EvidenceItem[] = [];
  for (const result of devServerResults) {
    evidence.push({
      type: "server",
      project: result.project,
      title: result.command ? `Dev server: ${result.command}` : "Dev server readiness",
      status: resultStatusToAgent(result.status),
      detail: result.error || result.url,
    });
  }
  for (const result of commandResults) {
    evidence.push({
      type: "command",
      project: result.project,
      title: result.command,
      status: resultStatusToAgent(result.status),
      detail: result.error || `exit=${result.exitCode}; duration=${result.durationMs}ms`,
    });
  }
  for (const result of httpResults) {
    evidence.push({
      type: "http",
      project: result.project,
      title: `${result.adversarial ? "Adversarial " : ""}${result.name || "HTTP probe"}: ${result.method || "GET"} ${result.url}`,
      status: resultStatusToAgent(result.status),
      detail: result.error || `status=${result.statusCode}; resources=${result.resourceChecks.length}${result.probeType ? `; probe=${result.probeType}` : ""}`,
    });
  }
  for (const result of browserResults) {
    evidence.push({
      type: "browser",
      project: result.project,
      title: `${result.adversarial ? "Adversarial " : ""}${result.name}`,
      status: resultStatusToAgent(result.status),
      detail: result.error || `${result.url}${result.finalUrl ? `; final=${result.finalUrl}` : ""}${result.title ? `; title=${result.title}` : ""}${result.probeType ? `; probe=${result.probeType}` : ""}`,
    });
    for (const screenshot of result.screenshots) {
      evidence.push({
        type: "artifact",
        project: result.project,
        title: `Screenshot: ${result.name}`,
        status: resultStatusToAgent(result.status),
        path: screenshot,
      });
    }
    for (const snapshot of result.pageSnapshots || []) {
      evidence.push({
        type: "artifact",
        project: result.project,
        title: `Page snapshot: ${result.name}`,
        status: resultStatusToAgent(result.status),
        path: snapshot,
      });
    }
    for (const artifact of result.browserArtifacts || []) {
      evidence.push({
        type: "artifact",
        project: result.project,
        title: `Browser ${artifact.type}: ${result.name}`,
        status: resultStatusToAgent(result.status),
        path: artifact.path,
      });
    }
    if (result.consoleLogPath) {
      evidence.push({
        type: "artifact",
        project: result.project,
        title: `Console log: ${result.name}`,
        status: resultStatusToAgent(result.status),
        path: result.consoleLogPath,
      });
    }
    if (result.networkLogPath) {
      evidence.push({
        type: "artifact",
        project: result.project,
        title: `Network log: ${result.name}`,
        status: resultStatusToAgent(result.status),
        path: result.networkLogPath,
      });
    }
  }
  if (browserToolCalls.length) {
    evidence.push({
      type: "artifact",
      title: "Browser MCP tool call transcript",
      status: browserToolCalls.some(item => item.status === "failed") ? "failed" : "passed",
      detail: `${browserToolCalls.length} browser tool calls recorded`,
    });
  }
  return evidence;
}

function computeStatus(commandResults: CommandRunResult[], devServerResults: DevServerResult[], httpResults: HttpCheckResult[], browserResults: BrowserCheckResult[], issues: WorkOrderIssue[], requiredCheckCoverage: RequiredCheckCoverageItem[]) {
  if (issues.some(issue => issue.severity === "error")) return "blocked" as TestAgentStatus;
  const executableCount = commandResults.length + httpResults.length + browserResults.length;
  if (executableCount === 0) return "blocked" as TestAgentStatus;
  if (httpResults.some(item => item.status === "failed")) return "failed" as TestAgentStatus;
  if (commandResults.some(item => item.status === "failed" || item.status === "timed_out") || browserResults.some(item => item.status === "failed")) return "failed" as TestAgentStatus;
  if (requiredCheckCoverage.some(item => item.status === "not_verified")) return "failed" as TestAgentStatus;
  if (devServerResults.some(item => item.status === "failed") || httpResults.some(item => item.status === "blocked") || commandResults.some(item => item.status === "blocked") || browserResults.some(item => item.status === "blocked")) {
    const anyPassed = commandResults.some(item => item.status === "passed") || httpResults.some(item => item.status === "passed") || browserResults.some(item => item.status === "passed");
    return anyPassed ? "partial" : "blocked";
  }
  if (requiredCheckCoverage.some(item => item.status === "unknown")) return "partial" as TestAgentStatus;
  return "passed";
}

export function buildTestAgentReport(input: {
  workOrder: NormalizedTestAgentWorkOrder;
  startedAt: string;
  issues: WorkOrderIssue[];
  commandResults: CommandRunResult[];
  devServerResults: DevServerResult[];
  httpResults?: HttpCheckResult[];
  browserResults: BrowserCheckResult[];
  browserToolCalls?: BrowserToolCallRecord[];
}): TestAgentReport {
  const { workOrder, startedAt, issues, commandResults, devServerResults, browserResults } = input;
  const httpResults = input.httpResults || [];
  const browserToolCalls = input.browserToolCalls || [];
  const finishedAt = nowIso();
  const requiredCheckCoverage = buildRequiredCheckCoverage({
    workOrder,
    commandResults,
    devServerResults,
    httpResults,
    browserResults,
    browserToolCalls,
  });
  const status = computeStatus(commandResults, devServerResults, httpResults, browserResults, issues, requiredCheckCoverage);
  const failedCommands = commandResults.filter(item => item.status === "failed" || item.status === "timed_out");
  const failedHttp = httpResults.filter(item => item.status === "failed");
  const failedBrowser = browserResults.filter(item => item.status === "failed");
  const blockedReasons = [
    ...issues.filter(item => item.severity === "error").map(item => item.message),
    ...devServerResults.filter(item => item.status === "failed").map(item => `${item.project}: ${item.error || "dev server failed"}`),
    ...httpResults.filter(item => item.status === "blocked").map(item => `${item.project}: ${item.error || "HTTP probe blocked"}`),
    ...commandResults.filter(item => item.status === "blocked").map(item => `${item.project}: ${item.error || "command blocked"}`),
    ...browserResults.filter(item => item.status === "blocked").map(item => `${item.project || "browser"}: ${item.error || "browser verification blocked"}`),
  ];
  const risks = [
    ...workOrder.projects.flatMap(project => project.risks.map(risk => `${project.name}: ${risk}`)),
    ...failedCommands.map(item => `${item.project}: command failed: ${item.command}`),
    ...failedHttp.map(item => `${item.project}: ${item.adversarial ? "adversarial " : ""}HTTP probe failed: ${item.error || item.url}`),
    ...failedBrowser.map(item => `${item.project}: ${item.adversarial ? "adversarial " : ""}browser check failed: ${item.name}`),
    ...requiredCheckCoverage.filter(item => item.status !== "verified").map(item => `required check ${item.check}: ${item.missingReason || item.status}`),
  ];
  const evidence = buildEvidence(commandResults, devServerResults, httpResults, browserResults, browserToolCalls);
  const acceptanceCoverage = buildAcceptanceCoverage({
    workOrder,
    status,
    issues,
    commandResults,
    devServerResults,
    httpResults,
    browserResults,
    browserToolCalls,
    evidence,
  });

  const summary = status === "passed"
    ? `TestAgent verified ${commandResults.filter(item => item.status === "passed").length} command checks, ${httpResults.filter(item => item.status === "passed").length} HTTP probes, ${browserResults.filter(item => item.status === "passed").length} browser checks, and ${browserToolCalls.length} browser tool calls.`
    : status === "failed"
      ? `TestAgent found failing verification evidence: ${risks.slice(0, 3).join("; ") || "one or more checks failed"}.`
      : status === "partial"
        ? `TestAgent completed part of the verification, but some checks were blocked.`
        : `TestAgent could not verify completion: ${blockedReasons.slice(0, 3).join("; ") || "missing executable checks"}.`;

  return {
    schema: "ccm-test-agent-report-v1",
    agent: "test-agent",
    id: makeRunId("test-agent-report"),
    workOrderId: workOrder.id,
    taskId: workOrder.taskId,
    groupId: workOrder.groupId,
    status,
    recommendation: status === "passed" ? "accept" : status === "failed" ? "rework" : "need_human",
    summary,
    startedAt,
    finishedAt,
    durationMs: Date.parse(finishedAt) - Date.parse(startedAt),
    artifactDir: workOrder.options.artifactDir,
    requiredChecks: workOrder.requiredChecks,
    commandResults,
    devServerResults,
    httpResults,
    browserResults,
    browserToolCalls,
    requiredCheckCoverage,
    acceptanceCoverage,
    evidence,
    risks,
    blockedReasons,
    issues,
    metadata: workOrder.metadata,
  };
}
