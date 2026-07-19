"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyHttpPageResourceConsistency = verifyHttpPageResourceConsistency;
exports.verifyReportVerdictConsistency = verifyReportVerdictConsistency;
exports.verifyReportBrowserToolTimeout = verifyReportBrowserToolTimeout;
exports.verifyReportBrowserToolLineage = verifyReportBrowserToolLineage;
exports.verifyReportBrowserExecutionCoverage = verifyReportBrowserExecutionCoverage;
exports.verifyReportBrowserTemporalEvidence = verifyReportBrowserTemporalEvidence;
exports.verifyReportBrowserResourceLifecycleEvidence = verifyReportBrowserResourceLifecycleEvidence;
exports.verifyReportRecoveryEvidence = verifyReportRecoveryEvidence;
exports.verifyReportAuthenticationEvidence = verifyReportAuthenticationEvidence;
exports.verifyReportActionEffectEvidence = verifyReportActionEffectEvidence;
exports.verifyReportAdversarialEvidence = verifyReportAdversarialEvidence;
exports.verifyReportAcceptanceEvidence = verifyReportAcceptanceEvidence;
const fs = __importStar(require("fs"));
const multi_session_summary_1 = require("./browser/multi-session-summary");
const stability_summary_1 = require("./browser/stability-summary");
const recovery_summary_1 = require("./browser/recovery-summary");
const action_effect_summary_1 = require("./browser/action-effect-summary");
const adversarial_summary_1 = require("./adversarial-summary");
const acceptance_gate_1 = require("./acceptance-gate");
const http_concurrency_1 = require("./http-concurrency");
const http_page_resources_1 = require("./http-page-resources");
const check_execution_coverage_1 = require("./browser/check-execution-coverage");
const tool_evidence_lineage_1 = require("./browser/tool-evidence-lineage");
const tool_call_timeout_1 = require("./browser/tool-call-timeout");
const evidence_temporal_integrity_1 = require("./browser/evidence-temporal-integrity");
const resource_lifecycle_1 = require("./browser/resource-lifecycle");
const artifact_verifier_core_1 = require("./artifact-verifier-core");
function verifyHttpPageResourceConsistency(report, errors) {
    for (const [index, result] of (report.httpResults || []).entries()) {
        errors.push(...(0, http_page_resources_1.httpPageResourceEvidenceErrors)(result, `report.httpResults[${index}]`));
    }
}
function verifyBrowserSessionEvidenceConsistency(report, errors) {
    for (const [resultIndex, result] of (report?.browserResults || []).entries()) {
        const sessions = result.browserSessions || [];
        if (!sessions.length)
            continue;
        const label = `report.browserResults[${resultIndex}]`;
        if (sessions.length < 2)
            errors.push(`${label}.browserSessions must contain at least two sessions.`);
        const names = sessions.map(session => String(session.name || "").trim());
        const normalizedNames = names.map(name => name.toLowerCase());
        if (new Set(normalizedNames).size !== normalizedNames.length)
            errors.push(`${label}.browserSessions contains duplicate session names.`);
        (0, artifact_verifier_core_1.expectEqual)(`${label}.context.multiSession`, result.context?.multiSession, true, errors);
        (0, artifact_verifier_core_1.expectEqual)(`${label}.context.sessionCount`, result.context?.sessionCount, sessions.length, errors);
        const contextSessionNames = Array.isArray(result.context?.sessionNames) ? result.context.sessionNames.map(String) : [];
        (0, artifact_verifier_core_1.compareStringList)(`${label}.context.sessionNames`, [...names].sort(), contextSessionNames.sort(), errors);
        const parallelGroups = new Map();
        for (const step of result.steps) {
            const group = /(?:^|;\s*)parallelGroup=(\d+)(?:;|$)/.exec(String(step.detail || ""))?.[1];
            if (!group)
                continue;
            const session = /^session:([^:]+):/.exec(step.name)?.[1] || "";
            if (!parallelGroups.has(group))
                parallelGroups.set(group, new Set());
            if (session)
                parallelGroups.get(group).add(session.toLowerCase());
        }
        if (result.context?.parallelGroupCount !== undefined || parallelGroups.size) {
            (0, artifact_verifier_core_1.expectEqual)(`${label}.context.parallelGroupCount`, result.context?.parallelGroupCount, parallelGroups.size, errors);
            for (const [group, groupSessions] of parallelGroups) {
                if (groupSessions.size < 2)
                    errors.push(`${label} parallel group ${group} does not contain steps from at least two sessions.`);
            }
        }
        const comparisons = result.browserSessionComparisons || [];
        const comparisonSteps = result.steps.filter(step => /(?:^|;\s*)compareSessions=([^;]+)(?:;|$)/.test(String(step.detail || "")));
        if (result.context?.comparisonCount !== undefined || comparisons.length || comparisonSteps.length) {
            (0, artifact_verifier_core_1.expectEqual)(`${label}.context.comparisonCount`, result.context?.comparisonCount, comparisons.length, errors);
            (0, artifact_verifier_core_1.expectEqual)(`${label}.browserSessionComparisons.length`, comparisons.length, comparisonSteps.length, errors);
            for (const [comparisonIndex, comparison] of comparisons.entries()) {
                const comparisonLabel = `${label}.browserSessionComparisons[${comparisonIndex}]`;
                const comparisonStep = comparisonSteps[comparisonIndex];
                const left = String(comparison.leftSession || "").trim();
                const right = String(comparison.rightSession || "").trim();
                if (!normalizedNames.includes(left.toLowerCase()))
                    errors.push(`${comparisonLabel}.leftSession references unknown session ${JSON.stringify(left)}.`);
                if (!normalizedNames.includes(right.toLowerCase()))
                    errors.push(`${comparisonLabel}.rightSession references unknown session ${JSON.stringify(right)}.`);
                if (left && right && left.toLowerCase() === right.toLowerCase())
                    errors.push(`${comparisonLabel} must compare two distinct sessions.`);
                if (!["equals", "notEquals", "includes"].includes(String(comparison.operator || "")))
                    errors.push(`${comparisonLabel}.operator is invalid.`);
                if (!["passed", "failed"].includes(String(comparison.status || "")))
                    errors.push(`${comparisonLabel}.status is invalid.`);
                for (const key of ["value", "values", "rawValue", "raw_value", "rawValues", "raw_values", "leftValue", "left_value", "rightValue", "right_value", "actual", "expected"]) {
                    if (Object.prototype.hasOwnProperty.call(comparison, key))
                        errors.push(`${comparisonLabel}.${key} must not contain raw compared values.`);
                }
                for (const side of ["left", "right"]) {
                    const summary = comparison[side];
                    if (!summary)
                        continue;
                    if (!/^[a-f0-9]{64}$/i.test(String(summary.sha256 || "")))
                        errors.push(`${comparisonLabel}.${side}.sha256 is not a SHA-256 digest.`);
                    if (!Number.isFinite(Number(summary.serializedBytes)) || Number(summary.serializedBytes) < 0)
                        errors.push(`${comparisonLabel}.${side}.serializedBytes must be non-negative.`);
                    for (const key of ["value", "values", "rawValue", "raw_value", "rawValues", "raw_values", "actual", "expected"]) {
                        if (Object.prototype.hasOwnProperty.call(summary, key))
                            errors.push(`${comparisonLabel}.${side}.${key} must not contain raw compared values.`);
                    }
                }
                if (comparison.status === "passed" && (!comparison.left || !comparison.right)) {
                    errors.push(`${comparisonLabel} passed without both comparison value summaries.`);
                }
                if (comparison.status === "passed" && comparison.operator === "equals" && comparison.left?.sha256 !== comparison.right?.sha256) {
                    errors.push(`${comparisonLabel} passed equals comparison has different value digests.`);
                }
                if (comparison.status === "passed" && comparison.operator === "notEquals" && comparison.left?.sha256 === comparison.right?.sha256) {
                    errors.push(`${comparisonLabel} passed notEquals comparison has identical value digests.`);
                }
                if (comparisonStep) {
                    const comparedSessions = /(?:^|;\s*)compareSessions=([^,;]+),([^;]+)(?:;|$)/.exec(String(comparisonStep.detail || ""));
                    const operator = /(?:^|;\s*)operator=([^;]+)(?:;|$)/.exec(String(comparisonStep.detail || ""))?.[1];
                    if (!comparedSessions || comparedSessions[1].trim().toLowerCase() !== left.toLowerCase() || comparedSessions[2].trim().toLowerCase() !== right.toLowerCase()) {
                        errors.push(`${comparisonLabel} does not match its comparison step session pair.`);
                    }
                    if (operator !== comparison.operator)
                        errors.push(`${comparisonLabel} does not match its comparison step operator.`);
                    if (comparisonStep.status !== comparison.status)
                        errors.push(`${comparisonLabel} does not match its comparison step status.`);
                }
            }
        }
        const screenshots = new Set((result.screenshots || []).map(String));
        const pageSnapshots = new Set((result.pageSnapshots || []).map(String));
        const artifactPaths = new Set((result.browserArtifacts || []).map(item => String(item.path || "")));
        for (const session of sessions) {
            for (const screenshot of session.screenshots || []) {
                if (!screenshots.has(String(screenshot)))
                    errors.push(`${label} session ${JSON.stringify(session.name)} screenshot is missing from the browser result aggregate: ${screenshot}.`);
            }
            for (const snapshot of session.pageSnapshots || []) {
                if (!pageSnapshots.has(String(snapshot)))
                    errors.push(`${label} session ${JSON.stringify(session.name)} page snapshot is missing from the browser result aggregate: ${snapshot}.`);
            }
            for (const artifact of session.browserArtifacts || []) {
                if (!artifactPaths.has(String(artifact.path || "")))
                    errors.push(`${label} session ${JSON.stringify(session.name)} browser artifact is missing from the browser result aggregate: ${artifact.path}.`);
            }
            if (!result.steps.some(step => step.name.startsWith(`session:${session.name}:`))) {
                errors.push(`${label} session ${JSON.stringify(session.name)} has no session-prefixed execution step.`);
            }
        }
    }
}
function verifyBrowserStabilityEvidenceConsistency(report, errors) {
    const groups = new Map();
    for (const [index, result] of (report?.browserResults || []).entries()) {
        const hasSignal = result.context?.browserStability === true
            || result.context?.stabilityGroupId !== undefined
            || result.context?.stabilityRun !== undefined
            || Number(result.context?.stabilityRuns || 0) > 1;
        if (!hasSignal)
            continue;
        const metadata = (0, stability_summary_1.browserStabilityMetadata)(result);
        if (!metadata) {
            errors.push(`report.browserResults[${index}] has invalid browser stability metadata.`);
            continue;
        }
        const group = groups.get(metadata.groupId) || [];
        group.push({ index, result, run: metadata.run, runs: metadata.runs });
        groups.set(metadata.groupId, group);
    }
    for (const [groupId, entries] of groups) {
        const label = `browser stability group ${JSON.stringify(groupId)}`;
        const expectedRuns = entries[0]?.runs || 0;
        if (entries.some(entry => entry.runs !== expectedRuns))
            errors.push(`${label} has inconsistent stabilityRuns values.`);
        const runs = entries.map(entry => entry.run).sort((a, b) => a - b);
        if (new Set(runs).size !== runs.length)
            errors.push(`${label} contains duplicate stabilityRun values.`);
        if (runs.some(run => run < 1 || run > expectedRuns))
            errors.push(`${label} contains a stabilityRun outside 1..${expectedRuns}.`);
        if (entries.length !== expectedRuns)
            errors.push(`${label} expected ${expectedRuns} results but found ${entries.length}.`);
        const first = entries[0]?.result;
        for (const entry of entries.slice(1)) {
            if (entry.result.project !== first?.project)
                errors.push(`${label} mixes projects.`);
            if (entry.result.name !== first?.name)
                errors.push(`${label} mixes browser check names.`);
            if (entry.result.provider !== first?.provider)
                errors.push(`${label} mixes browser providers.`);
            if (entry.result.probeType !== first?.probeType)
                errors.push(`${label} mixes probe types.`);
        }
        const artifactPaths = entries.flatMap(entry => [
            ...(entry.result.screenshots || []),
            ...(entry.result.pageSnapshots || []),
            entry.result.consoleLogPath || "",
            entry.result.dialogLogPath || "",
            entry.result.popupLogPath || "",
            entry.result.networkLogPath || "",
            ...(entry.result.browserArtifacts || []).map(artifact => artifact.path),
        ].filter(Boolean).map(String));
        if (new Set(artifactPaths).size !== artifactPaths.length) {
            errors.push(`${label} reuses an artifact path across stability runs.`);
        }
    }
}
function verifyBrowserCheckExecutionCoverageConsistency(report, errors) {
    const plan = report?.metadata?.browserCheckExecutionPlan;
    const hasExecutionIdentity = (report?.browserResults || []).some(result => result.execution);
    if (!plan) {
        if (hasExecutionIdentity || report?.browserCheckExecutionCoverage) {
            errors.push("Browser execution evidence exists without metadata.browserCheckExecutionPlan.");
        }
        return;
    }
    errors.push(...(0, check_execution_coverage_1.browserCheckExecutionEvidenceErrors)({
        plan,
        results: report?.browserResults || [],
        summary: report?.browserCheckExecutionCoverage,
        reportStatus: report?.status,
    }));
}
function verifyBrowserEvidenceTemporalIntegrityConsistency(report, errors) {
    errors.push(...(0, evidence_temporal_integrity_1.browserEvidenceTemporalIntegrityErrors)(report));
}
function verifyBrowserResourceLifecycleConsistency(report, errors) {
    errors.push(...(0, resource_lifecycle_1.browserResourceLifecycleErrors)(report));
}
function verifyBrowserToolEvidenceLineageConsistency(report, errors) {
    const hasSignal = report?.browserToolEvidenceLineage
        || (report?.browserResults || []).some(result => (result.browserToolCallIds || []).length)
        || (report?.browserToolCalls || []).some(record => record.browserExecution);
    if (!hasSignal)
        return;
    errors.push(...(0, tool_evidence_lineage_1.browserToolEvidenceLineageErrors)({
        browserResults: report?.browserResults || [],
        browserToolCalls: report?.browserToolCalls || [],
        summary: report?.browserToolEvidenceLineage,
        reportStatus: report?.status,
    }));
}
function verifyBrowserToolCallTimeoutConsistency(report, errors) {
    const hasSignal = report?.browserToolCallTimeoutSummary
        || (report?.browserToolCalls || []).some(record => record.timeoutMs !== undefined || record.timedOut !== undefined || record.abortRequested !== undefined);
    if (!hasSignal)
        return;
    errors.push(...(0, tool_call_timeout_1.browserToolCallTimeoutEvidenceErrors)({
        browserResults: report?.browserResults || [],
        browserToolCalls: report?.browserToolCalls || [],
        summary: report?.browserToolCallTimeoutSummary,
        reportStatus: report?.status,
    }));
}
function verifyReportVerdictConsistency(manifest, manifestPath, manifestFiles, integrityItems) {
    const reportIndex = manifestFiles.findIndex(item => item.type === "report_json");
    const verdictIndex = manifestFiles.findIndex(item => item.type === "verdict_json");
    const reportItem = reportIndex >= 0 ? manifestFiles[reportIndex] : undefined;
    const verdictItem = verdictIndex >= 0 ? manifestFiles[verdictIndex] : undefined;
    if (!reportItem && !verdictItem)
        return [];
    if (!reportItem && verdictItem) {
        return [(0, artifact_verifier_core_1.semanticItem)(reportItem, verdictItem, "failed", "Manifest includes verdict_json but no report_json to verify it against.")];
    }
    if (reportItem && !verdictItem) {
        const reportIntegrity = integrityItems[reportIndex];
        if (reportIntegrity?.status !== "passed") {
            return [(0, artifact_verifier_core_1.semanticItem)(reportItem, verdictItem, "skipped", "Report artifact integrity did not pass, so verdict consistency could not be checked.")];
        }
        try {
            const report = (0, artifact_verifier_core_1.readJsonForSemantic)(manifestPath, reportItem);
            if ((0, artifact_verifier_core_1.hasVerdictArtifactReference)(report)) {
                return [(0, artifact_verifier_core_1.semanticItem)(reportItem, verdictItem, "failed", "Report metadata references verdictJsonPath, but manifest has no verdict_json entry.")];
            }
            return [(0, artifact_verifier_core_1.semanticItem)(reportItem, verdictItem, "skipped", "Manifest has no verdict_json entry; treating as a legacy report without a verdict artifact.")];
        }
        catch (error) {
            return [(0, artifact_verifier_core_1.semanticItem)(reportItem, verdictItem, "failed", `Unable to read report_json for verdict consistency: ${error.message || String(error)}`)];
        }
    }
    const reportIntegrity = integrityItems[reportIndex];
    const verdictIntegrity = integrityItems[verdictIndex];
    if (reportIntegrity?.status !== "passed" || verdictIntegrity?.status !== "passed") {
        return [(0, artifact_verifier_core_1.semanticItem)(reportItem, verdictItem, "skipped", "Report or verdict artifact integrity did not pass, so semantic consistency could not be checked.")];
    }
    let report;
    let verdict;
    try {
        report = (0, artifact_verifier_core_1.readJsonForSemantic)(manifestPath, reportItem);
        verdict = (0, artifact_verifier_core_1.readJsonForSemantic)(manifestPath, verdictItem);
    }
    catch (error) {
        return [(0, artifact_verifier_core_1.semanticItem)(reportItem, verdictItem, "failed", `Unable to read report/verdict JSON: ${error.message || String(error)}`)];
    }
    const errors = [];
    (0, artifact_verifier_core_1.expectEqual)("report.schema", report?.schema, "ccm-test-agent-report-v1", errors);
    (0, artifact_verifier_core_1.expectEqual)("verdict.schema", verdict?.schema, "ccm-test-agent-verdict-v1", errors);
    (0, artifact_verifier_core_1.expectEqual)("manifest.reportId", manifest.reportId, report?.id, errors);
    (0, artifact_verifier_core_1.expectEqual)("manifest.workOrderId", manifest.workOrderId, report?.workOrderId, errors);
    (0, artifact_verifier_core_1.expectEqual)("manifest.taskId", manifest.taskId, report?.taskId, errors);
    (0, artifact_verifier_core_1.expectEqual)("manifest.groupId", manifest.groupId, report?.groupId, errors);
    (0, artifact_verifier_core_1.expectEqual)("manifest.originalUserGoal", manifest.originalUserGoal, report?.originalUserGoal, errors);
    (0, artifact_verifier_core_1.expectEqual)("manifest.acceptanceCriteria", manifest.acceptanceCriteria, report?.acceptanceCriteria, errors);
    (0, artifact_verifier_core_1.expectEqual)("manifest.status", manifest.status, report?.status, errors);
    (0, artifact_verifier_core_1.expectEqual)("verdict.reportId", verdict?.reportId, report?.id, errors);
    (0, artifact_verifier_core_1.expectEqual)("verdict.workOrderId", verdict?.workOrderId, report?.workOrderId, errors);
    (0, artifact_verifier_core_1.expectEqual)("verdict.taskId", verdict?.taskId, report?.taskId, errors);
    (0, artifact_verifier_core_1.expectEqual)("verdict.groupId", verdict?.groupId, report?.groupId, errors);
    (0, artifact_verifier_core_1.expectEqual)("verdict.status", verdict?.status, report?.status, errors);
    (0, artifact_verifier_core_1.expectEqual)("verdict.recommendation", verdict?.recommendation, report?.recommendation, errors);
    (0, artifact_verifier_core_1.expectEqual)("verdict.summary", verdict?.summary, report?.summary, errors);
    (0, artifact_verifier_core_1.expectEqual)("verdict.canAccept", verdict?.canAccept, report?.status === "passed"
        && report?.recommendation === "accept"
        && ["verified", "waived"].includes(String(report?.adversarialEvidenceSummary?.status || ""))
        && (!report?.browserCheckExecutionCoverage || report.browserCheckExecutionCoverage.status === "complete")
        && report?.browserEvidenceTemporalIntegrity?.status === "complete"
        && report?.browserResourceLifecycleSummary?.status === "complete"
        && (!report?.browserToolEvidenceLineage || report.browserToolEvidenceLineage.status === "complete")
        && report?.acceptanceEvidenceGateSummary?.canAccept === true, errors);
    (0, artifact_verifier_core_1.expectEqual)("verdict.needsRework", verdict?.needsRework, report?.recommendation === "rework", errors);
    (0, artifact_verifier_core_1.expectEqual)("verdict.needsHuman", verdict?.needsHuman, report?.recommendation === "need_human", errors);
    const expectedFailedRequired = (0, artifact_verifier_core_1.statusCoverageKeys)(report?.requiredCheckCoverage, "not_verified", "check");
    const expectedUnknownRequired = (0, artifact_verifier_core_1.statusCoverageKeys)(report?.requiredCheckCoverage, "unknown", "check");
    const actualFailedRequired = (0, artifact_verifier_core_1.statusCoverageKeys)(verdict?.failedRequiredChecks, "not_verified", "check");
    const actualUnknownRequired = (0, artifact_verifier_core_1.statusCoverageKeys)(verdict?.unknownRequiredChecks, "unknown", "check");
    (0, artifact_verifier_core_1.compareStringList)("verdict.failedRequiredChecks", expectedFailedRequired, actualFailedRequired, errors);
    (0, artifact_verifier_core_1.compareStringList)("verdict.unknownRequiredChecks", expectedUnknownRequired, actualUnknownRequired, errors);
    const expectedFailedAcceptance = (0, artifact_verifier_core_1.statusCoverageKeys)(report?.acceptanceCoverage, "not_verified", "criterion");
    const expectedUnknownAcceptance = (0, artifact_verifier_core_1.statusCoverageKeys)(report?.acceptanceCoverage, "unknown", "criterion");
    const actualFailedAcceptance = (0, artifact_verifier_core_1.statusCoverageKeys)(verdict?.failedAcceptanceCriteria, "not_verified", "criterion");
    const actualUnknownAcceptance = (0, artifact_verifier_core_1.statusCoverageKeys)(verdict?.unknownAcceptanceCriteria, "unknown", "criterion");
    (0, artifact_verifier_core_1.compareStringList)("verdict.failedAcceptanceCriteria", expectedFailedAcceptance, actualFailedAcceptance, errors);
    (0, artifact_verifier_core_1.compareStringList)("verdict.unknownAcceptanceCriteria", expectedUnknownAcceptance, actualUnknownAcceptance, errors);
    (0, artifact_verifier_core_1.expectEqual)("verdict.acceptanceSummary.total", verdict?.acceptanceSummary?.total, (report?.acceptanceCoverage || []).length, errors);
    (0, artifact_verifier_core_1.expectEqual)("verdict.acceptanceSummary.statusCounts", verdict?.acceptanceSummary?.statusCounts, (0, artifact_verifier_core_1.coverageStatusCounts)(report?.acceptanceCoverage), errors);
    (0, artifact_verifier_core_1.expectEqual)("verdict.acceptanceSummary.matchStrengthCounts", verdict?.acceptanceSummary?.matchStrengthCounts, (0, artifact_verifier_core_1.acceptanceMatchStrengthCounts)(report?.acceptanceCoverage), errors);
    (0, artifact_verifier_core_1.expectEqual)("verdict.acceptanceSummary.evidenceSourceCounts", verdict?.acceptanceSummary?.evidenceSourceCounts, (0, artifact_verifier_core_1.acceptanceEvidenceSourceCounts)(report?.acceptanceCoverage), errors);
    const expectedAcceptanceGate = (0, acceptance_gate_1.buildAcceptanceEvidenceGateSummary)(report?.acceptanceCoverage || []);
    (0, artifact_verifier_core_1.expectEqual)("report.acceptanceEvidenceGateSummary", report?.acceptanceEvidenceGateSummary, expectedAcceptanceGate, errors);
    (0, artifact_verifier_core_1.expectEqual)("verdict.acceptanceEvidenceGateSummary", verdict?.acceptanceEvidenceGateSummary, expectedAcceptanceGate, errors);
    (0, artifact_verifier_core_1.expectEqual)("verdict.evidenceSummary.acceptanceMatchedEvidence", verdict?.evidenceSummary?.acceptanceMatchedEvidence, expectedAcceptanceGate.matchedEvidence, errors);
    (0, artifact_verifier_core_1.expectEqual)("verdict.evidenceSummary.acceptanceFallbackEvidence", verdict?.evidenceSummary?.acceptanceFallbackEvidence, expectedAcceptanceGate.fallbackEvidence, errors);
    (0, artifact_verifier_core_1.expectEqual)("verdict.evidenceSummary.acceptanceMissingEvidence", verdict?.evidenceSummary?.acceptanceMissingEvidence, expectedAcceptanceGate.missingEvidence, errors);
    if (report?.httpConcurrencySummary || verdict?.httpConcurrencySummary || (report?.httpResults || []).some(result => result.concurrency)) {
        const expectedHttpConcurrencySummary = (0, http_concurrency_1.buildHttpConcurrencySummary)(report?.httpResults || []);
        (0, artifact_verifier_core_1.expectEqual)("report.httpConcurrencySummary", report?.httpConcurrencySummary || null, expectedHttpConcurrencySummary, errors);
        (0, artifact_verifier_core_1.expectEqual)("verdict.httpConcurrencySummary", verdict?.httpConcurrencySummary || null, expectedHttpConcurrencySummary, errors);
        (0, artifact_verifier_core_1.expectEqual)("verdict.evidenceSummary.httpConcurrencyChecks", verdict?.evidenceSummary?.httpConcurrencyChecks, expectedHttpConcurrencySummary.checks, errors);
        (0, artifact_verifier_core_1.expectEqual)("verdict.evidenceSummary.httpConcurrentRequests", verdict?.evidenceSummary?.httpConcurrentRequests, expectedHttpConcurrencySummary.requests, errors);
        (0, artifact_verifier_core_1.expectEqual)("verdict.evidenceSummary.httpConcurrentFailed", verdict?.evidenceSummary?.httpConcurrentFailed, expectedHttpConcurrencySummary.failed, errors);
        (0, artifact_verifier_core_1.expectEqual)("verdict.evidenceSummary.httpConcurrentBlocked", verdict?.evidenceSummary?.httpConcurrentBlocked, expectedHttpConcurrencySummary.blocked, errors);
    }
    if (Array.isArray(report?.browserNetworkSummary) || Array.isArray(verdict?.browserNetworkSummary)) {
        (0, artifact_verifier_core_1.expectEqual)("verdict.browserNetworkSummary", verdict?.browserNetworkSummary || [], report?.browserNetworkSummary || [], errors);
        (0, artifact_verifier_core_1.expectEqual)("verdict.evidenceSummary.browserNetworkErrors", verdict?.evidenceSummary?.browserNetworkErrors, (0, artifact_verifier_core_1.browserNetworkErrorCount)(report), errors);
    }
    if (Array.isArray(report?.browserInteractionSummary) || Array.isArray(verdict?.browserInteractionSummary)) {
        (0, artifact_verifier_core_1.expectEqual)("verdict.browserInteractionSummary", verdict?.browserInteractionSummary || [], report?.browserInteractionSummary || [], errors);
        (0, artifact_verifier_core_1.expectEqual)("verdict.evidenceSummary.browserActions", verdict?.evidenceSummary?.browserActions, (0, artifact_verifier_core_1.browserInteractionCount)(report, "actionCount"), errors);
        (0, artifact_verifier_core_1.expectEqual)("verdict.evidenceSummary.browserFailedActions", verdict?.evidenceSummary?.browserFailedActions, (0, artifact_verifier_core_1.browserInteractionCount)(report, "failedActions"), errors);
        (0, artifact_verifier_core_1.expectEqual)("verdict.evidenceSummary.browserAssertions", verdict?.evidenceSummary?.browserAssertions, (0, artifact_verifier_core_1.browserInteractionCount)(report, "assertionCount"), errors);
        (0, artifact_verifier_core_1.expectEqual)("verdict.evidenceSummary.browserFailedAssertions", verdict?.evidenceSummary?.browserFailedAssertions, (0, artifact_verifier_core_1.browserInteractionCount)(report, "failedAssertions"), errors);
    }
    if (report?.browserFlowSummary || verdict?.browserFlowSummary) {
        (0, artifact_verifier_core_1.expectEqual)("verdict.browserFlowSummary", verdict?.browserFlowSummary || null, report?.browserFlowSummary || null, errors);
        (0, artifact_verifier_core_1.expectEqual)("verdict.evidenceSummary.browserAcceptanceFlows", verdict?.evidenceSummary?.browserAcceptanceFlows, report?.browserFlowSummary?.total || 0, errors);
        (0, artifact_verifier_core_1.expectEqual)("verdict.evidenceSummary.browserFailedAcceptanceFlows", verdict?.evidenceSummary?.browserFailedAcceptanceFlows, (report?.browserFlowSummary?.statusCounts?.failed || 0) + (report?.browserFlowSummary?.statusCounts?.blocked || 0), errors);
    }
    if (report?.browserMultiSessionSummary || verdict?.browserMultiSessionSummary) {
        const expectedMultiSessionSummary = (0, multi_session_summary_1.buildBrowserMultiSessionSummary)(report?.browserResults || []);
        (0, artifact_verifier_core_1.expectEqual)("report.browserMultiSessionSummary", report?.browserMultiSessionSummary || null, expectedMultiSessionSummary, errors);
        (0, artifact_verifier_core_1.expectEqual)("verdict.browserMultiSessionSummary", verdict?.browserMultiSessionSummary || null, report?.browserMultiSessionSummary || null, errors);
        (0, artifact_verifier_core_1.expectEqual)("verdict.evidenceSummary.browserMultiSessionScenarios", verdict?.evidenceSummary?.browserMultiSessionScenarios, expectedMultiSessionSummary.total, errors);
        (0, artifact_verifier_core_1.expectEqual)("verdict.evidenceSummary.browserMultiSessionSessions", verdict?.evidenceSummary?.browserMultiSessionSessions, expectedMultiSessionSummary.sessionCount, errors);
        (0, artifact_verifier_core_1.expectEqual)("verdict.evidenceSummary.browserMultiSessionParallelGroups", verdict?.evidenceSummary?.browserMultiSessionParallelGroups, expectedMultiSessionSummary.parallelGroupCount, errors);
        (0, artifact_verifier_core_1.expectEqual)("verdict.evidenceSummary.browserMultiSessionComparisons", verdict?.evidenceSummary?.browserMultiSessionComparisons, expectedMultiSessionSummary.comparisonCount, errors);
        (0, artifact_verifier_core_1.expectEqual)("verdict.evidenceSummary.browserFailedSessionComparisons", verdict?.evidenceSummary?.browserFailedSessionComparisons, expectedMultiSessionSummary.failedComparisonCount, errors);
        (0, artifact_verifier_core_1.expectEqual)("verdict.evidenceSummary.browserFailedMultiSessionScenarios", verdict?.evidenceSummary?.browserFailedMultiSessionScenarios, expectedMultiSessionSummary.statusCounts.failed + expectedMultiSessionSummary.statusCounts.blocked, errors);
    }
    if (report?.browserStabilitySummary || verdict?.browserStabilitySummary) {
        const expectedStabilitySummary = (0, stability_summary_1.buildBrowserStabilitySummary)(report?.browserResults || []);
        (0, artifact_verifier_core_1.expectEqual)("report.browserStabilitySummary", report?.browserStabilitySummary || null, expectedStabilitySummary, errors);
        (0, artifact_verifier_core_1.expectEqual)("verdict.browserStabilitySummary", verdict?.browserStabilitySummary || null, report?.browserStabilitySummary || null, errors);
        (0, artifact_verifier_core_1.expectEqual)("verdict.evidenceSummary.browserStabilityGroups", verdict?.evidenceSummary?.browserStabilityGroups, expectedStabilitySummary.total, errors);
        (0, artifact_verifier_core_1.expectEqual)("verdict.evidenceSummary.browserFlakyStabilityGroups", verdict?.evidenceSummary?.browserFlakyStabilityGroups, expectedStabilitySummary.statusCounts.flaky, errors);
        (0, artifact_verifier_core_1.expectEqual)("verdict.evidenceSummary.browserStabilityRuns", verdict?.evidenceSummary?.browserStabilityRuns, expectedStabilitySummary.runCount, errors);
        (0, artifact_verifier_core_1.expectEqual)("verdict.evidenceSummary.browserFailedStabilityRuns", verdict?.evidenceSummary?.browserFailedStabilityRuns, expectedStabilitySummary.failedRunCount, errors);
    }
    if (report?.browserCheckExecutionCoverage || verdict?.browserCheckExecutionCoverage) {
        const plan = report?.metadata?.browserCheckExecutionPlan;
        const expectedCoverage = plan
            ? (0, check_execution_coverage_1.buildBrowserCheckExecutionCoverage)(plan, report?.browserResults || [])
            : undefined;
        (0, artifact_verifier_core_1.expectEqual)("report.browserCheckExecutionCoverage", report?.browserCheckExecutionCoverage || null, expectedCoverage || null, errors);
        (0, artifact_verifier_core_1.expectEqual)("verdict.browserCheckExecutionCoverage", verdict?.browserCheckExecutionCoverage || null, report?.browserCheckExecutionCoverage || null, errors);
        (0, artifact_verifier_core_1.expectEqual)("verdict.evidenceSummary.browserPlannedChecks", verdict?.evidenceSummary?.browserPlannedChecks, expectedCoverage?.plannedCheckCount || 0, errors);
        (0, artifact_verifier_core_1.expectEqual)("verdict.evidenceSummary.browserExpectedRuns", verdict?.evidenceSummary?.browserExpectedRuns, expectedCoverage?.expectedRunCount || 0, errors);
        (0, artifact_verifier_core_1.expectEqual)("verdict.evidenceSummary.browserCoveredRuns", verdict?.evidenceSummary?.browserCoveredRuns, expectedCoverage?.coveredRunCount || 0, errors);
        (0, artifact_verifier_core_1.expectEqual)("verdict.evidenceSummary.browserMissingRuns", verdict?.evidenceSummary?.browserMissingRuns, expectedCoverage?.missingRunCount || 0, errors);
        (0, artifact_verifier_core_1.expectEqual)("verdict.evidenceSummary.browserDuplicateResults", verdict?.evidenceSummary?.browserDuplicateResults, expectedCoverage?.duplicateResultCount || 0, errors);
        (0, artifact_verifier_core_1.expectEqual)("verdict.evidenceSummary.browserInvalidResults", verdict?.evidenceSummary?.browserInvalidResults, expectedCoverage?.invalidResultCount || 0, errors);
    }
    if (report?.browserEvidenceTemporalIntegrity || verdict?.browserEvidenceTemporalIntegrity) {
        const expectedTemporal = (0, evidence_temporal_integrity_1.buildBrowserEvidenceTemporalIntegrity)({
            startedAt: report?.startedAt || "",
            finishedAt: report?.finishedAt || "",
            durationMs: Number(report?.durationMs),
            plan: report?.metadata?.browserCheckExecutionPlan,
            browserResults: report?.browserResults || [],
            browserToolCalls: report?.browserToolCalls || [],
        });
        (0, artifact_verifier_core_1.expectEqual)("report.browserEvidenceTemporalIntegrity", report?.browserEvidenceTemporalIntegrity || null, expectedTemporal, errors);
        (0, artifact_verifier_core_1.expectEqual)("verdict.browserEvidenceTemporalIntegrity", verdict?.browserEvidenceTemporalIntegrity || null, report?.browserEvidenceTemporalIntegrity || null, errors);
        (0, artifact_verifier_core_1.expectEqual)("verdict.evidenceSummary.browserTemporalInvalidItems", verdict?.evidenceSummary?.browserTemporalInvalidItems, expectedTemporal.invalidItemCount, errors);
        (0, artifact_verifier_core_1.expectEqual)("verdict.evidenceSummary.browserTemporalPlanMismatches", verdict?.evidenceSummary?.browserTemporalPlanMismatches, expectedTemporal.planMismatchCount, errors);
        (0, artifact_verifier_core_1.expectEqual)("verdict.evidenceSummary.browserTemporalWindowViolations", verdict?.evidenceSummary?.browserTemporalWindowViolations, expectedTemporal.outsideReportWindowCount + expectedTemporal.outsideResultWindowCount, errors);
    }
    if (report?.browserResourceLifecycleSummary || verdict?.browserResourceLifecycleSummary) {
        const expectedLifecycle = (0, resource_lifecycle_1.buildBrowserResourceLifecycleSummary)({
            events: report?.browserResourceLifecycleEvents || [],
            plan: report?.metadata?.browserCheckExecutionPlan,
            reportStartedAt: report?.startedAt || "",
            reportFinishedAt: report?.finishedAt || "",
        });
        (0, artifact_verifier_core_1.expectEqual)("report.browserResourceLifecycleSummary", report?.browserResourceLifecycleSummary || null, expectedLifecycle, errors);
        (0, artifact_verifier_core_1.expectEqual)("verdict.browserResourceLifecycleSummary", verdict?.browserResourceLifecycleSummary || null, report?.browserResourceLifecycleSummary || null, errors);
        (0, artifact_verifier_core_1.expectEqual)("verdict.evidenceSummary.browserOwnedResources", verdict?.evidenceSummary?.browserOwnedResources, expectedLifecycle.ownedResourceCount, errors);
        (0, artifact_verifier_core_1.expectEqual)("verdict.evidenceSummary.browserReleasedResources", verdict?.evidenceSummary?.browserReleasedResources, expectedLifecycle.releasedResourceCount, errors);
        (0, artifact_verifier_core_1.expectEqual)("verdict.evidenceSummary.browserOpenResources", verdict?.evidenceSummary?.browserOpenResources, expectedLifecycle.openResourceCount, errors);
        (0, artifact_verifier_core_1.expectEqual)("verdict.evidenceSummary.browserCleanupFailures", verdict?.evidenceSummary?.browserCleanupFailures, expectedLifecycle.cleanupFailureCount, errors);
    }
    if (report?.browserToolEvidenceLineage || verdict?.browserToolEvidenceLineage) {
        const expectedLineage = (0, tool_evidence_lineage_1.buildBrowserToolEvidenceLineage)(report?.browserResults || [], report?.browserToolCalls || []);
        (0, artifact_verifier_core_1.expectEqual)("report.browserToolEvidenceLineage", report?.browserToolEvidenceLineage || null, expectedLineage, errors);
        (0, artifact_verifier_core_1.expectEqual)("verdict.browserToolEvidenceLineage", verdict?.browserToolEvidenceLineage || null, report?.browserToolEvidenceLineage || null, errors);
        (0, artifact_verifier_core_1.expectEqual)("verdict.evidenceSummary.browserToolLinkedResults", verdict?.evidenceSummary?.browserToolLinkedResults, expectedLineage.linkedResultCount, errors);
        (0, artifact_verifier_core_1.expectEqual)("verdict.evidenceSummary.browserToolUnlinkedResults", verdict?.evidenceSummary?.browserToolUnlinkedResults, expectedLineage.unlinkedRequiredResultCount, errors);
        (0, artifact_verifier_core_1.expectEqual)("verdict.evidenceSummary.browserToolLinkedCalls", verdict?.evidenceSummary?.browserToolLinkedCalls, expectedLineage.linkedToolCallCount, errors);
        (0, artifact_verifier_core_1.expectEqual)("verdict.evidenceSummary.browserToolOrphanCalls", verdict?.evidenceSummary?.browserToolOrphanCalls, expectedLineage.orphanScopedToolCallCount, errors);
        (0, artifact_verifier_core_1.expectEqual)("verdict.evidenceSummary.browserToolUnscopedCalls", verdict?.evidenceSummary?.browserToolUnscopedCalls, expectedLineage.unscopedToolCallCount, errors);
        (0, artifact_verifier_core_1.expectEqual)("verdict.evidenceSummary.browserToolInvalidLinks", verdict?.evidenceSummary?.browserToolInvalidLinks, expectedLineage.missingToolCallReferenceCount + expectedLineage.foreignToolCallReferenceCount + expectedLineage.duplicateToolCallReferenceCount + expectedLineage.duplicateToolCallRecordCount, errors);
    }
    if (report?.browserToolCallTimeoutSummary || verdict?.browserToolCallTimeoutSummary) {
        const expectedTimeoutSummary = (0, tool_call_timeout_1.buildBrowserToolCallTimeoutSummary)(report?.browserToolCalls || []);
        (0, artifact_verifier_core_1.expectEqual)("report.browserToolCallTimeoutSummary", report?.browserToolCallTimeoutSummary || null, expectedTimeoutSummary, errors);
        (0, artifact_verifier_core_1.expectEqual)("verdict.browserToolCallTimeoutSummary", verdict?.browserToolCallTimeoutSummary || null, report?.browserToolCallTimeoutSummary || null, errors);
        (0, artifact_verifier_core_1.expectEqual)("verdict.evidenceSummary.browserToolTimedOutCalls", verdict?.evidenceSummary?.browserToolTimedOutCalls, expectedTimeoutSummary.timedOutCalls, errors);
        (0, artifact_verifier_core_1.expectEqual)("verdict.evidenceSummary.browserToolAbortRequestedCalls", verdict?.evidenceSummary?.browserToolAbortRequestedCalls, expectedTimeoutSummary.abortRequestedCalls, errors);
    }
    if (report?.browserRecoverySummary
        || verdict?.browserRecoverySummary
        || (report?.browserResults || []).some(result => result.recovery)) {
        const expectedRecoverySummary = (0, recovery_summary_1.buildBrowserRecoverySummary)(report?.browserResults || []);
        (0, artifact_verifier_core_1.expectEqual)("report.browserRecoverySummary", report?.browserRecoverySummary || null, expectedRecoverySummary, errors);
        (0, artifact_verifier_core_1.expectEqual)("verdict.browserRecoverySummary", verdict?.browserRecoverySummary || null, report?.browserRecoverySummary || null, errors);
        (0, artifact_verifier_core_1.expectEqual)("verdict.evidenceSummary.browserRecoveryAttempts", verdict?.evidenceSummary?.browserRecoveryAttempts, expectedRecoverySummary.attempted, errors);
        (0, artifact_verifier_core_1.expectEqual)("verdict.evidenceSummary.browserRecoveredOperations", verdict?.evidenceSummary?.browserRecoveredOperations, expectedRecoverySummary.recovered, errors);
        (0, artifact_verifier_core_1.expectEqual)("verdict.evidenceSummary.browserFailedRecoveries", verdict?.evidenceSummary?.browserFailedRecoveries, expectedRecoverySummary.failed, errors);
        (0, artifact_verifier_core_1.expectEqual)("verdict.evidenceSummary.browserUnsafeRetriesPrevented", verdict?.evidenceSummary?.browserUnsafeRetriesPrevented, expectedRecoverySummary.notRetried, errors);
    }
    if (report?.browserActionEffectSummary
        || verdict?.browserActionEffectSummary
        || (report?.browserResults || []).some(result => (result.actionEffects || []).length)) {
        const expectedActionEffectSummary = (0, action_effect_summary_1.buildBrowserActionEffectSummary)(report?.browserResults || []);
        (0, artifact_verifier_core_1.expectEqual)("report.browserActionEffectSummary", report?.browserActionEffectSummary || null, expectedActionEffectSummary, errors);
        (0, artifact_verifier_core_1.expectEqual)("verdict.browserActionEffectSummary", verdict?.browserActionEffectSummary || null, report?.browserActionEffectSummary || null, errors);
        (0, artifact_verifier_core_1.expectEqual)("verdict.evidenceSummary.browserActionEffectChecks", verdict?.evidenceSummary?.browserActionEffectChecks, expectedActionEffectSummary.checks, errors);
        (0, artifact_verifier_core_1.expectEqual)("verdict.evidenceSummary.browserActionEffects", verdict?.evidenceSummary?.browserActionEffects, expectedActionEffectSummary.actions, errors);
        (0, artifact_verifier_core_1.expectEqual)("verdict.evidenceSummary.browserFailedActionEffects", verdict?.evidenceSummary?.browserFailedActionEffects, expectedActionEffectSummary.failed, errors);
        (0, artifact_verifier_core_1.expectEqual)("verdict.evidenceSummary.browserCrossSessionActionEffects", verdict?.evidenceSummary?.browserCrossSessionActionEffects, expectedActionEffectSummary.crossSession, errors);
    }
    if (report?.adversarialEvidenceSummary || verdict?.adversarialEvidenceSummary) {
        const expectedAdversarialSummary = (0, adversarial_summary_1.buildAdversarialEvidenceSummary)({
            required: report?.adversarialEvidenceSummary?.required === true,
            waiverReason: report?.adversarialEvidenceSummary?.waiverReason,
            originalUserGoal: report?.originalUserGoal || "",
            acceptanceCriteria: report?.acceptanceCriteria || [],
            httpResults: report?.httpResults || [],
            browserResults: report?.browserResults || [],
        });
        (0, artifact_verifier_core_1.expectEqual)("report.adversarialEvidenceSummary", report?.adversarialEvidenceSummary || null, expectedAdversarialSummary, errors);
        (0, artifact_verifier_core_1.expectEqual)("verdict.adversarialEvidenceSummary", verdict?.adversarialEvidenceSummary || null, report?.adversarialEvidenceSummary || null, errors);
        (0, artifact_verifier_core_1.expectEqual)("verdict.evidenceSummary.adversarialProbes", verdict?.evidenceSummary?.adversarialProbes, expectedAdversarialSummary.total, errors);
        (0, artifact_verifier_core_1.expectEqual)("verdict.evidenceSummary.adversarialPassed", verdict?.evidenceSummary?.adversarialPassed, expectedAdversarialSummary.passed, errors);
        (0, artifact_verifier_core_1.expectEqual)("verdict.evidenceSummary.adversarialFailed", verdict?.evidenceSummary?.adversarialFailed, expectedAdversarialSummary.failed, errors);
        (0, artifact_verifier_core_1.expectEqual)("verdict.evidenceSummary.adversarialBlocked", verdict?.evidenceSummary?.adversarialBlocked, expectedAdversarialSummary.blocked, errors);
        (0, artifact_verifier_core_1.expectEqual)("verdict.evidenceSummary.adversarialRelevant", verdict?.evidenceSummary?.adversarialRelevant, expectedAdversarialSummary.relevant, errors);
        (0, artifact_verifier_core_1.expectEqual)("verdict.evidenceSummary.adversarialUnlinked", verdict?.evidenceSummary?.adversarialUnlinked, expectedAdversarialSummary.unlinked, errors);
        (0, artifact_verifier_core_1.expectEqual)("verdict.evidenceSummary.adversarialPassedRelevant", verdict?.evidenceSummary?.adversarialPassedRelevant, expectedAdversarialSummary.passedRelevant, errors);
    }
    if (report?.browserProviderSummary || verdict?.browserProviderSummary) {
        (0, artifact_verifier_core_1.expectEqual)("verdict.browserProviderSummary", verdict?.browserProviderSummary || null, report?.browserProviderSummary || null, errors);
    }
    if (Array.isArray(report?.browserProviderGaps) || Array.isArray(verdict?.browserProviderGaps)) {
        (0, artifact_verifier_core_1.expectEqual)("verdict.browserProviderGaps", verdict?.browserProviderGaps || [], report?.browserProviderGaps || [], errors);
        (0, artifact_verifier_core_1.expectEqual)("verdict.evidenceSummary.browserProviderGaps", verdict?.evidenceSummary?.browserProviderGaps, (report?.browserProviderGaps || []).length, errors);
    }
    verifyBrowserSessionEvidenceConsistency(report, errors);
    verifyBrowserStabilityEvidenceConsistency(report, errors);
    verifyBrowserCheckExecutionCoverageConsistency(report, errors);
    verifyBrowserEvidenceTemporalIntegrityConsistency(report, errors);
    verifyBrowserResourceLifecycleConsistency(report, errors);
    verifyBrowserToolEvidenceLineageConsistency(report, errors);
    verifyBrowserToolCallTimeoutConsistency(report, errors);
    (0, artifact_verifier_core_1.verifyBrowserAuthenticationEvidenceConsistency)(report, errors);
    (0, artifact_verifier_core_1.verifyBrowserRecoveryEvidenceConsistency)(report, errors);
    (0, artifact_verifier_core_1.verifyBrowserActionEffectEvidenceConsistency)(report, errors);
    (0, artifact_verifier_core_1.verifyAdversarialEvidenceConsistency)(report, errors);
    (0, artifact_verifier_core_1.verifyAcceptanceEvidenceConsistency)(report, errors);
    verifyHttpPageResourceConsistency(report, errors);
    (0, artifact_verifier_core_1.verifyHttpConcurrencyConsistency)(report, errors);
    const artifactFiles = (report?.metadata?.artifactFiles || {});
    if (artifactFiles.reportJsonPath)
        (0, artifact_verifier_core_1.expectEqual)("verdict.artifacts.reportJsonPath", verdict?.artifacts?.reportJsonPath, artifactFiles.reportJsonPath, errors);
    if (artifactFiles.verdictJsonPath)
        (0, artifact_verifier_core_1.expectEqual)("verdict.artifacts.verdictJsonPath", verdict?.artifacts?.verdictJsonPath, artifactFiles.verdictJsonPath, errors);
    if (artifactFiles.manifestPath)
        (0, artifact_verifier_core_1.expectEqual)("verdict.artifacts.manifestPath", verdict?.artifacts?.manifestPath, artifactFiles.manifestPath, errors);
    if (errors.length)
        return [(0, artifact_verifier_core_1.semanticItem)(reportItem, verdictItem, "failed", errors.join(" "))];
    return [(0, artifact_verifier_core_1.semanticItem)(reportItem, verdictItem, "passed")];
}
function recoveryEvidenceItem(reportItem, status, error) {
    return {
        type: "browser_recovery_evidence",
        title: "Browser session recovery evidence safety",
        path: reportItem.path,
        status,
        ...(error ? { error } : {}),
    };
}
function browserExecutionCoverageEvidenceItem(reportItem, status, error) {
    return {
        type: "browser_execution_coverage_evidence",
        title: "Browser check execution coverage integrity",
        path: reportItem.path,
        status,
        ...(error ? { error } : {}),
    };
}
function browserTemporalEvidenceItem(reportItem, status, error) {
    return {
        type: "browser_temporal_evidence",
        title: "Browser evidence run provenance and temporal integrity",
        path: reportItem.path,
        status,
        ...(error ? { error } : {}),
    };
}
function browserResourceLifecycleEvidenceItem(reportItem, status, error) {
    return {
        type: "browser_resource_lifecycle_evidence",
        title: "Browser resource lifecycle and cleanup integrity",
        path: reportItem.path,
        status,
        ...(error ? { error } : {}),
    };
}
function browserToolLineageEvidenceItem(reportItem, status, error) {
    return {
        type: "browser_tool_lineage_evidence",
        title: "Browser tool-call evidence lineage integrity",
        path: reportItem.path,
        status,
        ...(error ? { error } : {}),
    };
}
function browserToolTimeoutEvidenceItem(reportItem, status, error) {
    return {
        type: "browser_tool_timeout_evidence",
        title: "Browser tool-call timeout evidence integrity",
        path: reportItem.path,
        status,
        ...(error ? { error } : {}),
    };
}
function verifyReportBrowserToolTimeout(manifestPath, manifestFiles, integrityItems) {
    const reportIndex = manifestFiles.findIndex(item => item.type === "report_json");
    if (reportIndex < 0)
        return [];
    const reportItem = manifestFiles[reportIndex];
    if (integrityItems[reportIndex]?.status !== "passed") {
        return [browserToolTimeoutEvidenceItem(reportItem, "skipped", "Report artifact integrity did not pass, so browser tool timeout evidence could not be checked.")];
    }
    try {
        const report = (0, artifact_verifier_core_1.readJsonForSemantic)(manifestPath, reportItem);
        const errors = [];
        verifyBrowserToolCallTimeoutConsistency(report, errors);
        return [browserToolTimeoutEvidenceItem(reportItem, errors.length ? "failed" : "passed", errors.join(" "))];
    }
    catch (error) {
        return [browserToolTimeoutEvidenceItem(reportItem, "failed", `Unable to verify browser tool timeout evidence: ${error.message || String(error)}`)];
    }
}
function verifyReportBrowserToolLineage(manifestPath, manifestFiles, integrityItems) {
    const reportIndex = manifestFiles.findIndex(item => item.type === "report_json");
    if (reportIndex < 0)
        return [];
    const reportItem = manifestFiles[reportIndex];
    if (integrityItems[reportIndex]?.status !== "passed") {
        return [browserToolLineageEvidenceItem(reportItem, "skipped", "Report artifact integrity did not pass, so browser tool evidence lineage could not be checked.")];
    }
    try {
        const report = (0, artifact_verifier_core_1.readJsonForSemantic)(manifestPath, reportItem);
        const errors = [];
        verifyBrowserToolEvidenceLineageConsistency(report, errors);
        const transcriptItem = manifestFiles.find(item => item.type === "browser_tool_transcript");
        if ((report.browserToolCalls || []).length && !transcriptItem) {
            errors.push("Browser tool calls exist without a transcript artifact.");
        }
        if (transcriptItem) {
            const transcriptPath = (0, artifact_verifier_core_1.resolveArtifactPath)(manifestPath, transcriptItem.path);
            const transcriptRecords = fs.readFileSync(transcriptPath, "utf-8")
                .split(/\r?\n/)
                .filter(Boolean)
                .map((line, index) => {
                try {
                    return JSON.parse(line);
                }
                catch {
                    errors.push(`Browser tool transcript line ${index + 1} is not valid JSON.`);
                    return null;
                }
            })
                .filter(Boolean);
            if (!(0, artifact_verifier_core_1.sameJson)(transcriptRecords, report.browserToolCalls || [])) {
                errors.push("Browser tool transcript records do not match report.browserToolCalls.");
            }
        }
        return [browserToolLineageEvidenceItem(reportItem, errors.length ? "failed" : "passed", errors.join(" "))];
    }
    catch (error) {
        return [browserToolLineageEvidenceItem(reportItem, "failed", `Unable to verify browser tool evidence lineage: ${error.message || String(error)}`)];
    }
}
function verifyReportBrowserExecutionCoverage(manifestPath, manifestFiles, integrityItems) {
    const reportIndex = manifestFiles.findIndex(item => item.type === "report_json");
    if (reportIndex < 0)
        return [];
    const reportItem = manifestFiles[reportIndex];
    if (integrityItems[reportIndex]?.status !== "passed") {
        return [browserExecutionCoverageEvidenceItem(reportItem, "skipped", "Report artifact integrity did not pass, so browser execution coverage could not be checked.")];
    }
    try {
        const report = (0, artifact_verifier_core_1.readJsonForSemantic)(manifestPath, reportItem);
        const errors = [];
        verifyBrowserCheckExecutionCoverageConsistency(report, errors);
        return [browserExecutionCoverageEvidenceItem(reportItem, errors.length ? "failed" : "passed", errors.join(" "))];
    }
    catch (error) {
        return [browserExecutionCoverageEvidenceItem(reportItem, "failed", `Unable to read browser execution coverage: ${error.message || String(error)}`)];
    }
}
function verifyReportBrowserTemporalEvidence(manifestPath, manifestFiles, integrityItems) {
    const reportIndex = manifestFiles.findIndex(item => item.type === "report_json");
    if (reportIndex < 0)
        return [];
    const reportItem = manifestFiles[reportIndex];
    if (integrityItems[reportIndex]?.status !== "passed") {
        return [browserTemporalEvidenceItem(reportItem, "skipped", "Report artifact integrity did not pass, so browser temporal evidence could not be checked.")];
    }
    try {
        const report = (0, artifact_verifier_core_1.readJsonForSemantic)(manifestPath, reportItem);
        const errors = [];
        verifyBrowserEvidenceTemporalIntegrityConsistency(report, errors);
        return [browserTemporalEvidenceItem(reportItem, errors.length ? "failed" : "passed", errors.join(" "))];
    }
    catch (error) {
        return [browserTemporalEvidenceItem(reportItem, "failed", `Unable to verify browser temporal evidence: ${error.message || String(error)}`)];
    }
}
function verifyReportBrowserResourceLifecycleEvidence(manifestPath, manifestFiles, integrityItems) {
    const reportIndex = manifestFiles.findIndex(item => item.type === "report_json");
    if (reportIndex < 0)
        return [];
    const reportItem = manifestFiles[reportIndex];
    if (integrityItems[reportIndex]?.status !== "passed") {
        return [browserResourceLifecycleEvidenceItem(reportItem, "skipped", "Report artifact integrity did not pass, so browser resource lifecycle evidence could not be checked.")];
    }
    try {
        const report = (0, artifact_verifier_core_1.readJsonForSemantic)(manifestPath, reportItem);
        const errors = [];
        verifyBrowserResourceLifecycleConsistency(report, errors);
        return [browserResourceLifecycleEvidenceItem(reportItem, errors.length ? "failed" : "passed", errors.join(" "))];
    }
    catch (error) {
        return [browserResourceLifecycleEvidenceItem(reportItem, "failed", `Unable to verify browser resource lifecycle evidence: ${error.message || String(error)}`)];
    }
}
function verifyReportRecoveryEvidence(manifestPath, manifestFiles, integrityItems) {
    const reportIndex = manifestFiles.findIndex(item => item.type === "report_json");
    if (reportIndex < 0)
        return [];
    const reportItem = manifestFiles[reportIndex];
    if (integrityItems[reportIndex]?.status !== "passed") {
        return [recoveryEvidenceItem(reportItem, "skipped", "Report artifact integrity did not pass, so browser recovery evidence could not be checked.")];
    }
    try {
        const report = (0, artifact_verifier_core_1.readJsonForSemantic)(manifestPath, reportItem);
        const errors = [];
        (0, artifact_verifier_core_1.verifyBrowserRecoveryEvidenceConsistency)(report, errors);
        return [recoveryEvidenceItem(reportItem, errors.length ? "failed" : "passed", errors.join(" "))];
    }
    catch (error) {
        return [recoveryEvidenceItem(reportItem, "failed", `Unable to read browser recovery evidence: ${error.message || String(error)}`)];
    }
}
function authenticationEvidenceItem(reportItem, status, error) {
    return {
        type: "browser_authentication_evidence",
        title: "Browser authentication evidence safety",
        path: reportItem.path,
        status,
        ...(error ? { error } : {}),
    };
}
function verifyReportAuthenticationEvidence(manifestPath, manifestFiles, integrityItems) {
    const reportIndex = manifestFiles.findIndex(item => item.type === "report_json");
    if (reportIndex < 0)
        return [];
    const reportItem = manifestFiles[reportIndex];
    if (integrityItems[reportIndex]?.status !== "passed") {
        return [authenticationEvidenceItem(reportItem, "skipped", "Report artifact integrity did not pass, so browser authentication evidence could not be checked.")];
    }
    try {
        const report = (0, artifact_verifier_core_1.readJsonForSemantic)(manifestPath, reportItem);
        const errors = [];
        (0, artifact_verifier_core_1.verifyBrowserAuthenticationEvidenceConsistency)(report, errors);
        const hasMinimalExistingSession = (report.browserResults || []).some(result => result.authentication?.mode === "existing_session"
            && result.authentication.existingSession?.evidencePolicy === "minimal");
        const transcriptItem = manifestFiles.find(item => item.type === "browser_tool_transcript");
        if (hasMinimalExistingSession && report.browserToolCalls.length && !transcriptItem) {
            errors.push("Minimal existing-session browser tool calls exist without a transcript artifact.");
        }
        if (hasMinimalExistingSession && transcriptItem) {
            const transcriptPath = (0, artifact_verifier_core_1.resolveArtifactPath)(manifestPath, transcriptItem.path);
            const transcriptRecords = fs.readFileSync(transcriptPath, "utf-8")
                .split(/\r?\n/)
                .filter(Boolean)
                .map((line, index) => {
                try {
                    return JSON.parse(line);
                }
                catch {
                    errors.push(`Browser tool transcript line ${index + 1} is not valid JSON.`);
                    return null;
                }
            })
                .filter(Boolean);
            if (!(0, artifact_verifier_core_1.sameJson)(transcriptRecords, report.browserToolCalls || [])) {
                errors.push("Browser tool transcript records do not match report.browserToolCalls.");
            }
        }
        return [authenticationEvidenceItem(reportItem, errors.length ? "failed" : "passed", errors.join(" "))];
    }
    catch (error) {
        return [authenticationEvidenceItem(reportItem, "failed", `Unable to read browser authentication evidence: ${error.message || String(error)}`)];
    }
}
function actionEffectEvidenceItem(reportItem, status, error) {
    return {
        type: "browser_action_effect_evidence",
        title: "Browser action-effect evidence integrity",
        path: reportItem.path,
        status,
        ...(error ? { error } : {}),
    };
}
function verifyReportActionEffectEvidence(manifestPath, manifestFiles, integrityItems) {
    const reportIndex = manifestFiles.findIndex(item => item.type === "report_json");
    if (reportIndex < 0)
        return [];
    const reportItem = manifestFiles[reportIndex];
    if (integrityItems[reportIndex]?.status !== "passed") {
        return [actionEffectEvidenceItem(reportItem, "skipped", "Report artifact integrity did not pass, so browser action-effect evidence could not be checked.")];
    }
    try {
        const report = (0, artifact_verifier_core_1.readJsonForSemantic)(manifestPath, reportItem);
        const errors = [];
        (0, artifact_verifier_core_1.verifyBrowserActionEffectEvidenceConsistency)(report, errors);
        return [actionEffectEvidenceItem(reportItem, errors.length ? "failed" : "passed", errors.join(" "))];
    }
    catch (error) {
        return [actionEffectEvidenceItem(reportItem, "failed", `Unable to read browser action-effect evidence: ${error.message || String(error)}`)];
    }
}
function adversarialEvidenceItem(reportItem, status, error) {
    return {
        type: "adversarial_evidence",
        title: "Adversarial evidence gate integrity",
        path: reportItem.path,
        status,
        ...(error ? { error } : {}),
    };
}
function verifyReportAdversarialEvidence(manifestPath, manifestFiles, integrityItems) {
    const reportIndex = manifestFiles.findIndex(item => item.type === "report_json");
    if (reportIndex < 0)
        return [];
    const reportItem = manifestFiles[reportIndex];
    if (integrityItems[reportIndex]?.status !== "passed") {
        return [adversarialEvidenceItem(reportItem, "skipped", "Report artifact integrity did not pass, so adversarial evidence could not be checked.")];
    }
    try {
        const report = (0, artifact_verifier_core_1.readJsonForSemantic)(manifestPath, reportItem);
        const errors = [];
        (0, artifact_verifier_core_1.verifyAdversarialEvidenceConsistency)(report, errors);
        return [adversarialEvidenceItem(reportItem, errors.length ? "failed" : "passed", errors.join(" "))];
    }
    catch (error) {
        return [adversarialEvidenceItem(reportItem, "failed", `Unable to read adversarial evidence: ${error.message || String(error)}`)];
    }
}
function acceptanceEvidenceItem(reportItem, status, error) {
    return {
        type: "acceptance_evidence",
        title: "Required acceptance evidence gate integrity",
        path: reportItem.path,
        status,
        ...(error ? { error } : {}),
    };
}
function verifyReportAcceptanceEvidence(manifestPath, manifestFiles, integrityItems) {
    const reportIndex = manifestFiles.findIndex(item => item.type === "report_json");
    if (reportIndex < 0)
        return [];
    const reportItem = manifestFiles[reportIndex];
    if (integrityItems[reportIndex]?.status !== "passed") {
        return [acceptanceEvidenceItem(reportItem, "skipped", "Report artifact integrity did not pass, so acceptance evidence could not be checked.")];
    }
    try {
        const report = (0, artifact_verifier_core_1.readJsonForSemantic)(manifestPath, reportItem);
        const errors = [];
        (0, artifact_verifier_core_1.verifyAcceptanceEvidenceConsistency)(report, errors);
        return [acceptanceEvidenceItem(reportItem, errors.length ? "failed" : "passed", errors.join(" "))];
    }
    catch (error) {
        return [acceptanceEvidenceItem(reportItem, "failed", `Unable to read acceptance evidence: ${error.message || String(error)}`)];
    }
}
//# sourceMappingURL=artifact-verifier-consistency.js.map