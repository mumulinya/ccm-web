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
import { BrowserCheckExecutionPlan, TestAgentReport } from "../types";
import { checkPlaywrightAvailability } from "./playwright-provider";
import { buildBrowserResourceLifecycleSummary } from "./resource-lifecycle";
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

function rebuildLifecycle(report: TestAgentReport) {
  report.browserResourceLifecycleSummary = buildBrowserResourceLifecycleSummary({
    events: report.browserResourceLifecycleEvents,
    plan: report.metadata.browserCheckExecutionPlan as BrowserCheckExecutionPlan,
    reportStartedAt: report.startedAt,
    reportFinishedAt: report.finishedAt,
  });
}

function workOrder(dir: string, artifactName: string, baseUrl: string, text: string, provider: "playwright" | "mcp") {
  const criterion = `${text} is visible in the browser`;
  return {
    id: `browser-resource-${artifactName}-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify browser resource cleanup after real functional checks.",
    acceptanceCriteria: [criterion],
    requiredChecks: ["browser_e2e"],
    projects: [{
      name: `browser-resource-${provider}`,
      workDir: dir,
      targetUrl: baseUrl,
      browserChecks: [{
        name: `${provider} resource lifecycle`,
        url: baseUrl,
        actions: [{ type: "goto", url: baseUrl }],
        assertions: [{ type: "text", text, timeoutMs: 1_000 }],
        coversAcceptanceCriteria: [criterion],
        screenshot: false,
      }],
    }],
    options: {
      artifactDir: path.join(dir, artifactName),
      browserProvider: provider,
      browserTimeoutMs: 2_000,
      collectBrowserArtifacts: false,
      collectBrowserVideo: false,
      requireAdversarialProbe: false,
      adversarialProbeWaiver: "This self-test targets provider resource cleanup.",
    },
  } as any;
}

export async function runTestAgentBrowserResourceLifecycleSelfTest() {
  const availability = await checkPlaywrightAvailability();
  if (!availability.available) return { pass: false, availability, reason: availability.reason };
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-browser-resource-lifecycle-"));
  const server = http.createServer((_request, response) => {
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end("<!doctype html><title>Resource lifecycle</title><main><h1>Resource fixture ready</h1></main>");
  });
  const port = await listen(server);
  const baseUrl = `http://127.0.0.1:${port}`;
  const mcpExecutor = createStaticBrowserToolExecutor({
    tools: [
      "mcp__playwright__browser_navigate",
      "mcp__playwright__browser_snapshot",
      "mcp__playwright__browser_console_messages",
      "mcp__playwright__browser_network_requests",
    ],
    onCall: toolName => {
      if (toolName.endsWith("browser_snapshot")) return "Resource fixture ready";
      if (toolName.endsWith("browser_console_messages")) return [];
      if (toolName.endsWith("browser_network_requests")) return [];
      return { ok: true };
    },
  });

  try {
    const passedReport = await runTestAgent(
      workOrder(dir, "passed-artifacts", baseUrl, "Resource fixture ready", "playwright"),
      { browserProvider: "playwright" },
    );
    const failedReport = await runTestAgent(
      workOrder(dir, "failed-artifacts", baseUrl, "Text that is not present", "playwright"),
      { browserProvider: "playwright" },
    );
    const mcpReport = await runTestAgent(
      workOrder(dir, "mcp-artifacts", baseUrl, "Resource fixture ready", "mcp"),
      { browserProvider: "mcp", browserToolExecutor: mcpExecutor },
    );
    const files = passedReport.metadata.artifactFiles as Record<string, string>;
    const reportContract = validateTestAgentReportContract(passedReport);
    const failedContract = validateTestAgentReportContract(failedReport);
    const mcpContract = validateTestAgentReportContract(mcpReport);
    const verdictContract = validateTestAgentVerdictContract(JSON.parse(fs.readFileSync(files.verdictJsonPath, "utf-8")));
    const artifactVerification = verifyTestAgentArtifactManifestFile(files.manifestPath);
    const cli = formatTestAgentCliReportSummary(passedReport);
    const markdown = buildTestAgentMarkdownReport(passedReport);

    const openReport = clone(passedReport);
    const openEvent = openReport.browserResourceLifecycleEvents.find(event => event.ownership === "owned")!;
    openEvent.status = "open";
    delete openEvent.releaseAttemptedAt;
    delete openEvent.releasedAt;
    rebuildLifecycle(openReport);
    const openContract = validateTestAgentReportContract(openReport);

    const cleanupFailedReport = clone(passedReport);
    const cleanupEvent = cleanupFailedReport.browserResourceLifecycleEvents.find(event => event.resourceType === "browser_context")!;
    cleanupEvent.status = "cleanup_failed";
    cleanupEvent.error = "Injected context close failure.";
    cleanupEvent.releaseAttemptedAt = cleanupEvent.releasedAt || cleanupEvent.acquiredAt;
    delete cleanupEvent.releasedAt;
    rebuildLifecycle(cleanupFailedReport);
    const cleanupFailedContract = validateTestAgentReportContract(cleanupFailedReport);

    const foreignPlanReport = clone(passedReport);
    foreignPlanReport.browserResourceLifecycleEvents[0].planId = "browser-execution-plan-foreign";
    rebuildLifecycle(foreignPlanReport);
    const foreignPlanContract = validateTestAgentReportContract(foreignPlanReport);

    const duplicateReport = clone(passedReport);
    duplicateReport.browserResourceLifecycleEvents.push(clone(duplicateReport.browserResourceLifecycleEvents[0]));
    rebuildLifecycle(duplicateReport);
    const duplicateContract = validateTestAgentReportContract(duplicateReport);

    fs.writeFileSync(files.reportJsonPath, `${JSON.stringify(cleanupFailedReport, null, 2)}\n`, "utf-8");
    refreshReportIntegrity(files.manifestPath, files.reportJsonPath);
    const tamperedArtifactVerification = verifyTestAgentArtifactManifestFile(files.manifestPath);

    const passedSummary = passedReport.browserResourceLifecycleSummary!;
    const failedSummary = failedReport.browserResourceLifecycleSummary!;
    const mcpSummary = mcpReport.browserResourceLifecycleSummary!;
    const pass = passedReport.status === "passed"
      && passedSummary.status === "complete"
      && passedSummary.ownedResourceCount === 2
      && passedSummary.releasedResourceCount === 2
      && passedSummary.resourceTypeCounts.browser === 1
      && passedSummary.resourceTypeCounts.browser_context === 1
      && passedSummary.openResourceCount === 0
      && passedSummary.cleanupFailureCount === 0
      && failedReport.status === "failed"
      && failedSummary.status === "complete"
      && failedSummary.ownedResourceCount === 2
      && failedSummary.releasedResourceCount === 2
      && mcpReport.status === "passed"
      && mcpSummary.status === "complete"
      && mcpSummary.externalResourceCount === 1
      && mcpSummary.retainedExternalResourceCount === 1
      && mcpSummary.resourceTypeCounts.external_browser_session === 1
      && reportContract.valid
      && failedContract.valid
      && mcpContract.valid
      && verdictContract.valid
      && artifactVerification.status === "passed"
      && artifactVerification.items.some(item => item.type === "browser_resource_lifecycle_evidence" && item.status === "passed")
      && cli.includes("Browser resource lifecycle: status=complete")
      && markdown.includes("## Browser Resource Lifecycle")
      && openReport.browserResourceLifecycleSummary?.status === "incomplete"
      && openReport.browserResourceLifecycleSummary.openResourceCount === 1
      && !openContract.valid
      && cleanupFailedReport.browserResourceLifecycleSummary?.status === "incomplete"
      && cleanupFailedReport.browserResourceLifecycleSummary.cleanupFailureCount === 1
      && !cleanupFailedContract.valid
      && foreignPlanReport.browserResourceLifecycleSummary?.status === "invalid"
      && foreignPlanReport.browserResourceLifecycleSummary.planMismatchCount === 1
      && !foreignPlanContract.valid
      && duplicateReport.browserResourceLifecycleSummary?.status === "invalid"
      && duplicateReport.browserResourceLifecycleSummary.duplicateResourceCount === 1
      && !duplicateContract.valid
      && tamperedArtifactVerification.status === "failed"
      && tamperedArtifactVerification.items.some(item => item.type === "browser_resource_lifecycle_evidence" && item.status === "failed");

    return {
      pass,
      report: passedReport,
      failedReport,
      mcpReport,
      reportContract,
      failedContract,
      mcpContract,
      verdictContract,
      artifactVerification,
      openSummary: openReport.browserResourceLifecycleSummary,
      cleanupFailedSummary: cleanupFailedReport.browserResourceLifecycleSummary,
      foreignPlanSummary: foreignPlanReport.browserResourceLifecycleSummary,
      duplicateSummary: duplicateReport.browserResourceLifecycleSummary,
      tamperedArtifactVerification,
    };
  } finally {
    await close(server);
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  }
}
