// Behavior-freeze extraction from self-test-browser-assertions.ts (part-04.ts).
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

