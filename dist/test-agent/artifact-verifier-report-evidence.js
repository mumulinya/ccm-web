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
exports.verifyTestAgentArtifactManifest = verifyTestAgentArtifactManifest;
exports.verifyTestAgentArtifactManifestFile = verifyTestAgentArtifactManifestFile;
const path = __importStar(require("path"));
const artifact_verifier_core_1 = require("./artifact-verifier-core");
const artifact_verifier_consistency_1 = require("./artifact-verifier-consistency");
function httpConcurrencyEvidenceItem(reportItem, status, error) {
    return {
        type: "http_concurrency_evidence",
        title: "Concurrent HTTP evidence integrity",
        path: reportItem.path,
        status,
        ...(error ? { error } : {}),
    };
}
function httpPageResourceEvidenceItem(reportItem, status, error) {
    return {
        type: "http_page_resource_evidence",
        title: "HTTP page subresource evidence integrity",
        path: reportItem.path,
        status,
        ...(error ? { error } : {}),
    };
}
function verifyReportHttpPageResourceEvidence(manifestPath, manifestFiles, integrityItems) {
    const reportIndex = manifestFiles.findIndex(item => item.type === "report_json");
    if (reportIndex < 0)
        return [];
    const reportItem = manifestFiles[reportIndex];
    if (integrityItems[reportIndex]?.status !== "passed") {
        return [httpPageResourceEvidenceItem(reportItem, "skipped", "Report artifact integrity did not pass, so HTTP page resources could not be checked.")];
    }
    try {
        const report = (0, artifact_verifier_core_1.readJsonForSemantic)(manifestPath, reportItem);
        if (!(report.httpResults || []).some(result => result.context?.pageResourceProbe === true)) {
            return [];
        }
        const errors = [];
        (0, artifact_verifier_consistency_1.verifyHttpPageResourceConsistency)(report, errors);
        return [httpPageResourceEvidenceItem(reportItem, errors.length ? "failed" : "passed", errors.join(" "))];
    }
    catch (error) {
        return [httpPageResourceEvidenceItem(reportItem, "failed", `Unable to read HTTP page resource evidence: ${error.message || String(error)}`)];
    }
}
function verifyReportHttpConcurrencyEvidence(manifestPath, manifestFiles, integrityItems) {
    const reportIndex = manifestFiles.findIndex(item => item.type === "report_json");
    if (reportIndex < 0)
        return [];
    const reportItem = manifestFiles[reportIndex];
    if (integrityItems[reportIndex]?.status !== "passed") {
        return [httpConcurrencyEvidenceItem(reportItem, "skipped", "Report artifact integrity did not pass, so concurrent HTTP evidence could not be checked.")];
    }
    try {
        const report = (0, artifact_verifier_core_1.readJsonForSemantic)(manifestPath, reportItem);
        const hasConcurrency = (report.httpResults || []).some(result => result.concurrency)
            || Number(report.httpConcurrencySummary?.checks || 0) > 0;
        if (!hasConcurrency)
            return [];
        const errors = [];
        (0, artifact_verifier_core_1.verifyHttpConcurrencyConsistency)(report, errors);
        return [httpConcurrencyEvidenceItem(reportItem, errors.length ? "failed" : "passed", errors.join(" "))];
    }
    catch (error) {
        return [httpConcurrencyEvidenceItem(reportItem, "failed", `Unable to read concurrent HTTP evidence: ${error.message || String(error)}`)];
    }
}
function verifyTestAgentArtifactManifest(manifest, manifestPath = "") {
    const resolvedManifestPath = manifestPath ? path.resolve(manifestPath) : "";
    const manifestFiles = manifest.files || [];
    const items = manifestFiles.map(item => (0, artifact_verifier_core_1.verifyManifestItem)(resolvedManifestPath || item.path, item));
    items.push(...(0, artifact_verifier_core_1.verifyScreenshotMetadata)(resolvedManifestPath, manifestFiles, items));
    items.push(...(0, artifact_verifier_core_1.verifyBrowserEvidenceArtifactMetadata)(resolvedManifestPath, manifestFiles, items));
    items.push(...(0, artifact_verifier_consistency_1.verifyReportAuthenticationEvidence)(resolvedManifestPath, manifestFiles, items));
    items.push(...(0, artifact_verifier_consistency_1.verifyReportRecoveryEvidence)(resolvedManifestPath, manifestFiles, items));
    items.push(...(0, artifact_verifier_consistency_1.verifyReportActionEffectEvidence)(resolvedManifestPath, manifestFiles, items));
    items.push(...(0, artifact_verifier_consistency_1.verifyReportBrowserExecutionCoverage)(resolvedManifestPath, manifestFiles, items));
    items.push(...(0, artifact_verifier_consistency_1.verifyReportBrowserTemporalEvidence)(resolvedManifestPath, manifestFiles, items));
    items.push(...(0, artifact_verifier_consistency_1.verifyReportBrowserResourceLifecycleEvidence)(resolvedManifestPath, manifestFiles, items));
    items.push(...(0, artifact_verifier_consistency_1.verifyReportBrowserToolLineage)(resolvedManifestPath, manifestFiles, items));
    items.push(...(0, artifact_verifier_consistency_1.verifyReportBrowserToolTimeout)(resolvedManifestPath, manifestFiles, items));
    items.push(...(0, artifact_verifier_consistency_1.verifyReportAdversarialEvidence)(resolvedManifestPath, manifestFiles, items));
    items.push(...(0, artifact_verifier_consistency_1.verifyReportAcceptanceEvidence)(resolvedManifestPath, manifestFiles, items));
    items.push(...verifyReportHttpPageResourceEvidence(resolvedManifestPath, manifestFiles, items));
    items.push(...verifyReportHttpConcurrencyEvidence(resolvedManifestPath, manifestFiles, items));
    items.push(...(0, artifact_verifier_consistency_1.verifyReportVerdictConsistency)(manifest, resolvedManifestPath, manifestFiles, items));
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
function verifyTestAgentArtifactManifestFile(manifestPath) {
    const manifest = (0, artifact_verifier_core_1.readJson)(manifestPath);
    return verifyTestAgentArtifactManifest(manifest, manifestPath);
}
//# sourceMappingURL=artifact-verifier-report-evidence.js.map