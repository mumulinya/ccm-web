import { EvidenceItem, TestAgentReport, TestAgentVerdict } from "./types";

function countStatuses(items: Array<{ status: string }>) {
  const counts: Record<string, number> = {};
  for (const item of items) counts[item.status] = (counts[item.status] || 0) + 1;
  return counts;
}

function shortEvidence(evidence: EvidenceItem[]) {
  const important = evidence.filter(item => item.status === "failed" || item.status === "blocked" || item.path);
  const fallback = evidence.filter(item => item.status === "passed");
  return [...important, ...fallback].slice(0, 12);
}

function browserNetworkErrorCount(report: TestAgentReport) {
  return (report.browserNetworkSummary || []).reduce((sum, item) => sum + item.errorCount, 0);
}

function browserInteractionCount(report: TestAgentReport, key: "actionCount" | "failedActions" | "assertionCount" | "failedAssertions") {
  return (report.browserInteractionSummary || []).reduce((sum, item) => sum + Number(item[key] || 0), 0);
}

function artifactFiles(report: TestAgentReport) {
  const files = (report.metadata?.artifactFiles || {}) as Record<string, string>;
  return {
    artifactDir: report.artifactDir,
    ...(files.reportJsonPath ? { reportJsonPath: files.reportJsonPath } : {}),
    ...(files.reportMarkdownPath ? { reportMarkdownPath: files.reportMarkdownPath } : {}),
    ...(files.verdictJsonPath ? { verdictJsonPath: files.verdictJsonPath } : {}),
    ...(files.manifestPath ? { manifestPath: files.manifestPath } : {}),
  };
}

function nextActionsFor(report: TestAgentReport, failedRequired: TestAgentVerdict["failedRequiredChecks"], unknownRequired: TestAgentVerdict["unknownRequiredChecks"]) {
  if (report.status === "passed") {
    return [
      "Accept the delivery if it matches the user-facing goal.",
      "Keep the TestAgent report and artifact manifest with the task record.",
    ];
  }
  if (report.status === "failed") {
    const failed = failedRequired.map(item => item.check).join(", ");
    return [
      `Route the task back for rework${failed ? ` on required checks: ${failed}` : ""}.`,
      "Use failed command, HTTP, browser, and acceptance evidence from the report before changing code.",
      "Run TestAgent again after rework produces new evidence.",
    ];
  }
  if (report.status === "partial") {
    const unknown = unknownRequired.map(item => item.check).join(", ");
    return [
      `Resolve incomplete verification coverage${unknown ? `: ${unknown}` : ""}.`,
      "Treat passed evidence as partial only; do not accept until missing required checks are verified or explicitly waived.",
    ];
  }
  return [
    "Resolve blocked TestAgent execution before accepting the delivery.",
    "Check workDir, commands, dev server readiness, browser provider availability, and handoff inputs.",
  ];
}

export function buildTestAgentVerdict(report: TestAgentReport): TestAgentVerdict {
  const failedRequiredChecks = report.requiredCheckCoverage.filter(item => item.status === "not_verified");
  const unknownRequiredChecks = report.requiredCheckCoverage.filter(item => item.status === "unknown");
  const failedAcceptanceCriteria = report.acceptanceCoverage.filter(item => item.status === "not_verified");
  const unknownAcceptanceCriteria = report.acceptanceCoverage.filter(item => item.status === "unknown");
  const canAccept = report.status === "passed" && report.recommendation === "accept";
  return {
    schema: "ccm-test-agent-verdict-v1",
    agent: "test-agent",
    reportId: report.id,
    workOrderId: report.workOrderId,
    taskId: report.taskId,
    groupId: report.groupId,
    status: report.status,
    recommendation: report.recommendation,
    canAccept,
    needsRework: report.recommendation === "rework",
    needsHuman: report.recommendation === "need_human",
    summary: report.summary,
    failedRequiredChecks,
    unknownRequiredChecks,
    failedAcceptanceCriteria,
    unknownAcceptanceCriteria,
    blockedReasons: report.blockedReasons.slice(0, 12),
    risks: report.risks.slice(0, 20),
    nextActions: nextActionsFor(report, failedRequiredChecks, unknownRequiredChecks),
    evidenceSummary: {
      commands: countStatuses(report.commandResults),
      devServers: countStatuses(report.devServerResults),
      httpChecks: countStatuses(report.httpResults),
      browserChecks: countStatuses(report.browserResults),
      browserToolCalls: countStatuses(report.browserToolCalls),
      browserNetworkErrors: browserNetworkErrorCount(report),
      browserActions: browserInteractionCount(report, "actionCount"),
      browserFailedActions: browserInteractionCount(report, "failedActions"),
      browserAssertions: browserInteractionCount(report, "assertionCount"),
      browserFailedAssertions: browserInteractionCount(report, "failedAssertions"),
      artifacts: report.evidence.filter(item => item.type === "artifact" && item.path).length,
    },
    browserNetworkSummary: report.browserNetworkSummary || [],
    browserInteractionSummary: report.browserInteractionSummary || [],
    keyEvidence: shortEvidence(report.evidence),
    artifacts: artifactFiles(report),
    metadata: {
      handoffSource: report.metadata?.handoffSource || "",
      completedByProjectAgents: report.metadata?.completedByProjectAgents || [],
      browserProviderPreflight: report.metadata?.browserProviderPreflight || [],
      playwrightLaunch: report.metadata?.playwrightLaunch || null,
    },
  };
}
