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
import { BrowserCheckExecutionPlan, BrowserCheckResult } from "../types";
import { normalizeTestAgentWorkOrder } from "../work-order";
import { createStaticBrowserToolExecutor } from "./tool-executor";
import {
  buildBrowserCheckExecutionCoverage,
  buildBrowserCheckExecutionPlan,
  reconcileBrowserCheckExecution,
} from "./check-execution-coverage";

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

function providerResult(
  plan: BrowserCheckExecutionPlan,
  run: number,
): BrowserCheckResult {
  const item = plan.items[0];
  const at = new Date().toISOString();
  return {
    provider: "playwright",
    project: item.project,
    name: item.name,
    url: item.url,
    status: "passed",
    startedAt: at,
    finishedAt: at,
    durationMs: 1,
    steps: [],
    screenshots: [],
    consoleErrors: [],
    pageErrors: [],
    networkErrors: [],
    execution: {
      checkId: item.checkId,
      projectIndex: item.projectIndex,
      checkIndex: item.checkIndex,
      run,
      expectedRuns: item.expectedRuns,
      evidence: "provider",
    },
  };
}

export async function runTestAgentBrowserCheckExecutionCoverageSelfTest() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-browser-execution-coverage-"));
  const server = http.createServer((_request, response) => {
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end("<!doctype html><title>Coverage fixture</title><main><h1>First ready</h1><p>Second ready</p></main>");
  });
  const port = await listen(server);
  const baseUrl = `http://127.0.0.1:${port}`;
  const criteria = [
    "The first browser feature is visible",
    "The second browser feature is visible",
  ];
  const workOrder: any = {
    id: `browser-execution-coverage-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify every planned browser check produces identifiable execution evidence.",
    acceptanceCriteria: criteria,
    requiredChecks: ["browser_e2e"],
    projects: [{
      name: "browser-execution-coverage",
      workDir: dir,
      targetUrl: baseUrl,
      browserChecks: [{
        name: "First browser feature",
        url: baseUrl,
        actions: [{ type: "goto", url: baseUrl }],
        assertions: [{ type: "text", text: "First ready" }],
        coversAcceptanceCriteria: [criteria[0]],
        screenshot: false,
      }, {
        name: "Second browser feature",
        url: baseUrl,
        actions: [{ type: "goto", url: baseUrl }],
        assertions: [{ type: "text", text: "Second ready" }],
        coversAcceptanceCriteria: [criteria[1]],
        screenshot: false,
      }],
    }],
    options: {
      artifactDir: path.join(dir, "artifacts"),
      browserProvider: "mcp",
      collectBrowserArtifacts: false,
      collectBrowserVideo: false,
      requireAdversarialProbe: false,
      adversarialProbeWaiver: "This self-test targets execution accounting rather than a product input boundary.",
    },
  };
  const executor = createStaticBrowserToolExecutor({
    tools: [
      "mcp__playwright__browser_navigate",
      "mcp__playwright__browser_snapshot",
      "mcp__playwright__browser_console_messages",
      "mcp__playwright__browser_network_requests",
    ],
    onCall: toolName => {
      if (toolName.endsWith("browser_snapshot")) return "First ready Second ready";
      if (toolName.endsWith("browser_console_messages")) return [];
      if (toolName.endsWith("browser_network_requests")) return [];
      return { ok: true };
    },
  });

  try {
    const report = await runTestAgent(workOrder, { browserProvider: "mcp", browserToolExecutor: executor });
    const plan = report.metadata.browserCheckExecutionPlan as BrowserCheckExecutionPlan;
    const providerResults = report.browserResults.filter(result => result.execution?.evidence === "provider");
    const completeCoverage = report.browserCheckExecutionCoverage;
    const missing = reconcileBrowserCheckExecution(plan, providerResults.slice(0, -1));
    const duplicate = reconcileBrowserCheckExecution(plan, [...providerResults, { ...providerResults[0] }]);

    const stabilityNormalized = normalizeTestAgentWorkOrder({
      id: `browser-execution-stability-${process.pid}-${Date.now()}`,
      originalUserGoal: "Verify all stability runs are accounted for.",
      acceptanceCriteria: [],
      requiredChecks: ["browser_e2e"],
      projects: [{
        name: "browser-execution-stability",
        workDir: dir,
        targetUrl: baseUrl,
        browserChecks: [{ name: "Three stability runs", stabilityRuns: 3 }],
      }],
      options: {
        artifactDir: path.join(dir, "stability-artifacts"),
        browserProvider: "playwright",
        requireAdversarialProbe: false,
        adversarialProbeWaiver: "Execution coverage stability fixture.",
      },
    }).workOrder;
    const stabilityPlan = buildBrowserCheckExecutionPlan(stabilityNormalized, "playwright");
    const stability = reconcileBrowserCheckExecution(stabilityPlan, [
      providerResult(stabilityPlan, 1),
      providerResult(stabilityPlan, 2),
    ]);

    const files = report.metadata.artifactFiles as Record<string, string>;
    const reportPath = files.reportJsonPath;
    const verdictPath = files.verdictJsonPath;
    const manifestPath = files.manifestPath;
    const reportContract = validateTestAgentReportContract(report);
    const verdictContract = validateTestAgentVerdictContract(JSON.parse(fs.readFileSync(verdictPath, "utf-8")));
    const artifactVerification = verifyTestAgentArtifactManifestFile(manifestPath);
    const cli = formatTestAgentCliReportSummary(report);
    const markdown = buildTestAgentMarkdownReport(report);

    const originalReport = fs.readFileSync(reportPath, "utf-8");
    const tamperedMissing = JSON.parse(originalReport);
    const removedIndex = tamperedMissing.browserResults.findIndex((result: BrowserCheckResult) => result.execution?.evidence === "provider");
    tamperedMissing.browserResults.splice(removedIndex, 1);
    tamperedMissing.browserCheckExecutionCoverage = buildBrowserCheckExecutionCoverage(plan, tamperedMissing.browserResults);
    fs.writeFileSync(reportPath, `${JSON.stringify(tamperedMissing, null, 2)}\n`, "utf-8");
    refreshReportIntegrity(manifestPath, reportPath);
    const tamperedMissingVerification = verifyTestAgentArtifactManifestFile(manifestPath);
    const tamperedMissingContract = validateTestAgentReportContract(tamperedMissing);

    const tamperedDuplicate = JSON.parse(originalReport);
    const duplicateSource = tamperedDuplicate.browserResults.find((result: BrowserCheckResult) => result.execution?.evidence === "provider");
    tamperedDuplicate.browserResults.push({ ...duplicateSource });
    tamperedDuplicate.browserCheckExecutionCoverage = buildBrowserCheckExecutionCoverage(plan, tamperedDuplicate.browserResults);
    fs.writeFileSync(reportPath, `${JSON.stringify(tamperedDuplicate, null, 2)}\n`, "utf-8");
    refreshReportIntegrity(manifestPath, reportPath);
    const tamperedDuplicateVerification = verifyTestAgentArtifactManifestFile(manifestPath);

    const pass = report.status === "passed"
      && completeCoverage?.status === "complete"
      && completeCoverage.plannedCheckCount === plan.plannedCheckCount
      && completeCoverage.expectedRunCount === plan.expectedRunCount
      && completeCoverage.coveredRunCount === plan.expectedRunCount
      && completeCoverage.missingRunCount === 0
      && completeCoverage.duplicateResultCount === 0
      && providerResults.every(result => result.execution?.evidence === "provider")
      && missing.summary.status === "incomplete"
      && missing.summary.missingRunCount === 1
      && missing.summary.syntheticBlockedCount === 1
      && missing.results.some(result => result.execution?.evidence === "synthetic_missing" && result.status === "blocked")
      && duplicate.summary.status === "invalid"
      && duplicate.summary.duplicateResultCount === 1
      && duplicate.results.some(result => result.name === "Browser check execution coverage" && result.status === "blocked")
      && stability.summary.status === "incomplete"
      && stability.summary.expectedRunCount === 3
      && stability.summary.coveredRunCount === 2
      && stability.summary.missingRunCount === 1
      && stability.summary.items[0]?.missingRuns.join(",") === "3"
      && stability.summary.items[0]?.syntheticBlockedRuns.join(",") === "3"
      && reportContract.valid
      && verdictContract.valid
      && cli.includes("Browser execution coverage: status=complete")
      && markdown.includes("## Browser Check Execution Coverage")
      && markdown.includes("runs=2/2")
      && artifactVerification.status === "passed"
      && artifactVerification.items.some(item => item.type === "browser_execution_coverage_evidence" && item.status === "passed")
      && !tamperedMissingContract.valid
      && tamperedMissingVerification.status === "failed"
      && tamperedMissingVerification.items.some(item => item.type === "browser_execution_coverage_evidence" && item.status === "failed")
      && tamperedDuplicateVerification.status === "failed"
      && tamperedDuplicateVerification.items.some(item => item.type === "browser_execution_coverage_evidence" && item.status === "failed");

    return {
      pass,
      report,
      completeCoverage,
      missing: missing.summary,
      duplicate: duplicate.summary,
      stability: stability.summary,
      reportContract,
      verdictContract,
      artifactVerification,
      tamperedMissingContract,
      tamperedMissingVerification,
      tamperedDuplicateVerification,
    };
  } finally {
    await close(server);
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  }
}
