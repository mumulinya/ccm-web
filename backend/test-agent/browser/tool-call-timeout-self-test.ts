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
import { BrowserCheckExecutionIdentity, TestAgentReport } from "../types";
import { buildBrowserToolCallTimeoutSummary } from "./tool-call-timeout";
import { createRecordingBrowserToolExecutor, createStaticBrowserToolExecutor } from "./tool-executor";
import { normalizeTestAgentWorkOrder } from "../work-order";
import { McpBrowserProvider } from "./mcp-provider";

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

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
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

function rebuildTimeoutSummary(report: TestAgentReport) {
  report.browserToolCallTimeoutSummary = buildBrowserToolCallTimeoutSummary(report.browserToolCalls);
}

export async function runTestAgentBrowserToolCallTimeoutSelfTest() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-browser-tool-timeout-"));
  const execution: BrowserCheckExecutionIdentity = {
    planId: "browser-execution-plan-direct-timeout-self-test",
    checkId: "browser-check:1:1",
    projectIndex: 0,
    checkIndex: 0,
    run: 1,
    expectedRuns: 1,
    evidence: "provider",
  };
  let directLateResolutions = 0;
  let directAbortObserved = false;
  const directRecorder = createRecordingBrowserToolExecutor({
    callTool: async (_toolName, _input, options) => {
      options?.signal?.addEventListener("abort", () => { directAbortObserved = true; }, { once: true });
      await delay(1_200);
      directLateResolutions += 1;
      return { late: true };
    },
  }, path.join(dir, "direct-artifacts"), { toolCallTimeoutMs: 1_000 });
  const directStarted = Date.now();
  let directError = "";
  try {
    await directRecorder.runWithExecutionScope(execution, () =>
      directRecorder.executor.callTool("mcp__playwright__browser_navigate", { url: "about:blank" })
    );
  } catch (error: any) {
    directError = error?.message || String(error);
  }
  const directDurationMs = Date.now() - directStarted;
  await delay(350);
  const directRecords = directRecorder.getRecords();
  const directTranscriptLines = fs.readFileSync(directRecorder.transcriptPath, "utf-8").split(/\r?\n/).filter(Boolean);

  const server = http.createServer((_request, response) => {
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end("<!doctype html><title>Timeout fixture</title><main><h1>Eventually ready</h1></main>");
  });
  const port = await listen(server);
  const baseUrl = `http://127.0.0.1:${port}`;
  let listAbortObserved = false;
  let listLateResolutions = 0;
  const listExecutor = createStaticBrowserToolExecutor({
    tools: [],
    onListTools: async options => {
      options?.signal?.addEventListener("abort", () => { listAbortObserved = true; }, { once: true });
      await delay(1_200);
      listLateResolutions += 1;
      return ["mcp__playwright__browser_navigate"];
    },
  });
  const preflightWorkOrder = normalizeTestAgentWorkOrder({
    id: `browser-tool-list-timeout-${process.pid}-${Date.now()}`,
    originalUserGoal: "Bound browser tool capability discovery.",
    acceptanceCriteria: [],
    requiredChecks: ["browser_e2e"],
    projects: [{ name: "browser-tool-list-timeout", workDir: dir, targetUrl: baseUrl }],
    options: {
      artifactDir: path.join(dir, "list-timeout-artifacts"),
      browserProvider: "mcp",
      browserTimeoutMs: 1_000,
      requireAdversarialProbe: false,
      adversarialProbeWaiver: "Capability discovery timeout is the infrastructure condition under test.",
    },
  }).workOrder;
  const preflightStarted = Date.now();
  const mcpPreflight = await McpBrowserProvider.availability({
    workOrder: preflightWorkOrder,
    runtime: { browserProvider: "mcp", browserToolExecutor: listExecutor },
  });
  const preflightDurationMs = Date.now() - preflightStarted;
  await delay(350);
  let agentAbortObserved = false;
  let agentLateResolutions = 0;
  const executor = createStaticBrowserToolExecutor({
    tools: [
      "mcp__playwright__browser_navigate",
      "mcp__playwright__browser_snapshot",
      "mcp__playwright__browser_console_messages",
      "mcp__playwright__browser_network_requests",
    ],
    onCall: async (_toolName, _input, options) => {
      options?.signal?.addEventListener("abort", () => { agentAbortObserved = true; }, { once: true });
      await delay(1_200);
      agentLateResolutions += 1;
      return { late: true };
    },
  });
  const input: any = {
    id: `browser-tool-timeout-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify a hanging MCP browser call cannot hang TestAgent or produce PASS.",
    acceptanceCriteria: ["The browser check must finish within its configured deadline"],
    requiredChecks: ["browser_e2e"],
    projects: [{
      name: "browser-tool-timeout",
      workDir: dir,
      targetUrl: baseUrl,
      browserChecks: [{
        name: "Hanging MCP navigation",
        url: baseUrl,
        actions: [{ type: "goto", url: baseUrl }],
        assertions: [{ type: "text", text: "Eventually ready" }],
        coversAcceptanceCriteria: ["The browser check must finish within its configured deadline"],
        screenshot: false,
      }],
    }],
    options: {
      artifactDir: path.join(dir, "artifacts"),
      browserProvider: "mcp",
      browserTimeoutMs: 1_000,
      collectBrowserArtifacts: false,
      collectBrowserVideo: false,
      requireAdversarialProbe: false,
      adversarialProbeWaiver: "The hanging provider is the adversarial infrastructure condition under test.",
    },
  };

  try {
    const agentStarted = Date.now();
    const report = await runTestAgent(input, { browserProvider: "mcp", browserToolExecutor: executor });
    const agentDurationMs = Date.now() - agentStarted;
    await delay(350);
    const timeoutRecord = report.browserToolCalls.find(record => record.timedOut === true);
    const timeoutResult = report.browserResults.find(result =>
      timeoutRecord && (result.browserToolCallIds || []).includes(timeoutRecord.id)
    );
    const summary = report.browserToolCallTimeoutSummary;
    const files = report.metadata.artifactFiles as Record<string, string>;
    const reportPath = files.reportJsonPath;
    const verdictPath = files.verdictJsonPath;
    const manifestPath = files.manifestPath;
    const transcriptPath = String(report.metadata.browserToolTranscriptPath || "");
    const transcriptBefore = transcriptPath ? fs.readFileSync(transcriptPath, "utf-8") : "";
    await delay(100);
    const transcriptAfter = transcriptPath ? fs.readFileSync(transcriptPath, "utf-8") : "";
    const reportContract = validateTestAgentReportContract(report);
    const verdict = JSON.parse(fs.readFileSync(verdictPath, "utf-8"));
    const verdictContract = validateTestAgentVerdictContract(verdict);
    const artifactVerification = verifyTestAgentArtifactManifestFile(manifestPath);
    const cli = formatTestAgentCliReportSummary(report);
    const markdown = buildTestAgentMarkdownReport(report);

    const missingAbortReport = clone(report);
    missingAbortReport.browserToolCalls[0].abortRequested = false;
    rebuildTimeoutSummary(missingAbortReport);
    const missingAbortContract = validateTestAgentReportContract(missingAbortReport);

    const falsePassReport = clone(report);
    const falsePassRecord = falsePassReport.browserToolCalls.find(record => record.timedOut === true)!;
    const falsePassResult = falsePassReport.browserResults.find(result =>
      (result.browserToolCallIds || []).includes(falsePassRecord.id)
    )!;
    falsePassResult.status = "passed";
    rebuildTimeoutSummary(falsePassReport);
    const falsePassContract = validateTestAgentReportContract(falsePassReport);

    const originalReport = fs.readFileSync(reportPath, "utf-8");
    fs.writeFileSync(reportPath, `${JSON.stringify(falsePassReport, null, 2)}\n`, "utf-8");
    refreshReportIntegrity(manifestPath, reportPath);
    const tamperedVerification = verifyTestAgentArtifactManifestFile(manifestPath);
    fs.writeFileSync(reportPath, originalReport, "utf-8");

    const pass = directError.includes("timed out after 1000ms")
      && directDurationMs >= 1_000
      && directDurationMs < 1_500
      && directAbortObserved
      && directLateResolutions === 1
      && directRecords.length === 1
      && directTranscriptLines.length === 1
      && directRecords[0].status === "failed"
      && directRecords[0].timedOut === true
      && directRecords[0].abortRequested === true
      && directRecords[0].timeoutMs === 1_000
      && directRecords[0].browserExecution?.checkId === execution.checkId
      && preflightDurationMs >= 1_000
      && preflightDurationMs < 5_000
      && listAbortObserved
      && listLateResolutions === 1
      && mcpPreflight.available === false
      && String(mcpPreflight.reason || "").includes("Browser tool listing timed out after 1000ms")
      && agentDurationMs >= 1_000
      && agentDurationMs < 10_000
      && agentAbortObserved
      && agentLateResolutions === 1
      && report.status !== "passed"
      && report.recommendation !== "accept"
      && timeoutRecord?.status === "failed"
      && timeoutRecord.timedOut === true
      && timeoutRecord.abortRequested === true
      && timeoutRecord.timeoutMs === 1_000
      && Number(timeoutRecord.durationMs) >= 1_000
      && timeoutResult?.status === "blocked"
      && Number(timeoutResult.durationMs) < 2_500
      && report.browserResults.length === 1
      && report.browserResults[0].provider === "mcp"
      && summary?.timedOutCalls === 1
      && summary.abortRequestedCalls === 1
      && summary.items[0]?.id === timeoutRecord.id
      && report.browserToolEvidenceLineage?.status === "complete"
      && transcriptBefore === transcriptAfter
      && transcriptBefore.split(/\r?\n/).filter(Boolean).length === 1
      && reportContract.valid
      && verdictContract.valid
      && verdict.canAccept === false
      && cli.includes("Browser tool timeouts: calls=1; passed=0; failed=1; timedOut=1; abortRequested=1")
      && markdown.includes("## Browser Tool Call Timeouts")
      && markdown.includes("Timed out: yes")
      && artifactVerification.status === "passed"
      && artifactVerification.items.some(item => item.type === "browser_tool_timeout_evidence" && item.status === "passed")
      && !missingAbortContract.valid
      && !falsePassContract.valid
      && tamperedVerification.status === "failed"
      && tamperedVerification.items.some(item =>
        item.type === "browser_tool_timeout_evidence"
        && item.status === "failed"
        && String(item.error || "").includes("linked to a passed browser result")
      );

    return {
      pass,
      directDurationMs,
      directRecords,
      preflightDurationMs,
      mcpPreflight,
      agentDurationMs,
      report,
      summary,
      reportContract,
      verdictContract,
      artifactVerification,
      missingAbortContract,
      falsePassContract,
      tamperedVerification,
    };
  } finally {
    await close(server);
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  }
}
