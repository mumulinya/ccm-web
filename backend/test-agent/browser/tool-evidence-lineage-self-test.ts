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
import { BrowserCheckResult, TestAgentReport } from "../types";
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

function mcpProviderResults(report: TestAgentReport) {
  return report.browserResults.filter(result =>
    result.provider === "mcp"
    && result.execution?.evidence === "provider"
  );
}

function rebuildLineage(report: TestAgentReport) {
  report.browserToolEvidenceLineage = buildBrowserToolEvidenceLineage(report.browserResults, report.browserToolCalls);
  return report.browserToolEvidenceLineage;
}

export async function runTestAgentBrowserToolEvidenceLineageSelfTest() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-browser-tool-lineage-"));
  const server = http.createServer((_request, response) => {
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end("<!doctype html><title>Tool lineage</title><main><h1>Alpha ready</h1><p>Beta ready</p></main>");
  });
  const port = await listen(server);
  const baseUrl = `http://127.0.0.1:${port}`;
  const criteria = ["Alpha is visible in the browser", "Beta is visible in the browser"];
  const executor = createStaticBrowserToolExecutor({
    tools: [
      "mcp__playwright__browser_navigate",
      "mcp__playwright__browser_snapshot",
      "mcp__playwright__browser_console_messages",
      "mcp__playwright__browser_network_requests",
    ],
    onCall: toolName => {
      if (toolName.endsWith("browser_snapshot")) return "Alpha ready Beta ready";
      if (toolName.endsWith("browser_console_messages")) return [];
      if (toolName.endsWith("browser_network_requests")) return [];
      return { ok: true };
    },
  });
  const input: any = {
    id: `browser-tool-lineage-${process.pid}-${Date.now()}`,
    originalUserGoal: "Prove every passing MCP browser check is linked to its actual browser tool calls.",
    acceptanceCriteria: criteria,
    requiredChecks: ["browser_e2e"],
    projects: [{
      name: "browser-tool-lineage",
      workDir: dir,
      targetUrl: baseUrl,
      browserChecks: [{
        name: "Alpha browser check",
        url: baseUrl,
        actions: [{ type: "goto", url: baseUrl }],
        assertions: [{ type: "text", text: "Alpha ready" }],
        coversAcceptanceCriteria: [criteria[0]],
        screenshot: false,
      }, {
        name: "Beta browser check",
        url: baseUrl,
        actions: [{ type: "goto", url: baseUrl }],
        assertions: [{ type: "text", text: "Beta ready" }],
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
      adversarialProbeWaiver: "This self-test targets evidence attribution rather than product input handling.",
    },
  };

  try {
    const report = await runTestAgent(input, { browserProvider: "mcp", browserToolExecutor: executor });
    const mcpResults = mcpProviderResults(report);
    const firstIds = mcpResults[0]?.browserToolCallIds || [];
    const secondIds = mcpResults[1]?.browserToolCallIds || [];
    const firstExecution = mcpResults[0]?.execution;
    const summary = report.browserToolEvidenceLineage;
    const files = report.metadata.artifactFiles as Record<string, string>;
    const reportPath = files.reportJsonPath;
    const verdictPath = files.verdictJsonPath;
    const manifestPath = files.manifestPath;
    const reportContract = validateTestAgentReportContract(report);
    const verdictContract = validateTestAgentVerdictContract(JSON.parse(fs.readFileSync(verdictPath, "utf-8")));
    const artifactVerification = verifyTestAgentArtifactManifestFile(manifestPath);
    const cli = formatTestAgentCliReportSummary(report);
    const markdown = buildTestAgentMarkdownReport(report);

    const missingLinkReport = clone(report);
    const missingResult = mcpProviderResults(missingLinkReport)[0];
    missingResult.browserToolCallIds = [];
    const missingSummary = rebuildLineage(missingLinkReport);
    const missingContract = validateTestAgentReportContract(missingLinkReport);

    const foreignLinkReport = clone(report);
    const foreignResults = mcpProviderResults(foreignLinkReport);
    foreignResults[1].browserToolCallIds = [foreignResults[0].browserToolCallIds![0]];
    const foreignSummary = rebuildLineage(foreignLinkReport);
    const foreignContract = validateTestAgentReportContract(foreignLinkReport);

    const unscopedReport = clone(report);
    delete unscopedReport.browserToolCalls[0].browserExecution;
    const unscopedSummary = rebuildLineage(unscopedReport);
    const unscopedContract = validateTestAgentReportContract(unscopedReport);

    const originalReport = fs.readFileSync(reportPath, "utf-8");
    fs.writeFileSync(reportPath, `${JSON.stringify(missingLinkReport, null, 2)}\n`, "utf-8");
    refreshReportIntegrity(manifestPath, reportPath);
    const tamperedMissingVerification = verifyTestAgentArtifactManifestFile(manifestPath);

    const transcriptMismatchReport = clone(report);
    transcriptMismatchReport.browserToolCalls[0].browserExecution = clone(mcpResults[1].execution!);
    rebuildLineage(transcriptMismatchReport);
    fs.writeFileSync(reportPath, `${JSON.stringify(transcriptMismatchReport, null, 2)}\n`, "utf-8");
    refreshReportIntegrity(manifestPath, reportPath);
    const tamperedTranscriptVerification = verifyTestAgentArtifactManifestFile(manifestPath);

    const allResultIds = mcpResults.flatMap(result => result.browserToolCallIds || []);
    const pass = report.status === "passed"
      && mcpResults.length === 2
      && firstIds.length > 0
      && secondIds.length > 0
      && firstIds.every(id => !secondIds.includes(id))
      && new Set(allResultIds).size === allResultIds.length
      && summary?.status === "complete"
      && summary.mcpResultCount === 2
      && summary.linkedResultCount === 2
      && summary.linkedToolCallCount === report.browserToolCalls.length
      && summary.scopedToolCallCount === report.browserToolCalls.length
      && summary.orphanScopedToolCallCount === 0
      && summary.unscopedToolCallCount === 0
      && report.browserToolCalls.every(record =>
        record.browserExecution?.evidence === "provider"
        && allResultIds.includes(record.id)
      )
      && report.browserToolCalls.filter(record => record.browserExecution?.checkId === firstExecution?.checkId).every(record => firstIds.includes(record.id))
      && reportContract.valid
      && verdictContract.valid
      && cli.includes("Browser tool evidence lineage: status=complete")
      && markdown.includes("## Browser Tool Evidence Lineage")
      && markdown.includes("Browser execution: browser-check:")
      && artifactVerification.status === "passed"
      && artifactVerification.items.some(item => item.type === "browser_tool_lineage_evidence" && item.status === "passed")
      && missingSummary.status === "invalid"
      && missingSummary.orphanScopedToolCallCount > 0
      && !missingContract.valid
      && foreignSummary.status === "invalid"
      && foreignSummary.foreignToolCallReferenceCount > 0
      && !foreignContract.valid
      && unscopedSummary.status === "invalid"
      && unscopedSummary.unscopedToolCallCount === 1
      && !unscopedContract.valid
      && tamperedMissingVerification.status === "failed"
      && tamperedMissingVerification.items.some(item => item.type === "browser_tool_lineage_evidence" && item.status === "failed")
      && tamperedTranscriptVerification.status === "failed"
      && tamperedTranscriptVerification.items.some(item =>
        item.type === "browser_tool_lineage_evidence"
        && item.status === "failed"
        && String(item.error || "").includes("transcript records do not match")
      );

    return {
      pass,
      report,
      summary,
      missingSummary,
      foreignSummary,
      unscopedSummary,
      reportContract,
      verdictContract,
      artifactVerification,
      tamperedMissingVerification,
      tamperedTranscriptVerification,
    };
  } finally {
    await close(server);
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  }
}
