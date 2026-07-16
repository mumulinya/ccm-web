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
} from "./self-test-policy";

import { verifyTestAgentArtifactManifestFile } from "./artifact-verifier";

import { ACCEPTANCE_CLIPBOARD_FLOW_PROBE_TYPE, buildAcceptanceClipboardFlowBrowserChecks } from "./browser/acceptance-clipboard-flows";

import { ACCEPTANCE_CLICK_FLOW_PROBE_TYPE, buildAcceptanceClickFlowBrowserChecks } from "./browser/acceptance-click-flows";

import { buildAcceptanceDerivedBrowserAssertions } from "./browser/acceptance-derived-checks";

import { ACCEPTANCE_DIALOG_FLOW_PROBE_TYPE, buildAcceptanceDialogFlowBrowserChecks } from "./browser/acceptance-dialog-flows";

import { ACCEPTANCE_DRAG_FLOW_PROBE_TYPE, buildAcceptanceDragFlowBrowserChecks } from "./browser/acceptance-drag-flows";

import { ACCEPTANCE_DOWNLOAD_FLOW_PROBE_TYPE, buildAcceptanceDownloadFlowBrowserChecks } from "./browser/acceptance-download-flows";

import { ACCEPTANCE_FORM_FLOW_PROBE_TYPE, buildAcceptanceFormFlowBrowserChecks } from "./browser/acceptance-form-flows";

import { ACCEPTANCE_HISTORY_FLOW_PROBE_TYPE, buildAcceptanceHistoryFlowBrowserChecks } from "./browser/acceptance-history-flows";

import { ACCEPTANCE_HOVER_FLOW_PROBE_TYPE, buildAcceptanceHoverFlowBrowserChecks } from "./browser/acceptance-hover-flows";

import { ACCEPTANCE_KEYBOARD_FLOW_PROBE_TYPE, buildAcceptanceKeyboardFlowBrowserChecks } from "./browser/acceptance-keyboard-flows";

import { ACCEPTANCE_NETWORK_STATE_FLOW_PROBE_TYPE, buildAcceptanceNetworkStateFlowBrowserChecks } from "./browser/acceptance-network-state-flows";

import { MULTI_SESSION_BROWSER_PROBE_TYPE } from "./browser/multi-session";

import { ACCEPTANCE_POPUP_FLOW_PROBE_TYPE, buildAcceptancePopupFlowBrowserChecks } from "./browser/acceptance-popup-flows";

import { runBrowserSessionComparison } from "./browser/session-comparison";

import { ACCEPTANCE_REPEATED_CLICK_PROBE_TYPE, buildAcceptanceRepeatedClickBrowserChecks } from "./browser/acceptance-repeated-click-checks";

import { ACCEPTANCE_RESPONSIVE_PROBE_TYPE, buildAcceptanceResponsiveBrowserChecks } from "./browser/acceptance-responsive-checks";

import { ACCEPTANCE_SCROLL_FLOW_PROBE_TYPE, buildAcceptanceScrollFlowBrowserChecks } from "./browser/acceptance-scroll-flows";

import { buildBrowserStabilitySummary } from "./browser/stability-summary";

import { ACCEPTANCE_UPLOAD_FLOW_PROBE_TYPE, buildAcceptanceUploadFlowBrowserChecks } from "./browser/acceptance-upload-flows";

import { AUTO_BROWSER_SMOKE_PROBE_TYPE, buildAcceptancePathBrowserSmokeChecks, buildAutoBrowserSmokeCheck, buildBrowserChecksForProject } from "./browser/auto-checks";

import { checkPlaywrightAvailability } from "./browser/playwright-provider";

import { buildSemanticLocatorPlan } from "./browser/semantic-locator";

import { createStaticBrowserToolExecutor } from "./browser/tool-executor";

import { formatTestAgentCliArtifactVerificationSummary, formatTestAgentCliExecutionPlanSummary, formatTestAgentCliReportSummary, formatTestAgentCliValidationSummary, runTestAgentCli } from "./cli";

import { cliOverrides, parseTestAgentCliArgs } from "./cli-options";

import { TEST_AGENT_MINIMAL_HANDOFF_EXAMPLE, TEST_AGENT_WEB_APP_HANDOFF_EXAMPLE, TEST_AGENT_WEB_APP_WORK_ORDER_EXAMPLE, validateTestAgentHandoffContract, validateTestAgentReportContract, validateTestAgentVerdictContract, validateTestAgentWorkOrderContract } from "./contract";

import { buildAcceptanceCoverage } from "./coverage";

import { buildAcceptanceSummary } from "./acceptance-summary";

import { buildTestAgentExecutionPlan } from "./execution-plan";

import { buildTestAgentMarkdownReport } from "./artifacts";

import { buildTestAgentReport } from "./result-builder";

import { buildRequiredCheckCoverage } from "./required-checks";

import { discoverTestAgentSelfTests, formatTestAgentSelfTestMatrixSummary, runTestAgentSelfTestMatrix } from "./self-test-matrix";

import { buildTestAgentVerdict } from "./verdict";

import { buildTestAgentWorkOrderFromHandoff } from "./work-order-builder";

import {
  buildEmptyZip,
  buildStoredZip,
  getFreePort,
  refreshManifestItemIntegrity,
  writeSolidRgbaPng,
  writeTaskBoardFixtureServer,
} from "./self-test";

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

