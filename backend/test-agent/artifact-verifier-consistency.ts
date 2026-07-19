// Behavior-freeze split from artifact-verifier.ts (part 2/3).
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import * as zlib from "zlib";
import {
  AcceptanceCoverageItem,
  RequiredCheckCoverageItem,
  TestAgentArtifactManifest,
  TestAgentArtifactManifestItem,
  TestAgentReport,
  TestAgentVerdict,
} from "./types";
import { buildBrowserMultiSessionSummary } from "./browser/multi-session-summary";
import { browserStabilityMetadata, buildBrowserStabilitySummary } from "./browser/stability-summary";
import { browserAuthenticationEvidenceErrors } from "./browser/authentication";
import { buildBrowserAuthenticationSummary } from "./browser/authentication-summary";
import {
  browserRecoveryEvidenceErrors,
  browserRecoverySummaryErrors,
} from "./browser/recovery-validation";
import { buildBrowserRecoverySummary } from "./browser/recovery-summary";
import {
  browserActionEffectResultErrors,
} from "./browser/action-effects";
import {
  browserActionEffectSummaryErrors,
  buildBrowserActionEffectSummary,
} from "./browser/action-effect-summary";
import {
  adversarialEvidenceSummaryErrors,
  buildAdversarialEvidenceSummary,
} from "./adversarial-summary";
import {
  acceptanceEvidenceGateSummaryErrors,
  buildAcceptanceEvidenceGateSummary,
} from "./acceptance-gate";
import {
  buildHttpConcurrencySummary,
  httpConcurrencyEvidenceErrors,
  httpConcurrencyResultStatus,
  httpConcurrencySummaryErrors,
} from "./http-concurrency";
import { httpPageResourceEvidenceErrors } from "./http-page-resources";
import {
  browserCheckExecutionEvidenceErrors,
  buildBrowserCheckExecutionCoverage,
} from "./browser/check-execution-coverage";
import {
  browserToolEvidenceLineageErrors,
  buildBrowserToolEvidenceLineage,
} from "./browser/tool-evidence-lineage";
import {
  browserToolCallTimeoutEvidenceErrors,
  buildBrowserToolCallTimeoutSummary,
} from "./browser/tool-call-timeout";
import {
  browserEvidenceTemporalIntegrityErrors,
  buildBrowserEvidenceTemporalIntegrity,
} from "./browser/evidence-temporal-integrity";
import {
  browserResourceLifecycleErrors,
  buildBrowserResourceLifecycleSummary,
} from "./browser/resource-lifecycle";

import {
  TestAgentArtifactVerificationItem,
  acceptanceEvidenceSourceCounts,
  acceptanceMatchStrengthCounts,
  browserInteractionCount,
  browserNetworkErrorCount,
  compareStringList,
  coverageStatusCounts,
  expectEqual,
  hasVerdictArtifactReference,
  readJsonForSemantic,
  resolveArtifactPath,
  sameJson,
  semanticItem,
  sha256,
  statusCoverageKeys,
  verifyAcceptanceEvidenceConsistency,
  verifyAdversarialEvidenceConsistency,
  verifyBrowserActionEffectEvidenceConsistency,
  verifyBrowserAuthenticationEvidenceConsistency,
  verifyBrowserRecoveryEvidenceConsistency,
  verifyHttpConcurrencyConsistency,
} from "./artifact-verifier-core";

export function verifyHttpPageResourceConsistency(report: TestAgentReport, errors: string[]) {
  for (const [index, result] of (report.httpResults || []).entries()) {
    errors.push(...httpPageResourceEvidenceErrors(result, `report.httpResults[${index}]`));
  }
}

