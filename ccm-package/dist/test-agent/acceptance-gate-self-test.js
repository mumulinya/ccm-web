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
exports.runTestAgentAcceptanceEvidenceGateSelfTest = runTestAgentAcceptanceEvidenceGateSelfTest;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const agent_1 = require("./agent");
const artifact_verifier_1 = require("./artifact-verifier");
const artifacts_1 = require("./artifacts");
const cli_1 = require("./cli");
const contract_1 = require("./contract");
function sha256File(filePath) {
    return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}
function refreshManifestItemIntegrity(manifestPath, artifactType) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    const item = (manifest.files || []).find((entry) => entry.type === artifactType);
    if (!item?.path)
        return;
    const targetPath = path.resolve(item.path);
    const stat = fs.statSync(targetPath);
    const integrity = {
        exists: true,
        sizeBytes: stat.size,
        sha256: sha256File(targetPath),
    };
    for (const entry of manifest.files || []) {
        if (entry.type === artifactType || (entry.path && path.resolve(entry.path) === targetPath)) {
            entry.integrity = integrity;
        }
    }
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf-8");
}
function artifactPaths(report) {
    const files = (report.metadata?.artifactFiles || {});
    return {
        reportPath: String(files.reportJsonPath || ""),
        verdictPath: String(files.verdictJsonPath || ""),
        manifestPath: String(files.manifestPath || ""),
    };
}
function passingCommand(output) {
    const escaped = output.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
    return `"${process.execPath}" -e "console.log('${escaped}')"`;
}
function failingCommand(output) {
    const escaped = output.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
    return `"${process.execPath}" -e "console.error('${escaped}'); process.exit(1)"`;
}
function workOrder(dir, name, acceptanceCriteria, command) {
    return {
        id: `${name}-${process.pid}-${Date.now()}`,
        originalUserGoal: `Verify ${name}.`,
        acceptanceCriteria,
        requiredChecks: ["commands"],
        projects: [{
                name,
                workDir: dir,
                verificationCommands: [command],
            }],
        options: {
            artifactDir: path.join(dir, `${name}-artifacts`),
            browserProvider: "none",
            requireAdversarialProbe: false,
            adversarialProbeWaiver: "Acceptance evidence gate fixture has no hostile input surface.",
        },
    };
}
async function runTestAgentAcceptanceEvidenceGateSelfTest() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-acceptance-gate-"));
    const directCriterion = "Profile save confirmation appears";
    const secondCriterion = "Audit history records the profile update";
    const failedCriterion = "Rejected profile input shows a validation message";
    try {
        const weakReport = await (0, agent_1.runTestAgent)(workOrder(dir, "acceptance-gate-weak", ["Profile settings remain available after reload"], passingCommand("unrelated smoke command completed")));
        const directReport = await (0, agent_1.runTestAgent)(workOrder(dir, "acceptance-gate-direct", [directCriterion], passingCommand(directCriterion)));
        const incompleteReport = await (0, agent_1.runTestAgent)(workOrder(dir, "acceptance-gate-incomplete", [directCriterion, secondCriterion], passingCommand(directCriterion)));
        const failedReport = await (0, agent_1.runTestAgent)(workOrder(dir, "acceptance-gate-failed", [failedCriterion], failingCommand(failedCriterion)));
        const noCriteriaReport = await (0, agent_1.runTestAgent)(workOrder(dir, "acceptance-gate-not-applicable", [], passingCommand("command completed")));
        const directPaths = artifactPaths(directReport);
        const directVerdict = JSON.parse(fs.readFileSync(directPaths.verdictPath, "utf-8"));
        const cliSummary = (0, cli_1.formatTestAgentCliReportSummary)(weakReport);
        const markdown = (0, artifacts_1.buildTestAgentMarkdownReport)(weakReport);
        const originalReportJson = fs.readFileSync(directPaths.reportPath, "utf-8");
        const tamperedReport = JSON.parse(originalReportJson);
        tamperedReport.acceptanceEvidenceGateSummary.matchedEvidence += 1;
        fs.writeFileSync(directPaths.reportPath, `${JSON.stringify(tamperedReport, null, 2)}\n`, "utf-8");
        refreshManifestItemIntegrity(directPaths.manifestPath, "report_json");
        const reportTamperedVerification = (0, artifact_verifier_1.verifyTestAgentArtifactManifestFile)(directPaths.manifestPath);
        fs.writeFileSync(directPaths.reportPath, originalReportJson, "utf-8");
        refreshManifestItemIntegrity(directPaths.manifestPath, "report_json");
        const tamperedVerdict = JSON.parse(fs.readFileSync(directPaths.verdictPath, "utf-8"));
        tamperedVerdict.canAccept = false;
        tamperedVerdict.evidenceSummary.acceptanceMatchedEvidence += 1;
        fs.writeFileSync(directPaths.verdictPath, `${JSON.stringify(tamperedVerdict, null, 2)}\n`, "utf-8");
        refreshManifestItemIntegrity(directPaths.manifestPath, "verdict_json");
        const verdictTamperedVerification = (0, artifact_verifier_1.verifyTestAgentArtifactManifestFile)(directPaths.manifestPath);
        const pass = weakReport.status === "partial"
            && weakReport.recommendation === "need_human"
            && weakReport.acceptanceCoverage[0]?.status === "verified"
            && weakReport.acceptanceCoverage[0]?.matchStrength === "fallback"
            && weakReport.acceptanceCoverage[0]?.evidenceSource === "single_criterion_report_status"
            && weakReport.acceptanceEvidenceGateSummary.status === "weak"
            && weakReport.acceptanceEvidenceGateSummary.canAccept === false
            && weakReport.risks.some(item => item.includes("fallback evidence"))
            && directReport.status === "passed"
            && directReport.recommendation === "accept"
            && directReport.acceptanceCoverage[0]?.status === "verified"
            && directReport.acceptanceCoverage[0]?.matchStrength === "direct"
            && directReport.acceptanceCoverage[0]?.evidenceSource === "matched_evidence"
            && directReport.acceptanceEvidenceGateSummary.status === "verified"
            && directReport.acceptanceEvidenceGateSummary.canAccept === true
            && directVerdict.canAccept === true
            && directVerdict.acceptanceEvidenceGateSummary.status === "verified"
            && directVerdict.evidenceSummary.acceptanceMatchedEvidence === 1
            && directVerdict.evidenceSummary.acceptanceFallbackEvidence === 0
            && directVerdict.evidenceSummary.acceptanceMissingEvidence === 0
            && incompleteReport.status === "partial"
            && incompleteReport.acceptanceEvidenceGateSummary.status === "incomplete"
            && incompleteReport.acceptanceEvidenceGateSummary.verified === 1
            && incompleteReport.acceptanceEvidenceGateSummary.unknown === 1
            && incompleteReport.acceptanceEvidenceGateSummary.incompleteCriteria[0] === secondCriterion
            && failedReport.status === "failed"
            && failedReport.recommendation === "rework"
            && failedReport.acceptanceCoverage[0]?.status === "not_verified"
            && failedReport.acceptanceEvidenceGateSummary.status === "failed"
            && failedReport.acceptanceEvidenceGateSummary.failedCriteria[0] === failedCriterion
            && noCriteriaReport.status === "passed"
            && noCriteriaReport.acceptanceEvidenceGateSummary.status === "not_applicable"
            && noCriteriaReport.acceptanceEvidenceGateSummary.canAccept === true
            && (0, contract_1.validateTestAgentReportContract)(weakReport).valid
            && (0, contract_1.validateTestAgentReportContract)(directReport).valid
            && (0, contract_1.validateTestAgentReportContract)(incompleteReport).valid
            && (0, contract_1.validateTestAgentReportContract)(failedReport).valid
            && (0, contract_1.validateTestAgentReportContract)(noCriteriaReport).valid
            && (0, contract_1.validateTestAgentVerdictContract)(directVerdict).valid
            && cliSummary.includes("Acceptance evidence gate: status=weak")
            && markdown.includes("## Required Acceptance Evidence Gate")
            && markdown.includes("Fallback-only evidence")
            && reportTamperedVerification.status === "failed"
            && reportTamperedVerification.items.some(item => item.type === "acceptance_evidence" && item.status === "failed")
            && reportTamperedVerification.items.some(item => item.type === "verdict_consistency" && item.status === "failed")
            && verdictTamperedVerification.status === "failed"
            && verdictTamperedVerification.items.some(item => item.type === "acceptance_evidence" && item.status === "passed")
            && verdictTamperedVerification.items.some(item => item.type === "verdict_consistency" && item.status === "failed");
        return {
            pass,
            weakReport,
            directReport,
            incompleteReport,
            failedReport,
            noCriteriaReport,
            directVerdict,
            reportTamperedVerification,
            verdictTamperedVerification,
            cliSummary,
            markdown,
        };
    }
    finally {
        try {
            fs.rmSync(dir, { recursive: true, force: true });
        }
        catch { }
    }
}
//# sourceMappingURL=acceptance-gate-self-test.js.map