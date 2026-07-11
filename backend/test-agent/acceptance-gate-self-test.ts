import * as crypto from "crypto";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { runTestAgent } from "./agent";
import { verifyTestAgentArtifactManifestFile } from "./artifact-verifier";
import { buildTestAgentMarkdownReport } from "./artifacts";
import { formatTestAgentCliReportSummary } from "./cli";
import {
  validateTestAgentReportContract,
  validateTestAgentVerdictContract,
} from "./contract";

function sha256File(filePath: string) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function refreshManifestItemIntegrity(manifestPath: string, artifactType: string) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  const item = (manifest.files || []).find((entry: any) => entry.type === artifactType);
  if (!item?.path) return;
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

function artifactPaths(report: Awaited<ReturnType<typeof runTestAgent>>) {
  const files = (report.metadata?.artifactFiles || {}) as Record<string, string>;
  return {
    reportPath: String(files.reportJsonPath || ""),
    verdictPath: String(files.verdictJsonPath || ""),
    manifestPath: String(files.manifestPath || ""),
  };
}

function passingCommand(output: string) {
  const escaped = output.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  return `"${process.execPath}" -e "console.log('${escaped}')"`;
}

function failingCommand(output: string) {
  const escaped = output.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  return `"${process.execPath}" -e "console.error('${escaped}'); process.exit(1)"`;
}

function workOrder(
  dir: string,
  name: string,
  acceptanceCriteria: string[],
  command: string,
) {
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
      browserProvider: "none" as const,
      requireAdversarialProbe: false,
      adversarialProbeWaiver: "Acceptance evidence gate fixture has no hostile input surface.",
    },
  };
}

export async function runTestAgentAcceptanceEvidenceGateSelfTest() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-acceptance-gate-"));
  const directCriterion = "Profile save confirmation appears";
  const secondCriterion = "Audit history records the profile update";
  const failedCriterion = "Rejected profile input shows a validation message";
  try {
    const weakReport = await runTestAgent(workOrder(
      dir,
      "acceptance-gate-weak",
      ["Profile settings remain available after reload"],
      passingCommand("unrelated smoke command completed"),
    ));
    const directReport = await runTestAgent(workOrder(
      dir,
      "acceptance-gate-direct",
      [directCriterion],
      passingCommand(directCriterion),
    ));
    const incompleteReport = await runTestAgent(workOrder(
      dir,
      "acceptance-gate-incomplete",
      [directCriterion, secondCriterion],
      passingCommand(directCriterion),
    ));
    const failedReport = await runTestAgent(workOrder(
      dir,
      "acceptance-gate-failed",
      [failedCriterion],
      failingCommand(failedCriterion),
    ));
    const noCriteriaReport = await runTestAgent(workOrder(
      dir,
      "acceptance-gate-not-applicable",
      [],
      passingCommand("command completed"),
    ));

    const directPaths = artifactPaths(directReport);
    const directVerdict = JSON.parse(fs.readFileSync(directPaths.verdictPath, "utf-8"));
    const cliSummary = formatTestAgentCliReportSummary(weakReport);
    const markdown = buildTestAgentMarkdownReport(weakReport);

    const originalReportJson = fs.readFileSync(directPaths.reportPath, "utf-8");
    const tamperedReport = JSON.parse(originalReportJson);
    tamperedReport.acceptanceEvidenceGateSummary.matchedEvidence += 1;
    fs.writeFileSync(directPaths.reportPath, `${JSON.stringify(tamperedReport, null, 2)}\n`, "utf-8");
    refreshManifestItemIntegrity(directPaths.manifestPath, "report_json");
    const reportTamperedVerification = verifyTestAgentArtifactManifestFile(directPaths.manifestPath);

    fs.writeFileSync(directPaths.reportPath, originalReportJson, "utf-8");
    refreshManifestItemIntegrity(directPaths.manifestPath, "report_json");
    const tamperedVerdict = JSON.parse(fs.readFileSync(directPaths.verdictPath, "utf-8"));
    tamperedVerdict.canAccept = false;
    tamperedVerdict.evidenceSummary.acceptanceMatchedEvidence += 1;
    fs.writeFileSync(directPaths.verdictPath, `${JSON.stringify(tamperedVerdict, null, 2)}\n`, "utf-8");
    refreshManifestItemIntegrity(directPaths.manifestPath, "verdict_json");
    const verdictTamperedVerification = verifyTestAgentArtifactManifestFile(directPaths.manifestPath);

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
      && validateTestAgentReportContract(weakReport).valid
      && validateTestAgentReportContract(directReport).valid
      && validateTestAgentReportContract(incompleteReport).valid
      && validateTestAgentReportContract(failedReport).valid
      && validateTestAgentReportContract(noCriteriaReport).valid
      && validateTestAgentVerdictContract(directVerdict).valid
      && cliSummary.includes("Acceptance evidence gate: status=weak")
      && markdown.includes("## Required Acceptance Evidence Gate")
      && markdown.includes("Fallback-only evidence")
      && reportTamperedVerification.status === "failed"
      && reportTamperedVerification.items.some(item =>
        item.type === "acceptance_evidence" && item.status === "failed"
      )
      && reportTamperedVerification.items.some(item =>
        item.type === "verdict_consistency" && item.status === "failed"
      )
      && verdictTamperedVerification.status === "failed"
      && verdictTamperedVerification.items.some(item =>
        item.type === "acceptance_evidence" && item.status === "passed"
      )
      && verdictTamperedVerification.items.some(item =>
        item.type === "verdict_consistency" && item.status === "failed"
      );

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
  } finally {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  }
}
