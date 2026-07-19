// Behavior-freeze extraction from self-test-browser-flows.ts (part-01.ts).
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


export function runTestAgentBrowserCheckSourceMetadataSelfTest() {
  const baseUrl = "http://127.0.0.1:43123/";
  const project = {
    name: "browser-check-source-metadata-self-test",
    workDir: process.cwd(),
    runCommand: "",
    devServerCommand: "",
    targetUrl: baseUrl,
    startupUrl: baseUrl,
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
  };
  const autoCriteria = ['Home page shows "Welcome aboard".'];
  const pathCriteria = ['Tasks page at /tasks shows "Tasks Ready".'];
  const formCriteria = ['At /form, enter "Buy milk" into "Task", click "Add task", then shows "Buy milk".'];
  const invalidFormCriteria = ['At /login, enter "bad@example.test" into "Email" and enter "wrong-password" into "Password", click "Sign in", then stays on /login and shows "Invalid password".'];
  const clipboardCriteria = ['At /invite, click "Copy invite", then clipboard equals "Invite Code: TEAM-42".'];
  const dialogCriteria = ['At /dialogs, click "Show alert", then alert dialog includes "Saved profile dialog".'];
  const dragCriteria = ['At /board, drag "Ship release" to "Done column", then shows "Ship release moved to Done".'];
  const popupCriteria = ['At /support, click "Open help", then opens a new tab at /help containing "Help popup ready".'];
  const downloadCriteria = ['At /exports, click "Export CSV", then downloads "tasks.csv" containing "Ship TestAgent".'];
  const uploadCriteria = ['At /upload, upload "notes.txt" containing "Ship TestAgent upload payload" to "Attachment", click "Upload", then shows "Uploaded notes.txt".'];
  const repeatedClickCriteria = ['At /retry, click "Retry" 3 times, then shows "Retry stable".'];
  const keyboardCriteria = ['At /shortcuts, press "Control+K" keyboard shortcut, then shows "Command palette ready".'];
  const networkStateCriteria = ['At /network-state, when the browser goes offline, shows "Browser offline".'];
  const clickCriteria = ['At /menu, click "Open settings", then shows "Settings panel ready".'];
  const hoverCriteria = ['At /menu, hover "Tools", then shows "Export report".'];
  const scrollCriteria = ['At /landing, scroll down, then shows "Ready after scroll".'];
  const responsiveCriteria = ['Mobile responsive page at /responsive shows "Mobile navigation ready" with no horizontal overflow.'];
  const allCriteria = [
    ...pathCriteria,
    ...formCriteria,
    ...invalidFormCriteria,
    ...clipboardCriteria,
    ...dialogCriteria,
    ...dragCriteria,
    ...popupCriteria,
    ...downloadCriteria,
    ...uploadCriteria,
    ...repeatedClickCriteria,
    ...keyboardCriteria,
    ...networkStateCriteria,
    ...clickCriteria,
    ...hoverCriteria,
    ...scrollCriteria,
    ...responsiveCriteria,
  ];

  const autoCheck = buildAutoBrowserSmokeCheck(project as any, autoCriteria);
  const pathCheck = buildAcceptancePathBrowserSmokeChecks(project as any, pathCriteria)[0];
  const formCheck = buildAcceptanceFormFlowBrowserChecks(project as any, formCriteria)[0];
  const invalidFormCheck = buildAcceptanceFormFlowBrowserChecks(project as any, invalidFormCriteria)[0];
  const clipboardCheck = buildAcceptanceClipboardFlowBrowserChecks(project as any, clipboardCriteria)[0];
  const dialogCheck = buildAcceptanceDialogFlowBrowserChecks(project as any, dialogCriteria)[0];
  const dragCheck = buildAcceptanceDragFlowBrowserChecks(project as any, dragCriteria)[0];
  const popupCheck = buildAcceptancePopupFlowBrowserChecks(project as any, popupCriteria)[0];
  const downloadCheck = buildAcceptanceDownloadFlowBrowserChecks(project as any, downloadCriteria)[0];
  const uploadCheck = buildAcceptanceUploadFlowBrowserChecks(project as any, uploadCriteria)[0];
  const repeatedClickCheck = buildAcceptanceRepeatedClickBrowserChecks(project as any, repeatedClickCriteria)[0];
  const keyboardCheck = buildAcceptanceKeyboardFlowBrowserChecks(project as any, keyboardCriteria)[0];
  const networkStateCheck = buildAcceptanceNetworkStateFlowBrowserChecks(project as any, networkStateCriteria)[0];
  const clickCheck = buildAcceptanceClickFlowBrowserChecks(project as any, clickCriteria)[0];
  const hoverCheck = buildAcceptanceHoverFlowBrowserChecks(project as any, hoverCriteria)[0];
  const scrollCheck = buildAcceptanceScrollFlowBrowserChecks(project as any, scrollCriteria)[0];
  const responsiveCheck = buildAcceptanceResponsiveBrowserChecks(project as any, responsiveCriteria)[0];
  const generatedChecks = buildBrowserChecksForProject(project as any, allCriteria);

  const hasSource = (check: any, generatedBy: string, criteria: string[]) => {
    const context = check?.context || {};
    const actualCriteria = Array.isArray(context.acceptanceCriteria)
      ? context.acceptanceCriteria.map((item: any) => String(item))
      : [];
    return context.source === "acceptance_criteria"
      && context.generatedBy === generatedBy
      && criteria.every(item => actualCriteria.includes(item));
  };
  const generatedBy = new Set(generatedChecks.map(check => String(check.context?.generatedBy || "")));
  const allGeneratedChecksHaveSource = generatedChecks.length > 0
    && generatedChecks.every(check => {
      const context = check.context || {};
      return context.source === "acceptance_criteria"
        && typeof context.generatedBy === "string"
        && context.generatedBy.length > 0
        && Array.isArray(context.acceptanceCriteria)
        && context.acceptanceCriteria.length > 0;
    });

  const pass = hasSource(autoCheck, AUTO_BROWSER_SMOKE_PROBE_TYPE, autoCriteria)
    && hasSource(pathCheck, "acceptance_path_smoke", pathCriteria)
    && hasSource(formCheck, ACCEPTANCE_FORM_FLOW_PROBE_TYPE, formCriteria)
    && hasSource(invalidFormCheck, ACCEPTANCE_FORM_FLOW_PROBE_TYPE, invalidFormCriteria)
    && invalidFormCheck?.adversarial === true
    && invalidFormCheck?.context?.adversarialIntent === "invalid_form_input"
    && hasSource(clipboardCheck, ACCEPTANCE_CLIPBOARD_FLOW_PROBE_TYPE, clipboardCriteria)
    && hasSource(dialogCheck, ACCEPTANCE_DIALOG_FLOW_PROBE_TYPE, dialogCriteria)
    && hasSource(dragCheck, ACCEPTANCE_DRAG_FLOW_PROBE_TYPE, dragCriteria)
    && hasSource(popupCheck, ACCEPTANCE_POPUP_FLOW_PROBE_TYPE, popupCriteria)
    && hasSource(downloadCheck, ACCEPTANCE_DOWNLOAD_FLOW_PROBE_TYPE, downloadCriteria)
    && hasSource(uploadCheck, ACCEPTANCE_UPLOAD_FLOW_PROBE_TYPE, uploadCriteria)
    && hasSource(repeatedClickCheck, ACCEPTANCE_REPEATED_CLICK_PROBE_TYPE, repeatedClickCriteria)
    && repeatedClickCheck?.adversarial === true
    && hasSource(keyboardCheck, ACCEPTANCE_KEYBOARD_FLOW_PROBE_TYPE, keyboardCriteria)
    && hasSource(networkStateCheck, ACCEPTANCE_NETWORK_STATE_FLOW_PROBE_TYPE, networkStateCriteria)
    && hasSource(clickCheck, ACCEPTANCE_CLICK_FLOW_PROBE_TYPE, clickCriteria)
    && hasSource(hoverCheck, ACCEPTANCE_HOVER_FLOW_PROBE_TYPE, hoverCriteria)
    && hasSource(scrollCheck, ACCEPTANCE_SCROLL_FLOW_PROBE_TYPE, scrollCriteria)
    && hasSource(responsiveCheck, ACCEPTANCE_RESPONSIVE_PROBE_TYPE, responsiveCriteria)
    && allGeneratedChecksHaveSource
    && generatedBy.has("acceptance_path_smoke")
    && generatedBy.has(ACCEPTANCE_FORM_FLOW_PROBE_TYPE)
    && generatedBy.has(ACCEPTANCE_CLIPBOARD_FLOW_PROBE_TYPE)
    && generatedBy.has(ACCEPTANCE_DIALOG_FLOW_PROBE_TYPE)
    && generatedBy.has(ACCEPTANCE_DRAG_FLOW_PROBE_TYPE)
    && generatedBy.has(ACCEPTANCE_POPUP_FLOW_PROBE_TYPE)
    && generatedBy.has(ACCEPTANCE_DOWNLOAD_FLOW_PROBE_TYPE)
    && generatedBy.has(ACCEPTANCE_UPLOAD_FLOW_PROBE_TYPE)
    && generatedBy.has(ACCEPTANCE_REPEATED_CLICK_PROBE_TYPE)
    && generatedBy.has(ACCEPTANCE_KEYBOARD_FLOW_PROBE_TYPE)
    && generatedBy.has(ACCEPTANCE_NETWORK_STATE_FLOW_PROBE_TYPE)
    && generatedBy.has(ACCEPTANCE_CLICK_FLOW_PROBE_TYPE)
    && generatedBy.has(ACCEPTANCE_HOVER_FLOW_PROBE_TYPE)
    && generatedBy.has(ACCEPTANCE_SCROLL_FLOW_PROBE_TYPE)
    && generatedBy.has(ACCEPTANCE_RESPONSIVE_PROBE_TYPE)
    && !responsiveCheck?.assertions?.some(assertion => assertion.type === "notVisible" && assertion.text === "Mobile navigation ready")
    && responsiveCheck?.assertions?.some(assertion => assertion.type === "text" && assertion.text === "Mobile navigation ready") === true;

  return {
    pass,
    autoCheck,
    pathCheck,
    formCheck,
    invalidFormCheck,
    clipboardCheck,
    dialogCheck,
    dragCheck,
    popupCheck,
    downloadCheck,
    uploadCheck,
    repeatedClickCheck,
    keyboardCheck,
    networkStateCheck,
    clickCheck,
    hoverCheck,
    scrollCheck,
    responsiveCheck,
    generatedChecks,
  };
}

