"use strict";
// Behavior-freeze extraction from self-test-browser-flows.ts (part-02.ts).
// Extracted functional module. The original entry remains a compatibility facade.
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.runTestAgentAcceptanceDialogFlowSelfTest = runTestAgentAcceptanceDialogFlowSelfTest;
exports.runTestAgentAcceptancePopupFlowSelfTest = runTestAgentAcceptancePopupFlowSelfTest;
exports.runTestAgentAcceptanceKeyboardFlowSelfTest = runTestAgentAcceptanceKeyboardFlowSelfTest;
exports.runTestAgentAcceptanceHoverFlowSelfTest = runTestAgentAcceptanceHoverFlowSelfTest;
exports.runTestAgentAcceptanceScrollFlowSelfTest = runTestAgentAcceptanceScrollFlowSelfTest;
exports.runTestAgentAcceptanceRepeatedClickSelfTest = runTestAgentAcceptanceRepeatedClickSelfTest;
exports.runTestAgentAcceptanceChineseRepeatedClickSelfTest = runTestAgentAcceptanceChineseRepeatedClickSelfTest;
exports.runTestAgentBlankPageSmokeSelfTest = runTestAgentBlankPageSmokeSelfTest;
exports.runTestAgentAcceptancePathSmokeSelfTest = runTestAgentAcceptancePathSmokeSelfTest;
exports.runTestAgentAcceptancePathGroupingSelfTest = runTestAgentAcceptancePathGroupingSelfTest;
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const self_test_policy_1 = require("../self-test-policy");
const acceptance_click_flows_1 = require("../browser/acceptance-click-flows");
const acceptance_dialog_flows_1 = require("../browser/acceptance-dialog-flows");
const acceptance_hover_flows_1 = require("../browser/acceptance-hover-flows");
const acceptance_keyboard_flows_1 = require("../browser/acceptance-keyboard-flows");
const acceptance_popup_flows_1 = require("../browser/acceptance-popup-flows");
const acceptance_repeated_click_checks_1 = require("../browser/acceptance-repeated-click-checks");
const acceptance_scroll_flows_1 = require("../browser/acceptance-scroll-flows");
const auto_checks_1 = require("../browser/auto-checks");
const playwright_provider_1 = require("../browser/playwright-provider");
const self_test_1 = require("../self-test");
async function runTestAgentAcceptanceDialogFlowSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
    if (!availability.available) {
        return {
            pass: false,
            availability,
            reason: availability.reason,
        };
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-acceptance-dialog-flow-selftest-"));
    const artifactDir = path.join(dir, "artifacts");
    const port = await (0, self_test_1.getFreePort)();
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
    const dialogChecks = (0, acceptance_dialog_flows_1.buildAcceptanceDialogFlowBrowserChecks)(project, acceptanceCriteria);
    const generatedChecks = (0, auto_checks_1.buildBrowserChecksForProject)(project, acceptanceCriteria);
    const report = await (0, self_test_policy_1.runTestAgentForSelfTest)({
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
    const dialogResults = report.browserResults.filter(result => result.probeType === acceptance_dialog_flows_1.ACCEPTANCE_DIALOG_FLOW_PROBE_TYPE);
    const generatedDialogChecks = generatedChecks.filter(check => check.probeType === acceptance_dialog_flows_1.ACCEPTANCE_DIALOG_FLOW_PROBE_TYPE);
    const generatedClickChecks = generatedChecks.filter(check => check.probeType === acceptance_click_flows_1.ACCEPTANCE_CLICK_FLOW_PROBE_TYPE);
    const targets = [
        { target: "Show alert", dialogType: "alert", message: englishMessage },
        { target: "显示确认", dialogType: "confirm", message: chineseMessage },
    ];
    const checksCoverTargets = dialogChecks.length === 2
        && targets.every(item => dialogChecks.some(check => check.url === dialogsUrl
            && check.context?.generatedBy === acceptance_dialog_flows_1.ACCEPTANCE_DIALOG_FLOW_PROBE_TYPE
            && check.context?.clickTarget?.name === item.target
            && check.context?.dialogType === item.dialogType
            && check.context?.messageIncludes === item.message
            && check.actions?.some(action => action.type === "click" && action.role === "button" && action.name === item.target)
            && check.assertions?.some(assertion => assertion.type === "dialogAppeared" && assertion.dialogType === item.dialogType)
            && check.assertions?.some(assertion => assertion.type === "dialogMessageIncludes" && assertion.text === item.message && assertion.dialogType === item.dialogType)
            && check.assertions?.some(assertion => assertion.type === "urlIncludes" && assertion.text === "/dialogs")));
    const resultsCoverTargets = dialogResults.length === 2
        && targets.every(item => dialogResults.some(result => result.status === "passed"
            && result.provider === "playwright"
            && result.url === dialogsUrl
            && result.finalUrl === dialogsUrl
            && result.context?.generatedBy === acceptance_dialog_flows_1.ACCEPTANCE_DIALOG_FLOW_PROBE_TYPE
            && result.context?.clickTarget?.name === item.target
            && result.context?.dialogType === item.dialogType
            && result.context?.messageIncludes === item.message
            && result.steps.some(step => step.name === "action:click" && step.status === "passed" && String(step.detail || "").includes(item.target))
            && result.steps.some(step => step.name === "assert:dialogAppeared" && step.status === "passed" && String(step.detail || "").includes(`dialogType=${item.dialogType}`))
            && result.steps.some(step => step.name === "assert:dialogMessageIncludes" && step.status === "passed" && String(step.detail || "").includes(`dialogType=${item.dialogType}`))
            && (result.dialogMessages || []).some(message => message.includes(`dialog ${item.dialogType}`) && message.includes(item.message) && message.includes("accepted=yes"))
            && !!result.dialogLogPath));
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
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    return {
        pass,
        availability,
        dialogChecks,
        generatedChecks,
        report,
        dialogLogText,
    };
}
async function runTestAgentAcceptancePopupFlowSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
    if (!availability.available) {
        return {
            pass: false,
            availability,
            reason: availability.reason,
        };
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-acceptance-popup-flow-selftest-"));
    const artifactDir = path.join(dir, "artifacts");
    const port = await (0, self_test_1.getFreePort)();
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
    const popupChecks = (0, acceptance_popup_flows_1.buildAcceptancePopupFlowBrowserChecks)(project, acceptanceCriteria);
    const generatedChecks = (0, auto_checks_1.buildBrowserChecksForProject)(project, acceptanceCriteria);
    const report = await (0, self_test_policy_1.runTestAgentForSelfTest)({
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
    const popupResults = report.browserResults.filter(result => result.probeType === acceptance_popup_flows_1.ACCEPTANCE_POPUP_FLOW_PROBE_TYPE);
    const generatedPopupChecks = generatedChecks.filter(check => check.probeType === acceptance_popup_flows_1.ACCEPTANCE_POPUP_FLOW_PROBE_TYPE);
    const generatedClickChecks = generatedChecks.filter(check => check.probeType === acceptance_click_flows_1.ACCEPTANCE_CLICK_FLOW_PROBE_TYPE);
    const generatedPathChecks = generatedChecks.filter(check => check.context?.generatedBy === "acceptance_path_smoke");
    const targets = [
        { target: "Open help center", popupPath: "/help", text: englishText },
        { target: "打开帮助中心", popupPath: "/help-cn", text: chineseText },
    ];
    const checksCoverTargets = popupChecks.length === 2
        && targets.every(item => popupChecks.some(check => check.url === supportUrl
            && check.context?.generatedBy === acceptance_popup_flows_1.ACCEPTANCE_POPUP_FLOW_PROBE_TYPE
            && check.context?.clickTarget?.name === item.target
            && check.context?.popupUrlPath === item.popupPath
            && check.context?.popupTextIncludes === item.text
            && check.actions?.some(action => action.type === "click" && action.role === "button" && action.name === item.target)
            && check.assertions?.some(assertion => assertion.type === "popupOpened")
            && check.assertions?.some(assertion => assertion.type === "popupUrlIncludes" && assertion.url === item.popupPath)
            && check.assertions?.some(assertion => assertion.type === "popupTextIncludes" && assertion.text === item.text)
            && check.assertions?.some(assertion => assertion.type === "urlIncludes" && assertion.text === "/support")));
    const resultsCoverTargets = popupResults.length === 2
        && targets.every(item => popupResults.some(result => result.status === "passed"
            && result.provider === "playwright"
            && result.url === supportUrl
            && result.finalUrl === supportUrl
            && result.context?.generatedBy === acceptance_popup_flows_1.ACCEPTANCE_POPUP_FLOW_PROBE_TYPE
            && result.context?.clickTarget?.name === item.target
            && result.context?.popupUrlPath === item.popupPath
            && result.context?.popupTextIncludes === item.text
            && result.steps.some(step => step.name === "action:click" && step.status === "passed" && String(step.detail || "").includes(item.target))
            && result.steps.some(step => step.name === "assert:popupOpened" && step.status === "passed")
            && result.steps.some(step => step.name === "assert:popupUrlIncludes" && step.status === "passed")
            && result.steps.some(step => step.name === "assert:popupTextIncludes" && step.status === "passed")
            && (result.popupMessages || []).some(message => message.includes(item.popupPath) && message.includes(item.text))
            && !!result.popupLogPath));
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
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    return {
        pass,
        availability,
        popupChecks,
        generatedChecks,
        report,
        popupLogText,
    };
}
async function runTestAgentAcceptanceKeyboardFlowSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
    if (!availability.available) {
        return {
            pass: false,
            availability,
            reason: availability.reason,
        };
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-acceptance-keyboard-flow-selftest-"));
    const artifactDir = path.join(dir, "artifacts");
    const port = await (0, self_test_1.getFreePort)();
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
    const keyboardChecks = (0, acceptance_keyboard_flows_1.buildAcceptanceKeyboardFlowBrowserChecks)(project, acceptanceCriteria);
    const generatedChecks = (0, auto_checks_1.buildBrowserChecksForProject)(project, acceptanceCriteria);
    const report = await (0, self_test_policy_1.runTestAgentForSelfTest)({
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
    const keyboardResults = report.browserResults.filter(result => result.probeType === acceptance_keyboard_flows_1.ACCEPTANCE_KEYBOARD_FLOW_PROBE_TYPE);
    const generatedKeyboardChecks = generatedChecks.filter(check => check.probeType === acceptance_keyboard_flows_1.ACCEPTANCE_KEYBOARD_FLOW_PROBE_TYPE);
    const generatedClickChecks = generatedChecks.filter(check => check.probeType === acceptance_click_flows_1.ACCEPTANCE_CLICK_FLOW_PROBE_TYPE);
    const targets = [
        { key: "Control+Alt+K", expected: englishText },
        { key: "Control+Alt+J", expected: chineseText },
    ];
    const checksCoverTargets = keyboardChecks.length === 2
        && targets.every(item => keyboardChecks.some(check => check.url === shortcutsUrl
            && check.context?.generatedBy === acceptance_keyboard_flows_1.ACCEPTANCE_KEYBOARD_FLOW_PROBE_TYPE
            && check.context?.key === item.key
            && check.context?.expectedText === item.expected
            && check.actions?.some(action => action.type === "press" && action.key === item.key)
            && check.assertions?.some(assertion => assertion.type === "visible" && assertion.text === item.expected)
            && check.assertions?.some(assertion => assertion.type === "inViewport" && assertion.text === item.expected)
            && check.assertions?.some(assertion => assertion.type === "urlIncludes" && assertion.text === "/shortcuts")));
    const resultsCoverTargets = keyboardResults.length === 2
        && targets.every(item => keyboardResults.some(result => result.status === "passed"
            && result.provider === "playwright"
            && result.url === shortcutsUrl
            && result.finalUrl === shortcutsUrl
            && result.context?.generatedBy === acceptance_keyboard_flows_1.ACCEPTANCE_KEYBOARD_FLOW_PROBE_TYPE
            && result.context?.key === item.key
            && result.context?.expectedText === item.expected
            && result.steps.some(step => step.name === "action:press" && step.status === "passed" && String(step.detail || "").includes(item.key))
            && result.steps.some(step => step.name === "assert:visible" && step.status === "passed" && String(step.detail || "").includes(item.expected))
            && result.steps.some(step => step.name === "assert:inViewport" && step.status === "passed" && String(step.detail || "").includes(item.expected))
            && result.pageTextPreview?.includes(item.expected)));
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
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    return {
        pass,
        availability,
        keyboardChecks,
        generatedChecks,
        report,
    };
}
async function runTestAgentAcceptanceHoverFlowSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
    if (!availability.available) {
        return {
            pass: false,
            availability,
            reason: availability.reason,
        };
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-acceptance-hover-flow-selftest-"));
    const artifactDir = path.join(dir, "artifacts");
    const port = await (0, self_test_1.getFreePort)();
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
    const hoverChecks = (0, acceptance_hover_flows_1.buildAcceptanceHoverFlowBrowserChecks)(project, acceptanceCriteria);
    const generatedChecks = (0, auto_checks_1.buildBrowserChecksForProject)(project, acceptanceCriteria);
    const report = await (0, self_test_policy_1.runTestAgentForSelfTest)({
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
    const hoverResults = report.browserResults.filter(result => result.probeType === acceptance_hover_flows_1.ACCEPTANCE_HOVER_FLOW_PROBE_TYPE);
    const generatedHoverChecks = generatedChecks.filter(check => check.probeType === acceptance_hover_flows_1.ACCEPTANCE_HOVER_FLOW_PROBE_TYPE);
    const targets = [
        { target: "Tools", expected: englishText },
        { target: "工具", expected: chineseText },
    ];
    const checksCoverTargets = hoverChecks.length === 2
        && targets.every(item => hoverChecks.some(check => check.url === menuUrl
            && check.context?.generatedBy === acceptance_hover_flows_1.ACCEPTANCE_HOVER_FLOW_PROBE_TYPE
            && check.context?.hoverTarget?.name === item.target
            && check.context?.expectedText === item.expected
            && check.actions?.some(action => action.type === "hover" && action.role === "button" && action.name === item.target)
            && check.assertions?.some(assertion => assertion.type === "visible" && assertion.text === item.expected)
            && check.assertions?.some(assertion => assertion.type === "inViewport" && assertion.text === item.expected)
            && check.assertions?.some(assertion => assertion.type === "urlIncludes" && assertion.text === "/menu")));
    const resultsCoverTargets = hoverResults.length === 2
        && targets.every(item => hoverResults.some(result => result.status === "passed"
            && result.provider === "playwright"
            && result.url === menuUrl
            && result.finalUrl === menuUrl
            && result.context?.generatedBy === acceptance_hover_flows_1.ACCEPTANCE_HOVER_FLOW_PROBE_TYPE
            && result.context?.hoverTarget?.name === item.target
            && result.context?.expectedText === item.expected
            && result.steps.some(step => step.name === "action:hover" && step.status === "passed" && String(step.detail || "").includes(item.target))
            && result.steps.some(step => step.name === "assert:visible" && step.status === "passed" && String(step.detail || "").includes(item.expected))
            && result.steps.some(step => step.name === "assert:inViewport" && step.status === "passed" && String(step.detail || "").includes(item.expected))
            && result.pageTextPreview?.includes(item.expected)));
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
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    return {
        pass,
        availability,
        hoverChecks,
        generatedChecks,
        report,
    };
}
async function runTestAgentAcceptanceScrollFlowSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
    if (!availability.available) {
        return {
            pass: false,
            availability,
            reason: availability.reason,
        };
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-acceptance-scroll-flow-selftest-"));
    const artifactDir = path.join(dir, "artifacts");
    const port = await (0, self_test_1.getFreePort)();
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
    const scrollChecks = (0, acceptance_scroll_flows_1.buildAcceptanceScrollFlowBrowserChecks)(project, acceptanceCriteria);
    const layoutOnlyScrollChecks = (0, acceptance_scroll_flows_1.buildAcceptanceScrollFlowBrowserChecks)(project, [
        'Mobile responsive page at /landing shows "Ready after scroll" with no horizontal scroll.',
        '移动端页面在 /landing 显示 "滚动后就绪"，没有横向滚动。',
    ]);
    const generatedChecks = (0, auto_checks_1.buildBrowserChecksForProject)(project, acceptanceCriteria);
    const report = await (0, self_test_policy_1.runTestAgentForSelfTest)({
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
    const scrollResults = report.browserResults.filter(result => result.probeType === acceptance_scroll_flows_1.ACCEPTANCE_SCROLL_FLOW_PROBE_TYPE);
    const generatedScrollChecks = generatedChecks.filter(check => check.probeType === acceptance_scroll_flows_1.ACCEPTANCE_SCROLL_FLOW_PROBE_TYPE);
    const textTargets = new Set([englishText, chineseText]);
    const checksCoverTargets = scrollChecks.length === 2
        && [...textTargets].every(text => scrollChecks.some(check => check.url === landingUrl
            && check.context?.generatedBy === acceptance_scroll_flows_1.ACCEPTANCE_SCROLL_FLOW_PROBE_TYPE
            && check.context?.expectedText === text
            && check.actions?.some(action => action.type === "scroll" && action.direction === "down" && action.amount === 1200)
            && check.assertions?.some(assertion => assertion.type === "text" && assertion.text === text)
            && check.assertions?.some(assertion => assertion.type === "inViewport" && assertion.text === text)
            && check.assertions?.some(assertion => assertion.type === "urlIncludes" && assertion.text === "/landing")));
    const resultsCoverTargets = scrollResults.length === 2
        && [...textTargets].every(text => scrollResults.some(result => result.status === "passed"
            && result.provider === "playwright"
            && result.url === landingUrl
            && result.finalUrl === landingUrl
            && result.context?.generatedBy === acceptance_scroll_flows_1.ACCEPTANCE_SCROLL_FLOW_PROBE_TYPE
            && result.context?.expectedText === text
            && result.steps.some(step => step.name === "action:scroll" && step.status === "passed" && String(step.detail || "").includes("down 1200px"))
            && result.steps.some(step => step.name === "assert:inViewport" && step.status === "passed" && String(step.detail || "").includes(text))
            && result.pageTextPreview?.includes(text)));
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
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    return {
        pass,
        availability,
        scrollChecks,
        layoutOnlyScrollChecks,
        generatedChecks,
        report,
    };
}
async function runTestAgentAcceptanceRepeatedClickSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
    if (!availability.available) {
        return {
            pass: false,
            availability,
            reason: availability.reason,
        };
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-acceptance-repeated-click-selftest-"));
    const artifactDir = path.join(dir, "artifacts");
    const port = await (0, self_test_1.getFreePort)();
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
    const repeatedChecks = (0, acceptance_repeated_click_checks_1.buildAcceptanceRepeatedClickBrowserChecks)(project, acceptanceCriteria);
    const generatedChecks = (0, auto_checks_1.buildBrowserChecksForProject)(project, acceptanceCriteria);
    const report = await (0, self_test_policy_1.runTestAgentForSelfTest)({
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
    const generatedRepeatedCheck = generatedChecks.find(check => check.probeType === acceptance_repeated_click_checks_1.ACCEPTANCE_REPEATED_CLICK_PROBE_TYPE);
    const generatedClickCheck = generatedChecks.find(check => check.probeType === acceptance_click_flows_1.ACCEPTANCE_CLICK_FLOW_PROBE_TYPE);
    const browser = report.browserResults.find(result => result.probeType === acceptance_repeated_click_checks_1.ACCEPTANCE_REPEATED_CLICK_PROBE_TYPE);
    const byCheck = new Map(report.requiredCheckCoverage.map(item => [item.check, item]));
    const clickSteps = browser?.steps.filter(step => step.name === "action:click" && step.status === "passed") || [];
    const pass = repeatedChecks.length === 1
        && repeatedCheck?.probeType === acceptance_repeated_click_checks_1.ACCEPTANCE_REPEATED_CLICK_PROBE_TYPE
        && repeatedCheck?.adversarial === true
        && repeatedCheck?.url === retryUrl
        && repeatedCheck?.context?.generatedBy === acceptance_repeated_click_checks_1.ACCEPTANCE_REPEATED_CLICK_PROBE_TYPE
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
        && browser?.context?.generatedBy === acceptance_repeated_click_checks_1.ACCEPTANCE_REPEATED_CLICK_PROBE_TYPE
        && browser?.pageTextPreview?.includes("Retry stable")
        && clickSteps.length === 3
        && browser?.steps.some(step => step.name === "assert:text" && step.status === "passed" && String(step.detail || "").includes("Retry stable"))
        && byCheck.get("browser_e2e")?.status === "verified"
        && byCheck.get("adversarial")?.status === "verified"
        && byCheck.get("screenshots")?.status === "verified"
        && report.acceptanceCoverage.every(item => item.status === "verified");
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    return {
        pass,
        availability,
        repeatedChecks,
        generatedChecks,
        report,
    };
}
async function runTestAgentAcceptanceChineseRepeatedClickSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
    if (!availability.available) {
        return {
            pass: false,
            availability,
            reason: availability.reason,
        };
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-acceptance-chinese-repeated-click-selftest-"));
    const artifactDir = path.join(dir, "artifacts");
    const port = await (0, self_test_1.getFreePort)();
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
    const repeatedChecks = (0, acceptance_repeated_click_checks_1.buildAcceptanceRepeatedClickBrowserChecks)(project, acceptanceCriteria);
    const generatedChecks = (0, auto_checks_1.buildBrowserChecksForProject)(project, acceptanceCriteria);
    const report = await (0, self_test_policy_1.runTestAgentForSelfTest)({
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
    const generatedRepeatedCheck = generatedChecks.find(check => check.probeType === acceptance_repeated_click_checks_1.ACCEPTANCE_REPEATED_CLICK_PROBE_TYPE);
    const generatedClickCheck = generatedChecks.find(check => check.probeType === acceptance_click_flows_1.ACCEPTANCE_CLICK_FLOW_PROBE_TYPE);
    const browser = report.browserResults.find(result => result.probeType === acceptance_repeated_click_checks_1.ACCEPTANCE_REPEATED_CLICK_PROBE_TYPE);
    const byCheck = new Map(report.requiredCheckCoverage.map(item => [item.check, item]));
    const clickSteps = browser?.steps.filter(step => step.name === "action:click" && step.status === "passed") || [];
    const pass = repeatedChecks.length === 1
        && repeatedCheck?.probeType === acceptance_repeated_click_checks_1.ACCEPTANCE_REPEATED_CLICK_PROBE_TYPE
        && repeatedCheck?.adversarial === true
        && repeatedCheck?.url === retryUrl
        && repeatedCheck?.context?.generatedBy === acceptance_repeated_click_checks_1.ACCEPTANCE_REPEATED_CLICK_PROBE_TYPE
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
        && browser?.context?.generatedBy === acceptance_repeated_click_checks_1.ACCEPTANCE_REPEATED_CLICK_PROBE_TYPE
        && browser?.pageTextPreview?.includes("重试稳定")
        && clickSteps.length === 3
        && browser?.steps.some(step => step.name === "assert:text" && step.status === "passed" && String(step.detail || "").includes("重试稳定"))
        && byCheck.get("browser_e2e")?.status === "verified"
        && byCheck.get("adversarial")?.status === "verified"
        && byCheck.get("screenshots")?.status === "verified"
        && report.acceptanceCoverage.every(item => item.status === "verified");
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    return {
        pass,
        availability,
        repeatedChecks,
        generatedChecks,
        report,
    };
}
async function runTestAgentBlankPageSmokeSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
    if (!availability.available) {
        return {
            pass: false,
            availability,
            reason: availability.reason,
        };
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-blank-page-smoke-selftest-"));
    const artifactDir = path.join(dir, "artifacts");
    const port = await (0, self_test_1.getFreePort)();
    const targetUrl = `http://127.0.0.1:${port}/blank-shell`;
    fs.writeFileSync(path.join(dir, "server.js"), [
        "const http = require('http');",
        "const html = '<!doctype html><title>Blank Shell</title><div id=\"app\"></div>';",
        "http.createServer((req, res) => { res.writeHead(200, {'content-type':'text/html'}); res.end(html); }).listen(process.env.PORT);",
    ].join("\n"), "utf-8");
    const report = await (0, self_test_policy_1.runTestAgentForSelfTest)({
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
    const markdownPath = String(report.metadata.artifactFiles?.reportMarkdownPath || "");
    const markdown = fs.existsSync(markdownPath) ? fs.readFileSync(markdownPath, "utf-8") : "";
    const byCheck = new Map(report.requiredCheckCoverage.map(item => [item.check, item]));
    const pass = report.status === "failed"
        && report.recommendation === "rework"
        && report.httpResults.some(item => item.name === "Page HTTP probe" && item.status === "passed")
        && browser?.provider === "playwright"
        && browser?.status === "failed"
        && browser?.name === "Auto browser smoke: blank-page-smoke-self-test"
        && browser?.probeType === auto_checks_1.AUTO_BROWSER_SMOKE_PROBE_TYPE
        && pageNotBlank?.status === "failed"
        && String(pageNotBlank?.error || "").includes("no visible text")
        && browser?.screenshots.some(item => fs.existsSync(item))
        && (browser?.pageSnapshots || []).some(item => fs.existsSync(item))
        && byCheck.get("http")?.status === "verified"
        && byCheck.get("browser_e2e")?.status === "not_verified"
        && byCheck.get("screenshots")?.status === "verified"
        && markdown.includes("assert:pageNotBlank")
        && markdown.includes("Expected page to have visible user-facing content");
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    return {
        pass,
        report,
        availability,
        pageNotBlank,
    };
}
async function runTestAgentAcceptancePathSmokeSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
    if (!availability.available) {
        return {
            pass: false,
            availability,
            reason: availability.reason,
        };
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-acceptance-path-smoke-selftest-"));
    const artifactDir = path.join(dir, "artifacts");
    const port = await (0, self_test_1.getFreePort)();
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
    const pathChecks = (0, auto_checks_1.buildAcceptancePathBrowserSmokeChecks)({
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
    const report = await (0, self_test_policy_1.runTestAgentForSelfTest)({
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
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    return {
        pass,
        report,
        availability,
        pathChecks,
    };
}
async function runTestAgentAcceptancePathGroupingSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
    if (!availability.available) {
        return {
            pass: false,
            availability,
            reason: availability.reason,
        };
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-acceptance-path-grouping-selftest-"));
    const artifactDir = path.join(dir, "artifacts");
    const port = await (0, self_test_1.getFreePort)();
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
    const pathChecks = (0, auto_checks_1.buildAcceptancePathBrowserSmokeChecks)({
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
    const report = await (0, self_test_policy_1.runTestAgentForSelfTest)({
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
    const hasAssertion = (check, type, value) => {
        return check?.assertions?.some(assertion => assertion.type === type && String(assertion.text || assertion.value || "").includes(value)) === true;
    };
    const browserHasStep = (browser, name, value) => {
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
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    return {
        pass,
        report,
        availability,
        pathChecks,
    };
}
//# sourceMappingURL=part-02.js.map