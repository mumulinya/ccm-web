"use strict";
// Behavior-freeze extraction from self-test-browser-assertions.ts (part-03.ts).
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
exports.runTestAgentBrowserEnabledStateSelfTest = runTestAgentBrowserEnabledStateSelfTest;
exports.runTestAgentBrowserFocusStateSelfTest = runTestAgentBrowserFocusStateSelfTest;
exports.runTestAgentBrowserPresenceAssertionSelfTest = runTestAgentBrowserPresenceAssertionSelfTest;
exports.runTestAgentBrowserElementCountSelfTest = runTestAgentBrowserElementCountSelfTest;
exports.runTestAgentBrowserDialogAssertionSelfTest = runTestAgentBrowserDialogAssertionSelfTest;
exports.runTestAgentBrowserPopupAssertionSelfTest = runTestAgentBrowserPopupAssertionSelfTest;
exports.runTestAgentBrowserTableAssertionSelfTest = runTestAgentBrowserTableAssertionSelfTest;
exports.runTestAgentBrowserDragToActionSelfTest = runTestAgentBrowserDragToActionSelfTest;
exports.runTestAgentBrowserHoverActionSelfTest = runTestAgentBrowserHoverActionSelfTest;
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const self_test_policy_1 = require("../self-test-policy");
const playwright_provider_1 = require("../browser/playwright-provider");
const tool_executor_1 = require("../browser/tool-executor");
const self_test_1 = require("../self-test");
async function runTestAgentBrowserEnabledStateSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
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
    const port = await (0, self_test_1.getFreePort)();
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
    const passReport = await (0, self_test_policy_1.runTestAgentForSelfTest)({
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
                            { assertion: "is_disabled", role: "button", name: "Create account", exact: true },
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
                            { assertion: "clickable", role: "button", name: "Create account", exact: true },
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
    const failReport = await (0, self_test_policy_1.runTestAgentForSelfTest)({
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
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    return {
        pass,
        availability,
        passReport,
        failReport,
    };
}
async function runTestAgentBrowserFocusStateSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
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
    const port = await (0, self_test_1.getFreePort)();
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
    const passReport = await (0, self_test_policy_1.runTestAgentForSelfTest)({
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
                            { assertion: "not_focused", label: "Email", exact: true },
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
                            { assertion: "has_focus", label: "Email", exact: true },
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
    const failReport = await (0, self_test_policy_1.runTestAgentForSelfTest)({
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
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    return {
        pass,
        availability,
        passReport,
        failReport,
    };
}
async function runTestAgentBrowserPresenceAssertionSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
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
    const port = await (0, self_test_1.getFreePort)();
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
    const passReport = await (0, self_test_policy_1.runTestAgentForSelfTest)({
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
                            { assertion: "element_exists", selector: "#archived" },
                            { assertion: "element_removed", selector: "#active" },
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
    const failReport = await (0, self_test_policy_1.runTestAgentForSelfTest)({
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
    const calls = [];
    const executor = (0, tool_executor_1.createStaticBrowserToolExecutor)({
        tools: [
            "mcp__playwright__browser_navigate",
            "mcp__playwright__browser_snapshot",
            "mcp__playwright__browser_console_messages",
            "mcp__playwright__browser_network_requests",
        ],
        onCall: (toolName, input) => {
            calls.push({ toolName, input });
            if (toolName.endsWith("browser_snapshot"))
                return "Presence checks\nExisting item";
            if (toolName.endsWith("browser_console_messages"))
                return [];
            if (toolName.endsWith("browser_network_requests"))
                return [];
            return { ok: true };
        },
    });
    const mcpReport = await (0, self_test_policy_1.runTestAgentForSelfTest)({
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
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    return {
        pass,
        availability,
        passReport,
        failReport,
        mcpReport,
    };
}
async function runTestAgentBrowserElementCountSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
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
    const port = await (0, self_test_1.getFreePort)();
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
    const passReport = await (0, self_test_policy_1.runTestAgentForSelfTest)({
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
                            { assertion: "element_count", role: "listitem", count: 0 },
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
                            { assertion: "count_at_least", role: "listitem", minCount: 2 },
                            { assertion: "count_at_most", role: "listitem", maxCount: 2 },
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
    const failReport = await (0, self_test_policy_1.runTestAgentForSelfTest)({
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
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    return {
        pass,
        availability,
        passReport,
        failReport,
    };
}
async function runTestAgentBrowserDialogAssertionSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
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
    const port = await (0, self_test_1.getFreePort)();
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
    const passReport = await (0, self_test_policy_1.runTestAgentForSelfTest)({
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
                            { assertion: "alert_message_includes", value: "Saved profile", dialog_type: "alert" },
                            { assertion: "dialog_type_equals", value: "confirm" },
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
    const failReport = await (0, self_test_policy_1.runTestAgentForSelfTest)({
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
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    return {
        pass,
        availability,
        passReport,
        failReport,
        dialogLog,
    };
}
async function runTestAgentBrowserPopupAssertionSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
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
    const port = await (0, self_test_1.getFreePort)();
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
    const passReport = await (0, self_test_policy_1.runTestAgentForSelfTest)({
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
                            { assertion: "popup_opened" },
                            { assertion: "popup_url_includes", url: "/help" },
                            { assertion: "popup_title_includes", title: "Help Center" },
                            { assertion: "popup_text_includes", text: "Support article for CCM TestAgent" },
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
    const failReport = await (0, self_test_policy_1.runTestAgentForSelfTest)({
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
    const manifestPath = String(passReport.metadata.artifactFiles?.manifestPath || "");
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
        && manifest?.files?.some((item) => item.type === "browser_popup_log" && item.path === passBrowser.popupLogPath)
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
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    return {
        pass,
        availability,
        passReport,
        failReport,
        popupLog,
        manifest,
    };
}
async function runTestAgentBrowserTableAssertionSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
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
    const port = await (0, self_test_1.getFreePort)();
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
    const passReport = await (0, self_test_policy_1.runTestAgentForSelfTest)({
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
                            { assertion: "table_row_includes", table_selector: "#orders", row_text: "A-100", values: ["Ada Lovelace", "Shipped"] },
                            { assertion: "table_cell_text_equals", table: "#orders", row: "B-200", header: "Status", value: "Paid" },
                            { assertion: "table_cell_includes", table: "#orders", row: "B-200", header: "Total", value: "18.50" },
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
    const failReport = await (0, self_test_policy_1.runTestAgentForSelfTest)({
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
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    return {
        pass,
        availability,
        passReport,
        failReport,
    };
}
async function runTestAgentBrowserDragToActionSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
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
    const port = await (0, self_test_1.getFreePort)();
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
    const passReport = await (0, self_test_policy_1.runTestAgentForSelfTest)({
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
                            { action: "drag_to", text: "Ship TestAgent drag support", destination_test_id: "done-column" },
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
    const failReport = await (0, self_test_policy_1.runTestAgentForSelfTest)({
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
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    return {
        pass,
        availability,
        passReport,
        failReport,
    };
}
async function runTestAgentBrowserHoverActionSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
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
    const port = await (0, self_test_1.getFreePort)();
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
    const passReport = await (0, self_test_policy_1.runTestAgentForSelfTest)({
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
    const failReport = await (0, self_test_policy_1.runTestAgentForSelfTest)({
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
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    return {
        pass,
        availability,
        passReport,
        failReport,
    };
}
//# sourceMappingURL=part-03.js.map