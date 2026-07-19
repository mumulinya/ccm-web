// Behavior-freeze extraction from self-test-core.ts (part-03.ts).
// Extracted functional module. The original entry remains a compatibility facade.

import * as fs from "fs";

import * as net from "net";

import * as os from "os";

import * as path from "path";

import * as crypto from "crypto";

import * as zlib from "zlib";

import { spawnSync } from "child_process";

import {
  normalizeTestAgentWorkOrderForSelfTest as normalizeTestAgentWorkOrder,
  runTestAgentForSelfTest as runTestAgent,
} from "../self-test-policy";

import { verifyTestAgentArtifactManifestFile } from "../artifact-verifier";

import { ACCEPTANCE_CLIPBOARD_FLOW_PROBE_TYPE, buildAcceptanceClipboardFlowBrowserChecks } from "../browser/acceptance-clipboard-flows";

import { ACCEPTANCE_CLICK_FLOW_PROBE_TYPE, buildAcceptanceClickFlowBrowserChecks } from "../browser/acceptance-click-flows";

import { buildAcceptanceDerivedBrowserAssertions } from "../browser/acceptance-derived-checks";

import { ACCEPTANCE_DIALOG_FLOW_PROBE_TYPE, buildAcceptanceDialogFlowBrowserChecks } from "../browser/acceptance-dialog-flows";

import { ACCEPTANCE_DRAG_FLOW_PROBE_TYPE, buildAcceptanceDragFlowBrowserChecks } from "../browser/acceptance-drag-flows";

import { ACCEPTANCE_DOWNLOAD_FLOW_PROBE_TYPE, buildAcceptanceDownloadFlowBrowserChecks } from "../browser/acceptance-download-flows";

import { ACCEPTANCE_FORM_FLOW_PROBE_TYPE, buildAcceptanceFormFlowBrowserChecks } from "../browser/acceptance-form-flows";

import { ACCEPTANCE_HISTORY_FLOW_PROBE_TYPE, buildAcceptanceHistoryFlowBrowserChecks } from "../browser/acceptance-history-flows";

import { ACCEPTANCE_HOVER_FLOW_PROBE_TYPE, buildAcceptanceHoverFlowBrowserChecks } from "../browser/acceptance-hover-flows";

import { ACCEPTANCE_KEYBOARD_FLOW_PROBE_TYPE, buildAcceptanceKeyboardFlowBrowserChecks } from "../browser/acceptance-keyboard-flows";

import { ACCEPTANCE_NETWORK_STATE_FLOW_PROBE_TYPE, buildAcceptanceNetworkStateFlowBrowserChecks } from "../browser/acceptance-network-state-flows";

import { MULTI_SESSION_BROWSER_PROBE_TYPE } from "../browser/multi-session";

import { ACCEPTANCE_POPUP_FLOW_PROBE_TYPE, buildAcceptancePopupFlowBrowserChecks } from "../browser/acceptance-popup-flows";

import { runBrowserSessionComparison } from "../browser/session-comparison";

import { ACCEPTANCE_REPEATED_CLICK_PROBE_TYPE, buildAcceptanceRepeatedClickBrowserChecks } from "../browser/acceptance-repeated-click-checks";

import { ACCEPTANCE_RESPONSIVE_PROBE_TYPE, buildAcceptanceResponsiveBrowserChecks } from "../browser/acceptance-responsive-checks";

import { ACCEPTANCE_SCROLL_FLOW_PROBE_TYPE, buildAcceptanceScrollFlowBrowserChecks } from "../browser/acceptance-scroll-flows";

import { buildBrowserStabilitySummary } from "../browser/stability-summary";

import { ACCEPTANCE_UPLOAD_FLOW_PROBE_TYPE, buildAcceptanceUploadFlowBrowserChecks } from "../browser/acceptance-upload-flows";

import { AUTO_BROWSER_SMOKE_PROBE_TYPE, buildAcceptancePathBrowserSmokeChecks, buildAutoBrowserSmokeCheck, buildBrowserChecksForProject } from "../browser/auto-checks";

import { checkPlaywrightAvailability } from "../browser/playwright-provider";

import { buildSemanticLocatorPlan } from "../browser/semantic-locator";

import { createStaticBrowserToolExecutor } from "../browser/tool-executor";

import { formatTestAgentCliArtifactVerificationSummary, formatTestAgentCliExecutionPlanSummary, formatTestAgentCliReportSummary, formatTestAgentCliValidationSummary, runTestAgentCli } from "../cli";

import { cliOverrides, parseTestAgentCliArgs } from "../cli-options";

import { TEST_AGENT_MINIMAL_HANDOFF_EXAMPLE, TEST_AGENT_WEB_APP_HANDOFF_EXAMPLE, TEST_AGENT_WEB_APP_WORK_ORDER_EXAMPLE, validateTestAgentHandoffContract, validateTestAgentReportContract, validateTestAgentVerdictContract, validateTestAgentWorkOrderContract } from "../contract";

import { buildAcceptanceCoverage } from "../coverage";

import { buildAcceptanceSummary } from "../acceptance-summary";

import { buildTestAgentExecutionPlan } from "../execution-plan";

import { buildTestAgentMarkdownReport } from "../artifacts";

import { buildTestAgentReport } from "../result-builder";

import { buildRequiredCheckCoverage } from "../required-checks";

import { discoverTestAgentSelfTests, formatTestAgentSelfTestMatrixSummary, runTestAgentSelfTestMatrix } from "../self-test-matrix";

import { buildTestAgentVerdict } from "../verdict";

import { buildTestAgentWorkOrderFromHandoff } from "../work-order-builder";

