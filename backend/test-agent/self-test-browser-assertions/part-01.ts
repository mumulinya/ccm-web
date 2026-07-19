// Behavior-freeze extraction from self-test-browser-assertions.ts (part-01.ts).
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


export async function runTestAgentPlaywrightFailureScreenshotSelfTest() {
  const availability = await checkPlaywrightAvailability();
  if (!availability.available) {
    return {
      pass: false,
      availability,
      reason: availability.reason,
    };
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-playwright-failure-screenshot-selftest-"));
  const artifactDir = path.join(dir, "artifacts");
  const port = await getFreePort();
  const targetUrl = `http://127.0.0.1:${port}/failure`;
  fs.writeFileSync(path.join(dir, "server.js"), [
    "const http = require('http');",
    "const html = `<!doctype html>",
    "<html><head><title>Failure Screenshot Fixture</title><link rel=\"icon\" href=\"data:,\"></head>",
    "<body><main>",
    "<h1>Failure evidence page</h1>",
    "<p role=\"status\">Ready for failure evidence</p>",
    "<button type=\"button\">Retry</button>",
    "</main></body></html>`;",
    "http.createServer((req, res) => { res.writeHead(200, {'content-type':'text/html'}); res.end(html); }).listen(process.env.PORT);",
  ].join("\n"), "utf-8");

  const report = await runTestAgent({
    id: `playwright-failure-screenshot-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent captures failure screenshots even when normal screenshots are disabled.",
    acceptanceCriteria: ["A failing browser assertion produces a local failure screenshot artifact."],
    requiredChecks: ["browser_e2e", "console_errors"],
    projects: [{
      name: "playwright-failure-screenshot-self-test",
      workDir: dir,
      runCommand: `"${process.execPath}" server.js`,
      targetUrl,
      env: { PORT: port },
      browserChecks: [{
        name: "Fail without requested screenshot",
        url: targetUrl,
        actions: [{ type: "goto", url: targetUrl }],
        assertions: [
          { type: "text", text: "This text is intentionally missing", timeoutMs: 500 },
          { type: "consoleNoErrors" },
          { type: "networkNoErrors" },
        ],
        screenshot: false,
      }],
    }],
    options: {
      artifactDir,
      browserProvider: "playwright",
      collectBrowserArtifacts: false,
      browserTimeoutMs: 2_000,
    },
  }, { browserProvider: "playwright" });

  const browser = report.browserResults[0];
  const screenshotPath = String(browser?.screenshots?.[0] || "");
  const manifestPath = String((report.metadata.artifactFiles as any)?.manifestPath || "");
  const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, "utf-8")) : null;
  const verification = manifestPath ? verifyTestAgentArtifactManifestFile(manifestPath) : null;
  const screenshotEntry = (manifest?.files || []).find((item: any) => item.type === "screenshot" && String(item.path || "").endsWith(".failure.png"));
  const screenshotMetadata = verification?.items.find(item => item.type === "screenshot_png_metadata" && String(item.path || "").endsWith(".failure.png"));
  const byCheck = new Map(report.requiredCheckCoverage.map(item => [item.check, item]));
  const pass = report.status === "failed"
    && browser?.provider === "playwright"
    && browser?.status === "failed"
    && browser?.steps.some(step => step.name === "assert:text" && step.status === "failed")
    && browser?.screenshots.length === 1
    && screenshotPath.endsWith(".failure.png")
    && fs.existsSync(screenshotPath)
    && fs.statSync(screenshotPath).size > 100
    && manifest?.summary?.screenshots === 1
    && screenshotEntry?.path === screenshotPath
    && verification?.status === "passed"
    && screenshotMetadata?.status === "passed"
    && byCheck.get("browser_e2e")?.status === "not_verified"
    && report.failureSummary.some(item => item.type === "browser" && item.evidence?.some(evidence => evidence.includes(screenshotPath)));

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    availability,
    report,
    manifest,
    verification,
    screenshotPath,
  };
}

export async function runTestAgentBrowserUrlTitleAssertionSelfTest() {
  const availability = await checkPlaywrightAvailability();
  if (!availability.available) {
    return {
      pass: false,
      availability,
      reason: availability.reason,
    };
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-browser-url-title-selftest-"));
  const passArtifactDir = path.join(dir, "pass-artifacts");
  const failArtifactDir = path.join(dir, "fail-artifacts");
  const port = await getFreePort();
  const settingsUrl = `http://127.0.0.1:${port}/settings?tab=profile#details`;
  const loginUrl = `http://127.0.0.1:${port}/login`;
  const delayedUrl = `http://127.0.0.1:${port}/delayed`;
  fs.writeFileSync(path.join(dir, "server.js"), [
    "const http = require('http');",
    "const settings = '<!doctype html><html><head><title>Settings Profile | CCM</title></head><body><main><h1>Settings Profile</h1><p role=\"status\">Profile ready</p></main></body></html>';",
    "const login = '<!doctype html><html><head><title>Login | CCM</title></head><body><main><h1>Login</h1><p role=\"status\">Login required</p></main></body></html>';",
    "const delayed = `<!doctype html><html><head><title>Loading Title | CCM</title></head><body><main><h1>Delayed Title</h1><p role=\"status\">Waiting for title</p></main><script>setTimeout(() => { document.title = 'Done Title | CCM'; document.querySelector('[role=status]').textContent = 'Title done'; }, 250);</script></body></html>`;",
    "http.createServer((req, res) => {",
    "  const route = String(req.url || '/').split('?')[0];",
    "  res.writeHead(200, {'content-type':'text/html'});",
    "  res.end(route === '/login' ? login : route === '/delayed' ? delayed : settings);",
    "}).listen(process.env.PORT);",
  ].join("\n"), "utf-8");

  const baseProject = {
    name: "browser-url-title-self-test",
    workDir: dir,
    runCommand: `"${process.execPath}" server.js`,
    targetUrl: settingsUrl,
    env: { PORT: port },
  };

  const passReport = await runTestAgent({
    id: `browser-url-title-pass-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent can assert exact and negative browser URL/title state.",
    acceptanceCriteria: ["Settings route has the exact profile URL and title, and delayed title updates are detected."],
    requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
    projects: [{
      ...baseProject,
      browserChecks: [{
        name: "Exact URL and title match",
        url: settingsUrl,
        actions: [
          { type: "goto", url: settingsUrl },
        ],
        assertions: [
          { assertion: "url_equals", url: "/settings?tab=profile#details" } as any,
          { assertion: "url_not_contains", value: "/login" } as any,
          { assertion: "title_equals", title: "Settings Profile | CCM" } as any,
          { assertion: "title_not_contains", text: "Login" } as any,
          { type: "consoleNoErrors" },
          { type: "networkNoErrors" },
        ],
        screenshot: true,
      }, {
        name: "Delayed title assertion waits",
        url: delayedUrl,
        actions: [
          { type: "goto", url: delayedUrl },
        ],
        assertions: [
          { type: "urlEquals", url: "/delayed" },
          { type: "titleEquals", title: "Done Title | CCM", timeoutMs: 3000 },
          { type: "titleNotIncludes", text: "Loading", timeoutMs: 3000 },
          { type: "text", text: "Title done" },
          { type: "consoleNoErrors" },
          { type: "networkNoErrors" },
        ],
        screenshot: true,
      }],
    }],
    options: {
      artifactDir: passArtifactDir,
      browserProvider: "playwright",
      collectBrowserArtifacts: false,
    },
  }, { browserProvider: "playwright" });

  const failReport = await runTestAgent({
    id: `browser-url-title-fail-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent fails when exact or negative browser URL/title assertions are wrong.",
    acceptanceCriteria: ["Login route must not include /login and must have the Settings title."],
    requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
    projects: [{
      ...baseProject,
      targetUrl: loginUrl,
      browserChecks: [{
        name: "Wrong URL/title expectations fail",
        url: loginUrl,
        actions: [
          { type: "goto", url: loginUrl },
        ],
        assertions: [
          { type: "urlNotIncludes", text: "/login", timeoutMs: 800 },
          { type: "titleEquals", title: "Settings Profile | CCM", timeoutMs: 800 },
          { type: "consoleNoErrors" },
          { type: "networkNoErrors" },
        ],
        screenshot: true,
      }],
    }],
    options: {
      artifactDir: failArtifactDir,
      browserProvider: "playwright",
      collectBrowserArtifacts: false,
    },
  }, { browserProvider: "playwright" });

  const exactBrowser = passReport.browserResults[0];
  const delayedBrowser = passReport.browserResults[1];
  const failBrowser = failReport.browserResults[0];
  const failUrl = failBrowser?.steps.find(step => step.name === "assert:urlNotIncludes");
  const pass = passReport.status === "passed"
    && exactBrowser?.provider === "playwright"
    && delayedBrowser?.provider === "playwright"
    && exactBrowser?.status === "passed"
    && delayedBrowser?.status === "passed"
    && exactBrowser?.steps.some(step => step.name === "assert:urlEquals" && step.status === "passed" && String(step.detail || "").includes("/settings?tab=profile#details"))
    && exactBrowser?.steps.some(step => step.name === "assert:urlNotIncludes" && step.status === "passed" && String(step.detail || "").includes("/login"))
    && exactBrowser?.steps.some(step => step.name === "assert:titleEquals" && step.status === "passed" && String(step.detail || "").includes("Settings Profile"))
    && exactBrowser?.steps.some(step => step.name === "assert:titleNotIncludes" && step.status === "passed" && String(step.detail || "").includes("Login"))
    && delayedBrowser?.steps.some(step => step.name === "assert:titleEquals" && step.status === "passed" && String(step.detail || "").includes("Done Title"))
    && delayedBrowser?.steps.some(step => step.name === "assert:titleNotIncludes" && step.status === "passed" && String(step.detail || "").includes("Loading"))
    && delayedBrowser?.title === "Done Title | CCM"
    && passReport.requiredCheckCoverage.some(item => item.check === "browser_e2e" && item.status === "verified")
    && passReport.acceptanceCoverage.every(item => item.status === "verified")
    && failReport.status === "failed"
    && failBrowser?.provider === "playwright"
    && failBrowser?.status === "failed"
    && failUrl?.status === "failed"
    && String(failUrl?.error || "").includes("Expected URL not to include")
    && failReport.requiredCheckCoverage.some(item => item.check === "browser_e2e" && item.status === "not_verified");

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    availability,
    passReport,
    failReport,
  };
}

export async function runTestAgentBrowserConsoleAssertionSelfTest() {
  const availability = await checkPlaywrightAvailability();
  if (!availability.available) {
    return {
      pass: false,
      availability,
      reason: availability.reason,
    };
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-browser-console-selftest-"));
  const passArtifactDir = path.join(dir, "pass-artifacts");
  const failArtifactDir = path.join(dir, "fail-artifacts");
  const mcpArtifactDir = path.join(dir, "mcp-artifacts");
  const port = await getFreePort();
  const passUrl = `http://127.0.0.1:${port}/pass`;
  const failUrl = `http://127.0.0.1:${port}/fail`;
  fs.writeFileSync(path.join(dir, "server.js"), [
    "const http = require('http');",
    "const pass = `<!doctype html><html><head><title>Console Pass Fixture</title></head><body><main><h1>Console verification</h1><p role=\"status\">Console page ready</p></main><script>setTimeout(() => { console.info('test-agent: feature-ready dashboard'); console.log('test-agent: audit trail saved'); }, 150);</script></body></html>`;",
    "const fail = `<!doctype html><html><head><title>Console Warning Fixture</title></head><body><main><h1>Console warning verification</h1><p role=\"status\">Warning page ready</p></main><script>setTimeout(() => { console.warn('deprecated console warning from fixture'); }, 50);</script></body></html>`;",
    "http.createServer((req, res) => {",
    "  res.writeHead(200, {'content-type':'text/html'});",
    "  res.end(String(req.url || '').startsWith('/fail') ? fail : pass);",
    "}).listen(process.env.PORT);",
  ].join("\n"), "utf-8");

  const baseProject = {
    name: "browser-console-self-test",
    workDir: dir,
    runCommand: `"${process.execPath}" server.js`,
    targetUrl: passUrl,
    env: { PORT: port },
  };

  const passReport = await runTestAgent({
    id: `browser-console-pass-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent can assert browser console messages and warnings.",
    acceptanceCriteria: ["The page emits the feature-ready console signal without warnings or errors."],
    requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
    projects: [{
      ...baseProject,
      browserChecks: [{
        name: "Console signal is observed",
        url: passUrl,
        actions: [
          { type: "goto", url: passUrl },
        ],
        assertions: [
          { type: "text", text: "Console page ready" },
          { assertion: "console_message_contains", messageIncludes: "feature-ready dashboard", timeoutMs: 3000 } as any,
          { assertion: "console_not_contains", value: "deprecated console warning", settleMs: 250 } as any,
          { assertion: "no_console_warning", settleMs: 250 } as any,
          { type: "consoleNoErrors" },
          { type: "networkNoErrors" },
        ],
        screenshot: true,
      }],
    }],
    options: {
      artifactDir: passArtifactDir,
      browserProvider: "playwright",
      collectBrowserArtifacts: false,
    },
  }, { browserProvider: "playwright" });

  const failReport = await runTestAgent({
    id: `browser-console-fail-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent fails when warning console telemetry is present.",
    acceptanceCriteria: ["The page should not emit deprecated warning telemetry."],
    requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
    projects: [{
      ...baseProject,
      targetUrl: failUrl,
      browserChecks: [{
        name: "Console warning is reported",
        url: failUrl,
        actions: [
          { type: "goto", url: failUrl },
        ],
        assertions: [
          { type: "consoleIncludes", text: "deprecated console warning", timeoutMs: 3000 },
          { type: "consoleNoWarnings", settleMs: 300 },
          { type: "consoleNotIncludes", text: "deprecated console warning", settleMs: 100 },
          { type: "consoleNoErrors" },
          { type: "networkNoErrors" },
        ],
        screenshot: true,
      }],
    }],
    options: {
      artifactDir: failArtifactDir,
      browserProvider: "playwright",
      collectBrowserArtifacts: false,
    },
  }, { browserProvider: "playwright" });

  const mcpCalls: any[] = [];
  const executor = createStaticBrowserToolExecutor({
    tools: [
      "mcp__playwright__browser_navigate",
      "mcp__playwright__browser_snapshot",
      "mcp__playwright__browser_take_screenshot",
      "mcp__playwright__browser_console_messages",
      "mcp__playwright__browser_network_requests",
    ],
    onCall: (toolName, input) => {
      mcpCalls.push({ toolName, input });
      if (toolName.endsWith("browser_snapshot")) return "MCP Console Ready";
      if (toolName.endsWith("browser_console_messages")) return "info: mcp feature-ready signal\nlog: mcp audit trail";
      if (toolName.endsWith("browser_network_requests")) return [];
      if (toolName.endsWith("browser_take_screenshot")) return { path: "fake-console-screenshot.png" };
      return { ok: true };
    },
  });
  const mcpReport = await runTestAgent({
    id: `browser-console-mcp-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent MCP adapters expose console message assertions.",
    acceptanceCriteria: ["MCP console messages can be asserted without treating info logs as errors."],
    requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
    projects: [{
      name: "browser-console-mcp-self-test",
      workDir: process.cwd(),
      browserChecks: [{
        name: "MCP console telemetry",
        url: "http://example.test/console",
        actions: [{ type: "goto", url: "http://example.test/console" }],
        assertions: [
          { type: "text", text: "MCP Console Ready" },
          { type: "consoleIncludes", text: "mcp feature-ready signal" },
          { type: "consoleNotIncludes", text: "mcp warning", settleMs: 10 },
          { type: "consoleNoWarnings", settleMs: 10 },
          { type: "consoleNoErrors" },
        ],
        screenshot: true,
      }],
    }],
    options: {
      artifactDir: mcpArtifactDir,
      browserProvider: "mcp",
    },
  }, { browserProvider: "mcp", browserToolExecutor: executor });

  const passBrowser = passReport.browserResults[0];
  const failBrowser = failReport.browserResults[0];
  const mcpBrowser = mcpReport.browserResults[0];
  const failNoWarnings = failBrowser?.steps.find(step => step.name === "assert:consoleNoWarnings");
  const failNotIncludes = failBrowser?.steps.find(step => step.name === "assert:consoleNotIncludes");
  const pass = passReport.status === "passed"
    && passBrowser?.provider === "playwright"
    && passBrowser?.status === "passed"
    && passBrowser?.steps.some(step => step.name === "assert:consoleIncludes" && step.status === "passed")
    && passBrowser?.steps.some(step => step.name === "assert:consoleNotIncludes" && step.status === "passed")
    && passBrowser?.steps.some(step => step.name === "assert:consoleNoWarnings" && step.status === "passed")
    && passBrowser?.consoleMessages?.some(line => line.includes("feature-ready dashboard"))
    && passReport.requiredCheckCoverage.some(item => item.check === "browser_e2e" && item.status === "verified")
    && failReport.status === "failed"
    && failBrowser?.provider === "playwright"
    && failBrowser?.status === "failed"
    && failBrowser?.steps.some(step => step.name === "assert:consoleIncludes" && step.status === "passed")
    && failNoWarnings?.status === "failed"
    && String(failNoWarnings?.error || "").includes("Unexpected browser console telemetry")
    && failNotIncludes?.status === "failed"
    && failReport.requiredCheckCoverage.some(item => item.check === "browser_e2e" && item.status === "not_verified")
    && mcpReport.status === "passed"
    && mcpBrowser?.provider === "mcp"
    && mcpBrowser?.status === "passed"
    && mcpBrowser?.steps.some(step => step.name === "playwright:consoleIncludes" && step.status === "passed")
    && mcpBrowser?.steps.some(step => step.name === "playwright:consoleNoWarnings" && step.status === "passed")
    && mcpBrowser?.steps.some(step => step.name === "playwright:consoleNoErrors" && step.status === "passed")
    && mcpBrowser?.consoleMessages?.some(line => line.includes("mcp feature-ready signal"))
    && mcpCalls.some(call => call.toolName.endsWith("browser_console_messages"));

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    availability,
    passReport,
    failReport,
    mcpReport,
    mcpCalls,
  };
}

export async function runTestAgentBrowserNetworkStateActionSelfTest() {
  const availability = await checkPlaywrightAvailability();
  if (!availability.available) {
    return {
      pass: false,
      availability,
      reason: availability.reason,
    };
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-browser-network-state-selftest-"));
  const passArtifactDir = path.join(dir, "pass-artifacts");
  const failArtifactDir = path.join(dir, "fail-artifacts");
  const mcpArtifactDir = path.join(dir, "mcp-artifacts");
  const port = await getFreePort();
  const targetUrl = `http://127.0.0.1:${port}/network-state`;
  fs.writeFileSync(path.join(dir, "server.js"), [
    "const http = require('http');",
    "const html = `<!doctype html>",
    "<html><head><title>Network State Fixture</title><link rel=\"icon\" href=\"data:,\"></head>",
    "<body><main>",
    "<h1>Network state verification</h1>",
    "<p id=\"status\" role=\"status\">Checking network</p>",
    "<button type=\"button\" id=\"refresh\">Refresh network status</button>",
    "<script>",
    "const status = document.getElementById('status');",
    "function render() { status.textContent = navigator.onLine ? 'Browser online' : 'Browser offline'; }",
    "window.addEventListener('online', render);",
    "window.addEventListener('offline', render);",
    "document.getElementById('refresh').addEventListener('click', render);",
    "render();",
    "</script>",
    "</main></body></html>`;",
    "http.createServer((req, res) => { res.writeHead(200, {'content-type':'text/html'}); res.end(html); }).listen(process.env.PORT);",
  ].join("\n"), "utf-8");

  const baseProject = {
    name: "browser-network-state-self-test",
    workDir: dir,
    runCommand: `"${process.execPath}" server.js`,
    targetUrl,
    env: { PORT: port },
  };

  const passReport = await runTestAgent({
    id: `browser-network-state-pass-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent can emulate browser offline and online network state.",
    acceptanceCriteria: ["The app detects offline state and can return to online state."],
    requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
    projects: [{
      ...baseProject,
      browserChecks: [{
        name: "Browser can enter offline state",
        url: targetUrl,
        actions: [
          { type: "goto", url: targetUrl },
          { action: "go_offline" } as any,
          { type: "click", role: "button", name: "Refresh network status", exact: true },
        ],
        assertions: [
          { assertion: "browser_offline" } as any,
          { type: "text", text: "Browser offline" },
          { type: "consoleNoErrors" },
          { type: "networkNoErrors" },
        ],
        screenshot: true,
      }, {
        name: "Browser can return online",
        url: targetUrl,
        actions: [
          { type: "goto", url: targetUrl },
          { type: "setOffline" },
          { type: "click", role: "button", name: "Refresh network status", exact: true },
          { action: "set_online" } as any,
          { type: "click", role: "button", name: "Refresh network status", exact: true },
        ],
        assertions: [
          { assertion: "online_state", value: "online" } as any,
          { type: "text", text: "Browser online" },
          { type: "consoleNoErrors" },
          { type: "networkNoErrors" },
        ],
        screenshot: true,
      }],
    }],
    options: {
      artifactDir: passArtifactDir,
      browserProvider: "playwright",
      collectBrowserArtifacts: false,
    },
  }, { browserProvider: "playwright" });

  const failReport = await runTestAgent({
    id: `browser-network-state-fail-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent fails when expected online state is wrong.",
    acceptanceCriteria: ["Offline browser state must not be accepted as online."],
    requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
    projects: [{
      ...baseProject,
      browserChecks: [{
        name: "Wrong online expectation fails",
        url: targetUrl,
        actions: [
          { type: "goto", url: targetUrl },
          { type: "setOffline" },
          { type: "click", role: "button", name: "Refresh network status", exact: true },
        ],
        assertions: [
          { type: "browserOnline", timeoutMs: 800 },
          { type: "text", text: "Browser online", timeoutMs: 800 },
        ],
        screenshot: true,
      }],
    }],
    options: {
      artifactDir: failArtifactDir,
      browserProvider: "playwright",
      collectBrowserArtifacts: false,
    },
  }, { browserProvider: "playwright" });

  const calls: any[] = [];
  const executor = createStaticBrowserToolExecutor({
    tools: [
      "mcp__playwright__browser_navigate",
      "mcp__playwright__browser_snapshot",
      "mcp__playwright__browser_console_messages",
      "mcp__playwright__browser_network_requests",
    ],
    onCall: (toolName, input) => {
      calls.push({ toolName, input });
      if (toolName.endsWith("browser_snapshot")) return "Network State Ready";
      if (toolName.endsWith("browser_console_messages")) return [];
      if (toolName.endsWith("browser_network_requests")) return [];
      return { ok: true };
    },
  });
  const mcpReport = await runTestAgent({
    id: `browser-network-state-mcp-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent reports MCP offline emulation as unsupported.",
    acceptanceCriteria: ["MCP provider should not fake offline browser context support."],
    requiredChecks: ["browser_e2e"],
    projects: [{
      name: "browser-network-state-mcp-self-test",
      workDir: process.cwd(),
      browserChecks: [{
        name: "MCP offline action is explicit unsupported",
        url: "http://example.test/network-state",
        actions: [
          { type: "goto", url: "http://example.test/network-state" },
          { type: "setOffline" },
        ],
        assertions: [
          { type: "browserOffline" },
        ],
        screenshot: false,
      }],
    }],
    options: {
      artifactDir: mcpArtifactDir,
      browserProvider: "mcp",
    },
  }, { browserProvider: "mcp", browserToolExecutor: executor });

  const offlineBrowser = passReport.browserResults[0];
  const onlineBrowser = passReport.browserResults[1];
  const failBrowser = failReport.browserResults[0];
  const mcpBrowser = mcpReport.browserResults[0];
  const offlineAction = offlineBrowser?.steps.find(step => step.name === "action:setOffline");
  const onlineAction = onlineBrowser?.steps.find(step => step.name === "action:setOnline");
  const offlineAssertion = offlineBrowser?.steps.find(step => step.name === "assert:browserOffline");
  const onlineAssertion = onlineBrowser?.steps.find(step => step.name === "assert:onlineState");
  const failAssertion = failBrowser?.steps.find(step => step.name === "assert:browserOnline");
  const mcpOfflineAction = mcpBrowser?.steps.find(step => step.name === "playwright:setOffline");
  const pass = passReport.status === "passed"
    && offlineBrowser?.provider === "playwright"
    && onlineBrowser?.provider === "playwright"
    && offlineBrowser?.status === "passed"
    && onlineBrowser?.status === "passed"
    && offlineAction?.status === "passed"
    && String(offlineAction?.detail || "").includes("offline")
    && offlineAssertion?.status === "passed"
    && String(offlineAssertion?.detail || "").includes("offline")
    && offlineBrowser?.pageTextPreview?.includes("Browser offline")
    && onlineAction?.status === "passed"
    && String(onlineAction?.detail || "").includes("online")
    && onlineAssertion?.status === "passed"
    && String(onlineAssertion?.detail || "").includes("online")
    && onlineBrowser?.pageTextPreview?.includes("Browser online")
    && passReport.requiredCheckCoverage.some(item => item.check === "browser_e2e" && item.status === "verified")
    && failReport.status === "failed"
    && failBrowser?.provider === "playwright"
    && failBrowser?.status === "failed"
    && failAssertion?.status === "failed"
    && String(failAssertion?.error || "").includes("Expected browser to be online")
    && failReport.requiredCheckCoverage.some(item => item.check === "browser_e2e" && item.status === "not_verified")
    && mcpReport.status === "failed"
    && mcpBrowser?.provider === "mcp"
    && mcpBrowser?.status === "failed"
    && mcpOfflineAction?.status === "failed"
    && String(mcpOfflineAction?.error || "").includes("offline/online emulation")
    && calls.some(call => call.toolName.endsWith("browser_navigate"));

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    availability,
    passReport,
    failReport,
    mcpReport,
  };
}

export async function runTestAgentBrowserAccessibilityAssertionSelfTest() {
  const availability = await checkPlaywrightAvailability();
  if (!availability.available) {
    return {
      pass: false,
      availability,
      reason: availability.reason,
    };
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-browser-accessibility-selftest-"));
  const passArtifactDir = path.join(dir, "pass-artifacts");
  const failArtifactDir = path.join(dir, "fail-artifacts");
  const mcpArtifactDir = path.join(dir, "mcp-artifacts");
  const port = await getFreePort();
  const targetUrl = `http://127.0.0.1:${port}/accessibility`;
  fs.writeFileSync(path.join(dir, "server.js"), [
    "const http = require('http');",
    "const html = `<!doctype html>",
    "<html><head><title>Accessibility Fixture</title><link rel=\"icon\" href=\"data:,\"></head>",
    "<body><main>",
    "<h1>Profile accessibility</h1>",
    "<p id=\"save-help\">Saves profile changes and announces completion.</p>",
    "<button id=\"save\" type=\"button\" aria-label=\"Save profile changes\" aria-describedby=\"save-help\">Save</button>",
    "<label for=\"email\">Email address</label>",
    "<input id=\"email\" aria-describedby=\"email-help\" />",
    "<p id=\"email-help\">We will send updates to this address.</p>",
    "<p id=\"status\" role=\"status\">Ready</p>",
    "<script>",
    "document.getElementById('save').addEventListener('click', () => {",
    "  document.getElementById('status').textContent = 'Saved for accessibility';",
    "});",
    "</script>",
    "</main></body></html>`;",
    "http.createServer((req, res) => { res.writeHead(200, {'content-type':'text/html'}); res.end(html); }).listen(process.env.PORT);",
  ].join("\n"), "utf-8");

  const baseProject = {
    name: "browser-accessibility-self-test",
    workDir: dir,
    runCommand: `"${process.execPath}" server.js`,
    targetUrl,
    env: { PORT: port },
  };

  const passReport = await runTestAgent({
    id: `browser-accessibility-pass-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent can prove accessible names, descriptions, and ARIA snapshots.",
    acceptanceCriteria: ["Profile save controls expose accessible names and descriptions."],
    requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
    projects: [{
      ...baseProject,
      browserChecks: [{
        name: "Profile form accessibility is exposed",
        url: targetUrl,
        actions: [
          { type: "goto", url: targetUrl },
          { type: "click", role: "button", name: "Save profile changes", exact: true },
        ],
        assertions: [
          { assertion: "accessible_name_equals", role: "button", name: "Save profile changes", value: "Save profile changes", exact: true } as any,
          { assertion: "accessible_description_includes", role: "button", name: "Save profile changes", value: "announces completion", exact: true } as any,
          { assertion: "accessible_name_includes", selector: "#email", value: "Email address" } as any,
          { assertion: "accessible_description_equals", selector: "#email", description: "We will send updates to this address." } as any,
          { assertion: "aria_snapshot_includes", role: "button", name: "Save profile changes", text: "Save profile changes", exact: true } as any,
          { type: "text", text: "Saved for accessibility" },
          { type: "consoleNoErrors" },
          { type: "networkNoErrors" },
        ],
        screenshot: true,
      }],
    }],
    options: {
      artifactDir: passArtifactDir,
      browserProvider: "playwright",
      collectBrowserArtifacts: false,
    },
  }, { browserProvider: "playwright" });

  const failReport = await runTestAgent({
    id: `browser-accessibility-fail-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent fails when accessible name expectations are wrong.",
    acceptanceCriteria: ["The save button should be named Delete profile."],
    requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
    projects: [{
      ...baseProject,
      browserChecks: [{
        name: "Wrong accessible name is reported",
        url: targetUrl,
        actions: [
          { type: "goto", url: targetUrl },
        ],
        assertions: [
          { type: "accessibleNameEquals", role: "button", name: "Save profile changes", value: "Delete profile", timeoutMs: 800, exact: true },
          { type: "consoleNoErrors" },
          { type: "networkNoErrors" },
        ],
        screenshot: true,
      }],
    }],
    options: {
      artifactDir: failArtifactDir,
      browserProvider: "playwright",
      collectBrowserArtifacts: false,
    },
  }, { browserProvider: "playwright" });

  const calls: any[] = [];
  const executor = createStaticBrowserToolExecutor({
    tools: [
      "mcp__playwright__browser_navigate",
      "mcp__playwright__browser_snapshot",
      "mcp__playwright__browser_console_messages",
      "mcp__playwright__browser_network_requests",
    ],
    onCall: (toolName, input) => {
      calls.push({ toolName, input });
      if (toolName.endsWith("browser_snapshot")) return "- button \"Save profile changes\"\n- textbox \"Email address\"";
      if (toolName.endsWith("browser_console_messages")) return [];
      if (toolName.endsWith("browser_network_requests")) return [];
      return { ok: true };
    },
  });
  const mcpReport = await runTestAgent({
    id: `browser-accessibility-mcp-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent MCP accessibility behavior is explicit.",
    acceptanceCriteria: ["MCP can best-effort assert ARIA snapshots but not precise accessible names."],
    requiredChecks: ["browser_e2e"],
    projects: [{
      name: "browser-accessibility-mcp-self-test",
      workDir: process.cwd(),
      browserChecks: [{
        name: "MCP accessibility support boundary",
        url: "http://example.test/accessibility",
        actions: [{ type: "goto", url: "http://example.test/accessibility" }],
        assertions: [
          { type: "ariaSnapshotIncludes", text: "Save profile changes" },
          { type: "accessibleNameEquals", role: "button", name: "Save profile changes", value: "Save profile changes" },
        ],
        screenshot: false,
      }],
    }],
    options: {
      artifactDir: mcpArtifactDir,
      browserProvider: "mcp",
    },
  }, { browserProvider: "mcp", browserToolExecutor: executor });

  const passBrowser = passReport.browserResults[0];
  const failBrowser = failReport.browserResults[0];
  const mcpBrowser = mcpReport.browserResults[0];
  const nameStep = passBrowser?.steps.find(step => step.name === "assert:accessibleNameEquals");
  const nameIncludesStep = passBrowser?.steps.find(step => step.name === "assert:accessibleNameIncludes");
  const descriptionEqualsStep = passBrowser?.steps.find(step => step.name === "assert:accessibleDescriptionEquals");
  const descriptionIncludesStep = passBrowser?.steps.find(step => step.name === "assert:accessibleDescriptionIncludes");
  const snapshotStep = passBrowser?.steps.find(step => step.name === "assert:ariaSnapshotIncludes");
  const failNameStep = failBrowser?.steps.find(step => step.name === "assert:accessibleNameEquals");
  const mcpSnapshotStep = mcpBrowser?.steps.find(step => step.name === "playwright:ariaSnapshotIncludes");
  const mcpNameStep = mcpBrowser?.steps.find(step => step.name === "playwright:accessibleNameEquals");
  const pass = passReport.status === "passed"
    && passBrowser?.provider === "playwright"
    && passBrowser?.status === "passed"
    && nameStep?.status === "passed"
    && String(nameStep?.detail || "").includes("accessible name")
    && nameIncludesStep?.status === "passed"
    && descriptionEqualsStep?.status === "passed"
    && String(descriptionEqualsStep?.detail || "").includes("accessible description")
    && descriptionIncludesStep?.status === "passed"
    && snapshotStep?.status === "passed"
    && String(snapshotStep?.detail || "").includes("aria snapshot")
    && passBrowser?.pageTextPreview?.includes("Saved for accessibility")
    && passReport.requiredCheckCoverage.some(item => item.check === "browser_e2e" && item.status === "verified")
    && failReport.status === "failed"
    && failBrowser?.provider === "playwright"
    && failBrowser?.status === "failed"
    && failNameStep?.status === "failed"
    && String(failNameStep?.error || "").includes("actual length")
    && !String(failNameStep?.error || "").includes("Delete profile")
    && failReport.requiredCheckCoverage.some(item => item.check === "browser_e2e" && item.status === "not_verified")
    && mcpReport.status === "failed"
    && mcpBrowser?.provider === "mcp"
    && mcpBrowser?.status === "failed"
    && mcpSnapshotStep?.status === "passed"
    && mcpNameStep?.status === "failed"
    && String(mcpNameStep?.error || "").includes("cannot compute precise accessible name")
    && calls.some(call => call.toolName.endsWith("browser_snapshot"));

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    availability,
    passReport,
    failReport,
    mcpReport,
  };
}

export async function runTestAgentBrowserAccessibilitySnapshotArtifactSelfTest() {
  const availability = await checkPlaywrightAvailability();
  if (!availability.available) {
    return {
      pass: false,
      availability,
      reason: availability.reason,
    };
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-browser-a11y-snapshot-selftest-"));
  const artifactDir = path.join(dir, "artifacts");
  const port = await getFreePort();
  const targetUrl = `http://127.0.0.1:${port}/profile`;
  fs.writeFileSync(path.join(dir, "server.js"), [
    "const http = require('http');",
    "const html = `<!doctype html>",
    "<html><head><title>Accessibility Snapshot Fixture</title><link rel=\"icon\" href=\"data:,\"></head>",
    "<body><main aria-label=\"Profile settings\">",
    "<h1>Profile settings</h1>",
    "<p id=\"save-help\">Saves profile changes and announces completion.</p>",
    "<label for=\"email\">Email address</label>",
    "<input id=\"email\" aria-describedby=\"email-help\" value=\"user@example.test\" />",
    "<p id=\"email-help\">We will send updates to this address.</p>",
    "<button id=\"save\" type=\"button\" aria-describedby=\"save-help\">Save profile changes</button>",
    "<p id=\"status\" role=\"status\">Ready</p>",
    "<script>",
    "document.getElementById('save').addEventListener('click', () => {",
    "  document.getElementById('status').textContent = 'Saved for snapshot evidence';",
    "});",
    "</script>",
    "</main></body></html>`;",
    "http.createServer((req, res) => { res.writeHead(200, {'content-type':'text/html'}); res.end(html); }).listen(process.env.PORT);",
  ].join("\n"), "utf-8");

  const report = await runTestAgent({
    id: `browser-a11y-snapshot-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent records accessibility tree evidence from a real browser.",
    acceptanceCriteria: ["Profile controls expose accessible names in the saved snapshot artifact."],
    requiredChecks: ["browser_e2e", "browser_accessibility_snapshot", "console_errors"],
    projects: [{
      name: "browser-a11y-snapshot-self-test",
      workDir: dir,
      runCommand: `"${process.execPath}" server.js`,
      targetUrl,
      env: { PORT: port },
      browserChecks: [{
        name: "Profile accessibility snapshot evidence",
        url: targetUrl,
        actions: [
          { type: "goto", url: targetUrl },
          { type: "click", role: "button", name: "Save profile changes", exact: true },
        ],
        assertions: [
          { type: "accessibleNameEquals", role: "button", name: "Save profile changes", value: "Save profile changes", exact: true },
          { type: "text", text: "Saved for snapshot evidence" },
          { type: "consoleNoErrors" },
          { type: "networkNoErrors" },
        ],
        screenshot: false,
      }],
    }],
    options: {
      artifactDir,
      browserProvider: "playwright",
      collectBrowserArtifacts: false,
    },
  }, { browserProvider: "playwright" });

  const browser = report.browserResults[0];
  const accessibilityArtifact = (browser?.browserArtifacts || []).find(item => item.type === "accessibility_snapshot");
  const accessibilityText = accessibilityArtifact?.path && fs.existsSync(accessibilityArtifact.path)
    ? fs.readFileSync(accessibilityArtifact.path, "utf-8")
    : "";
  const manifestPath = String((report.metadata.artifactFiles as any)?.manifestPath || "");
  const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, "utf-8")) : null;
  const verification = manifestPath ? verifyTestAgentArtifactManifestFile(manifestPath) : null;
  const manifestTypes = new Set<string>((manifest?.files || []).map((item: any) => String(item.type)));
  const a11yMetadata = verification?.items.find(item => item.type === "browser_accessibility_snapshot_text");
  const byCheck = new Map(report.requiredCheckCoverage.map(item => [item.check, item]));
  const reportValidation = validateTestAgentReportContract(report);
  const pass = report.status === "passed"
    && browser?.provider === "playwright"
    && browser?.status === "passed"
    && accessibilityArtifact?.path?.endsWith(".aria.txt")
    && fs.existsSync(accessibilityArtifact.path)
    && accessibilityArtifact.source?.includes("playwright")
    && accessibilityText.includes("Accessibility Snapshot")
    && accessibilityText.includes("Save profile changes")
    && /-\s+button/i.test(accessibilityText)
    && manifestTypes.has("browser_accessibility_snapshot")
    && manifest?.summary?.browserAccessibilitySnapshots === 1
    && byCheck.get("browser_accessibility_snapshot")?.status === "verified"
    && verification?.status === "passed"
    && a11yMetadata?.status === "passed"
    && a11yMetadata?.artifactFormat === "text:accessibility-snapshot"
    && Number(a11yMetadata?.artifactEntries || 0) >= 1
    && reportValidation.valid;

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    availability,
    report,
    manifest,
    verification,
    accessibilityArtifact,
    accessibilityPreview: accessibilityText.slice(0, 1000),
    reportValidation,
  };
}

export async function runTestAgentBrowserAriaStateAssertionSelfTest() {
  const availability = await checkPlaywrightAvailability();
  if (!availability.available) {
    return {
      pass: false,
      availability,
      reason: availability.reason,
    };
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-browser-aria-state-selftest-"));
  const passArtifactDir = path.join(dir, "pass-artifacts");
  const failArtifactDir = path.join(dir, "fail-artifacts");
  const mcpArtifactDir = path.join(dir, "mcp-artifacts");
  const port = await getFreePort();
  const targetUrl = `http://127.0.0.1:${port}/aria-state`;
  fs.writeFileSync(path.join(dir, "server.js"), [
    "const http = require('http');",
    "const html = `<!doctype html>",
    "<html><head><title>ARIA State Fixture</title><link rel=\"icon\" href=\"data:,\"></head>",
    "<body><main>",
    "<h1>ARIA state controls</h1>",
    "<button id=\"menu\" type=\"button\" aria-expanded=\"false\">Menu</button>",
    "<button id=\"bold\" type=\"button\" aria-pressed=\"false\">Bold</button>",
    "<div role=\"listbox\" aria-label=\"Density\"><div id=\"compact\" role=\"option\" aria-selected=\"false\" tabindex=\"0\">Compact</div></div>",
    "<label for=\"email\">Email</label><input id=\"email\" aria-invalid=\"true\" aria-required=\"true\" />",
    "<label for=\"phone\">Phone</label><input id=\"phone\" />",
    "<p id=\"status\" role=\"status\">Ready</p>",
    "<script>",
    "document.getElementById('menu').addEventListener('click', () => { document.getElementById('menu').setAttribute('aria-expanded', 'true'); });",
    "document.getElementById('bold').addEventListener('click', () => { document.getElementById('bold').setAttribute('aria-pressed', 'true'); });",
    "document.getElementById('compact').addEventListener('click', () => { document.getElementById('compact').setAttribute('aria-selected', 'true'); document.getElementById('status').textContent = 'ARIA state updated'; });",
    "</script>",
    "</main></body></html>`;",
    "http.createServer((req, res) => { res.writeHead(200, {'content-type':'text/html'}); res.end(html); }).listen(process.env.PORT);",
  ].join("\n"), "utf-8");

  const baseProject = {
    name: "browser-aria-state-self-test",
    workDir: dir,
    runCommand: `"${process.execPath}" server.js`,
    targetUrl,
    env: { PORT: port },
  };

  const passReport = await runTestAgent({
    id: `browser-aria-state-pass-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent can prove ARIA state changes in a real browser.",
    acceptanceCriteria: ["Menu, toggle button, option, and form ARIA states are correct."],
    requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
    projects: [{
      ...baseProject,
      browserChecks: [{
        name: "ARIA states update after interaction",
        url: targetUrl,
        actions: [
          { type: "goto", url: targetUrl },
          { type: "click", role: "button", name: "Menu", exact: true },
          { type: "click", role: "button", name: "Bold", exact: true },
          { type: "click", selector: "#compact" },
        ],
        assertions: [
          { assertion: "aria_expanded", role: "button", name: "Menu", exact: true } as any,
          { assertion: "aria_pressed", role: "button", name: "Bold", exact: true } as any,
          { assertion: "aria_selected", selector: "#compact" } as any,
          { assertion: "aria_invalid", selector: "#email" } as any,
          { assertion: "aria_required", selector: "#email" } as any,
          { assertion: "aria_valid", selector: "#phone" } as any,
          { assertion: "aria_not_required", selector: "#phone" } as any,
          { type: "text", text: "ARIA state updated" },
          { type: "consoleNoErrors" },
          { type: "networkNoErrors" },
        ],
        screenshot: true,
      }],
    }],
    options: {
      artifactDir: passArtifactDir,
      browserProvider: "playwright",
      collectBrowserArtifacts: false,
    },
  }, { browserProvider: "playwright" });

  const failReport = await runTestAgent({
    id: `browser-aria-state-fail-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent fails when ARIA state expectations are wrong.",
    acceptanceCriteria: ["The menu should already be expanded."],
    requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
    projects: [{
      ...baseProject,
      browserChecks: [{
        name: "Wrong ARIA expanded state is reported",
        url: targetUrl,
        actions: [
          { type: "goto", url: targetUrl },
        ],
        assertions: [
          { type: "ariaExpanded", role: "button", name: "Menu", timeoutMs: 800, exact: true },
          { type: "consoleNoErrors" },
          { type: "networkNoErrors" },
        ],
        screenshot: true,
      }],
    }],
    options: {
      artifactDir: failArtifactDir,
      browserProvider: "playwright",
      collectBrowserArtifacts: false,
    },
  }, { browserProvider: "playwright" });

  const calls: any[] = [];
  const executor = createStaticBrowserToolExecutor({
    tools: [
      "mcp__playwright__browser_navigate",
      "mcp__playwright__browser_snapshot",
      "mcp__playwright__browser_console_messages",
      "mcp__playwright__browser_network_requests",
    ],
    onCall: (toolName, input) => {
      calls.push({ toolName, input });
      if (toolName.endsWith("browser_snapshot")) return "- button \"Menu\"\n- button \"Bold\"\n- option \"Compact\"";
      if (toolName.endsWith("browser_console_messages")) return [];
      if (toolName.endsWith("browser_network_requests")) return [];
      return { ok: true };
    },
  });
  const mcpReport = await runTestAgent({
    id: `browser-aria-state-mcp-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent MCP ARIA state boundary is explicit.",
    acceptanceCriteria: ["MCP cannot claim precise ARIA state without DOM attributes."],
    requiredChecks: ["browser_e2e"],
    projects: [{
      name: "browser-aria-state-mcp-self-test",
      workDir: process.cwd(),
      browserChecks: [{
        name: "MCP ARIA state support boundary",
        url: "http://example.test/aria-state",
        actions: [{ type: "goto", url: "http://example.test/aria-state" }],
        assertions: [
          { type: "ariaExpanded", role: "button", name: "Menu" },
        ],
        screenshot: false,
      }],
    }],
    options: {
      artifactDir: mcpArtifactDir,
      browserProvider: "mcp",
    },
  }, { browserProvider: "mcp", browserToolExecutor: executor });

  const passBrowser = passReport.browserResults[0];
  const failBrowser = failReport.browserResults[0];
  const mcpBrowser = mcpReport.browserResults[0];
  const expandedStep = passBrowser?.steps.find(step => step.name === "assert:ariaExpanded");
  const pressedStep = passBrowser?.steps.find(step => step.name === "assert:ariaPressed");
  const selectedStep = passBrowser?.steps.find(step => step.name === "assert:ariaSelected");
  const invalidStep = passBrowser?.steps.find(step => step.name === "assert:ariaInvalid");
  const requiredStep = passBrowser?.steps.find(step => step.name === "assert:ariaRequired");
  const validStep = passBrowser?.steps.find(step => step.name === "assert:ariaValid");
  const notRequiredStep = passBrowser?.steps.find(step => step.name === "assert:ariaNotRequired");
  const failExpandedStep = failBrowser?.steps.find(step => step.name === "assert:ariaExpanded");
  const mcpExpandedStep = mcpBrowser?.steps.find(step => step.name === "playwright:ariaExpanded");
  const pass = passReport.status === "passed"
    && passBrowser?.provider === "playwright"
    && passBrowser?.status === "passed"
    && expandedStep?.status === "passed"
    && String(expandedStep?.detail || "").includes("aria-expanded=true")
    && pressedStep?.status === "passed"
    && selectedStep?.status === "passed"
    && invalidStep?.status === "passed"
    && requiredStep?.status === "passed"
    && validStep?.status === "passed"
    && notRequiredStep?.status === "passed"
    && passBrowser?.pageTextPreview?.includes("ARIA state updated")
    && passReport.requiredCheckCoverage.some(item => item.check === "browser_e2e" && item.status === "verified")
    && failReport.status === "failed"
    && failBrowser?.provider === "playwright"
    && failBrowser?.status === "failed"
    && failExpandedStep?.status === "failed"
    && String(failExpandedStep?.error || "").includes("actual aria-expanded=false")
    && failReport.requiredCheckCoverage.some(item => item.check === "browser_e2e" && item.status === "not_verified")
    && mcpReport.status === "failed"
    && mcpBrowser?.provider === "mcp"
    && mcpBrowser?.status === "failed"
    && mcpExpandedStep?.status === "failed"
    && String(mcpExpandedStep?.error || "").includes("ARIA DOM state")
    && calls.some(call => call.toolName.endsWith("browser_snapshot"));

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    availability,
    passReport,
    failReport,
    mcpReport,
  };
}

export async function runTestAgentBrowserNetworkAssertionSelfTest() {
  const availability = await checkPlaywrightAvailability();
  if (!availability.available) {
    return {
      pass: false,
      availability,
      reason: availability.reason,
    };
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-browser-network-assertion-selftest-"));
  const artifactDir = path.join(dir, "artifacts");
  const port = await getFreePort();
  const targetUrl = `http://127.0.0.1:${port}/tasks`;
  const apiUrl = `http://127.0.0.1:${port}/api/tasks`;
  fs.writeFileSync(path.join(dir, "server.js"), [
    "const http = require('http');",
    "const html = `<!doctype html>",
    "<html><head><title>Network Fixture</title></head>",
    "<body>",
    "<main>",
    "<h1>Tasks</h1>",
    "<button type=\"button\" id=\"save\">Save task</button>",
    "<p id=\"status\" role=\"status\">Idle</p>",
    "</main>",
    "<script>",
    "document.getElementById('save').addEventListener('click', async () => {",
    "  const response = await fetch('/api/tasks', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title: 'Buy milk' }) });",
    "  const data = await response.json();",
    "  document.getElementById('status').textContent = data.ok ? 'Saved via API' : 'Save failed';",
    "});",
    "</script>",
    "</body></html>`;",
    "http.createServer((req, res) => {",
    "  if (req.url === '/api/tasks' && req.method === 'POST') {",
    "    let body = '';",
    "    req.on('data', chunk => { body += chunk; });",
    "    req.on('end', () => { res.writeHead(201, {'content-type':'application/json'}); res.end(JSON.stringify({ ok: true, received: body })); });",
    "    return;",
    "  }",
    "  res.writeHead(200, {'content-type':'text/html'});",
    "  res.end(html);",
    "}).listen(process.env.PORT);",
  ].join("\n"), "utf-8");

  const report = await runTestAgent({
    id: `browser-network-assertion-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent can assert browser network API evidence.",
    acceptanceCriteria: ["Saving a task calls the API and shows Saved via API."],
    requiredChecks: ["browser_e2e", "browser_network_logs", "screenshots", "console_errors"],
    projects: [{
      name: "browser-network-assertion-self-test",
      workDir: dir,
      runCommand: `"${process.execPath}" server.js`,
      targetUrl,
      env: { PORT: port },
      browserChecks: [{
        name: "Save task API call is observed",
        url: targetUrl,
        actions: [
          { type: "goto", url: targetUrl },
          { type: "click", role: "button", name: "Save task", exact: true },
        ],
        assertions: [
          { type: "text", text: "Saved via API" },
          { type: "networkRequestIncludes", text: `POST ${apiUrl}` },
          { type: "networkResponseIncludes", text: `201 fetch ${apiUrl}` },
          { type: "consoleNoErrors" },
          { type: "networkNoErrors" },
        ],
        screenshot: true,
      }],
    }],
    options: {
      artifactDir,
      browserProvider: "playwright",
      collectBrowserArtifacts: false,
    },
  }, { browserProvider: "playwright" });

  const browser = report.browserResults[0];
  const networkLogPath = String(browser?.networkLogPath || "");
  const networkLog = fs.existsSync(networkLogPath) ? fs.readFileSync(networkLogPath, "utf-8") : "";
  const interaction = report.browserInteractionSummary?.[0];
  const pass = report.status === "passed"
    && report.browserResults.length === 1
    && browser?.provider === "playwright"
    && browser?.status === "passed"
    && browser?.finalUrl === targetUrl
    && browser?.pageTextPreview?.includes("Saved via API")
    && browser?.steps.some(step => step.name === "assert:networkRequestIncludes" && step.status === "passed" && String(step.detail || "").includes(`POST ${apiUrl}`))
    && browser?.steps.some(step => step.name === "assert:networkResponseIncludes" && step.status === "passed" && String(step.detail || "").includes(`201 fetch ${apiUrl}`))
    && browser?.networkRequests?.some(item => item.includes(`request POST ${apiUrl}`))
    && browser?.networkRequests?.some(item => item.includes(`response 201 fetch ${apiUrl}`))
    && networkLog.includes(`request POST ${apiUrl}`)
    && networkLog.includes(`response 201 fetch ${apiUrl}`)
    && interaction?.assertionTypes?.networkRequestIncludes === 1
    && interaction?.assertionTypes?.networkResponseIncludes === 1
    && report.requiredCheckCoverage.some(item => item.check === "browser_network_logs" && item.status === "verified")
    && report.acceptanceCoverage.every(item => item.status === "verified");

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    report,
    availability,
    networkLog,
  };
}

export async function runTestAgentStructuredBrowserNetworkAssertionSelfTest() {
  const availability = await checkPlaywrightAvailability();
  if (!availability.available) {
    return {
      pass: false,
      availability,
      reason: availability.reason,
    };
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-structured-network-assertion-selftest-"));
  const artifactDir = path.join(dir, "artifacts");
  const port = await getFreePort();
  const targetUrl = `http://127.0.0.1:${port}/tasks`;
  const apiUrl = `http://127.0.0.1:${port}/api/tasks`;
  fs.writeFileSync(path.join(dir, "server.js"), [
    "const http = require('http');",
    "const html = `<!doctype html>",
    "<html><head><title>Structured Network Fixture</title></head>",
    "<body>",
    "<main>",
    "<h1>Tasks</h1>",
    "<button type=\"button\" id=\"save\">Save task</button>",
    "<p id=\"status\" role=\"status\">Idle</p>",
    "</main>",
    "<script>",
    "document.getElementById('save').addEventListener('click', async () => {",
    "  const response = await fetch('/api/tasks', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title: 'Buy milk' }) });",
    "  const data = await response.json();",
    "  document.getElementById('status').textContent = data.ok ? 'Saved with structured network evidence' : 'Save failed';",
    "});",
    "</script>",
    "</body></html>`;",
    "http.createServer((req, res) => {",
    "  if (req.url === '/api/tasks' && req.method === 'POST') {",
    "    let body = '';",
    "    req.on('data', chunk => { body += chunk; });",
    "    req.on('end', () => { res.writeHead(201, {'content-type':'application/json'}); res.end(JSON.stringify({ ok: true, received: body })); });",
    "    return;",
    "  }",
    "  res.writeHead(200, {'content-type':'text/html'});",
    "  res.end(html);",
    "}).listen(process.env.PORT);",
  ].join("\n"), "utf-8");

  const report = await runTestAgent({
    id: `structured-browser-network-assertion-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent can assert structured browser network API evidence.",
    acceptanceCriteria: ["Saving a task sends a POST request to /api/tasks and receives a 201 API response."],
    requiredChecks: ["browser_e2e", "browser_network_logs", "screenshots", "console_errors"],
    projects: [{
      name: "structured-browser-network-assertion-self-test",
      workDir: dir,
      runCommand: `"${process.execPath}" server.js`,
      targetUrl,
      env: { PORT: port },
      browserChecks: [{
        name: "Structured API call evidence is observed",
        url: targetUrl,
        actions: [
          { type: "goto", url: targetUrl },
          { type: "click", role: "button", name: "Save task", exact: true },
        ],
        assertions: [
          { type: "text", text: "Saved with structured network evidence" },
          { type: "networkRequest", method: "post", url_includes: "/api/tasks" },
          { type: "networkResponse", status_code: 201, resource_type: "fetch", url_includes: "/api/tasks" },
          { type: "consoleNoErrors" },
          { type: "networkNoErrors" },
        ],
        screenshot: true,
      }],
    }],
    options: {
      artifactDir,
      browserProvider: "playwright",
      collectBrowserArtifacts: false,
    },
  }, { browserProvider: "playwright" });

  const browser = report.browserResults[0];
  const networkLogPath = String(browser?.networkLogPath || "");
  const networkLog = fs.existsSync(networkLogPath) ? fs.readFileSync(networkLogPath, "utf-8") : "";
  const interaction = report.browserInteractionSummary?.[0];
  const requestStep = browser?.steps.find(step => step.name === "assert:networkRequest");
  const responseStep = browser?.steps.find(step => step.name === "assert:networkResponse");
  const pass = report.status === "passed"
    && report.browserResults.length === 1
    && browser?.provider === "playwright"
    && browser?.status === "passed"
    && browser?.finalUrl === targetUrl
    && browser?.pageTextPreview?.includes("Saved with structured network evidence")
    && requestStep?.status === "passed"
    && String(requestStep?.detail || "").includes("method=POST")
    && String(requestStep?.detail || "").includes("urlIncludes=/api/tasks")
    && responseStep?.status === "passed"
    && String(responseStep?.detail || "").includes("status=201")
    && String(responseStep?.detail || "").includes("resourceType=fetch")
    && browser?.networkRequests?.some(item => item.includes(`request POST ${apiUrl}`))
    && browser?.networkRequests?.some(item => item.includes(`response 201 fetch ${apiUrl}`))
    && networkLog.includes(`request POST ${apiUrl}`)
    && networkLog.includes(`response 201 fetch ${apiUrl}`)
    && interaction?.assertionTypes?.networkRequest === 1
    && interaction?.assertionTypes?.networkResponse === 1
    && report.requiredCheckCoverage.some(item => item.check === "browser_network_logs" && item.status === "verified")
    && report.acceptanceCoverage.every(item => item.status === "verified");

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    report,
    availability,
    networkLog,
  };
}

