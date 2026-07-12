import * as crypto from "crypto";
import * as fs from "fs";
import * as http from "http";
import * as os from "os";
import * as path from "path";
import { runTestAgent } from "../agent";
import { verifyTestAgentArtifactManifestFile } from "../artifact-verifier";
import { buildTestAgentMarkdownReport } from "../artifacts";
import { formatTestAgentCliReportSummary } from "../cli";
import { validateTestAgentReportContract, validateTestAgentVerdictContract } from "../contract";
import { BrowserCheckExecutionPlan, TestAgentReport, TestAgentWorkOrder } from "../types";
import { buildBrowserCheckExecutionCoverage } from "./check-execution-coverage";
import {
  buildBrowserEvidenceTemporalIntegrity,
} from "./evidence-temporal-integrity";
import { buildBrowserToolCallTimeoutSummary } from "./tool-call-timeout";
import { buildBrowserToolEvidenceLineage } from "./tool-evidence-lineage";
import { createStaticBrowserToolExecutor } from "./tool-executor";

function listen(server: http.Server) {
  return new Promise<number>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      const address = server.address();
      resolve(typeof address === "object" && address ? address.port : 0);
    });
  });
}

function close(server: http.Server) {
  return new Promise<void>(resolve => server.close(() => resolve()));
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function sha256File(filePath: string) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function refreshReportIntegrity(manifestPath: string, reportPath: string) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  const stat = fs.statSync(reportPath);
  const integrity = { exists: true, sizeBytes: stat.size, sha256: sha256File(reportPath) };
  for (const item of manifest.files || []) {
    if (item.type === "report_json" || (item.path && path.resolve(item.path) === path.resolve(reportPath))) {
      item.integrity = integrity;
    }
  }
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf-8");
}

function planFor(report: TestAgentReport) {
  return report.metadata.browserCheckExecutionPlan as BrowserCheckExecutionPlan;
}

function rebuildDerivedBrowserEvidence(report: TestAgentReport) {
  const plan = planFor(report);
  report.browserCheckExecutionCoverage = buildBrowserCheckExecutionCoverage(plan, report.browserResults);
  report.browserToolEvidenceLineage = buildBrowserToolEvidenceLineage(report.browserResults, report.browserToolCalls);
  report.browserToolCallTimeoutSummary = buildBrowserToolCallTimeoutSummary(report.browserToolCalls);
  report.browserEvidenceTemporalIntegrity = buildBrowserEvidenceTemporalIntegrity({
    startedAt: report.startedAt,
    finishedAt: report.finishedAt,
    durationMs: report.durationMs,
    plan,
    browserResults: report.browserResults,
    browserToolCalls: report.browserToolCalls,
  });
}

function inputFor(dir: string, artifactName: string, baseUrl: string): TestAgentWorkOrder {
  const criterion = "Temporal fixture is visible in the browser";
  return {
    id: `browser-temporal-${artifactName}-${process.pid}-${Date.now()}`,
    originalUserGoal: "Prove browser evidence belongs to this TestAgent run and its recorded time window.",
    acceptanceCriteria: [criterion],
    requiredChecks: ["browser_e2e"],
    projects: [{
      name: "browser-temporal-integrity",
      workDir: dir,
      targetUrl: baseUrl,
      browserChecks: [{
        name: "Temporal browser check",
        url: baseUrl,
        actions: [{ type: "goto", url: baseUrl }],
        assertions: [{ type: "text", text: "Temporal fixture ready" }],
        coversAcceptanceCriteria: [criterion],
        screenshot: false,
      }],
    }],
    options: {
      artifactDir: path.join(dir, artifactName),
      browserProvider: "mcp" as const,
      collectBrowserArtifacts: false,
      collectBrowserVideo: false,
      requireAdversarialProbe: false,
      adversarialProbeWaiver: "This self-test targets browser evidence provenance and time integrity.",
    },
  };
}