import {
  buildEmptyZip,
  buildStoredZip,
  getFreePort,
  refreshManifestItemIntegrity,
  writeSolidRgbaPng,
  writeTaskBoardFixtureServer,
} from "../self-test";


export async function runTestAgentAutoBrowserSmokeSelfTest() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-auto-browser-smoke-selftest-"));
  const port = await getFreePort();
  const targetUrl = `http://127.0.0.1:${port}/dashboard`;
  const artifactDir = path.join(dir, "artifacts");
  fs.writeFileSync(path.join(dir, "server.js"), [
    "const http = require('http');",
    "const html = '<!doctype html><title>Auto smoke</title><main><h1>Dashboard</h1><p>Ready for verification</p></main>';",
    "http.createServer((req, res) => { res.writeHead(200, {'content-type':'text/html'}); res.end(html); }).listen(process.env.PORT);",
  ].join("\n"), "utf-8");
  const calls: any[] = [];
  const executor = createStaticBrowserToolExecutor({
    tools: [
      "mcp__playwright__browser_navigate",
      "mcp__playwright__browser_snapshot",
      "mcp__playwright__browser_take_screenshot",
      "mcp__playwright__browser_console_messages",
      "mcp__playwright__browser_network_requests",
    ],
    onCall: (toolName, input) => {
      calls.push({ toolName, input });
      if (toolName.endsWith("browser_snapshot")) return "Dashboard\nReady for verification";
      if (toolName.endsWith("browser_console_messages")) return [];
      if (toolName.endsWith("browser_network_requests")) return [];
      if (toolName.endsWith("browser_take_screenshot")) return { path: "auto-smoke.png" };
      return { ok: true };
    },
  });
  const acceptanceCriteria = ['Target URL opens with "Ready for verification" at /dashboard'];
  const derivedAssertions = buildAcceptanceDerivedBrowserAssertions(acceptanceCriteria);
  const autoCheck = buildAutoBrowserSmokeCheck({
    name: "auto-browser-smoke-self-test",
    workDir: dir,
    runCommand: "",
    devServerCommand: "",
    targetUrl,
    startupUrl: targetUrl,
    startupTimeoutMs: 1000,
    env: {},
    changedFiles: [],
    verificationCommands: [],
    httpChecks: [],
    adversarialHttpChecks: [],
    adversarialBrowserChecks: [],
    browserChecks: [],
    agentSummary: "",
    risks: [],
  }, acceptanceCriteria);
  const report = await runTestAgent({
    id: `auto-browser-smoke-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent auto-generates a browser smoke check from targetUrl.",
    acceptanceCriteria,
    requiredChecks: ["browser_e2e", "screenshots", "console_errors", "browser_snapshots", "browser_console_logs", "browser_network_logs"],
    projects: [{
      name: "auto-browser-smoke-self-test",
      workDir: dir,
      runCommand: `"${process.execPath}" server.js`,
      targetUrl,
      env: { PORT: port },
    }],
    options: { browserProvider: "mcp", artifactDir },
  }, { browserProvider: "mcp", browserToolExecutor: executor });

  const result = report.browserResults[0];
  const byCheck = new Map(report.requiredCheckCoverage.map(item => [item.check, item]));
  const pass = autoCheck?.probeType === AUTO_BROWSER_SMOKE_PROBE_TYPE
    && autoCheck?.assertions?.some(assertion => assertion.type === "pageNotBlank") === true
    && derivedAssertions.some(item => item.reason === "quoted_text" && item.assertion.type === "text" && item.assertion.text === "Ready for verification")
    && derivedAssertions.some(item => item.reason === "explicit_url_path" && item.assertion.type === "urlIncludes" && item.assertion.text === "/dashboard")
    && autoCheck?.assertions?.some(assertion => assertion.type === "text" && assertion.text === "Ready for verification") === true
    && autoCheck?.assertions?.some(assertion => assertion.type === "urlIncludes" && assertion.text === "/dashboard") === true
    && report.status === "passed"
    && report.devServerResults.some(item => item.status === "started" || item.status === "already_running")
    && report.httpResults.some(item => item.name === "Page HTTP probe" && item.status === "passed")
    && report.browserResults.length === 1
    && result?.name === "Auto browser smoke: auto-browser-smoke-self-test"
    && result?.probeType === AUTO_BROWSER_SMOKE_PROBE_TYPE
    && result?.status === "passed"
    && result?.pageTextPreview?.includes("Ready for verification")
    && result?.steps.some(step => step.name.includes("pageNotBlank") && step.status === "passed")
    && result?.steps.some(step => step.name.includes("text") && step.status === "passed" && step.detail === "Ready for verification")
    && result?.steps.some(step => step.name.includes("urlIncludes") && step.status === "passed" && step.detail === "/dashboard")
    && result?.screenshots.length === 1
    && (result?.pageSnapshots || []).length === 1
    && !!result?.consoleLogPath
    && !!result?.networkLogPath
    && byCheck.get("browser_e2e")?.status === "verified"
    && byCheck.get("screenshots")?.status === "verified"
    && byCheck.get("console_errors")?.status === "verified"
    && byCheck.get("browser_snapshots")?.status === "verified"
    && byCheck.get("browser_console_logs")?.status === "verified"
    && byCheck.get("browser_network_logs")?.status === "verified"
    && report.acceptanceCoverage.every(item => item.status === "verified")
    && calls.some(call => call.toolName.endsWith("browser_navigate"))
    && calls.some(call => call.toolName.endsWith("browser_snapshot"));
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    report,
    calls,
    autoCheck,
    derivedAssertions,
  };
}
