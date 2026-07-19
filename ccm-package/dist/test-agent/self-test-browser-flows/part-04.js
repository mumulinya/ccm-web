"use strict";
// Behavior-freeze extraction from self-test-browser-flows.ts (part-04.ts).
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
exports.runTestAgentAcceptanceChineseFormFlowSelfTest = runTestAgentAcceptanceChineseFormFlowSelfTest;
exports.runTestAgentAcceptanceMultiFieldFormFlowSelfTest = runTestAgentAcceptanceMultiFieldFormFlowSelfTest;
exports.runTestAgentAcceptanceSelectCheckboxFormFlowSelfTest = runTestAgentAcceptanceSelectCheckboxFormFlowSelfTest;
exports.runTestAgentAcceptanceUncheckRadioFormFlowSelfTest = runTestAgentAcceptanceUncheckRadioFormFlowSelfTest;
exports.runTestAgentAcceptanceRedirectFormFlowSelfTest = runTestAgentAcceptanceRedirectFormFlowSelfTest;
exports.runTestAgentAcceptanceInvalidFormAdversarialSelfTest = runTestAgentAcceptanceInvalidFormAdversarialSelfTest;
exports.runTestAgentAcceptanceRefreshPersistenceFormFlowSelfTest = runTestAgentAcceptanceRefreshPersistenceFormFlowSelfTest;
exports.runTestAgentPlaywrightUrlIncludesWaitSelfTest = runTestAgentPlaywrightUrlIncludesWaitSelfTest;
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const self_test_policy_1 = require("../self-test-policy");
const acceptance_form_flows_1 = require("../browser/acceptance-form-flows");
const auto_checks_1 = require("../browser/auto-checks");
const playwright_provider_1 = require("../browser/playwright-provider");
const self_test_1 = require("../self-test");
async function runTestAgentAcceptanceChineseFormFlowSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
    if (!availability.available) {
        return {
            pass: false,
            availability,
            reason: availability.reason,
        };
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-acceptance-chinese-form-flow-selftest-"));
    const artifactDir = path.join(dir, "artifacts");
    const port = await (0, self_test_1.getFreePort)();
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
    const flowChecks = (0, acceptance_form_flows_1.buildAcceptanceFormFlowBrowserChecks)(project, acceptanceCriteria);
    const report = await (0, self_test_policy_1.runTestAgentForSelfTest)({
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
        && flowCheck?.probeType === acceptance_form_flows_1.ACCEPTANCE_FORM_FLOW_PROBE_TYPE
        && flowCheck?.url === tasksUrl
        && flowCheck?.context?.generatedBy === acceptance_form_flows_1.ACCEPTANCE_FORM_FLOW_PROBE_TYPE
        && flowCheck?.context?.acceptanceCriteria?.[0] === acceptanceCriteria[0]
        && flowCheck?.actions?.some(action => action.type === "fill" && action.label === "任务" && action.value === "买牛奶")
        && flowCheck?.actions?.some(action => action.type === "click" && action.role === "button" && action.name === "添加任务")
        && flowCheck?.assertions?.some(assertion => assertion.type === "text" && assertion.text === "买牛奶")
        && report.status === "passed"
        && report.browserResults.length === 1
        && browser?.provider === "playwright"
        && browser?.status === "passed"
        && browser?.probeType === acceptance_form_flows_1.ACCEPTANCE_FORM_FLOW_PROBE_TYPE
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
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    return {
        pass,
        report,
        availability,
        flowChecks,
    };
}
async function runTestAgentAcceptanceMultiFieldFormFlowSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
    if (!availability.available) {
        return {
            pass: false,
            availability,
            reason: availability.reason,
        };
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-acceptance-multi-field-form-flow-selftest-"));
    const artifactDir = path.join(dir, "artifacts");
    const port = await (0, self_test_1.getFreePort)();
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
    const flowChecks = (0, acceptance_form_flows_1.buildAcceptanceFormFlowBrowserChecks)(project, acceptanceCriteria);
    const report = await (0, self_test_policy_1.runTestAgentForSelfTest)({
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
    const hasAction = (detail) => {
        return browserFillSteps.some(step => String(step.detail || "").includes(detail));
    };
    const pass = flowChecks.length === 1
        && flowCheck?.probeType === acceptance_form_flows_1.ACCEPTANCE_FORM_FLOW_PROBE_TYPE
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
        && browser?.probeType === acceptance_form_flows_1.ACCEPTANCE_FORM_FLOW_PROBE_TYPE
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
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    return {
        pass,
        report,
        availability,
        flowChecks,
    };
}
async function runTestAgentAcceptanceSelectCheckboxFormFlowSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
    if (!availability.available) {
        return {
            pass: false,
            availability,
            reason: availability.reason,
        };
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-acceptance-select-checkbox-form-flow-selftest-"));
    const artifactDir = path.join(dir, "artifacts");
    const port = await (0, self_test_1.getFreePort)();
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
    const flowChecks = (0, acceptance_form_flows_1.buildAcceptanceFormFlowBrowserChecks)(project, acceptanceCriteria);
    const report = await (0, self_test_policy_1.runTestAgentForSelfTest)({
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
        && flowCheck?.probeType === acceptance_form_flows_1.ACCEPTANCE_FORM_FLOW_PROBE_TYPE
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
        && browser?.probeType === acceptance_form_flows_1.ACCEPTANCE_FORM_FLOW_PROBE_TYPE
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
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    return {
        pass,
        report,
        availability,
        flowChecks,
    };
}
async function runTestAgentAcceptanceUncheckRadioFormFlowSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
    if (!availability.available) {
        return {
            pass: false,
            availability,
            reason: availability.reason,
        };
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-acceptance-uncheck-radio-form-flow-selftest-"));
    const artifactDir = path.join(dir, "artifacts");
    const port = await (0, self_test_1.getFreePort)();
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
    const flowChecks = (0, acceptance_form_flows_1.buildAcceptanceFormFlowBrowserChecks)(project, acceptanceCriteria);
    const report = await (0, self_test_policy_1.runTestAgentForSelfTest)({
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
        && flowCheck?.probeType === acceptance_form_flows_1.ACCEPTANCE_FORM_FLOW_PROBE_TYPE
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
        && browser?.probeType === acceptance_form_flows_1.ACCEPTANCE_FORM_FLOW_PROBE_TYPE
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
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    return {
        pass,
        report,
        availability,
        flowChecks,
    };
}
async function runTestAgentAcceptanceRedirectFormFlowSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
    if (!availability.available) {
        return {
            pass: false,
            availability,
            reason: availability.reason,
        };
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-acceptance-redirect-form-flow-selftest-"));
    const artifactDir = path.join(dir, "artifacts");
    const port = await (0, self_test_1.getFreePort)();
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
    const flowChecks = (0, acceptance_form_flows_1.buildAcceptanceFormFlowBrowserChecks)(project, acceptanceCriteria);
    const report = await (0, self_test_policy_1.runTestAgentForSelfTest)({
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
        && flowCheck?.probeType === acceptance_form_flows_1.ACCEPTANCE_FORM_FLOW_PROBE_TYPE
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
        && browser?.probeType === acceptance_form_flows_1.ACCEPTANCE_FORM_FLOW_PROBE_TYPE
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
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    return {
        pass,
        report,
        availability,
        flowChecks,
    };
}
async function runTestAgentAcceptanceInvalidFormAdversarialSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
    if (!availability.available) {
        return {
            pass: false,
            availability,
            reason: availability.reason,
        };
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-acceptance-invalid-form-adversarial-selftest-"));
    const artifactDir = path.join(dir, "artifacts");
    const port = await (0, self_test_1.getFreePort)();
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
    const flowChecks = (0, acceptance_form_flows_1.buildAcceptanceFormFlowBrowserChecks)(project, acceptanceCriteria);
    const generatedChecks = (0, auto_checks_1.buildBrowserChecksForProject)(project, acceptanceCriteria);
    const report = await (0, self_test_policy_1.runTestAgentForSelfTest)({
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
    const generatedFormCheck = generatedChecks.find(check => check.probeType === acceptance_form_flows_1.ACCEPTANCE_FORM_FLOW_PROBE_TYPE);
    const browser = report.browserResults.find(result => result.probeType === acceptance_form_flows_1.ACCEPTANCE_FORM_FLOW_PROBE_TYPE);
    const byCheck = new Map(report.requiredCheckCoverage.map(item => [item.check, item]));
    const pass = flowChecks.length === 1
        && flowCheck?.probeType === acceptance_form_flows_1.ACCEPTANCE_FORM_FLOW_PROBE_TYPE
        && flowCheck?.adversarial === true
        && flowCheck?.url === loginUrl
        && flowCheck?.context?.generatedBy === acceptance_form_flows_1.ACCEPTANCE_FORM_FLOW_PROBE_TYPE
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
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    return {
        pass,
        availability,
        flowChecks,
        generatedChecks,
        report,
    };
}
async function runTestAgentAcceptanceRefreshPersistenceFormFlowSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
    if (!availability.available) {
        return {
            pass: false,
            availability,
            reason: availability.reason,
        };
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-acceptance-refresh-persistence-form-flow-selftest-"));
    const artifactDir = path.join(dir, "artifacts");
    const port = await (0, self_test_1.getFreePort)();
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
    const flowChecks = (0, acceptance_form_flows_1.buildAcceptanceFormFlowBrowserChecks)(project, acceptanceCriteria);
    const report = await (0, self_test_policy_1.runTestAgentForSelfTest)({
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
        && flowCheck?.probeType === acceptance_form_flows_1.ACCEPTANCE_FORM_FLOW_PROBE_TYPE
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
        && browser?.probeType === acceptance_form_flows_1.ACCEPTANCE_FORM_FLOW_PROBE_TYPE
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
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    return {
        pass,
        report,
        availability,
        flowChecks,
    };
}
async function runTestAgentPlaywrightUrlIncludesWaitSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
    if (!availability.available) {
        return {
            pass: false,
            availability,
            reason: availability.reason,
        };
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-playwright-url-includes-wait-selftest-"));
    const artifactDir = path.join(dir, "artifacts");
    const port = await (0, self_test_1.getFreePort)();
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
    const report = await (0, self_test_policy_1.runTestAgentForSelfTest)({
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
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    return {
        pass,
        report,
        availability,
    };
}
//# sourceMappingURL=part-04.js.map