export async function runTestAgentBrowserEvidenceTemporalIntegritySelfTest() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-browser-temporal-"));
  const server = http.createServer((_request, response) => {
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end("<!doctype html><title>Temporal evidence</title><main><h1>Temporal fixture ready</h1></main>");
  });
  const port = await listen(server);
  const baseUrl = `http://127.0.0.1:${port}`;
  const executor = createStaticBrowserToolExecutor({
    tools: [
      "mcp__playwright__browser_navigate",
      "mcp__playwright__browser_snapshot",
      "mcp__playwright__browser_console_messages",
      "mcp__playwright__browser_network_requests",
    ],
    onCall: toolName => {
      if (toolName.endsWith("browser_snapshot")) return "Temporal fixture ready";
      if (toolName.endsWith("browser_console_messages")) return [];
      if (toolName.endsWith("browser_network_requests")) return [];
      return { ok: true };
    },
  });

  try {
    const first = await runTestAgent(inputFor(dir, "first-artifacts", baseUrl), {
      browserProvider: "mcp",
      browserToolExecutor: executor,
    });
    const second = await runTestAgent(inputFor(dir, "second-artifacts", baseUrl), {
      browserProvider: "mcp",
      browserToolExecutor: executor,
    });
    const firstPlan = planFor(first);
    const secondPlan = planFor(second);
    const secondFiles = second.metadata.artifactFiles as Record<string, string>;
    const reportContract = validateTestAgentReportContract(second);
    const verdictContract = validateTestAgentVerdictContract(JSON.parse(fs.readFileSync(secondFiles.verdictJsonPath, "utf-8")));
    const artifactVerification = verifyTestAgentArtifactManifestFile(secondFiles.manifestPath);
    const cli = formatTestAgentCliReportSummary(second);
    const markdown = buildTestAgentMarkdownReport(second);

    const crossRun = clone(second);
    crossRun.browserResults = clone(first.browserResults);
    crossRun.browserToolCalls = clone(first.browserToolCalls);
    rebuildDerivedBrowserEvidence(crossRun);
    const crossRunContract = validateTestAgentReportContract(crossRun);

    const outsideReport = clone(second);
    const outsideResult = outsideReport.browserResults.find(result => result.execution?.evidence === "provider")!;
    const outsideAt = new Date(Date.parse(outsideReport.finishedAt) + 5_000).toISOString();
    outsideResult.startedAt = outsideAt;
    outsideResult.finishedAt = outsideAt;
    outsideResult.durationMs = 0;
    rebuildDerivedBrowserEvidence(outsideReport);
    const outsideReportContract = validateTestAgentReportContract(outsideReport);

    const durationTamper = clone(second);
    durationTamper.browserResults[0].durationMs += 1_000;
    rebuildDerivedBrowserEvidence(durationTamper);
    const durationContract = validateTestAgentReportContract(durationTamper);

    const toolOutsideOwner = clone(second);
    const toolRecord = toolOutsideOwner.browserToolCalls.find(record => record.browserExecution)!;
    const owner = toolOutsideOwner.browserResults.find(result =>
      result.execution?.planId === toolRecord.browserExecution?.planId
      && result.execution?.checkId === toolRecord.browserExecution?.checkId
      && result.execution?.run === toolRecord.browserExecution?.run
    )!;
    const beforeOwner = new Date(Date.parse(owner.startedAt) - 5_000).toISOString();
    toolRecord.startedAt = beforeOwner;
    toolRecord.finishedAt = beforeOwner;
    toolRecord.durationMs = 0;
    rebuildDerivedBrowserEvidence(toolOutsideOwner);
    const toolWindowContract = validateTestAgentReportContract(toolOutsideOwner);

    fs.writeFileSync(secondFiles.reportJsonPath, `${JSON.stringify(crossRun, null, 2)}\n`, "utf-8");
    refreshReportIntegrity(secondFiles.manifestPath, secondFiles.reportJsonPath);
    const crossRunArtifactVerification = verifyTestAgentArtifactManifestFile(secondFiles.manifestPath);

    const pass = first.status === "passed"
      && second.status === "passed"
      && firstPlan.planId !== secondPlan.planId
      && Date.parse(firstPlan.createdAt) >= Date.parse(first.startedAt)
      && Date.parse(secondPlan.createdAt) >= Date.parse(second.startedAt)
      && second.browserEvidenceTemporalIntegrity?.status === "complete"
      && second.browserEvidenceTemporalIntegrity.invalidItemCount === 0
      && second.browserResults.every(result => !result.execution || result.execution.planId === secondPlan.planId)
      && second.browserToolCalls.every(record => !record.browserExecution || record.browserExecution.planId === secondPlan.planId)
      && reportContract.valid
      && verdictContract.valid
      && artifactVerification.status === "passed"
      && artifactVerification.items.some(item => item.type === "browser_temporal_evidence" && item.status === "passed")
      && cli.includes("Browser temporal evidence: status=complete")
      && markdown.includes("## Browser Evidence Temporal Integrity")
      && crossRun.browserEvidenceTemporalIntegrity?.status === "invalid"
      && crossRun.browserEvidenceTemporalIntegrity.planMismatchCount > 0
      && !crossRunContract.valid
      && outsideReport.browserEvidenceTemporalIntegrity?.outsideReportWindowCount > 0
      && !outsideReportContract.valid
      && durationTamper.browserEvidenceTemporalIntegrity?.durationMismatchCount > 0
      && !durationContract.valid
      && toolOutsideOwner.browserEvidenceTemporalIntegrity?.outsideResultWindowCount > 0
      && !toolWindowContract.valid
      && crossRunArtifactVerification.status === "failed"
      && crossRunArtifactVerification.items.some(item => item.type === "browser_temporal_evidence" && item.status === "failed");

    return {
      pass,
      report: second,
      firstPlan,
      secondPlan,
      reportContract,
      verdictContract,
      artifactVerification,
      crossRunSummary: crossRun.browserEvidenceTemporalIntegrity,
      crossRunContract,
      outsideReportSummary: outsideReport.browserEvidenceTemporalIntegrity,
      outsideReportContract,
      durationSummary: durationTamper.browserEvidenceTemporalIntegrity,
      durationContract,
      toolWindowSummary: toolOutsideOwner.browserEvidenceTemporalIntegrity,
      toolWindowContract,
      crossRunArtifactVerification,
    };
  } finally {
    await close(server);
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  }
}