export async function runTestAgentNegativeBrowserNetworkAssertionSelfTest() {
  const availability = await checkPlaywrightAvailability();
  if (!availability.available) {
    return {
      pass: false,
      availability,
      reason: availability.reason,
    };
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-negative-network-assertion-selftest-"));
  const artifactDir = path.join(dir, "artifacts");
  const port = await getFreePort();
  const targetUrl = `http://127.0.0.1:${port}/tasks`;
  const apiUrl = `http://127.0.0.1:${port}/api/tasks`;
  const debugUrl = `http://127.0.0.1:${port}/api/debug`;
  fs.writeFileSync(path.join(dir, "server.js"), [
    "const http = require('http');",
    "const html = `<!doctype html>",
    "<html><head><title>Negative Network Fixture</title></head>",
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
    "  document.getElementById('status').textContent = data.ok ? 'Saved without debug call' : 'Save failed';",
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
    "  if (req.url === '/api/debug') {",
    "    res.writeHead(500, {'content-type':'application/json'});",
    "    res.end(JSON.stringify({ ok: false, debug: true }));",
    "    return;",
    "  }",
    "  res.writeHead(200, {'content-type':'text/html'});",
    "  res.end(html);",
    "}).listen(process.env.PORT);",
  ].join("\n"), "utf-8");

  const report = await runTestAgent({
    id: `negative-browser-network-assertion-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent can prove unwanted browser network calls did not happen.",
    acceptanceCriteria: ["Saving a task calls /api/tasks and does not call /api/debug."],
    requiredChecks: ["browser_e2e", "browser_network_logs", "screenshots", "console_errors"],
    projects: [{
      name: "negative-browser-network-assertion-self-test",
      workDir: dir,
      runCommand: `"${process.execPath}" server.js`,
      targetUrl,
      env: { PORT: port },
      browserChecks: [{
        name: "Debug API is not called",
        url: targetUrl,
        actions: [
          { type: "goto", url: targetUrl },
          { type: "click", role: "button", name: "Save task", exact: true },
        ],
        assertions: [
          { type: "text", text: "Saved without debug call" },
          { type: "networkRequest", method: "POST", urlIncludes: "/api/tasks" },
          { type: "networkResponse", status: 201, resourceType: "fetch", urlIncludes: "/api/tasks" },
          { type: "networkRequestNot", method: "POST", url_includes: "/api/debug", settle_ms: 250 },
          { type: "networkResponseNot", status_code: 500, resource_type: "fetch", url_includes: "/api/debug", settle_ms: 250 },
          { type: "networkRequestNotIncludes", text: `POST ${debugUrl}`, settle_ms: 250 },
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
    && browser?.pageTextPreview?.includes("Saved without debug call")
    && browser?.steps.some(step => step.name === "assert:networkRequest" && step.status === "passed" && String(step.detail || "").includes("urlIncludes=/api/tasks"))
    && browser?.steps.some(step => step.name === "assert:networkResponse" && step.status === "passed" && String(step.detail || "").includes("status=201"))
    && browser?.steps.some(step => step.name === "assert:networkRequestNot" && step.status === "passed" && String(step.detail || "").includes("urlIncludes=/api/debug"))
    && browser?.steps.some(step => step.name === "assert:networkResponseNot" && step.status === "passed" && String(step.detail || "").includes("status=500"))
    && browser?.steps.some(step => step.name === "assert:networkRequestNotIncludes" && step.status === "passed" && String(step.detail || "").includes(`POST ${debugUrl}`))
    && browser?.networkRequests?.some(item => item.includes(`request POST ${apiUrl}`))
    && browser?.networkRequests?.some(item => item.includes(`response 201 fetch ${apiUrl}`))
    && !browser?.networkRequests?.some(item => item.includes(debugUrl))
    && networkLog.includes(`request POST ${apiUrl}`)
    && !networkLog.includes(debugUrl)
    && interaction?.assertionTypes?.networkRequestNot === 1
    && interaction?.assertionTypes?.networkResponseNot === 1
    && interaction?.assertionTypes?.networkRequestNotIncludes === 1
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

export async function runTestAgentBrowserRequestMetadataAssertionSelfTest() {
  const availability = await checkPlaywrightAvailability();
  if (!availability.available) {
    return {
      pass: false,
      availability,
      reason: availability.reason,
    };
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-request-metadata-assertion-selftest-"));
  const artifactDir = path.join(dir, "artifacts");
  const port = await getFreePort();
  const targetUrl = `http://127.0.0.1:${port}/tasks`;
  const apiUrl = `http://127.0.0.1:${port}/api/tasks`;
  fs.writeFileSync(path.join(dir, "server.js"), [
    "const http = require('http');",
    "const html = `<!doctype html>",
    "<html><head><title>Request Metadata Fixture</title></head>",
    "<body>",
    "<main>",
    "<h1>Tasks</h1>",
    "<button type=\"button\" id=\"save\">Save task</button>",
    "<p id=\"status\" role=\"status\">Idle</p>",
    "</main>",
    "<script>",
    "document.getElementById('save').addEventListener('click', async () => {",
    "  const payload = { title: 'Buy milk', task: { title: 'Buy milk', priority: 2 }, tags: ['home', 'urgent'], clientNonce: 'client-nonce-42' };",
    "  const response = await fetch('/api/tasks', { method: 'POST', headers: { 'content-type': 'application/json', 'x-test-agent': 'metadata-check' }, body: JSON.stringify(payload) });",
    "  const data = await response.json();",
    "  document.getElementById('status').textContent = data.ok ? 'Saved with request metadata' : 'Save failed';",
    "});",
    "</script>",
    "</body></html>`;",
    "http.createServer((req, res) => {",
    "  if (req.url === '/api/tasks' && req.method === 'POST') {",
    "    let body = '';",
    "    req.on('data', chunk => { body += chunk; });",
    "    req.on('end', () => { res.writeHead(201, {'content-type':'application/json'}); res.end(JSON.stringify({ ok: true, saved: { title: 'Buy milk', id: 7 }, received: body, header: req.headers['x-test-agent'] })); });",
    "    return;",
    "  }",
    "  res.writeHead(200, {'content-type':'text/html'});",
    "  res.end(html);",
    "}).listen(process.env.PORT);",
  ].join("\n"), "utf-8");

  const report = await runTestAgent({
    id: `browser-request-metadata-assertion-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent can assert browser request headers and body.",
    acceptanceCriteria: ["Saving a task sends JSON body metadata and does not send a password."],
    requiredChecks: ["browser_e2e", "browser_network_logs", "screenshots", "console_errors"],
    projects: [{
      name: "browser-request-metadata-assertion-self-test",
      workDir: dir,
      runCommand: `"${process.execPath}" server.js`,
      targetUrl,
      env: { PORT: port },
      browserChecks: [{
        name: "Request metadata is observed",
        url: targetUrl,
        actions: [
          { type: "goto", url: targetUrl },
          { type: "click", role: "button", name: "Save task", exact: true },
        ],
        assertions: [
          { type: "text", text: "Saved with request metadata" },
          { type: "networkRequest", method: "POST", urlIncludes: "/api/tasks", headerName: "content-type", headerValueIncludes: "application/json", bodyIncludes: "Buy milk" },
          { type: "networkRequest", method: "POST", urlIncludes: "/api/tasks", headerName: "x-test-agent", headerValueIncludes: "metadata-check", bodyIncludes: "client-nonce-42" },
          { type: "networkRequest", method: "POST", urlIncludes: "/api/tasks", bodyJsonPath: "task.title", bodyJsonEquals: "Buy milk" },
          { type: "networkRequest", method: "POST", urlIncludes: "/api/tasks", body_json_path: "task.priority", body_json_equals: 2 },
          { type: "networkRequest", method: "POST", urlIncludes: "/api/tasks", bodyJsonPath: "tags[1]", bodyJsonIncludes: "urgent" },
          { type: "networkRequestNot", method: "POST", urlIncludes: "/api/tasks", bodyIncludes: "password", settleMs: 250 },
          { type: "networkRequestNot", method: "POST", urlIncludes: "/api/tasks", bodyJsonPath: "password", settleMs: 250 },
          { type: "networkRequestNot", method: "POST", urlIncludes: "/api/tasks", headerName: "authorization", settleMs: 250 },
          { type: "networkResponse", status: 201, resourceType: "fetch", urlIncludes: "/api/tasks" },
          { type: "networkResponse", status: 201, resourceType: "fetch", urlIncludes: "/api/tasks", headerName: "content-type", headerValueIncludes: "application/json", bodyJsonPath: "ok", bodyJsonEquals: true },
          { type: "networkResponse", status: 201, resourceType: "fetch", urlIncludes: "/api/tasks", bodyJsonPath: "saved.title", bodyJsonEquals: "Buy milk" },
          { type: "networkResponse", status: 201, resourceType: "fetch", urlIncludes: "/api/tasks", bodyJsonPath: "saved.id", bodyJsonEquals: 7 },
          { type: "networkResponse", status: 201, resourceType: "fetch", urlIncludes: "/api/tasks", bodyJsonPath: "received", bodyJsonIncludes: "client-nonce-42" },
          { type: "networkResponseNot", status: 201, resourceType: "fetch", urlIncludes: "/api/tasks", bodyJsonPath: "error", settleMs: 250 },
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
  const metadataLine = browser?.networkRequests?.find(item => item.startsWith(`request_details POST ${apiUrl}`)) || "";
  const responseMetadataLine = browser?.networkRequests?.find(item => item.startsWith(`response_details 201 fetch ${apiUrl}`)) || "";
  const pass = report.status === "passed"
    && report.browserResults.length === 1
    && browser?.provider === "playwright"
    && browser?.status === "passed"
    && browser?.finalUrl === targetUrl
    && browser?.pageTextPreview?.includes("Saved with request metadata")
    && browser?.steps.some(step => step.name === "assert:networkRequest" && step.status === "passed" && String(step.detail || "").includes("header=content-type") && String(step.detail || "").includes("bodyIncludes=Buy milk"))
    && browser?.steps.some(step => step.name === "assert:networkRequest" && step.status === "passed" && String(step.detail || "").includes("header=x-test-agent") && String(step.detail || "").includes("client-nonce-42"))
    && browser?.steps.some(step => step.name === "assert:networkRequest" && step.status === "passed" && String(step.detail || "").includes("bodyJsonPath=task.title") && String(step.detail || "").includes('bodyJsonEquals="Buy milk"'))
    && browser?.steps.some(step => step.name === "assert:networkRequest" && step.status === "passed" && String(step.detail || "").includes("bodyJsonPath=task.priority") && String(step.detail || "").includes("bodyJsonEquals=2"))
    && browser?.steps.some(step => step.name === "assert:networkRequest" && step.status === "passed" && String(step.detail || "").includes("bodyJsonPath=tags[1]") && String(step.detail || "").includes("bodyJsonIncludes=urgent"))
    && browser?.steps.some(step => step.name === "assert:networkRequestNot" && step.status === "passed" && String(step.detail || "").includes("bodyIncludes=password"))
    && browser?.steps.some(step => step.name === "assert:networkRequestNot" && step.status === "passed" && String(step.detail || "").includes("bodyJsonPath=password"))
    && browser?.steps.some(step => step.name === "assert:networkRequestNot" && step.status === "passed" && String(step.detail || "").includes("header=authorization"))
    && browser?.steps.some(step => step.name === "assert:networkResponse" && step.status === "passed" && String(step.detail || "").includes("bodyJsonPath=ok") && String(step.detail || "").includes("bodyJsonEquals=true"))
    && browser?.steps.some(step => step.name === "assert:networkResponse" && step.status === "passed" && String(step.detail || "").includes("bodyJsonPath=saved.title"))
    && browser?.steps.some(step => step.name === "assert:networkResponse" && step.status === "passed" && String(step.detail || "").includes("bodyJsonPath=saved.id") && String(step.detail || "").includes("bodyJsonEquals=7"))
    && browser?.steps.some(step => step.name === "assert:networkResponse" && step.status === "passed" && String(step.detail || "").includes("bodyJsonPath=received") && String(step.detail || "").includes("client-nonce-42"))
    && browser?.steps.some(step => step.name === "assert:networkResponseNot" && step.status === "passed" && String(step.detail || "").includes("bodyJsonPath=error"))
    && metadataLine.includes('"content-type":"application/json"')
    && metadataLine.includes('"x-test-agent":"metadata-check"')
    && metadataLine.includes("Buy milk")
    && metadataLine.includes('"priority":2')
    && metadataLine.includes('"urgent"')
    && metadataLine.includes("client-nonce-42")
    && !metadataLine.includes("password")
    && responseMetadataLine.includes('"ok":true')
    && responseMetadataLine.includes('"title":"Buy milk"')
    && responseMetadataLine.includes('"id":7')
    && responseMetadataLine.includes("client-nonce-42")
    && networkLog.includes(`request POST ${apiUrl}`)
    && networkLog.includes(`request_details POST ${apiUrl}`)
    && networkLog.includes(`response_details 201 fetch ${apiUrl}`)
    && interaction?.assertionTypes?.networkRequest === 5
    && interaction?.assertionTypes?.networkRequestNot === 3
    && interaction?.assertionTypes?.networkResponse === 5
    && interaction?.assertionTypes?.networkResponseNot === 1
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

export async function runTestAgentBrowserInteractionSummarySelfTest() {
  const availability = await checkPlaywrightAvailability();
  if (!availability.available) {
    return {
      pass: false,
      availability,
      reason: availability.reason,
    };
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-browser-interaction-summary-selftest-"));
  const artifactDir = path.join(dir, "artifacts");
  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}/`;
  const tasksUrl = `http://127.0.0.1:${port}/tasks`;
  const acceptanceCriteria = ['At /tasks, enter "Buy milk" into "Task", click "Add task", then shows "Buy milk".'];
  writeTaskBoardFixtureServer(dir);

  const report = await runTestAgent({
    id: `browser-interaction-summary-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent records browser interaction summaries for real browser actions.",
    acceptanceCriteria,
    requiredChecks: ["http", "browser_e2e", "screenshots", "browser_snapshots", "console_errors"],
    projects: [{
      name: "browser-interaction-summary-self-test",
      workDir: dir,
      runCommand: `"${process.execPath}" server.js`,
      targetUrl: baseUrl,
      env: { PORT: port },
    }],
    options: {
      artifactDir,
      browserProvider: "playwright",
      collectBrowserArtifacts: false,
    },
  }, { browserProvider: "playwright" });

  const summary = report.browserInteractionSummary[0];
  const markdownPath = String((report.metadata.artifactFiles as any)?.reportMarkdownPath || "");
  const markdown = fs.existsSync(markdownPath) ? fs.readFileSync(markdownPath, "utf-8") : "";
  const verdictPath = String((report.metadata.artifactFiles as any)?.verdictJsonPath || "");
  const verdict = fs.existsSync(verdictPath) ? JSON.parse(fs.readFileSync(verdictPath, "utf-8")) : null;
  const manifestPath = String((report.metadata.artifactFiles as any)?.manifestPath || "");
  const artifactVerification = fs.existsSync(manifestPath) ? verifyTestAgentArtifactManifestFile(manifestPath) : null;
  const pass = report.status === "passed"
    && report.browserResults.length === 1
    && summary?.project === "browser-interaction-summary-self-test"
    && summary?.name.includes("/tasks")
    && summary?.provider === "playwright"
    && summary?.status === "passed"
    && summary?.url === tasksUrl
    && summary?.finalUrl === tasksUrl
    && summary?.probeType === ACCEPTANCE_FORM_FLOW_PROBE_TYPE
    && summary?.actionCount === 4
    && summary?.assertionCount === 5
    && summary?.passedActions === 4
    && summary?.failedActions === 0
    && summary?.passedAssertions === 5
    && summary?.failedAssertions === 0
    && summary?.actionTypes?.goto === 1
    && summary?.actionTypes?.fill === 1
    && summary?.actionTypes?.click === 1
    && summary?.actionTypes?.waitForTimeout === 1
    && summary?.assertionTypes?.pageNotBlank === 1
    && summary?.assertionTypes?.text === 1
    && summary?.assertionTypes?.urlIncludes === 1
    && summary?.assertionTypes?.consoleNoErrors === 1
    && summary?.assertionTypes?.networkNoErrors === 1
    && summary?.actionSteps?.some(step => step.name === "action:fill" && String(step.detail || "").includes("label=Task"))
    && summary?.actionSteps?.some(step => step.name === "action:click" && String(step.detail || "").includes("Add task"))
    && Array.isArray(summary?.failedSteps)
    && summary.failedSteps.length === 0
    && markdown.includes("## Browser Interaction Summary")
    && markdown.includes("actions=4 passed=4 failed=0")
    && markdown.includes("assertions=5 passed=5 failed=0")
    && markdown.includes("fill:1")
    && verdict?.evidenceSummary?.browserActions === 4
    && verdict?.evidenceSummary?.browserFailedActions === 0
    && verdict?.evidenceSummary?.browserAssertions === 5
    && verdict?.evidenceSummary?.browserFailedAssertions === 0
    && JSON.stringify(verdict?.browserInteractionSummary || []) === JSON.stringify(report.browserInteractionSummary)
    && artifactVerification?.status === "passed"
    && artifactVerification?.items?.some(item => item.type === "verdict_consistency" && item.status === "passed");

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    report,
    availability,
    summary,
    verdict,
    artifactVerification,
  };
}

export function runTestAgentAcceptanceDerivedChecksSelfTest() {
  const criteria = [
    'Dashboard displays "Saved successfully" after submit.',
    "User remains on /settings/profile.",
    "Do not infer vague behavior without quoted text.",
  ];
  const derived = buildAcceptanceDerivedBrowserAssertions(criteria);
  const autoCheck = buildAutoBrowserSmokeCheck({
    name: "acceptance-derived-self-test",
    workDir: process.cwd(),
    runCommand: "",
    devServerCommand: "",
    targetUrl: "http://example.test/settings/profile",
    startupUrl: "http://example.test/settings/profile",
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
  }, criteria);
  return {
    pass: derived.length === 2
      && derived.some(item => item.reason === "quoted_text" && item.assertion.type === "text" && item.assertion.text === "Saved successfully")
      && derived.some(item => item.reason === "explicit_url_path" && item.assertion.type === "urlIncludes" && item.assertion.text === "/settings/profile")
      && autoCheck?.assertions?.some(assertion => assertion.type === "text" && assertion.text === "Saved successfully") === true
      && autoCheck?.assertions?.some(assertion => assertion.type === "urlIncludes" && assertion.text === "/settings/profile") === true
      && autoCheck?.assertions?.some(assertion => assertion.type === "consoleNoErrors") === true,
    derived,
    autoCheck,
  };
}

export async function runTestAgentAcceptanceDerivedAccessibilitySelfTest() {
  const availability = await checkPlaywrightAvailability();
  if (!availability.available) {
    return {
      pass: false,
      availability,
      reason: availability.reason,
    };
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-acceptance-derived-accessibility-selftest-"));
  const artifactDir = path.join(dir, "artifacts");
  const port = await getFreePort();
  const targetUrl = `http://127.0.0.1:${port}/`;
  const settingsUrl = `http://127.0.0.1:${port}/settings`;
  fs.writeFileSync(path.join(dir, "server.js"), [
    "const http = require('http');",
    "const html = `<!doctype html>",
    "<html><head><title>Derived Accessibility</title><link rel=\"icon\" href=\"data:,\"></head>",
    "<body><main>",
    "<h1>Settings</h1>",
    "<p id=\"save-help\">Saves profile changes for the current user.</p>",
    "<button id=\"save\" type=\"button\" aria-label=\"Save profile\" aria-describedby=\"save-help\">Save</button>",
    "<button id=\"menu\" type=\"button\" aria-expanded=\"true\">Menu</button>",
    "<button id=\"bold\" type=\"button\" aria-pressed=\"true\">Bold</button>",
    "<label for=\"email\">Email</label><input id=\"email\" aria-invalid=\"true\" aria-required=\"true\" />",
    "</main></body></html>`;",
    "http.createServer((req, res) => { res.writeHead(200, {'content-type':'text/html'}); res.end(html); }).listen(process.env.PORT);",
  ].join("\n"), "utf-8");

  const acceptanceCriteria = [
    'At /settings, button "Save" must have accessible name "Save profile".',
    'At /settings, button "Save" accessible description includes "Saves profile changes".',
    'At /settings, button "Menu" has aria-expanded true.',
    'At /settings, button "Bold" has aria-pressed true.',
    'At /settings, field "Email" has aria-invalid true and aria-required true.',
  ];
  const project = {
    name: "acceptance-derived-accessibility-self-test",
    workDir: dir,
    runCommand: `"${process.execPath}" server.js`,
    devServerCommand: "",
    targetUrl,
    startupUrl: targetUrl,
    startupTimeoutMs: 1000,
    env: { PORT: port },
    changedFiles: [],
    verificationCommands: [],
    httpChecks: [],
    adversarialHttpChecks: [],
    adversarialBrowserChecks: [],
    browserChecks: [],
    agentSummary: "",
    risks: [],
  };
  const derived = buildAcceptanceDerivedBrowserAssertions(acceptanceCriteria);
  const generatedChecks = buildBrowserChecksForProject(project as any, acceptanceCriteria);
  const report = await runTestAgent({
    id: `acceptance-derived-accessibility-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent derives accessibility browser assertions from acceptance criteria.",
    acceptanceCriteria,
    requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
    projects: [{
      name: project.name,
      workDir: dir,
      runCommand: project.runCommand,
      targetUrl,
      env: { PORT: port },
    }],
    options: {
      artifactDir,
      browserProvider: "playwright",
      collectBrowserArtifacts: false,
    },
  }, { browserProvider: "playwright" });

  const browser = report.browserResults[0];
  const pass = derived.some(item => item.reason === "accessible_name" && item.assertion.type === "accessibleNameEquals" && item.assertion.value === "Save profile")
    && derived.some(item => item.reason === "accessible_description" && item.assertion.type === "accessibleDescriptionIncludes" && item.assertion.value === "Saves profile changes")
    && derived.some(item => item.reason === "aria_state" && item.assertion.type === "ariaExpanded")
    && derived.some(item => item.reason === "aria_state" && item.assertion.type === "ariaPressed")
    && derived.some(item => item.reason === "aria_state" && item.assertion.type === "ariaInvalid")
    && derived.some(item => item.reason === "aria_state" && item.assertion.type === "ariaRequired")
    && !derived.some(item => item.reason === "quoted_text" && item.assertion.text === "Save profile")
    && generatedChecks.length === 1
    && generatedChecks[0].url === settingsUrl
    && generatedChecks[0].assertions.some(assertion => assertion.type === "accessibleNameEquals")
    && generatedChecks[0].assertions.some(assertion => assertion.type === "accessibleDescriptionIncludes")
    && generatedChecks[0].assertions.some(assertion => assertion.type === "ariaExpanded")
    && generatedChecks[0].assertions.some(assertion => assertion.type === "ariaPressed")
    && generatedChecks[0].assertions.some(assertion => assertion.type === "ariaInvalid")
    && generatedChecks[0].assertions.some(assertion => assertion.type === "ariaRequired")
    && report.status === "passed"
    && browser?.provider === "playwright"
    && browser?.status === "passed"
    && browser?.finalUrl === settingsUrl
    && browser?.steps.some(step => step.name === "assert:accessibleNameEquals" && step.status === "passed")
    && browser?.steps.some(step => step.name === "assert:accessibleDescriptionIncludes" && step.status === "passed")
    && browser?.steps.some(step => step.name === "assert:ariaExpanded" && step.status === "passed")
    && browser?.steps.some(step => step.name === "assert:ariaPressed" && step.status === "passed")
    && browser?.steps.some(step => step.name === "assert:ariaInvalid" && step.status === "passed")
    && browser?.steps.some(step => step.name === "assert:ariaRequired" && step.status === "passed")
    && report.requiredCheckCoverage.some(item => item.check === "browser_e2e" && item.status === "verified")
    && report.acceptanceCoverage.every(item => item.status === "verified");

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    availability,
    derived,
    generatedChecks,
    report,
  };
}

export async function runTestAgentAcceptanceDerivedStorageAssertionSelfTest() {
  const availability = await checkPlaywrightAvailability();
  if (!availability.available) {
    return {
      pass: false,
      availability,
      reason: availability.reason,
    };
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-acceptance-derived-storage-selftest-"));
  const artifactDir = path.join(dir, "artifacts");
  const port = await getFreePort();
  const targetUrl = `http://127.0.0.1:${port}/`;
  const appUrl = `http://127.0.0.1:${port}/app`;
  fs.writeFileSync(path.join(dir, "server.js"), [
    "const http = require('http');",
    "const html = `<!doctype html>",
    "<html><head><title>Derived Storage</title><link rel=\"icon\" href=\"data:,\"></head>",
    "<body><main>",
    "<h1>Storage fixture</h1>",
    "<p id=\"status\">Storage fixture ready</p>",
    "<script>",
    "localStorage.setItem('profile.saved', 'yes');",
    "localStorage.setItem('feature.flag', 'enabled');",
    "sessionStorage.setItem('draft.notice', 'Resume draft active');",
    "</script>",
    "</main></body></html>`;",
    "http.createServer((req, res) => { res.writeHead(200, {'content-type':'text/html'}); res.end(html); }).listen(process.env.PORT);",
  ].join("\n"), "utf-8");

  const acceptanceCriteria = [
    'At /app, localStorage key "profile.saved" equals "yes".',
    'At /app, sessionStorage key "draft.notice" includes "draft".',
    'At /app, storage key "feature.flag" equals "enabled".',
  ];
  const project = {
    name: "acceptance-derived-storage-self-test",
    workDir: dir,
    runCommand: `"${process.execPath}" server.js`,
    devServerCommand: "",
    targetUrl,
    startupUrl: targetUrl,
    startupTimeoutMs: 1000,
    env: { PORT: port },
    changedFiles: [],
    verificationCommands: [],
    httpChecks: [],
    adversarialHttpChecks: [],
    adversarialBrowserChecks: [],
    browserChecks: [],
    agentSummary: "",
    risks: [],
  };
  const derived = buildAcceptanceDerivedBrowserAssertions(acceptanceCriteria);
  const generatedChecks = buildBrowserChecksForProject(project as any, acceptanceCriteria);
  const report = await runTestAgent({
    id: `acceptance-derived-storage-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent derives Web Storage browser assertions from acceptance criteria.",
    acceptanceCriteria,
    requiredChecks: ["browser_e2e", "browser_storage", "screenshots", "console_errors"],
    projects: [{
      name: project.name,
      workDir: dir,
      runCommand: project.runCommand,
      targetUrl,
      env: { PORT: port },
    }],
    options: {
      artifactDir,
      browserProvider: "playwright",
      collectBrowserArtifacts: false,
    },
  }, { browserProvider: "playwright" });

  const browser = report.browserResults[0];
  const generatedAssertions = generatedChecks[0]?.assertions || [];
  const quotedTexts = new Set(derived.filter(item => item.reason === "quoted_text").map(item => item.assertion.text));
  const byCheck = new Map(report.requiredCheckCoverage.map(item => [item.check, item]));
  const pass = derived.some(item => item.reason === "web_storage" && item.assertion.type === "localStorageEquals" && item.assertion.key === "profile.saved" && item.assertion.value === "yes")
    && derived.some(item => item.reason === "web_storage" && item.assertion.type === "sessionStorageIncludes" && item.assertion.key === "draft.notice" && item.assertion.value === "draft")
    && derived.some(item => item.reason === "web_storage" && item.assertion.type === "localStorageEquals" && item.assertion.key === "feature.flag" && item.assertion.value === "enabled")
    && derived.some(item => item.reason === "explicit_url_path" && item.assertion.type === "urlIncludes" && item.assertion.text === "/app")
    && !["profile.saved", "yes", "draft.notice", "draft", "feature.flag", "enabled"].some(text => quotedTexts.has(text))
    && generatedChecks.length === 1
    && generatedChecks[0].url === appUrl
    && generatedAssertions.some(assertion => assertion.type === "localStorageEquals" && assertion.key === "profile.saved" && assertion.value === "yes")
    && generatedAssertions.some(assertion => assertion.type === "sessionStorageIncludes" && assertion.key === "draft.notice" && assertion.value === "draft")
    && generatedAssertions.some(assertion => assertion.type === "localStorageEquals" && assertion.key === "feature.flag" && assertion.value === "enabled")
    && report.status === "passed"
    && browser?.provider === "playwright"
    && browser?.status === "passed"
    && browser?.finalUrl === appUrl
    && browser?.steps.filter(step => step.name === "assert:localStorageEquals" && step.status === "passed").length === 2
    && browser?.steps.some(step => step.name === "assert:sessionStorageIncludes" && step.status === "passed")
    && byCheck.get("browser_e2e")?.status === "verified"
    && byCheck.get("browser_storage")?.status === "verified"
    && byCheck.get("screenshots")?.status === "verified"
    && report.acceptanceCoverage.every(item => item.status === "verified");

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    availability,
    derived,
    generatedChecks,
    report,
  };
}

export async function runTestAgentAcceptanceDerivedCookieAssertionSelfTest() {
  const availability = await checkPlaywrightAvailability();
  if (!availability.available) {
    return {
      pass: false,
      availability,
      reason: availability.reason,
    };
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-acceptance-derived-cookie-selftest-"));
  const artifactDir = path.join(dir, "artifacts");
  const port = await getFreePort();
  const targetUrl = `http://127.0.0.1:${port}/`;
  const appUrl = `http://127.0.0.1:${port}/app`;
  fs.writeFileSync(path.join(dir, "server.js"), [
    "const http = require('http');",
    "const html = `<!doctype html>",
    "<html><head><title>Derived Cookie</title><link rel=\"icon\" href=\"data:,\"></head>",
    "<body><main>",
    "<h1>Cookie fixture</h1>",
    "<p id=\"status\">Cookie fixture ready</p>",
    "</main></body></html>`;",
    "http.createServer((req, res) => {",
    "  res.writeHead(200, {",
    "    'content-type':'text/html',",
    "    'set-cookie':[",
    "      'ccm_session=verified-token-123; Path=/; SameSite=Lax',",
    "      'theme=dark-mode; Path=/; SameSite=Lax',",
    "      'analytics_id=visit-42; Path=/; SameSite=Lax'",
    "    ]",
    "  });",
    "  res.end(html);",
    "}).listen(process.env.PORT);",
  ].join("\n"), "utf-8");

  const acceptanceCriteria = [
    'At /app, cookie "ccm_session" equals "verified-token-123".',
    'At /app, cookie "theme" includes "dark".',
    'At /app, cookie "analytics_id" exists.',
  ];
  const project = {
    name: "acceptance-derived-cookie-self-test",
    workDir: dir,
    runCommand: `"${process.execPath}" server.js`,
    devServerCommand: "",
    targetUrl,
    startupUrl: targetUrl,
    startupTimeoutMs: 1000,
    env: { PORT: port },
    changedFiles: [],
    verificationCommands: [],
    httpChecks: [],
    adversarialHttpChecks: [],
    adversarialBrowserChecks: [],
    browserChecks: [],
    agentSummary: "",
    risks: [],
  };
  const derived = buildAcceptanceDerivedBrowserAssertions(acceptanceCriteria);
  const generatedChecks = buildBrowserChecksForProject(project as any, acceptanceCriteria);
  const report = await runTestAgent({
    id: `acceptance-derived-cookie-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent derives browser cookie assertions from acceptance criteria.",
    acceptanceCriteria,
    requiredChecks: ["browser_e2e", "browser_cookie", "screenshots", "console_errors"],
    projects: [{
      name: project.name,
      workDir: dir,
      runCommand: project.runCommand,
      targetUrl,
      env: { PORT: port },
    }],
    options: {
      artifactDir,
      browserProvider: "playwright",
      collectBrowserArtifacts: false,
    },
  }, { browserProvider: "playwright" });

  const browser = report.browserResults[0];
  const generatedAssertions = generatedChecks[0]?.assertions || [];
  const quotedTexts = new Set(derived.filter(item => item.reason === "quoted_text").map(item => item.assertion.text));
  const byCheck = new Map(report.requiredCheckCoverage.map(item => [item.check, item]));
  const pass = derived.some(item => item.reason === "browser_cookie" && item.assertion.type === "cookieValueEquals" && item.assertion.key === "ccm_session" && item.assertion.value === "verified-token-123")
    && derived.some(item => item.reason === "browser_cookie" && item.assertion.type === "cookieValueIncludes" && item.assertion.key === "theme" && item.assertion.value === "dark")
    && derived.some(item => item.reason === "browser_cookie" && item.assertion.type === "cookieExists" && item.assertion.key === "analytics_id")
    && derived.some(item => item.reason === "explicit_url_path" && item.assertion.type === "urlIncludes" && item.assertion.text === "/app")
    && !["ccm_session", "verified-token-123", "theme", "dark", "analytics_id"].some(text => quotedTexts.has(text))
    && generatedChecks.length === 1
    && generatedChecks[0].url === appUrl
    && generatedAssertions.some(assertion => assertion.type === "cookieValueEquals" && assertion.key === "ccm_session" && assertion.value === "verified-token-123")
    && generatedAssertions.some(assertion => assertion.type === "cookieValueIncludes" && assertion.key === "theme" && assertion.value === "dark")
    && generatedAssertions.some(assertion => assertion.type === "cookieExists" && assertion.key === "analytics_id")
    && report.status === "passed"
    && browser?.provider === "playwright"
    && browser?.status === "passed"
    && browser?.finalUrl === appUrl
    && browser?.steps.some(step => step.name === "assert:cookieValueEquals" && step.status === "passed")
    && browser?.steps.some(step => step.name === "assert:cookieValueIncludes" && step.status === "passed")
    && browser?.steps.some(step => step.name === "assert:cookieExists" && step.status === "passed")
    && byCheck.get("browser_e2e")?.status === "verified"
    && byCheck.get("browser_cookie")?.status === "verified"
    && byCheck.get("screenshots")?.status === "verified"
    && report.acceptanceCoverage.every(item => item.status === "verified");

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    availability,
    derived,
    generatedChecks,
    report,
  };
}

export async function runTestAgentAcceptanceDerivedNetworkAssertionSelfTest() {
  const availability = await checkPlaywrightAvailability();
  if (!availability.available) {
    return {
      pass: false,
      availability,
      reason: availability.reason,
    };
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-acceptance-derived-network-selftest-"));
  const artifactDir = path.join(dir, "artifacts");
  const port = await getFreePort();
  const targetUrl = `http://127.0.0.1:${port}/`;
  const tasksUrl = `http://127.0.0.1:${port}/tasks`;
  fs.writeFileSync(path.join(dir, "server.js"), [
    "const http = require('http');",
    "const html = `<!doctype html>",
    "<html><head><title>Derived Network</title><link rel=\"icon\" href=\"data:,\"></head>",
    "<body><main>",
    "<h1>Task form</h1>",
    "<label for=\"task\">Task</label>",
    "<input id=\"task\" />",
    "<button id=\"add\" type=\"button\">Add task</button>",
    "<p id=\"status\">Ready</p>",
    "<script>",
    "document.getElementById('add').addEventListener('click', async () => {",
    "  const title = document.getElementById('task').value;",
    "  const response = await fetch('/api/tasks', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title }) });",
    "  const data = await response.json();",
    "  document.getElementById('status').textContent = response.status === 201 ? 'Saved ' + data.title : 'Save failed';",
    "});",
    "</script>",
    "</main></body></html>`;",
    "http.createServer((req, res) => {",
    "  const route = String(req.url || '/').split('?')[0];",
    "  if (route === '/api/tasks' && req.method === 'POST') {",
    "    let body = '';",
    "    req.on('data', chunk => { body += chunk; });",
    "    req.on('end', () => {",
    "      let title = '';",
    "      try { title = JSON.parse(body).title || ''; } catch {}",
    "      res.writeHead(201, {'content-type':'application/json'});",
    "      res.end(JSON.stringify({ ok: true, title }));",
    "    });",
    "    return;",
    "  }",
    "  res.writeHead(200, {'content-type':'text/html'});",
    "  res.end(html);",
    "}).listen(process.env.PORT);",
  ].join("\n"), "utf-8");

  const acceptanceCriteria = [
    'At /tasks, fill "Task" with "Buy milk", click "Add task", then show "Saved Buy milk" and send a POST request to /api/tasks and receive a 201 API response.',
  ];
  const project = {
    name: "acceptance-derived-network-self-test",
    workDir: dir,
    runCommand: `"${process.execPath}" server.js`,
    devServerCommand: "",
    targetUrl,
    startupUrl: targetUrl,
    startupTimeoutMs: 1000,
    env: { PORT: port },
    changedFiles: [],
    verificationCommands: [],
    httpChecks: [],
    adversarialHttpChecks: [],
    adversarialBrowserChecks: [],
    browserChecks: [],
    agentSummary: "",
    risks: [],
  };
  const derived = buildAcceptanceDerivedBrowserAssertions(acceptanceCriteria);
  const generatedChecks = buildBrowserChecksForProject(project as any, acceptanceCriteria);
  const report = await runTestAgent({
    id: `acceptance-derived-network-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent derives browser network assertions from acceptance criteria.",
    acceptanceCriteria,
    requiredChecks: ["browser_e2e", "browser_network", "screenshots", "console_errors"],
    projects: [{
      name: project.name,
      workDir: dir,
      runCommand: project.runCommand,
      targetUrl,
      env: { PORT: port },
    }],
    options: {
      artifactDir,
      browserProvider: "playwright",
      collectBrowserArtifacts: false,
    },
  }, { browserProvider: "playwright" });

  const browser = report.browserResults[0];
  const generatedAssertions = generatedChecks[0]?.assertions || [];
  const byCheck = new Map(report.requiredCheckCoverage.map(item => [item.check, item]));
  const pass = derived.some(item => item.reason === "browser_network" && item.assertion.type === "networkRequest" && item.assertion.method === "POST" && item.assertion.urlIncludes === "/api/tasks")
    && derived.some(item => item.reason === "browser_network" && item.assertion.type === "networkResponse" && item.assertion.status === 201 && item.assertion.urlIncludes === "/api/tasks")
    && derived.some(item => item.reason === "explicit_url_path" && item.assertion.type === "urlIncludes" && item.assertion.text === "/tasks")
    && !derived.some(item => item.reason === "explicit_url_path" && item.assertion.text === "/api/tasks")
    && generatedChecks.length === 1
    && generatedChecks[0].url === tasksUrl
    && generatedAssertions.some(assertion => assertion.type === "networkRequest" && assertion.method === "POST" && assertion.urlIncludes === "/api/tasks")
    && generatedAssertions.some(assertion => assertion.type === "networkResponse" && assertion.status === 201 && assertion.urlIncludes === "/api/tasks")
    && report.status === "passed"
    && browser?.provider === "playwright"
    && browser?.status === "passed"
    && browser?.finalUrl === tasksUrl
    && browser?.pageTextPreview?.includes("Saved Buy milk")
    && browser?.steps.some(step => step.name === "assert:networkRequest" && step.status === "passed" && String(step.detail || "").includes("method=POST") && String(step.detail || "").includes("urlIncludes=/api/tasks"))
    && browser?.steps.some(step => step.name === "assert:networkResponse" && step.status === "passed" && String(step.detail || "").includes("status=201") && String(step.detail || "").includes("urlIncludes=/api/tasks"))
    && browser?.networkRequests?.some(item => item.includes("request POST") && item.includes("/api/tasks"))
    && browser?.networkRequests?.some(item => item.includes("response 201") && item.includes("/api/tasks"))
    && byCheck.get("browser_e2e")?.status === "verified"
    && byCheck.get("browser_network")?.status === "verified"
    && byCheck.get("screenshots")?.status === "verified"
    && report.acceptanceCoverage.every(item => item.status === "verified");

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    availability,
    derived,
    generatedChecks,
    report,
  };
}

export async function runTestAgentAcceptanceDerivedNegativeUiSelfTest() {
  const availability = await checkPlaywrightAvailability();
  if (!availability.available) {
    return {
      pass: false,
      availability,
      reason: availability.reason,
    };
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-acceptance-derived-negative-ui-selftest-"));
  const artifactDir = path.join(dir, "artifacts");
  const port = await getFreePort();
  const targetUrl = `http://127.0.0.1:${port}/`;
  const dashboardUrl = `http://127.0.0.1:${port}/dashboard`;
  fs.writeFileSync(path.join(dir, "server.js"), [
    "const http = require('http');",
    "const html = `<!doctype html>",
    "<html><head><title>Derived Negative UI</title><link rel=\"icon\" href=\"data:,\"></head>",
    "<body><main>",
    "<h1>Dashboard</h1>",
    "<p>Ready dashboard</p>",
    "<section hidden>Debug panel</section>",
    "</main></body></html>`;",
    "http.createServer((req, res) => { res.writeHead(200, {'content-type':'text/html'}); res.end(html); }).listen(process.env.PORT);",
  ].join("\n"), "utf-8");

  const acceptanceCriteria = [
    'At /dashboard, "Debug panel" should not be visible.',
    'At /dashboard, "Obsolete task" must not be present.',
  ];
  const project = {
    name: "acceptance-derived-negative-ui-self-test",
    workDir: dir,
    runCommand: `"${process.execPath}" server.js`,
    devServerCommand: "",
    targetUrl,
    startupUrl: targetUrl,
    startupTimeoutMs: 1000,
    env: { PORT: port },
    changedFiles: [],
    verificationCommands: [],
    httpChecks: [],
    adversarialHttpChecks: [],
    adversarialBrowserChecks: [],
    browserChecks: [],
    agentSummary: "",
    risks: [],
  };
  const derived = buildAcceptanceDerivedBrowserAssertions(acceptanceCriteria);
  const generatedChecks = buildBrowserChecksForProject(project as any, acceptanceCriteria);
  const report = await runTestAgent({
    id: `acceptance-derived-negative-ui-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent derives negative UI browser assertions from acceptance criteria.",
    acceptanceCriteria,
    requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
    projects: [{
      name: project.name,
      workDir: dir,
      runCommand: project.runCommand,
      targetUrl,
      env: { PORT: port },
    }],
    options: {
      artifactDir,
      browserProvider: "playwright",
      collectBrowserArtifacts: false,
    },
  }, { browserProvider: "playwright" });

  const browser = report.browserResults[0];
  const generatedAssertions = generatedChecks[0]?.assertions || [];
  const quotedTexts = new Set(derived.filter(item => item.reason === "quoted_text").map(item => item.assertion.text));
  const pass = derived.some(item => item.reason === "negative_ui" && item.assertion.type === "notVisible" && item.assertion.text === "Debug panel")
    && derived.some(item => item.reason === "negative_ui" && item.assertion.type === "notPresent" && item.assertion.text === "Obsolete task")
    && derived.some(item => item.reason === "explicit_url_path" && item.assertion.type === "urlIncludes" && item.assertion.text === "/dashboard")
    && !quotedTexts.has("Debug panel")
    && !quotedTexts.has("Obsolete task")
    && generatedChecks.length === 1
    && generatedChecks[0].url === dashboardUrl
    && generatedAssertions.some(assertion => assertion.type === "notVisible" && assertion.text === "Debug panel")
    && generatedAssertions.some(assertion => assertion.type === "notPresent" && assertion.text === "Obsolete task")
    && report.status === "passed"
    && browser?.provider === "playwright"
    && browser?.status === "passed"
    && browser?.finalUrl === dashboardUrl
    && browser?.steps.some(step => step.name === "assert:notVisible" && step.status === "passed" && String(step.detail || "").includes("Debug panel"))
    && browser?.steps.some(step => step.name === "assert:notPresent" && step.status === "passed" && String(step.detail || "").includes("Obsolete task"))
    && report.requiredCheckCoverage.some(item => item.check === "browser_e2e" && item.status === "verified")
    && report.acceptanceCoverage.every(item => item.status === "verified");

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    availability,
    derived,
    generatedChecks,
    report,
  };
}

export function runTestAgentSemanticLocatorSelfTest() {
  const { workOrder, issues } = normalizeTestAgentWorkOrder({
    id: `semantic-locator-self-test-${process.pid}-${Date.now()}`,
    acceptanceCriteria: ["Browser semantic locators normalize"],
    requiredChecks: ["browser_e2e"],
    projects: [{
      name: "semantic-locator-self-test",
      workDir: process.cwd(),
      browser_checks: [{
        title: "semantic browser targets",
        steps: [
          { action: "click", test_id: "save-button" },
          { action: "fill", label: "Email", value: "ada@example.test", exact: true },
          { action: "press_key", key_text: "Enter" },
        ],
        expectations: [
          { assertion: "visible", role: "button", name: "Save" },
          { assertion: "element_text_includes", data_testid: "toast", value: "Saved" },
        ],
      }],
    }],
  } as any);

  const check = workOrder.projects[0].browserChecks[0];
  const actionPlans = check.actions.map(action => buildSemanticLocatorPlan(action));
  const assertionPlans = check.assertions.map(assertion => buildSemanticLocatorPlan(assertion));
  return {
    pass: issues.every(issue => issue.severity !== "error")
      && actionPlans[0]?.kind === "testId"
      && actionPlans[0]?.value === "save-button"
      && actionPlans[1]?.kind === "label"
      && actionPlans[1]?.exact === true
      && actionPlans[2] === null
      && assertionPlans[0]?.kind === "role"
      && assertionPlans[0]?.name === "Save"
      && assertionPlans[1]?.kind === "testId"
      && assertionPlans[1]?.value === "toast",
    actionPlans,
    assertionPlans,
    issues,
  };
}

export function runTestAgentBrowserStateSelfTest() {
  const { workOrder, issues } = normalizeTestAgentWorkOrder({
    id: `browser-state-self-test-${process.pid}-${Date.now()}`,
    acceptanceCriteria: ["Browser state checks normalize"],
    requiredChecks: ["browser_e2e"],
    projects: [{
      name: "browser-state-self-test",
      workDir: process.cwd(),
      browser_checks: [{
        title: "state survives refresh",
        steps: [
          { action: "goto", url: "http://example.test/" },
          { action: "evaluate", expression: "localStorage.setItem('profile.saved', 'yes')" },
          { action: "refresh" },
          { action: "go_back" },
          { action: "go_forward" },
        ],
        expectations: [
          { assertion: "local_storage_equals", key: "profile.saved", value: "yes" },
          { assertion: "js_truthy", expression: "Boolean(localStorage.getItem('profile.saved'))" },
          { assertion: "js_equals", expression: "document.readyState", value: "complete" },
        ],
      }],
    }],
  } as any);

  const check = workOrder.projects[0].browserChecks[0];
  const actionTypes = check.actions.map(action => action.type);
  const assertionTypes = check.assertions.map(assertion => assertion.type);
  return {
    pass: issues.every(issue => issue.severity !== "error")
      && actionTypes.join(",") === "goto,evaluate,reload,goBack,goForward"
      && assertionTypes.join(",") === "localStorageEquals,jsTruthy,jsEquals"
      && check.assertions[0].key === "profile.saved"
      && check.assertions[1].expression === "Boolean(localStorage.getItem('profile.saved'))",
    actionTypes,
    assertionTypes,
    issues,
  };
}

export async function runTestAgentBrowserScriptWaitAssertionSelfTest() {
  const availability = await checkPlaywrightAvailability();
  if (!availability.available) {
    return {
      pass: false,
      availability,
      reason: availability.reason,
    };
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-browser-script-wait-selftest-"));
  const artifactDir = path.join(dir, "artifacts");
  const port = await getFreePort();
  const targetUrl = `http://127.0.0.1:${port}/script-wait`;
  fs.writeFileSync(path.join(dir, "server.js"), [
    "const http = require('http');",
    "const html = `<!doctype html>",
    "<html><head><title>Script Wait Fixture</title></head>",
    "<body><main>",
    "<h1>Script wait</h1>",
    "<p id=\"status\" role=\"status\">Loading async state</p>",
    "<script>",
    "setTimeout(() => {",
    "  document.body.dataset.asyncState = 'ready';",
    "  document.getElementById('status').textContent = 'Async state ready';",
    "}, 150);",
    "</script>",
    "</main></body></html>`;",
    "http.createServer((req, res) => { res.writeHead(200, {'content-type':'text/html'}); res.end(html); }).listen(process.env.PORT);",
  ].join("\n"), "utf-8");

  const report = await runTestAgent({
    id: `browser-script-wait-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent can prove browser JavaScript state after conditional waits.",
    acceptanceCriteria: ["Async browser state becomes ready and is verified with JavaScript assertions."],
    requiredChecks: ["browser_e2e", "browser_js", "browser_script", "browser_wait", "console_errors"],
    projects: [{
      name: "browser-script-wait-self-test",
      workDir: dir,
      runCommand: `"${process.execPath}" server.js`,
      targetUrl,
      env: { PORT: port },
      browserChecks: [{
        name: "Async state is verified with script and wait evidence",
        url: targetUrl,
        actions: [
          { type: "goto", url: targetUrl },
          { type: "evaluate", text: "localStorage.setItem('script.wait.seed', 'ready')" },
          { type: "waitForText", text: "Async state ready", timeoutMs: 3000 },
        ],
        assertions: [
          { type: "jsTruthy", expression: "document.body.dataset.asyncState === 'ready'" },
          { type: "jsEquals", expression: "localStorage.getItem('script.wait.seed')", value: "ready" },
          { type: "text", text: "Async state ready" },
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
  const byCheck = new Map(report.requiredCheckCoverage.map(item => [item.check, item]));
  const pass = report.status === "passed"
    && browser?.provider === "playwright"
    && browser?.status === "passed"
    && browser?.steps.some(step => step.name === "action:evaluate" && step.status === "passed")
    && browser?.steps.some(step => step.name === "action:waitForText" && step.status === "passed" && String(step.detail || "").includes("Async state ready"))
    && browser?.steps.some(step => step.name === "assert:jsTruthy" && step.status === "passed" && String(step.detail || "").includes("asyncState"))
    && browser?.steps.some(step => step.name === "assert:jsEquals" && step.status === "passed" && String(step.detail || "").includes("script.wait.seed"))
    && byCheck.get("browser_js")?.status === "verified"
    && byCheck.get("browser_script")?.status === "verified"
    && byCheck.get("browser_wait")?.status === "verified";

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    availability,
    report,
  };
}

export async function runTestAgentBrowserSelectStateSelfTest() {
  const availability = await checkPlaywrightAvailability();
  if (!availability.available) {
    return {
      pass: false,
      availability,
      reason: availability.reason,
    };
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-browser-select-state-selftest-"));
  const artifactDir = path.join(dir, "artifacts");
  const port = await getFreePort();
  const targetUrl = `http://127.0.0.1:${port}/settings`;
  fs.writeFileSync(path.join(dir, "server.js"), [
    "const http = require('http');",
    "const html = `<!doctype html>",
    "<html><head><title>Select State Fixture</title></head>",
    "<body><main>",
    "<h1>Settings</h1>",
    "<label for=\"priority\">Priority</label>",
    "<select id=\"priority\" name=\"priority\">",
    "<option value=\"priority-low\">Low</option>",
    "<option value=\"priority-high\">High</option>",
    "</select>",
    "</main></body></html>`;",
    "http.createServer((req, res) => { res.writeHead(200, {'content-type':'text/html'}); res.end(html); }).listen(process.env.PORT);",
  ].join("\n"), "utf-8");

  const report = await runTestAgent({
    id: `browser-select-state-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent selects by visible label and checks the resulting DOM state.",
    acceptanceCriteria: ['At /settings, select "High" in "Priority".'],
    requiredChecks: ["browser_e2e", "console_errors"],
    projects: [{
      name: "browser-select-state-self-test",
      workDir: dir,
      runCommand: `"${process.execPath}" server.js`,
      targetUrl,
      env: { PORT: port },
      browserChecks: [{
        name: "Select option state is observable",
        url: targetUrl,
        actions: [
          { type: "goto", url: targetUrl },
          { type: "selectOption", label: "Priority", value: "High", exact: true },
        ],
        assertions: [
          { type: "selectedValue", label: "Priority", value: "priority-high", exact: true },
          { type: "selectedTextIncludes", label: "Priority", text: "High", exact: true },
          { type: "consoleNoErrors" },
          { type: "networkNoErrors" },
        ],
      }],
    }],
    options: {
      artifactDir,
      browserProvider: "playwright",
      collectBrowserArtifacts: false,
    },
  }, { browserProvider: "playwright" });

  const browser = report.browserResults[0];
  const pass = report.status === "passed"
    && browser?.provider === "playwright"
    && browser?.status === "passed"
    && browser?.finalUrl === targetUrl
    && browser?.steps.some(step => step.name === "action:selectOption" && step.status === "passed" && String(step.detail || "").includes("label=Priority"))
    && browser?.steps.some(step => step.name === "assert:selectedValue" && step.status === "passed" && String(step.detail || "").includes("expected=priority-high"))
    && browser?.steps.some(step => step.name === "assert:selectedTextIncludes" && step.status === "passed" && String(step.detail || "").includes("expected=High"))
    && report.requiredCheckCoverage.some(item => item.check === "browser_e2e" && item.status === "verified")
    && report.acceptanceCoverage.every(item => item.status === "verified");

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    report,
    availability,
  };
}

export async function runTestAgentBrowserInputValueAssertionSelfTest() {
  const availability = await checkPlaywrightAvailability();
  if (!availability.available) {
    return {
      pass: false,
      availability,
      reason: availability.reason,
    };
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-browser-input-value-assertion-selftest-"));
  const passArtifactDir = path.join(dir, "pass-artifacts");
  const failArtifactDir = path.join(dir, "fail-artifacts");
  const port = await getFreePort();
  const targetUrl = `http://127.0.0.1:${port}/profile`;
  fs.writeFileSync(path.join(dir, "server.js"), [
    "const http = require('http');",
    "const html = `<!doctype html>",
    "<html><head><title>Input Value Fixture</title></head>",
    "<body><main>",
    "<h1>Profile</h1>",
    "<label for=\"displayName\">Display name</label>",
    "<input id=\"displayName\" name=\"displayName\" />",
    "<button type=\"button\" id=\"save\">Save</button>",
    "<p id=\"status\" role=\"status\">Waiting</p>",
    "<script>",
    "document.getElementById('save').addEventListener('click', () => {",
    "  const value = document.getElementById('displayName').value;",
    "  document.getElementById('status').textContent = value ? 'Saved profile' : 'Missing name';",
    "});",
    "</script>",
    "</main></body></html>`;",
    "http.createServer((req, res) => { res.writeHead(200, {'content-type':'text/html'}); res.end(html); }).listen(process.env.PORT);",
  ].join("\n"), "utf-8");

  const baseProject = {
    name: "browser-input-value-assertion-self-test",
    workDir: dir,
    runCommand: `"${process.execPath}" server.js`,
    targetUrl,
    env: { PORT: port },
  };

  const browserCheck = {
    name: "Profile input value is observable",
    url: targetUrl,
    actions: [
      { type: "goto", url: targetUrl },
      { type: "fill", label: "Display name", value: "Ada Lovelace", exact: true },
      { type: "click", role: "button", name: "Save", exact: true },
    ],
    assertions: [
      { type: "text", text: "Saved profile" },
      { assertion: "input_value_equals", label: "Display name", value: "Ada Lovelace", exact: true } as any,
      { assertion: "input_includes", label: "Display name", value: "Lovelace", exact: true } as any,
      { type: "consoleNoErrors" },
      { type: "networkNoErrors" },
    ],
    screenshot: true,
  } as any;

  const passReport = await runTestAgent({
    id: `browser-input-value-pass-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent can prove a filled input value after a real browser flow.",
    acceptanceCriteria: ["Saving a profile keeps the display name in the input."],
    requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
    projects: [{
      ...baseProject,
      browserChecks: [browserCheck],
    }],
    options: {
      artifactDir: passArtifactDir,
      browserProvider: "playwright",
      collectBrowserArtifacts: false,
    },
  }, { browserProvider: "playwright" });

  const failReport = await runTestAgent({
    id: `browser-input-value-fail-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent fails when an input value does not match the expected value.",
    acceptanceCriteria: ["Saving a profile keeps a different display name in the input."],
    requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
    projects: [{
      ...baseProject,
      browserChecks: [{
        ...browserCheck,
        assertions: [
          { type: "text", text: "Saved profile" },
          { type: "inputValueEquals", label: "Display name", value: "Grace", exact: true },
          { type: "consoleNoErrors" },
          { type: "networkNoErrors" },
        ],
      }],
    }],
    options: {
      artifactDir: failArtifactDir,
      browserProvider: "playwright",
      collectBrowserArtifacts: false,
    },
  }, { browserProvider: "playwright" });

  const passBrowser = passReport.browserResults[0];
  const failBrowser = failReport.browserResults[0];
  const failInputValue = failBrowser?.steps.find(step => step.name === "assert:inputValueEquals");
  const pass = passReport.status === "passed"
    && passBrowser?.provider === "playwright"
    && passBrowser?.status === "passed"
    && passBrowser?.steps.some(step => step.name === "assert:inputValueEquals" && step.status === "passed" && String(step.detail || "").includes("label=Display name") && String(step.detail || "").includes("expected length=12"))
    && passBrowser?.steps.some(step => step.name === "assert:inputValueIncludes" && step.status === "passed" && String(step.detail || "").includes("expected substring length=8"))
    && failReport.status === "failed"
    && failBrowser?.provider === "playwright"
    && failBrowser?.status === "failed"
    && failInputValue?.status === "failed"
    && String(failInputValue?.error || "").includes("actual length=12")
    && !String(failInputValue?.error || "").includes("Ada Lovelace")
    && !String(failInputValue?.error || "").includes("Grace")
    && failReport.requiredCheckCoverage.some(item => item.check === "browser_e2e" && item.status === "not_verified");

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    availability,
    passReport,
    failReport,
  };
}

export async function runTestAgentBrowserEnabledStateSelfTest() {
  const availability = await checkPlaywrightAvailability();
  if (!availability.available) {
    return {
      pass: false,
      availability,
      reason: availability.reason,
    };
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-browser-enabled-state-selftest-"));
  const passArtifactDir = path.join(dir, "pass-artifacts");
  const failArtifactDir = path.join(dir, "fail-artifacts");
  const port = await getFreePort();
  const targetUrl = `http://127.0.0.1:${port}/signup`;
  fs.writeFileSync(path.join(dir, "server.js"), [
    "const http = require('http');",
    "const html = `<!doctype html>",
    "<html><head><title>Enabled State Fixture</title></head>",
    "<body><main>",
    "<h1>Signup</h1>",
    "<label for=\"email\">Email</label>",
    "<input id=\"email\" name=\"email\" />",
    "<button type=\"button\" id=\"submit\" disabled>Create account</button>",
    "<p id=\"status\" role=\"status\">Waiting</p>",
    "<script>",
    "const email = document.getElementById('email');",
    "const submit = document.getElementById('submit');",
    "email.addEventListener('input', () => { submit.disabled = !email.value.includes('@'); });",
    "submit.addEventListener('click', () => { document.getElementById('status').textContent = 'Ready to create account'; });",
    "</script>",
    "</main></body></html>`;",
    "http.createServer((req, res) => { res.writeHead(200, {'content-type':'text/html'}); res.end(html); }).listen(process.env.PORT);",
  ].join("\n"), "utf-8");

  const baseProject = {
    name: "browser-enabled-state-self-test",
    workDir: dir,
    runCommand: `"${process.execPath}" server.js`,
    targetUrl,
    env: { PORT: port },
  };

  const passReport = await runTestAgent({
    id: `browser-enabled-state-pass-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent can prove a button starts disabled and becomes enabled after valid input.",
    acceptanceCriteria: ["Create account is disabled until an email is entered, then enabled."],
    requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
    projects: [{
      ...baseProject,
      browserChecks: [{
        name: "Submit button enabled state follows input",
        url: targetUrl,
        actions: [
          { type: "goto", url: targetUrl },
        ],
        assertions: [
          { assertion: "is_disabled", role: "button", name: "Create account", exact: true } as any,
          { type: "consoleNoErrors" },
          { type: "networkNoErrors" },
        ],
        screenshot: true,
      }, {
        name: "Submit button becomes enabled",
        url: targetUrl,
        actions: [
          { type: "goto", url: targetUrl },
          { type: "fill", label: "Email", value: "ada@example.test", exact: true },
        ],
        assertions: [
          { assertion: "clickable", role: "button", name: "Create account", exact: true } as any,
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
    id: `browser-enabled-state-fail-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent fails when a disabled button is incorrectly expected to be enabled.",
    acceptanceCriteria: ["Create account is enabled immediately."],
    requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
    projects: [{
      ...baseProject,
      browserChecks: [{
        name: "Submit button should not be immediately enabled",
        url: targetUrl,
        actions: [
          { type: "goto", url: targetUrl },
        ],
        assertions: [
          { type: "enabled", role: "button", name: "Create account", exact: true },
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

  const passDisabledBrowser = passReport.browserResults[0];
  const passEnabledBrowser = passReport.browserResults[1];
  const failBrowser = failReport.browserResults[0];
  const failEnabled = failBrowser?.steps.find(step => step.name === "assert:enabled");
  const pass = passReport.status === "passed"
    && passReport.browserResults.length === 2
    && passDisabledBrowser?.provider === "playwright"
    && passEnabledBrowser?.provider === "playwright"
    && passDisabledBrowser?.status === "passed"
    && passEnabledBrowser?.status === "passed"
    && passDisabledBrowser?.steps.some(step => step.name === "assert:disabled" && step.status === "passed" && String(step.detail || "").includes("Create account"))
    && passEnabledBrowser?.steps.some(step => step.name === "assert:enabled" && step.status === "passed" && String(step.detail || "").includes("Create account"))
    && failReport.status === "failed"
    && failBrowser?.provider === "playwright"
    && failBrowser?.status === "failed"
    && failEnabled?.status === "failed"
    && String(failEnabled?.error || "").includes("Expected target to be enabled")
    && failReport.requiredCheckCoverage.some(item => item.check === "browser_e2e" && item.status === "not_verified");

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    availability,
    passReport,
    failReport,
  };
}

export async function runTestAgentBrowserFocusStateSelfTest() {
  const availability = await checkPlaywrightAvailability();
  if (!availability.available) {
    return {
      pass: false,
      availability,
      reason: availability.reason,
    };
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-browser-focus-state-selftest-"));
  const passArtifactDir = path.join(dir, "pass-artifacts");
  const failArtifactDir = path.join(dir, "fail-artifacts");
  const port = await getFreePort();
  const targetUrl = `http://127.0.0.1:${port}/profile`;
  fs.writeFileSync(path.join(dir, "server.js"), [
    "const http = require('http');",
    "const html = `<!doctype html>",
    "<html><head><title>Focus Fixture</title></head>",
    "<body><main>",
    "<h1>Profile</h1>",
    "<label for=\"email\">Email</label>",
    "<input id=\"email\" name=\"email\" />",
    "<button type=\"button\" id=\"save\">Save</button>",
    "<p id=\"status\" role=\"status\">Waiting</p>",
    "<script>",
    "document.getElementById('save').addEventListener('click', () => { document.getElementById('status').textContent = 'Saved'; });",
    "</script>",
    "</main></body></html>`;",
    "http.createServer((req, res) => { res.writeHead(200, {'content-type':'text/html'}); res.end(html); }).listen(process.env.PORT);",
  ].join("\n"), "utf-8");

  const baseProject = {
    name: "browser-focus-state-self-test",
    workDir: dir,
    runCommand: `"${process.execPath}" server.js`,
    targetUrl,
    env: { PORT: port },
  };

  const passReport = await runTestAgent({
    id: `browser-focus-state-pass-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent can prove browser focus state before and after input.",
    acceptanceCriteria: ["Email is not focused on load and becomes focused after editing."],
    requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
    projects: [{
      ...baseProject,
      browserChecks: [{
        name: "Email starts unfocused",
        url: targetUrl,
        actions: [
          { type: "goto", url: targetUrl },
        ],
        assertions: [
          { assertion: "not_focused", label: "Email", exact: true } as any,
          { type: "consoleNoErrors" },
          { type: "networkNoErrors" },
        ],
        screenshot: true,
      }, {
        name: "Email becomes focused after fill",
        url: targetUrl,
        actions: [
          { type: "goto", url: targetUrl },
          { type: "fill", label: "Email", value: "ada@example.test", exact: true },
        ],
        assertions: [
          { assertion: "has_focus", label: "Email", exact: true } as any,
          { type: "inputValueEquals", label: "Email", value: "ada@example.test", exact: true },
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
    id: `browser-focus-state-fail-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent fails when focus is on the input but expected on another control.",
    acceptanceCriteria: ["Save is focused after editing Email."],
    requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
    projects: [{
      ...baseProject,
      browserChecks: [{
        name: "Save button is not focused after fill",
        url: targetUrl,
        actions: [
          { type: "goto", url: targetUrl },
          { type: "fill", label: "Email", value: "ada@example.test", exact: true },
        ],
        assertions: [
          { type: "focused", role: "button", name: "Save", exact: true, timeoutMs: 800 },
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

  const unfocusedBrowser = passReport.browserResults[0];
  const focusedBrowser = passReport.browserResults[1];
  const failBrowser = failReport.browserResults[0];
  const failFocus = failBrowser?.steps.find(step => step.name === "assert:focused");
  const pass = passReport.status === "passed"
    && passReport.browserResults.length === 2
    && unfocusedBrowser?.provider === "playwright"
    && focusedBrowser?.provider === "playwright"
    && unfocusedBrowser?.status === "passed"
    && focusedBrowser?.status === "passed"
    && unfocusedBrowser?.steps.some(step => step.name === "assert:notFocused" && step.status === "passed" && String(step.detail || "").includes("label=Email"))
    && focusedBrowser?.steps.some(step => step.name === "assert:focused" && step.status === "passed" && String(step.detail || "").includes("label=Email"))
    && focusedBrowser?.steps.some(step => step.name === "assert:inputValueEquals" && step.status === "passed" && String(step.detail || "").includes("label=Email"))
    && failReport.status === "failed"
    && failBrowser?.provider === "playwright"
    && failBrowser?.status === "failed"
    && failFocus?.status === "failed"
    && String(failFocus?.error || "").includes("Expected target to be focused")
    && failReport.requiredCheckCoverage.some(item => item.check === "browser_e2e" && item.status === "not_verified");

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    availability,
    passReport,
    failReport,
  };
}

export async function runTestAgentBrowserPresenceAssertionSelfTest() {
  const availability = await checkPlaywrightAvailability();
  if (!availability.available) {
    return {
      pass: false,
      availability,
      reason: availability.reason,
    };
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-browser-presence-selftest-"));
  const passArtifactDir = path.join(dir, "pass-artifacts");
  const failArtifactDir = path.join(dir, "fail-artifacts");
  const mcpArtifactDir = path.join(dir, "mcp-artifacts");
  const port = await getFreePort();
  const targetUrl = `http://127.0.0.1:${port}/presence`;
  fs.writeFileSync(path.join(dir, "server.js"), [
    "const http = require('http');",
    "const html = `<!doctype html>",
    "<html><head><title>Presence Fixture</title><link rel=\"icon\" href=\"data:,\"></head>",
    "<body><main>",
    "<h1>Presence checks</h1>",
    "<p id=\"status\">Ready</p>",
    "<div id=\"archived\" hidden>Archived marker</div>",
    "<ul id=\"tasks\"><li id=\"active\">Active task</li></ul>",
    "<button id=\"delete\" type=\"button\">Delete active task</button>",
    "<script>",
    "document.getElementById('delete').addEventListener('click', () => {",
    "  document.getElementById('active')?.remove();",
    "  document.getElementById('status').textContent = 'Deleted active task';",
    "});",
    "</script>",
    "</main></body></html>`;",
    "http.createServer((req, res) => { res.writeHead(200, {'content-type':'text/html'}); res.end(html); }).listen(process.env.PORT);",
  ].join("\n"), "utf-8");

  const baseProject = {
    name: "browser-presence-self-test",
    workDir: dir,
    runCommand: `"${process.execPath}" server.js`,
    targetUrl,
    env: { PORT: port },
  };

  const passReport = await runTestAgent({
    id: `browser-presence-pass-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent can distinguish DOM presence from visibility.",
    acceptanceCriteria: ["Hidden archived marker is still in the DOM and deleted active task is removed."],
    requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
    projects: [{
      ...baseProject,
      browserChecks: [{
        name: "DOM presence and absence are verified",
        url: targetUrl,
        actions: [
          { type: "goto", url: targetUrl },
          { type: "click", role: "button", name: "Delete active task", exact: true },
        ],
        assertions: [
          { assertion: "element_exists", selector: "#archived" } as any,
          { assertion: "element_removed", selector: "#active" } as any,
          { type: "text", text: "Deleted active task" },
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
    id: `browser-presence-fail-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent fails when an element remains in the DOM.",
    acceptanceCriteria: ["The archived marker should be removed."],
    requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
    projects: [{
      ...baseProject,
      browserChecks: [{
        name: "Wrong DOM absence is reported",
        url: targetUrl,
        actions: [
          { type: "goto", url: targetUrl },
        ],
        assertions: [
          { type: "notPresent", selector: "#archived", timeoutMs: 800 },
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
      if (toolName.endsWith("browser_snapshot")) return "Presence checks\nExisting item";
      if (toolName.endsWith("browser_console_messages")) return [];
      if (toolName.endsWith("browser_network_requests")) return [];
      return { ok: true };
    },
  });
  const mcpReport = await runTestAgent({
    id: `browser-presence-mcp-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent MCP presence behavior is explicit.",
    acceptanceCriteria: ["MCP can best-effort assert text presence but not selector-only DOM presence."],
    requiredChecks: ["browser_e2e"],
    projects: [{
      name: "browser-presence-mcp-self-test",
      workDir: process.cwd(),
      browserChecks: [{
        name: "MCP presence support boundary",
        url: "http://example.test/presence",
        actions: [{ type: "goto", url: "http://example.test/presence" }],
        assertions: [
          { type: "present", text: "Existing item" },
          { type: "notPresent", text: "Removed item" },
          { type: "notPresent", selector: "#selector-only" },
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
  const presentStep = passBrowser?.steps.find(step => step.name === "assert:present");
  const notPresentStep = passBrowser?.steps.find(step => step.name === "assert:notPresent");
  const failNotPresentStep = failBrowser?.steps.find(step => step.name === "assert:notPresent");
  const mcpPresentStep = mcpBrowser?.steps.find(step => step.name === "playwright:present");
  const mcpTextNotPresentStep = mcpBrowser?.steps.find(step => step.name === "playwright:notPresent" && step.status === "passed");
  const mcpSelectorStep = mcpBrowser?.steps.find(step => step.name === "playwright:notPresent" && step.status === "failed");
  const pass = passReport.status === "passed"
    && passBrowser?.provider === "playwright"
    && passBrowser?.status === "passed"
    && presentStep?.status === "passed"
    && String(presentStep?.detail || "").includes("#archived")
    && notPresentStep?.status === "passed"
    && String(notPresentStep?.detail || "").includes("#active")
    && passBrowser?.pageTextPreview?.includes("Deleted active task")
    && failReport.status === "failed"
    && failBrowser?.provider === "playwright"
    && failBrowser?.status === "failed"
    && failNotPresentStep?.status === "failed"
    && String(failNotPresentStep?.error || "").includes("actual count=1")
    && mcpReport.status === "failed"
    && mcpBrowser?.provider === "mcp"
    && mcpPresentStep?.status === "passed"
    && mcpTextNotPresentStep?.status === "passed"
    && mcpSelectorStep?.status === "failed"
    && String(mcpSelectorStep?.error || "").includes("selector-only DOM presence")
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

export async function runTestAgentBrowserElementCountSelfTest() {
  const availability = await checkPlaywrightAvailability();
  if (!availability.available) {
    return {
      pass: false,
      availability,
      reason: availability.reason,
    };
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-browser-element-count-selftest-"));
  const passArtifactDir = path.join(dir, "pass-artifacts");
  const failArtifactDir = path.join(dir, "fail-artifacts");
  const port = await getFreePort();
  const targetUrl = `http://127.0.0.1:${port}/tasks`;
  fs.writeFileSync(path.join(dir, "server.js"), [
    "const http = require('http');",
    "const html = `<!doctype html>",
    "<html><head><title>Element Count Fixture</title></head>",
    "<body><main>",
    "<h1>Tasks</h1>",
    "<label for=\"task\">Task</label>",
    "<input id=\"task\" name=\"task\" />",
    "<button type=\"button\" id=\"add\">Add task</button>",
    "<ul aria-label=\"Task list\" id=\"tasks\"></ul>",
    "<script>",
    "document.getElementById('add').addEventListener('click', () => {",
    "  const input = document.getElementById('task');",
    "  if (!input.value) return;",
    "  const item = document.createElement('li');",
    "  item.textContent = input.value;",
    "  document.getElementById('tasks').appendChild(item);",
    "  input.value = '';",
    "});",
    "</script>",
    "</main></body></html>`;",
    "http.createServer((req, res) => { res.writeHead(200, {'content-type':'text/html'}); res.end(html); }).listen(process.env.PORT);",
  ].join("\n"), "utf-8");

  const baseProject = {
    name: "browser-element-count-self-test",
    workDir: dir,
    runCommand: `"${process.execPath}" server.js`,
    targetUrl,
    env: { PORT: port },
  };

  const passReport = await runTestAgent({
    id: `browser-element-count-pass-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent can prove list item counts before and after adding tasks.",
    acceptanceCriteria: ["The task list starts empty and has two items after adding two tasks."],
    requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
    projects: [{
      ...baseProject,
      browserChecks: [{
        name: "Task list starts empty",
        url: targetUrl,
        actions: [
          { type: "goto", url: targetUrl },
        ],
        assertions: [
          { assertion: "element_count", role: "listitem", count: 0 } as any,
          { type: "consoleNoErrors" },
          { type: "networkNoErrors" },
        ],
        screenshot: true,
      }, {
        name: "Task list has two items",
        url: targetUrl,
        actions: [
          { type: "goto", url: targetUrl },
          { type: "fill", label: "Task", value: "First task", exact: true },
          { type: "click", role: "button", name: "Add task", exact: true },
          { type: "fill", label: "Task", value: "Second task", exact: true },
          { type: "click", role: "button", name: "Add task", exact: true },
        ],
        assertions: [
          { type: "text", text: "Second task" },
          { type: "elementCountEquals", role: "listitem", expectedCount: 2 },
          { assertion: "count_at_least", role: "listitem", minCount: 2 } as any,
          { assertion: "count_at_most", role: "listitem", maxCount: 2 } as any,
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
    id: `browser-element-count-fail-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent fails when a list has fewer items than expected.",
    acceptanceCriteria: ["The task list has two items after adding one task."],
    requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
    projects: [{
      ...baseProject,
      browserChecks: [{
        name: "Task list should not have two items after one add",
        url: targetUrl,
        actions: [
          { type: "goto", url: targetUrl },
          { type: "fill", label: "Task", value: "Only task", exact: true },
          { type: "click", role: "button", name: "Add task", exact: true },
        ],
        assertions: [
          { type: "text", text: "Only task" },
          { type: "elementCountEquals", role: "listitem", count: 2 },
          { type: "elementCountAtMost", role: "listitem", maxCount: 0 },
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

  const emptyBrowser = passReport.browserResults[0];
  const twoItemBrowser = passReport.browserResults[1];
  const failBrowser = failReport.browserResults[0];
  const failCount = failBrowser?.steps.find(step => step.name === "assert:elementCountEquals");
  const failAtMost = failBrowser?.steps.find(step => step.name === "assert:elementCountAtMost");
  const pass = passReport.status === "passed"
    && passReport.browserResults.length === 2
    && emptyBrowser?.provider === "playwright"
    && twoItemBrowser?.provider === "playwright"
    && emptyBrowser?.status === "passed"
    && twoItemBrowser?.status === "passed"
    && emptyBrowser?.steps.some(step => step.name === "assert:elementCountEquals" && step.status === "passed" && String(step.detail || "").includes("expected count=0"))
    && twoItemBrowser?.steps.some(step => step.name === "assert:elementCountEquals" && step.status === "passed" && String(step.detail || "").includes("expected count=2"))
    && twoItemBrowser?.steps.some(step => step.name === "assert:elementCountAtLeast" && step.status === "passed" && String(step.detail || "").includes("min count=2"))
    && twoItemBrowser?.steps.some(step => step.name === "assert:elementCountAtMost" && step.status === "passed" && String(step.detail || "").includes("max count=2"))
    && failReport.status === "failed"
    && failBrowser?.provider === "playwright"
    && failBrowser?.status === "failed"
    && failCount?.status === "failed"
    && String(failCount?.error || "").includes("actual count=1")
    && failAtMost?.status === "failed"
    && String(failAtMost?.error || "").includes("actual count=1")
    && failReport.requiredCheckCoverage.some(item => item.check === "browser_e2e" && item.status === "not_verified");

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    availability,
    passReport,
    failReport,
  };
}

export async function runTestAgentBrowserDialogAssertionSelfTest() {
  const availability = await checkPlaywrightAvailability();
  if (!availability.available) {
    return {
      pass: false,
      availability,
      reason: availability.reason,
    };
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-browser-dialog-assertion-selftest-"));
  const passArtifactDir = path.join(dir, "pass-artifacts");
  const failArtifactDir = path.join(dir, "fail-artifacts");
  const port = await getFreePort();
  const targetUrl = `http://127.0.0.1:${port}/dialogs`;
  fs.writeFileSync(path.join(dir, "server.js"), [
    "const http = require('http');",
    "const html = `<!doctype html>",
    "<html><head><title>Dialog Fixture</title></head>",
    "<body><main>",
    "<h1>Dialog verification</h1>",
    "<button type=\"button\" id=\"alertButton\">Show alert</button>",
    "<button type=\"button\" id=\"confirmButton\">Show confirm</button>",
    "<button type=\"button\" id=\"promptButton\">Show prompt</button>",
    "<p id=\"status\" role=\"status\">Ready</p>",
    "<script>",
    "document.getElementById('alertButton').addEventListener('click', () => { alert('Saved profile dialog'); document.getElementById('status').textContent = 'Alert handled'; });",
    "document.getElementById('confirmButton').addEventListener('click', () => { const ok = confirm('Confirm shipping dialog'); document.getElementById('status').textContent = ok ? 'Confirm accepted' : 'Confirm dismissed'; });",
    "document.getElementById('promptButton').addEventListener('click', () => { const value = prompt('Name prompt dialog', 'Ada'); document.getElementById('status').textContent = 'Prompt handled ' + String(value || ''); });",
    "</script>",
    "</main></body></html>`;",
    "http.createServer((req, res) => { res.writeHead(200, {'content-type':'text/html'}); res.end(html); }).listen(process.env.PORT);",
  ].join("\n"), "utf-8");

  const baseProject = {
    name: "browser-dialog-assertion-self-test",
    workDir: dir,
    runCommand: `"${process.execPath}" server.js`,
    targetUrl,
    env: { PORT: port },
  };

  const passReport = await runTestAgent({
    id: `browser-dialog-pass-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent can prove native browser dialogs appear during a real browser flow.",
    acceptanceCriteria: ["Clicking dialog buttons shows alert, confirm, and prompt messages."],
    requiredChecks: ["browser_e2e", "console_errors"],
    projects: [{
      ...baseProject,
      browserChecks: [{
        name: "Dialog messages are observable",
        url: targetUrl,
        actions: [
          { type: "goto", url: targetUrl },
          { type: "click", role: "button", name: "Show alert", exact: true },
          { type: "click", role: "button", name: "Show confirm", exact: true },
          { type: "click", role: "button", name: "Show prompt", exact: true },
        ],
        assertions: [
          { assertion: "alert_message_includes", value: "Saved profile", dialog_type: "alert" } as any,
          { assertion: "dialog_type_equals", value: "confirm" } as any,
          { type: "dialogMessageIncludes", text: "Name prompt", dialogType: "prompt" },
          { type: "dialogAppeared", dialogType: "prompt" },
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
    id: `browser-dialog-fail-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent fails when a browser dialog message does not match.",
    acceptanceCriteria: ["Clicking alert shows an unrelated message."],
    requiredChecks: ["browser_e2e", "console_errors"],
    projects: [{
      ...baseProject,
      browserChecks: [{
        name: "Dialog message mismatch is reported",
        url: targetUrl,
        actions: [
          { type: "goto", url: targetUrl },
          { type: "click", role: "button", name: "Show alert", exact: true },
        ],
        assertions: [
          { type: "dialogMessageIncludes", text: "Unrelated message", dialogType: "alert", timeoutMs: 800 },
          { type: "consoleNoErrors" },
          { type: "networkNoErrors" },
        ],
      }],
    }],
    options: {
      artifactDir: failArtifactDir,
      browserProvider: "playwright",
      collectBrowserArtifacts: false,
    },
  }, { browserProvider: "playwright" });

  const browser = passReport.browserResults[0];
  const failBrowser = failReport.browserResults[0];
  const failDialog = failBrowser?.steps.find(step => step.name === "assert:dialogMessageIncludes");
  const dialogLog = browser?.dialogLogPath && fs.existsSync(browser.dialogLogPath) ? fs.readFileSync(browser.dialogLogPath, "utf-8") : "";
  const pass = passReport.status === "passed"
    && browser?.provider === "playwright"
    && browser?.status === "passed"
    && browser?.steps.some(step => step.name === "assert:dialogMessageIncludes" && step.status === "passed" && String(step.detail || "").includes("dialogType=alert"))
    && browser?.steps.some(step => step.name === "assert:dialogTypeEquals" && step.status === "passed" && String(step.detail || "").includes("dialogType=confirm"))
    && browser?.steps.some(step => step.name === "assert:dialogAppeared" && step.status === "passed" && String(step.detail || "").includes("dialogType=prompt"))
    && (browser?.dialogMessages || []).some(item => item.includes("dialog alert") && item.includes("accepted=yes"))
    && (browser?.dialogMessages || []).some(item => item.includes("dialog confirm") && item.includes("accepted=yes"))
    && (browser?.dialogMessages || []).some(item => item.includes("dialog prompt") && item.includes("accepted=yes"))
    && !!browser?.dialogLogPath
    && dialogLog.includes("Saved profile dialog")
    && dialogLog.includes("Confirm shipping dialog")
    && dialogLog.includes("Name prompt dialog")
    && passReport.requiredCheckCoverage.some(item => item.check === "browser_e2e" && item.status === "verified")
    && failReport.status === "failed"
    && failBrowser?.provider === "playwright"
    && failBrowser?.status === "failed"
    && failDialog?.status === "failed"
    && String(failDialog?.error || "").includes("Observed dialogs")
    && failReport.requiredCheckCoverage.some(item => item.check === "browser_e2e" && item.status === "not_verified");

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    availability,
    passReport,
    failReport,
    dialogLog,
  };
}

export async function runTestAgentBrowserPopupAssertionSelfTest() {
  const availability = await checkPlaywrightAvailability();
  if (!availability.available) {
    return {
      pass: false,
      availability,
      reason: availability.reason,
    };
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-browser-popup-assertion-selftest-"));
  const passArtifactDir = path.join(dir, "pass-artifacts");
  const failArtifactDir = path.join(dir, "fail-artifacts");
  const port = await getFreePort();
  const targetUrl = `http://127.0.0.1:${port}/app`;
  fs.writeFileSync(path.join(dir, "server.js"), [
    "const http = require('http');",
    "const app = `<!doctype html>",
    "<html><head><title>Popup App Fixture</title></head>",
    "<body><main>",
    "<h1>Popup App</h1>",
    "<a id=\"help\" href=\"/help\" target=\"_blank\" rel=\"noopener\">Open help center</a>",
    "<p role=\"status\">Ready to open help</p>",
    "</main></body></html>`;",
    "const help = `<!doctype html>",
    "<html><head><title>Help Center Popup</title></head>",
    "<body><main>",
    "<h1>Help Center Popup</h1>",
    "<p>Support article for CCM TestAgent popup verification.</p>",
    "</main></body></html>`;",
    "http.createServer((req, res) => {",
    "  const route = String(req.url || '/').split('?')[0];",
    "  res.writeHead(200, {'content-type':'text/html'});",
    "  res.end(route === '/help' ? help : app);",
    "}).listen(process.env.PORT);",
  ].join("\n"), "utf-8");

  const baseProject = {
    name: "browser-popup-assertion-self-test",
    workDir: dir,
    runCommand: `"${process.execPath}" server.js`,
    targetUrl,
    env: { PORT: port },
  };

  const passReport = await runTestAgent({
    id: `browser-popup-pass-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent can prove a real browser interaction opens a help popup page.",
    acceptanceCriteria: ["Clicking Open help center opens a popup at /help with the Help Center Popup content."],
    requiredChecks: ["browser_e2e", "console_errors"],
    projects: [{
      ...baseProject,
      browserChecks: [{
        name: "Help center popup opens",
        url: targetUrl,
        actions: [
          { type: "goto", url: targetUrl },
          { type: "click", role: "link", name: "Open help center", exact: true },
        ],
        assertions: [
          { assertion: "popup_opened" } as any,
          { assertion: "popup_url_includes", url: "/help" } as any,
          { assertion: "popup_title_includes", title: "Help Center" } as any,
          { assertion: "popup_text_includes", text: "Support article for CCM TestAgent" } as any,
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
    id: `browser-popup-fail-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent fails when a popup does not contain expected text.",
    acceptanceCriteria: ["Clicking Open help center opens a popup containing Billing Console."],
    requiredChecks: ["browser_e2e", "console_errors"],
    projects: [{
      ...baseProject,
      browserChecks: [{
        name: "Wrong popup text is reported",
        url: targetUrl,
        actions: [
          { type: "goto", url: targetUrl },
          { type: "click", role: "link", name: "Open help center", exact: true },
        ],
        assertions: [
          { type: "popupTextIncludes", text: "Billing Console", timeoutMs: 800 },
          { type: "consoleNoErrors" },
          { type: "networkNoErrors" },
        ],
      }],
    }],
    options: {
      artifactDir: failArtifactDir,
      browserProvider: "playwright",
      collectBrowserArtifacts: false,
    },
  }, { browserProvider: "playwright" });

  const passBrowser = passReport.browserResults[0];
  const failBrowser = failReport.browserResults[0];
  const popupLog = passBrowser?.popupLogPath && fs.existsSync(passBrowser.popupLogPath) ? fs.readFileSync(passBrowser.popupLogPath, "utf-8") : "";
  const manifestPath = String((passReport.metadata.artifactFiles as any)?.manifestPath || "");
  const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, "utf-8")) : null;
  const failPopup = failBrowser?.steps.find(step => step.name === "assert:popupTextIncludes");
  const pass = passReport.status === "passed"
    && passBrowser?.provider === "playwright"
    && passBrowser?.status === "passed"
    && passBrowser?.steps.some(step => step.name === "assert:popupOpened" && step.status === "passed")
    && passBrowser?.steps.some(step => step.name === "assert:popupUrlIncludes" && step.status === "passed" && String(step.detail || "").includes("expected URL substring length=5"))
    && passBrowser?.steps.some(step => step.name === "assert:popupTitleIncludes" && step.status === "passed" && String(step.detail || "").includes("expected title substring length=11"))
    && passBrowser?.steps.some(step => step.name === "assert:popupTextIncludes" && step.status === "passed" && String(step.detail || "").includes("expected text substring length=33"))
    && (passBrowser?.popupMessages || []).some(item => item.includes("/help") && item.includes("Help Center Popup"))
    && !!passBrowser?.popupLogPath
    && popupLog.includes("/help")
    && popupLog.includes("Support article for CCM TestAgent popup verification")
    && manifest?.files?.some((item: any) => item.type === "browser_popup_log" && item.path === passBrowser.popupLogPath)
    && passReport.requiredCheckCoverage.some(item => item.check === "browser_e2e" && item.status === "verified")
    && passReport.acceptanceCoverage.every(item => item.status === "verified")
    && failReport.status === "failed"
    && failBrowser?.provider === "playwright"
    && failBrowser?.status === "failed"
    && failPopup?.status === "failed"
    && String(failPopup?.error || "").includes("Observed popups: 1")
    && !String(failPopup?.error || "").includes("Support article")
    && !String(failPopup?.error || "").includes("Billing Console")
    && failReport.requiredCheckCoverage.some(item => item.check === "browser_e2e" && item.status === "not_verified");

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    availability,
    passReport,
    failReport,
    popupLog,
    manifest,
  };
}

export async function runTestAgentBrowserTableAssertionSelfTest() {
  const availability = await checkPlaywrightAvailability();
  if (!availability.available) {
    return {
      pass: false,
      availability,
      reason: availability.reason,
    };
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-browser-table-assertion-selftest-"));
  const passArtifactDir = path.join(dir, "pass-artifacts");
  const failArtifactDir = path.join(dir, "fail-artifacts");
  const port = await getFreePort();
  const targetUrl = `http://127.0.0.1:${port}/orders`;
  fs.writeFileSync(path.join(dir, "server.js"), [
    "const http = require('http');",
    "const html = `<!doctype html>",
    "<html><head><title>Orders Table Fixture</title></head>",
    "<body><main>",
    "<h1>Orders</h1>",
    "<button type=\"button\" id=\"markPaid\">Mark Grace paid</button>",
    "<table id=\"orders\" aria-label=\"Orders table\">",
    "<thead><tr><th>Order</th><th>Customer</th><th>Status</th><th>Total</th></tr></thead>",
    "<tbody>",
    "<tr><td>A-100</td><td>Ada Lovelace</td><td>Shipped</td><td>$42.00</td></tr>",
    "<tr><td>B-200</td><td>Grace Hopper</td><td id=\"graceStatus\">Draft</td><td>$18.50</td></tr>",
    "</tbody>",
    "</table>",
    "<p role=\"status\" id=\"status\">Ready</p>",
    "<script>",
    "document.getElementById('markPaid').addEventListener('click', () => {",
    "  document.getElementById('graceStatus').textContent = 'Paid';",
    "  document.getElementById('status').textContent = 'Grace order paid';",
    "});",
    "</script>",
    "</main></body></html>`;",
    "http.createServer((req, res) => { res.writeHead(200, {'content-type':'text/html'}); res.end(html); }).listen(process.env.PORT);",
  ].join("\n"), "utf-8");

  const baseProject = {
    name: "browser-table-assertion-self-test",
    workDir: dir,
    runCommand: `"${process.execPath}" server.js`,
    targetUrl,
    env: { PORT: port },
  };

  const passReport = await runTestAgent({
    id: `browser-table-pass-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent can prove table row and cell content after a real browser interaction.",
    acceptanceCriteria: ["Orders table shows Ada shipped and Grace paid after clicking the payment action."],
    requiredChecks: ["browser_e2e", "console_errors"],
    projects: [{
      ...baseProject,
      browserChecks: [{
        name: "Order table data is observable",
        url: targetUrl,
        actions: [
          { type: "goto", url: targetUrl },
          { type: "click", role: "button", name: "Mark Grace paid", exact: true },
        ],
        assertions: [
          { assertion: "table_row_includes", table_selector: "#orders", row_text: "A-100", values: ["Ada Lovelace", "Shipped"] } as any,
          { assertion: "table_cell_text_equals", table: "#orders", row: "B-200", header: "Status", value: "Paid" } as any,
          { assertion: "table_cell_includes", table: "#orders", row: "B-200", header: "Total", value: "18.50" } as any,
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
    id: `browser-table-fail-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent fails when a table cell has the wrong value.",
    acceptanceCriteria: ["Grace order status is shipped before payment."],
    requiredChecks: ["browser_e2e", "console_errors"],
    projects: [{
      ...baseProject,
      browserChecks: [{
        name: "Order table mismatch is reported",
        url: targetUrl,
        actions: [
          { type: "goto", url: targetUrl },
        ],
        assertions: [
          { type: "tableCellTextEquals", tableSelector: "#orders", rowText: "B-200", columnName: "Status", value: "Shipped", timeoutMs: 800 },
          { type: "consoleNoErrors" },
          { type: "networkNoErrors" },
        ],
      }],
    }],
    options: {
      artifactDir: failArtifactDir,
      browserProvider: "playwright",
      collectBrowserArtifacts: false,
    },
  }, { browserProvider: "playwright" });

  const browser = passReport.browserResults[0];
  const failBrowser = failReport.browserResults[0];
  const failCell = failBrowser?.steps.find(step => step.name === "assert:tableCellTextEquals");
  const pass = passReport.status === "passed"
    && browser?.provider === "playwright"
    && browser?.status === "passed"
    && browser?.steps.some(step => step.name === "assert:tableRowIncludes" && step.status === "passed" && String(step.detail || "").includes("expected text count=2"))
    && browser?.steps.some(step => step.name === "assert:tableCellTextEquals" && step.status === "passed" && String(step.detail || "").includes("column=Status"))
    && browser?.steps.some(step => step.name === "assert:tableCellTextIncludes" && step.status === "passed" && String(step.detail || "").includes("column=Total"))
    && browser?.pageTextPreview?.includes("Grace order paid")
    && passReport.requiredCheckCoverage.some(item => item.check === "browser_e2e" && item.status === "verified")
    && passReport.acceptanceCoverage.every(item => item.status === "verified")
    && failReport.status === "failed"
    && failBrowser?.provider === "playwright"
    && failBrowser?.status === "failed"
    && failCell?.status === "failed"
    && String(failCell?.error || "").includes("Cell text did not equal")
    && !String(failCell?.error || "").includes("Draft")
    && !String(failCell?.error || "").includes("Shipped")
    && failReport.requiredCheckCoverage.some(item => item.check === "browser_e2e" && item.status === "not_verified");

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    availability,
    passReport,
    failReport,
  };
}

export async function runTestAgentBrowserDragToActionSelfTest() {
  const availability = await checkPlaywrightAvailability();
  if (!availability.available) {
    return {
      pass: false,
      availability,
      reason: availability.reason,
    };
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-browser-drag-to-selftest-"));
  const passArtifactDir = path.join(dir, "pass-artifacts");
  const failArtifactDir = path.join(dir, "fail-artifacts");
  const port = await getFreePort();
  const targetUrl = `http://127.0.0.1:${port}/board`;
  fs.writeFileSync(path.join(dir, "server.js"), [
    "const http = require('http');",
    "const html = `<!doctype html>",
    "<html><head><title>Drag Board Fixture</title>",
    "<style>",
    ".board { display: flex; gap: 24px; font-family: sans-serif; }",
    ".column { width: 260px; min-height: 180px; border: 1px solid #888; padding: 12px; }",
    ".card { padding: 10px; margin: 8px 0; border: 1px solid #333; background: #fff; cursor: grab; }",
    "</style></head>",
    "<body><main>",
    "<h1>Drag board</h1>",
    "<div class=\"board\">",
    "<section class=\"column\" data-testid=\"todo-column\" aria-label=\"Todo column\"><h2>Todo</h2>",
    "<article class=\"card\" draggable=\"true\" data-testid=\"task-card\" data-task-id=\"ship-testagent\">Ship TestAgent drag support</article>",
    "</section>",
    "<section class=\"column\" data-testid=\"done-column\" aria-label=\"Done column\"><h2>Done</h2>",
    "<div data-testid=\"done-list\" aria-label=\"Done tasks\"></div>",
    "</section>",
    "</div>",
    "<p role=\"status\" id=\"status\">Waiting for drag</p>",
    "<script>",
    "const card = document.querySelector('[data-testid=task-card]');",
    "const doneColumn = document.querySelector('[data-testid=done-column]');",
    "card.addEventListener('dragstart', event => {",
    "  event.dataTransfer.setData('text/plain', card.dataset.taskId);",
    "  event.dataTransfer.effectAllowed = 'move';",
    "});",
    "doneColumn.addEventListener('dragover', event => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; });",
    "doneColumn.addEventListener('drop', event => {",
    "  event.preventDefault();",
    "  if (event.dataTransfer.getData('text/plain') !== 'ship-testagent') return;",
    "  document.querySelector('[data-testid=done-list]').appendChild(card);",
    "  document.getElementById('status').textContent = 'Moved Ship TestAgent drag support to Done';",
    "});",
    "</script>",
    "</main></body></html>`;",
    "http.createServer((req, res) => { res.writeHead(200, {'content-type':'text/html'}); res.end(html); }).listen(process.env.PORT);",
  ].join("\n"), "utf-8");

  const baseProject = {
    name: "browser-drag-to-self-test",
    workDir: dir,
    runCommand: `"${process.execPath}" server.js`,
    targetUrl,
    env: { PORT: port },
  };

  const passReport = await runTestAgent({
    id: `browser-drag-to-pass-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent can perform real browser drag and drop on a board.",
    acceptanceCriteria: ["Dragging the TestAgent task to Done moves the card and shows the moved status."],
    requiredChecks: ["browser_e2e", "console_errors"],
    projects: [{
      ...baseProject,
      browserChecks: [{
        name: "Task card can be dragged to Done",
        url: targetUrl,
        actions: [
          { type: "goto", url: targetUrl },
          { action: "drag_to", text: "Ship TestAgent drag support", destination_test_id: "done-column" } as any,
        ],
        assertions: [
          { type: "text", text: "Moved Ship TestAgent drag support to Done" },
          { type: "elementTextIncludes", testId: "done-list", text: "Ship TestAgent drag support" },
          { type: "elementCountEquals", testId: "task-card", count: 1 },
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
    id: `browser-drag-to-fail-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent fails when a drag destination cannot be found.",
    acceptanceCriteria: ["Dragging the TestAgent task to a missing destination is reported as failed."],
    requiredChecks: ["browser_e2e", "console_errors"],
    projects: [{
      ...baseProject,
      browserChecks: [{
        name: "Missing drag target fails",
        url: targetUrl,
        actions: [
          { type: "goto", url: targetUrl },
          { type: "dragTo", text: "Ship TestAgent drag support", destinationTestId: "missing-column", timeoutMs: 800 },
        ],
        assertions: [
          { type: "consoleNoErrors" },
          { type: "networkNoErrors" },
        ],
      }],
    }],
    options: {
      artifactDir: failArtifactDir,
      browserProvider: "playwright",
      collectBrowserArtifacts: false,
    },
  }, { browserProvider: "playwright" });

  const browser = passReport.browserResults[0];
  const failBrowser = failReport.browserResults[0];
  const failDrag = failBrowser?.steps.find(step => step.name === "action:dragTo");
  const pass = passReport.status === "passed"
    && browser?.provider === "playwright"
    && browser?.status === "passed"
    && browser?.steps.some(step => step.name === "action:dragTo" && step.status === "passed" && String(step.detail || "").includes("done-column"))
    && browser?.steps.some(step => step.name === "assert:elementTextIncludes" && step.status === "passed" && String(step.detail || "").includes("testId=done-list"))
    && browser?.pageTextPreview?.includes("Moved Ship TestAgent drag support to Done")
    && passReport.requiredCheckCoverage.some(item => item.check === "browser_e2e" && item.status === "verified")
    && passReport.acceptanceCoverage.every(item => item.status === "verified")
    && failReport.status === "failed"
    && failBrowser?.provider === "playwright"
    && failBrowser?.status === "failed"
    && failDrag?.status === "failed"
    && String(failDrag?.detail || "").includes("missing-column")
    && failReport.requiredCheckCoverage.some(item => item.check === "browser_e2e" && item.status === "not_verified");

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    availability,
    passReport,
    failReport,
  };
}

export async function runTestAgentBrowserHoverActionSelfTest() {
  const availability = await checkPlaywrightAvailability();
  if (!availability.available) {
    return {
      pass: false,
      availability,
      reason: availability.reason,
    };
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-browser-hover-action-selftest-"));
  const passArtifactDir = path.join(dir, "pass-artifacts");
  const failArtifactDir = path.join(dir, "fail-artifacts");
  const port = await getFreePort();
  const targetUrl = `http://127.0.0.1:${port}/menu`;
  fs.writeFileSync(path.join(dir, "server.js"), [
    "const http = require('http');",
    "const html = `<!doctype html>",
    "<html><head><title>Hover Menu Fixture</title>",
    "<style>",
    "body { font-family: sans-serif; padding: 32px; }",
    "#tools-menu { display: none; margin-top: 8px; padding: 12px; border: 1px solid #555; width: 220px; }",
    "#tools:hover + #tools-menu, #tools-menu:hover { display: block; }",
    "[role=menuitem] { display: block; padding: 8px; }",
    "</style></head>",
    "<body><main>",
    "<h1>Hover tools</h1>",
    "<button id=\"tools\" type=\"button\">Tools</button>",
    "<div id=\"tools-menu\" role=\"menu\" aria-label=\"Tools menu\">",
    "<button type=\"button\" role=\"menuitem\">Export report</button>",
    "<button type=\"button\" role=\"menuitem\">Archive report</button>",
    "</div>",
    "<p role=\"status\">Menu waits for hover</p>",
    "</main></body></html>`;",
    "http.createServer((req, res) => { res.writeHead(200, {'content-type':'text/html'}); res.end(html); }).listen(process.env.PORT);",
  ].join("\n"), "utf-8");

  const baseProject = {
    name: "browser-hover-action-self-test",
    workDir: dir,
    runCommand: `"${process.execPath}" server.js`,
    targetUrl,
    env: { PORT: port },
  };

  const passReport = await runTestAgent({
    id: `browser-hover-pass-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent can perform a real browser hover before checking hover-only UI.",
    acceptanceCriteria: ["Hovering Tools reveals the Export report menu item."],
    requiredChecks: ["browser_e2e", "browser_hover", "browser_visibility", "console_errors"],
    projects: [{
      ...baseProject,
      browserChecks: [{
        name: "Tools hover reveals export menu item",
        url: targetUrl,
        actions: [
          { type: "goto", url: targetUrl },
          { type: "hover", role: "button", name: "Tools", exact: true },
        ],
        assertions: [
          { type: "visible", role: "menuitem", name: "Export report", exact: true },
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
    id: `browser-hover-fail-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent fails when a hover target cannot be found.",
    acceptanceCriteria: ["Hovering a missing Tools button should be reported as failed."],
    requiredChecks: ["browser_e2e", "browser_hover", "console_errors"],
    projects: [{
      ...baseProject,
      browserChecks: [{
        name: "Missing hover target fails",
        url: targetUrl,
        actions: [
          { type: "goto", url: targetUrl },
          { type: "hover", role: "button", name: "Missing tools", exact: true, timeoutMs: 800 },
        ],
        assertions: [
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

  const browser = passReport.browserResults[0];
  const failBrowser = failReport.browserResults[0];
  const failHover = failBrowser?.steps.find(step => step.name === "action:hover");
  const passByCheck = new Map(passReport.requiredCheckCoverage.map(item => [item.check, item]));
  const failByCheck = new Map(failReport.requiredCheckCoverage.map(item => [item.check, item]));
  const pass = passReport.status === "passed"
    && browser?.provider === "playwright"
    && browser?.status === "passed"
    && browser?.steps.some(step => step.name === "action:hover" && step.status === "passed" && String(step.detail || "").includes("Tools"))
    && browser?.steps.some(step => step.name === "assert:visible" && step.status === "passed" && String(step.detail || "").includes("Export report"))
    && passByCheck.get("browser_hover")?.status === "verified"
    && passByCheck.get("browser_hover")?.evidence.some(item => item.includes("action:hover"))
    && passByCheck.get("browser_visibility")?.status === "verified"
    && failReport.status === "failed"
    && failBrowser?.provider === "playwright"
    && failBrowser?.status === "failed"
    && failHover?.status === "failed"
    && String(failHover?.detail || "").includes("Missing tools")
    && failByCheck.get("browser_hover")?.status === "not_verified";

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    availability,
    passReport,
    failReport,
  };
}

export async function runTestAgentBrowserHistoryNavigationActionSelfTest() {
  const availability = await checkPlaywrightAvailability();
  if (!availability.available) {
    return {
      pass: false,
      availability,
      reason: availability.reason,
    };
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-browser-history-action-selftest-"));
  const artifactDir = path.join(dir, "artifacts");
  const port = await getFreePort();
  const oneUrl = `http://127.0.0.1:${port}/one`;
  fs.writeFileSync(path.join(dir, "server.js"), [
    "const http = require('http');",
    "const one = '<!doctype html><title>Page One</title><main><h1>Page One</h1><a href=\"/two\">Open two</a><p role=\"status\">One ready</p></main>';",
    "const two = '<!doctype html><title>Page Two</title><main><h1>Page Two</h1><p role=\"status\">Two ready after history</p></main>';",
    "http.createServer((req, res) => {",
    "  const route = String(req.url || '/').split('?')[0];",
    "  res.writeHead(200, {'content-type':'text/html'});",
    "  res.end(route === '/two' ? two : one);",
    "}).listen(process.env.PORT);",
  ].join("\n"), "utf-8");

  const report = await runTestAgent({
    id: `browser-history-action-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent can perform browser history navigation and reload actions.",
    acceptanceCriteria: ["Back, forward, and reload keep the browser on the expected pages."],
    requiredChecks: ["browser_e2e", "browser_history", "browser_reload", "browser_navigation", "console_errors"],
    projects: [{
      name: "browser-history-action-self-test",
      workDir: dir,
      runCommand: `"${process.execPath}" server.js`,
      targetUrl: oneUrl,
      env: { PORT: port },
      browserChecks: [{
        name: "History back forward reload flow",
        url: oneUrl,
        actions: [
          { type: "goto", url: oneUrl },
          { type: "click", role: "link", name: "Open two", exact: true },
          { type: "goBack" },
          { type: "goForward" },
          { type: "reload" },
        ],
        assertions: [
          { type: "urlIncludes", text: "/two" },
          { type: "titleEquals", title: "Page Two" },
          { type: "text", text: "Two ready after history" },
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
  const byCheck = new Map(report.requiredCheckCoverage.map(item => [item.check, item]));
  const pass = report.status === "passed"
    && browser?.provider === "playwright"
    && browser?.status === "passed"
    && browser?.steps.some(step => step.name === "action:goBack" && step.status === "passed")
    && browser?.steps.some(step => step.name === "action:goForward" && step.status === "passed")
    && browser?.steps.some(step => step.name === "action:reload" && step.status === "passed")
    && browser?.steps.some(step => step.name === "assert:urlIncludes" && step.status === "passed" && String(step.detail || "").includes("/two"))
    && browser?.finalUrl?.includes("/two")
    && byCheck.get("browser_history")?.status === "verified"
    && byCheck.get("browser_reload")?.status === "verified"
    && byCheck.get("browser_navigation")?.status === "verified";

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    availability,
    report,
  };
}

export async function runTestAgentBrowserScrollActionSelfTest() {
  const availability = await checkPlaywrightAvailability();
  if (!availability.available) {
    return {
      pass: false,
      availability,
      reason: availability.reason,
    };
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-browser-scroll-action-selftest-"));
  const passArtifactDir = path.join(dir, "pass-artifacts");
  const failArtifactDir = path.join(dir, "fail-artifacts");
  const port = await getFreePort();
  const targetUrl = `http://127.0.0.1:${port}/landing`;
  fs.writeFileSync(path.join(dir, "server.js"), [
    "const http = require('http');",
    "const html = `<!doctype html>",
    "<html><head><title>Scroll Fixture</title><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />",
    "<style>",
    "body { margin: 0; font-family: sans-serif; }",
    "header { min-height: 900px; padding: 32px; background: #f3f4f6; }",
    "#cta { display: inline-block; margin: 24px 32px 80px; padding: 14px 20px; background: #111827; color: white; }",
    "</style></head>",
    "<body><main>",
    "<header><h1>Scroll verification</h1><p>CTA starts below the first viewport.</p></header>",
    "<button id=\"cta\" data-testid=\"below-fold-cta\">Continue setup</button>",
    "<p id=\"status\" role=\"status\">Ready after scroll</p>",
    "</main></body></html>`;",
    "http.createServer((req, res) => { res.writeHead(200, {'content-type':'text/html'}); res.end(html); }).listen(process.env.PORT);",
  ].join("\n"), "utf-8");

  const baseProject = {
    name: "browser-scroll-action-self-test",
    workDir: dir,
    runCommand: `"${process.execPath}" server.js`,
    targetUrl,
    env: { PORT: port },
  };

  const passReport = await runTestAgent({
    id: `browser-scroll-pass-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent can perform a real browser page scroll before checking below-fold UI.",
    acceptanceCriteria: ["Scrolling down brings the Continue setup CTA into the mobile viewport."],
    requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
    projects: [{
      ...baseProject,
      browserChecks: [{
        name: "Scroll reveals below-fold CTA",
        url: targetUrl,
        viewport_width: 390,
        viewport_height: 640,
        is_mobile: true,
        actions: [
          { type: "goto", url: targetUrl },
          { action: "scroll_down", amount: 920 } as any,
        ],
        assertions: [
          { assertion: "element_in_viewport", test_id: "below-fold-cta" } as any,
          { type: "jsTruthy", expression: "window.scrollY > 500" },
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
    id: `browser-scroll-fail-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent fails when insufficient scroll does not reveal the CTA.",
    acceptanceCriteria: ["A tiny scroll brings the Continue setup CTA into the mobile viewport."],
    requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
    projects: [{
      ...baseProject,
      browserChecks: [{
        name: "Insufficient scroll keeps CTA below viewport",
        url: targetUrl,
        viewport_width: 390,
        viewport_height: 640,
        is_mobile: true,
        actions: [
          { type: "goto", url: targetUrl },
          { type: "scroll", direction: "down", amount: 10 },
        ],
        assertions: [
          { type: "inViewport", testId: "below-fold-cta", timeoutMs: 800 },
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

  const passBrowser = passReport.browserResults[0];
  const failBrowser = failReport.browserResults[0];
  const scrollStep = passBrowser?.steps.find(step => step.name === "action:scroll");
  const viewportStep = passBrowser?.steps.find(step => step.name === "assert:inViewport");
  const failViewport = failBrowser?.steps.find(step => step.name === "assert:inViewport");
  const pass = passReport.status === "passed"
    && passBrowser?.provider === "playwright"
    && passBrowser?.status === "passed"
    && passBrowser?.viewport?.width === 390
    && passBrowser?.viewport?.height === 640
    && scrollStep?.status === "passed"
    && String(scrollStep?.detail || "").includes("page; down 920px")
    && viewportStep?.status === "passed"
    && String(viewportStep?.detail || "").includes("testId=below-fold-cta")
    && passBrowser?.steps.some(step => step.name === "assert:jsTruthy" && step.status === "passed")
    && passReport.requiredCheckCoverage.some(item => item.check === "browser_e2e" && item.status === "verified")
    && passReport.acceptanceCoverage.every(item => item.status === "verified")
    && failReport.status === "failed"
    && failBrowser?.provider === "playwright"
    && failBrowser?.status === "failed"
    && failBrowser?.steps.some(step => step.name === "action:scroll" && step.status === "passed" && String(step.detail || "").includes("page; down 10px"))
    && failViewport?.status === "failed"
    && String(failViewport?.error || "").includes("viewport=390x640")
    && failReport.requiredCheckCoverage.some(item => item.check === "browser_e2e" && item.status === "not_verified");

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    availability,
    passReport,
    failReport,
  };
}

export async function runTestAgentBrowserAdvancedMouseActionSelfTest() {
  const availability = await checkPlaywrightAvailability();
  if (!availability.available) {
    return {
      pass: false,
      availability,
      reason: availability.reason,
    };
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-browser-advanced-mouse-selftest-"));
  const passArtifactDir = path.join(dir, "pass-artifacts");
  const failArtifactDir = path.join(dir, "fail-artifacts");
  const port = await getFreePort();
  const targetUrl = `http://127.0.0.1:${port}/tasks`;
  fs.writeFileSync(path.join(dir, "server.js"), [
    "const http = require('http');",
    "const html = `<!doctype html>",
    "<html><head><title>Advanced Mouse Fixture</title>",
    "<style>",
    ".task { display:block; width:260px; padding:12px; margin:24px; border:1px solid #333; }",
    "#menu[hidden] { display:none; }",
    "#menu { margin: 12px 24px; padding: 8px; border: 1px solid #555; width: 240px; }",
    "</style></head>",
    "<body><main>",
    "<h1>Task list</h1>",
    "<article class=\"task\" data-testid=\"task-alpha\" tabindex=\"0\">Project Alpha</article>",
    "<div id=\"menu\" role=\"menu\" hidden><button role=\"menuitem\">Archive Project Alpha</button></div>",
    "<p id=\"edit-state\">Not editing</p>",
    "<p id=\"status\" role=\"status\">Ready</p>",
    "<script>",
    "const task = document.querySelector('[data-testid=task-alpha]');",
    "task.addEventListener('dblclick', () => { document.getElementById('edit-state').textContent = 'Editing Project Alpha'; });",
    "task.addEventListener('contextmenu', event => { event.preventDefault(); document.getElementById('menu').hidden = false; document.getElementById('status').textContent = 'Context menu opened for Project Alpha'; });",
    "</script>",
    "</main></body></html>`;",
    "http.createServer((req, res) => { res.writeHead(200, {'content-type':'text/html'}); res.end(html); }).listen(process.env.PORT);",
  ].join("\n"), "utf-8");

  const baseProject = {
    name: "browser-advanced-mouse-self-test",
    workDir: dir,
    runCommand: `"${process.execPath}" server.js`,
    targetUrl,
    env: { PORT: port },
  };

  const passReport = await runTestAgent({
    id: `browser-advanced-mouse-pass-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent can perform real browser double-click and right-click interactions.",
    acceptanceCriteria: ["Double-clicking Project Alpha enters edit mode and right-clicking opens the archive menu."],
    requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
    projects: [{
      ...baseProject,
      browserChecks: [{
        name: "Advanced mouse actions update task UI",
        url: targetUrl,
        actions: [
          { type: "goto", url: targetUrl },
          { action: "double_click", test_id: "task-alpha" } as any,
          { action: "right_click", testId: "task-alpha" } as any,
        ],
        assertions: [
          { type: "text", text: "Editing Project Alpha" },
          { type: "text", text: "Context menu opened for Project Alpha" },
          { type: "visible", role: "menuitem", name: "Archive Project Alpha", exact: true },
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
    id: `browser-advanced-mouse-fail-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent fails when a right-click menu does not contain the expected destructive action.",
    acceptanceCriteria: ["Right-clicking Project Alpha shows Delete Project Alpha."],
    requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
    projects: [{
      ...baseProject,
      browserChecks: [{
        name: "Missing context menu item is reported",
        url: targetUrl,
        actions: [
          { type: "goto", url: targetUrl },
          { type: "rightClick", testId: "task-alpha" },
        ],
        assertions: [
          { type: "visible", role: "menuitem", name: "Delete Project Alpha", exact: true, timeoutMs: 800 },
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

  const passBrowser = passReport.browserResults[0];
  const failBrowser = failReport.browserResults[0];
  const doubleClickStep = passBrowser?.steps.find(step => step.name === "action:doubleClick");
  const rightClickStep = passBrowser?.steps.find(step => step.name === "action:rightClick");
  const failVisible = failBrowser?.steps.find(step => step.name === "assert:visible");
  const pass = passReport.status === "passed"
    && passBrowser?.provider === "playwright"
    && passBrowser?.status === "passed"
    && doubleClickStep?.status === "passed"
    && String(doubleClickStep?.detail || "").includes("testId=task-alpha")
    && rightClickStep?.status === "passed"
    && String(rightClickStep?.detail || "").includes("testId=task-alpha")
    && passBrowser?.steps.some(step => step.name === "assert:visible" && step.status === "passed" && String(step.detail || "").includes("role=menuitem"))
    && passBrowser?.pageTextPreview?.includes("Context menu opened for Project Alpha")
    && passReport.requiredCheckCoverage.some(item => item.check === "browser_e2e" && item.status === "verified")
    && passReport.acceptanceCoverage.every(item => item.status === "verified")
    && failReport.status === "failed"
    && failBrowser?.provider === "playwright"
    && failBrowser?.status === "failed"
    && failBrowser?.steps.some(step => step.name === "action:rightClick" && step.status === "passed")
    && failVisible?.status === "failed"
    && String(failVisible?.detail || "").includes("role=menuitem")
    && failReport.requiredCheckCoverage.some(item => item.check === "browser_e2e" && item.status === "not_verified");

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    availability,
    passReport,
    failReport,
  };
}

export async function runTestAgentBrowserKeyboardActionSelfTest() {
  const availability = await checkPlaywrightAvailability();
  if (!availability.available) {
    return {
      pass: false,
      availability,
      reason: availability.reason,
    };
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-browser-keyboard-selftest-"));
  const passArtifactDir = path.join(dir, "pass-artifacts");
  const failArtifactDir = path.join(dir, "fail-artifacts");
  const port = await getFreePort();
  const targetUrl = `http://127.0.0.1:${port}/search`;
  fs.writeFileSync(path.join(dir, "server.js"), [
    "const http = require('http');",
    "const html = `<!doctype html>",
    "<html><head><title>Keyboard Fixture</title></head>",
    "<body><main>",
    "<h1>Keyboard verification</h1>",
    "<label for=\"search\">Search</label>",
    "<input id=\"search\" aria-label=\"Search\" />",
    "<p id=\"focus-state\">Search not focused</p>",
    "<p id=\"result\" role=\"status\">No query submitted</p>",
    "<div data-testid=\"command-menu\" hidden>Command menu ready</div>",
    "<p id=\"shortcut-state\">No shortcut</p>",
    "<script>",
    "const input = document.getElementById('search');",
    "const focusState = document.getElementById('focus-state');",
    "const result = document.getElementById('result');",
    "const command = document.querySelector('[data-testid=command-menu]');",
    "const shortcutState = document.getElementById('shortcut-state');",
    "input.addEventListener('focus', () => { focusState.textContent = 'Search focused'; });",
    "input.addEventListener('input', () => { result.textContent = 'Typed ' + input.value; });",
    "input.addEventListener('keydown', event => {",
    "  if (event.key === 'Enter') { result.textContent = 'Submitted ' + input.value; }",
    "  if (event.ctrlKey && event.altKey && event.key.toLowerCase() === 'k') {",
    "    event.preventDefault();",
    "    command.hidden = false;",
    "    shortcutState.textContent = 'Shortcut Control+Alt+K received';",
    "  }",
    "});",
    "</script>",
    "</main></body></html>`;",
    "http.createServer((req, res) => { res.writeHead(200, {'content-type':'text/html'}); res.end(html); }).listen(process.env.PORT);",
  ].join("\n"), "utf-8");

  const baseProject = {
    name: "browser-keyboard-self-test",
    workDir: dir,
    runCommand: `"${process.execPath}" server.js`,
    targetUrl,
    env: { PORT: port },
  };

  const passReport = await runTestAgent({
    id: `browser-keyboard-pass-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent can focus a control, type real keyboard text, press Enter, and send a shortcut.",
    acceptanceCriteria: ["Search can be completed with keyboard-only actions and Control+Alt+K opens the command menu."],
    requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
    projects: [{
      ...baseProject,
      browserChecks: [{
        name: "Keyboard actions submit search and open shortcut menu",
        url: targetUrl,
        actions: [
          { type: "goto", url: targetUrl },
          { action: "set_focus", label: "Search", exact: true } as any,
          { action: "type_text", label: "Search", value: "alpha", delay: 1 } as any,
          { action: "press_key", label: "Search", key: "Enter" } as any,
          { action: "hotkey", value: "Control+Alt+K" } as any,
        ],
        assertions: [
          { type: "focused", label: "Search", exact: true },
          { type: "inputValueEquals", label: "Search", value: "alpha", exact: true },
          { type: "text", text: "Submitted alpha" },
          { type: "visible", testId: "command-menu" },
          { type: "text", text: "Shortcut Control+Alt+K received" },
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
    id: `browser-keyboard-fail-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent fails when keyboard input submits the wrong search value.",
    acceptanceCriteria: ["Keyboard search submits alpha."],
    requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
    projects: [{
      ...baseProject,
      browserChecks: [{
        name: "Wrong keyboard input is reported",
        url: targetUrl,
        actions: [
          { type: "goto", url: targetUrl },
          { type: "focus", label: "Search", exact: true },
          { type: "typeText", label: "Search", value: "beta" },
          { type: "press", label: "Search", key: "Enter" },
        ],
        assertions: [
          { type: "text", text: "Submitted alpha", timeoutMs: 800 },
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

  const passBrowser = passReport.browserResults[0];
  const failBrowser = failReport.browserResults[0];
  const focusStep = passBrowser?.steps.find(step => step.name === "action:focus");
  const typeStep = passBrowser?.steps.find(step => step.name === "action:typeText");
  const pressSteps = passBrowser?.steps.filter(step => step.name === "action:press") || [];
  const failText = failBrowser?.steps.find(step => step.name === "assert:text");
  const pass = passReport.status === "passed"
    && passBrowser?.provider === "playwright"
    && passBrowser?.status === "passed"
    && focusStep?.status === "passed"
    && String(focusStep?.detail || "").includes("label=Search")
    && typeStep?.status === "passed"
    && String(typeStep?.detail || "").includes("text length=5")
    && pressSteps.length === 2
    && pressSteps[0]?.status === "passed"
    && String(pressSteps[0]?.detail || "").includes("label=Search")
    && pressSteps[1]?.status === "passed"
    && String(pressSteps[1]?.detail || "").includes("Control+Alt+K")
    && passBrowser?.steps.some(step => step.name === "assert:inputValueEquals" && step.status === "passed")
    && passBrowser?.steps.some(step => step.name === "assert:visible" && step.status === "passed" && String(step.detail || "").includes("testId=command-menu"))
    && passBrowser?.pageTextPreview?.includes("Shortcut Control+Alt+K received")
    && passReport.requiredCheckCoverage.some(item => item.check === "browser_e2e" && item.status === "verified")
    && passReport.acceptanceCoverage.every(item => item.status === "verified")
    && failReport.status === "failed"
    && failBrowser?.provider === "playwright"
    && failBrowser?.status === "failed"
    && failBrowser?.steps.some(step => step.name === "action:typeText" && step.status === "passed")
    && failText?.status === "failed"
    && failReport.requiredCheckCoverage.some(item => item.check === "browser_e2e" && item.status === "not_verified");

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    availability,
    passReport,
    failReport,
  };
}

export async function runTestAgentBrowserStorageActionSelfTest() {
  const availability = await checkPlaywrightAvailability();
  if (!availability.available) {
    return {
      pass: false,
      availability,
      reason: availability.reason,
    };
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-browser-storage-action-selftest-"));
  const passArtifactDir = path.join(dir, "pass-artifacts");
  const failArtifactDir = path.join(dir, "fail-artifacts");
  const port = await getFreePort();
  const targetUrl = `http://127.0.0.1:${port}/preferences`;
  fs.writeFileSync(path.join(dir, "server.js"), [
    "const http = require('http');",
    "const html = `<!doctype html>",
    "<html><head><title>Storage Fixture</title></head>",
    "<body><main>",
    "<h1>Preference gate</h1>",
    "<p id=\"welcome\" role=\"status\">Loading</p>",
    "<p id=\"notice\">Loading</p>",
    "<script>",
    "function render() {",
    "  const dismissed = localStorage.getItem('feature.welcomeDismissed');",
    "  const notice = sessionStorage.getItem('session.notice');",
    "  document.getElementById('welcome').textContent = dismissed === 'yes' ? 'Welcome hidden' : 'Welcome shown';",
    "  document.getElementById('notice').textContent = notice ? 'Session notice ' + notice : 'No session notice';",
    "}",
    "render();",
    "</script>",
    "</main></body></html>`;",
    "http.createServer((req, res) => { res.writeHead(200, {'content-type':'text/html'}); res.end(html); }).listen(process.env.PORT);",
  ].join("\n"), "utf-8");

  const baseProject = {
    name: "browser-storage-action-self-test",
    workDir: dir,
    runCommand: `"${process.execPath}" server.js`,
    targetUrl,
    env: { PORT: port },
  };

  const passReport = await runTestAgent({
    id: `browser-storage-action-pass-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent can seed and clear browser Web Storage before checking app behavior.",
    acceptanceCriteria: [
      "Seeded localStorage hides the welcome message after reload.",
      "Seeded sessionStorage shows the session notice after reload.",
      "Clearing storage resets the app state after reload.",
    ],
    requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
    projects: [{
      ...baseProject,
      browserChecks: [{
        name: "Seed Web Storage state before reload",
        url: targetUrl,
        actions: [
          { type: "goto", url: targetUrl },
          { action: "set_local_storage", key: "feature.welcomeDismissed", value: "yes" } as any,
          { action: "set_session_storage", storageKey: "session.notice", value: "Resume draft" } as any,
          { type: "reload" },
        ],
        assertions: [
          { type: "text", text: "Welcome hidden" },
          { type: "text", text: "Session notice Resume draft" },
          { type: "localStorageEquals", key: "feature.welcomeDismissed", value: "yes" },
          { type: "sessionStorageIncludes", key: "session.notice", value: "draft" },
          { type: "consoleNoErrors" },
          { type: "networkNoErrors" },
        ],
        screenshot: true,
      }, {
        name: "Clear Web Storage state before reload",
        url: targetUrl,
        actions: [
          { type: "goto", url: targetUrl },
          { type: "setLocalStorage", key: "feature.welcomeDismissed", value: "yes" },
          { type: "setSessionStorage", key: "session.notice", value: "Resume draft" },
          { action: "clear_local_storage", key: "feature.welcomeDismissed" } as any,
          { action: "clear_session_storage" } as any,
          { type: "reload" },
        ],
        assertions: [
          { type: "text", text: "Welcome shown" },
          { type: "text", text: "No session notice" },
          { type: "jsTruthy", expression: "localStorage.getItem('feature.welcomeDismissed') === null" },
          { type: "jsTruthy", expression: "sessionStorage.getItem('session.notice') === null" },
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
    id: `browser-storage-action-fail-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent fails when seeded storage does not satisfy the expected app state.",
    acceptanceCriteria: ["Seeded localStorage hides the welcome message."],
    requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
    projects: [{
      ...baseProject,
      browserChecks: [{
        name: "Wrong storage value is reported",
        url: targetUrl,
        actions: [
          { type: "goto", url: targetUrl },
          { type: "setLocalStorage", key: "feature.welcomeDismissed", value: "no" },
          { type: "reload" },
        ],
        assertions: [
          { type: "text", text: "Welcome hidden", timeoutMs: 800 },
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

  const seedBrowser = passReport.browserResults[0];
  const clearBrowser = passReport.browserResults[1];
  const failBrowser = failReport.browserResults[0];
  const seedLocalStep = seedBrowser?.steps.find(step => step.name === "action:setLocalStorage");
  const seedSessionStep = seedBrowser?.steps.find(step => step.name === "action:setSessionStorage");
  const clearSteps = clearBrowser?.steps.filter(step => step.name === "action:clearStorage") || [];
  const failText = failBrowser?.steps.find(step => step.name === "assert:text");
  const pass = passReport.status === "passed"
    && seedBrowser?.provider === "playwright"
    && clearBrowser?.provider === "playwright"
    && seedBrowser?.status === "passed"
    && clearBrowser?.status === "passed"
    && seedLocalStep?.status === "passed"
    && String(seedLocalStep?.detail || "").includes("localStorage")
    && String(seedLocalStep?.detail || "").includes("feature.welcomeDismissed")
    && seedSessionStep?.status === "passed"
    && String(seedSessionStep?.detail || "").includes("sessionStorage")
    && seedBrowser?.steps.some(step => step.name === "assert:localStorageEquals" && step.status === "passed")
    && seedBrowser?.steps.some(step => step.name === "assert:sessionStorageIncludes" && step.status === "passed")
    && clearSteps.length === 2
    && clearSteps.every(step => step.status === "passed")
    && clearBrowser?.steps.some(step => step.name === "assert:jsTruthy" && step.status === "passed")
    && clearBrowser?.pageTextPreview?.includes("No session notice")
    && passReport.requiredCheckCoverage.some(item => item.check === "browser_e2e" && item.status === "verified")
    && passReport.acceptanceCoverage.every(item => item.status === "verified")
    && failReport.status === "failed"
    && failBrowser?.provider === "playwright"
    && failBrowser?.status === "failed"
    && failBrowser?.steps.some(step => step.name === "action:setLocalStorage" && step.status === "passed")
    && failText?.status === "failed"
    && failReport.requiredCheckCoverage.some(item => item.check === "browser_e2e" && item.status === "not_verified");

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    availability,
    passReport,
    failReport,
  };
}

export async function runTestAgentBrowserCookieActionSelfTest() {
  const availability = await checkPlaywrightAvailability();
  if (!availability.available) {
    return {
      pass: false,
      availability,
      reason: availability.reason,
    };
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-browser-cookie-action-selftest-"));
  const passArtifactDir = path.join(dir, "pass-artifacts");
  const failArtifactDir = path.join(dir, "fail-artifacts");
  const port = await getFreePort();
  const targetUrl = `http://127.0.0.1:${port}/account`;
  fs.writeFileSync(path.join(dir, "server.js"), [
    "const http = require('http');",
    "function cookieValue(header, name) {",
    "  const found = String(header || '').split(';').map(part => part.trim()).find(part => part.startsWith(name + '='));",
    "  return found ? decodeURIComponent(found.slice(name.length + 1)) : '';",
    "}",
    "http.createServer((req, res) => {",
    "  const token = cookieValue(req.headers.cookie, 'ccm_auth');",
    "  const signedIn = token === 'seeded-token-42';",
    "  const html = `<!doctype html>",
    "<html><head><title>Cookie Action Fixture</title></head>",
    "<body><main>",
    "<h1>Cookie account</h1>",
    "<p role=\"status\">${signedIn ? 'Signed in as seeded-token-42' : 'Signed out'}</p>",
    "<p id=\"token-state\">${token ? 'Cookie token present' : 'No cookie token'}</p>",
    "</main></body></html>`;",
    "  res.writeHead(200, {'content-type':'text/html'});",
    "  res.end(html);",
    "}).listen(process.env.PORT);",
  ].join("\n"), "utf-8");

  const baseProject = {
    name: "browser-cookie-action-self-test",
    workDir: dir,
    runCommand: `"${process.execPath}" server.js`,
    targetUrl,
    env: { PORT: port },
  };

  const passReport = await runTestAgent({
    id: `browser-cookie-action-pass-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent can seed and clear browser cookies before checking app behavior.",
    acceptanceCriteria: [
      "Seeded ccm_auth cookie signs the user in after reload.",
      "Clearing ccm_auth signs the user out after reload.",
    ],
    requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
    projects: [{
      ...baseProject,
      browserChecks: [{
        name: "Seed auth cookie before reload",
        url: targetUrl,
        actions: [
          { type: "goto", url: targetUrl },
          { action: "set_cookie", cookieName: "ccm_auth", value: "seeded-token-42", http_only: true, same_site: "Lax" } as any,
          { type: "reload" },
        ],
        assertions: [
          { type: "text", text: "Signed in as seeded-token-42" },
          { assertion: "has_cookie", key: "ccm_auth" } as any,
          { assertion: "cookie_includes", key: "ccm_auth", value: "seeded-token" } as any,
          { type: "consoleNoErrors" },
          { type: "networkNoErrors" },
        ],
        screenshot: true,
      }, {
        name: "Clear auth cookie before reload",
        url: targetUrl,
        actions: [
          { type: "goto", url: targetUrl },
          { type: "setCookie", key: "ccm_auth", value: "seeded-token-42", httpOnly: true, sameSite: "Lax" },
          { type: "reload" },
          { action: "clear_cookie", cookieName: "ccm_auth" } as any,
          { type: "reload" },
        ],
        assertions: [
          { type: "text", text: "Signed out" },
          { type: "text", text: "No cookie token" },
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
    id: `browser-cookie-action-fail-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent fails when the seeded cookie does not produce the expected app state.",
    acceptanceCriteria: ["Seeded ccm_auth cookie signs the user in."],
    requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
    projects: [{
      ...baseProject,
      browserChecks: [{
        name: "Wrong auth cookie is reported",
        url: targetUrl,
        actions: [
          { type: "goto", url: targetUrl },
          { type: "setCookie", key: "ccm_auth", value: "wrong-token" },
          { type: "reload" },
        ],
        assertions: [
          { type: "text", text: "Signed in as seeded-token-42", timeoutMs: 800 },
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

  const seedBrowser = passReport.browserResults[0];
  const clearBrowser = passReport.browserResults[1];
  const failBrowser = failReport.browserResults[0];
  const seedCookieStep = seedBrowser?.steps.find(step => step.name === "action:setCookie");
  const clearCookieStep = clearBrowser?.steps.find(step => step.name === "action:clearCookies");
  const failText = failBrowser?.steps.find(step => step.name === "assert:text");
  const pass = passReport.status === "passed"
    && seedBrowser?.provider === "playwright"
    && clearBrowser?.provider === "playwright"
    && seedBrowser?.status === "passed"
    && clearBrowser?.status === "passed"
    && seedCookieStep?.status === "passed"
    && String(seedCookieStep?.detail || "").includes("cookie=ccm_auth")
    && seedBrowser?.steps.some(step => step.name === "assert:cookieExists" && step.status === "passed")
    && seedBrowser?.steps.some(step => step.name === "assert:cookieValueIncludes" && step.status === "passed")
    && clearCookieStep?.status === "passed"
    && String(clearCookieStep?.detail || "").includes("cookie count=1")
    && clearBrowser?.pageTextPreview?.includes("Signed out")
    && passReport.requiredCheckCoverage.some(item => item.check === "browser_e2e" && item.status === "verified")
    && passReport.acceptanceCoverage.every(item => item.status === "verified")
    && failReport.status === "failed"
    && failBrowser?.provider === "playwright"
    && failBrowser?.status === "failed"
    && failBrowser?.steps.some(step => step.name === "action:setCookie" && step.status === "passed")
    && failText?.status === "failed"
    && failReport.requiredCheckCoverage.some(item => item.check === "browser_e2e" && item.status === "not_verified");

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    availability,
    passReport,
    failReport,
  };
}

export async function runTestAgentBrowserClipboardAssertionSelfTest() {
  const availability = await checkPlaywrightAvailability();
  if (!availability.available) {
    return {
      pass: false,
      availability,
      reason: availability.reason,
    };
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-browser-clipboard-selftest-"));
  const passArtifactDir = path.join(dir, "pass-artifacts");
  const failArtifactDir = path.join(dir, "fail-artifacts");
  const port = await getFreePort();
  const targetUrl = `http://127.0.0.1:${port}/clipboard`;
  fs.writeFileSync(path.join(dir, "server.js"), [
    "const http = require('http');",
    "const html = `<!doctype html>",
    "<html><head><title>Clipboard Fixture</title></head>",
    "<body><main>",
    "<h1>Clipboard verification</h1>",
    "<button type=\"button\" id=\"copyInvite\">Copy invite</button>",
    "<p role=\"status\" id=\"status\">Ready</p>",
    "<script>",
    "document.getElementById('copyInvite').addEventListener('click', async () => {",
    "  await navigator.clipboard.writeText('Invite Code: TEAM-42');",
    "  document.getElementById('status').textContent = 'Copied invite code TEAM-42';",
    "});",
    "</script>",
    "</main></body></html>`;",
    "http.createServer((req, res) => { res.writeHead(200, {'content-type':'text/html'}); res.end(html); }).listen(process.env.PORT);",
  ].join("\n"), "utf-8");

  const baseProject = {
    name: "browser-clipboard-self-test",
    workDir: dir,
    runCommand: `"${process.execPath}" server.js`,
    targetUrl,
    env: { PORT: port },
  };

  const passReport = await runTestAgent({
    id: `browser-clipboard-pass-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent can prove browser clipboard contents after real copy interactions.",
    acceptanceCriteria: ["Clicking Copy invite shows Copied invite code TEAM-42."],
    requiredChecks: ["browser_e2e", "console_errors"],
    projects: [{
      ...baseProject,
      browserChecks: [{
        name: "Copy invite writes clipboard",
        url: targetUrl,
        actions: [
          { type: "goto", url: targetUrl },
          { type: "click", role: "button", name: "Copy invite", exact: true },
        ],
        assertions: [
          { type: "text", text: "Copied invite code TEAM-42" },
          { assertion: "clipboard_text_equals", value: "Invite Code: TEAM-42" } as any,
          { assertion: "clipboard_includes", value: "TEAM-42" } as any,
          { type: "consoleNoErrors" },
          { type: "networkNoErrors" },
        ],
        screenshot: true,
      }, {
        name: "TestAgent can seed clipboard",
        url: targetUrl,
        actions: [
          { type: "goto", url: targetUrl },
          { action: "write_clipboard", value: "Seeded clipboard note" } as any,
        ],
        assertions: [
          { type: "clipboardTextEquals", value: "Seeded clipboard note" },
          { type: "consoleNoErrors" },
          { type: "networkNoErrors" },
        ],
      }],
    }],
    options: {
      artifactDir: passArtifactDir,
      browserProvider: "playwright",
      collectBrowserArtifacts: false,
    },
  }, { browserProvider: "playwright" });

  const failReport = await runTestAgent({
    id: `browser-clipboard-fail-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent fails when clipboard text is different from expected.",
    acceptanceCriteria: ["Copy invite writes the wrong clipboard value."],
    requiredChecks: ["browser_e2e", "console_errors"],
    projects: [{
      ...baseProject,
      browserChecks: [{
        name: "Clipboard mismatch is reported",
        url: targetUrl,
        actions: [
          { type: "goto", url: targetUrl },
          { type: "click", role: "button", name: "Copy invite", exact: true },
        ],
        assertions: [
          { type: "clipboardTextEquals", value: "Wrong clipboard value", timeoutMs: 800 },
          { type: "consoleNoErrors" },
          { type: "networkNoErrors" },
        ],
      }],
    }],
    options: {
      artifactDir: failArtifactDir,
      browserProvider: "playwright",
      collectBrowserArtifacts: false,
    },
  }, { browserProvider: "playwright" });

  const copyBrowser = passReport.browserResults[0];
  const seedBrowser = passReport.browserResults[1];
  const failBrowser = failReport.browserResults[0];
  const failClipboard = failBrowser?.steps.find(step => step.name === "assert:clipboardTextEquals");
  const pass = passReport.status === "passed"
    && copyBrowser?.provider === "playwright"
    && copyBrowser?.status === "passed"
    && copyBrowser?.steps.some(step => step.name === "assert:clipboardTextEquals" && step.status === "passed" && String(step.detail || "").includes("expected length=20"))
    && copyBrowser?.steps.some(step => step.name === "assert:clipboardTextIncludes" && step.status === "passed" && String(step.detail || "").includes("expected substring length=7"))
    && seedBrowser?.provider === "playwright"
    && seedBrowser?.status === "passed"
    && seedBrowser?.steps.some(step => step.name === "action:setClipboard" && step.status === "passed" && String(step.detail || "").includes("clipboard text length=21"))
    && seedBrowser?.steps.some(step => step.name === "assert:clipboardTextEquals" && step.status === "passed")
    && passReport.requiredCheckCoverage.some(item => item.check === "browser_e2e" && item.status === "verified")
    && passReport.acceptanceCoverage.every(item => item.status === "verified")
    && failReport.status === "failed"
    && failBrowser?.provider === "playwright"
    && failBrowser?.status === "failed"
    && failClipboard?.status === "failed"
    && String(failClipboard?.error || "").includes("actual length=20")
    && !String(failClipboard?.error || "").includes("Invite Code")
    && !String(failClipboard?.error || "").includes("Wrong clipboard value")
    && failReport.requiredCheckCoverage.some(item => item.check === "browser_e2e" && item.status === "not_verified");

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    availability,
    passReport,
    failReport,
  };
}

export async function runTestAgentBrowserElementScreenshotAssertionSelfTest() {
  const availability = await checkPlaywrightAvailability();
  if (!availability.available) {
    return {
      pass: false,
      availability,
      reason: availability.reason,
    };
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-browser-element-screenshot-selftest-"));
  const passArtifactDir = path.join(dir, "pass-artifacts");
  const failArtifactDir = path.join(dir, "fail-artifacts");
  const port = await getFreePort();
  const targetUrl = `http://127.0.0.1:${port}/visual`;
  fs.writeFileSync(path.join(dir, "server.js"), [
    "const http = require('http');",
    "const html = `<!doctype html>",
    "<html><head><title>Visual Fixture</title>",
    "<style>",
    "body { font-family: sans-serif; }",
    "#chart { width: 180px; height: 100px; }",
    "#blank { width: 180px; height: 100px; background: #fff; }",
    "</style></head>",
    "<body><main>",
    "<h1>Visual verification</h1>",
    "<canvas id=\"chart\" width=\"180\" height=\"100\" aria-label=\"Revenue chart\"></canvas>",
    "<div id=\"blank\" aria-label=\"Blank preview\"></div>",
    "<p role=\"status\">Chart ready</p>",
    "<script>",
    "const ctx = document.getElementById('chart').getContext('2d');",
    "ctx.fillStyle = '#0ea5e9'; ctx.fillRect(0, 0, 180, 100);",
    "ctx.fillStyle = '#22c55e'; ctx.fillRect(18, 50, 36, 35);",
    "ctx.fillStyle = '#f97316'; ctx.fillRect(72, 28, 36, 57);",
    "ctx.fillStyle = '#111827'; ctx.fillRect(126, 12, 36, 73);",
    "</script>",
    "</main></body></html>`;",
    "http.createServer((req, res) => { res.writeHead(200, {'content-type':'text/html'}); res.end(html); }).listen(process.env.PORT);",
  ].join("\n"), "utf-8");

  const baseProject = {
    name: "browser-element-screenshot-self-test",
    workDir: dir,
    runCommand: `"${process.execPath}" server.js`,
    targetUrl,
    env: { PORT: port },
  };

  const passReport = await runTestAgent({
    id: `browser-element-screenshot-pass-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent can prove an element region has visible rendered pixels.",
    acceptanceCriteria: ['Page shows "Chart ready" and the chart canvas is visually non-blank.'],
    requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
    projects: [{
      ...baseProject,
      browserChecks: [{
        name: "Chart canvas has visual content",
        url: targetUrl,
        actions: [
          { type: "goto", url: targetUrl },
        ],
        assertions: [
          { type: "text", text: "Chart ready" },
          { assertion: "element_screenshot_not_blank", selector: "#chart", minUniqueColors: 3, minNonWhitePixels: 100 } as any,
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
    id: `browser-element-screenshot-fail-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent fails when an element region is visually blank.",
    acceptanceCriteria: ["Blank preview should have visible chart pixels."],
    requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
    projects: [{
      ...baseProject,
      browserChecks: [{
        name: "Blank preview is rejected",
        url: targetUrl,
        actions: [
          { type: "goto", url: targetUrl },
        ],
        assertions: [
          { type: "elementScreenshotNotBlank", selector: "#blank", minNonWhitePixels: 1, timeoutMs: 800 },
          { type: "consoleNoErrors" },
          { type: "networkNoErrors" },
        ],
      }],
    }],
    options: {
      artifactDir: failArtifactDir,
      browserProvider: "playwright",
      collectBrowserArtifacts: false,
    },
  }, { browserProvider: "playwright" });

  const passBrowser = passReport.browserResults[0];
  const failBrowser = failReport.browserResults[0];
  const visualStep = passBrowser?.steps.find(step => step.name === "assert:elementScreenshotNotBlank");
  const failVisual = failBrowser?.steps.find(step => step.name === "assert:elementScreenshotNotBlank");
  const pass = passReport.status === "passed"
    && passBrowser?.provider === "playwright"
    && passBrowser?.status === "passed"
    && visualStep?.status === "passed"
    && String(visualStep?.detail || "").includes("minUniqueColors=3")
    && passReport.requiredCheckCoverage.some(item => item.check === "browser_e2e" && item.status === "verified")
    && passReport.acceptanceCoverage.every(item => item.status === "verified")
    && failReport.status === "failed"
    && failBrowser?.provider === "playwright"
    && failBrowser?.status === "failed"
    && failVisual?.status === "failed"
    && String(failVisual?.error || "").includes("nonWhitePixels=0")
    && String(failVisual?.error || "").includes("uniqueColors=1")
    && failReport.requiredCheckCoverage.some(item => item.check === "browser_e2e" && item.status === "not_verified");

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    availability,
    passReport,
    failReport,
  };
}

export async function runTestAgentBrowserTextOrderAssertionSelfTest() {
  const availability = await checkPlaywrightAvailability();
  if (!availability.available) {
    return {
      pass: false,
      availability,
      reason: availability.reason,
    };
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-browser-text-order-selftest-"));
  const passArtifactDir = path.join(dir, "pass-artifacts");
  const failArtifactDir = path.join(dir, "fail-artifacts");
  const port = await getFreePort();
  const targetUrl = `http://127.0.0.1:${port}/tasks`;
  fs.writeFileSync(path.join(dir, "server.js"), [
    "const http = require('http');",
    "const html = `<!doctype html>",
    "<html><head><title>Text Order Fixture</title></head>",
    "<body><main>",
    "<h1>Task sort</h1>",
    "<button type=\"button\" id=\"sortDesc\">Sort descending</button>",
    "<ol id=\"task-list\" aria-label=\"Task list\">",
    "<li>Alpha</li>",
    "<li>Bravo</li>",
    "<li>Charlie</li>",
    "</ol>",
    "<p role=\"status\" id=\"status\">Initial Alpha Bravo Charlie</p>",
    "<script>",
    "const list = document.getElementById('task-list');",
    "document.getElementById('sortDesc').addEventListener('click', () => {",
    "  const items = Array.from(list.querySelectorAll('li'));",
    "  items.reverse().forEach(item => list.appendChild(item));",
    "  document.getElementById('status').textContent = 'Sorted Charlie Bravo Alpha';",
    "});",
    "</script>",
    "</main></body></html>`;",
    "http.createServer((req, res) => { res.writeHead(200, {'content-type':'text/html'}); res.end(html); }).listen(process.env.PORT);",
  ].join("\n"), "utf-8");

  const baseProject = {
    name: "browser-text-order-self-test",
    workDir: dir,
    runCommand: `"${process.execPath}" server.js`,
    targetUrl,
    env: { PORT: port },
  };

  const passReport = await runTestAgent({
    id: `browser-text-order-pass-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent can prove a list is sorted in the real browser UI.",
    acceptanceCriteria: ["Clicking Sort descending reorders the task list to Charlie, Bravo, Alpha."],
    requiredChecks: ["browser_e2e", "console_errors"],
    projects: [{
      ...baseProject,
      browserChecks: [{
        name: "Task list sorts descending",
        url: targetUrl,
        actions: [
          { type: "goto", url: targetUrl },
          { type: "click", role: "button", name: "Sort descending", exact: true },
        ],
        assertions: [
          { assertion: "text_order", selector: "#task-list", texts: ["Charlie", "Bravo", "Alpha"] } as any,
          { type: "text", text: "Sorted Charlie Bravo Alpha" },
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
    id: `browser-text-order-fail-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent fails when the observed list order does not match expected order.",
    acceptanceCriteria: ["Clicking Sort descending leaves the list in Alpha, Bravo, Charlie order."],
    requiredChecks: ["browser_e2e", "console_errors"],
    projects: [{
      ...baseProject,
      browserChecks: [{
        name: "Wrong task list order is rejected",
        url: targetUrl,
        actions: [
          { type: "goto", url: targetUrl },
          { type: "click", role: "button", name: "Sort descending", exact: true },
        ],
        assertions: [
          { type: "textOrder", selector: "#task-list", texts: ["Alpha", "Bravo", "Charlie"], timeoutMs: 800 },
          { type: "consoleNoErrors" },
          { type: "networkNoErrors" },
        ],
      }],
    }],
    options: {
      artifactDir: failArtifactDir,
      browserProvider: "playwright",
      collectBrowserArtifacts: false,
    },
  }, { browserProvider: "playwright" });

  const passBrowser = passReport.browserResults[0];
  const failBrowser = failReport.browserResults[0];
  const passOrder = passBrowser?.steps.find(step => step.name === "assert:textOrder");
  const failOrder = failBrowser?.steps.find(step => step.name === "assert:textOrder");
  const pass = passReport.status === "passed"
    && passBrowser?.provider === "playwright"
    && passBrowser?.status === "passed"
    && passOrder?.status === "passed"
    && String(passOrder?.detail || "").includes("expected text count=3")
    && passBrowser?.pageTextPreview?.includes("Sorted Charlie Bravo Alpha")
    && passReport.requiredCheckCoverage.some(item => item.check === "browser_e2e" && item.status === "verified")
    && passReport.acceptanceCoverage.every(item => item.status === "verified")
    && failReport.status === "failed"
    && failBrowser?.provider === "playwright"
    && failBrowser?.status === "failed"
    && failOrder?.status === "failed"
    && String(failOrder?.error || "").includes("foundCount=1")
    && String(failOrder?.error || "").includes("missingIndex=1")
    && !String(failOrder?.error || "").includes("Charlie Bravo Alpha")
    && failReport.requiredCheckCoverage.some(item => item.check === "browser_e2e" && item.status === "not_verified");

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    availability,
    passReport,
    failReport,
  };
}

export async function runTestAgentBrowserAttributeAssertionSelfTest() {
  const availability = await checkPlaywrightAvailability();
  if (!availability.available) {
    return {
      pass: false,
      availability,
      reason: availability.reason,
    };
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-browser-attribute-assertion-selftest-"));
  const passArtifactDir = path.join(dir, "pass-artifacts");
  const failArtifactDir = path.join(dir, "fail-artifacts");
  const port = await getFreePort();
  const targetUrl = `http://127.0.0.1:${port}/menu`;
  fs.writeFileSync(path.join(dir, "server.js"), [
    "const http = require('http');",
    "const html = `<!doctype html>",
    "<html><head><title>Attribute Fixture</title></head>",
    "<body><main>",
    "<h1>Menu</h1>",
    "<button id=\"menu\" type=\"button\" aria-expanded=\"false\" data-state=\"closed\">Menu</button>",
    "<section id=\"panel\" hidden>Panel content</section>",
    "<script>",
    "document.getElementById('menu').addEventListener('click', () => {",
    "  const button = document.getElementById('menu');",
    "  const open = button.getAttribute('aria-expanded') !== 'true';",
    "  button.setAttribute('aria-expanded', open ? 'true' : 'false');",
    "  button.setAttribute('data-state', open ? 'open active' : 'closed');",
    "  document.getElementById('panel').hidden = !open;",
    "});",
    "</script>",
    "</main></body></html>`;",
    "http.createServer((req, res) => { res.writeHead(200, {'content-type':'text/html'}); res.end(html); }).listen(process.env.PORT);",
  ].join("\n"), "utf-8");

  const baseProject = {
    name: "browser-attribute-assertion-self-test",
    workDir: dir,
    runCommand: `"${process.execPath}" server.js`,
    targetUrl,
    env: { PORT: port },
  };

  const passReport = await runTestAgent({
    id: `browser-attribute-pass-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent can prove ARIA/data attribute state before and after interaction.",
    acceptanceCriteria: ["Menu starts collapsed and expands after click."],
    requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
    projects: [{
      ...baseProject,
      browserChecks: [{
        name: "Menu starts collapsed",
        url: targetUrl,
        actions: [
          { type: "goto", url: targetUrl },
        ],
        assertions: [
          { assertion: "attribute_equals", role: "button", name: "Menu", attribute: "aria-expanded", value: "false", exact: true } as any,
          { assertion: "attr_includes", role: "button", name: "Menu", attribute: "data-state", value: "closed", exact: true } as any,
          { type: "consoleNoErrors" },
          { type: "networkNoErrors" },
        ],
        screenshot: true,
      }, {
        name: "Menu expands after click",
        url: targetUrl,
        actions: [
          { type: "goto", url: targetUrl },
          { type: "click", role: "button", name: "Menu", exact: true },
        ],
        assertions: [
          { type: "attributeEquals", role: "button", name: "Menu", attributeName: "aria-expanded", value: "true", exact: true },
          { type: "attributeIncludes", role: "button", name: "Menu", attribute_name: "data-state", value: "active", exact: true },
          { type: "text", text: "Panel content" },
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
    id: `browser-attribute-fail-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent fails when an ARIA attribute has the wrong final state.",
    acceptanceCriteria: ["Menu remains collapsed after click."],
    requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
    projects: [{
      ...baseProject,
      browserChecks: [{
        name: "Menu should not still be collapsed after click",
        url: targetUrl,
        actions: [
          { type: "goto", url: targetUrl },
          { type: "click", role: "button", name: "Menu", exact: true },
        ],
        assertions: [
          { type: "attributeEquals", role: "button", name: "Menu", attribute: "aria-expanded", value: "false", exact: true },
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

  const collapsedBrowser = passReport.browserResults[0];
  const expandedBrowser = passReport.browserResults[1];
  const failBrowser = failReport.browserResults[0];
  const failAttribute = failBrowser?.steps.find(step => step.name === "assert:attributeEquals");
  const pass = passReport.status === "passed"
    && passReport.browserResults.length === 2
    && collapsedBrowser?.provider === "playwright"
    && expandedBrowser?.provider === "playwright"
    && collapsedBrowser?.status === "passed"
    && expandedBrowser?.status === "passed"
    && collapsedBrowser?.steps.some(step => step.name === "assert:attributeEquals" && step.status === "passed" && String(step.detail || "").includes("attribute=aria-expanded"))
    && collapsedBrowser?.steps.some(step => step.name === "assert:attributeIncludes" && step.status === "passed" && String(step.detail || "").includes("attribute=data-state"))
    && expandedBrowser?.steps.some(step => step.name === "assert:attributeEquals" && step.status === "passed" && String(step.detail || "").includes("expected length=4"))
    && expandedBrowser?.steps.some(step => step.name === "assert:attributeIncludes" && step.status === "passed" && String(step.detail || "").includes("expected substring length=6"))
    && failReport.status === "failed"
    && failBrowser?.provider === "playwright"
    && failBrowser?.status === "failed"
    && failAttribute?.status === "failed"
    && String(failAttribute?.error || "").includes("actual length=4")
    && !String(failAttribute?.error || "").includes("true")
    && !String(failAttribute?.error || "").includes("false")
    && failReport.requiredCheckCoverage.some(item => item.check === "browser_e2e" && item.status === "not_verified");

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    availability,
    passReport,
    failReport,
  };
}

export async function runTestAgentBrowserComputedStyleAssertionSelfTest() {
  const availability = await checkPlaywrightAvailability();
  if (!availability.available) {
    return {
      pass: false,
      availability,
      reason: availability.reason,
    };
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-browser-computed-style-selftest-"));
  const passArtifactDir = path.join(dir, "pass-artifacts");
  const failArtifactDir = path.join(dir, "fail-artifacts");
  const port = await getFreePort();
  const targetUrl = `http://127.0.0.1:${port}/status`;
  fs.writeFileSync(path.join(dir, "server.js"), [
    "const http = require('http');",
    "const html = `<!doctype html>",
    "<html><head><title>Computed Style Fixture</title>",
    "<style>",
    "body { font-family: sans-serif; }",
    "#badge { display: inline-flex; padding: 6px 10px; border-radius: 4px; background-color: rgb(229, 231, 235); color: rgb(17, 24, 39); }",
    "#badge.active { background-color: rgb(34, 197, 94); color: rgb(255, 255, 255); }",
    "</style></head>",
    "<body><main>",
    "<h1>Release status</h1>",
    "<span id=\"badge\" data-testid=\"status-badge\">Draft</span>",
    "<button id=\"publish\" type=\"button\">Publish</button>",
    "<p id=\"status\" role=\"status\">Waiting</p>",
    "<script>",
    "document.getElementById('publish').addEventListener('click', () => {",
    "  const badge = document.getElementById('badge');",
    "  badge.classList.add('active');",
    "  badge.textContent = 'Published';",
    "  document.getElementById('status').textContent = 'Published with active styling';",
    "});",
    "</script>",
    "</main></body></html>`;",
    "http.createServer((req, res) => { res.writeHead(200, {'content-type':'text/html'}); res.end(html); }).listen(process.env.PORT);",
  ].join("\n"), "utf-8");

  const baseProject = {
    name: "browser-computed-style-self-test",
    workDir: dir,
    runCommand: `"${process.execPath}" server.js`,
    targetUrl,
    env: { PORT: port },
  };

  const passReport = await runTestAgent({
    id: `browser-computed-style-pass-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent can prove a UI state change applied the expected computed CSS.",
    acceptanceCriteria: ["Publishing changes the badge to the active green style with white text."],
    requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
    projects: [{
      ...baseProject,
      browserChecks: [{
        name: "Published badge has active computed style",
        url: targetUrl,
        actions: [
          { type: "goto", url: targetUrl },
          { type: "click", role: "button", name: "Publish", exact: true },
        ],
        assertions: [
          { type: "text", text: "Published with active styling" },
          { assertion: "style_equals", test_id: "status-badge", property: "background-color", value: "rgb(34, 197, 94)" } as any,
          { assertion: "computed_style_includes", testId: "status-badge", cssProperty: "color", value: "255, 255, 255" } as any,
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
    id: `browser-computed-style-fail-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent fails when the computed badge style is not the expected color.",
    acceptanceCriteria: ["Publishing changes the badge to a red active style."],
    requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
    projects: [{
      ...baseProject,
      browserChecks: [{
        name: "Wrong computed style is reported",
        url: targetUrl,
        actions: [
          { type: "goto", url: targetUrl },
          { type: "click", role: "button", name: "Publish", exact: true },
        ],
        assertions: [
          { type: "computedStyleEquals", testId: "status-badge", property: "backgroundColor", value: "rgb(239, 68, 68)", timeoutMs: 800 },
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

  const passBrowser = passReport.browserResults[0];
  const failBrowser = failReport.browserResults[0];
  const styleEquals = passBrowser?.steps.find(step => step.name === "assert:computedStyleEquals");
  const styleIncludes = passBrowser?.steps.find(step => step.name === "assert:computedStyleIncludes");
  const failStyle = failBrowser?.steps.find(step => step.name === "assert:computedStyleEquals");
  const pass = passReport.status === "passed"
    && passBrowser?.provider === "playwright"
    && passBrowser?.status === "passed"
    && styleEquals?.status === "passed"
    && String(styleEquals?.detail || "").includes("property=background-color")
    && String(styleEquals?.detail || "").includes("expected length=16")
    && styleIncludes?.status === "passed"
    && String(styleIncludes?.detail || "").includes("property=color")
    && String(styleIncludes?.detail || "").includes("expected substring length=13")
    && passBrowser?.pageTextPreview?.includes("Published with active styling")
    && passReport.requiredCheckCoverage.some(item => item.check === "browser_e2e" && item.status === "verified")
    && passReport.acceptanceCoverage.every(item => item.status === "verified")
    && failReport.status === "failed"
    && failBrowser?.provider === "playwright"
    && failBrowser?.status === "failed"
    && failStyle?.status === "failed"
    && String(failStyle?.error || "").includes("property=background-color")
    && String(failStyle?.error || "").includes("actual length=16")
    && !String(failStyle?.error || "").includes("rgb(34")
    && !String(failStyle?.error || "").includes("rgb(239")
    && failReport.requiredCheckCoverage.some(item => item.check === "browser_e2e" && item.status === "not_verified");

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    availability,
    passReport,
    failReport,
  };
}

export async function runTestAgentBrowserCookieAssertionSelfTest() {
  const availability = await checkPlaywrightAvailability();
  if (!availability.available) {
    return {
      pass: false,
      availability,
      reason: availability.reason,
    };
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-browser-cookie-assertion-selftest-"));
  const passArtifactDir = path.join(dir, "pass-artifacts");
  const failArtifactDir = path.join(dir, "fail-artifacts");
  const port = await getFreePort();
  const targetUrl = `http://127.0.0.1:${port}/login`;
  fs.writeFileSync(path.join(dir, "server.js"), [
    "const http = require('http');",
    "const html = `<!doctype html>",
    "<html><head><title>Cookie Fixture</title></head>",
    "<body><main>",
    "<h1>Cookie Login</h1>",
    "<button id=\"login\">Sign in</button>",
    "<p id=\"status\">Signed out</p>",
    "<script>",
    "document.getElementById('login').addEventListener('click', async () => {",
    "  const response = await fetch('/api/login', { method: 'POST' });",
    "  document.getElementById('status').textContent = response.ok ? 'Signed in' : 'Sign in failed';",
    "});",
    "</script>",
    "</main></body></html>`;",
    "http.createServer((req, res) => {",
    "  const route = String(req.url || '/').split('?')[0];",
    "  if (route === '/api/login') {",
    "    res.writeHead(200, {'content-type':'text/plain', 'set-cookie':'ccm_session=verified-token-123; Path=/; SameSite=Lax'});",
    "    res.end('ok');",
    "    return;",
    "  }",
    "  res.writeHead(200, {'content-type':'text/html'});",
    "  res.end(html);",
    "}).listen(process.env.PORT);",
  ].join("\n"), "utf-8");

  const baseProject = {
    name: "browser-cookie-assertion-self-test",
    workDir: dir,
    runCommand: `"${process.execPath}" server.js`,
    targetUrl,
    env: { PORT: port },
  };

  const browserCheck = {
    name: "Login sets session cookie",
    url: targetUrl,
    actions: [
      { type: "goto", url: targetUrl },
      { type: "click", text: "Sign in", exact: true },
      { type: "waitForText", text: "Signed in" },
    ],
    assertions: [
      { type: "text", text: "Signed in" },
      { assertion: "has_cookie", key: "ccm_session" } as any,
      { assertion: "cookie_includes", key: "ccm_session", value: "verified-token" } as any,
      { type: "consoleNoErrors" },
      { type: "networkNoErrors" },
    ],
    screenshot: true,
  } as any;

  const passReport = await runTestAgent({
    id: `browser-cookie-pass-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent can prove a login flow sets a session cookie.",
    acceptanceCriteria: ["Signing in sets the ccm_session cookie."],
    requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
    projects: [{
      ...baseProject,
      browserChecks: [browserCheck],
    }],
    options: {
      artifactDir: passArtifactDir,
      browserProvider: "playwright",
      collectBrowserArtifacts: false,
    },
  }, { browserProvider: "playwright" });

  const failReport = await runTestAgent({
    id: `browser-cookie-fail-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent fails when a session cookie value does not match the expected shape.",
    acceptanceCriteria: ["Signing in sets a cookie containing another-token."],
    requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
    projects: [{
      ...baseProject,
      browserChecks: [{
        ...browserCheck,
        assertions: [
          { type: "text", text: "Signed in" },
          { type: "cookieExists", key: "ccm_session" },
          { type: "cookieValueIncludes", key: "ccm_session", value: "another-token" },
          { type: "consoleNoErrors" },
          { type: "networkNoErrors" },
        ],
      }],
    }],
    options: {
      artifactDir: failArtifactDir,
      browserProvider: "playwright",
      collectBrowserArtifacts: false,
    },
  }, { browserProvider: "playwright" });

  const passBrowser = passReport.browserResults[0];
  const failBrowser = failReport.browserResults[0];
  const failCookieValue = failBrowser?.steps.find(step => step.name === "assert:cookieValueIncludes");
  const pass = passReport.status === "passed"
    && passBrowser?.provider === "playwright"
    && passBrowser?.status === "passed"
    && passBrowser?.steps.some(step => step.name === "assert:cookieExists" && step.status === "passed" && String(step.detail || "").includes("cookie=ccm_session"))
    && passBrowser?.steps.some(step => step.name === "assert:cookieValueIncludes" && step.status === "passed" && String(step.detail || "").includes("expected substring length=14"))
    && failReport.status === "failed"
    && failBrowser?.provider === "playwright"
    && failBrowser?.status === "failed"
    && failCookieValue?.status === "failed"
    && String(failCookieValue?.error || "").includes("cookie=ccm_session")
    && !String(failCookieValue?.error || "").includes("verified-token-123")
    && failReport.requiredCheckCoverage.some(item => item.check === "browser_e2e" && item.status === "not_verified");

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    availability,
    passReport,
    failReport,
  };
}

export async function runTestAgentPlaywrightDownloadArtifactSelfTest() {
  const availability = await checkPlaywrightAvailability();
  if (!availability.available) {
    return {
      pass: false,
      availability,
      reason: availability.reason,
    };
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-playwright-download-artifact-selftest-"));
  const artifactDir = path.join(dir, "artifacts");
  const port = await getFreePort();
  const targetUrl = `http://127.0.0.1:${port}/exports`;
  fs.writeFileSync(path.join(dir, "server.js"), [
    "const http = require('http');",
    "const html = `<!doctype html>",
    "<html><head><title>Export Fixture</title></head>",
    "<body><main>",
    "<h1>Exports</h1>",
    "<button type=\"button\" id=\"export\">Export CSV</button>",
    "<p id=\"status\" role=\"status\">Ready</p>",
    "</main>",
    "<script>",
    "document.getElementById('export').addEventListener('click', () => {",
    "  const csv = 'title,status\\\\nShip TestAgent,done\\\\n';",
    "  const blob = new Blob([csv], { type: 'text/csv' });",
    "  const link = document.createElement('a');",
    "  link.href = URL.createObjectURL(blob);",
    "  link.download = 'tasks.csv';",
    "  document.body.appendChild(link);",
    "  link.click();",
    "  document.getElementById('status').textContent = 'Export started';",
    "  setTimeout(() => { URL.revokeObjectURL(link.href); link.remove(); }, 1000);",
    "});",
    "</script>",
    "</body></html>`;",
    "http.createServer((req, res) => { res.writeHead(200, {'content-type':'text/html'}); res.end(html); }).listen(process.env.PORT);",
  ].join("\n"), "utf-8");

  const report = await runTestAgent({
    id: `playwright-download-artifact-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent can prove a browser download happened and preserve the file as evidence.",
    acceptanceCriteria: ["Clicking Export CSV downloads tasks.csv containing Ship TestAgent."],
    requiredChecks: ["browser_e2e", "browser_download", "browser_artifacts", "console_errors"],
    projects: [{
      name: "playwright-download-artifact-self-test",
      workDir: dir,
      runCommand: `"${process.execPath}" server.js`,
      targetUrl,
      env: { PORT: port },
      browserChecks: [{
        name: "CSV export download",
        url: targetUrl,
        actions: [
          { type: "goto", url: targetUrl },
          { type: "click", role: "button", name: "Export CSV", exact: true },
        ],
        assertions: [
          { type: "downloadedFile", fileName: "tasks.csv", contentIncludes: "Ship TestAgent", minBytes: 20 },
          { type: "text", text: "Export started" },
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
  const downloadArtifact = (browser?.browserArtifacts || []).find(item => item.type === "download");
  const downloadText = downloadArtifact?.path && fs.existsSync(downloadArtifact.path) ? fs.readFileSync(downloadArtifact.path, "utf-8") : "";
  const manifestPath = String((report.metadata.artifactFiles as any)?.manifestPath || "");
  const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, "utf-8")) : null;
  const manifestDownload = (manifest?.files || []).find((item: any) => item.source === "playwright:download");
  const interaction = report.browserInteractionSummary?.[0];
  const byCheck = new Map(report.requiredCheckCoverage.map(item => [item.check, item]));
  const pass = report.status === "passed"
    && browser?.provider === "playwright"
    && browser?.status === "passed"
    && browser?.finalUrl === targetUrl
    && browser?.pageTextPreview?.includes("Export started")
    && browser?.steps.some(step => step.name === "action:click" && step.status === "passed" && String(step.detail || "").includes("Export CSV"))
    && browser?.steps.some(step => step.name === "assert:downloadedFile" && step.status === "passed" && String(step.detail || "").includes("filename=tasks.csv") && String(step.detail || "").includes("Ship TestAgent"))
    && downloadArtifact?.path
    && downloadArtifact?.mediaType === "text/csv"
    && fs.existsSync(downloadArtifact.path)
    && downloadText.includes("title,status")
    && downloadText.includes("Ship TestAgent,done")
    && manifestDownload?.path === downloadArtifact.path
    && byCheck.get("browser_download")?.status === "verified"
    && byCheck.get("browser_artifacts")?.status === "verified"
    && interaction?.assertionTypes?.downloadedFile === 1
    && report.acceptanceCoverage.every(item => item.status === "verified");

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    report,
    availability,
    downloadArtifact,
    manifest,
  };
}