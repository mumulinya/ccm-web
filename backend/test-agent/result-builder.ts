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
import { buildAdversarialEvidenceSummary } from "./adversarial-summary";
import { buildAcceptanceEvidenceGateSummary } from "./acceptance-gate";
import { buildHttpConcurrencySummary } from "./http-concurrency";
import { buildAcceptanceCoverage } from "./coverage";
import { buildBrowserInteractionSummary } from "./browser/interaction-summary";
import { buildBrowserFlowSummary } from "./browser/flow-summary";
import { buildBrowserMultiSessionSummary } from "./browser/multi-session-summary";
import { buildBrowserNetworkSummary } from "./browser/network-summary";
import { buildBrowserProviderGaps } from "./browser/provider-gaps";
import { buildBrowserProviderSummary } from "./browser/provider-summary";
import { buildBrowserRecoverySummary } from "./browser/recovery-summary";
import { buildBrowserActionEffectSummary } from "./browser/action-effect-summary";
import { buildBrowserStabilitySummary } from "./browser/stability-summary";
import { buildTestAgentFailureSummary } from "./failure-summary";
import { buildRequiredCheckCoverage } from "./required-checks";
import { makeRunId, nowIso } from "./utils";

function resultStatusToAgent(status: string): TestAgentStatus | "skipped" {
  if (status === "passed" || status === "started" || status === "already_running") return "passed";
  if (status === "failed" || status === "timed_out") return "failed";
  if (status === "blocked") return "blocked";
  return "skipped";
}

