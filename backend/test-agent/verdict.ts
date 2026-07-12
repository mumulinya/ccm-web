import { EvidenceItem, TestAgentReport, TestAgentVerdict } from "./types";
import { buildAcceptanceSummary } from "./acceptance-summary";
import { buildRequiredCheckSummary } from "./required-check-summary";

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
  if ((report.browserToolCallTimeoutSummary?.timedOutCalls || 0) > 0) {
    return [
      `Investigate ${report.browserToolCallTimeoutSummary!.timedOutCalls} timed-out browser tool call(s) before accepting the delivery.`,
      "Check the MCP browser server, page responsiveness, and executor AbortSignal handling, then rerun the exact linked browser check.",
    ];
  }
  if (report.status === "passed") {
    return [
      "Accept the delivery if it matches the user-facing goal.",
      "Keep the TestAgent report and artifact manifest with the task record.",
    ];
  }
  if (report.status === "failed") {
    const failed = failedRequired.map(item => item.check).join(", ");
    if (report.acceptanceEvidenceGateSummary.status === "failed") {
      return [
        `Route the task back for rework on failed acceptance criteria: ${report.acceptanceEvidenceGateSummary.failedCriteria.join(", ") || "see acceptance coverage"}.`,
        "Use the criterion-linked command, HTTP, or browser evidence in the report to diagnose the failure.",
        "Run TestAgent again after rework produces new criterion-linked evidence.",
      ];
    }
    return [
      `Route the task back for rework${failed ? ` on required checks: ${failed}` : ""}.`,
      "Use failed command, HTTP, browser, and acceptance evidence from the report before changing code.",
      "Run TestAgent again after rework produces new evidence.",
    ];
  }
  if (report.status === "partial") {
    const unknown = unknownRequired.map(item => item.check).join(", ");
    if (report.browserResourceLifecycleSummary?.status !== "complete") {
      return [
        `Resolve browser resource cleanup before accepting: ${report.browserResourceLifecycleSummary?.openResourceCount || 0} resource(s) remain open and ${report.browserResourceLifecycleSummary?.cleanupFailureCount || 0} cleanup operation(s) failed.`,
        "Inspect browser resource lifecycle events, fix the owning provider close path, and rerun the exact browser checks.",
      ];
    }
    if (report.browserEvidenceTemporalIntegrity?.status !== "complete") {
      return [
        `Re-run browser verification with fresh evidence: ${report.browserEvidenceTemporalIntegrity?.invalidItemCount || 0} temporal evidence item(s) are invalid.`,
        "Do not reuse browser results or tool calls from another execution plan; inspect the temporal evidence items for timestamp, duration, and window violations.",
      ];
    }
    if (report.browserToolEvidenceLineage && report.browserToolEvidenceLineage.status !== "complete") {
      return [
        `Re-run MCP browser checks with attributable tool evidence: ${report.browserToolEvidenceLineage.unlinkedRequiredResultCount} result(s) are unlinked and ${report.browserToolEvidenceLineage.orphanScopedToolCallCount + report.browserToolEvidenceLineage.unscopedToolCallCount} call(s) are orphaned or unscoped.`,
        "Use browser tool evidence lineage items to preserve the exact tool-call IDs for each check and run.",
      ];
    }
    if (report.browserCheckExecutionCoverage && report.browserCheckExecutionCoverage.status !== "complete") {
      return [
        `Run every planned browser check before accepting: ${report.browserCheckExecutionCoverage.missingRunCount} run(s) are missing and ${report.browserCheckExecutionCoverage.duplicateResultCount + report.browserCheckExecutionCoverage.invalidResultCount} result(s) are invalid.`,
        "Use the browser execution coverage items to rerun the exact missing check and stability-run identities.",
      ];
    }
    if (report.adversarialEvidenceSummary.status === "missing" && report.adversarialEvidenceSummary.required) {
      return [
        "Run at least one relevant adversarial probe and record its actual result before accepting the delivery.",
        "Use a boundary, invalid-input, idempotency, orphan-operation, concurrency, or equivalent product-specific probe.",
      ];
    }
    if (report.adversarialEvidenceSummary.status === "unlinked" && report.adversarialEvidenceSummary.required) {
      return [
        "Add or rerun an adversarial probe that is explicitly linked to the original goal or an exact acceptance criterion.",
        "Set coversAcceptanceCriteria on the probe, or use a product-specific probe name, target, and intent that clearly establish relevance.",
      ];
    }
    if (report.acceptanceEvidenceGateSummary.status === "weak") {
      return [
        `Add criterion-linked execution evidence for: ${report.acceptanceEvidenceGateSummary.weakCriteria.join(", ") || "the acceptance criteria"}.`,
        "Do not accept a delivery from a passing overall command alone; prove each criterion with matching command output, HTTP assertions, or browser observations.",
      ];
    }
    if (report.acceptanceEvidenceGateSummary.status === "incomplete") {
      return [
        `Run checks that directly cover the unresolved acceptance criteria: ${report.acceptanceEvidenceGateSummary.incompleteCriteria.join(", ") || "see acceptance coverage"}.`,
        "Record exact command output, HTTP assertions, or browser observations that can be matched to each criterion.",
      ];
    }
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
  const canAccept = report.status === "passed"
    && report.recommendation === "accept"
    && ["verified", "waived"].includes(report.adversarialEvidenceSummary.status)
    && (!report.browserCheckExecutionCoverage || report.browserCheckExecutionCoverage.status === "complete")
    && report.browserEvidenceTemporalIntegrity?.status === "complete"
    && report.browserResourceLifecycleSummary?.status === "complete"
    && (!report.browserToolEvidenceLineage || report.browserToolEvidenceLineage.status === "complete")
    && report.acceptanceEvidenceGateSummary.canAccept;
  const requiredCheckSummary = buildRequiredCheckSummary(report.requiredCheckCoverage);
  const acceptanceSummary = buildAcceptanceSummary(report.acceptanceCoverage);
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
    requiredCheckSummary,
    acceptanceSummary,
    blockedReasons: report.blockedReasons.slice(0, 12),
    risks: report.risks.slice(0, 20),
    nextActions: nextActionsFor(report, failedRequiredChecks, unknownRequiredChecks),
    evidenceSummary: {
      commands: countStatuses(report.commandResults),
      devServers: countStatuses(report.devServerResults),
      httpChecks: countStatuses(report.httpResults),
      httpConcurrencyChecks: report.httpConcurrencySummary?.checks || 0,
      httpConcurrentRequests: report.httpConcurrencySummary?.requests || 0,
      httpConcurrentFailed: report.httpConcurrencySummary?.failed || 0,
      httpConcurrentBlocked: report.httpConcurrencySummary?.blocked || 0,
      browserChecks: countStatuses(report.browserResults),
      browserToolCalls: countStatuses(report.browserToolCalls),
      browserToolLinkedResults: report.browserToolEvidenceLineage?.linkedResultCount || 0,
      browserToolUnlinkedResults: report.browserToolEvidenceLineage?.unlinkedRequiredResultCount || 0,
      browserToolLinkedCalls: report.browserToolEvidenceLineage?.linkedToolCallCount || 0,
      browserToolOrphanCalls: report.browserToolEvidenceLineage?.orphanScopedToolCallCount || 0,
      browserToolUnscopedCalls: report.browserToolEvidenceLineage?.unscopedToolCallCount || 0,
      browserToolInvalidLinks: (report.browserToolEvidenceLineage?.missingToolCallReferenceCount || 0)
        + (report.browserToolEvidenceLineage?.foreignToolCallReferenceCount || 0)
        + (report.browserToolEvidenceLineage?.duplicateToolCallReferenceCount || 0)
        + (report.browserToolEvidenceLineage?.duplicateToolCallRecordCount || 0),
      browserToolTimedOutCalls: report.browserToolCallTimeoutSummary?.timedOutCalls || 0,
      browserToolAbortRequestedCalls: report.browserToolCallTimeoutSummary?.abortRequestedCalls || 0,
      browserNetworkErrors: browserNetworkErrorCount(report),
      browserActions: browserInteractionCount(report, "actionCount"),
      browserFailedActions: browserInteractionCount(report, "failedActions"),
      browserAssertions: browserInteractionCount(report, "assertionCount"),
      browserFailedAssertions: browserInteractionCount(report, "failedAssertions"),
      browserAcceptanceFlows: report.browserFlowSummary?.total || 0,
      browserFailedAcceptanceFlows: (report.browserFlowSummary?.statusCounts.failed || 0) + (report.browserFlowSummary?.statusCounts.blocked || 0),
      browserMultiSessionScenarios: report.browserMultiSessionSummary?.total || 0,
      browserMultiSessionSessions: report.browserMultiSessionSummary?.sessionCount || 0,
      browserMultiSessionParallelGroups: report.browserMultiSessionSummary?.parallelGroupCount || 0,
      browserMultiSessionComparisons: report.browserMultiSessionSummary?.comparisonCount || 0,
      browserFailedSessionComparisons: report.browserMultiSessionSummary?.failedComparisonCount || 0,
      browserFailedMultiSessionScenarios: (report.browserMultiSessionSummary?.statusCounts.failed || 0) + (report.browserMultiSessionSummary?.statusCounts.blocked || 0),
      browserStabilityGroups: report.browserStabilitySummary?.total || 0,
      browserFlakyStabilityGroups: report.browserStabilitySummary?.statusCounts.flaky || 0,
      browserStabilityRuns: report.browserStabilitySummary?.runCount || 0,
      browserFailedStabilityRuns: report.browserStabilitySummary?.failedRunCount || 0,
      browserPlannedChecks: report.browserCheckExecutionCoverage?.plannedCheckCount || 0,
      browserExpectedRuns: report.browserCheckExecutionCoverage?.expectedRunCount || 0,
      browserCoveredRuns: report.browserCheckExecutionCoverage?.coveredRunCount || 0,
      browserMissingRuns: report.browserCheckExecutionCoverage?.missingRunCount || 0,
      browserDuplicateResults: report.browserCheckExecutionCoverage?.duplicateResultCount || 0,
      browserInvalidResults: report.browserCheckExecutionCoverage?.invalidResultCount || 0,
      browserTemporalInvalidItems: report.browserEvidenceTemporalIntegrity?.invalidItemCount || 0,
      browserTemporalPlanMismatches: report.browserEvidenceTemporalIntegrity?.planMismatchCount || 0,
      browserTemporalWindowViolations: (report.browserEvidenceTemporalIntegrity?.outsideReportWindowCount || 0)
        + (report.browserEvidenceTemporalIntegrity?.outsideResultWindowCount || 0),
      browserOwnedResources: report.browserResourceLifecycleSummary?.ownedResourceCount || 0,
      browserReleasedResources: report.browserResourceLifecycleSummary?.releasedResourceCount || 0,
      browserOpenResources: report.browserResourceLifecycleSummary?.openResourceCount || 0,
      browserCleanupFailures: report.browserResourceLifecycleSummary?.cleanupFailureCount || 0,
      browserRecoveryAttempts: report.browserRecoverySummary?.attempted || 0,
      browserRecoveredOperations: report.browserRecoverySummary?.recovered || 0,
      browserFailedRecoveries: report.browserRecoverySummary?.failed || 0,
      browserUnsafeRetriesPrevented: report.browserRecoverySummary?.notRetried || 0,
      browserActionEffectChecks: report.browserActionEffectSummary?.checks || 0,
      browserActionEffects: report.browserActionEffectSummary?.actions || 0,
      browserFailedActionEffects: report.browserActionEffectSummary?.failed || 0,
      browserCrossSessionActionEffects: report.browserActionEffectSummary?.crossSession || 0,
      adversarialProbes: report.adversarialEvidenceSummary.total,
      adversarialPassed: report.adversarialEvidenceSummary.passed,
      adversarialFailed: report.adversarialEvidenceSummary.failed,
      adversarialBlocked: report.adversarialEvidenceSummary.blocked,
      adversarialRelevant: report.adversarialEvidenceSummary.relevant,
      adversarialUnlinked: report.adversarialEvidenceSummary.unlinked,
      adversarialPassedRelevant: report.adversarialEvidenceSummary.passedRelevant,
      acceptanceMatchedEvidence: report.acceptanceEvidenceGateSummary.matchedEvidence,
      acceptanceFallbackEvidence: report.acceptanceEvidenceGateSummary.fallbackEvidence,
      acceptanceMissingEvidence: report.acceptanceEvidenceGateSummary.missingEvidence,
      browserProviderGaps: (report.browserProviderGaps || []).length,
      artifacts: report.evidence.filter(item => item.type === "artifact" && item.path).length,
    },
    browserNetworkSummary: report.browserNetworkSummary || [],
    httpConcurrencySummary: report.httpConcurrencySummary,
    browserInteractionSummary: report.browserInteractionSummary || [],
    browserFlowSummary: report.browserFlowSummary,
    browserMultiSessionSummary: report.browserMultiSessionSummary,
    browserStabilitySummary: report.browserStabilitySummary,
    browserCheckExecutionCoverage: report.browserCheckExecutionCoverage,
    browserEvidenceTemporalIntegrity: report.browserEvidenceTemporalIntegrity,
    browserResourceLifecycleSummary: report.browserResourceLifecycleSummary,
    browserToolEvidenceLineage: report.browserToolEvidenceLineage,
    browserToolCallTimeoutSummary: report.browserToolCallTimeoutSummary,
    browserRecoverySummary: report.browserRecoverySummary,
    browserActionEffectSummary: report.browserActionEffectSummary,
    adversarialEvidenceSummary: report.adversarialEvidenceSummary,
    acceptanceEvidenceGateSummary: report.acceptanceEvidenceGateSummary,
    browserProviderSummary: report.browserProviderSummary,
    browserProviderGaps: report.browserProviderGaps || [],
    failureSummary: report.failureSummary || [],
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
