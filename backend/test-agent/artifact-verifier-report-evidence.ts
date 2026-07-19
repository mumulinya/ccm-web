// Behavior-freeze split from artifact-verifier.ts (part 3/3).
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
  TestAgentArtifactVerification,
  TestAgentArtifactVerificationItem,
  readJson,
  readJsonForSemantic,
  verifyBrowserEvidenceArtifactMetadata,
  verifyHttpConcurrencyConsistency,
  verifyManifestItem,
  verifyScreenshotMetadata,
} from "./artifact-verifier-core";

import {
  verifyHttpPageResourceConsistency,
  verifyReportAcceptanceEvidence,
  verifyReportActionEffectEvidence,
  verifyReportAdversarialEvidence,
  verifyReportAuthenticationEvidence,
  verifyReportBrowserExecutionCoverage,
  verifyReportBrowserResourceLifecycleEvidence,
  verifyReportBrowserTemporalEvidence,
  verifyReportBrowserToolLineage,
  verifyReportBrowserToolTimeout,
  verifyReportRecoveryEvidence,
  verifyReportVerdictConsistency,
} from "./artifact-verifier-consistency";

function httpConcurrencyEvidenceItem(
  reportItem: TestAgentArtifactManifestItem,
  status: TestAgentArtifactVerificationItem["status"],
  error?: string,
): TestAgentArtifactVerificationItem {
  return {
    type: "http_concurrency_evidence",
    title: "Concurrent HTTP evidence integrity",
    path: reportItem.path,
    status,
    ...(error ? { error } : {}),
  };
}

function httpPageResourceEvidenceItem(
  reportItem: TestAgentArtifactManifestItem,
  status: TestAgentArtifactVerificationItem["status"],
  error?: string,
): TestAgentArtifactVerificationItem {
  return {
    type: "http_page_resource_evidence",
    title: "HTTP page subresource evidence integrity",
    path: reportItem.path,
    status,
    ...(error ? { error } : {}),
  };
}

function verifyReportHttpPageResourceEvidence(
  manifestPath: string,
  manifestFiles: TestAgentArtifactManifestItem[],
  integrityItems: TestAgentArtifactVerificationItem[],
) {
  const reportIndex = manifestFiles.findIndex(item => item.type === "report_json");
  if (reportIndex < 0) return [] as TestAgentArtifactVerificationItem[];
  const reportItem = manifestFiles[reportIndex];
  if (integrityItems[reportIndex]?.status !== "passed") {
    return [httpPageResourceEvidenceItem(reportItem, "skipped", "Report artifact integrity did not pass, so HTTP page resources could not be checked.")];
  }
  try {
    const report = readJsonForSemantic(manifestPath, reportItem) as TestAgentReport;
    if (!(report.httpResults || []).some(result => result.context?.pageResourceProbe === true)) {
      return [] as TestAgentArtifactVerificationItem[];
    }
    const errors: string[] = [];
    verifyHttpPageResourceConsistency(report, errors);
    return [httpPageResourceEvidenceItem(reportItem, errors.length ? "failed" : "passed", errors.join(" "))];
  } catch (error: any) {
    return [httpPageResourceEvidenceItem(reportItem, "failed", `Unable to read HTTP page resource evidence: ${error.message || String(error)}`)];
  }
}

function verifyReportHttpConcurrencyEvidence(
  manifestPath: string,
  manifestFiles: TestAgentArtifactManifestItem[],
  integrityItems: TestAgentArtifactVerificationItem[],
) {
  const reportIndex = manifestFiles.findIndex(item => item.type === "report_json");
  if (reportIndex < 0) return [] as TestAgentArtifactVerificationItem[];
  const reportItem = manifestFiles[reportIndex];
  if (integrityItems[reportIndex]?.status !== "passed") {
    return [httpConcurrencyEvidenceItem(reportItem, "skipped", "Report artifact integrity did not pass, so concurrent HTTP evidence could not be checked.")];
  }
  try {
    const report = readJsonForSemantic(manifestPath, reportItem) as TestAgentReport;
    const hasConcurrency = (report.httpResults || []).some(result => result.concurrency)
      || Number(report.httpConcurrencySummary?.checks || 0) > 0;
    if (!hasConcurrency) return [] as TestAgentArtifactVerificationItem[];
    const errors: string[] = [];
    verifyHttpConcurrencyConsistency(report, errors);
    return [httpConcurrencyEvidenceItem(reportItem, errors.length ? "failed" : "passed", errors.join(" "))];
  } catch (error: any) {
    return [httpConcurrencyEvidenceItem(reportItem, "failed", `Unable to read concurrent HTTP evidence: ${error.message || String(error)}`)];
  }
}

export function verifyTestAgentArtifactManifest(manifest: TestAgentArtifactManifest, manifestPath = ""): TestAgentArtifactVerification {
  const resolvedManifestPath = manifestPath ? path.resolve(manifestPath) : "";
  const manifestFiles = manifest.files || [];
  const items = manifestFiles.map(item => verifyManifestItem(resolvedManifestPath || item.path, item));
  items.push(...verifyScreenshotMetadata(resolvedManifestPath, manifestFiles, items));
  items.push(...verifyBrowserEvidenceArtifactMetadata(resolvedManifestPath, manifestFiles, items));
  items.push(...verifyReportAuthenticationEvidence(resolvedManifestPath, manifestFiles, items));
  items.push(...verifyReportRecoveryEvidence(resolvedManifestPath, manifestFiles, items));
  items.push(...verifyReportActionEffectEvidence(resolvedManifestPath, manifestFiles, items));
  items.push(...verifyReportBrowserExecutionCoverage(resolvedManifestPath, manifestFiles, items));
  items.push(...verifyReportBrowserTemporalEvidence(resolvedManifestPath, manifestFiles, items));
  items.push(...verifyReportBrowserResourceLifecycleEvidence(resolvedManifestPath, manifestFiles, items));
  items.push(...verifyReportBrowserToolLineage(resolvedManifestPath, manifestFiles, items));
  items.push(...verifyReportBrowserToolTimeout(resolvedManifestPath, manifestFiles, items));
  items.push(...verifyReportAdversarialEvidence(resolvedManifestPath, manifestFiles, items));
  items.push(...verifyReportAcceptanceEvidence(resolvedManifestPath, manifestFiles, items));
  items.push(...verifyReportHttpPageResourceEvidence(resolvedManifestPath, manifestFiles, items));
  items.push(...verifyReportHttpConcurrencyEvidence(resolvedManifestPath, manifestFiles, items));
  items.push(...verifyReportVerdictConsistency(manifest, resolvedManifestPath, manifestFiles, items));
  const failed = items.filter(item => item.status === "failed").length;
  const passed = items.filter(item => item.status === "passed").length;
  const skipped = items.filter(item => item.status === "skipped").length;
  return {
    schema: "ccm-test-agent-artifact-verification-v1",
    manifestPath: resolvedManifestPath,
    reportId: manifest.reportId || "",
    workOrderId: manifest.workOrderId || "",
    checkedAt: new Date().toISOString(),
    status: failed ? "failed" : "passed",
    summary: {
      total: items.length,
      passed,
      failed,
      skipped,
    },
    items,
  };
}

export function verifyTestAgentArtifactManifestFile(manifestPath: string): TestAgentArtifactVerification {
  const manifest = readJson(manifestPath) as TestAgentArtifactManifest;
  return verifyTestAgentArtifactManifest(manifest, manifestPath);
}