function browserSourceSummary(context: BrowserCheckResult["context"]) {
  if (!context) return "";
  const generatedBy = String(context.generatedBy || context.source || "").trim();
  const criteria = Array.isArray(context.acceptanceCriteria) ? context.acceptanceCriteria.length : 0;
  return [generatedBy, criteria ? `criteria=${criteria}` : ""].filter(Boolean).join("; ");
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
      detail: result.error || `status=${result.statusCode}; resources=${result.resourceChecks.length}${result.concurrency ? `; concurrentRequests=${result.concurrency.requested}; maxInFlight=${result.concurrency.maxInFlight}` : ""}${result.probeType ? `; probe=${result.probeType}` : ""}`,
    });
  }
  for (const result of browserResults) {
    const source = browserSourceSummary(result.context);
    evidence.push({
      type: "browser",
      project: result.project,
      title: `${result.adversarial ? "Adversarial " : ""}${result.name}`,
      status: resultStatusToAgent(result.status),
      detail: result.error || `${result.url}${result.finalUrl ? `; final=${result.finalUrl}` : ""}${result.title ? `; title=${result.title}` : ""}${source ? `; source=${source}` : ""}${result.probeType ? `; probe=${result.probeType}` : ""}`,
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
    if (result.dialogLogPath) {
      evidence.push({
        type: "artifact",
        project: result.project,
        title: `Dialog log: ${result.name}`,
        status: resultStatusToAgent(result.status),
        path: result.dialogLogPath,
      });
    }
    if (result.popupLogPath) {
      evidence.push({
        type: "artifact",
        project: result.project,
        title: `Popup log: ${result.name}`,
        status: resultStatusToAgent(result.status),
        path: result.popupLogPath,
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

function computeOperationalStatus(
  commandResults: CommandRunResult[],
  devServerResults: DevServerResult[],
  httpResults: HttpCheckResult[],
  browserResults: BrowserCheckResult[],
  issues: WorkOrderIssue[],
  requiredCheckCoverage: RequiredCheckCoverageItem[],
  adversarialEvidenceSummary: TestAgentReport["adversarialEvidenceSummary"],
) {
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
  if (
    (adversarialEvidenceSummary.status === "missing" || adversarialEvidenceSummary.status === "unlinked")
    && (adversarialEvidenceSummary.required || !adversarialEvidenceSummary.waived)
  ) return "partial" as TestAgentStatus;
  if (requiredCheckCoverage.some(item => item.status === "unknown")) return "partial" as TestAgentStatus;
  return "passed";
}

function applyAcceptanceEvidenceGate(
  status: TestAgentStatus,
  gate: TestAgentReport["acceptanceEvidenceGateSummary"],
): TestAgentStatus {
  if (status === "blocked") return status;
  if (gate.status === "failed") return "failed";
  if (status !== "passed") return status;
  if (gate.status === "incomplete" || gate.status === "weak") return "partial";
  return status;
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
  const browserInteractionSummary = buildBrowserInteractionSummary(browserResults);
  const browserFlowSummary = buildBrowserFlowSummary(browserResults);
  const browserMultiSessionSummary = buildBrowserMultiSessionSummary(browserResults);
  const browserStabilitySummary = buildBrowserStabilitySummary(browserResults);
  const browserRecoverySummary = buildBrowserRecoverySummary(browserResults);
  const browserActionEffectSummary = buildBrowserActionEffectSummary(browserResults);
  const httpConcurrencySummary = buildHttpConcurrencySummary(httpResults);
  const adversarialRequired = workOrder.options.requireAdversarialProbe
    || workOrder.requiredChecks.some(check => /adversarial|boundary|orphan|idempot|concurr|race/i.test(String(check || "")));
  const adversarialEvidenceSummary = buildAdversarialEvidenceSummary({
    required: adversarialRequired,
    waiverReason: adversarialRequired ? "" : workOrder.options.adversarialProbeWaiver,
    originalUserGoal: workOrder.originalUserGoal,
    acceptanceCriteria: workOrder.acceptanceCriteria,
    httpResults,
    browserResults,
  });
  const browserNetworkSummary = buildBrowserNetworkSummary(browserResults);
  const browserProviderSummary = buildBrowserProviderSummary(workOrder, browserResults);
  const browserProviderGaps = buildBrowserProviderGaps(browserResults);
  const requiredCheckCoverage = buildRequiredCheckCoverage({
    workOrder,
    commandResults,
    devServerResults,
    httpResults,
    browserResults,
    browserToolCalls,
  });
  const operationalStatus = computeOperationalStatus(
    commandResults,
    devServerResults,
    httpResults,
    browserResults,
    issues,
    requiredCheckCoverage,
    adversarialEvidenceSummary,
  );
  const evidence = buildEvidence(commandResults, devServerResults, httpResults, browserResults, browserToolCalls);
  const acceptanceCoverage = buildAcceptanceCoverage({
    workOrder,
    status: operationalStatus,
    issues,
    commandResults,
    devServerResults,
    httpResults,
    browserResults,
    browserToolCalls,
    evidence,
  });
  const acceptanceEvidenceGateSummary = buildAcceptanceEvidenceGateSummary(acceptanceCoverage);
  const status = applyAcceptanceEvidenceGate(operationalStatus, acceptanceEvidenceGateSummary);
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
    ...httpConcurrencySummary.items
      .filter(item => item.failed > 0 || item.blocked > 0 || !item.overlapObserved)
      .map(item => `${item.project}: concurrent HTTP probe incomplete: ${item.name}; failed=${item.failed}; blocked=${item.blocked}; maxInFlight=${item.maxInFlight}`),
    ...failedBrowser.map(item => `${item.project}: ${item.adversarial ? "adversarial " : ""}browser check failed: ${item.name}`),
    ...browserStabilitySummary.items
      .filter(item => item.status === "flaky" || item.status === "stable_fail")
      .map(item => `${item.project}: browser stability ${item.status}: ${item.name}; failedRuns=${item.failedRuns.join(",") || "none"}`),
    ...browserRecoverySummary.items
      .filter(item => item.failed > 0 || item.notRetried > 0)
      .map(item => `${item.project}: browser recovery incomplete: ${item.name}; failed=${item.failed}; unsafeRetriesPrevented=${item.notRetried}`),
    ...browserActionEffectSummary.items
      .filter(item => item.failed > 0)
      .map(item => `${item.project}: browser action produced no verified effect: ${item.name}; unchanged=${item.unchanged}; unavailable=${item.unavailable}`),
    ...(adversarialEvidenceSummary.status === "missing" && adversarialEvidenceSummary.required
      ? ["required adversarial probe: no executed adversarial HTTP or browser evidence was recorded"]
      : []),
    ...(adversarialEvidenceSummary.status === "unlinked" && adversarialEvidenceSummary.required
      ? ["required adversarial probe: executed probes were not linked to the original goal or acceptance criteria"]
      : []),
    ...(adversarialEvidenceSummary.status === "waived" && adversarialEvidenceSummary.waiverReason
      ? [`adversarial probe waived: ${adversarialEvidenceSummary.waiverReason}`]
      : []),
    ...(acceptanceEvidenceGateSummary.status === "failed"
      ? acceptanceEvidenceGateSummary.failedCriteria.map(criterion => `acceptance criterion has failing matched evidence: ${criterion}`)
      : []),
    ...(acceptanceEvidenceGateSummary.status === "incomplete"
      ? acceptanceEvidenceGateSummary.incompleteCriteria.map(criterion => `acceptance criterion lacks matched execution evidence: ${criterion}`)
      : []),
    ...(acceptanceEvidenceGateSummary.status === "weak"
      ? acceptanceEvidenceGateSummary.weakCriteria.map(criterion => `acceptance criterion has only report-status fallback evidence: ${criterion}`)
      : []),
    ...browserProviderGaps.map(item => `${item.project || "browser"}: provider gap ${item.provider} ${item.step || item.check}: ${item.reason}`),
    ...requiredCheckCoverage.filter(item => item.status !== "verified").map(item => `required check ${item.check}: ${item.missingReason || item.status}`),
  ];
  const failureSummary = buildTestAgentFailureSummary({
    issues,
    commandResults,
    devServerResults,
    httpResults,
    browserResults,
    requiredCheckCoverage,
    acceptanceCoverage,
  });

  const summary = status === "passed"
    ? `TestAgent verified ${commandResults.filter(item => item.status === "passed").length} command checks, ${httpResults.filter(item => item.status === "passed").length} HTTP probes (${httpConcurrencySummary.requests} concurrent requests), ${browserResults.filter(item => item.status === "passed").length} browser checks, ${adversarialEvidenceSummary.passedRelevant} relevant adversarial probes, and ${browserToolCalls.length} browser tool calls.`
    : status === "failed"
      ? `TestAgent found failing verification evidence: ${risks.slice(0, 3).join("; ") || "one or more checks failed"}.`
      : status === "partial"
        ? adversarialEvidenceSummary.status === "missing" && adversarialEvidenceSummary.required
          ? "TestAgent completed happy-path verification, but no required adversarial probe produced execution evidence."
          : adversarialEvidenceSummary.status === "unlinked" && adversarialEvidenceSummary.required
            ? "TestAgent ran adversarial probes, but none were linked to the original goal or acceptance criteria."
            : acceptanceEvidenceGateSummary.status === "weak"
              ? "TestAgent execution passed, but acceptance criteria have only report-status fallback evidence and are not independently verified."
              : acceptanceEvidenceGateSummary.status === "incomplete"
                ? "TestAgent execution passed, but one or more acceptance criteria lack matched execution evidence."
                : `TestAgent completed part of the verification, but some checks were blocked or missing.`
        : `TestAgent could not verify completion: ${blockedReasons.slice(0, 3).join("; ") || "missing executable checks"}.`;

  return {
    schema: "ccm-test-agent-report-v1",
    agent: "test-agent",
    id: makeRunId("test-agent-report"),
    workOrderId: workOrder.id,
    taskId: workOrder.taskId,
    groupId: workOrder.groupId,
    originalUserGoal: workOrder.originalUserGoal,
    acceptanceCriteria: workOrder.acceptanceCriteria,
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
    httpConcurrencySummary,
    browserNetworkSummary,
    browserInteractionSummary,
    browserFlowSummary,
    browserMultiSessionSummary,
    browserStabilitySummary,
    browserRecoverySummary,
    browserActionEffectSummary,
    adversarialEvidenceSummary,
    acceptanceEvidenceGateSummary,
    browserProviderSummary,
    browserProviderGaps,
    failureSummary,
    requiredCheckCoverage,
    acceptanceCoverage,
    evidence,
    risks,
    blockedReasons,
    issues,
    metadata: workOrder.metadata,
  };
}
