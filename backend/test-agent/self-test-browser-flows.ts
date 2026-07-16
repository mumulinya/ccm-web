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

export async function runTestAgentAcceptanceDialogFlowSelfTest() {
  const availability = await checkPlaywrightAvailability();
  if (!availability.available) {
    return {
      pass: false,
      availability,
      reason: availability.reason,
    };
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-acceptance-dialog-flow-selftest-"));
  const artifactDir = path.join(dir, "artifacts");
  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}/`;
  const dialogsUrl = `http://127.0.0.1:${port}/dialogs`;
  const englishMessage = "Saved profile dialog";
  const chineseMessage = "确认发货对话框";
  const acceptanceCriteria = [
    `At /dialogs, click "Show alert", then alert dialog includes "${englishMessage}".`,
    `在 /dialogs 点击 "显示确认"，然后确认框包含 "${chineseMessage}"。`,
  ];
  fs.writeFileSync(path.join(dir, "server.js"), [
    "const http = require('http');",
    "const html = `<!doctype html>",
    "<html><head><title>Dialog Flow Fixture</title></head>",
    "<body><main>",
    "<h1>Dialog flow</h1>",
    "<button type=\"button\" id=\"alertButton\">Show alert</button>",
    "<button type=\"button\" id=\"confirmButton\">显示确认</button>",
    "<p id=\"status\" role=\"status\">Ready</p>",
    "<script>",
    `document.getElementById('alertButton').addEventListener('click', () => { alert('${englishMessage}'); document.getElementById('status').textContent = 'Alert handled'; });`,
    `document.getElementById('confirmButton').addEventListener('click', () => { const ok = confirm('${chineseMessage}'); document.getElementById('status').textContent = ok ? '确认已接受' : '确认已取消'; });`,
    "</script>",
    "</main></body></html>`;",
    "const root = '<!doctype html><title>Home</title><main><h1>Home</h1></main>';",
    "http.createServer((req, res) => {",
    "  const route = String(req.url || '/').split('?')[0];",
    "  res.writeHead(200, {'content-type':'text/html; charset=utf-8'});",
    "  res.end(route === '/dialogs' ? html : root);",
    "}).listen(process.env.PORT);",
  ].join("\n"), "utf-8");

  const project = {
    name: "acceptance-dialog-flow-self-test",
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
  const dialogChecks = buildAcceptanceDialogFlowBrowserChecks(project, acceptanceCriteria);
  const generatedChecks = buildBrowserChecksForProject(project, acceptanceCriteria);

  const report = await runTestAgent({
    id: `acceptance-dialog-flow-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent can infer native browser dialog flows from acceptance criteria.",
    acceptanceCriteria,
    requiredChecks: ["http", "browser_e2e", "browser_dialog", "browser_dialog_log", "screenshots", "console_errors"],
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
  const dialogResults = report.browserResults.filter(result => result.probeType === ACCEPTANCE_DIALOG_FLOW_PROBE_TYPE);
  const generatedDialogChecks = generatedChecks.filter(check => check.probeType === ACCEPTANCE_DIALOG_FLOW_PROBE_TYPE);
  const generatedClickChecks = generatedChecks.filter(check => check.probeType === ACCEPTANCE_CLICK_FLOW_PROBE_TYPE);
  const targets = [
    { target: "Show alert", dialogType: "alert", message: englishMessage },
    { target: "显示确认", dialogType: "confirm", message: chineseMessage },
  ];
  const checksCoverTargets = dialogChecks.length === 2
    && targets.every(item => dialogChecks.some(check =>
      check.url === dialogsUrl
      && check.context?.generatedBy === ACCEPTANCE_DIALOG_FLOW_PROBE_TYPE
      && check.context?.clickTarget?.name === item.target
      && check.context?.dialogType === item.dialogType
      && check.context?.messageIncludes === item.message
      && check.actions?.some(action => action.type === "click" && action.role === "button" && action.name === item.target)
      && check.assertions?.some(assertion => assertion.type === "dialogAppeared" && assertion.dialogType === item.dialogType)
      && check.assertions?.some(assertion => assertion.type === "dialogMessageIncludes" && assertion.text === item.message && assertion.dialogType === item.dialogType)
      && check.assertions?.some(assertion => assertion.type === "urlIncludes" && assertion.text === "/dialogs")
    ));
  const resultsCoverTargets = dialogResults.length === 2
    && targets.every(item => dialogResults.some(result =>
      result.status === "passed"
      && result.provider === "playwright"
      && result.url === dialogsUrl
      && result.finalUrl === dialogsUrl
      && result.context?.generatedBy === ACCEPTANCE_DIALOG_FLOW_PROBE_TYPE
      && result.context?.clickTarget?.name === item.target
      && result.context?.dialogType === item.dialogType
      && result.context?.messageIncludes === item.message
      && result.steps.some(step => step.name === "action:click" && step.status === "passed" && String(step.detail || "").includes(item.target))
      && result.steps.some(step => step.name === "assert:dialogAppeared" && step.status === "passed" && String(step.detail || "").includes(`dialogType=${item.dialogType}`))
      && result.steps.some(step => step.name === "assert:dialogMessageIncludes" && step.status === "passed" && String(step.detail || "").includes(`dialogType=${item.dialogType}`))
      && (result.dialogMessages || []).some(message => message.includes(`dialog ${item.dialogType}`) && message.includes(item.message) && message.includes("accepted=yes"))
      && !!result.dialogLogPath
    ));
  const dialogLogText = dialogResults
    .map(result => result.dialogLogPath && fs.existsSync(result.dialogLogPath) ? fs.readFileSync(result.dialogLogPath, "utf-8") : "")
    .join("\n");
  const pass = checksCoverTargets
    && generatedDialogChecks.length === 2
    && generatedClickChecks.length === 0
    && report.status === "passed"
    && report.browserResults.length === 2
    && resultsCoverTargets
    && dialogLogText.includes(englishMessage)
    && dialogLogText.includes(chineseMessage)
    && byCheck.get("browser_dialog")?.status === "verified"
    && byCheck.get("browser_dialog_log")?.status === "verified"
    && byCheck.get("browser_e2e")?.status === "verified"
    && byCheck.get("screenshots")?.status === "verified"
    && report.acceptanceCoverage.every(item => item.status === "verified");

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    availability,
    dialogChecks,
    generatedChecks,
    report,
    dialogLogText,
  };
}

export async function runTestAgentAcceptancePopupFlowSelfTest() {
  const availability = await checkPlaywrightAvailability();
  if (!availability.available) {
    return {
      pass: false,
      availability,
      reason: availability.reason,
    };
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-acceptance-popup-flow-selftest-"));
  const artifactDir = path.join(dir, "artifacts");
  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}/`;
  const supportUrl = `http://127.0.0.1:${port}/support`;
  const englishText = "Support article ready";
  const chineseText = "帮助中心已就绪";
  const acceptanceCriteria = [
    `At /support, click "Open help center", then opens a new tab at /help containing "${englishText}".`,
    `在 /support 点击 "打开帮助中心"，然后在新标签页打开 /help-cn，并包含 "${chineseText}"。`,
  ];
  fs.writeFileSync(path.join(dir, "server.js"), [
    "const http = require('http');",
    "const support = `<!doctype html>",
    "<html><head><title>Support</title></head>",
    "<body><main>",
    "<h1>Support launchers</h1>",
    "<button type=\"button\" id=\"help\">Open help center</button>",
    "<button type=\"button\" id=\"help-cn\">打开帮助中心</button>",
    "<p role=\"status\">Ready to open support</p>",
    "<script>",
    "document.getElementById('help').addEventListener('click', () => window.open('/help', '_blank'));",
    "document.getElementById('help-cn').addEventListener('click', () => window.open('/help-cn', '_blank'));",
    "</script>",
    "</main></body></html>`;",
    `const help = '<!doctype html><title>Help Center Popup</title><main><h1>Help Center</h1><p>${englishText}</p></main>';`,
    `const helpCn = '<!doctype html><meta charset="utf-8"><title>帮助中心弹出页</title><main><h1>帮助中心</h1><p>${chineseText}</p></main>';`,
    "const root = '<!doctype html><title>Home</title><main><h1>Home</h1></main>';",
    "http.createServer((req, res) => {",
    "  const route = String(req.url || '/').split('?')[0];",
    "  res.writeHead(200, {'content-type':'text/html; charset=utf-8'});",
    "  if (route === '/support') return res.end(support);",
    "  if (route === '/help') return res.end(help);",
    "  if (route === '/help-cn') return res.end(helpCn);",
    "  res.end(root);",
    "}).listen(process.env.PORT);",
  ].join("\n"), "utf-8");

  const project = {
    name: "acceptance-popup-flow-self-test",
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
  const popupChecks = buildAcceptancePopupFlowBrowserChecks(project, acceptanceCriteria);
  const generatedChecks = buildBrowserChecksForProject(project, acceptanceCriteria);

  const report = await runTestAgent({
    id: `acceptance-popup-flow-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent can infer popup/new-tab browser flows from acceptance criteria.",
    acceptanceCriteria,
    requiredChecks: ["http", "browser_e2e", "browser_popup", "browser_popup_log", "screenshots", "console_errors"],
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
  const popupResults = report.browserResults.filter(result => result.probeType === ACCEPTANCE_POPUP_FLOW_PROBE_TYPE);
  const generatedPopupChecks = generatedChecks.filter(check => check.probeType === ACCEPTANCE_POPUP_FLOW_PROBE_TYPE);
  const generatedClickChecks = generatedChecks.filter(check => check.probeType === ACCEPTANCE_CLICK_FLOW_PROBE_TYPE);
  const generatedPathChecks = generatedChecks.filter(check => check.context?.generatedBy === "acceptance_path_smoke");
  const targets = [
    { target: "Open help center", popupPath: "/help", text: englishText },
    { target: "打开帮助中心", popupPath: "/help-cn", text: chineseText },
  ];
  const checksCoverTargets = popupChecks.length === 2
    && targets.every(item => popupChecks.some(check =>
      check.url === supportUrl
      && check.context?.generatedBy === ACCEPTANCE_POPUP_FLOW_PROBE_TYPE
      && check.context?.clickTarget?.name === item.target
      && check.context?.popupUrlPath === item.popupPath
      && check.context?.popupTextIncludes === item.text
      && check.actions?.some(action => action.type === "click" && action.role === "button" && action.name === item.target)
      && check.assertions?.some(assertion => assertion.type === "popupOpened")
      && check.assertions?.some(assertion => assertion.type === "popupUrlIncludes" && assertion.url === item.popupPath)
      && check.assertions?.some(assertion => assertion.type === "popupTextIncludes" && assertion.text === item.text)
      && check.assertions?.some(assertion => assertion.type === "urlIncludes" && assertion.text === "/support")
    ));
  const resultsCoverTargets = popupResults.length === 2
    && targets.every(item => popupResults.some(result =>
      result.status === "passed"
      && result.provider === "playwright"
      && result.url === supportUrl
      && result.finalUrl === supportUrl
      && result.context?.generatedBy === ACCEPTANCE_POPUP_FLOW_PROBE_TYPE
      && result.context?.clickTarget?.name === item.target
      && result.context?.popupUrlPath === item.popupPath
      && result.context?.popupTextIncludes === item.text
      && result.steps.some(step => step.name === "action:click" && step.status === "passed" && String(step.detail || "").includes(item.target))
      && result.steps.some(step => step.name === "assert:popupOpened" && step.status === "passed")
      && result.steps.some(step => step.name === "assert:popupUrlIncludes" && step.status === "passed")
      && result.steps.some(step => step.name === "assert:popupTextIncludes" && step.status === "passed")
      && (result.popupMessages || []).some(message => message.includes(item.popupPath) && message.includes(item.text))
      && !!result.popupLogPath
    ));
  const popupLogText = popupResults
    .map(result => result.popupLogPath && fs.existsSync(result.popupLogPath) ? fs.readFileSync(result.popupLogPath, "utf-8") : "")
    .join("\n");
  const pass = checksCoverTargets
    && generatedPopupChecks.length === 2
    && generatedClickChecks.length === 0
    && generatedPathChecks.length === 0
    && generatedChecks.length === 2
    && report.status === "passed"
    && report.browserResults.length === 2
    && resultsCoverTargets
    && popupLogText.includes(englishText)
    && popupLogText.includes(chineseText)
    && byCheck.get("browser_popup")?.status === "verified"
    && byCheck.get("browser_popup_log")?.status === "verified"
    && byCheck.get("browser_e2e")?.status === "verified"
    && byCheck.get("screenshots")?.status === "verified"
    && report.acceptanceCoverage.every(item => item.status === "verified");

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    availability,
    popupChecks,
    generatedChecks,
    report,
    popupLogText,
  };
}

export async function runTestAgentAcceptanceKeyboardFlowSelfTest() {
  const availability = await checkPlaywrightAvailability();
  if (!availability.available) {
    return {
      pass: false,
      availability,
      reason: availability.reason,
    };
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-acceptance-keyboard-flow-selftest-"));
  const artifactDir = path.join(dir, "artifacts");
  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}/`;
  const shortcutsUrl = `http://127.0.0.1:${port}/shortcuts`;
  const englishText = "Command palette ready";
  const chineseText = "中文命令面板就绪";
  const acceptanceCriteria = [
    `At /shortcuts, press "Control+Alt+K" keyboard shortcut, then shows "${englishText}".`,
    `在 /shortcuts 按下 "Control+Alt+J" 快捷键，然后显示 "${chineseText}"。`,
  ];
  fs.writeFileSync(path.join(dir, "server.js"), [
    "const http = require('http');",
    "const html = `<!doctype html>",
    "<html><head><title>Keyboard Flow Fixture</title>",
    "<style>",
    "body { font-family: sans-serif; padding: 32px; }",
    ".palette { display: none; margin-top: 16px; padding: 16px; border: 1px solid #555; background: white; width: 320px; }",
    ".palette[aria-hidden='false'] { display: block; }",
    "</style></head>",
    "<body><main>",
    "<h1>Keyboard shortcuts</h1>",
    "<p role=\"status\">Waiting for shortcut</p>",
    "<section id=\"palette\" class=\"palette\" aria-hidden=\"true\" role=\"dialog\" aria-label=\"Command palette\">",
    `<p>${englishText}</p>`,
    "</section>",
    "<section id=\"palette-cn\" class=\"palette\" aria-hidden=\"true\" role=\"dialog\" aria-label=\"中文命令面板\">",
    `<p>${chineseText}</p>`,
    "</section>",
    "</main>",
    "<script>",
    "document.addEventListener('keydown', event => {",
    "  const key = String(event.key || '').toLowerCase();",
    "  if (event.ctrlKey && event.altKey && key === 'k') {",
    "    event.preventDefault();",
    "    document.getElementById('palette').setAttribute('aria-hidden', 'false');",
    "  }",
    "  if (event.ctrlKey && event.altKey && key === 'j') {",
    "    event.preventDefault();",
    "    document.getElementById('palette-cn').setAttribute('aria-hidden', 'false');",
    "  }",
    "});",
    "</script>",
    "</body></html>`;",
    "const root = '<!doctype html><title>Home</title><main><h1>Home</h1></main>';",
    "http.createServer((req, res) => {",
    "  const route = String(req.url || '/').split('?')[0];",
    "  res.writeHead(200, {'content-type':'text/html; charset=utf-8'});",
    "  res.end(route === '/shortcuts' ? html : root);",
    "}).listen(process.env.PORT);",
  ].join("\n"), "utf-8");

  const project = {
    name: "acceptance-keyboard-flow-self-test",
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
  const keyboardChecks = buildAcceptanceKeyboardFlowBrowserChecks(project, acceptanceCriteria);
  const generatedChecks = buildBrowserChecksForProject(project, acceptanceCriteria);

  const report = await runTestAgent({
    id: `acceptance-keyboard-flow-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent can infer keyboard shortcut browser flows from acceptance criteria.",
    acceptanceCriteria,
    requiredChecks: ["http", "browser_e2e", "browser_keyboard", "browser_visibility", "browser_layout", "screenshots", "console_errors"],
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
  const keyboardResults = report.browserResults.filter(result => result.probeType === ACCEPTANCE_KEYBOARD_FLOW_PROBE_TYPE);
  const generatedKeyboardChecks = generatedChecks.filter(check => check.probeType === ACCEPTANCE_KEYBOARD_FLOW_PROBE_TYPE);
  const generatedClickChecks = generatedChecks.filter(check => check.probeType === ACCEPTANCE_CLICK_FLOW_PROBE_TYPE);
  const targets = [
    { key: "Control+Alt+K", expected: englishText },
    { key: "Control+Alt+J", expected: chineseText },
  ];
  const checksCoverTargets = keyboardChecks.length === 2
    && targets.every(item => keyboardChecks.some(check =>
      check.url === shortcutsUrl
      && check.context?.generatedBy === ACCEPTANCE_KEYBOARD_FLOW_PROBE_TYPE
      && check.context?.key === item.key
      && check.context?.expectedText === item.expected
      && check.actions?.some(action => action.type === "press" && action.key === item.key)
      && check.assertions?.some(assertion => assertion.type === "visible" && assertion.text === item.expected)
      && check.assertions?.some(assertion => assertion.type === "inViewport" && assertion.text === item.expected)
      && check.assertions?.some(assertion => assertion.type === "urlIncludes" && assertion.text === "/shortcuts")
    ));
  const resultsCoverTargets = keyboardResults.length === 2
    && targets.every(item => keyboardResults.some(result =>
      result.status === "passed"
      && result.provider === "playwright"
      && result.url === shortcutsUrl
      && result.finalUrl === shortcutsUrl
      && result.context?.generatedBy === ACCEPTANCE_KEYBOARD_FLOW_PROBE_TYPE
      && result.context?.key === item.key
      && result.context?.expectedText === item.expected
      && result.steps.some(step => step.name === "action:press" && step.status === "passed" && String(step.detail || "").includes(item.key))
      && result.steps.some(step => step.name === "assert:visible" && step.status === "passed" && String(step.detail || "").includes(item.expected))
      && result.steps.some(step => step.name === "assert:inViewport" && step.status === "passed" && String(step.detail || "").includes(item.expected))
      && result.pageTextPreview?.includes(item.expected)
    ));
  const pass = checksCoverTargets
    && generatedKeyboardChecks.length === 2
    && generatedClickChecks.length === 0
    && report.status === "passed"
    && report.browserResults.length === 2
    && resultsCoverTargets
    && byCheck.get("browser_keyboard")?.status === "verified"
    && byCheck.get("browser_visibility")?.status === "verified"
    && byCheck.get("browser_layout")?.status === "verified"
    && byCheck.get("browser_e2e")?.status === "verified"
    && byCheck.get("screenshots")?.status === "verified"
    && report.acceptanceCoverage.every(item => item.status === "verified");

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    availability,
    keyboardChecks,
    generatedChecks,
    report,
  };
}

export async function runTestAgentAcceptanceHoverFlowSelfTest() {
  const availability = await checkPlaywrightAvailability();
  if (!availability.available) {
    return {
      pass: false,
      availability,
      reason: availability.reason,
    };
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-acceptance-hover-flow-selftest-"));
  const artifactDir = path.join(dir, "artifacts");
  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}/`;
  const menuUrl = `http://127.0.0.1:${port}/menu`;
  const englishText = "Export report";
  const chineseText = "导出报告";
  const acceptanceCriteria = [
    `At /menu, hover "Tools", then shows "${englishText}".`,
    `在 /menu 悬停在 "工具"，然后显示 "${chineseText}"。`,
  ];
  fs.writeFileSync(path.join(dir, "server.js"), [
    "const http = require('http');",
    "const html = `<!doctype html>",
    "<html><head><title>Hover Flow Fixture</title>",
    "<style>",
    "body { font-family: sans-serif; padding: 32px; }",
    ".toolbar { display: flex; gap: 32px; align-items: flex-start; }",
    ".menu-wrap { position: relative; }",
    ".menu { display: none; margin-top: 8px; padding: 12px; border: 1px solid #555; width: 220px; background: white; }",
    ".trigger:hover + .menu, .menu:hover { display: block; }",
    "[role=menuitem] { display: block; padding: 8px; }",
    "</style></head>",
    "<body><main>",
    "<h1>Hover tools</h1>",
    "<div class=\"toolbar\">",
    "<section class=\"menu-wrap\">",
    "<button class=\"trigger\" id=\"tools\" type=\"button\">Tools</button>",
    "<div class=\"menu\" role=\"menu\" aria-label=\"Tools menu\">",
    `<button type="button" role="menuitem">${englishText}</button>`,
    "<button type=\"button\" role=\"menuitem\">Archive report</button>",
    "</div>",
    "</section>",
    "<section class=\"menu-wrap\">",
    "<button class=\"trigger\" id=\"tools-cn\" type=\"button\">工具</button>",
    "<div class=\"menu\" role=\"menu\" aria-label=\"工具菜单\">",
    `<button type="button" role="menuitem">${chineseText}</button>`,
    "<button type=\"button\" role=\"menuitem\">归档报告</button>",
    "</div>",
    "</section>",
    "</div>",
    "<p role=\"status\">Menu waits for hover</p>",
    "</main></body></html>`;",
    "const root = '<!doctype html><title>Home</title><main><h1>Home</h1></main>';",
    "http.createServer((req, res) => {",
    "  const route = String(req.url || '/').split('?')[0];",
    "  res.writeHead(200, {'content-type':'text/html; charset=utf-8'});",
    "  res.end(route === '/menu' ? html : root);",
    "}).listen(process.env.PORT);",
  ].join("\n"), "utf-8");

  const project = {
    name: "acceptance-hover-flow-self-test",
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
  const hoverChecks = buildAcceptanceHoverFlowBrowserChecks(project, acceptanceCriteria);
  const generatedChecks = buildBrowserChecksForProject(project, acceptanceCriteria);

  const report = await runTestAgent({
    id: `acceptance-hover-flow-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent can infer hover browser flows from acceptance criteria.",
    acceptanceCriteria,
    requiredChecks: ["http", "browser_e2e", "browser_hover", "browser_visibility", "browser_layout", "screenshots", "console_errors"],
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
  const hoverResults = report.browserResults.filter(result => result.probeType === ACCEPTANCE_HOVER_FLOW_PROBE_TYPE);
  const generatedHoverChecks = generatedChecks.filter(check => check.probeType === ACCEPTANCE_HOVER_FLOW_PROBE_TYPE);
  const targets = [
    { target: "Tools", expected: englishText },
    { target: "工具", expected: chineseText },
  ];
  const checksCoverTargets = hoverChecks.length === 2
    && targets.every(item => hoverChecks.some(check =>
      check.url === menuUrl
      && check.context?.generatedBy === ACCEPTANCE_HOVER_FLOW_PROBE_TYPE
      && check.context?.hoverTarget?.name === item.target
      && check.context?.expectedText === item.expected
      && check.actions?.some(action => action.type === "hover" && action.role === "button" && action.name === item.target)
      && check.assertions?.some(assertion => assertion.type === "visible" && assertion.text === item.expected)
      && check.assertions?.some(assertion => assertion.type === "inViewport" && assertion.text === item.expected)
      && check.assertions?.some(assertion => assertion.type === "urlIncludes" && assertion.text === "/menu")
    ));
  const resultsCoverTargets = hoverResults.length === 2
    && targets.every(item => hoverResults.some(result =>
      result.status === "passed"
      && result.provider === "playwright"
      && result.url === menuUrl
      && result.finalUrl === menuUrl
      && result.context?.generatedBy === ACCEPTANCE_HOVER_FLOW_PROBE_TYPE
      && result.context?.hoverTarget?.name === item.target
      && result.context?.expectedText === item.expected
      && result.steps.some(step => step.name === "action:hover" && step.status === "passed" && String(step.detail || "").includes(item.target))
      && result.steps.some(step => step.name === "assert:visible" && step.status === "passed" && String(step.detail || "").includes(item.expected))
      && result.steps.some(step => step.name === "assert:inViewport" && step.status === "passed" && String(step.detail || "").includes(item.expected))
      && result.pageTextPreview?.includes(item.expected)
    ));
  const pass = checksCoverTargets
    && generatedHoverChecks.length === 2
    && report.status === "passed"
    && report.browserResults.length === 2
    && resultsCoverTargets
    && byCheck.get("browser_hover")?.status === "verified"
    && byCheck.get("browser_visibility")?.status === "verified"
    && byCheck.get("browser_layout")?.status === "verified"
    && byCheck.get("browser_e2e")?.status === "verified"
    && byCheck.get("screenshots")?.status === "verified"
    && report.acceptanceCoverage.every(item => item.status === "verified");

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    availability,
    hoverChecks,
    generatedChecks,
    report,
  };
}

export async function runTestAgentAcceptanceScrollFlowSelfTest() {
  const availability = await checkPlaywrightAvailability();
  if (!availability.available) {
    return {
      pass: false,
      availability,
      reason: availability.reason,
    };
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-acceptance-scroll-flow-selftest-"));
  const artifactDir = path.join(dir, "artifacts");
  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}/`;
  const landingUrl = `http://127.0.0.1:${port}/landing`;
  const englishText = "Ready after scroll";
  const chineseText = "滚动后就绪";
  const acceptanceCriteria = [
    `At /landing, scroll down 1200px, then shows "${englishText}".`,
    `在 /landing 向下滚动 1200 像素，然后显示 "${chineseText}"。`,
  ];
  fs.writeFileSync(path.join(dir, "server.js"), [
    "const http = require('http');",
    "const page = `<!doctype html>",
    "<html><head><title>Scroll Flow Fixture</title><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />",
    "<style>",
    "body { margin: 0; font-family: sans-serif; }",
    "header { min-height: 1050px; padding: 32px; background: #f3f4f6; }",
    "#target { margin: 0 32px 220px; padding: 24px; border: 1px solid #9ca3af; background: white; }",
    "#target p { font-size: 20px; margin: 12px 0; }",
    "</style></head>",
    "<body><main>",
    "<header><h1>Scroll flow</h1><p>Verification target starts below the first viewport.</p></header>",
    "<section id=\"target\" aria-label=\"Scrolled content\">",
    `<p role="status">${englishText}</p>`,
    `<p>${chineseText}</p>`,
    "</section>",
    "</main></body></html>`;",
    "const root = '<!doctype html><title>Home</title><main><h1>Home</h1></main>';",
    "http.createServer((req, res) => {",
    "  const route = String(req.url || '/').split('?')[0];",
    "  res.writeHead(200, {'content-type':'text/html; charset=utf-8'});",
    "  res.end(route === '/landing' ? page : root);",
    "}).listen(process.env.PORT);",
  ].join("\n"), "utf-8");

  const project = {
    name: "acceptance-scroll-flow-self-test",
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
  const scrollChecks = buildAcceptanceScrollFlowBrowserChecks(project, acceptanceCriteria);
  const layoutOnlyScrollChecks = buildAcceptanceScrollFlowBrowserChecks(project, [
    'Mobile responsive page at /landing shows "Ready after scroll" with no horizontal scroll.',
    '移动端页面在 /landing 显示 "滚动后就绪"，没有横向滚动。',
  ]);
  const generatedChecks = buildBrowserChecksForProject(project, acceptanceCriteria);

  const report = await runTestAgent({
    id: `acceptance-scroll-flow-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent can infer scroll browser flows from acceptance criteria.",
    acceptanceCriteria,
    requiredChecks: ["http", "browser_e2e", "browser_scroll", "browser_layout", "screenshots", "console_errors"],
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
  const scrollResults = report.browserResults.filter(result => result.probeType === ACCEPTANCE_SCROLL_FLOW_PROBE_TYPE);
  const generatedScrollChecks = generatedChecks.filter(check => check.probeType === ACCEPTANCE_SCROLL_FLOW_PROBE_TYPE);
  const textTargets = new Set([englishText, chineseText]);
  const checksCoverTargets = scrollChecks.length === 2
    && [...textTargets].every(text => scrollChecks.some(check =>
      check.url === landingUrl
      && check.context?.generatedBy === ACCEPTANCE_SCROLL_FLOW_PROBE_TYPE
      && check.context?.expectedText === text
      && check.actions?.some(action => action.type === "scroll" && action.direction === "down" && action.amount === 1200)
      && check.assertions?.some(assertion => assertion.type === "text" && assertion.text === text)
      && check.assertions?.some(assertion => assertion.type === "inViewport" && assertion.text === text)
      && check.assertions?.some(assertion => assertion.type === "urlIncludes" && assertion.text === "/landing")
    ));
  const resultsCoverTargets = scrollResults.length === 2
    && [...textTargets].every(text => scrollResults.some(result =>
      result.status === "passed"
      && result.provider === "playwright"
      && result.url === landingUrl
      && result.finalUrl === landingUrl
      && result.context?.generatedBy === ACCEPTANCE_SCROLL_FLOW_PROBE_TYPE
      && result.context?.expectedText === text
      && result.steps.some(step => step.name === "action:scroll" && step.status === "passed" && String(step.detail || "").includes("down 1200px"))
      && result.steps.some(step => step.name === "assert:inViewport" && step.status === "passed" && String(step.detail || "").includes(text))
      && result.pageTextPreview?.includes(text)
    ));
  const pass = checksCoverTargets
    && layoutOnlyScrollChecks.length === 0
    && generatedScrollChecks.length === 2
    && report.status === "passed"
    && report.browserResults.length === 2
    && resultsCoverTargets
    && byCheck.get("browser_scroll")?.status === "verified"
    && byCheck.get("browser_layout")?.status === "verified"
    && byCheck.get("browser_e2e")?.status === "verified"
    && byCheck.get("screenshots")?.status === "verified"
    && report.acceptanceCoverage.every(item => item.status === "verified");

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    availability,
    scrollChecks,
    layoutOnlyScrollChecks,
    generatedChecks,
    report,
  };
}

export async function runTestAgentAcceptanceRepeatedClickSelfTest() {
  const availability = await checkPlaywrightAvailability();
  if (!availability.available) {
    return {
      pass: false,
      availability,
      reason: availability.reason,
    };
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-acceptance-repeated-click-selftest-"));
  const artifactDir = path.join(dir, "artifacts");
  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}/`;
  const retryUrl = `http://127.0.0.1:${port}/retry`;
  const acceptanceCriteria = ['At /retry, click "Retry" 3 times, then shows "Retry stable".'];
  fs.writeFileSync(path.join(dir, "server.js"), [
    "const http = require('http');",
    "const retryPage = `<!doctype html>",
    "<html><head><title>Retry</title></head>",
    "<body><main>",
    "<h1>Retry action</h1>",
    "<button type=\"button\" id=\"retry\">Retry</button>",
    "<p id=\"status\" role=\"status\">Waiting</p>",
    "</main>",
    "<script>",
    "let count = 0;",
    "document.getElementById('retry').addEventListener('click', () => {",
    "  count += 1;",
    "  document.body.dataset.retryCount = String(count);",
    "  document.getElementById('status').textContent = count >= 3 ? 'Retry stable' : 'Retry count ' + count;",
    "});",
    "</script>",
    "</body></html>`;",
    "const root = '<!doctype html><title>Home</title><main><h1>Home</h1></main>';",
    "http.createServer((req, res) => {",
    "  const route = String(req.url || '/').split('?')[0];",
    "  res.writeHead(200, {'content-type':'text/html'});",
    "  res.end(route === '/retry' ? retryPage : root);",
    "}).listen(process.env.PORT);",
  ].join("\n"), "utf-8");

  const project = {
    name: "acceptance-repeated-click-self-test",
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
  const repeatedChecks = buildAcceptanceRepeatedClickBrowserChecks(project, acceptanceCriteria);
  const generatedChecks = buildBrowserChecksForProject(project, acceptanceCriteria);

  const report = await runTestAgent({
    id: `acceptance-repeated-click-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent can infer repeated-click adversarial browser checks from acceptance criteria.",
    acceptanceCriteria,
    requiredChecks: ["http", "browser_e2e", "adversarial", "screenshots", "console_errors"],
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

  const repeatedCheck = repeatedChecks[0];
  const generatedRepeatedCheck = generatedChecks.find(check => check.probeType === ACCEPTANCE_REPEATED_CLICK_PROBE_TYPE);
  const generatedClickCheck = generatedChecks.find(check => check.probeType === ACCEPTANCE_CLICK_FLOW_PROBE_TYPE);
  const browser = report.browserResults.find(result => result.probeType === ACCEPTANCE_REPEATED_CLICK_PROBE_TYPE);
  const byCheck = new Map(report.requiredCheckCoverage.map(item => [item.check, item]));
  const clickSteps = browser?.steps.filter(step => step.name === "action:click" && step.status === "passed") || [];
  const pass = repeatedChecks.length === 1
    && repeatedCheck?.probeType === ACCEPTANCE_REPEATED_CLICK_PROBE_TYPE
    && repeatedCheck?.adversarial === true
    && repeatedCheck?.url === retryUrl
    && repeatedCheck?.context?.generatedBy === ACCEPTANCE_REPEATED_CLICK_PROBE_TYPE
    && repeatedCheck?.context?.acceptanceCriteria?.[0] === acceptanceCriteria[0]
    && repeatedCheck?.context?.repeatCount === 3
    && repeatedCheck?.actions?.filter(action => action.type === "click" && action.role === "button" && action.name === "Retry").length === 3
    && repeatedCheck?.assertions?.some(assertion => assertion.type === "text" && assertion.text === "Retry stable")
    && generatedRepeatedCheck?.adversarial === true
    && generatedClickCheck === undefined
    && report.status === "passed"
    && report.browserResults.length === 1
    && browser?.provider === "playwright"
    && browser?.status === "passed"
    && browser?.adversarial === true
    && browser?.url === retryUrl
    && browser?.finalUrl === retryUrl
    && browser?.context?.generatedBy === ACCEPTANCE_REPEATED_CLICK_PROBE_TYPE
    && browser?.pageTextPreview?.includes("Retry stable")
    && clickSteps.length === 3
    && browser?.steps.some(step => step.name === "assert:text" && step.status === "passed" && String(step.detail || "").includes("Retry stable"))
    && byCheck.get("browser_e2e")?.status === "verified"
    && byCheck.get("adversarial")?.status === "verified"
    && byCheck.get("screenshots")?.status === "verified"
    && report.acceptanceCoverage.every(item => item.status === "verified");

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    availability,
    repeatedChecks,
    generatedChecks,
    report,
  };
}

export async function runTestAgentAcceptanceChineseRepeatedClickSelfTest() {
  const availability = await checkPlaywrightAvailability();
  if (!availability.available) {
    return {
      pass: false,
      availability,
      reason: availability.reason,
    };
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-acceptance-chinese-repeated-click-selftest-"));
  const artifactDir = path.join(dir, "artifacts");
  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}/`;
  const retryUrl = `http://127.0.0.1:${port}/retry`;
  const acceptanceCriteria = ['在 /retry 点击 "重试" 3 次，然后显示 "重试稳定"。'];
  fs.writeFileSync(path.join(dir, "server.js"), [
    "const http = require('http');",
    "const retryPage = `<!doctype html>",
    "<html><head><title>重试</title></head>",
    "<body><main>",
    "<h1>重试操作</h1>",
    "<button type=\"button\" id=\"retry\">重试</button>",
    "<p id=\"status\" role=\"status\">等待</p>",
    "</main>",
    "<script>",
    "let count = 0;",
    "document.getElementById('retry').addEventListener('click', () => {",
    "  count += 1;",
    "  document.body.dataset.retryCount = String(count);",
    "  document.getElementById('status').textContent = count >= 3 ? '重试稳定' : '重试次数 ' + count;",
    "});",
    "</script>",
    "</body></html>`;",
    "const root = '<!doctype html><title>首页</title><main><h1>首页</h1></main>';",
    "http.createServer((req, res) => {",
    "  const route = String(req.url || '/').split('?')[0];",
    "  res.writeHead(200, {'content-type':'text/html; charset=utf-8'});",
    "  res.end(route === '/retry' ? retryPage : root);",
    "}).listen(process.env.PORT);",
  ].join("\n"), "utf-8");

  const project = {
    name: "acceptance-chinese-repeated-click-self-test",
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
  const repeatedChecks = buildAcceptanceRepeatedClickBrowserChecks(project, acceptanceCriteria);
  const generatedChecks = buildBrowserChecksForProject(project, acceptanceCriteria);

  const report = await runTestAgent({
    id: `acceptance-chinese-repeated-click-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent can infer Chinese repeated-click adversarial browser checks from acceptance criteria.",
    acceptanceCriteria,
    requiredChecks: ["http", "browser_e2e", "adversarial", "screenshots", "console_errors"],
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

  const repeatedCheck = repeatedChecks[0];
  const generatedRepeatedCheck = generatedChecks.find(check => check.probeType === ACCEPTANCE_REPEATED_CLICK_PROBE_TYPE);
  const generatedClickCheck = generatedChecks.find(check => check.probeType === ACCEPTANCE_CLICK_FLOW_PROBE_TYPE);
  const browser = report.browserResults.find(result => result.probeType === ACCEPTANCE_REPEATED_CLICK_PROBE_TYPE);
  const byCheck = new Map(report.requiredCheckCoverage.map(item => [item.check, item]));
  const clickSteps = browser?.steps.filter(step => step.name === "action:click" && step.status === "passed") || [];
  const pass = repeatedChecks.length === 1
    && repeatedCheck?.probeType === ACCEPTANCE_REPEATED_CLICK_PROBE_TYPE
    && repeatedCheck?.adversarial === true
    && repeatedCheck?.url === retryUrl
    && repeatedCheck?.context?.generatedBy === ACCEPTANCE_REPEATED_CLICK_PROBE_TYPE
    && repeatedCheck?.context?.acceptanceCriteria?.[0] === acceptanceCriteria[0]
    && repeatedCheck?.context?.repeatCount === 3
    && repeatedCheck?.actions?.filter(action => action.type === "click" && action.role === "button" && action.name === "重试").length === 3
    && repeatedCheck?.assertions?.some(assertion => assertion.type === "text" && assertion.text === "重试稳定")
    && generatedRepeatedCheck?.adversarial === true
    && generatedClickCheck === undefined
    && report.status === "passed"
    && report.browserResults.length === 1
    && browser?.provider === "playwright"
    && browser?.status === "passed"
    && browser?.adversarial === true
    && browser?.url === retryUrl
    && browser?.finalUrl === retryUrl
    && browser?.context?.generatedBy === ACCEPTANCE_REPEATED_CLICK_PROBE_TYPE
    && browser?.pageTextPreview?.includes("重试稳定")
    && clickSteps.length === 3
    && browser?.steps.some(step => step.name === "assert:text" && step.status === "passed" && String(step.detail || "").includes("重试稳定"))
    && byCheck.get("browser_e2e")?.status === "verified"
    && byCheck.get("adversarial")?.status === "verified"
    && byCheck.get("screenshots")?.status === "verified"
    && report.acceptanceCoverage.every(item => item.status === "verified");

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    availability,
    repeatedChecks,
    generatedChecks,
    report,
  };
}

export async function runTestAgentBlankPageSmokeSelfTest() {
  const availability = await checkPlaywrightAvailability();
  if (!availability.available) {
    return {
      pass: false,
      availability,
      reason: availability.reason,
    };
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-blank-page-smoke-selftest-"));
  const artifactDir = path.join(dir, "artifacts");
  const port = await getFreePort();
  const targetUrl = `http://127.0.0.1:${port}/blank-shell`;
  fs.writeFileSync(path.join(dir, "server.js"), [
    "const http = require('http');",
    "const html = '<!doctype html><title>Blank Shell</title><div id=\"app\"></div>';",
    "http.createServer((req, res) => { res.writeHead(200, {'content-type':'text/html'}); res.end(html); }).listen(process.env.PORT);",
  ].join("\n"), "utf-8");

  const report = await runTestAgent({
    id: `blank-page-smoke-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent does not accept an empty app shell as a completed web feature.",
    acceptanceCriteria: ["The delivered page must contain visible user-facing content."],
    requiredChecks: ["http", "browser_e2e", "screenshots", "browser_snapshots"],
    projects: [{
      name: "blank-page-smoke-self-test",
      workDir: dir,
      runCommand: `"${process.execPath}" server.js`,
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
  const pageNotBlank = browser?.steps.find(step => step.name === "assert:pageNotBlank");
  const markdownPath = String((report.metadata.artifactFiles as any)?.reportMarkdownPath || "");
  const markdown = fs.existsSync(markdownPath) ? fs.readFileSync(markdownPath, "utf-8") : "";
  const byCheck = new Map(report.requiredCheckCoverage.map(item => [item.check, item]));
  const pass = report.status === "failed"
    && report.recommendation === "rework"
    && report.httpResults.some(item => item.name === "Page HTTP probe" && item.status === "passed")
    && browser?.provider === "playwright"
    && browser?.status === "failed"
    && browser?.name === "Auto browser smoke: blank-page-smoke-self-test"
    && browser?.probeType === AUTO_BROWSER_SMOKE_PROBE_TYPE
    && pageNotBlank?.status === "failed"
    && String(pageNotBlank?.error || "").includes("no visible text")
    && browser?.screenshots.some(item => fs.existsSync(item))
    && (browser?.pageSnapshots || []).some(item => fs.existsSync(item))
    && byCheck.get("http")?.status === "verified"
    && byCheck.get("browser_e2e")?.status === "not_verified"
    && byCheck.get("screenshots")?.status === "verified"
    && markdown.includes("assert:pageNotBlank")
    && markdown.includes("Expected page to have visible user-facing content");

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    report,
    availability,
    pageNotBlank,
  };
}

export async function runTestAgentAcceptancePathSmokeSelfTest() {
  const availability = await checkPlaywrightAvailability();
  if (!availability.available) {
    return {
      pass: false,
      availability,
      reason: availability.reason,
    };
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-acceptance-path-smoke-selftest-"));
  const artifactDir = path.join(dir, "artifacts");
  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}/`;
  const tasksUrl = `http://127.0.0.1:${port}/tasks`;
  const acceptanceCriteria = ['Task board shows "Tasks Ready" at /tasks.'];
  fs.writeFileSync(path.join(dir, "server.js"), [
    "const http = require('http');",
    "const root = '<!doctype html><title>Home</title><main><h1>Home</h1></main>';",
    "const tasks = '<!doctype html><title>Tasks</title><main><h1>Tasks Ready</h1><button>Add task</button></main>';",
    "http.createServer((req, res) => {",
    "  res.writeHead(200, {'content-type':'text/html'});",
    "  res.end(req.url === '/tasks' ? tasks : root);",
    "}).listen(process.env.PORT);",
  ].join("\n"), "utf-8");

  const pathChecks = buildAcceptancePathBrowserSmokeChecks({
    name: "acceptance-path-smoke-self-test",
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
  }, acceptanceCriteria);

  const report = await runTestAgent({
    id: `acceptance-path-smoke-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent can infer browser smoke paths from acceptance criteria.",
    acceptanceCriteria,
    requiredChecks: ["http", "browser_e2e", "screenshots", "browser_snapshots", "console_errors"],
    projects: [{
      name: "acceptance-path-smoke-self-test",
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

  const browser = report.browserResults[0];
  const byCheck = new Map(report.requiredCheckCoverage.map(item => [item.check, item]));
  const pass = pathChecks.length === 1
    && pathChecks[0].url === tasksUrl
    && pathChecks[0].actions?.some(action => action.type === "goto" && action.url === tasksUrl)
    && report.status === "passed"
    && report.httpResults.some(item => item.name === "Page HTTP probe" && item.status === "passed")
    && report.browserResults.length === 1
    && browser?.provider === "playwright"
    && browser?.status === "passed"
    && browser?.name.includes("/tasks")
    && browser?.url === tasksUrl
    && browser?.finalUrl === tasksUrl
    && browser?.pageTextPreview?.includes("Tasks Ready")
    && browser?.steps.some(step => step.name === "assert:pageNotBlank" && step.status === "passed")
    && browser?.steps.some(step => step.name === "assert:text" && step.status === "passed" && String(step.detail || "").includes("Tasks Ready"))
    && browser?.steps.some(step => step.name === "assert:urlIncludes" && step.status === "passed" && String(step.detail || "").includes("/tasks"))
    && byCheck.get("http")?.status === "verified"
    && byCheck.get("browser_e2e")?.status === "verified"
    && byCheck.get("screenshots")?.status === "verified"
    && report.acceptanceCoverage.every(item => item.status === "verified");

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    report,
    availability,
    pathChecks,
  };
}

export async function runTestAgentAcceptancePathGroupingSelfTest() {
  const availability = await checkPlaywrightAvailability();
  if (!availability.available) {
    return {
      pass: false,
      availability,
      reason: availability.reason,
    };
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-acceptance-path-grouping-selftest-"));
  const artifactDir = path.join(dir, "artifacts");
  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}/`;
  const tasksUrl = `http://127.0.0.1:${port}/tasks`;
  const settingsUrl = `http://127.0.0.1:${port}/settings`;
  const acceptanceCriteria = [
    'Task board shows "Tasks Ready" at /tasks.',
    'Settings page shows "Settings Saved" at /settings.',
  ];
  fs.writeFileSync(path.join(dir, "server.js"), [
    "const http = require('http');",
    "const root = '<!doctype html><title>Home</title><main><h1>Home</h1></main>';",
    "const tasks = '<!doctype html><title>Tasks</title><main><h1>Tasks Ready</h1><button>Add task</button></main>';",
    "const settings = '<!doctype html><title>Settings</title><main><h1>Settings Saved</h1><button>Save</button></main>';",
    "http.createServer((req, res) => {",
    "  const route = String(req.url || '/').split('?')[0];",
    "  res.writeHead(200, {'content-type':'text/html'});",
    "  res.end(route === '/tasks' ? tasks : route === '/settings' ? settings : root);",
    "}).listen(process.env.PORT);",
  ].join("\n"), "utf-8");

  const pathChecks = buildAcceptancePathBrowserSmokeChecks({
    name: "acceptance-path-grouping-self-test",
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
  }, acceptanceCriteria);

  const report = await runTestAgent({
    id: `acceptance-path-grouping-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent keeps acceptance-derived browser assertions scoped to their route.",
    acceptanceCriteria,
    requiredChecks: ["http", "browser_e2e", "screenshots", "browser_snapshots", "console_errors"],
    projects: [{
      name: "acceptance-path-grouping-self-test",
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

  const tasksCheck = pathChecks.find(check => check.url === tasksUrl);
  const settingsCheck = pathChecks.find(check => check.url === settingsUrl);
  const tasksBrowser = report.browserResults.find(item => item.url === tasksUrl);
  const settingsBrowser = report.browserResults.find(item => item.url === settingsUrl);
  const byCheck = new Map(report.requiredCheckCoverage.map(item => [item.check, item]));
  const hasAssertion = (check: typeof tasksCheck, type: string, value: string) => {
    return check?.assertions?.some(assertion => assertion.type === type && String(assertion.text || assertion.value || "").includes(value)) === true;
  };
  const browserHasStep = (browser: typeof tasksBrowser, name: string, value: string) => {
    return browser?.steps.some(step => step.name === name && step.status === "passed" && String(step.detail || "").includes(value)) === true;
  };
  const pass = pathChecks.length === 2
    && hasAssertion(tasksCheck, "text", "Tasks Ready")
    && hasAssertion(tasksCheck, "urlIncludes", "/tasks")
    && !hasAssertion(tasksCheck, "text", "Settings Saved")
    && hasAssertion(settingsCheck, "text", "Settings Saved")
    && hasAssertion(settingsCheck, "urlIncludes", "/settings")
    && !hasAssertion(settingsCheck, "text", "Tasks Ready")
    && report.status === "passed"
    && report.browserResults.length === 2
    && tasksBrowser?.status === "passed"
    && settingsBrowser?.status === "passed"
    && tasksBrowser?.pageTextPreview?.includes("Tasks Ready")
    && !tasksBrowser?.pageTextPreview?.includes("Settings Saved")
    && settingsBrowser?.pageTextPreview?.includes("Settings Saved")
    && !settingsBrowser?.pageTextPreview?.includes("Tasks Ready")
    && browserHasStep(tasksBrowser, "assert:text", "Tasks Ready")
    && browserHasStep(settingsBrowser, "assert:text", "Settings Saved")
    && byCheck.get("browser_e2e")?.status === "verified"
    && byCheck.get("screenshots")?.status === "verified"
    && report.acceptanceCoverage.every(item => item.status === "verified");

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    report,
    availability,
    pathChecks,
  };
}

export async function runTestAgentAcceptanceResponsiveViewportSelfTest() {
  const availability = await checkPlaywrightAvailability();
  if (!availability.available) {
    return {
      pass: false,
      availability,
      reason: availability.reason,
    };
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-acceptance-responsive-selftest-"));
  const artifactDir = path.join(dir, "artifacts");
  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}/`;
  const responsiveUrl = `http://127.0.0.1:${port}/responsive`;
  const acceptanceCriteria = ['Mobile responsive page at /responsive shows "Mobile navigation ready" with no horizontal overflow.'];
  fs.writeFileSync(path.join(dir, "server.js"), [
    "const http = require('http');",
    "const root = '<!doctype html><title>Home</title><main><h1>Home</h1></main>';",
    "const responsive = `<!doctype html>",
    "<html><head><title>Responsive</title><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">",
    "<style>",
    "body { margin: 0; font-family: sans-serif; }",
    "main { box-sizing: border-box; width: 100%; max-width: 100%; padding: 16px; }",
    ".desktop { display: block; }",
    ".mobile { display: none; }",
    ".row { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }",
    ".tile { min-width: 0; border: 1px solid #ccc; padding: 12px; }",
    "@media (max-width: 600px) { .desktop { display: none; } .mobile { display: block; } .row { grid-template-columns: 1fr; } }",
    "</style></head>",
    "<body><main>",
    "<h1>Responsive dashboard</h1>",
    "<p class=\"desktop\">Desktop navigation ready</p>",
    "<p class=\"mobile\" role=\"status\">Mobile navigation ready</p>",
    "<section class=\"row\"><article class=\"tile\">Overview</article><article class=\"tile\">Activity</article></section>",
    "</main></body></html>`;",
    "http.createServer((req, res) => {",
    "  const route = String(req.url || '/').split('?')[0];",
    "  res.writeHead(200, {'content-type':'text/html'});",
    "  res.end(route === '/responsive' ? responsive : root);",
    "}).listen(process.env.PORT);",
  ].join("\n"), "utf-8");

  const project = {
    name: "acceptance-responsive-self-test",
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
  const responsiveChecks = buildAcceptanceResponsiveBrowserChecks(project, acceptanceCriteria);
  const generatedChecks = buildBrowserChecksForProject(project, acceptanceCriteria);

  const report = await runTestAgent({
    id: `acceptance-responsive-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent can infer mobile responsive browser checks from acceptance criteria.",
    acceptanceCriteria,
    requiredChecks: ["browser_e2e", "responsive", "screenshots", "browser_snapshots", "console_errors"],
    projects: [{
      name: "acceptance-responsive-self-test",
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

  const responsiveCheck = responsiveChecks[0];
  const generatedResponsiveCheck = generatedChecks.find(check => check.probeType === ACCEPTANCE_RESPONSIVE_PROBE_TYPE);
  const browser = report.browserResults.find(item => item.probeType === ACCEPTANCE_RESPONSIVE_PROBE_TYPE);
  const byCheck = new Map(report.requiredCheckCoverage.map(item => [item.check, item]));
  const pass = responsiveChecks.length === 1
    && generatedResponsiveCheck?.url === responsiveUrl
    && responsiveCheck?.viewportWidth === 390
    && responsiveCheck?.viewportHeight === 844
    && responsiveCheck?.isMobile === true
    && responsiveCheck?.assertions?.some(assertion => assertion.type === "noHorizontalOverflow")
    && responsiveCheck?.assertions?.some(assertion => assertion.type === "text" && assertion.text === "Mobile navigation ready")
    && responsiveCheck?.assertions?.some(assertion => assertion.type === "urlIncludes" && assertion.text === "/responsive")
    && report.status === "passed"
    && report.browserResults.length === 1
    && browser?.provider === "playwright"
    && browser?.status === "passed"
    && browser?.url === responsiveUrl
    && browser?.viewport?.width === 390
    && browser?.viewport?.height === 844
    && browser?.viewport?.isMobile === true
    && browser?.steps.some(step => step.name === "assert:noHorizontalOverflow" && step.status === "passed")
    && browser?.steps.some(step => step.name === "assert:text" && step.status === "passed" && String(step.detail || "").includes("Mobile navigation ready"))
    && browser?.pageTextPreview?.includes("Mobile navigation ready")
    && byCheck.get("responsive")?.status === "verified"
    && byCheck.get("browser_e2e")?.status === "verified"
    && byCheck.get("screenshots")?.status === "verified"
    && report.acceptanceCoverage.every(item => item.status === "verified");

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    report,
    availability,
    responsiveChecks,
    generatedChecks,
  };
}

export async function runTestAgentAcceptanceChineseResponsiveViewportSelfTest() {
  const availability = await checkPlaywrightAvailability();
  if (!availability.available) {
    return {
      pass: false,
      availability,
      reason: availability.reason,
    };
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-acceptance-chinese-responsive-selftest-"));
  const artifactDir = path.join(dir, "artifacts");
  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}/`;
  const responsiveUrl = `http://127.0.0.1:${port}/responsive`;
  const expectedText = "移动导航已就绪";
  const acceptanceCriteria = [`移动端响应式页面在 /responsive 显示 "${expectedText}"，并且没有横向滚动。`];
  fs.writeFileSync(path.join(dir, "server.js"), [
    "const http = require('http');",
    "const root = '<!doctype html><title>首页</title><main><h1>首页</h1></main>';",
    "const responsive = `<!doctype html>",
    "<html><head><title>中文响应式</title><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">",
    "<style>",
    "body { margin: 0; font-family: sans-serif; }",
    "main { box-sizing: border-box; width: 100%; max-width: 100%; padding: 16px; }",
    ".desktop { display: block; }",
    ".mobile { display: none; }",
    ".row { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }",
    ".tile { min-width: 0; border: 1px solid #ccc; padding: 12px; }",
    "@media (max-width: 600px) { .desktop { display: none; } .mobile { display: block; } .row { grid-template-columns: 1fr; } }",
    "</style></head>",
    "<body><main>",
    "<h1>响应式看板</h1>",
    "<p class=\"desktop\">桌面导航已就绪</p>",
    `<p class="mobile" role="status">${expectedText}</p>`,
    "<section class=\"row\"><article class=\"tile\">概览</article><article class=\"tile\">动态</article></section>",
    "</main></body></html>`;",
    "http.createServer((req, res) => {",
    "  const route = String(req.url || '/').split('?')[0];",
    "  res.writeHead(200, {'content-type':'text/html; charset=utf-8'});",
    "  res.end(route === '/responsive' ? responsive : root);",
    "}).listen(process.env.PORT);",
  ].join("\n"), "utf-8");

  const project = {
    name: "acceptance-chinese-responsive-self-test",
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
  const responsiveChecks = buildAcceptanceResponsiveBrowserChecks(project, acceptanceCriteria);
  const generatedChecks = buildBrowserChecksForProject(project, acceptanceCriteria);

  const report = await runTestAgent({
    id: `acceptance-chinese-responsive-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent can infer mobile responsive browser checks from Chinese acceptance criteria.",
    acceptanceCriteria,
    requiredChecks: ["browser_e2e", "responsive", "screenshots", "browser_snapshots", "console_errors"],
    projects: [{
      name: "acceptance-chinese-responsive-self-test",
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

  const responsiveCheck = responsiveChecks[0];
  const generatedResponsiveCheck = generatedChecks.find(check => check.probeType === ACCEPTANCE_RESPONSIVE_PROBE_TYPE);
  const browser = report.browserResults.find(item => item.probeType === ACCEPTANCE_RESPONSIVE_PROBE_TYPE);
  const byCheck = new Map(report.requiredCheckCoverage.map(item => [item.check, item]));
  const pass = responsiveChecks.length === 1
    && generatedResponsiveCheck?.url === responsiveUrl
    && responsiveCheck?.context?.generatedBy === ACCEPTANCE_RESPONSIVE_PROBE_TYPE
    && responsiveCheck?.context?.acceptanceCriteria?.[0] === acceptanceCriteria[0]
    && responsiveCheck?.viewportWidth === 390
    && responsiveCheck?.viewportHeight === 844
    && responsiveCheck?.isMobile === true
    && responsiveCheck?.assertions?.some(assertion => assertion.type === "noHorizontalOverflow")
    && responsiveCheck?.assertions?.some(assertion => assertion.type === "text" && assertion.text === expectedText)
    && responsiveCheck?.assertions?.some(assertion => assertion.type === "urlIncludes" && assertion.text === "/responsive")
    && report.status === "passed"
    && report.browserResults.length === 1
    && browser?.provider === "playwright"
    && browser?.status === "passed"
    && browser?.context?.generatedBy === ACCEPTANCE_RESPONSIVE_PROBE_TYPE
    && browser?.url === responsiveUrl
    && browser?.viewport?.width === 390
    && browser?.viewport?.height === 844
    && browser?.viewport?.isMobile === true
    && browser?.steps.some(step => step.name === "assert:noHorizontalOverflow" && step.status === "passed")
    && browser?.steps.some(step => step.name === "assert:text" && step.status === "passed" && String(step.detail || "").includes(expectedText))
    && browser?.pageTextPreview?.includes(expectedText)
    && byCheck.get("responsive")?.status === "verified"
    && byCheck.get("browser_e2e")?.status === "verified"
    && byCheck.get("screenshots")?.status === "verified"
    && report.acceptanceCoverage.every(item => item.status === "verified");

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    report,
    availability,
    responsiveChecks,
    generatedChecks,
  };
}

export async function runTestAgentAcceptanceDownloadFlowSelfTest() {
  const availability = await checkPlaywrightAvailability();
  if (!availability.available) {
    return {
      pass: false,
      availability,
      reason: availability.reason,
    };
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-acceptance-download-flow-selftest-"));
  const artifactDir = path.join(dir, "artifacts");
  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}/`;
  const exportsUrl = `http://127.0.0.1:${port}/exports`;
  const acceptanceCriteria = ['At /exports, click "Export CSV", then downloads "tasks.csv" containing "Ship TestAgent".'];
  fs.writeFileSync(path.join(dir, "server.js"), [
    "const http = require('http');",
    "const exportsPage = `<!doctype html>",
    "<html><head><title>Exports</title></head>",
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
    "const root = '<!doctype html><title>Home</title><main><h1>Home</h1></main>';",
    "http.createServer((req, res) => {",
    "  const route = String(req.url || '/').split('?')[0];",
    "  res.writeHead(200, {'content-type':'text/html'});",
    "  res.end(route === '/exports' ? exportsPage : root);",
    "}).listen(process.env.PORT);",
  ].join("\n"), "utf-8");

  const project = {
    name: "acceptance-download-flow-self-test",
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
  const downloadChecks = buildAcceptanceDownloadFlowBrowserChecks(project, acceptanceCriteria);

  const report = await runTestAgent({
    id: `acceptance-download-flow-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent can infer a browser download flow from acceptance criteria.",
    acceptanceCriteria,
    requiredChecks: ["http", "browser_e2e", "browser_download", "browser_artifacts", "screenshots", "console_errors"],
    projects: [{
      name: "acceptance-download-flow-self-test",
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

  const browser = report.browserResults[0];
  const flowCheck = downloadChecks[0];
  const downloadArtifact = (browser?.browserArtifacts || []).find(item => item.type === "download");
  const downloadText = downloadArtifact?.path && fs.existsSync(downloadArtifact.path) ? fs.readFileSync(downloadArtifact.path, "utf-8") : "";
  const byCheck = new Map(report.requiredCheckCoverage.map(item => [item.check, item]));
  const pass = downloadChecks.length === 1
    && flowCheck?.probeType === ACCEPTANCE_DOWNLOAD_FLOW_PROBE_TYPE
    && flowCheck?.url === exportsUrl
    && flowCheck?.actions?.some(action => action.type === "goto" && action.url === exportsUrl)
    && flowCheck?.actions?.some(action => action.type === "click" && action.role === "button" && action.name === "Export CSV")
    && flowCheck?.assertions?.some(assertion => assertion.type === "downloadedFile" && assertion.fileName === "tasks.csv" && assertion.contentIncludes === "Ship TestAgent")
    && report.status === "passed"
    && report.browserResults.length === 1
    && browser?.provider === "playwright"
    && browser?.status === "passed"
    && browser?.probeType === ACCEPTANCE_DOWNLOAD_FLOW_PROBE_TYPE
    && browser?.url === exportsUrl
    && browser?.finalUrl === exportsUrl
    && browser?.pageTextPreview?.includes("Export started")
    && browser?.steps.some(step => step.name === "action:click" && step.status === "passed" && String(step.detail || "").includes("Export CSV"))
    && browser?.steps.some(step => step.name === "assert:downloadedFile" && step.status === "passed" && String(step.detail || "").includes("filename=tasks.csv") && String(step.detail || "").includes("Ship TestAgent"))
    && downloadArtifact?.path
    && fs.existsSync(downloadArtifact.path)
    && downloadText.includes("Ship TestAgent,done")
    && byCheck.get("browser_e2e")?.status === "verified"
    && byCheck.get("browser_download")?.status === "verified"
    && byCheck.get("browser_artifacts")?.status === "verified"
    && byCheck.get("screenshots")?.status === "verified"
    && report.acceptanceCoverage.every(item => item.status === "verified");

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    report,
    availability,
    downloadChecks,
    downloadArtifact,
  };
}

export async function runTestAgentAcceptanceChineseDownloadFlowSelfTest() {
  const availability = await checkPlaywrightAvailability();
  if (!availability.available) {
    return {
      pass: false,
      availability,
      reason: availability.reason,
    };
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-acceptance-chinese-download-flow-selftest-"));
  const artifactDir = path.join(dir, "artifacts");
  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}/`;
  const exportsUrl = `http://127.0.0.1:${port}/exports`;
  const acceptanceCriteria = ['在 /exports 点击 "导出 CSV"，然后下载 "tasks.csv"，内容包含 "Ship TestAgent"。'];
  fs.writeFileSync(path.join(dir, "server.js"), [
    "const http = require('http');",
    "const exportsPage = `<!doctype html>",
    "<html><head><title>导出</title></head>",
    "<body><main>",
    "<h1>导出</h1>",
    "<button type=\"button\" id=\"export\">导出 CSV</button>",
    "<p id=\"status\" role=\"status\">准备就绪</p>",
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
    "  document.getElementById('status').textContent = '导出已开始';",
    "  setTimeout(() => { URL.revokeObjectURL(link.href); link.remove(); }, 1000);",
    "});",
    "</script>",
    "</body></html>`;",
    "const root = '<!doctype html><title>首页</title><main><h1>首页</h1></main>';",
    "http.createServer((req, res) => {",
    "  const route = String(req.url || '/').split('?')[0];",
    "  res.writeHead(200, {'content-type':'text/html; charset=utf-8'});",
    "  res.end(route === '/exports' ? exportsPage : root);",
    "}).listen(process.env.PORT);",
  ].join("\n"), "utf-8");

  const project = {
    name: "acceptance-chinese-download-flow-self-test",
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
  const downloadChecks = buildAcceptanceDownloadFlowBrowserChecks(project, acceptanceCriteria);

  const report = await runTestAgent({
    id: `acceptance-chinese-download-flow-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent can infer browser download checks from Chinese acceptance criteria.",
    acceptanceCriteria,
    requiredChecks: ["http", "browser_e2e", "browser_download", "browser_artifacts", "screenshots", "console_errors"],
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

  const browser = report.browserResults[0];
  const flowCheck = downloadChecks[0];
  const downloadArtifact = (browser?.browserArtifacts || []).find(item => item.type === "download");
  const downloadText = downloadArtifact?.path && fs.existsSync(downloadArtifact.path) ? fs.readFileSync(downloadArtifact.path, "utf-8") : "";
  const byCheck = new Map(report.requiredCheckCoverage.map(item => [item.check, item]));
  const pass = downloadChecks.length === 1
    && flowCheck?.probeType === ACCEPTANCE_DOWNLOAD_FLOW_PROBE_TYPE
    && flowCheck?.url === exportsUrl
    && flowCheck?.context?.generatedBy === ACCEPTANCE_DOWNLOAD_FLOW_PROBE_TYPE
    && flowCheck?.context?.acceptanceCriteria?.[0] === acceptanceCriteria[0]
    && flowCheck?.actions?.some(action => action.type === "goto" && action.url === exportsUrl)
    && flowCheck?.actions?.some(action => action.type === "click" && action.role === "button" && action.name === "导出 CSV")
    && flowCheck?.assertions?.some(assertion => assertion.type === "downloadedFile" && assertion.fileName === "tasks.csv" && assertion.contentIncludes === "Ship TestAgent")
    && report.status === "passed"
    && report.browserResults.length === 1
    && browser?.provider === "playwright"
    && browser?.status === "passed"
    && browser?.probeType === ACCEPTANCE_DOWNLOAD_FLOW_PROBE_TYPE
    && browser?.url === exportsUrl
    && browser?.finalUrl === exportsUrl
    && browser?.context?.acceptanceCriteria?.[0] === acceptanceCriteria[0]
    && browser?.pageTextPreview?.includes("导出已开始")
    && browser?.steps.some(step => step.name === "action:click" && step.status === "passed" && String(step.detail || "").includes("导出 CSV"))
    && browser?.steps.some(step => step.name === "assert:downloadedFile" && step.status === "passed" && String(step.detail || "").includes("filename=tasks.csv") && String(step.detail || "").includes("Ship TestAgent"))
    && downloadArtifact?.path
    && fs.existsSync(downloadArtifact.path)
    && downloadText.includes("Ship TestAgent,done")
    && byCheck.get("browser_e2e")?.status === "verified"
    && byCheck.get("browser_download")?.status === "verified"
    && byCheck.get("browser_artifacts")?.status === "verified"
    && byCheck.get("screenshots")?.status === "verified"
    && report.acceptanceCoverage.every(item => item.status === "verified");

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    report,
    availability,
    downloadChecks,
    downloadArtifact,
  };
}

export async function runTestAgentAcceptanceUploadFlowSelfTest() {
  const availability = await checkPlaywrightAvailability();
  if (!availability.available) {
    return {
      pass: false,
      availability,
      reason: availability.reason,
    };
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-acceptance-upload-flow-selftest-"));
  const artifactDir = path.join(dir, "artifacts");
  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}/`;
  const uploadUrl = `http://127.0.0.1:${port}/upload`;
  const payload = "Ship TestAgent upload payload";
  const expectedText = `Uploaded notes.txt: ${payload}`;
  const acceptanceCriteria = [`At /upload, upload "notes.txt" containing "${payload}" to "Attachment", click "Upload", then shows "${expectedText}".`];
  fs.writeFileSync(path.join(dir, "server.js"), [
    "const http = require('http');",
    "const uploadPage = `<!doctype html>",
    "<html><head><title>Upload</title></head>",
    "<body><main>",
    "<h1>Upload</h1>",
    "<label for=\"attachment\">Attachment</label>",
    "<input id=\"attachment\" name=\"attachment\" type=\"file\" />",
    "<button type=\"button\" id=\"upload\">Upload</button>",
    "<p id=\"status\" role=\"status\">Waiting</p>",
    "</main>",
    "<script>",
    "document.getElementById('upload').addEventListener('click', async () => {",
    "  const input = document.getElementById('attachment');",
    "  const file = input.files && input.files[0];",
    "  if (!file) { document.getElementById('status').textContent = 'Missing file'; return; }",
    "  const text = await file.text();",
    "  document.body.dataset.fileName = file.name;",
    "  document.body.dataset.fileText = text;",
    "  document.getElementById('status').textContent = 'Uploaded ' + file.name + ': ' + text;",
    "});",
    "</script>",
    "</body></html>`;",
    "const root = '<!doctype html><title>Home</title><main><h1>Home</h1></main>';",
    "http.createServer((req, res) => {",
    "  const route = String(req.url || '/').split('?')[0];",
    "  res.writeHead(200, {'content-type':'text/html'});",
    "  res.end(route === '/upload' ? uploadPage : root);",
    "}).listen(process.env.PORT);",
  ].join("\n"), "utf-8");

  const project = {
    name: "acceptance-upload-flow-self-test",
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
  const uploadChecks = buildAcceptanceUploadFlowBrowserChecks(project, acceptanceCriteria);

  const report = await runTestAgent({
    id: `acceptance-upload-flow-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent can infer a browser upload flow from acceptance criteria.",
    acceptanceCriteria,
    requiredChecks: ["http", "browser_e2e", "screenshots", "browser_snapshots", "console_errors"],
    projects: [{
      name: "acceptance-upload-flow-self-test",
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

  const browser = report.browserResults[0];
  const flowCheck = uploadChecks[0];
  const byCheck = new Map(report.requiredCheckCoverage.map(item => [item.check, item]));
  const uploadAction = flowCheck?.actions?.find(action => action.type === "uploadFile");
  const interaction = report.browserInteractionSummary?.[0];
  const pass = uploadChecks.length === 1
    && flowCheck?.probeType === ACCEPTANCE_UPLOAD_FLOW_PROBE_TYPE
    && flowCheck?.url === uploadUrl
    && flowCheck?.actions?.some(action => action.type === "goto" && action.url === uploadUrl)
    && uploadAction?.label === "Attachment"
    && uploadAction?.fileName === "notes.txt"
    && uploadAction?.fileContent === payload
    && uploadAction?.mediaType === "text/plain"
    && flowCheck?.actions?.some(action => action.type === "click" && action.role === "button" && action.name === "Upload")
    && flowCheck?.assertions?.some(assertion => assertion.type === "text" && assertion.text === expectedText)
    && report.status === "passed"
    && report.browserResults.length === 1
    && browser?.provider === "playwright"
    && browser?.status === "passed"
    && browser?.probeType === ACCEPTANCE_UPLOAD_FLOW_PROBE_TYPE
    && browser?.url === uploadUrl
    && browser?.finalUrl === uploadUrl
    && browser?.pageTextPreview?.includes(expectedText)
    && browser?.steps.some(step => step.name === "action:uploadFile" && step.status === "passed" && String(step.detail || "").includes("label=Attachment") && String(step.detail || "").includes("file=notes.txt"))
    && browser?.steps.some(step => step.name === "action:click" && step.status === "passed" && String(step.detail || "").includes("Upload"))
    && browser?.steps.some(step => step.name === "assert:text" && step.status === "passed" && String(step.detail || "").includes(expectedText))
    && interaction?.actionTypes?.uploadFile === 1
    && byCheck.get("browser_e2e")?.status === "verified"
    && byCheck.get("screenshots")?.status === "verified"
    && report.acceptanceCoverage.every(item => item.status === "verified");

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    report,
    availability,
    uploadChecks,
  };
}

export async function runTestAgentAcceptanceChineseUploadFlowSelfTest() {
  const availability = await checkPlaywrightAvailability();
  if (!availability.available) {
    return {
      pass: false,
      availability,
      reason: availability.reason,
    };
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-acceptance-chinese-upload-flow-selftest-"));
  const artifactDir = path.join(dir, "artifacts");
  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}/`;
  const uploadUrl = `http://127.0.0.1:${port}/upload`;
  const payload = "中文上传内容";
  const expectedText = `已上传 notes.txt: ${payload}`;
  const acceptanceCriteria = [`在 /upload 上传 "notes.txt" 内容为 "${payload}" 到 "附件"，点击 "上传"，然后显示 "${expectedText}"。`];
  fs.writeFileSync(path.join(dir, "server.js"), [
    "const http = require('http');",
    "const uploadPage = `<!doctype html>",
    "<html><head><title>中文上传</title></head>",
    "<body><main>",
    "<h1>中文上传</h1>",
    "<label for=\"attachment\">附件</label>",
    "<input id=\"attachment\" name=\"attachment\" type=\"file\" />",
    "<button type=\"button\" id=\"upload\">上传</button>",
    "<p id=\"status\" role=\"status\">等待上传</p>",
    "</main>",
    "<script>",
    "document.getElementById('upload').addEventListener('click', async () => {",
    "  const input = document.getElementById('attachment');",
    "  const file = input.files && input.files[0];",
    "  if (!file) { document.getElementById('status').textContent = '缺少文件'; return; }",
    "  const text = await file.text();",
    "  document.body.dataset.fileName = file.name;",
    "  document.body.dataset.fileText = text;",
    "  document.getElementById('status').textContent = '已上传 ' + file.name + ': ' + text;",
    "});",
    "</script>",
    "</body></html>`;",
    "const root = '<!doctype html><title>首页</title><main><h1>首页</h1></main>';",
    "http.createServer((req, res) => {",
    "  const route = String(req.url || '/').split('?')[0];",
    "  res.writeHead(200, {'content-type':'text/html; charset=utf-8'});",
    "  res.end(route === '/upload' ? uploadPage : root);",
    "}).listen(process.env.PORT);",
  ].join("\n"), "utf-8");

  const project = {
    name: "acceptance-chinese-upload-flow-self-test",
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
  const uploadChecks = buildAcceptanceUploadFlowBrowserChecks(project, acceptanceCriteria);

  const report = await runTestAgent({
    id: `acceptance-chinese-upload-flow-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent can infer a browser upload flow from Chinese acceptance criteria.",
    acceptanceCriteria,
    requiredChecks: ["http", "browser_e2e", "browser_upload", "screenshots", "browser_snapshots", "console_errors"],
    projects: [{
      name: "acceptance-chinese-upload-flow-self-test",
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

  const browser = report.browserResults[0];
  const flowCheck = uploadChecks[0];
  const byCheck = new Map(report.requiredCheckCoverage.map(item => [item.check, item]));
  const uploadAction = flowCheck?.actions?.find(action => action.type === "uploadFile");
  const interaction = report.browserInteractionSummary?.[0];
  const pass = uploadChecks.length === 1
    && flowCheck?.probeType === ACCEPTANCE_UPLOAD_FLOW_PROBE_TYPE
    && flowCheck?.url === uploadUrl
    && flowCheck?.context?.generatedBy === ACCEPTANCE_UPLOAD_FLOW_PROBE_TYPE
    && flowCheck?.context?.acceptanceCriteria?.[0] === acceptanceCriteria[0]
    && uploadAction?.label === "附件"
    && uploadAction?.fileName === "notes.txt"
    && uploadAction?.fileContent === payload
    && uploadAction?.mediaType === "text/plain"
    && flowCheck?.actions?.some(action => action.type === "click" && action.role === "button" && action.name === "上传")
    && flowCheck?.assertions?.some(assertion => assertion.type === "text" && assertion.text === expectedText)
    && report.status === "passed"
    && report.browserResults.length === 1
    && browser?.provider === "playwright"
    && browser?.status === "passed"
    && browser?.probeType === ACCEPTANCE_UPLOAD_FLOW_PROBE_TYPE
    && browser?.context?.generatedBy === ACCEPTANCE_UPLOAD_FLOW_PROBE_TYPE
    && browser?.url === uploadUrl
    && browser?.finalUrl === uploadUrl
    && browser?.pageTextPreview?.includes(expectedText)
    && browser?.steps.some(step => step.name === "action:uploadFile" && step.status === "passed" && String(step.detail || "").includes("label=附件") && String(step.detail || "").includes("file=notes.txt"))
    && browser?.steps.some(step => step.name === "action:click" && step.status === "passed" && String(step.detail || "").includes("上传"))
    && browser?.steps.some(step => step.name === "assert:text" && step.status === "passed" && String(step.detail || "").includes(expectedText))
    && interaction?.actionTypes?.uploadFile === 1
    && byCheck.get("browser_e2e")?.status === "verified"
    && byCheck.get("browser_upload")?.status === "verified"
    && byCheck.get("screenshots")?.status === "verified"
    && report.acceptanceCoverage.every(item => item.status === "verified");

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    report,
    availability,
    uploadChecks,
  };
}

export async function runTestAgentAcceptanceClickFlowSelfTest() {
  const availability = await checkPlaywrightAvailability();
  if (!availability.available) {
    return {
      pass: false,
      availability,
      reason: availability.reason,
    };
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-acceptance-click-flow-selftest-"));
  const artifactDir = path.join(dir, "artifacts");
  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}/`;
  const menuUrl = `http://127.0.0.1:${port}/menu`;
  const acceptanceCriteria = ['At /menu, click "Open settings", then shows "Settings panel ready".'];
  fs.writeFileSync(path.join(dir, "server.js"), [
    "const http = require('http');",
    "const html = `<!doctype html>",
    "<html><head><title>Click Flow Fixture</title></head>",
    "<body>",
    "<main>",
    "<h1>Menu</h1>",
    "<button type=\"button\" id=\"open\">Open settings</button>",
    "<section id=\"panel\" hidden>",
    "<h2>Settings</h2>",
    "<p>Settings panel ready</p>",
    "</section>",
    "</main>",
    "<script>",
    "document.getElementById('open').addEventListener('click', () => {",
    "  document.getElementById('panel').hidden = false;",
    "});",
    "</script>",
    "</body></html>`;",
    "const server = http.createServer((req, res) => {",
    "  res.writeHead(200, {'content-type': 'text/html'});",
    "  res.end(html);",
    "});",
    "server.listen(process.env.PORT || 0, '127.0.0.1');",
  ].join("\n"), "utf-8");

  const project = {
    name: "acceptance-click-flow-self-test",
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
  const clickChecks = buildAcceptanceClickFlowBrowserChecks(project, acceptanceCriteria);

  const report = await runTestAgent({
    id: `acceptance-click-flow-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent can infer a browser click flow from acceptance criteria.",
    acceptanceCriteria,
    requiredChecks: ["http", "browser_e2e", "screenshots", "console_errors"],
    projects: [{
      name: "acceptance-click-flow-self-test",
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

  const browser = report.browserResults[0];
  const markdown = buildTestAgentMarkdownReport(report);
  const byCheck = new Map(report.requiredCheckCoverage.map(item => [item.check, item]));
  const clickCheck = clickChecks[0];
  const hasAction = (type: string, detail: string) => {
    return browser?.steps.some(step => step.name === `action:${type}` && step.status === "passed" && String(step.detail || "").includes(detail)) === true;
  };
  const hasAssertion = (type: string, detail: string) => {
    return browser?.steps.some(step => step.name === `assert:${type}` && step.status === "passed" && String(step.detail || "").includes(detail)) === true;
  };
  const pass = clickChecks.length === 1
    && clickCheck?.probeType === ACCEPTANCE_CLICK_FLOW_PROBE_TYPE
    && clickCheck?.url === menuUrl
    && clickCheck?.context?.generatedBy === ACCEPTANCE_CLICK_FLOW_PROBE_TYPE
    && clickCheck?.context?.acceptanceCriteria?.[0] === acceptanceCriteria[0]
    && clickCheck?.actions?.some(action => action.type === "click" && action.role === "button" && action.name === "Open settings")
    && clickCheck?.assertions?.some(assertion => assertion.type === "text" && assertion.text === "Settings panel ready")
    && report.status === "passed"
    && report.browserResults.length === 1
    && browser?.provider === "playwright"
    && browser?.status === "passed"
    && browser?.probeType === ACCEPTANCE_CLICK_FLOW_PROBE_TYPE
    && browser?.context?.generatedBy === ACCEPTANCE_CLICK_FLOW_PROBE_TYPE
    && browser?.context?.acceptanceCriteria?.[0] === acceptanceCriteria[0]
    && browser?.url === menuUrl
    && browser?.pageTextPreview?.includes("Settings panel ready")
    && hasAction("click", "role=button; name=Open settings")
    && hasAssertion("text", "Settings panel ready")
    && hasAssertion("urlIncludes", "/menu")
    && report.evidence.some(item => item.type === "browser" && item.detail?.includes("source=acceptance_click_flow"))
    && markdown.includes("**Acceptance source:**")
    && markdown.includes(acceptanceCriteria[0])
    && byCheck.get("browser_e2e")?.status === "verified"
    && byCheck.get("screenshots")?.status === "verified"
    && report.acceptanceCoverage.every(item => item.status === "verified");

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    report,
    availability,
    clickChecks,
    markdown,
  };
}

export async function runTestAgentAcceptanceChineseClickFlowSelfTest() {
  const availability = await checkPlaywrightAvailability();
  if (!availability.available) {
    return {
      pass: false,
      availability,
      reason: availability.reason,
    };
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-acceptance-chinese-click-flow-selftest-"));
  const artifactDir = path.join(dir, "artifacts");
  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}/`;
  const menuUrl = `http://127.0.0.1:${port}/menu`;
  const acceptanceCriteria = ['在 /menu 点击 "打开设置"，然后显示 "设置面板就绪"。'];
  fs.writeFileSync(path.join(dir, "server.js"), [
    "const http = require('http');",
    "const html = `<!doctype html>",
    "<html><head><title>菜单</title></head>",
    "<body>",
    "<main>",
    "<h1>菜单</h1>",
    "<button type=\"button\" id=\"open\">打开设置</button>",
    "<section id=\"panel\" hidden>",
    "<h2>设置</h2>",
    "<p>设置面板就绪</p>",
    "</section>",
    "</main>",
    "<script>",
    "document.getElementById('open').addEventListener('click', () => {",
    "  document.getElementById('panel').hidden = false;",
    "});",
    "</script>",
    "</body></html>`;",
    "const home = '<!doctype html><title>首页</title><main><h1>首页</h1></main>';",
    "http.createServer((req, res) => {",
    "  const route = String(req.url || '/').split('?')[0];",
    "  res.writeHead(200, {'content-type': 'text/html; charset=utf-8'});",
    "  res.end(route === '/menu' ? html : home);",
    "}).listen(process.env.PORT || 0, '127.0.0.1');",
  ].join("\n"), "utf-8");

  const project = {
    name: "acceptance-chinese-click-flow-self-test",
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
  const clickChecks = buildAcceptanceClickFlowBrowserChecks(project, acceptanceCriteria);

  const report = await runTestAgent({
    id: `acceptance-chinese-click-flow-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent can infer a browser click flow from Chinese acceptance criteria.",
    acceptanceCriteria,
    requiredChecks: ["http", "browser_e2e", "screenshots", "console_errors"],
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

  const browser = report.browserResults[0];
  const clickCheck = clickChecks[0];
  const byCheck = new Map(report.requiredCheckCoverage.map(item => [item.check, item]));
  const pass = clickChecks.length === 1
    && clickCheck?.probeType === ACCEPTANCE_CLICK_FLOW_PROBE_TYPE
    && clickCheck?.url === menuUrl
    && clickCheck?.context?.generatedBy === ACCEPTANCE_CLICK_FLOW_PROBE_TYPE
    && clickCheck?.context?.acceptanceCriteria?.[0] === acceptanceCriteria[0]
    && clickCheck?.actions?.some(action => action.type === "click" && action.role === "button" && action.name === "打开设置")
    && clickCheck?.assertions?.some(assertion => assertion.type === "text" && assertion.text === "设置面板就绪")
    && report.status === "passed"
    && report.browserResults.length === 1
    && browser?.provider === "playwright"
    && browser?.status === "passed"
    && browser?.probeType === ACCEPTANCE_CLICK_FLOW_PROBE_TYPE
    && browser?.context?.acceptanceCriteria?.[0] === acceptanceCriteria[0]
    && browser?.url === menuUrl
    && browser?.pageTextPreview?.includes("设置面板就绪")
    && browser?.steps.some(step => step.name === "action:click" && step.status === "passed" && String(step.detail || "").includes("打开设置"))
    && browser?.steps.some(step => step.name === "assert:text" && step.status === "passed" && String(step.detail || "").includes("设置面板就绪"))
    && browser?.steps.some(step => step.name === "assert:urlIncludes" && step.status === "passed" && String(step.detail || "").includes("/menu"))
    && byCheck.get("browser_e2e")?.status === "verified"
    && byCheck.get("screenshots")?.status === "verified"
    && report.acceptanceCoverage.every(item => item.status === "verified");

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    report,
    availability,
    clickChecks,
  };
}

export async function runTestAgentAcceptanceClickNavigationFlowSelfTest() {
  const availability = await checkPlaywrightAvailability();
  if (!availability.available) {
    return {
      pass: false,
      availability,
      reason: availability.reason,
    };
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-acceptance-click-navigation-flow-selftest-"));
  const artifactDir = path.join(dir, "artifacts");
  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}/`;
  const menuUrl = `http://127.0.0.1:${port}/menu`;
  const settingsUrl = `http://127.0.0.1:${port}/settings`;
  const acceptanceCriteria = ["At /menu, click the Settings link, then navigates to /settings."];
  fs.writeFileSync(path.join(dir, "server.js"), [
    "const http = require('http');",
    "const menu = `<!doctype html>",
    "<html><head><title>Menu</title></head>",
    "<body><main>",
    "<h1>Menu</h1>",
    "<nav><a href=\"/settings\">Settings</a></nav>",
    "</main></body></html>`;",
    "const settings = `<!doctype html>",
    "<html><head><title>Settings</title></head>",
    "<body><main><h1>Settings</h1><p>Settings route ready</p></main></body></html>`;",
    "const home = '<!doctype html><title>Home</title><main><h1>Home</h1></main>';",
    "http.createServer((req, res) => {",
    "  const route = String(req.url || '/').split('?')[0];",
    "  res.writeHead(200, {'content-type':'text/html'});",
    "  if (route === '/menu') return res.end(menu);",
    "  if (route === '/settings') return res.end(settings);",
    "  return res.end(home);",
    "}).listen(process.env.PORT, '127.0.0.1');",
  ].join("\n"), "utf-8");

  const project = {
    name: "acceptance-click-navigation-flow-self-test",
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
  const clickChecks = buildAcceptanceClickFlowBrowserChecks(project, acceptanceCriteria);

  const report = await runTestAgent({
    id: `acceptance-click-navigation-flow-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent can infer a browser link navigation flow from acceptance criteria.",
    acceptanceCriteria,
    requiredChecks: ["http", "browser_e2e", "screenshots", "console_errors"],
    projects: [{
      name: "acceptance-click-navigation-flow-self-test",
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

  const browser = report.browserResults[0];
  const byCheck = new Map(report.requiredCheckCoverage.map(item => [item.check, item]));
  const clickCheck = clickChecks[0];
  const hasAction = (type: string, detail: string) => {
    return browser?.steps.some(step => step.name === `action:${type}` && step.status === "passed" && String(step.detail || "").includes(detail)) === true;
  };
  const hasAssertion = (type: string, detail: string) => {
    return browser?.steps.some(step => step.name === `assert:${type}` && step.status === "passed" && String(step.detail || "").includes(detail)) === true;
  };
  const pass = clickChecks.length === 1
    && clickCheck?.probeType === ACCEPTANCE_CLICK_FLOW_PROBE_TYPE
    && clickCheck?.url === menuUrl
    && clickCheck?.actions?.some(action => action.type === "click" && action.role === "link" && action.name === "Settings")
    && clickCheck?.actions?.some(action => action.type === "waitForUrl" && action.text === "/settings")
    && clickCheck?.assertions?.some(assertion => assertion.type === "urlIncludes" && assertion.text === "/settings")
    && report.status === "passed"
    && report.browserResults.length === 1
    && browser?.provider === "playwright"
    && browser?.status === "passed"
    && browser?.probeType === ACCEPTANCE_CLICK_FLOW_PROBE_TYPE
    && browser?.url === menuUrl
    && browser?.finalUrl === settingsUrl
    && browser?.pageTextPreview?.includes("Settings route ready")
    && hasAction("click", "role=link; name=Settings")
    && hasAction("waitForUrl", "/settings")
    && hasAssertion("urlIncludes", "/settings")
    && byCheck.get("browser_e2e")?.status === "verified"
    && byCheck.get("screenshots")?.status === "verified"
    && report.acceptanceCoverage.every(item => item.status === "verified");

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    report,
    availability,
    clickChecks,
  };
}

export async function runTestAgentAcceptanceMultiClickFlowSelfTest() {
  const availability = await checkPlaywrightAvailability();
  if (!availability.available) {
    return {
      pass: false,
      availability,
      reason: availability.reason,
    };
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-acceptance-multi-click-flow-selftest-"));
  const artifactDir = path.join(dir, "artifacts");
  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}/`;
  const menuUrl = `http://127.0.0.1:${port}/menu`;
  const acceptanceCriteria = ['At /menu, click "Open settings", click "Advanced", then shows "Advanced settings ready".'];
  fs.writeFileSync(path.join(dir, "server.js"), [
    "const http = require('http');",
    "const html = `<!doctype html>",
    "<html><head><title>Multi Click Fixture</title></head>",
    "<body><main>",
    "<h1>Menu</h1>",
    "<button type=\"button\" id=\"open\">Open settings</button>",
    "<section id=\"settings\" hidden>",
    "<button type=\"button\" id=\"advanced\">Advanced</button>",
    "</section>",
    "<p id=\"status\" role=\"status\">Waiting</p>",
    "</main>",
    "<script>",
    "document.getElementById('open').addEventListener('click', () => {",
    "  document.getElementById('settings').hidden = false;",
    "  document.getElementById('status').textContent = 'Settings opened';",
    "});",
    "document.getElementById('advanced').addEventListener('click', () => {",
    "  document.getElementById('status').textContent = 'Advanced settings ready';",
    "});",
    "</script>",
    "</body></html>`;",
    "const home = '<!doctype html><title>Home</title><main><h1>Home</h1></main>';",
    "http.createServer((req, res) => {",
    "  const route = String(req.url || '/').split('?')[0];",
    "  res.writeHead(200, {'content-type':'text/html'});",
    "  res.end(route === '/menu' ? html : home);",
    "}).listen(process.env.PORT, '127.0.0.1');",
  ].join("\n"), "utf-8");

  const project = {
    name: "acceptance-multi-click-flow-self-test",
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
  const clickChecks = buildAcceptanceClickFlowBrowserChecks(project, acceptanceCriteria);

  const report = await runTestAgent({
    id: `acceptance-multi-click-flow-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent can infer a multi-click browser flow from acceptance criteria.",
    acceptanceCriteria,
    requiredChecks: ["http", "browser_e2e", "screenshots", "console_errors"],
    projects: [{
      name: "acceptance-multi-click-flow-self-test",
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

  const browser = report.browserResults[0];
  const byCheck = new Map(report.requiredCheckCoverage.map(item => [item.check, item]));
  const clickCheck = clickChecks[0];
  const clickActions = clickCheck?.actions?.filter(action => action.type === "click") || [];
  const hasAction = (detail: string) => {
    return browser?.steps.some(step => step.name === "action:click" && step.status === "passed" && String(step.detail || "").includes(detail)) === true;
  };
  const hasAssertion = (type: string, detail: string) => {
    return browser?.steps.some(step => step.name === `assert:${type}` && step.status === "passed" && String(step.detail || "").includes(detail)) === true;
  };
  const pass = clickChecks.length === 1
    && clickCheck?.probeType === ACCEPTANCE_CLICK_FLOW_PROBE_TYPE
    && clickCheck?.url === menuUrl
    && clickActions.length === 2
    && clickActions[0]?.role === "button"
    && clickActions[0]?.name === "Open settings"
    && clickActions[1]?.role === "button"
    && clickActions[1]?.name === "Advanced"
    && clickCheck?.assertions?.some(assertion => assertion.type === "text" && assertion.text === "Advanced settings ready")
    && report.status === "passed"
    && report.browserResults.length === 1
    && browser?.provider === "playwright"
    && browser?.status === "passed"
    && browser?.probeType === ACCEPTANCE_CLICK_FLOW_PROBE_TYPE
    && browser?.url === menuUrl
    && browser?.pageTextPreview?.includes("Advanced settings ready")
    && hasAction("role=button; name=Open settings")
    && hasAction("role=button; name=Advanced")
    && hasAssertion("text", "Advanced settings ready")
    && byCheck.get("browser_e2e")?.status === "verified"
    && byCheck.get("screenshots")?.status === "verified"
    && report.acceptanceCoverage.every(item => item.status === "verified");

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    report,
    availability,
    clickChecks,
  };
}

export async function runTestAgentAcceptanceFormFlowSelfTest() {
  const availability = await checkPlaywrightAvailability();
  if (!availability.available) {
    return {
      pass: false,
      availability,
      reason: availability.reason,
    };
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-acceptance-form-flow-selftest-"));
  const artifactDir = path.join(dir, "artifacts");
  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}/`;
  const tasksUrl = `http://127.0.0.1:${port}/tasks`;
  const acceptanceCriteria = ['At /tasks, enter "Buy milk" into "Task", click "Add task", then shows "Buy milk".'];
  writeTaskBoardFixtureServer(dir);

  const project = {
    name: "acceptance-form-flow-self-test",
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
  const flowChecks = buildAcceptanceFormFlowBrowserChecks(project, acceptanceCriteria);

  const report = await runTestAgent({
    id: `acceptance-form-flow-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent can infer a simple browser form flow from acceptance criteria.",
    acceptanceCriteria,
    requiredChecks: ["http", "browser_e2e", "screenshots", "browser_snapshots", "console_errors"],
    projects: [{
      name: "acceptance-form-flow-self-test",
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

  const browser = report.browserResults[0];
  const byCheck = new Map(report.requiredCheckCoverage.map(item => [item.check, item]));
  const flowCheck = flowChecks[0];
  const hasAction = (type: string, detail: string) => {
    return browser?.steps.some(step => step.name === `action:${type}` && step.status === "passed" && String(step.detail || "").includes(detail)) === true;
  };
  const hasAssertion = (type: string, detail: string) => {
    return browser?.steps.some(step => step.name === `assert:${type}` && step.status === "passed" && String(step.detail || "").includes(detail)) === true;
  };
  const pass = flowChecks.length === 1
    && flowCheck?.probeType === ACCEPTANCE_FORM_FLOW_PROBE_TYPE
    && flowCheck?.url === tasksUrl
    && flowCheck?.actions?.some(action => action.type === "fill" && action.label === "Task" && action.value === "Buy milk")
    && flowCheck?.actions?.some(action => action.type === "click" && action.role === "button" && action.name === "Add task")
    && flowCheck?.assertions?.some(assertion => assertion.type === "text" && assertion.text === "Buy milk")
    && report.status === "passed"
    && report.httpResults.some(item => item.name === "Page HTTP probe" && item.status === "passed")
    && report.browserResults.length === 1
    && browser?.provider === "playwright"
    && browser?.status === "passed"
    && browser?.probeType === ACCEPTANCE_FORM_FLOW_PROBE_TYPE
    && browser?.url === tasksUrl
    && browser?.finalUrl === tasksUrl
    && browser?.pageTextPreview?.includes("Buy milk")
    && hasAction("fill", "label=Task")
    && hasAction("click", "role=button; name=Add task")
    && hasAssertion("text", "Buy milk")
    && hasAssertion("urlIncludes", "/tasks")
    && byCheck.get("browser_e2e")?.status === "verified"
    && byCheck.get("screenshots")?.status === "verified"
    && report.acceptanceCoverage.every(item => item.status === "verified");

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    report,
    availability,
    flowChecks,
  };
}

export async function runTestAgentAcceptanceChineseFormFlowSelfTest() {
  const availability = await checkPlaywrightAvailability();
  if (!availability.available) {
    return {
      pass: false,
      availability,
      reason: availability.reason,
    };
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-acceptance-chinese-form-flow-selftest-"));
  const artifactDir = path.join(dir, "artifacts");
  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}/`;
  const tasksUrl = `http://127.0.0.1:${port}/tasks`;
  const acceptanceCriteria = ['在 /tasks 输入 "买牛奶" 到 "任务"，点击 "添加任务"，然后显示 "买牛奶"。'];
  fs.writeFileSync(path.join(dir, "server.js"), [
    "const http = require('http');",
    "const html = `<!doctype html>",
    "<html><head><title>任务</title></head>",
    "<body>",
    "<main>",
    "<h1>任务</h1>",
    "<label for=\"task\">任务</label>",
    "<input id=\"task\" name=\"task\" />",
    "<button type=\"button\" id=\"add\">添加任务</button>",
    "<ul id=\"tasks\" aria-label=\"已保存任务\"></ul>",
    "<p id=\"status\" role=\"status\">等待</p>",
    "</main>",
    "<script>",
    "document.getElementById('add').addEventListener('click', () => {",
    "  const value = document.getElementById('task').value.trim();",
    "  if (!value) { document.getElementById('status').textContent = '缺少任务'; return; }",
    "  const item = document.createElement('li');",
    "  item.textContent = value;",
    "  document.getElementById('tasks').appendChild(item);",
    "  document.getElementById('status').textContent = '已添加 ' + value;",
    "});",
    "</script>",
    "</body></html>`;",
    "const home = '<!doctype html><title>首页</title><main><h1>首页</h1></main>';",
    "http.createServer((req, res) => {",
    "  const route = String(req.url || '/').split('?')[0];",
    "  res.writeHead(200, {'content-type': 'text/html; charset=utf-8'});",
    "  res.end(route === '/tasks' ? html : home);",
    "}).listen(process.env.PORT || 0, '127.0.0.1');",
  ].join("\n"), "utf-8");

  const project = {
    name: "acceptance-chinese-form-flow-self-test",
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
  const flowChecks = buildAcceptanceFormFlowBrowserChecks(project, acceptanceCriteria);

  const report = await runTestAgent({
    id: `acceptance-chinese-form-flow-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent can infer a browser form flow from Chinese acceptance criteria.",
    acceptanceCriteria,
    requiredChecks: ["http", "browser_e2e", "browser_form", "screenshots", "console_errors"],
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

  const browser = report.browserResults[0];
  const byCheck = new Map(report.requiredCheckCoverage.map(item => [item.check, item]));
  const flowCheck = flowChecks[0];
  const pass = flowChecks.length === 1
    && flowCheck?.probeType === ACCEPTANCE_FORM_FLOW_PROBE_TYPE
    && flowCheck?.url === tasksUrl
    && flowCheck?.context?.generatedBy === ACCEPTANCE_FORM_FLOW_PROBE_TYPE
    && flowCheck?.context?.acceptanceCriteria?.[0] === acceptanceCriteria[0]
    && flowCheck?.actions?.some(action => action.type === "fill" && action.label === "任务" && action.value === "买牛奶")
    && flowCheck?.actions?.some(action => action.type === "click" && action.role === "button" && action.name === "添加任务")
    && flowCheck?.assertions?.some(assertion => assertion.type === "text" && assertion.text === "买牛奶")
    && report.status === "passed"
    && report.browserResults.length === 1
    && browser?.provider === "playwright"
    && browser?.status === "passed"
    && browser?.probeType === ACCEPTANCE_FORM_FLOW_PROBE_TYPE
    && browser?.url === tasksUrl
    && browser?.finalUrl === tasksUrl
    && browser?.context?.acceptanceCriteria?.[0] === acceptanceCriteria[0]
    && browser?.pageTextPreview?.includes("买牛奶")
    && browser?.steps.some(step => step.name === "action:fill" && step.status === "passed" && String(step.detail || "").includes("label=任务"))
    && browser?.steps.some(step => step.name === "action:click" && step.status === "passed" && String(step.detail || "").includes("添加任务"))
    && browser?.steps.some(step => step.name === "assert:text" && step.status === "passed" && String(step.detail || "").includes("买牛奶"))
    && browser?.steps.some(step => step.name === "assert:urlIncludes" && step.status === "passed" && String(step.detail || "").includes("/tasks"))
    && byCheck.get("browser_e2e")?.status === "verified"
    && byCheck.get("browser_form")?.status === "verified"
    && byCheck.get("screenshots")?.status === "verified"
    && report.acceptanceCoverage.every(item => item.status === "verified");

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    report,
    availability,
    flowChecks,
  };
}

export async function runTestAgentAcceptanceMultiFieldFormFlowSelfTest() {
  const availability = await checkPlaywrightAvailability();
  if (!availability.available) {
    return {
      pass: false,
      availability,
      reason: availability.reason,
    };
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-acceptance-multi-field-form-flow-selftest-"));
  const artifactDir = path.join(dir, "artifacts");
  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}/`;
  const loginUrl = `http://127.0.0.1:${port}/login`;
  const acceptanceCriteria = ['At /login, enter "ada@example.test" into "Email" and enter "correct horse battery staple" into "Password", click "Sign in", then shows "Dashboard".'];
  fs.writeFileSync(path.join(dir, "server.js"), [
    "const http = require('http');",
    "const login = `<!doctype html>",
    "<html><head><title>Login</title></head>",
    "<body>",
    "<main>",
    "<h1>Sign in</h1>",
    "<label for=\"email\">Email</label>",
    "<input id=\"email\" name=\"email\" />",
    "<label for=\"password\">Password</label>",
    "<input id=\"password\" name=\"password\" type=\"password\" />",
    "<button type=\"button\" id=\"signin\">Sign in</button>",
    "<p id=\"status\" role=\"status\">Waiting</p>",
    "</main>",
    "<script>",
    "document.getElementById('signin').addEventListener('click', () => {",
    "  const email = document.getElementById('email').value;",
    "  const password = document.getElementById('password').value;",
    "  document.getElementById('status').textContent = email && password ? 'Dashboard' : 'Missing credentials';",
    "});",
    "</script>",
    "</body></html>`;",
    "const root = '<!doctype html><title>Home</title><main><h1>Home</h1></main>';",
    "http.createServer((req, res) => {",
    "  const route = String(req.url || '/').split('?')[0];",
    "  res.writeHead(200, {'content-type':'text/html'});",
    "  res.end(route === '/login' ? login : root);",
    "}).listen(process.env.PORT);",
  ].join("\n"), "utf-8");

  const project = {
    name: "acceptance-multi-field-form-flow-self-test",
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
  const flowChecks = buildAcceptanceFormFlowBrowserChecks(project, acceptanceCriteria);

  const report = await runTestAgent({
    id: `acceptance-multi-field-form-flow-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent can infer a multi-field browser form flow from acceptance criteria.",
    acceptanceCriteria,
    requiredChecks: ["http", "browser_e2e", "screenshots", "browser_snapshots", "console_errors"],
    projects: [{
      name: "acceptance-multi-field-form-flow-self-test",
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

  const browser = report.browserResults[0];
  const flowCheck = flowChecks[0];
  const byCheck = new Map(report.requiredCheckCoverage.map(item => [item.check, item]));
  const fillActions = flowCheck?.actions?.filter(action => action.type === "fill") || [];
  const browserFillSteps = browser?.steps.filter(step => step.name === "action:fill" && step.status === "passed") || [];
  const hasAction = (detail: string) => {
    return browserFillSteps.some(step => String(step.detail || "").includes(detail));
  };
  const pass = flowChecks.length === 1
    && flowCheck?.probeType === ACCEPTANCE_FORM_FLOW_PROBE_TYPE
    && flowCheck?.url === loginUrl
    && (flowCheck?.actions?.length || 0) >= 5
    && fillActions.length === 2
    && fillActions[0]?.label === "Email"
    && fillActions[0]?.value === "ada@example.test"
    && fillActions[1]?.label === "Password"
    && fillActions[1]?.value === "correct horse battery staple"
    && flowCheck?.actions?.some(action => action.type === "click" && action.role === "button" && action.name === "Sign in")
    && flowCheck?.assertions?.some(assertion => assertion.type === "text" && assertion.text === "Dashboard")
    && !flowCheck?.assertions?.some(assertion => assertion.type === "text" && assertion.text === "ada@example.test")
    && !flowCheck?.assertions?.some(assertion => assertion.type === "text" && assertion.text === "correct horse battery staple")
    && report.status === "passed"
    && report.browserResults.length === 1
    && browser?.provider === "playwright"
    && browser?.status === "passed"
    && browser?.probeType === ACCEPTANCE_FORM_FLOW_PROBE_TYPE
    && browser?.url === loginUrl
    && browser?.finalUrl === loginUrl
    && browser?.pageTextPreview?.includes("Dashboard")
    && !browser?.pageTextPreview?.includes("Missing credentials")
    && browserFillSteps.length === 2
    && hasAction("label=Email")
    && hasAction("label=Password")
    && browser?.steps.some(step => step.name === "action:click" && step.status === "passed" && String(step.detail || "").includes("Sign in"))
    && browser?.steps.some(step => step.name === "assert:text" && step.status === "passed" && String(step.detail || "").includes("Dashboard"))
    && browser?.steps.some(step => step.name === "assert:urlIncludes" && step.status === "passed" && String(step.detail || "").includes("/login"))
    && byCheck.get("browser_e2e")?.status === "verified"
    && byCheck.get("screenshots")?.status === "verified"
    && report.acceptanceCoverage.every(item => item.status === "verified");

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    report,
    availability,
    flowChecks,
  };
}

export async function runTestAgentAcceptanceSelectCheckboxFormFlowSelfTest() {
  const availability = await checkPlaywrightAvailability();
  if (!availability.available) {
    return {
      pass: false,
      availability,
      reason: availability.reason,
    };
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-acceptance-select-checkbox-form-flow-selftest-"));
  const artifactDir = path.join(dir, "artifacts");
  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}/`;
  const settingsUrl = `http://127.0.0.1:${port}/settings`;
  const acceptanceCriteria = ['At /settings, select "High" in "Priority", check "Notify team", enter "Quarterly plan" into "Title", click "Save", then shows "Saved Quarterly plan High notify".'];
  fs.writeFileSync(path.join(dir, "server.js"), [
    "const http = require('http');",
    "const settings = `<!doctype html>",
    "<html><head><title>Settings</title></head>",
    "<body>",
    "<main>",
    "<h1>Settings</h1>",
    "<label for=\"title\">Title</label>",
    "<input id=\"title\" name=\"title\" />",
    "<label for=\"priority\">Priority</label>",
    "<select id=\"priority\" name=\"priority\">",
    "<option value=\"priority-low\">Low</option>",
    "<option value=\"priority-high\">High</option>",
    "</select>",
    "<label><input id=\"notify\" name=\"notify\" type=\"checkbox\" /> Notify team</label>",
    "<button type=\"button\" id=\"save\">Save</button>",
    "<p id=\"status\" role=\"status\">Waiting</p>",
    "</main>",
    "<script>",
    "document.getElementById('save').addEventListener('click', () => {",
    "  const title = document.getElementById('title').value;",
    "  const priority = document.getElementById('priority').selectedOptions[0].textContent;",
    "  const notify = document.getElementById('notify').checked ? 'notify' : 'quiet';",
    "  document.getElementById('status').textContent = title ? 'Saved ' + title + ' ' + priority + ' ' + notify : 'Missing title';",
    "});",
    "</script>",
    "</body></html>`;",
    "const root = '<!doctype html><title>Home</title><main><h1>Home</h1></main>';",
    "http.createServer((req, res) => {",
    "  const route = String(req.url || '/').split('?')[0];",
    "  res.writeHead(200, {'content-type':'text/html'});",
    "  res.end(route === '/settings' ? settings : root);",
    "}).listen(process.env.PORT);",
  ].join("\n"), "utf-8");

  const project = {
    name: "acceptance-select-checkbox-form-flow-self-test",
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
  const flowChecks = buildAcceptanceFormFlowBrowserChecks(project, acceptanceCriteria);

  const report = await runTestAgent({
    id: `acceptance-select-checkbox-form-flow-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent can infer select and checkbox controls from acceptance criteria.",
    acceptanceCriteria,
    requiredChecks: ["http", "browser_e2e", "screenshots", "browser_snapshots", "console_errors"],
    projects: [{
      name: "acceptance-select-checkbox-form-flow-self-test",
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

  const browser = report.browserResults[0];
  const flowCheck = flowChecks[0];
  const byCheck = new Map(report.requiredCheckCoverage.map(item => [item.check, item]));
  const actionTypes = flowCheck?.actions?.map(action => action.type).join(",") || "";
  const browserActionNames = browser?.steps.filter(step => step.kind === "action" && step.status === "passed").map(step => step.name).join(",") || "";
  const pass = flowChecks.length === 1
    && flowCheck?.probeType === ACCEPTANCE_FORM_FLOW_PROBE_TYPE
    && flowCheck?.url === settingsUrl
    && actionTypes.includes("selectOption")
    && actionTypes.includes("check")
    && flowCheck?.actions?.some(action => action.type === "selectOption" && action.label === "Priority" && action.value === "High")
    && flowCheck?.actions?.some(action => action.type === "check" && action.label === "Notify team")
    && flowCheck?.actions?.some(action => action.type === "fill" && action.label === "Title" && action.value === "Quarterly plan")
    && flowCheck?.actions?.some(action => action.type === "click" && action.role === "button" && action.name === "Save")
    && flowCheck?.assertions?.some(assertion => assertion.type === "selectedTextIncludes" && assertion.label === "Priority" && assertion.text === "High")
    && flowCheck?.assertions?.some(assertion => assertion.type === "checked" && assertion.label === "Notify team")
    && flowCheck?.assertions?.some(assertion => assertion.type === "text" && assertion.text === "Saved Quarterly plan High notify")
    && report.status === "passed"
    && report.browserResults.length === 1
    && browser?.provider === "playwright"
    && browser?.status === "passed"
    && browser?.probeType === ACCEPTANCE_FORM_FLOW_PROBE_TYPE
    && browser?.url === settingsUrl
    && browser?.finalUrl === settingsUrl
    && browser?.pageTextPreview?.includes("Saved Quarterly plan High notify")
    && !browser?.pageTextPreview?.includes("Missing title")
    && browserActionNames.includes("action:selectOption")
    && browserActionNames.includes("action:check")
    && browser?.steps.some(step => step.name === "action:selectOption" && String(step.detail || "").includes("label=Priority"))
    && browser?.steps.some(step => step.name === "action:check" && String(step.detail || "").includes("label=Notify team"))
    && browser?.steps.some(step => step.name === "action:fill" && String(step.detail || "").includes("label=Title"))
    && browser?.steps.some(step => step.name === "assert:selectedTextIncludes" && step.status === "passed" && String(step.detail || "").includes("label=Priority") && String(step.detail || "").includes("expected=High"))
    && browser?.steps.some(step => step.name === "assert:checked" && step.status === "passed" && String(step.detail || "").includes("label=Notify team"))
    && browser?.steps.some(step => step.name === "assert:text" && step.status === "passed" && String(step.detail || "").includes("Saved Quarterly plan High notify"))
    && byCheck.get("browser_e2e")?.status === "verified"
    && byCheck.get("screenshots")?.status === "verified"
    && report.acceptanceCoverage.every(item => item.status === "verified");

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    report,
    availability,
    flowChecks,
  };
}

export async function runTestAgentAcceptanceUncheckRadioFormFlowSelfTest() {
  const availability = await checkPlaywrightAvailability();
  if (!availability.available) {
    return {
      pass: false,
      availability,
      reason: availability.reason,
    };
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-acceptance-uncheck-radio-form-flow-selftest-"));
  const artifactDir = path.join(dir, "artifacts");
  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}/`;
  const preferencesUrl = `http://127.0.0.1:${port}/preferences`;
  const acceptanceCriteria = ['At /preferences, uncheck "Newsletter", choose the radio option "Email", click "Save", then shows "Saved Email newsletter off".'];
  fs.writeFileSync(path.join(dir, "server.js"), [
    "const http = require('http');",
    "const preferences = `<!doctype html>",
    "<html><head><title>Preferences</title></head>",
    "<body>",
    "<main>",
    "<h1>Preferences</h1>",
    "<label><input id=\"newsletter\" type=\"checkbox\" checked /> Newsletter</label>",
    "<fieldset><legend>Contact method</legend>",
    "<label><input type=\"radio\" name=\"contact\" value=\"Email\" /> Email</label>",
    "<label><input type=\"radio\" name=\"contact\" value=\"SMS\" checked /> SMS</label>",
    "</fieldset>",
    "<button type=\"button\" id=\"save\">Save</button>",
    "<p id=\"status\" role=\"status\">Waiting</p>",
    "</main>",
    "<script>",
    "document.getElementById('save').addEventListener('click', () => {",
    "  const newsletter = document.getElementById('newsletter').checked ? 'on' : 'off';",
    "  const contact = document.querySelector('input[name=contact]:checked')?.value || 'none';",
    "  document.getElementById('status').textContent = 'Saved ' + contact + ' newsletter ' + newsletter;",
    "});",
    "</script>",
    "</body></html>`;",
    "const root = '<!doctype html><title>Home</title><main><h1>Home</h1></main>';",
    "http.createServer((req, res) => {",
    "  const route = String(req.url || '/').split('?')[0];",
    "  res.writeHead(200, {'content-type':'text/html'});",
    "  res.end(route === '/preferences' ? preferences : root);",
    "}).listen(process.env.PORT);",
  ].join("\n"), "utf-8");

  const project = {
    name: "acceptance-uncheck-radio-form-flow-self-test",
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
  const flowChecks = buildAcceptanceFormFlowBrowserChecks(project, acceptanceCriteria);

  const report = await runTestAgent({
    id: `acceptance-uncheck-radio-form-flow-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent can infer uncheck and radio controls from acceptance criteria.",
    acceptanceCriteria,
    requiredChecks: ["http", "browser_e2e", "screenshots", "browser_snapshots", "console_errors"],
    projects: [{
      name: "acceptance-uncheck-radio-form-flow-self-test",
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

  const browser = report.browserResults[0];
  const flowCheck = flowChecks[0];
  const byCheck = new Map(report.requiredCheckCoverage.map(item => [item.check, item]));
  const pass = flowChecks.length === 1
    && flowCheck?.probeType === ACCEPTANCE_FORM_FLOW_PROBE_TYPE
    && flowCheck?.url === preferencesUrl
    && flowCheck?.actions?.some(action => action.type === "uncheck" && action.label === "Newsletter")
    && flowCheck?.actions?.some(action => action.type === "check" && action.label === "Email")
    && !flowCheck?.actions?.some(action => action.type === "selectOption")
    && flowCheck?.actions?.some(action => action.type === "click" && action.role === "button" && action.name === "Save")
    && flowCheck?.assertions?.some(assertion => assertion.type === "notChecked" && assertion.label === "Newsletter")
    && flowCheck?.assertions?.some(assertion => assertion.type === "checked" && assertion.label === "Email")
    && flowCheck?.assertions?.some(assertion => assertion.type === "text" && assertion.text === "Saved Email newsletter off")
    && report.status === "passed"
    && report.browserResults.length === 1
    && browser?.provider === "playwright"
    && browser?.status === "passed"
    && browser?.probeType === ACCEPTANCE_FORM_FLOW_PROBE_TYPE
    && browser?.url === preferencesUrl
    && browser?.finalUrl === preferencesUrl
    && browser?.pageTextPreview?.includes("Saved Email newsletter off")
    && !browser?.pageTextPreview?.includes("Saved SMS newsletter on")
    && browser?.steps.some(step => step.name === "action:uncheck" && step.status === "passed" && String(step.detail || "").includes("label=Newsletter"))
    && browser?.steps.some(step => step.name === "action:check" && step.status === "passed" && String(step.detail || "").includes("label=Email"))
    && browser?.steps.some(step => step.name === "assert:notChecked" && step.status === "passed" && String(step.detail || "").includes("label=Newsletter"))
    && browser?.steps.some(step => step.name === "assert:checked" && step.status === "passed" && String(step.detail || "").includes("label=Email"))
    && browser?.steps.some(step => step.name === "assert:text" && step.status === "passed" && String(step.detail || "").includes("Saved Email newsletter off"))
    && byCheck.get("browser_e2e")?.status === "verified"
    && byCheck.get("screenshots")?.status === "verified"
    && report.acceptanceCoverage.every(item => item.status === "verified");

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    report,
    availability,
    flowChecks,
  };
}

export async function runTestAgentAcceptanceRedirectFormFlowSelfTest() {
  const availability = await checkPlaywrightAvailability();
  if (!availability.available) {
    return {
      pass: false,
      availability,
      reason: availability.reason,
    };
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-acceptance-redirect-form-flow-selftest-"));
  const artifactDir = path.join(dir, "artifacts");
  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}/`;
  const loginUrl = `http://127.0.0.1:${port}/login`;
  const dashboardUrl = `http://127.0.0.1:${port}/dashboard`;
  const acceptanceCriteria = ['At /login, enter "ada@example.test" into "Email" and enter "correct horse battery staple" into "Password", click "Sign in", then navigates to /dashboard and shows "Dashboard".'];
  fs.writeFileSync(path.join(dir, "server.js"), [
    "const http = require('http');",
    "const login = `<!doctype html>",
    "<html><head><title>Login</title></head>",
    "<body>",
    "<main>",
    "<h1>Sign in</h1>",
    "<label for=\"email\">Email</label>",
    "<input id=\"email\" name=\"email\" />",
    "<label for=\"password\">Password</label>",
    "<input id=\"password\" name=\"password\" type=\"password\" />",
    "<button type=\"button\" id=\"signin\">Sign in</button>",
    "<p id=\"status\" role=\"status\">Waiting</p>",
    "</main>",
    "<script>",
    "document.getElementById('signin').addEventListener('click', () => {",
    "  const email = document.getElementById('email').value;",
    "  const password = document.getElementById('password').value;",
    "  if (email && password) setTimeout(() => { window.location.href = '/dashboard'; }, 350);",
    "  else document.getElementById('status').textContent = 'Missing credentials';",
    "});",
    "</script>",
    "</body></html>`;",
    "const dashboard = '<!doctype html><title>Dashboard</title><main><h1>Dashboard</h1><p role=\"status\">Signed in</p></main>';",
    "const root = '<!doctype html><title>Home</title><main><h1>Home</h1></main>';",
    "http.createServer((req, res) => {",
    "  const route = String(req.url || '/').split('?')[0];",
    "  res.writeHead(200, {'content-type':'text/html'});",
    "  res.end(route === '/login' ? login : route === '/dashboard' ? dashboard : root);",
    "}).listen(process.env.PORT);",
  ].join("\n"), "utf-8");

  const project = {
    name: "acceptance-redirect-form-flow-self-test",
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
  const flowChecks = buildAcceptanceFormFlowBrowserChecks(project, acceptanceCriteria);

  const report = await runTestAgent({
    id: `acceptance-redirect-form-flow-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent can infer a post-submit redirect browser form flow.",
    acceptanceCriteria,
    requiredChecks: ["http", "browser_e2e", "screenshots", "browser_snapshots", "console_errors"],
    projects: [{
      name: "acceptance-redirect-form-flow-self-test",
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

  const browser = report.browserResults[0];
  const flowCheck = flowChecks[0];
  const byCheck = new Map(report.requiredCheckCoverage.map(item => [item.check, item]));
  const fillActions = flowCheck?.actions?.filter(action => action.type === "fill") || [];
  const pass = flowChecks.length === 1
    && flowCheck?.probeType === ACCEPTANCE_FORM_FLOW_PROBE_TYPE
    && flowCheck?.url === loginUrl
    && flowCheck?.actions?.some(action => action.type === "goto" && action.url === loginUrl)
    && fillActions.length === 2
    && flowCheck?.actions?.some(action => action.type === "waitForUrl" && action.text === "/dashboard")
    && flowCheck?.assertions?.some(assertion => assertion.type === "text" && assertion.text === "Dashboard")
    && flowCheck?.assertions?.some(assertion => assertion.type === "urlIncludes" && assertion.text === "/dashboard")
    && !flowCheck?.assertions?.some(assertion => assertion.type === "urlIncludes" && assertion.text === "/login")
    && report.status === "passed"
    && report.browserResults.length === 1
    && browser?.provider === "playwright"
    && browser?.status === "passed"
    && browser?.probeType === ACCEPTANCE_FORM_FLOW_PROBE_TYPE
    && browser?.url === loginUrl
    && browser?.finalUrl === dashboardUrl
    && browser?.pageTextPreview?.includes("Dashboard")
    && !browser?.pageTextPreview?.includes("Missing credentials")
    && browser?.steps.some(step => step.name === "action:waitForUrl" && step.status === "passed" && String(step.detail || "").includes("/dashboard"))
    && browser?.steps.some(step => step.name === "assert:text" && step.status === "passed" && String(step.detail || "").includes("Dashboard"))
    && browser?.steps.some(step => step.name === "assert:urlIncludes" && step.status === "passed" && String(step.detail || "").includes("/dashboard"))
    && byCheck.get("browser_e2e")?.status === "verified"
    && byCheck.get("screenshots")?.status === "verified"
    && report.acceptanceCoverage.every(item => item.status === "verified");

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    report,
    availability,
    flowChecks,
  };
}

export async function runTestAgentAcceptanceInvalidFormAdversarialSelfTest() {
  const availability = await checkPlaywrightAvailability();
  if (!availability.available) {
    return {
      pass: false,
      availability,
      reason: availability.reason,
    };
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-acceptance-invalid-form-adversarial-selftest-"));
  const artifactDir = path.join(dir, "artifacts");
  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}/`;
  const loginUrl = `http://127.0.0.1:${port}/login`;
  const acceptanceCriteria = ['At /login, enter "bad@example.test" into "Email" and enter "wrong-password" into "Password", click "Sign in", then stays on /login and shows "Invalid password".'];
  fs.writeFileSync(path.join(dir, "server.js"), [
    "const http = require('http');",
    "const login = `<!doctype html>",
    "<html><head><title>Login</title></head>",
    "<body><main>",
    "<h1>Sign in</h1>",
    "<label for=\"email\">Email</label>",
    "<input id=\"email\" name=\"email\" />",
    "<label for=\"password\">Password</label>",
    "<input id=\"password\" name=\"password\" type=\"password\" />",
    "<button type=\"button\" id=\"signin\">Sign in</button>",
    "<p id=\"status\" role=\"status\">Waiting</p>",
    "</main>",
    "<script>",
    "document.getElementById('signin').addEventListener('click', () => {",
    "  const email = document.getElementById('email').value;",
    "  const password = document.getElementById('password').value;",
    "  document.body.dataset.submittedEmail = email;",
    "  document.body.dataset.submittedPassword = password;",
    "  document.getElementById('status').textContent = 'Invalid password';",
    "});",
    "</script>",
    "</body></html>`;",
    "const root = '<!doctype html><title>Home</title><main><h1>Home</h1></main>';",
    "http.createServer((req, res) => {",
    "  const route = String(req.url || '/').split('?')[0];",
    "  res.writeHead(200, {'content-type':'text/html'});",
    "  res.end(route === '/login' ? login : root);",
    "}).listen(process.env.PORT);",
  ].join("\n"), "utf-8");

  const project = {
    name: "acceptance-invalid-form-adversarial-self-test",
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
  const flowChecks = buildAcceptanceFormFlowBrowserChecks(project, acceptanceCriteria);
  const generatedChecks = buildBrowserChecksForProject(project, acceptanceCriteria);

  const report = await runTestAgent({
    id: `acceptance-invalid-form-adversarial-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent can treat invalid form acceptance criteria as adversarial browser evidence.",
    acceptanceCriteria,
    requiredChecks: ["http", "browser_e2e", "browser_form", "adversarial", "screenshots", "console_errors"],
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

  const flowCheck = flowChecks[0];
  const generatedFormCheck = generatedChecks.find(check => check.probeType === ACCEPTANCE_FORM_FLOW_PROBE_TYPE);
  const browser = report.browserResults.find(result => result.probeType === ACCEPTANCE_FORM_FLOW_PROBE_TYPE);
  const byCheck = new Map(report.requiredCheckCoverage.map(item => [item.check, item]));
  const pass = flowChecks.length === 1
    && flowCheck?.probeType === ACCEPTANCE_FORM_FLOW_PROBE_TYPE
    && flowCheck?.adversarial === true
    && flowCheck?.url === loginUrl
    && flowCheck?.context?.generatedBy === ACCEPTANCE_FORM_FLOW_PROBE_TYPE
    && flowCheck?.context?.adversarialIntent === "invalid_form_input"
    && flowCheck?.context?.acceptanceCriteria?.[0] === acceptanceCriteria[0]
    && flowCheck?.actions?.some(action => action.type === "fill" && action.label === "Email" && action.value === "bad@example.test")
    && flowCheck?.actions?.some(action => action.type === "fill" && action.label === "Password" && action.value === "wrong-password")
    && flowCheck?.assertions?.some(assertion => assertion.type === "text" && assertion.text === "Invalid password")
    && flowCheck?.assertions?.some(assertion => assertion.type === "urlIncludes" && assertion.text === "/login")
    && generatedFormCheck?.adversarial === true
    && report.status === "passed"
    && report.browserResults.length === 1
    && browser?.provider === "playwright"
    && browser?.status === "passed"
    && browser?.adversarial === true
    && browser?.url === loginUrl
    && browser?.finalUrl === loginUrl
    && browser?.context?.adversarialIntent === "invalid_form_input"
    && report.adversarialEvidenceSummary.status === "verified"
    && report.adversarialEvidenceSummary.passedRelevant === 1
    && report.adversarialEvidenceSummary.items[0]?.relevance === "explicit"
    && report.adversarialEvidenceSummary.items[0]?.linkedCriteria[0] === acceptanceCriteria[0]
    && browser?.pageTextPreview?.includes("Invalid password")
    && browser?.steps.some(step => step.name === "assert:text" && step.status === "passed" && String(step.detail || "").includes("Invalid password"))
    && browser?.steps.some(step => step.name === "assert:urlIncludes" && step.status === "passed" && String(step.detail || "").includes("/login"))
    && byCheck.get("browser_e2e")?.status === "verified"
    && byCheck.get("browser_form")?.status === "verified"
    && byCheck.get("adversarial")?.status === "verified"
    && byCheck.get("screenshots")?.status === "verified"
    && report.acceptanceCoverage.every(item => item.status === "verified");

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    availability,
    flowChecks,
    generatedChecks,
    report,
  };
}

export async function runTestAgentAcceptanceRefreshPersistenceFormFlowSelfTest() {
  const availability = await checkPlaywrightAvailability();
  if (!availability.available) {
    return {
      pass: false,
      availability,
      reason: availability.reason,
    };
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-acceptance-refresh-persistence-form-flow-selftest-"));
  const artifactDir = path.join(dir, "artifacts");
  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}/`;
  const tasksUrl = `http://127.0.0.1:${port}/tasks`;
  const acceptanceCriteria = ['At /tasks, enter "Ship TestAgent" into "Task", click "Save", then still shows "Ship TestAgent" after refresh.'];
  fs.writeFileSync(path.join(dir, "server.js"), [
    "const http = require('http');",
    "const html = `<!doctype html>",
    "<html><head><title>Tasks</title></head>",
    "<body>",
    "<main>",
    "<h1>Tasks</h1>",
    "<label for=\"task\">Task</label>",
    "<input id=\"task\" name=\"task\" />",
    "<button type=\"button\" id=\"save\">Save</button>",
    "<p id=\"status\" role=\"status\">Waiting</p>",
    "<ul id=\"tasks\"></ul>",
    "</main>",
    "<script>",
    "function readTasks() { try { return JSON.parse(localStorage.getItem('tasks') || '[]'); } catch { return []; } }",
    "function writeTasks(tasks) { localStorage.setItem('tasks', JSON.stringify(tasks)); }",
    "function render() {",
    "  const tasks = readTasks();",
    "  document.getElementById('tasks').innerHTML = tasks.map(task => '<li>' + task + '</li>').join('');",
    "  if (tasks.length) document.getElementById('status').textContent = 'Saved ' + tasks[tasks.length - 1];",
    "}",
    "document.getElementById('save').addEventListener('click', () => {",
    "  const value = document.getElementById('task').value;",
    "  if (!value) { document.getElementById('status').textContent = 'Missing task'; return; }",
    "  const tasks = readTasks();",
    "  tasks.push(value);",
    "  writeTasks(tasks);",
    "  render();",
    "});",
    "render();",
    "</script>",
    "</body></html>`;",
    "const root = '<!doctype html><title>Home</title><main><h1>Home</h1></main>';",
    "http.createServer((req, res) => {",
    "  const route = String(req.url || '/').split('?')[0];",
    "  res.writeHead(200, {'content-type':'text/html'});",
    "  res.end(route === '/tasks' ? html : root);",
    "}).listen(process.env.PORT);",
  ].join("\n"), "utf-8");

  const project = {
    name: "acceptance-refresh-persistence-form-flow-self-test",
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
  const flowChecks = buildAcceptanceFormFlowBrowserChecks(project, acceptanceCriteria);

  const report = await runTestAgent({
    id: `acceptance-refresh-persistence-form-flow-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent can infer refresh persistence checks from acceptance criteria.",
    acceptanceCriteria,
    requiredChecks: ["http", "browser_e2e", "screenshots", "browser_snapshots", "console_errors"],
    projects: [{
      name: "acceptance-refresh-persistence-form-flow-self-test",
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

  const browser = report.browserResults[0];
  const flowCheck = flowChecks[0];
  const byCheck = new Map(report.requiredCheckCoverage.map(item => [item.check, item]));
  const clickIndex = flowCheck?.actions?.findIndex(action => action.type === "click") ?? -1;
  const reloadIndex = flowCheck?.actions?.findIndex(action => action.type === "reload") ?? -1;
  const pass = flowChecks.length === 1
    && flowCheck?.probeType === ACCEPTANCE_FORM_FLOW_PROBE_TYPE
    && flowCheck?.url === tasksUrl
    && clickIndex >= 0
    && reloadIndex > clickIndex
    && flowCheck?.actions?.some(action => action.type === "fill" && action.label === "Task" && action.value === "Ship TestAgent")
    && flowCheck?.assertions?.some(assertion => assertion.type === "text" && assertion.text === "Ship TestAgent")
    && flowCheck?.assertions?.some(assertion => assertion.type === "urlIncludes" && assertion.text === "/tasks")
    && report.status === "passed"
    && report.browserResults.length === 1
    && browser?.provider === "playwright"
    && browser?.status === "passed"
    && browser?.probeType === ACCEPTANCE_FORM_FLOW_PROBE_TYPE
    && browser?.url === tasksUrl
    && browser?.finalUrl === tasksUrl
    && browser?.pageTextPreview?.includes("Ship TestAgent")
    && !browser?.pageTextPreview?.includes("Missing task")
    && browser?.steps.some(step => step.name === "action:reload" && step.status === "passed")
    && browser?.steps.some(step => step.name === "assert:text" && step.status === "passed" && String(step.detail || "").includes("Ship TestAgent"))
    && browser?.steps.some(step => step.name === "assert:urlIncludes" && step.status === "passed" && String(step.detail || "").includes("/tasks"))
    && byCheck.get("browser_e2e")?.status === "verified"
    && byCheck.get("screenshots")?.status === "verified"
    && report.acceptanceCoverage.every(item => item.status === "verified");

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    report,
    availability,
    flowChecks,
  };
}

export async function runTestAgentPlaywrightUrlIncludesWaitSelfTest() {
  const availability = await checkPlaywrightAvailability();
  if (!availability.available) {
    return {
      pass: false,
      availability,
      reason: availability.reason,
    };
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-playwright-url-includes-wait-selftest-"));
  const artifactDir = path.join(dir, "artifacts");
  const port = await getFreePort();
  const targetUrl = `http://127.0.0.1:${port}/start`;
  const doneUrl = `http://127.0.0.1:${port}/done`;
  fs.writeFileSync(path.join(dir, "server.js"), [
    "const http = require('http');",
    "const start = `<!doctype html>",
    "<html><head><title>Start</title></head>",
    "<body><main><h1>Start</h1><button type=\"button\" id=\"continue\">Continue</button></main>",
    "<script>",
    "document.getElementById('continue').addEventListener('click', () => {",
    "  setTimeout(() => { window.location.href = '/done'; }, 350);",
    "});",
    "</script>",
    "</body></html>`;",
    "const done = '<!doctype html><title>Done</title><main><h1>Done</h1><p role=\"status\">Completed</p></main>';",
    "http.createServer((req, res) => {",
    "  const route = String(req.url || '/').split('?')[0];",
    "  res.writeHead(200, {'content-type':'text/html'});",
    "  res.end(route === '/done' ? done : start);",
    "}).listen(process.env.PORT);",
  ].join("\n"), "utf-8");

  const report = await runTestAgent({
    id: `playwright-url-includes-wait-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify urlIncludes waits for delayed browser navigation.",
    acceptanceCriteria: ["Clicking Continue eventually navigates to /done and shows Done."],
    requiredChecks: ["browser_e2e", "screenshots", "browser_snapshots", "console_errors"],
    projects: [{
      name: "playwright-url-includes-wait-self-test",
      workDir: dir,
      runCommand: `"${process.execPath}" server.js`,
      targetUrl,
      env: { PORT: port },
      browserChecks: [{
        name: "Delayed URL assertion waits",
        url: targetUrl,
        actions: [
          { type: "goto", url: targetUrl },
          { type: "click", role: "button", name: "Continue", exact: true },
        ],
        assertions: [
          { type: "urlIncludes", text: "/done", timeoutMs: 5_000 },
          { type: "text", text: "Done" },
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
      browserTimeoutMs: 10_000,
    },
  }, { browserProvider: "playwright" });

  const browser = report.browserResults[0];
  const byCheck = new Map(report.requiredCheckCoverage.map(item => [item.check, item]));
  const pass = report.status === "passed"
    && report.browserResults.length === 1
    && browser?.provider === "playwright"
    && browser?.status === "passed"
    && browser?.url === targetUrl
    && browser?.finalUrl === doneUrl
    && browser?.steps.some(step => step.name === "action:click" && step.status === "passed" && String(step.detail || "").includes("Continue"))
    && browser?.steps.some(step => step.name === "assert:urlIncludes" && step.status === "passed" && String(step.detail || "").includes("/done"))
    && browser?.steps.some(step => step.name === "assert:text" && step.status === "passed" && String(step.detail || "").includes("Done"))
    && browser?.pageTextPreview?.includes("Done")
    && byCheck.get("browser_e2e")?.status === "verified"
    && byCheck.get("screenshots")?.status === "verified"
    && report.acceptanceCoverage.every(item => item.status === "verified");

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    report,
    availability,
  };
}