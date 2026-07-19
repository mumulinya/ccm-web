// Behavior-freeze extraction from self-test-browser-assertions.ts (part-05.ts).
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