function verifyBrowserSessionEvidenceConsistency(report: TestAgentReport, errors: string[]) {
  for (const [resultIndex, result] of (report?.browserResults || []).entries()) {
    const sessions = result.browserSessions || [];
    if (!sessions.length) continue;
    const label = `report.browserResults[${resultIndex}]`;
    if (sessions.length < 2) errors.push(`${label}.browserSessions must contain at least two sessions.`);
    const names = sessions.map(session => String(session.name || "").trim());
    const normalizedNames = names.map(name => name.toLowerCase());
    if (new Set(normalizedNames).size !== normalizedNames.length) errors.push(`${label}.browserSessions contains duplicate session names.`);
    expectEqual(`${label}.context.multiSession`, result.context?.multiSession, true, errors);
    expectEqual(`${label}.context.sessionCount`, result.context?.sessionCount, sessions.length, errors);
    const contextSessionNames = Array.isArray(result.context?.sessionNames) ? result.context.sessionNames.map(String) : [];
    compareStringList(`${label}.context.sessionNames`, [...names].sort(), contextSessionNames.sort(), errors);
    const parallelGroups = new Map<string, Set<string>>();
    for (const step of result.steps) {
      const group = /(?:^|;\s*)parallelGroup=(\d+)(?:;|$)/.exec(String(step.detail || ""))?.[1];
      if (!group) continue;
      const session = /^session:([^:]+):/.exec(step.name)?.[1] || "";
      if (!parallelGroups.has(group)) parallelGroups.set(group, new Set<string>());
      if (session) parallelGroups.get(group)!.add(session.toLowerCase());
    }
    if (result.context?.parallelGroupCount !== undefined || parallelGroups.size) {
      expectEqual(`${label}.context.parallelGroupCount`, result.context?.parallelGroupCount, parallelGroups.size, errors);
      for (const [group, groupSessions] of parallelGroups) {
        if (groupSessions.size < 2) errors.push(`${label} parallel group ${group} does not contain steps from at least two sessions.`);
      }
    }

    const comparisons = result.browserSessionComparisons || [];
    const comparisonSteps = result.steps.filter(step => /(?:^|;\s*)compareSessions=([^;]+)(?:;|$)/.test(String(step.detail || "")));
    if (result.context?.comparisonCount !== undefined || comparisons.length || comparisonSteps.length) {
      expectEqual(`${label}.context.comparisonCount`, result.context?.comparisonCount, comparisons.length, errors);
      expectEqual(`${label}.browserSessionComparisons.length`, comparisons.length, comparisonSteps.length, errors);
      for (const [comparisonIndex, comparison] of comparisons.entries()) {
        const comparisonLabel = `${label}.browserSessionComparisons[${comparisonIndex}]`;
        const comparisonStep = comparisonSteps[comparisonIndex];
        const left = String(comparison.leftSession || "").trim();
        const right = String(comparison.rightSession || "").trim();
        if (!normalizedNames.includes(left.toLowerCase())) errors.push(`${comparisonLabel}.leftSession references unknown session ${JSON.stringify(left)}.`);
        if (!normalizedNames.includes(right.toLowerCase())) errors.push(`${comparisonLabel}.rightSession references unknown session ${JSON.stringify(right)}.`);
        if (left && right && left.toLowerCase() === right.toLowerCase()) errors.push(`${comparisonLabel} must compare two distinct sessions.`);
        if (!["equals", "notEquals", "includes"].includes(String(comparison.operator || ""))) errors.push(`${comparisonLabel}.operator is invalid.`);
        if (!["passed", "failed"].includes(String(comparison.status || ""))) errors.push(`${comparisonLabel}.status is invalid.`);
        for (const key of ["value", "values", "rawValue", "raw_value", "rawValues", "raw_values", "leftValue", "left_value", "rightValue", "right_value", "actual", "expected"]) {
          if (Object.prototype.hasOwnProperty.call(comparison as any, key)) errors.push(`${comparisonLabel}.${key} must not contain raw compared values.`);
        }
        for (const side of ["left", "right"] as const) {
          const summary = comparison[side];
          if (!summary) continue;
          if (!/^[a-f0-9]{64}$/i.test(String(summary.sha256 || ""))) errors.push(`${comparisonLabel}.${side}.sha256 is not a SHA-256 digest.`);
          if (!Number.isFinite(Number(summary.serializedBytes)) || Number(summary.serializedBytes) < 0) errors.push(`${comparisonLabel}.${side}.serializedBytes must be non-negative.`);
          for (const key of ["value", "values", "rawValue", "raw_value", "rawValues", "raw_values", "actual", "expected"]) {
            if (Object.prototype.hasOwnProperty.call(summary as any, key)) errors.push(`${comparisonLabel}.${side}.${key} must not contain raw compared values.`);
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
          if (operator !== comparison.operator) errors.push(`${comparisonLabel} does not match its comparison step operator.`);
          if (comparisonStep.status !== comparison.status) errors.push(`${comparisonLabel} does not match its comparison step status.`);
        }
      }
    }

    const screenshots = new Set((result.screenshots || []).map(String));
    const pageSnapshots = new Set((result.pageSnapshots || []).map(String));
    const artifactPaths = new Set((result.browserArtifacts || []).map(item => String(item.path || "")));
    for (const session of sessions) {
      for (const screenshot of session.screenshots || []) {
        if (!screenshots.has(String(screenshot))) errors.push(`${label} session ${JSON.stringify(session.name)} screenshot is missing from the browser result aggregate: ${screenshot}.`);
      }
      for (const snapshot of session.pageSnapshots || []) {
        if (!pageSnapshots.has(String(snapshot))) errors.push(`${label} session ${JSON.stringify(session.name)} page snapshot is missing from the browser result aggregate: ${snapshot}.`);
      }
      for (const artifact of session.browserArtifacts || []) {
        if (!artifactPaths.has(String(artifact.path || ""))) errors.push(`${label} session ${JSON.stringify(session.name)} browser artifact is missing from the browser result aggregate: ${artifact.path}.`);
      }
      if (!result.steps.some(step => step.name.startsWith(`session:${session.name}:`))) {
        errors.push(`${label} session ${JSON.stringify(session.name)} has no session-prefixed execution step.`);
      }
    }
  }
}

function verifyBrowserStabilityEvidenceConsistency(report: TestAgentReport, errors: string[]) {
  const groups = new Map<string, Array<{ index: number; result: TestAgentReport["browserResults"][number]; run: number; runs: number }>>();
  for (const [index, result] of (report?.browserResults || []).entries()) {
    const hasSignal = result.context?.browserStability === true
      || result.context?.stabilityGroupId !== undefined
      || result.context?.stabilityRun !== undefined
      || Number(result.context?.stabilityRuns || 0) > 1;
    if (!hasSignal) continue;
    const metadata = browserStabilityMetadata(result);
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
    if (entries.some(entry => entry.runs !== expectedRuns)) errors.push(`${label} has inconsistent stabilityRuns values.`);
    const runs = entries.map(entry => entry.run).sort((a, b) => a - b);
    if (new Set(runs).size !== runs.length) errors.push(`${label} contains duplicate stabilityRun values.`);
    if (runs.some(run => run < 1 || run > expectedRuns)) errors.push(`${label} contains a stabilityRun outside 1..${expectedRuns}.`);
    if (entries.length !== expectedRuns) errors.push(`${label} expected ${expectedRuns} results but found ${entries.length}.`);
    const first = entries[0]?.result;
    for (const entry of entries.slice(1)) {
      if (entry.result.project !== first?.project) errors.push(`${label} mixes projects.`);
      if (entry.result.name !== first?.name) errors.push(`${label} mixes browser check names.`);
      if (entry.result.provider !== first?.provider) errors.push(`${label} mixes browser providers.`);
      if (entry.result.probeType !== first?.probeType) errors.push(`${label} mixes probe types.`);
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

function verifyBrowserCheckExecutionCoverageConsistency(report: TestAgentReport, errors: string[]) {
  const plan = report?.metadata?.browserCheckExecutionPlan;
  const hasExecutionIdentity = (report?.browserResults || []).some(result => result.execution);
  if (!plan) {
    if (hasExecutionIdentity || report?.browserCheckExecutionCoverage) {
      errors.push("Browser execution evidence exists without metadata.browserCheckExecutionPlan.");
    }
    return;
  }
  errors.push(...browserCheckExecutionEvidenceErrors({
    plan,
    results: report?.browserResults || [],
    summary: report?.browserCheckExecutionCoverage,
    reportStatus: report?.status,
  }));
}

function verifyBrowserEvidenceTemporalIntegrityConsistency(report: TestAgentReport, errors: string[]) {
  errors.push(...browserEvidenceTemporalIntegrityErrors(report));
}

function verifyBrowserResourceLifecycleConsistency(report: TestAgentReport, errors: string[]) {
  errors.push(...browserResourceLifecycleErrors(report));
}

function verifyBrowserToolEvidenceLineageConsistency(report: TestAgentReport, errors: string[]) {
  const hasSignal = report?.browserToolEvidenceLineage
    || (report?.browserResults || []).some(result => (result.browserToolCallIds || []).length)
    || (report?.browserToolCalls || []).some(record => record.browserExecution);
  if (!hasSignal) return;
  errors.push(...browserToolEvidenceLineageErrors({
    browserResults: report?.browserResults || [],
    browserToolCalls: report?.browserToolCalls || [],
    summary: report?.browserToolEvidenceLineage,
    reportStatus: report?.status,
  }));
}

function verifyBrowserToolCallTimeoutConsistency(report: TestAgentReport, errors: string[]) {
  const hasSignal = report?.browserToolCallTimeoutSummary
    || (report?.browserToolCalls || []).some(record =>
      record.timeoutMs !== undefined || record.timedOut !== undefined || record.abortRequested !== undefined
    );
  if (!hasSignal) return;
  errors.push(...browserToolCallTimeoutEvidenceErrors({
    browserResults: report?.browserResults || [],
    browserToolCalls: report?.browserToolCalls || [],
    summary: report?.browserToolCallTimeoutSummary,
    reportStatus: report?.status,
  }));
}

export function verifyReportVerdictConsistency(
  manifest: TestAgentArtifactManifest,
  manifestPath: string,
  manifestFiles: TestAgentArtifactManifestItem[],
  integrityItems: TestAgentArtifactVerificationItem[],
): TestAgentArtifactVerificationItem[] {
  const reportIndex = manifestFiles.findIndex(item => item.type === "report_json");
  const verdictIndex = manifestFiles.findIndex(item => item.type === "verdict_json");
  const reportItem = reportIndex >= 0 ? manifestFiles[reportIndex] : undefined;
  const verdictItem = verdictIndex >= 0 ? manifestFiles[verdictIndex] : undefined;

  if (!reportItem && !verdictItem) return [];
  if (!reportItem && verdictItem) {
    return [semanticItem(reportItem, verdictItem, "failed", "Manifest includes verdict_json but no report_json to verify it against.")];
  }
  if (reportItem && !verdictItem) {
    const reportIntegrity = integrityItems[reportIndex];
    if (reportIntegrity?.status !== "passed") {
      return [semanticItem(reportItem, verdictItem, "skipped", "Report artifact integrity did not pass, so verdict consistency could not be checked.")];
    }
    try {
      const report = readJsonForSemantic(manifestPath, reportItem);
      if (hasVerdictArtifactReference(report)) {
        return [semanticItem(reportItem, verdictItem, "failed", "Report metadata references verdictJsonPath, but manifest has no verdict_json entry.")];
      }
      return [semanticItem(reportItem, verdictItem, "skipped", "Manifest has no verdict_json entry; treating as a legacy report without a verdict artifact.")];
    } catch (error: any) {
      return [semanticItem(reportItem, verdictItem, "failed", `Unable to read report_json for verdict consistency: ${error.message || String(error)}`)];
    }
  }

  const reportIntegrity = integrityItems[reportIndex];
  const verdictIntegrity = integrityItems[verdictIndex];
  if (reportIntegrity?.status !== "passed" || verdictIntegrity?.status !== "passed") {
    return [semanticItem(reportItem, verdictItem, "skipped", "Report or verdict artifact integrity did not pass, so semantic consistency could not be checked.")];
  }

  let report: TestAgentReport;
  let verdict: TestAgentVerdict;
  try {
    report = readJsonForSemantic(manifestPath, reportItem!) as TestAgentReport;
    verdict = readJsonForSemantic(manifestPath, verdictItem!) as TestAgentVerdict;
  } catch (error: any) {
    return [semanticItem(reportItem, verdictItem, "failed", `Unable to read report/verdict JSON: ${error.message || String(error)}`)];
  }

  const errors: string[] = [];
  expectEqual("report.schema", report?.schema, "ccm-test-agent-report-v1", errors);
  expectEqual("verdict.schema", verdict?.schema, "ccm-test-agent-verdict-v1", errors);
  expectEqual("manifest.reportId", manifest.reportId, report?.id, errors);
  expectEqual("manifest.workOrderId", manifest.workOrderId, report?.workOrderId, errors);
  expectEqual("manifest.taskId", manifest.taskId, report?.taskId, errors);
  expectEqual("manifest.groupId", manifest.groupId, report?.groupId, errors);
  expectEqual("manifest.originalUserGoal", manifest.originalUserGoal, report?.originalUserGoal, errors);
  expectEqual("manifest.acceptanceCriteria", manifest.acceptanceCriteria, report?.acceptanceCriteria, errors);
  expectEqual("manifest.status", manifest.status, report?.status, errors);
  expectEqual("verdict.reportId", verdict?.reportId, report?.id, errors);
  expectEqual("verdict.workOrderId", verdict?.workOrderId, report?.workOrderId, errors);
  expectEqual("verdict.taskId", verdict?.taskId, report?.taskId, errors);
  expectEqual("verdict.groupId", verdict?.groupId, report?.groupId, errors);
  expectEqual("verdict.status", verdict?.status, report?.status, errors);
  expectEqual("verdict.recommendation", verdict?.recommendation, report?.recommendation, errors);
  expectEqual("verdict.summary", verdict?.summary, report?.summary, errors);
  expectEqual(
    "verdict.canAccept",
    verdict?.canAccept,
    report?.status === "passed"
      && report?.recommendation === "accept"
      && ["verified", "waived"].includes(String(report?.adversarialEvidenceSummary?.status || ""))
      && (!report?.browserCheckExecutionCoverage || report.browserCheckExecutionCoverage.status === "complete")
      && report?.browserEvidenceTemporalIntegrity?.status === "complete"
      && report?.browserResourceLifecycleSummary?.status === "complete"
      && (!report?.browserToolEvidenceLineage || report.browserToolEvidenceLineage.status === "complete")
      && report?.acceptanceEvidenceGateSummary?.canAccept === true,
    errors,
  );
  expectEqual("verdict.needsRework", verdict?.needsRework, report?.recommendation === "rework", errors);
  expectEqual("verdict.needsHuman", verdict?.needsHuman, report?.recommendation === "need_human", errors);

  const expectedFailedRequired = statusCoverageKeys(report?.requiredCheckCoverage, "not_verified", "check");
  const expectedUnknownRequired = statusCoverageKeys(report?.requiredCheckCoverage, "unknown", "check");
  const actualFailedRequired = statusCoverageKeys(verdict?.failedRequiredChecks, "not_verified", "check");
  const actualUnknownRequired = statusCoverageKeys(verdict?.unknownRequiredChecks, "unknown", "check");
  compareStringList("verdict.failedRequiredChecks", expectedFailedRequired, actualFailedRequired, errors);
  compareStringList("verdict.unknownRequiredChecks", expectedUnknownRequired, actualUnknownRequired, errors);

  const expectedFailedAcceptance = statusCoverageKeys(report?.acceptanceCoverage, "not_verified", "criterion");
  const expectedUnknownAcceptance = statusCoverageKeys(report?.acceptanceCoverage, "unknown", "criterion");
  const actualFailedAcceptance = statusCoverageKeys(verdict?.failedAcceptanceCriteria, "not_verified", "criterion");
  const actualUnknownAcceptance = statusCoverageKeys(verdict?.unknownAcceptanceCriteria, "unknown", "criterion");
  compareStringList("verdict.failedAcceptanceCriteria", expectedFailedAcceptance, actualFailedAcceptance, errors);
  compareStringList("verdict.unknownAcceptanceCriteria", expectedUnknownAcceptance, actualUnknownAcceptance, errors);
  expectEqual("verdict.acceptanceSummary.total", verdict?.acceptanceSummary?.total, (report?.acceptanceCoverage || []).length, errors);
  expectEqual("verdict.acceptanceSummary.statusCounts", verdict?.acceptanceSummary?.statusCounts, coverageStatusCounts(report?.acceptanceCoverage), errors);
  expectEqual("verdict.acceptanceSummary.matchStrengthCounts", verdict?.acceptanceSummary?.matchStrengthCounts, acceptanceMatchStrengthCounts(report?.acceptanceCoverage), errors);
  expectEqual("verdict.acceptanceSummary.evidenceSourceCounts", verdict?.acceptanceSummary?.evidenceSourceCounts, acceptanceEvidenceSourceCounts(report?.acceptanceCoverage), errors);
  const expectedAcceptanceGate = buildAcceptanceEvidenceGateSummary(report?.acceptanceCoverage || []);
  expectEqual("report.acceptanceEvidenceGateSummary", report?.acceptanceEvidenceGateSummary, expectedAcceptanceGate, errors);
  expectEqual("verdict.acceptanceEvidenceGateSummary", verdict?.acceptanceEvidenceGateSummary, expectedAcceptanceGate, errors);
  expectEqual("verdict.evidenceSummary.acceptanceMatchedEvidence", verdict?.evidenceSummary?.acceptanceMatchedEvidence, expectedAcceptanceGate.matchedEvidence, errors);
  expectEqual("verdict.evidenceSummary.acceptanceFallbackEvidence", verdict?.evidenceSummary?.acceptanceFallbackEvidence, expectedAcceptanceGate.fallbackEvidence, errors);
  expectEqual("verdict.evidenceSummary.acceptanceMissingEvidence", verdict?.evidenceSummary?.acceptanceMissingEvidence, expectedAcceptanceGate.missingEvidence, errors);
  if (report?.httpConcurrencySummary || verdict?.httpConcurrencySummary || (report?.httpResults || []).some(result => result.concurrency)) {
    const expectedHttpConcurrencySummary = buildHttpConcurrencySummary(report?.httpResults || []);
    expectEqual("report.httpConcurrencySummary", report?.httpConcurrencySummary || null, expectedHttpConcurrencySummary, errors);
    expectEqual("verdict.httpConcurrencySummary", verdict?.httpConcurrencySummary || null, expectedHttpConcurrencySummary, errors);
    expectEqual("verdict.evidenceSummary.httpConcurrencyChecks", verdict?.evidenceSummary?.httpConcurrencyChecks, expectedHttpConcurrencySummary.checks, errors);
    expectEqual("verdict.evidenceSummary.httpConcurrentRequests", verdict?.evidenceSummary?.httpConcurrentRequests, expectedHttpConcurrencySummary.requests, errors);
    expectEqual("verdict.evidenceSummary.httpConcurrentFailed", verdict?.evidenceSummary?.httpConcurrentFailed, expectedHttpConcurrencySummary.failed, errors);
    expectEqual("verdict.evidenceSummary.httpConcurrentBlocked", verdict?.evidenceSummary?.httpConcurrentBlocked, expectedHttpConcurrencySummary.blocked, errors);
  }

  if (Array.isArray(report?.browserNetworkSummary) || Array.isArray(verdict?.browserNetworkSummary)) {
    expectEqual("verdict.browserNetworkSummary", verdict?.browserNetworkSummary || [], report?.browserNetworkSummary || [], errors);
    expectEqual("verdict.evidenceSummary.browserNetworkErrors", verdict?.evidenceSummary?.browserNetworkErrors, browserNetworkErrorCount(report), errors);
  }
  if (Array.isArray(report?.browserInteractionSummary) || Array.isArray(verdict?.browserInteractionSummary)) {
    expectEqual("verdict.browserInteractionSummary", verdict?.browserInteractionSummary || [], report?.browserInteractionSummary || [], errors);
    expectEqual("verdict.evidenceSummary.browserActions", verdict?.evidenceSummary?.browserActions, browserInteractionCount(report, "actionCount"), errors);
    expectEqual("verdict.evidenceSummary.browserFailedActions", verdict?.evidenceSummary?.browserFailedActions, browserInteractionCount(report, "failedActions"), errors);
    expectEqual("verdict.evidenceSummary.browserAssertions", verdict?.evidenceSummary?.browserAssertions, browserInteractionCount(report, "assertionCount"), errors);
    expectEqual("verdict.evidenceSummary.browserFailedAssertions", verdict?.evidenceSummary?.browserFailedAssertions, browserInteractionCount(report, "failedAssertions"), errors);
  }
  if (report?.browserFlowSummary || verdict?.browserFlowSummary) {
    expectEqual("verdict.browserFlowSummary", verdict?.browserFlowSummary || null, report?.browserFlowSummary || null, errors);
    expectEqual("verdict.evidenceSummary.browserAcceptanceFlows", verdict?.evidenceSummary?.browserAcceptanceFlows, report?.browserFlowSummary?.total || 0, errors);
    expectEqual("verdict.evidenceSummary.browserFailedAcceptanceFlows", verdict?.evidenceSummary?.browserFailedAcceptanceFlows, (report?.browserFlowSummary?.statusCounts?.failed || 0) + (report?.browserFlowSummary?.statusCounts?.blocked || 0), errors);
  }
  if (report?.browserMultiSessionSummary || verdict?.browserMultiSessionSummary) {
    const expectedMultiSessionSummary = buildBrowserMultiSessionSummary(report?.browserResults || []);
    expectEqual("report.browserMultiSessionSummary", report?.browserMultiSessionSummary || null, expectedMultiSessionSummary, errors);
    expectEqual("verdict.browserMultiSessionSummary", verdict?.browserMultiSessionSummary || null, report?.browserMultiSessionSummary || null, errors);
    expectEqual("verdict.evidenceSummary.browserMultiSessionScenarios", verdict?.evidenceSummary?.browserMultiSessionScenarios, expectedMultiSessionSummary.total, errors);
    expectEqual("verdict.evidenceSummary.browserMultiSessionSessions", verdict?.evidenceSummary?.browserMultiSessionSessions, expectedMultiSessionSummary.sessionCount, errors);
    expectEqual("verdict.evidenceSummary.browserMultiSessionParallelGroups", verdict?.evidenceSummary?.browserMultiSessionParallelGroups, expectedMultiSessionSummary.parallelGroupCount, errors);
    expectEqual("verdict.evidenceSummary.browserMultiSessionComparisons", verdict?.evidenceSummary?.browserMultiSessionComparisons, expectedMultiSessionSummary.comparisonCount, errors);
    expectEqual("verdict.evidenceSummary.browserFailedSessionComparisons", verdict?.evidenceSummary?.browserFailedSessionComparisons, expectedMultiSessionSummary.failedComparisonCount, errors);
    expectEqual("verdict.evidenceSummary.browserFailedMultiSessionScenarios", verdict?.evidenceSummary?.browserFailedMultiSessionScenarios, expectedMultiSessionSummary.statusCounts.failed + expectedMultiSessionSummary.statusCounts.blocked, errors);
  }
  if (report?.browserStabilitySummary || verdict?.browserStabilitySummary) {
    const expectedStabilitySummary = buildBrowserStabilitySummary(report?.browserResults || []);
    expectEqual("report.browserStabilitySummary", report?.browserStabilitySummary || null, expectedStabilitySummary, errors);
    expectEqual("verdict.browserStabilitySummary", verdict?.browserStabilitySummary || null, report?.browserStabilitySummary || null, errors);
    expectEqual("verdict.evidenceSummary.browserStabilityGroups", verdict?.evidenceSummary?.browserStabilityGroups, expectedStabilitySummary.total, errors);
    expectEqual("verdict.evidenceSummary.browserFlakyStabilityGroups", verdict?.evidenceSummary?.browserFlakyStabilityGroups, expectedStabilitySummary.statusCounts.flaky, errors);
    expectEqual("verdict.evidenceSummary.browserStabilityRuns", verdict?.evidenceSummary?.browserStabilityRuns, expectedStabilitySummary.runCount, errors);
    expectEqual("verdict.evidenceSummary.browserFailedStabilityRuns", verdict?.evidenceSummary?.browserFailedStabilityRuns, expectedStabilitySummary.failedRunCount, errors);
  }
  if (report?.browserCheckExecutionCoverage || verdict?.browserCheckExecutionCoverage) {
    const plan = report?.metadata?.browserCheckExecutionPlan;
    const expectedCoverage = plan
      ? buildBrowserCheckExecutionCoverage(plan, report?.browserResults || [])
      : undefined;
    expectEqual("report.browserCheckExecutionCoverage", report?.browserCheckExecutionCoverage || null, expectedCoverage || null, errors);
    expectEqual("verdict.browserCheckExecutionCoverage", verdict?.browserCheckExecutionCoverage || null, report?.browserCheckExecutionCoverage || null, errors);
    expectEqual("verdict.evidenceSummary.browserPlannedChecks", verdict?.evidenceSummary?.browserPlannedChecks, expectedCoverage?.plannedCheckCount || 0, errors);
    expectEqual("verdict.evidenceSummary.browserExpectedRuns", verdict?.evidenceSummary?.browserExpectedRuns, expectedCoverage?.expectedRunCount || 0, errors);
    expectEqual("verdict.evidenceSummary.browserCoveredRuns", verdict?.evidenceSummary?.browserCoveredRuns, expectedCoverage?.coveredRunCount || 0, errors);
    expectEqual("verdict.evidenceSummary.browserMissingRuns", verdict?.evidenceSummary?.browserMissingRuns, expectedCoverage?.missingRunCount || 0, errors);
    expectEqual("verdict.evidenceSummary.browserDuplicateResults", verdict?.evidenceSummary?.browserDuplicateResults, expectedCoverage?.duplicateResultCount || 0, errors);
    expectEqual("verdict.evidenceSummary.browserInvalidResults", verdict?.evidenceSummary?.browserInvalidResults, expectedCoverage?.invalidResultCount || 0, errors);
  }
  if (report?.browserEvidenceTemporalIntegrity || verdict?.browserEvidenceTemporalIntegrity) {
    const expectedTemporal = buildBrowserEvidenceTemporalIntegrity({
      startedAt: report?.startedAt || "",
      finishedAt: report?.finishedAt || "",
      durationMs: Number(report?.durationMs),
      plan: report?.metadata?.browserCheckExecutionPlan,
      browserResults: report?.browserResults || [],
      browserToolCalls: report?.browserToolCalls || [],
    });
    expectEqual("report.browserEvidenceTemporalIntegrity", report?.browserEvidenceTemporalIntegrity || null, expectedTemporal, errors);
    expectEqual("verdict.browserEvidenceTemporalIntegrity", verdict?.browserEvidenceTemporalIntegrity || null, report?.browserEvidenceTemporalIntegrity || null, errors);
    expectEqual("verdict.evidenceSummary.browserTemporalInvalidItems", verdict?.evidenceSummary?.browserTemporalInvalidItems, expectedTemporal.invalidItemCount, errors);
    expectEqual("verdict.evidenceSummary.browserTemporalPlanMismatches", verdict?.evidenceSummary?.browserTemporalPlanMismatches, expectedTemporal.planMismatchCount, errors);
    expectEqual(
      "verdict.evidenceSummary.browserTemporalWindowViolations",
      verdict?.evidenceSummary?.browserTemporalWindowViolations,
      expectedTemporal.outsideReportWindowCount + expectedTemporal.outsideResultWindowCount,
      errors,
    );
  }
  if (report?.browserResourceLifecycleSummary || verdict?.browserResourceLifecycleSummary) {
    const expectedLifecycle = buildBrowserResourceLifecycleSummary({
      events: report?.browserResourceLifecycleEvents || [],
      plan: report?.metadata?.browserCheckExecutionPlan,
      reportStartedAt: report?.startedAt || "",
      reportFinishedAt: report?.finishedAt || "",
    });
    expectEqual("report.browserResourceLifecycleSummary", report?.browserResourceLifecycleSummary || null, expectedLifecycle, errors);
    expectEqual("verdict.browserResourceLifecycleSummary", verdict?.browserResourceLifecycleSummary || null, report?.browserResourceLifecycleSummary || null, errors);
    expectEqual("verdict.evidenceSummary.browserOwnedResources", verdict?.evidenceSummary?.browserOwnedResources, expectedLifecycle.ownedResourceCount, errors);
    expectEqual("verdict.evidenceSummary.browserReleasedResources", verdict?.evidenceSummary?.browserReleasedResources, expectedLifecycle.releasedResourceCount, errors);
    expectEqual("verdict.evidenceSummary.browserOpenResources", verdict?.evidenceSummary?.browserOpenResources, expectedLifecycle.openResourceCount, errors);
    expectEqual("verdict.evidenceSummary.browserCleanupFailures", verdict?.evidenceSummary?.browserCleanupFailures, expectedLifecycle.cleanupFailureCount, errors);
  }
  if (report?.browserToolEvidenceLineage || verdict?.browserToolEvidenceLineage) {
    const expectedLineage = buildBrowserToolEvidenceLineage(report?.browserResults || [], report?.browserToolCalls || []);
    expectEqual("report.browserToolEvidenceLineage", report?.browserToolEvidenceLineage || null, expectedLineage, errors);
    expectEqual("verdict.browserToolEvidenceLineage", verdict?.browserToolEvidenceLineage || null, report?.browserToolEvidenceLineage || null, errors);
    expectEqual("verdict.evidenceSummary.browserToolLinkedResults", verdict?.evidenceSummary?.browserToolLinkedResults, expectedLineage.linkedResultCount, errors);
    expectEqual("verdict.evidenceSummary.browserToolUnlinkedResults", verdict?.evidenceSummary?.browserToolUnlinkedResults, expectedLineage.unlinkedRequiredResultCount, errors);
    expectEqual("verdict.evidenceSummary.browserToolLinkedCalls", verdict?.evidenceSummary?.browserToolLinkedCalls, expectedLineage.linkedToolCallCount, errors);
    expectEqual("verdict.evidenceSummary.browserToolOrphanCalls", verdict?.evidenceSummary?.browserToolOrphanCalls, expectedLineage.orphanScopedToolCallCount, errors);
    expectEqual("verdict.evidenceSummary.browserToolUnscopedCalls", verdict?.evidenceSummary?.browserToolUnscopedCalls, expectedLineage.unscopedToolCallCount, errors);
    expectEqual(
      "verdict.evidenceSummary.browserToolInvalidLinks",
      verdict?.evidenceSummary?.browserToolInvalidLinks,
      expectedLineage.missingToolCallReferenceCount + expectedLineage.foreignToolCallReferenceCount + expectedLineage.duplicateToolCallReferenceCount + expectedLineage.duplicateToolCallRecordCount,
      errors,
    );
  }
  if (report?.browserToolCallTimeoutSummary || verdict?.browserToolCallTimeoutSummary) {
    const expectedTimeoutSummary = buildBrowserToolCallTimeoutSummary(report?.browserToolCalls || []);
    expectEqual("report.browserToolCallTimeoutSummary", report?.browserToolCallTimeoutSummary || null, expectedTimeoutSummary, errors);
    expectEqual("verdict.browserToolCallTimeoutSummary", verdict?.browserToolCallTimeoutSummary || null, report?.browserToolCallTimeoutSummary || null, errors);
    expectEqual("verdict.evidenceSummary.browserToolTimedOutCalls", verdict?.evidenceSummary?.browserToolTimedOutCalls, expectedTimeoutSummary.timedOutCalls, errors);
    expectEqual("verdict.evidenceSummary.browserToolAbortRequestedCalls", verdict?.evidenceSummary?.browserToolAbortRequestedCalls, expectedTimeoutSummary.abortRequestedCalls, errors);
  }
  if (
    report?.browserRecoverySummary
    || verdict?.browserRecoverySummary
    || (report?.browserResults || []).some(result => result.recovery)
  ) {
    const expectedRecoverySummary = buildBrowserRecoverySummary(report?.browserResults || []);
    expectEqual("report.browserRecoverySummary", report?.browserRecoverySummary || null, expectedRecoverySummary, errors);
    expectEqual("verdict.browserRecoverySummary", verdict?.browserRecoverySummary || null, report?.browserRecoverySummary || null, errors);
    expectEqual("verdict.evidenceSummary.browserRecoveryAttempts", verdict?.evidenceSummary?.browserRecoveryAttempts, expectedRecoverySummary.attempted, errors);
    expectEqual("verdict.evidenceSummary.browserRecoveredOperations", verdict?.evidenceSummary?.browserRecoveredOperations, expectedRecoverySummary.recovered, errors);
    expectEqual("verdict.evidenceSummary.browserFailedRecoveries", verdict?.evidenceSummary?.browserFailedRecoveries, expectedRecoverySummary.failed, errors);
    expectEqual("verdict.evidenceSummary.browserUnsafeRetriesPrevented", verdict?.evidenceSummary?.browserUnsafeRetriesPrevented, expectedRecoverySummary.notRetried, errors);
  }
  if (
    report?.browserActionEffectSummary
    || verdict?.browserActionEffectSummary
    || (report?.browserResults || []).some(result => (result.actionEffects || []).length)
  ) {
    const expectedActionEffectSummary = buildBrowserActionEffectSummary(report?.browserResults || []);
    expectEqual("report.browserActionEffectSummary", report?.browserActionEffectSummary || null, expectedActionEffectSummary, errors);
    expectEqual("verdict.browserActionEffectSummary", verdict?.browserActionEffectSummary || null, report?.browserActionEffectSummary || null, errors);
    expectEqual("verdict.evidenceSummary.browserActionEffectChecks", verdict?.evidenceSummary?.browserActionEffectChecks, expectedActionEffectSummary.checks, errors);
    expectEqual("verdict.evidenceSummary.browserActionEffects", verdict?.evidenceSummary?.browserActionEffects, expectedActionEffectSummary.actions, errors);
    expectEqual("verdict.evidenceSummary.browserFailedActionEffects", verdict?.evidenceSummary?.browserFailedActionEffects, expectedActionEffectSummary.failed, errors);
    expectEqual("verdict.evidenceSummary.browserCrossSessionActionEffects", verdict?.evidenceSummary?.browserCrossSessionActionEffects, expectedActionEffectSummary.crossSession, errors);
  }
  if (report?.adversarialEvidenceSummary || verdict?.adversarialEvidenceSummary) {
    const expectedAdversarialSummary = buildAdversarialEvidenceSummary({
      required: report?.adversarialEvidenceSummary?.required === true,
      waiverReason: report?.adversarialEvidenceSummary?.waiverReason,
      originalUserGoal: report?.originalUserGoal || "",
      acceptanceCriteria: report?.acceptanceCriteria || [],
      httpResults: report?.httpResults || [],
      browserResults: report?.browserResults || [],
    });
    expectEqual("report.adversarialEvidenceSummary", report?.adversarialEvidenceSummary || null, expectedAdversarialSummary, errors);
    expectEqual("verdict.adversarialEvidenceSummary", verdict?.adversarialEvidenceSummary || null, report?.adversarialEvidenceSummary || null, errors);
    expectEqual("verdict.evidenceSummary.adversarialProbes", verdict?.evidenceSummary?.adversarialProbes, expectedAdversarialSummary.total, errors);
    expectEqual("verdict.evidenceSummary.adversarialPassed", verdict?.evidenceSummary?.adversarialPassed, expectedAdversarialSummary.passed, errors);
    expectEqual("verdict.evidenceSummary.adversarialFailed", verdict?.evidenceSummary?.adversarialFailed, expectedAdversarialSummary.failed, errors);
    expectEqual("verdict.evidenceSummary.adversarialBlocked", verdict?.evidenceSummary?.adversarialBlocked, expectedAdversarialSummary.blocked, errors);
    expectEqual("verdict.evidenceSummary.adversarialRelevant", verdict?.evidenceSummary?.adversarialRelevant, expectedAdversarialSummary.relevant, errors);
    expectEqual("verdict.evidenceSummary.adversarialUnlinked", verdict?.evidenceSummary?.adversarialUnlinked, expectedAdversarialSummary.unlinked, errors);
    expectEqual("verdict.evidenceSummary.adversarialPassedRelevant", verdict?.evidenceSummary?.adversarialPassedRelevant, expectedAdversarialSummary.passedRelevant, errors);
  }
  if (report?.browserProviderSummary || verdict?.browserProviderSummary) {
    expectEqual("verdict.browserProviderSummary", verdict?.browserProviderSummary || null, report?.browserProviderSummary || null, errors);
  }
  if (Array.isArray(report?.browserProviderGaps) || Array.isArray(verdict?.browserProviderGaps)) {
    expectEqual("verdict.browserProviderGaps", verdict?.browserProviderGaps || [], report?.browserProviderGaps || [], errors);
    expectEqual("verdict.evidenceSummary.browserProviderGaps", verdict?.evidenceSummary?.browserProviderGaps, (report?.browserProviderGaps || []).length, errors);
  }
  verifyBrowserSessionEvidenceConsistency(report, errors);
  verifyBrowserStabilityEvidenceConsistency(report, errors);
  verifyBrowserCheckExecutionCoverageConsistency(report, errors);
  verifyBrowserEvidenceTemporalIntegrityConsistency(report, errors);
  verifyBrowserResourceLifecycleConsistency(report, errors);
  verifyBrowserToolEvidenceLineageConsistency(report, errors);
  verifyBrowserToolCallTimeoutConsistency(report, errors);
  verifyBrowserAuthenticationEvidenceConsistency(report, errors);
  verifyBrowserRecoveryEvidenceConsistency(report, errors);
  verifyBrowserActionEffectEvidenceConsistency(report, errors);
  verifyAdversarialEvidenceConsistency(report, errors);
  verifyAcceptanceEvidenceConsistency(report, errors);
  verifyHttpPageResourceConsistency(report, errors);
  verifyHttpConcurrencyConsistency(report, errors);

  const artifactFiles = (report?.metadata?.artifactFiles || {}) as Record<string, string>;
  if (artifactFiles.reportJsonPath) expectEqual("verdict.artifacts.reportJsonPath", verdict?.artifacts?.reportJsonPath, artifactFiles.reportJsonPath, errors);
  if (artifactFiles.verdictJsonPath) expectEqual("verdict.artifacts.verdictJsonPath", verdict?.artifacts?.verdictJsonPath, artifactFiles.verdictJsonPath, errors);
  if (artifactFiles.manifestPath) expectEqual("verdict.artifacts.manifestPath", verdict?.artifacts?.manifestPath, artifactFiles.manifestPath, errors);

  if (errors.length) return [semanticItem(reportItem, verdictItem, "failed", errors.join(" "))];
  return [semanticItem(reportItem, verdictItem, "passed")];
}

function recoveryEvidenceItem(
  reportItem: TestAgentArtifactManifestItem,
  status: TestAgentArtifactVerificationItem["status"],
  error?: string,
): TestAgentArtifactVerificationItem {
  return {
    type: "browser_recovery_evidence",
    title: "Browser session recovery evidence safety",
    path: reportItem.path,
    status,
    ...(error ? { error } : {}),
  };
}

function browserExecutionCoverageEvidenceItem(
  reportItem: TestAgentArtifactManifestItem,
  status: TestAgentArtifactVerificationItem["status"],
  error?: string,
): TestAgentArtifactVerificationItem {
  return {
    type: "browser_execution_coverage_evidence",
    title: "Browser check execution coverage integrity",
    path: reportItem.path,
    status,
    ...(error ? { error } : {}),
  };
}

function browserTemporalEvidenceItem(
  reportItem: TestAgentArtifactManifestItem,
  status: TestAgentArtifactVerificationItem["status"],
  error?: string,
): TestAgentArtifactVerificationItem {
  return {
    type: "browser_temporal_evidence",
    title: "Browser evidence run provenance and temporal integrity",
    path: reportItem.path,
    status,
    ...(error ? { error } : {}),
  };
}

function browserResourceLifecycleEvidenceItem(
  reportItem: TestAgentArtifactManifestItem,
  status: TestAgentArtifactVerificationItem["status"],
  error?: string,
): TestAgentArtifactVerificationItem {
  return {
    type: "browser_resource_lifecycle_evidence",
    title: "Browser resource lifecycle and cleanup integrity",
    path: reportItem.path,
    status,
    ...(error ? { error } : {}),
  };
}

function browserToolLineageEvidenceItem(
  reportItem: TestAgentArtifactManifestItem,
  status: TestAgentArtifactVerificationItem["status"],
  error?: string,
): TestAgentArtifactVerificationItem {
  return {
    type: "browser_tool_lineage_evidence",
    title: "Browser tool-call evidence lineage integrity",
    path: reportItem.path,
    status,
    ...(error ? { error } : {}),
  };
}

function browserToolTimeoutEvidenceItem(
  reportItem: TestAgentArtifactManifestItem,
  status: TestAgentArtifactVerificationItem["status"],
  error?: string,
): TestAgentArtifactVerificationItem {
  return {
    type: "browser_tool_timeout_evidence",
    title: "Browser tool-call timeout evidence integrity",
    path: reportItem.path,
    status,
    ...(error ? { error } : {}),
  };
}

export function verifyReportBrowserToolTimeout(
  manifestPath: string,
  manifestFiles: TestAgentArtifactManifestItem[],
  integrityItems: TestAgentArtifactVerificationItem[],
) {
  const reportIndex = manifestFiles.findIndex(item => item.type === "report_json");
  if (reportIndex < 0) return [] as TestAgentArtifactVerificationItem[];
  const reportItem = manifestFiles[reportIndex];
  if (integrityItems[reportIndex]?.status !== "passed") {
    return [browserToolTimeoutEvidenceItem(reportItem, "skipped", "Report artifact integrity did not pass, so browser tool timeout evidence could not be checked.")];
  }
  try {
    const report = readJsonForSemantic(manifestPath, reportItem) as TestAgentReport;
    const errors: string[] = [];
    verifyBrowserToolCallTimeoutConsistency(report, errors);
    return [browserToolTimeoutEvidenceItem(reportItem, errors.length ? "failed" : "passed", errors.join(" "))];
  } catch (error: any) {
    return [browserToolTimeoutEvidenceItem(reportItem, "failed", `Unable to verify browser tool timeout evidence: ${error.message || String(error)}`)];
  }
}

export function verifyReportBrowserToolLineage(
  manifestPath: string,
  manifestFiles: TestAgentArtifactManifestItem[],
  integrityItems: TestAgentArtifactVerificationItem[],
) {
  const reportIndex = manifestFiles.findIndex(item => item.type === "report_json");
  if (reportIndex < 0) return [] as TestAgentArtifactVerificationItem[];
  const reportItem = manifestFiles[reportIndex];
  if (integrityItems[reportIndex]?.status !== "passed") {
    return [browserToolLineageEvidenceItem(reportItem, "skipped", "Report artifact integrity did not pass, so browser tool evidence lineage could not be checked.")];
  }
  try {
    const report = readJsonForSemantic(manifestPath, reportItem) as TestAgentReport;
    const errors: string[] = [];
    verifyBrowserToolEvidenceLineageConsistency(report, errors);
    const transcriptItem = manifestFiles.find(item => item.type === "browser_tool_transcript");
    if ((report.browserToolCalls || []).length && !transcriptItem) {
      errors.push("Browser tool calls exist without a transcript artifact.");
    }
    if (transcriptItem) {
      const transcriptPath = resolveArtifactPath(manifestPath, transcriptItem.path);
      const transcriptRecords = fs.readFileSync(transcriptPath, "utf-8")
        .split(/\r?\n/)
        .filter(Boolean)
        .map((line, index) => {
          try {
            return JSON.parse(line);
          } catch {
            errors.push(`Browser tool transcript line ${index + 1} is not valid JSON.`);
            return null;
          }
        })
        .filter(Boolean);
      if (!sameJson(transcriptRecords, report.browserToolCalls || [])) {
        errors.push("Browser tool transcript records do not match report.browserToolCalls.");
      }
    }
    return [browserToolLineageEvidenceItem(reportItem, errors.length ? "failed" : "passed", errors.join(" "))];
  } catch (error: any) {
    return [browserToolLineageEvidenceItem(reportItem, "failed", `Unable to verify browser tool evidence lineage: ${error.message || String(error)}`)];
  }
}

export function verifyReportBrowserExecutionCoverage(
  manifestPath: string,
  manifestFiles: TestAgentArtifactManifestItem[],
  integrityItems: TestAgentArtifactVerificationItem[],
) {
  const reportIndex = manifestFiles.findIndex(item => item.type === "report_json");
  if (reportIndex < 0) return [] as TestAgentArtifactVerificationItem[];
  const reportItem = manifestFiles[reportIndex];
  if (integrityItems[reportIndex]?.status !== "passed") {
    return [browserExecutionCoverageEvidenceItem(reportItem, "skipped", "Report artifact integrity did not pass, so browser execution coverage could not be checked.")];
  }
  try {
    const report = readJsonForSemantic(manifestPath, reportItem) as TestAgentReport;
    const errors: string[] = [];
    verifyBrowserCheckExecutionCoverageConsistency(report, errors);
    return [browserExecutionCoverageEvidenceItem(reportItem, errors.length ? "failed" : "passed", errors.join(" "))];
  } catch (error: any) {
    return [browserExecutionCoverageEvidenceItem(reportItem, "failed", `Unable to read browser execution coverage: ${error.message || String(error)}`)];
  }
}

export function verifyReportBrowserTemporalEvidence(
  manifestPath: string,
  manifestFiles: TestAgentArtifactManifestItem[],
  integrityItems: TestAgentArtifactVerificationItem[],
) {
  const reportIndex = manifestFiles.findIndex(item => item.type === "report_json");
  if (reportIndex < 0) return [] as TestAgentArtifactVerificationItem[];
  const reportItem = manifestFiles[reportIndex];
  if (integrityItems[reportIndex]?.status !== "passed") {
    return [browserTemporalEvidenceItem(reportItem, "skipped", "Report artifact integrity did not pass, so browser temporal evidence could not be checked.")];
  }
  try {
    const report = readJsonForSemantic(manifestPath, reportItem) as TestAgentReport;
    const errors: string[] = [];
    verifyBrowserEvidenceTemporalIntegrityConsistency(report, errors);
    return [browserTemporalEvidenceItem(reportItem, errors.length ? "failed" : "passed", errors.join(" "))];
  } catch (error: any) {
    return [browserTemporalEvidenceItem(reportItem, "failed", `Unable to verify browser temporal evidence: ${error.message || String(error)}`)];
  }
}

export function verifyReportBrowserResourceLifecycleEvidence(
  manifestPath: string,
  manifestFiles: TestAgentArtifactManifestItem[],
  integrityItems: TestAgentArtifactVerificationItem[],
) {
  const reportIndex = manifestFiles.findIndex(item => item.type === "report_json");
  if (reportIndex < 0) return [] as TestAgentArtifactVerificationItem[];
  const reportItem = manifestFiles[reportIndex];
  if (integrityItems[reportIndex]?.status !== "passed") {
    return [browserResourceLifecycleEvidenceItem(reportItem, "skipped", "Report artifact integrity did not pass, so browser resource lifecycle evidence could not be checked.")];
  }
  try {
    const report = readJsonForSemantic(manifestPath, reportItem) as TestAgentReport;
    const errors: string[] = [];
    verifyBrowserResourceLifecycleConsistency(report, errors);
    return [browserResourceLifecycleEvidenceItem(reportItem, errors.length ? "failed" : "passed", errors.join(" "))];
  } catch (error: any) {
    return [browserResourceLifecycleEvidenceItem(reportItem, "failed", `Unable to verify browser resource lifecycle evidence: ${error.message || String(error)}`)];
  }
}

export function verifyReportRecoveryEvidence(
  manifestPath: string,
  manifestFiles: TestAgentArtifactManifestItem[],
  integrityItems: TestAgentArtifactVerificationItem[],
) {
  const reportIndex = manifestFiles.findIndex(item => item.type === "report_json");
  if (reportIndex < 0) return [] as TestAgentArtifactVerificationItem[];
  const reportItem = manifestFiles[reportIndex];
  if (integrityItems[reportIndex]?.status !== "passed") {
    return [recoveryEvidenceItem(reportItem, "skipped", "Report artifact integrity did not pass, so browser recovery evidence could not be checked.")];
  }
  try {
    const report = readJsonForSemantic(manifestPath, reportItem) as TestAgentReport;
    const errors: string[] = [];
    verifyBrowserRecoveryEvidenceConsistency(report, errors);
    return [recoveryEvidenceItem(reportItem, errors.length ? "failed" : "passed", errors.join(" "))];
  } catch (error: any) {
    return [recoveryEvidenceItem(reportItem, "failed", `Unable to read browser recovery evidence: ${error.message || String(error)}`)];
  }
}

function authenticationEvidenceItem(
  reportItem: TestAgentArtifactManifestItem,
  status: TestAgentArtifactVerificationItem["status"],
  error?: string,
): TestAgentArtifactVerificationItem {
  return {
    type: "browser_authentication_evidence",
    title: "Browser authentication evidence safety",
    path: reportItem.path,
    status,
    ...(error ? { error } : {}),
  };
}

export function verifyReportAuthenticationEvidence(
  manifestPath: string,
  manifestFiles: TestAgentArtifactManifestItem[],
  integrityItems: TestAgentArtifactVerificationItem[],
) {
  const reportIndex = manifestFiles.findIndex(item => item.type === "report_json");
  if (reportIndex < 0) return [] as TestAgentArtifactVerificationItem[];
  const reportItem = manifestFiles[reportIndex];
  if (integrityItems[reportIndex]?.status !== "passed") {
    return [authenticationEvidenceItem(reportItem, "skipped", "Report artifact integrity did not pass, so browser authentication evidence could not be checked.")];
  }
  try {
    const report = readJsonForSemantic(manifestPath, reportItem) as TestAgentReport;
    const errors: string[] = [];
    verifyBrowserAuthenticationEvidenceConsistency(report, errors);
    const hasMinimalExistingSession = (report.browserResults || []).some(result =>
      result.authentication?.mode === "existing_session"
      && result.authentication.existingSession?.evidencePolicy === "minimal"
    );
    const transcriptItem = manifestFiles.find(item => item.type === "browser_tool_transcript");
    if (hasMinimalExistingSession && report.browserToolCalls.length && !transcriptItem) {
      errors.push("Minimal existing-session browser tool calls exist without a transcript artifact.");
    }
    if (hasMinimalExistingSession && transcriptItem) {
      const transcriptPath = resolveArtifactPath(manifestPath, transcriptItem.path);
      const transcriptRecords = fs.readFileSync(transcriptPath, "utf-8")
        .split(/\r?\n/)
        .filter(Boolean)
        .map((line, index) => {
          try {
            return JSON.parse(line);
          } catch {
            errors.push(`Browser tool transcript line ${index + 1} is not valid JSON.`);
            return null;
          }
        })
        .filter(Boolean);
      if (!sameJson(transcriptRecords, report.browserToolCalls || [])) {
        errors.push("Browser tool transcript records do not match report.browserToolCalls.");
      }
    }
    return [authenticationEvidenceItem(reportItem, errors.length ? "failed" : "passed", errors.join(" "))];
  } catch (error: any) {
    return [authenticationEvidenceItem(reportItem, "failed", `Unable to read browser authentication evidence: ${error.message || String(error)}`)];
  }
}

function actionEffectEvidenceItem(
  reportItem: TestAgentArtifactManifestItem,
  status: TestAgentArtifactVerificationItem["status"],
  error?: string,
): TestAgentArtifactVerificationItem {
  return {
    type: "browser_action_effect_evidence",
    title: "Browser action-effect evidence integrity",
    path: reportItem.path,
    status,
    ...(error ? { error } : {}),
  };
}

export function verifyReportActionEffectEvidence(
  manifestPath: string,
  manifestFiles: TestAgentArtifactManifestItem[],
  integrityItems: TestAgentArtifactVerificationItem[],
) {
  const reportIndex = manifestFiles.findIndex(item => item.type === "report_json");
  if (reportIndex < 0) return [] as TestAgentArtifactVerificationItem[];
  const reportItem = manifestFiles[reportIndex];
  if (integrityItems[reportIndex]?.status !== "passed") {
    return [actionEffectEvidenceItem(reportItem, "skipped", "Report artifact integrity did not pass, so browser action-effect evidence could not be checked.")];
  }
  try {
    const report = readJsonForSemantic(manifestPath, reportItem) as TestAgentReport;
    const errors: string[] = [];
    verifyBrowserActionEffectEvidenceConsistency(report, errors);
    return [actionEffectEvidenceItem(reportItem, errors.length ? "failed" : "passed", errors.join(" "))];
  } catch (error: any) {
    return [actionEffectEvidenceItem(reportItem, "failed", `Unable to read browser action-effect evidence: ${error.message || String(error)}`)];
  }
}

function adversarialEvidenceItem(
  reportItem: TestAgentArtifactManifestItem,
  status: TestAgentArtifactVerificationItem["status"],
  error?: string,
): TestAgentArtifactVerificationItem {
  return {
    type: "adversarial_evidence",
    title: "Adversarial evidence gate integrity",
    path: reportItem.path,
    status,
    ...(error ? { error } : {}),
  };
}

export function verifyReportAdversarialEvidence(
  manifestPath: string,
  manifestFiles: TestAgentArtifactManifestItem[],
  integrityItems: TestAgentArtifactVerificationItem[],
) {
  const reportIndex = manifestFiles.findIndex(item => item.type === "report_json");
  if (reportIndex < 0) return [] as TestAgentArtifactVerificationItem[];
  const reportItem = manifestFiles[reportIndex];
  if (integrityItems[reportIndex]?.status !== "passed") {
    return [adversarialEvidenceItem(reportItem, "skipped", "Report artifact integrity did not pass, so adversarial evidence could not be checked.")];
  }
  try {
    const report = readJsonForSemantic(manifestPath, reportItem) as TestAgentReport;
    const errors: string[] = [];
    verifyAdversarialEvidenceConsistency(report, errors);
    return [adversarialEvidenceItem(reportItem, errors.length ? "failed" : "passed", errors.join(" "))];
  } catch (error: any) {
    return [adversarialEvidenceItem(reportItem, "failed", `Unable to read adversarial evidence: ${error.message || String(error)}`)];
  }
}

function acceptanceEvidenceItem(
  reportItem: TestAgentArtifactManifestItem,
  status: TestAgentArtifactVerificationItem["status"],
  error?: string,
): TestAgentArtifactVerificationItem {
  return {
    type: "acceptance_evidence",
    title: "Required acceptance evidence gate integrity",
    path: reportItem.path,
    status,
    ...(error ? { error } : {}),
  };
}

export function verifyReportAcceptanceEvidence(
  manifestPath: string,
  manifestFiles: TestAgentArtifactManifestItem[],
  integrityItems: TestAgentArtifactVerificationItem[],
) {
  const reportIndex = manifestFiles.findIndex(item => item.type === "report_json");
  if (reportIndex < 0) return [] as TestAgentArtifactVerificationItem[];
  const reportItem = manifestFiles[reportIndex];
  if (integrityItems[reportIndex]?.status !== "passed") {
    return [acceptanceEvidenceItem(reportItem, "skipped", "Report artifact integrity did not pass, so acceptance evidence could not be checked.")];
  }
  try {
    const report = readJsonForSemantic(manifestPath, reportItem) as TestAgentReport;
    const errors: string[] = [];
    verifyAcceptanceEvidenceConsistency(report, errors);
    return [acceptanceEvidenceItem(reportItem, errors.length ? "failed" : "passed", errors.join(" "))];
  } catch (error: any) {
    return [acceptanceEvidenceItem(reportItem, "failed", `Unable to read acceptance evidence: ${error.message || String(error)}`)];
  }
}
