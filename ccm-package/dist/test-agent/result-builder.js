"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildTestAgentReport = buildTestAgentReport;
const adversarial_summary_1 = require("./adversarial-summary");
const acceptance_gate_1 = require("./acceptance-gate");
const http_concurrency_1 = require("./http-concurrency");
const coverage_1 = require("./coverage");
const interaction_summary_1 = require("./browser/interaction-summary");
const flow_summary_1 = require("./browser/flow-summary");
const multi_session_summary_1 = require("./browser/multi-session-summary");
const network_summary_1 = require("./browser/network-summary");
const provider_gaps_1 = require("./browser/provider-gaps");
const provider_summary_1 = require("./browser/provider-summary");
const recovery_summary_1 = require("./browser/recovery-summary");
const action_effect_summary_1 = require("./browser/action-effect-summary");
const stability_summary_1 = require("./browser/stability-summary");
const check_execution_coverage_1 = require("./browser/check-execution-coverage");
const tool_evidence_lineage_1 = require("./browser/tool-evidence-lineage");
const tool_call_timeout_1 = require("./browser/tool-call-timeout");
const evidence_temporal_integrity_1 = require("./browser/evidence-temporal-integrity");
const resource_lifecycle_1 = require("./browser/resource-lifecycle");
const failure_summary_1 = require("./failure-summary");
const required_checks_1 = require("./required-checks");
const utils_1 = require("./utils");
function resultStatusToAgent(status) {
    if (status === "passed" || status === "started" || status === "already_running")
        return "passed";
    if (status === "failed" || status === "timed_out")
        return "failed";
    if (status === "blocked")
        return "blocked";
    return "skipped";
}
function browserSourceSummary(context) {
    if (!context)
        return "";
    const generatedBy = String(context.generatedBy || context.source || "").trim();
    const criteria = Array.isArray(context.acceptanceCriteria) ? context.acceptanceCriteria.length : 0;
    return [generatedBy, criteria ? `criteria=${criteria}` : ""].filter(Boolean).join("; ");
}
function buildEvidence(commandResults, devServerResults, httpResults, browserResults, browserToolCalls) {
    const evidence = [];
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
function computeOperationalStatus(commandResults, devServerResults, httpResults, browserResults, issues, requiredCheckCoverage, adversarialEvidenceSummary) {
    if (issues.some(issue => issue.severity === "error"))
        return "blocked";
    const executableCount = commandResults.length + httpResults.length + browserResults.length;
    if (executableCount === 0)
        return "blocked";
    if (httpResults.some(item => item.status === "failed"))
        return "failed";
    if (commandResults.some(item => item.status === "failed" || item.status === "timed_out") || browserResults.some(item => item.status === "failed"))
        return "failed";
    if (requiredCheckCoverage.some(item => item.status === "not_verified"))
        return "failed";
    if (devServerResults.some(item => item.status === "failed") || httpResults.some(item => item.status === "blocked") || commandResults.some(item => item.status === "blocked") || browserResults.some(item => item.status === "blocked")) {
        const anyPassed = commandResults.some(item => item.status === "passed") || httpResults.some(item => item.status === "passed") || browserResults.some(item => item.status === "passed");
        return anyPassed ? "partial" : "blocked";
    }
    if ((adversarialEvidenceSummary.status === "missing" || adversarialEvidenceSummary.status === "unlinked")
        && (adversarialEvidenceSummary.required || !adversarialEvidenceSummary.waived))
        return "partial";
    if (requiredCheckCoverage.some(item => item.status === "unknown"))
        return "partial";
    return "passed";
}
function applyAcceptanceEvidenceGate(status, gate) {
    if (status === "blocked")
        return status;
    if (gate.status === "failed")
        return "failed";
    if (status !== "passed")
        return status;
    if (gate.status === "incomplete" || gate.status === "weak")
        return "partial";
    return status;
}
function applyBrowserToolEvidenceLineageGate(status, lineage) {
    if (!lineage || lineage.status === "complete" || status === "blocked" || status === "failed")
        return status;
    return status === "passed" ? "partial" : status;
}
function applyBrowserTemporalIntegrityGate(status, temporal) {
    if (!temporal || temporal.status === "complete" || status === "blocked" || status === "failed")
        return status;
    return status === "passed" ? "partial" : status;
}
function buildTestAgentReport(input) {
    const { workOrder, startedAt, issues, commandResults, devServerResults, browserResults } = input;
    const httpResults = input.httpResults || [];
    const browserToolCalls = input.browserToolCalls || [];
    const browserResourceLifecycleEvents = input.browserResourceLifecycleEvents || [];
    const finishedAt = (0, utils_1.nowIso)();
    const durationMs = Date.parse(finishedAt) - Date.parse(startedAt);
    const browserInteractionSummary = (0, interaction_summary_1.buildBrowserInteractionSummary)(browserResults);
    const browserFlowSummary = (0, flow_summary_1.buildBrowserFlowSummary)(browserResults);
    const browserMultiSessionSummary = (0, multi_session_summary_1.buildBrowserMultiSessionSummary)(browserResults);
    const browserStabilitySummary = (0, stability_summary_1.buildBrowserStabilitySummary)(browserResults);
    const browserCheckExecutionPlan = workOrder.metadata?.browserCheckExecutionPlan;
    const browserCheckExecutionCoverage = browserCheckExecutionPlan
        ? (0, check_execution_coverage_1.buildBrowserCheckExecutionCoverage)(browserCheckExecutionPlan, browserResults)
        : undefined;
    const browserEvidenceTemporalIntegrity = (0, evidence_temporal_integrity_1.buildBrowserEvidenceTemporalIntegrity)({
        startedAt,
        finishedAt,
        durationMs,
        plan: browserCheckExecutionPlan,
        browserResults,
        browserToolCalls,
    });
    const browserResourceLifecycleSummary = (0, resource_lifecycle_1.buildBrowserResourceLifecycleSummary)({
        events: browserResourceLifecycleEvents,
        plan: browserCheckExecutionPlan,
        reportStartedAt: startedAt,
        reportFinishedAt: finishedAt,
    });
    const browserToolEvidenceLineage = (0, tool_evidence_lineage_1.buildBrowserToolEvidenceLineage)(browserResults, browserToolCalls);
    const browserToolCallTimeoutSummary = (0, tool_call_timeout_1.buildBrowserToolCallTimeoutSummary)(browserToolCalls);
    const browserRecoverySummary = (0, recovery_summary_1.buildBrowserRecoverySummary)(browserResults);
    const browserActionEffectSummary = (0, action_effect_summary_1.buildBrowserActionEffectSummary)(browserResults);
    const httpConcurrencySummary = (0, http_concurrency_1.buildHttpConcurrencySummary)(httpResults);
    const adversarialRequired = workOrder.options.requireAdversarialProbe
        || workOrder.requiredChecks.some(check => /adversarial|boundary|orphan|idempot|concurr|race/i.test(String(check || "")));
    const adversarialEvidenceSummary = (0, adversarial_summary_1.buildAdversarialEvidenceSummary)({
        required: adversarialRequired,
        waiverReason: adversarialRequired ? "" : workOrder.options.adversarialProbeWaiver,
        originalUserGoal: workOrder.originalUserGoal,
        acceptanceCriteria: workOrder.acceptanceCriteria,
        httpResults,
        browserResults,
    });
    const browserNetworkSummary = (0, network_summary_1.buildBrowserNetworkSummary)(browserResults);
    const browserProviderSummary = (0, provider_summary_1.buildBrowserProviderSummary)(workOrder, browserResults);
    const browserProviderGaps = (0, provider_gaps_1.buildBrowserProviderGaps)(browserResults);
    const requiredCheckCoverage = (0, required_checks_1.buildRequiredCheckCoverage)({
        workOrder,
        commandResults,
        devServerResults,
        httpResults,
        browserResults,
        browserToolCalls,
    });
    const executionStatus = computeOperationalStatus(commandResults, devServerResults, httpResults, browserResults, issues, requiredCheckCoverage, adversarialEvidenceSummary);
    const lineageStatus = applyBrowserToolEvidenceLineageGate(executionStatus, browserToolEvidenceLineage);
    const temporalStatus = applyBrowserTemporalIntegrityGate(lineageStatus, browserEvidenceTemporalIntegrity);
    const operationalStatus = browserResourceLifecycleSummary.status === "complete" || temporalStatus === "blocked" || temporalStatus === "failed"
        ? temporalStatus
        : temporalStatus === "passed" ? "partial" : temporalStatus;
    const evidence = buildEvidence(commandResults, devServerResults, httpResults, browserResults, browserToolCalls);
    const acceptanceCoverage = (0, coverage_1.buildAcceptanceCoverage)({
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
    const acceptanceEvidenceGateSummary = (0, acceptance_gate_1.buildAcceptanceEvidenceGateSummary)(acceptanceCoverage);
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
        ...(browserCheckExecutionCoverage && browserCheckExecutionCoverage.status !== "complete"
            ? [`browser check execution coverage ${browserCheckExecutionCoverage.status}: runs=${browserCheckExecutionCoverage.coveredRunCount}/${browserCheckExecutionCoverage.expectedRunCount}; missing=${browserCheckExecutionCoverage.missingRunCount}; duplicate=${browserCheckExecutionCoverage.duplicateResultCount}; invalid=${browserCheckExecutionCoverage.invalidResultCount}`]
            : []),
        ...(browserEvidenceTemporalIntegrity.status !== "complete"
            ? [`browser evidence temporal integrity invalid: invalidItems=${browserEvidenceTemporalIntegrity.invalidItemCount}; timestamps=${browserEvidenceTemporalIntegrity.invalidTimestampCount}; durations=${browserEvidenceTemporalIntegrity.durationMismatchCount}; reportWindow=${browserEvidenceTemporalIntegrity.outsideReportWindowCount}; resultWindow=${browserEvidenceTemporalIntegrity.outsideResultWindowCount}; planMismatch=${browserEvidenceTemporalIntegrity.planMismatchCount}`]
            : []),
        ...(browserResourceLifecycleSummary.status !== "complete"
            ? [`browser resource lifecycle ${browserResourceLifecycleSummary.status}: open=${browserResourceLifecycleSummary.openResourceCount}; cleanupFailed=${browserResourceLifecycleSummary.cleanupFailureCount}; planMismatch=${browserResourceLifecycleSummary.planMismatchCount}`]
            : []),
        ...(browserToolEvidenceLineage.status !== "complete"
            ? [`browser tool evidence lineage ${browserToolEvidenceLineage.status}: linkedResults=${browserToolEvidenceLineage.linkedResultCount}/${browserToolEvidenceLineage.evidenceRequiredResultCount}; orphanCalls=${browserToolEvidenceLineage.orphanScopedToolCallCount}; unscopedCalls=${browserToolEvidenceLineage.unscopedToolCallCount}`]
            : []),
        ...browserToolCallTimeoutSummary.items.map(item => `browser tool call timed out: ${item.toolName}; timeoutMs=${item.timeoutMs}; durationMs=${item.durationMs}${item.checkId ? `; execution=${item.checkId} run ${item.run}` : ""}`),
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
    const failureSummary = (0, failure_summary_1.buildTestAgentFailureSummary)({
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
        id: (0, utils_1.makeRunId)("test-agent-report"),
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
        durationMs,
        artifactDir: workOrder.options.artifactDir,
        requiredChecks: workOrder.requiredChecks,
        commandResults,
        devServerResults,
        httpResults,
        browserResults,
        browserToolCalls,
        browserResourceLifecycleEvents,
        httpConcurrencySummary,
        browserNetworkSummary,
        browserInteractionSummary,
        browserFlowSummary,
        browserMultiSessionSummary,
        browserStabilitySummary,
        browserCheckExecutionCoverage,
        browserEvidenceTemporalIntegrity,
        browserResourceLifecycleSummary,
        browserToolEvidenceLineage,
        browserToolCallTimeoutSummary,
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
//# sourceMappingURL=result-builder.js.map