export async function runTestAgentAcceptanceNetworkStateFlowSelfTest() {
  const availability = await checkPlaywrightAvailability();
  if (!availability.available) {
    return {
      pass: false,
      availability,
      reason: availability.reason,
    };
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-acceptance-network-state-flow-selftest-"));
  const artifactDir = path.join(dir, "artifacts");
  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}/`;
  const networkStateUrl = `http://127.0.0.1:${port}/network-state`;
  const offlineText = "Browser offline";
  const recoveredText = "浏览器已恢复在线";
  const acceptanceCriteria = [
    `At /network-state, when the browser goes offline, shows "${offlineText}".`,
    `在 /network-state 断网后恢复在线，然后显示 "${recoveredText}"。`,
  ];
  fs.writeFileSync(path.join(dir, "server.js"), [
    "const http = require('http');",
    "const html = `<!doctype html>",
    "<html><head><title>Network State Flow Fixture</title><link rel=\"icon\" href=\"data:,\"></head>",
    "<body><main>",
    "<h1>Network state</h1>",
    "<p id=\"status\" role=\"status\">Checking network</p>",
    "<script>",
    "const status = document.getElementById('status');",
    "let wasOffline = false;",
    "function render() {",
    `  if (!navigator.onLine) { wasOffline = true; status.textContent = '${offlineText}'; return; }`,
    `  status.textContent = wasOffline ? '${recoveredText}' : 'Browser online';`,
    "}",
    "window.addEventListener('online', render);",
    "window.addEventListener('offline', render);",
    "render();",
    "</script>",
    "</main></body></html>`;",
    "const root = '<!doctype html><title>Home</title><main><h1>Home</h1></main>';",
    "http.createServer((req, res) => {",
    "  const route = String(req.url || '/').split('?')[0];",
    "  res.writeHead(200, {'content-type':'text/html; charset=utf-8'});",
    "  res.end(route === '/network-state' ? html : root);",
    "}).listen(process.env.PORT);",
  ].join("\n"), "utf-8");

  const project = {
    name: "acceptance-network-state-flow-self-test",
    workDir: dir,
    runCommand: `"${process.execPath}" server.js`,
    devServerCommand: `"${process.execPath}" server.js`,
    targetUrl: baseUrl,
    startupUrl: baseUrl,
    startupTimeoutMs: 30_000,
    env: { PORT: String(port) },
    changedFiles: [],
    verificationCommands: [],
    httpChecks: [],
    adversarialHttpChecks: [],
    adversarialBrowserChecks: [],
    browserChecks: [],
    agentSummary: "",
    risks: [],
  };
  const networkStateChecks = buildAcceptanceNetworkStateFlowBrowserChecks(project, acceptanceCriteria);
  const generatedChecks = buildBrowserChecksForProject(project, acceptanceCriteria);

  const report = await runTestAgent({
    id: `acceptance-network-state-flow-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent can infer offline and online-recovery browser flows from acceptance criteria.",
    acceptanceCriteria,
    requiredChecks: ["http", "browser_e2e", "browser_network_state", "browser_visibility", "browser_layout", "screenshots", "console_errors"],
    projects: [{
      name: project.name,
      workDir: dir,
      runCommand: project.runCommand,
      targetUrl: baseUrl,
      env: { PORT: port },
    }],
    options: {
      artifactDir,
      browserProvider: "playwright",
      collectBrowserArtifacts: false,
    },
  }, { browserProvider: "playwright" });

  const byCheck = new Map(report.requiredCheckCoverage.map(item => [item.check, item]));
  const stateResults = report.browserResults.filter(result => result.probeType === ACCEPTANCE_NETWORK_STATE_FLOW_PROBE_TYPE);
  const generatedStateChecks = generatedChecks.filter(check => check.probeType === ACCEPTANCE_NETWORK_STATE_FLOW_PROBE_TYPE);
  const generatedPathChecks = generatedChecks.filter(check => check.context?.generatedBy === "acceptance_path_smoke");
  const targets = [
    { mode: "offline", expected: offlineText, assertionType: "browserOffline", onlineAction: false },
    { mode: "online_recovery", expected: recoveredText, assertionType: "browserOnline", onlineAction: true },
  ];
  const checksCoverTargets = networkStateChecks.length === 2
    && targets.every(item => networkStateChecks.some(check =>
      check.url === networkStateUrl
      && check.context?.generatedBy === ACCEPTANCE_NETWORK_STATE_FLOW_PROBE_TYPE
      && check.context?.networkStateMode === item.mode
      && check.context?.expectedText === item.expected
      && check.actions?.some(action => action.type === "setOffline")
      && check.actions?.some(action => action.type === "setOnline") === item.onlineAction
      && check.assertions?.some(assertion => assertion.type === item.assertionType)
      && check.assertions?.some(assertion => assertion.type === "visible" && assertion.text === item.expected)
      && check.assertions?.some(assertion => assertion.type === "inViewport" && assertion.text === item.expected)
      && !check.assertions?.some(assertion => assertion.type === "networkNoErrors")
    ));
  const resultsCoverTargets = stateResults.length === 2
    && targets.every(item => stateResults.some(result =>
      result.status === "passed"
      && result.provider === "playwright"
      && result.url === networkStateUrl
      && result.finalUrl === networkStateUrl
      && result.context?.generatedBy === ACCEPTANCE_NETWORK_STATE_FLOW_PROBE_TYPE
      && result.context?.networkStateMode === item.mode
      && result.context?.expectedText === item.expected
      && result.steps.some(step => step.name === "action:setOffline" && step.status === "passed")
      && result.steps.some(step => step.name === "action:setOnline" && step.status === "passed") === item.onlineAction
      && result.steps.some(step => step.name === `assert:${item.assertionType}` && step.status === "passed")
      && result.steps.some(step => step.name === "assert:visible" && step.status === "passed" && String(step.detail || "").includes(item.expected))
      && result.pageTextPreview?.includes(item.expected)
    ));
  const pass = checksCoverTargets
    && generatedStateChecks.length === 2
    && generatedPathChecks.length === 0
    && generatedChecks.length === 2
    && report.status === "passed"
    && report.browserResults.length === 2
    && resultsCoverTargets
    && byCheck.get("browser_network_state")?.status === "verified"
    && byCheck.get("browser_visibility")?.status === "verified"
    && byCheck.get("browser_layout")?.status === "verified"
    && byCheck.get("browser_e2e")?.status === "verified"
    && byCheck.get("screenshots")?.status === "verified"
    && report.acceptanceCoverage.every(item => item.status === "verified");

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    availability,
    networkStateChecks,
    generatedChecks,
    report,
  };
}

export async function runTestAgentAcceptanceHistoryFlowSelfTest() {
  const availability = await checkPlaywrightAvailability();
  if (!availability.available) {
    return {
      pass: false,
      availability,
      reason: availability.reason,
    };
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-acceptance-history-flow-selftest-"));
  const artifactDir = path.join(dir, "artifacts");
  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}/`;
  const historyUrl = `http://127.0.0.1:${port}/history`;
  const chineseDetailUrl = `http://127.0.0.1:${port}/history/chinese`;
  const acceptanceCriteria = [
    'At /history, click link "Open English detail" to /history/english, then browser Back shows "History list".',
    '在 /history 点击链接 "打开中文详情" 进入 /history/chinese，浏览器返回后显示 "历史列表"，再前进后显示 "中文详情"。',
  ];
  fs.writeFileSync(path.join(dir, "server.js"), [
    "const http = require('http');",
    "const list = `<!doctype html>",
    "<html><head><title>History List</title><link rel=\"icon\" href=\"data:,\"></head>",
    "<body><main>",
    "<h1>History list</h1><p>历史列表</p>",
    "<a href=\"/history/english\">Open English detail</a>",
    "<a href=\"/history/chinese\">打开中文详情</a>",
    "</main></body></html>`;",
    "const english = '<!doctype html><title>English Detail</title><link rel=\"icon\" href=\"data:,\"><main><h1>English detail</h1></main>';",
    "const chinese = '<!doctype html><title>Chinese Detail</title><link rel=\"icon\" href=\"data:,\"><main><h1>中文详情</h1></main>';",
    "const root = '<!doctype html><title>Home</title><link rel=\"icon\" href=\"data:,\"><main><h1>Home</h1></main>';",
    "http.createServer((req, res) => {",
    "  const route = String(req.url || '/').split('?')[0];",
    "  const html = route === '/history' ? list : route === '/history/english' ? english : route === '/history/chinese' ? chinese : root;",
    "  res.writeHead(200, {'content-type':'text/html; charset=utf-8'});",
    "  res.end(html);",
    "}).listen(process.env.PORT);",
  ].join("\n"), "utf-8");

  const project = {
    name: "acceptance-history-flow-self-test",
    workDir: dir,
    runCommand: `"${process.execPath}" server.js`,
    devServerCommand: `"${process.execPath}" server.js`,
    targetUrl: baseUrl,
    startupUrl: baseUrl,
    startupTimeoutMs: 30_000,
    env: { PORT: String(port) },
    changedFiles: [],
    verificationCommands: [],
    httpChecks: [],
    adversarialHttpChecks: [],
    adversarialBrowserChecks: [],
    browserChecks: [],
    agentSummary: "",
    risks: [],
  };
  const historyChecks = buildAcceptanceHistoryFlowBrowserChecks(project, acceptanceCriteria);
  const ambiguousPageBackChecks = buildAcceptanceHistoryFlowBrowserChecks(project, [
    'At /history, click "Back" button and show "History list".',
    '在 /history 点击 "返回" 按钮并显示 "历史列表"。',
  ]);
  const generatedChecks = buildBrowserChecksForProject(project, acceptanceCriteria);

  const report = await runTestAgent({
    id: `acceptance-history-flow-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent can infer browser Back and Forward acceptance flows.",
    acceptanceCriteria,
    requiredChecks: ["browser_e2e", "browser_history", "browser_navigation", "browser_wait", "browser_visibility", "browser_layout", "screenshots", "console_errors"],
    projects: [{
      name: project.name,
      workDir: dir,
      runCommand: project.runCommand,
      targetUrl: baseUrl,
      env: { PORT: port },
    }],
    options: {
      artifactDir,
      browserProvider: "playwright",
      collectBrowserArtifacts: false,
    },
  }, { browserProvider: "playwright" });

  const byCheck = new Map(report.requiredCheckCoverage.map(item => [item.check, item]));
  const historyResults = report.browserResults.filter(result => result.probeType === ACCEPTANCE_HISTORY_FLOW_PROBE_TYPE);
  const generatedHistoryChecks = generatedChecks.filter(check => check.probeType === ACCEPTANCE_HISTORY_FLOW_PROBE_TYPE);
  const generatedClickChecks = generatedChecks.filter(check => check.probeType === ACCEPTANCE_CLICK_FLOW_PROBE_TYPE);
  const generatedPathChecks = generatedChecks.filter(check => check.context?.generatedBy === "acceptance_path_smoke");
  const targets = [
    {
      mode: "back",
      targetName: "Open English detail",
      destinationPath: "/history/english",
      finalUrl: historyUrl,
      backText: "History list",
      forwardText: "",
      forward: false,
    },
    {
      mode: "back_forward",
      targetName: "打开中文详情",
      destinationPath: "/history/chinese",
      finalUrl: chineseDetailUrl,
      backText: "历史列表",
      forwardText: "中文详情",
      forward: true,
    },
  ];
  const checksCoverTargets = historyChecks.length === 2
    && targets.every(item => historyChecks.some(check =>
      check.url === historyUrl
      && check.context?.generatedBy === ACCEPTANCE_HISTORY_FLOW_PROBE_TYPE
      && check.context?.historyMode === item.mode
      && check.context?.initialPath === "/history"
      && check.context?.destinationPath === item.destinationPath
      && check.context?.targetName === item.targetName
      && check.context?.backExpectedText === item.backText
      && check.context?.forwardExpectedText === item.forwardText
      && check.actions?.some(action => action.type === "click" && action.role === "link" && action.name === item.targetName)
      && check.actions?.some(action => action.type === "goBack")
      && check.actions?.some(action => action.type === "goForward") === item.forward
      && check.actions?.some(action => action.type === "waitForText" && action.text === item.backText)
      && (!item.forward || check.actions?.some(action => action.type === "waitForText" && action.text === item.forwardText))
    ));
  const resultsCoverTargets = historyResults.length === 2
    && targets.every(item => historyResults.some(result =>
      result.status === "passed"
      && result.provider === "playwright"
      && result.url === historyUrl
      && result.finalUrl === item.finalUrl
      && result.context?.generatedBy === ACCEPTANCE_HISTORY_FLOW_PROBE_TYPE
      && result.context?.historyMode === item.mode
      && result.steps.some(step => step.name === "action:goBack" && step.status === "passed")
      && result.steps.some(step => step.name === "action:goForward" && step.status === "passed") === item.forward
      && result.steps.some(step => step.name === "action:waitForText" && step.status === "passed" && String(step.detail || "").includes(item.backText))
      && result.pageTextPreview?.includes(item.forward ? item.forwardText : item.backText)
    ));
  const pass = checksCoverTargets
    && ambiguousPageBackChecks.length === 0
    && generatedHistoryChecks.length === 2
    && generatedClickChecks.length === 0
    && generatedPathChecks.length === 0
    && generatedChecks.length === 2
    && report.status === "passed"
    && report.browserResults.length === 2
    && resultsCoverTargets
    && report.browserFlowSummary?.total === 2
    && report.browserFlowSummary?.flowTypeCount === 1
    && report.browserFlowSummary?.items[0]?.flowType === ACCEPTANCE_HISTORY_FLOW_PROBE_TYPE
    && byCheck.get("browser_history")?.status === "verified"
    && byCheck.get("browser_navigation")?.status === "verified"
    && byCheck.get("browser_wait")?.status === "verified"
    && byCheck.get("browser_visibility")?.status === "verified"
    && byCheck.get("browser_layout")?.status === "verified"
    && byCheck.get("browser_e2e")?.status === "verified"
    && byCheck.get("screenshots")?.status === "verified"
    && report.acceptanceCoverage.every(item => item.status === "verified");

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    availability,
    historyChecks,
    ambiguousPageBackChecks,
    generatedChecks,
    report,
  };
}

export async function runTestAgentMultiSessionBrowserSelfTest() {
  const availability = await checkPlaywrightAvailability();
  if (!availability.available) {
    return {
      pass: false,
      availability,
      reason: availability.reason,
    };
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-multi-session-browser-selftest-"));
  const artifactDir = path.join(dir, "artifacts");
  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}/`;
  const message = "Hello from Alice";
  const renderedMessage = `alice: ${message}`;
  const criterion = `When Alice sends "${message}" in the open chat, Bob's already-open browser session shows "${renderedMessage}".`;
  fs.writeFileSync(path.join(dir, "server.js"), [
    "const http = require('http');",
    "const messages = [];",
    "const timings = {};",
    "const html = `<!doctype html>",
    "<html><head><title>Multi-session Chat</title><link rel=\"icon\" href=\"data:,\"></head>",
    "<body><main>",
    "<h1>Shared chat</h1>",
    "<p>Signed in as <strong id=\"identity\"></strong></p>",
    "<ul id=\"messages\" aria-label=\"Messages\"></ul>",
    "<form id=\"composer\"><label>Message <input name=\"message\"></label><button type=\"submit\">Send</button></form>",
    "<script>",
    "const user = new URL(location.href).searchParams.get('user') || 'anonymous';",
    "document.getElementById('identity').textContent = user;",
    "const list = document.getElementById('messages');",
    "async function refresh() {",
    "  const response = await fetch('/messages');",
    "  if (!response.ok) throw new Error('message fetch failed ' + response.status);",
    "  const items = await response.json();",
    "  list.replaceChildren(...items.map(item => { const li = document.createElement('li'); li.textContent = item.user + ': ' + item.text; return li; }));",
    "}",
    "document.getElementById('composer').addEventListener('submit', async event => {",
    "  event.preventDefault();",
    "  const input = event.currentTarget.elements.message;",
    "  const response = await fetch('/messages', { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify({ user, text: input.value }) });",
    "  if (!response.ok) throw new Error('message send failed ' + response.status);",
    "  input.value = '';",
    "  await refresh();",
    "});",
    "refresh().catch(error => console.error(error));",
    "setInterval(() => refresh().catch(error => console.error(error)), 100);",
    "</script>",
    "</main></body></html>`;",
    "http.createServer((req, res) => {",
    "  const parsed = new URL(req.url || '/', 'http://127.0.0.1');",
    "  if (req.method === 'POST' && parsed.pathname === '/timing') {",
    "    timings[String(parsed.searchParams.get('session') || '')] = Date.now();",
    "    res.writeHead(200, {'content-type':'application/json; charset=utf-8'});",
    "    res.end(JSON.stringify({ ok: true }));",
    "    return;",
    "  }",
    "  if (req.method === 'GET' && parsed.pathname === '/timings') {",
    "    res.writeHead(200, {'content-type':'application/json; charset=utf-8'});",
    "    res.end(JSON.stringify(timings));",
    "    return;",
    "  }",
    "  if (req.method === 'GET' && parsed.pathname === '/messages') {",
    "    res.writeHead(200, {'content-type':'application/json; charset=utf-8'});",
    "    res.end(JSON.stringify(messages));",
    "    return;",
    "  }",
    "  if (req.method === 'POST' && parsed.pathname === '/messages') {",
    "    let body = '';",
    "    req.on('data', chunk => { body += chunk; });",
    "    req.on('end', () => {",
    "      const item = JSON.parse(body || '{}');",
    "      messages.push({ user: String(item.user || ''), text: String(item.text || '') });",
    "      res.writeHead(201, {'content-type':'application/json; charset=utf-8'});",
    "      res.end(JSON.stringify({ ok: true }));",
    "    });",
    "    return;",
    "  }",
    "  res.writeHead(200, {'content-type':'text/html; charset=utf-8'});",
    "  res.end(html);",
    "}).listen(process.env.PORT);",
  ].join("\n"), "utf-8");

  const browserCheck = {
    name: "Alice message appears in Bob session",
    screenshot: true,
    probeType: MULTI_SESSION_BROWSER_PROBE_TYPE,
    context: {
      source: "acceptance_criteria",
      generatedBy: MULTI_SESSION_BROWSER_PROBE_TYPE,
      acceptanceCriteria: [criterion],
    },
    sessions: [
      {
        name: "sender",
        url: "/chat?user=alice",
        setupActions: [{ type: "setSessionStorage", key: "identity", value: "alice" }],
      },
      {
        name: "receiver",
        url: "/chat?user=bob",
        setupActions: [{ type: "setSessionStorage", key: "identity", value: "bob" }],
      },
    ],
    sessionSteps: [
      {
        parallel: [
          {
            session: "sender",
            action: {
              type: "evaluate",
              text: `new Promise(resolve => setTimeout(resolve, 400)).then(() => fetch('/timing?session=sender', { method: 'POST' }))`,
            },
          },
          {
            session: "receiver",
            action: {
              type: "evaluate",
              text: `new Promise(resolve => setTimeout(resolve, 400)).then(() => fetch('/timing?session=receiver', { method: 'POST' }))`,
            },
          },
        ],
      },
      {
        session: "sender",
        assertion: {
          type: "jsTruthy",
          expression: `fetch('/timings').then(response => response.json()).then(value => Math.abs(Number(value.sender) - Number(value.receiver)) < 200)`,
        },
      },
      { session: "sender", action: { type: "fill", label: "Message", value: message, exact: true } },
      {
        parallel: [
          { session: "receiver", action: { type: "waitForText", text: renderedMessage, timeoutMs: 10_000 } },
          { session: "sender", action: { type: "click", role: "button", name: "Send", exact: true } },
        ],
      },
      { session: "receiver", assertion: { type: "visible", text: renderedMessage, exact: true } },
      {
        compare: {
          leftSession: "sender",
          rightSession: "receiver",
          expression: `document.querySelector('#messages')?.innerText || ""`,
          operator: "equals",
          timeoutMs: 10_000,
          pollMs: 100,
        },
      },
      { session: "receiver", assertion: { type: "sessionStorageEquals", key: "identity", value: "bob" } },
      { session: "sender", assertion: { type: "sessionStorageEquals", key: "identity", value: "alice" } },
      { session: "sender", assertion: { type: "consoleNoErrors" } },
      { session: "receiver", assertion: { type: "consoleNoErrors" } },
      { session: "sender", assertion: { type: "networkNoErrors" } },
      { session: "receiver", assertion: { type: "networkNoErrors" } },
    ],
  };
  const workOrder: any = {
    id: `multi-session-browser-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent can prove a cross-user real-time browser collaboration flow.",
    acceptanceCriteria: [criterion],
    requiredChecks: ["browser_e2e", "browser_multi_session", "browser_session_convergence", "browser_visibility", "browser_storage", "browser_network", "screenshots", "console_errors"],
    projects: [{
      name: "multi-session-browser-self-test",
      workDir: dir,
      runCommand: `"${process.execPath}" server.js`,
      targetUrl: baseUrl,
      env: { PORT: port },
      browserChecks: [browserCheck],
    }],
    options: {
      artifactDir,
      browserProvider: "playwright",
      collectBrowserArtifacts: false,
    },
  };
  const contract = validateTestAgentWorkOrderContract(workOrder);
  const executionPlan = buildTestAgentExecutionPlan(workOrder);
  const mcpExecutionPlan = buildTestAgentExecutionPlan({
    ...workOrder,
    options: { ...workOrder.options, browserProvider: "mcp" },
  });
  const invalidNormalized = normalizeTestAgentWorkOrder({
    ...workOrder,
    id: `${workOrder.id}-invalid`,
    projects: [{
      ...workOrder.projects[0],
      browserChecks: [{
        name: "Invalid multi-session fixture",
        sessions: [{ name: "sender", url: "/chat" }, { name: "receiver", url: "/chat" }],
        sessionSteps: [{ session: "missing", action: { type: "click", text: "Send" } }],
      }, {
        name: "Invalid parallel fixture",
        sessions: [{ name: "sender", url: "/chat" }, { name: "receiver", url: "/chat" }],
        sessionSteps: [{
          parallel: [
            { session: "sender", action: { type: "waitForTimeout", value: "10" } },
            { session: "sender", action: { type: "waitForTimeout", value: "10" } },
          ],
        }],
      }, {
        name: "Invalid comparison fixture",
        sessions: [{ name: "sender", url: "/chat" }, { name: "receiver", url: "/chat" }],
        sessionSteps: [
          { compare: { leftSession: "sender", rightSession: "sender", expression: "document.body.innerText", operator: "equals" } },
        ],
      }],
    }],
  });

  const report = await runTestAgent(workOrder, { browserProvider: "playwright" });
  const verdict = buildTestAgentVerdict(report);
  const cliSummary = formatTestAgentCliReportSummary(report);
  const markdown = buildTestAgentMarkdownReport(report);
  const reportValidation = validateTestAgentReportContract(report);
  const verdictValidation = validateTestAgentVerdictContract(verdict);
  const artifactVerification = verifyTestAgentArtifactManifestFile(String(report.metadata?.artifactFiles?.manifestPath || ""));
  const browser = report.browserResults.find(result => result.probeType === MULTI_SESSION_BROWSER_PROBE_TYPE);
  const sessionNames = new Set((browser?.browserSessions || []).map(session => session.name));
  const senderGotoIndex = browser?.steps.findIndex(step => step.name === "session:sender:action:goto") ?? -1;
  const receiverGotoIndex = browser?.steps.findIndex(step => step.name === "session:receiver:action:goto") ?? -1;
  const senderFillIndex = browser?.steps.findIndex(step => step.name === "session:sender:action:fill") ?? -1;
  const byCheck = new Map(report.requiredCheckCoverage.map(item => [item.check, item]));
  const pass = contract.valid
    && executionPlan.valid
    && executionPlan.summary.browserSessions === 2
    && executionPlan.summary.browserSessionSteps === 14
    && executionPlan.summary.browserParallelGroups === 2
    && executionPlan.summary.browserSessionComparisons === 1
    && executionPlan.projects[0]?.browserChecks[0]?.sessionCount === 2
    && executionPlan.projects[0]?.browserChecks[0]?.sessionStepCount === 14
    && executionPlan.projects[0]?.browserChecks[0]?.parallelGroupCount === 2
    && executionPlan.projects[0]?.browserChecks[0]?.comparisonCount === 1
    && executionPlan.projects[0]?.browserChecks[0]?.actionCount === 7
    && executionPlan.projects[0]?.browserChecks[0]?.assertionCount === 9
    && mcpExecutionPlan.browserProviderWarnings.some(item => item.item === "multiSession" && item.category === "requires_playwright")
    && invalidNormalized.issues.some(item => item.code === "invalid_browser_multi_session" && item.message.includes("unknown session"))
    && invalidNormalized.issues.some(item => item.code === "invalid_browser_multi_session" && item.message.includes("must involve at least two sessions"))
    && invalidNormalized.issues.some(item => item.code === "invalid_browser_multi_session" && item.message.includes("must compare two distinct sessions"))
    && report.status === "passed"
    && browser?.status === "passed"
    && browser?.provider === "playwright"
    && browser?.browserSessions?.length === 2
    && sessionNames.has("sender")
    && sessionNames.has("receiver")
    && browser.browserSessions.every(session => session.screenshots.length === 1)
    && browser.screenshots.length === 2
    && browser.context?.multiSession === true
    && browser.context?.sessionCount === 2
    && browser.context?.sessionStepCount === 14
    && browser.context?.parallelGroupCount === 2
    && browser.context?.comparisonCount === 1
    && senderGotoIndex >= 0
    && receiverGotoIndex > senderGotoIndex
    && senderFillIndex > receiverGotoIndex
    && browser.steps.filter(step => (step.name === "session:sender:action:evaluate" || step.name === "session:receiver:action:evaluate") && String(step.detail || "").includes("parallelGroup=1")).length === 2
    && browser.steps.some(step => step.name === "session:sender:assert:jsTruthy" && step.status === "passed")
    && browser.steps.some(step => step.name === "session:receiver:action:waitForText" && step.status === "passed" && String(step.detail || "").includes("parallelGroup=2"))
    && browser.steps.some(step => step.name === "session:sender:action:click" && step.status === "passed" && String(step.detail || "").includes("parallelGroup=2"))
    && browser.steps.some(step => step.name === "session:receiver:assert:visible" && step.status === "passed")
    && browser.steps.some(step => step.name === "session:sender:assert:sessionCompare" && step.status === "passed" && String(step.detail || "").includes("compareSessions=sender,receiver"))
    && browser.browserSessionComparisons?.length === 1
    && browser.browserSessionComparisons[0]?.left?.sha256 === browser.browserSessionComparisons[0]?.right?.sha256
    && browser.steps.some(step => step.name === "session:receiver:assert:sessionStorageEquals" && step.status === "passed")
    && browser.steps.some(step => step.name === "session:sender:assert:sessionStorageEquals" && step.status === "passed")
    && browser.browserSessions.find(session => session.name === "receiver")?.pageTextPreview?.includes(renderedMessage)
    && report.browserFlowSummary?.total === 1
    && report.browserFlowSummary?.items[0]?.flowType === MULTI_SESSION_BROWSER_PROBE_TYPE
    && report.browserMultiSessionSummary?.total === 1
    && report.browserMultiSessionSummary?.statusCounts.passed === 1
    && report.browserMultiSessionSummary?.sessionCount === 2
    && report.browserMultiSessionSummary?.uniqueSessionCount === 2
    && report.browserMultiSessionSummary?.parallelGroupCount === 2
    && report.browserMultiSessionSummary?.comparisonCount === 1
    && report.browserMultiSessionSummary?.failedComparisonCount === 0
    && report.browserMultiSessionSummary?.actionCount === 9
    && report.browserMultiSessionSummary?.assertionCount === 9
    && report.browserMultiSessionSummary?.screenshotCount === 2
    && verdict.browserMultiSessionSummary?.total === 1
    && verdict.evidenceSummary.browserMultiSessionScenarios === 1
    && verdict.evidenceSummary.browserMultiSessionSessions === 2
    && verdict.evidenceSummary.browserMultiSessionParallelGroups === 2
    && verdict.evidenceSummary.browserMultiSessionComparisons === 1
    && verdict.evidenceSummary.browserFailedSessionComparisons === 0
    && verdict.evidenceSummary.browserFailedMultiSessionScenarios === 0
    && byCheck.get("browser_multi_session")?.status === "verified"
    && byCheck.get("browser_session_convergence")?.status === "verified"
    && byCheck.get("browser_e2e")?.status === "verified"
    && byCheck.get("browser_visibility")?.status === "verified"
    && byCheck.get("browser_storage")?.status === "verified"
    && byCheck.get("browser_network")?.status === "verified"
    && byCheck.get("screenshots")?.status === "verified"
    && report.acceptanceCoverage.every(item => item.status === "verified")
    && cliSummary.includes("Browser multi-session: scenarios=1; passed=1; failed=0; blocked=0; sessions=2; parallelGroups=2; roles=receiver,sender; comparisons=1; failedComparisons=0")
    && markdown.includes("**Browser sessions:**")
    && markdown.includes("## Browser Multi-Session Summary")
    && markdown.includes("receiver:")
    && reportValidation.valid
    && verdictValidation.valid
    && artifactVerification.status === "passed";

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    availability,
    contract,
    executionPlan,
    mcpExecutionPlan,
    invalidNormalized,
    report,
    verdict,
    cliSummary,
    markdown,
    reportValidation,
    verdictValidation,
    artifactVerification,
  };
}

export async function runTestAgentBrowserStabilitySelfTest() {
  const availability = await checkPlaywrightAvailability();
  if (!availability.available) {
    return {
      pass: false,
      availability,
      reason: availability.reason,
    };
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-browser-stability-selftest-"));
  const artifactDir = path.join(dir, "artifacts");
  const port = await getFreePort();
  const targetUrl = `http://127.0.0.1:${port}/stability`;
  fs.writeFileSync(path.join(dir, "server.js"), [
    "const http = require('http');",
    "const html = `<!doctype html>",
    "<html><head><title>Browser Stability Fixture</title></head>",
    "<body><main>",
    "<h1>Browser stability</h1>",
    "<p id=\"prior\">Prior visits pending</p>",
    "<p id=\"current\">Current visits pending</p>",
    "<script>",
    "const previous = Number(localStorage.getItem('stabilityVisits') || '0');",
    "localStorage.setItem('stabilityVisits', String(previous + 1));",
    "document.getElementById('prior').textContent = 'Prior visits ' + previous;",
    "document.getElementById('current').textContent = 'Current visits ' + (previous + 1);",
    "</script>",
    "</main></body></html>`;",
    "http.createServer((req, res) => {",
    "  res.writeHead(200, {'content-type':'text/html'});",
    "  res.end(html);",
    "}).listen(process.env.PORT);",
  ].join("\n"), "utf-8");

  const input = {
    id: `browser-stability-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify a browser feature remains stable across isolated reruns.",
    acceptanceCriteria: ["Every isolated browser run starts without storage leaked from the previous run."],
    requiredChecks: ["browser_e2e", "browser_stability", "screenshots", "console_errors"],
    projects: [{
      name: "browser-stability-self-test",
      workDir: dir,
      runCommand: `"${process.execPath}" server.js`,
      targetUrl,
      env: { PORT: port },
      browserChecks: [{
        name: "Fresh browser context remains stable",
        url: targetUrl,
        stabilityRuns: 3,
        actions: [{ type: "goto" as const, url: targetUrl }],
        assertions: [
          { type: "text" as const, text: "Prior visits 0" },
          { type: "text" as const, text: "Current visits 1" },
          { type: "localStorageEquals" as const, key: "stabilityVisits", value: "1" },
          { type: "consoleNoErrors" as const },
          { type: "networkNoErrors" as const },
        ],
        screenshot: true,
      }],
    }],
    options: {
      artifactDir,
      browserProvider: "mcp" as const,
      collectBrowserArtifacts: false,
    },
  };
  const validation = validateTestAgentWorkOrderContract(input);
  const plan = buildTestAgentExecutionPlan(input, {}, validation);
  const executor = createStaticBrowserToolExecutor({
    tools: ["mcp__playwright__browser_navigate"],
    onCall: () => ({ ok: true }),
  });
  const report = await runTestAgent(input, {
    browserProvider: "mcp",
    browserToolExecutor: executor,
  });
  const verdict = buildTestAgentVerdict(report);
  const cliSummary = formatTestAgentCliReportSummary(report);
  const markdown = buildTestAgentMarkdownReport(report);
  const browserResults = report.browserResults;
  const screenshots = browserResults.flatMap(result => result.screenshots || []);
  const manifestPath = String((report.metadata.artifactFiles as any)?.manifestPath || "");
  const reportJsonPath = String((report.metadata.artifactFiles as any)?.reportJsonPath || "");
  const verdictJsonPath = String((report.metadata.artifactFiles as any)?.verdictJsonPath || "");
  const artifactVerification = manifestPath ? verifyTestAgentArtifactManifestFile(manifestPath) : null;
  const reportValidation = validateTestAgentReportContract(report);
  const verdictValidation = validateTestAgentVerdictContract(verdict);
  const stabilityCoverage = report.requiredCheckCoverage.find(item => item.check === "browser_stability");
  const stabilityWarning = plan.browserProviderWarnings.find(item => item.item === "stabilityRuns");

  let reusedArtifactVerification: ReturnType<typeof verifyTestAgentArtifactManifestFile> | null = null;
  if (browserResults.length >= 2 && browserResults[0].screenshots[0] && reportJsonPath && verdictJsonPath && manifestPath) {
    const tamperedReport = JSON.parse(JSON.stringify(report));
    tamperedReport.browserResults[1].screenshots[0] = tamperedReport.browserResults[0].screenshots[0];
    const tamperedVerdict = buildTestAgentVerdict(tamperedReport);
    fs.writeFileSync(reportJsonPath, `${JSON.stringify(tamperedReport, null, 2)}\n`, "utf-8");
    fs.writeFileSync(verdictJsonPath, `${JSON.stringify(tamperedVerdict, null, 2)}\n`, "utf-8");
    refreshManifestItemIntegrity(manifestPath, "report_json");
    refreshManifestItemIntegrity(manifestPath, "verdict_json");
    reusedArtifactVerification = verifyTestAgentArtifactManifestFile(manifestPath);
  }

  const pass = validation.valid
    && plan.valid
    && plan.summary.browserStabilityChecks === 1
    && plan.summary.browserStabilityRuns === 3
    && plan.projects[0]?.browserChecks[0]?.stabilityRuns === 3
    && stabilityWarning?.category === "requires_playwright"
    && stabilityWarning?.recommendation.includes("Playwright") === true
    && report.status === "passed"
    && report.recommendation === "accept"
    && browserResults.length === 3
    && browserResults.every((result, index) =>
      result.provider === "playwright"
      && result.status === "passed"
      && result.context?.browserStability === true
      && result.context?.stabilityRun === index + 1
      && result.context?.stabilityRuns === 3
      && result.pageTextPreview?.includes("Prior visits 0")
      && result.pageTextPreview?.includes("Current visits 1")
      && result.steps.some(step => step.name === "assert:localStorageEquals" && step.status === "passed")
    )
    && screenshots.length === 3
    && new Set(screenshots).size === 3
    && screenshots.every(file => fs.existsSync(file))
    && report.browserStabilitySummary?.total === 1
    && report.browserStabilitySummary?.statusCounts.stable_pass === 1
    && report.browserStabilitySummary?.expectedRunCount === 3
    && report.browserStabilitySummary?.runCount === 3
    && report.browserStabilitySummary?.screenshotCount === 3
    && stabilityCoverage?.status === "verified"
    && verdict.evidenceSummary.browserStabilityGroups === 1
    && verdict.evidenceSummary.browserFlakyStabilityGroups === 0
    && verdict.evidenceSummary.browserStabilityRuns === 3
    && cliSummary.includes("Browser stability: groups=1; stable=1; flaky=0; failed=0; blocked=0; runs=3/3")
    && markdown.includes("## Browser Stability Summary")
    && markdown.includes("Fresh browser context remains stable")
    && artifactVerification?.status === "passed"
    && artifactVerification.items.some(item => item.type === "verdict_consistency" && item.status === "passed")
    && reusedArtifactVerification?.status === "failed"
    && reusedArtifactVerification.items.some(item =>
      item.type === "verdict_consistency"
      && item.status === "failed"
      && String(item.error || "").includes("reuses an artifact path across stability runs")
    )
    && reportValidation.valid
    && verdictValidation.valid;

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    availability,
    validation,
    plan,
    report,
    verdict,
    cliSummary,
    markdown,
    artifactVerification,
    reusedArtifactVerification,
    reportValidation,
    verdictValidation,
  };
}

export async function runTestAgentAcceptanceDragFlowSelfTest() {
  const availability = await checkPlaywrightAvailability();
  if (!availability.available) {
    return {
      pass: false,
      availability,
      reason: availability.reason,
    };
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-acceptance-drag-flow-selftest-"));
  const artifactDir = path.join(dir, "artifacts");
  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}/`;
  const boardUrl = `http://127.0.0.1:${port}/board`;
  const englishExpected = "Ship release moved to Done";
  const chineseExpected = "发布任务已移入完成列";
  const acceptanceCriteria = [
    `At /board, drag "Ship release" to "Done column", then shows "${englishExpected}".`,
    `在 /board 将 "发布任务" 拖动到 "已完成列"，然后显示 "${chineseExpected}"。`,
  ];
  fs.writeFileSync(path.join(dir, "server.js"), [
    "const http = require('http');",
    "const html = `<!doctype html>",
    "<html><head><title>Drag Flow Fixture</title>",
    "<style>",
    "body { font-family: sans-serif; padding: 24px; }",
    ".board { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }",
    ".source, .dropzone { min-height: 150px; border: 1px solid #777; padding: 16px; }",
    ".card { padding: 12px; margin: 8px 0; border: 1px solid #333; background: white; cursor: grab; }",
    ".dropzone { background: #f6f7f8; }",
    "</style></head>",
    "<body><main>",
    "<h1>Release board</h1>",
    "<div class=\"board\">",
    "<section class=\"source\" aria-label=\"Todo column\">",
    "<article class=\"card\" draggable=\"true\" data-task=\"ship\">Ship release</article>",
    "<article class=\"card\" draggable=\"true\" data-task=\"publish-cn\">发布任务</article>",
    "</section>",
    "<div class=\"dropzone\" data-destination=\"done\">Done column</div>",
    "<div class=\"dropzone\" data-destination=\"done-cn\">已完成列</div>",
    "</div>",
    "<p id=\"status\" role=\"status\">Waiting for drag</p>",
    "<script>",
    "let dragged = '';",
    "for (const card of document.querySelectorAll('[draggable=true]')) {",
    "  card.addEventListener('dragstart', event => { dragged = card.dataset.task; event.dataTransfer.setData('text/plain', dragged); event.dataTransfer.effectAllowed = 'move'; });",
    "}",
    "for (const dropzone of document.querySelectorAll('.dropzone')) {",
    "  dropzone.addEventListener('dragover', event => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; });",
    "  dropzone.addEventListener('drop', event => {",
    "    event.preventDefault();",
    "    const task = event.dataTransfer.getData('text/plain') || dragged;",
    "    const card = document.querySelector('[data-task=' + task + ']');",
    "    if (!card) return;",
    "    dropzone.appendChild(card);",
    `    if (task === 'ship') document.getElementById('status').textContent = '${englishExpected}';`,
    `    if (task === 'publish-cn') document.getElementById('status').textContent = '${chineseExpected}';`,
    "  });",
    "}",
    "</script>",
    "</main></body></html>`;",
    "const root = '<!doctype html><title>Home</title><main><h1>Home</h1></main>';",
    "http.createServer((req, res) => {",
    "  const route = String(req.url || '/').split('?')[0];",
    "  res.writeHead(200, {'content-type':'text/html; charset=utf-8'});",
    "  res.end(route === '/board' ? html : root);",
    "}).listen(process.env.PORT);",
  ].join("\n"), "utf-8");

  const project = {
    name: "acceptance-drag-flow-self-test",
    workDir: dir,
    runCommand: `"${process.execPath}" server.js`,
    devServerCommand: `"${process.execPath}" server.js`,
    targetUrl: baseUrl,
    startupUrl: baseUrl,
    startupTimeoutMs: 30_000,
    env: { PORT: String(port) },
    changedFiles: [],
    verificationCommands: [],
    httpChecks: [],
    adversarialHttpChecks: [],
    adversarialBrowserChecks: [],
    browserChecks: [],
    agentSummary: "",
    risks: [],
  };
  const dragChecks = buildAcceptanceDragFlowBrowserChecks(project, acceptanceCriteria);
  const generatedChecks = buildBrowserChecksForProject(project, acceptanceCriteria);

  const report = await runTestAgent({
    id: `acceptance-drag-flow-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent can infer drag-and-drop browser flows from acceptance criteria.",
    acceptanceCriteria,
    requiredChecks: ["http", "browser_e2e", "browser_drag", "browser_visibility", "browser_layout", "screenshots", "console_errors"],
    projects: [{
      name: project.name,
      workDir: dir,
      runCommand: project.runCommand,
      targetUrl: baseUrl,
      env: { PORT: port },
    }],
    options: {
      artifactDir,
      browserProvider: "playwright",
      collectBrowserArtifacts: false,
    },
  }, { browserProvider: "playwright" });

  const byCheck = new Map(report.requiredCheckCoverage.map(item => [item.check, item]));
  const dragResults = report.browserResults.filter(result => result.probeType === ACCEPTANCE_DRAG_FLOW_PROBE_TYPE);
  const generatedDragChecks = generatedChecks.filter(check => check.probeType === ACCEPTANCE_DRAG_FLOW_PROBE_TYPE);
  const generatedPathChecks = generatedChecks.filter(check => check.context?.generatedBy === "acceptance_path_smoke");
  const targets = [
    { source: "Ship release", destination: "Done column", expected: englishExpected },
    { source: "发布任务", destination: "已完成列", expected: chineseExpected },
  ];
  const checksCoverTargets = dragChecks.length === 2
    && targets.every(item => dragChecks.some(check =>
      check.url === boardUrl
      && check.context?.generatedBy === ACCEPTANCE_DRAG_FLOW_PROBE_TYPE
      && check.context?.dragSourceText === item.source
      && check.context?.dragDestinationText === item.destination
      && check.context?.expectedText === item.expected
      && check.actions?.some(action => action.type === "dragTo" && action.text === item.source && action.destinationText === item.destination)
      && check.assertions?.some(assertion => assertion.type === "visible" && assertion.text === item.expected)
      && check.assertions?.some(assertion => assertion.type === "inViewport" && assertion.text === item.expected)
      && check.assertions?.some(assertion => assertion.type === "urlIncludes" && assertion.text === "/board")
    ));
  const resultsCoverTargets = dragResults.length === 2
    && targets.every(item => dragResults.some(result =>
      result.status === "passed"
      && result.provider === "playwright"
      && result.url === boardUrl
      && result.finalUrl === boardUrl
      && result.context?.generatedBy === ACCEPTANCE_DRAG_FLOW_PROBE_TYPE
      && result.context?.dragSourceText === item.source
      && result.context?.dragDestinationText === item.destination
      && result.context?.expectedText === item.expected
      && result.steps.some(step => step.name === "action:dragTo" && step.status === "passed" && String(step.detail || "").includes(item.source) && String(step.detail || "").includes(item.destination))
      && result.steps.some(step => step.name === "assert:visible" && step.status === "passed" && String(step.detail || "").includes(item.expected))
      && result.steps.some(step => step.name === "assert:inViewport" && step.status === "passed" && String(step.detail || "").includes(item.expected))
      && result.pageTextPreview?.includes(item.expected)
    ));
  const pass = checksCoverTargets
    && generatedDragChecks.length === 2
    && generatedPathChecks.length === 0
    && generatedChecks.length === 2
    && report.status === "passed"
    && report.browserResults.length === 2
    && resultsCoverTargets
    && byCheck.get("browser_drag")?.status === "verified"
    && byCheck.get("browser_visibility")?.status === "verified"
    && byCheck.get("browser_layout")?.status === "verified"
    && byCheck.get("browser_e2e")?.status === "verified"
    && byCheck.get("screenshots")?.status === "verified"
    && report.acceptanceCoverage.every(item => item.status === "verified");

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    availability,
    dragChecks,
    generatedChecks,
    report,
  };
}

export async function runTestAgentAcceptanceClipboardFlowSelfTest() {
  const availability = await checkPlaywrightAvailability();
  if (!availability.available) {
    return {
      pass: false,
      availability,
      reason: availability.reason,
    };
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-acceptance-clipboard-flow-selftest-"));
  const artifactDir = path.join(dir, "artifacts");
  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}/`;
  const inviteUrl = `http://127.0.0.1:${port}/invite`;
  const englishClipboard = "Invite Code: TEAM-42";
  const chineseClipboard = "邀请码：TEAM-42-CN";
  const chineseExpectedSubstring = "TEAM-42-CN";
  const acceptanceCriteria = [
    `At /invite, click "Copy invite", then clipboard equals "${englishClipboard}".`,
    `在 /invite 点击 "复制邀请码"，然后剪贴板包含 "${chineseExpectedSubstring}"。`,
  ];
  fs.writeFileSync(path.join(dir, "server.js"), [
    "const http = require('http');",
    "const html = `<!doctype html>",
    "<html><head><title>Clipboard Flow Fixture</title></head>",
    "<body><main>",
    "<h1>Invite clipboard</h1>",
    "<button type=\"button\" id=\"copyInvite\">Copy invite</button>",
    "<button type=\"button\" id=\"copyInviteCn\">复制邀请码</button>",
    "<p id=\"status\" role=\"status\">Ready</p>",
    "<script>",
    `document.getElementById('copyInvite').addEventListener('click', async () => { await navigator.clipboard.writeText('${englishClipboard}'); document.getElementById('status').textContent = 'Invite copied'; });`,
    `document.getElementById('copyInviteCn').addEventListener('click', async () => { await navigator.clipboard.writeText('${chineseClipboard}'); document.getElementById('status').textContent = '邀请码已复制'; });`,
    "</script>",
    "</main></body></html>`;",
    "const root = '<!doctype html><title>Home</title><main><h1>Home</h1></main>';",
    "http.createServer((req, res) => {",
    "  const route = String(req.url || '/').split('?')[0];",
    "  res.writeHead(200, {'content-type':'text/html; charset=utf-8'});",
    "  res.end(route === '/invite' ? html : root);",
    "}).listen(process.env.PORT);",
  ].join("\n"), "utf-8");

  const project = {
    name: "acceptance-clipboard-flow-self-test",
    workDir: dir,
    runCommand: `"${process.execPath}" server.js`,
    devServerCommand: `"${process.execPath}" server.js`,
    targetUrl: baseUrl,
    startupUrl: baseUrl,
    startupTimeoutMs: 30_000,
    env: { PORT: String(port) },
    changedFiles: [],
    verificationCommands: [],
    httpChecks: [],
    adversarialHttpChecks: [],
    adversarialBrowserChecks: [],
    browserChecks: [],
    agentSummary: "",
    risks: [],
  };
  const clipboardChecks = buildAcceptanceClipboardFlowBrowserChecks(project, acceptanceCriteria);
  const generatedChecks = buildBrowserChecksForProject(project, acceptanceCriteria);

  const report = await runTestAgent({
    id: `acceptance-clipboard-flow-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent can infer clipboard browser flows from acceptance criteria.",
    acceptanceCriteria,
    requiredChecks: ["http", "browser_e2e", "browser_clipboard", "screenshots", "console_errors"],
    projects: [{
      name: project.name,
      workDir: dir,
      runCommand: project.runCommand,
      targetUrl: baseUrl,
      env: { PORT: port },
    }],
    options: {
      artifactDir,
      browserProvider: "playwright",
      collectBrowserArtifacts: false,
    },
  }, { browserProvider: "playwright" });

  const byCheck = new Map(report.requiredCheckCoverage.map(item => [item.check, item]));
  const clipboardResults = report.browserResults.filter(result => result.probeType === ACCEPTANCE_CLIPBOARD_FLOW_PROBE_TYPE);
  const generatedClipboardChecks = generatedChecks.filter(check => check.probeType === ACCEPTANCE_CLIPBOARD_FLOW_PROBE_TYPE);
  const generatedClickChecks = generatedChecks.filter(check => check.probeType === ACCEPTANCE_CLICK_FLOW_PROBE_TYPE);
  const targets = [
    { target: "Copy invite", expectation: "equals", expected: englishClipboard, assertionType: "clipboardTextEquals" },
    { target: "复制邀请码", expectation: "includes", expected: chineseExpectedSubstring, assertionType: "clipboardTextIncludes" },
  ];
  const checksCoverTargets = clipboardChecks.length === 2
    && targets.every(item => clipboardChecks.some(check =>
      check.url === inviteUrl
      && check.context?.generatedBy === ACCEPTANCE_CLIPBOARD_FLOW_PROBE_TYPE
      && check.context?.clickTarget?.name === item.target
      && check.context?.expectation === item.expectation
      && check.context?.expectedClipboardText === item.expected
      && check.actions?.some(action => action.type === "click" && action.role === "button" && action.name === item.target)
      && check.assertions?.some(assertion => assertion.type === item.assertionType && assertion.value === item.expected)
      && check.assertions?.some(assertion => assertion.type === "urlIncludes" && assertion.text === "/invite")
    ));
  const resultsCoverTargets = clipboardResults.length === 2
    && targets.every(item => clipboardResults.some(result =>
      result.status === "passed"
      && result.provider === "playwright"
      && result.url === inviteUrl
      && result.finalUrl === inviteUrl
      && result.context?.generatedBy === ACCEPTANCE_CLIPBOARD_FLOW_PROBE_TYPE
      && result.context?.clickTarget?.name === item.target
      && result.context?.expectation === item.expectation
      && result.context?.expectedClipboardText === item.expected
      && result.steps.some(step => step.name === "action:click" && step.status === "passed" && String(step.detail || "").includes(item.target))
      && result.steps.some(step => step.name === `assert:${item.assertionType}` && step.status === "passed")
    ));
  const pass = checksCoverTargets
    && generatedClipboardChecks.length === 2
    && generatedClickChecks.length === 0
    && generatedChecks.length === 2
    && report.status === "passed"
    && report.browserResults.length === 2
    && resultsCoverTargets
    && byCheck.get("browser_clipboard")?.status === "verified"
    && byCheck.get("browser_e2e")?.status === "verified"
    && byCheck.get("screenshots")?.status === "verified"
    && report.acceptanceCoverage.every(item => item.status === "verified");

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    availability,
    clipboardChecks,
    generatedChecks,
    report,
  };
}

