"use strict";
// Behavior-freeze extraction from self-test-core.ts (part-01.ts).
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
exports.runTestAgentSelfTest = runTestAgentSelfTest;
exports.runTestAgentMcpProviderSelfTest = runTestAgentMcpProviderSelfTest;
exports.runTestAgentClaudeChromeMcpSelfTest = runTestAgentClaudeChromeMcpSelfTest;
exports.runTestAgentComputerUseMcpSelfTest = runTestAgentComputerUseMcpSelfTest;
exports.runTestAgentWorkOrderNormalizationSelfTest = runTestAgentWorkOrderNormalizationSelfTest;
exports.runTestAgentSelfTestMatrixSelfTest = runTestAgentSelfTestMatrixSelfTest;
exports.runTestAgentHandoffBuilderSelfTest = runTestAgentHandoffBuilderSelfTest;
exports.runTestAgentHandoffContractSelfTest = runTestAgentHandoffContractSelfTest;
exports.runTestAgentArtifactSelfTest = runTestAgentArtifactSelfTest;
exports.runTestAgentVerdictSelfTest = runTestAgentVerdictSelfTest;
exports.runTestAgentFailureSummarySelfTest = runTestAgentFailureSummarySelfTest;
exports.runTestAgentBrowserProviderGapSummarySelfTest = runTestAgentBrowserProviderGapSummarySelfTest;
exports.runTestAgentBrowserSessionComparisonSelfTest = runTestAgentBrowserSessionComparisonSelfTest;
exports.runTestAgentBrowserFlowSummarySelfTest = runTestAgentBrowserFlowSummarySelfTest;
exports.runTestAgentBrowserMultiSessionSummarySelfTest = runTestAgentBrowserMultiSessionSummarySelfTest;
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const self_test_policy_1 = require("../self-test-policy");
const acceptance_click_flows_1 = require("../browser/acceptance-click-flows");
const acceptance_popup_flows_1 = require("../browser/acceptance-popup-flows");
const session_comparison_1 = require("../browser/session-comparison");
const tool_executor_1 = require("../browser/tool-executor");
const cli_1 = require("../cli");
const contract_1 = require("../contract");
const artifacts_1 = require("../artifacts");
const result_builder_1 = require("../result-builder");
const self_test_matrix_1 = require("../self-test-matrix");
const verdict_1 = require("../verdict");
const work_order_builder_1 = require("../work-order-builder");
const self_test_1 = require("../self-test");
async function runTestAgentSelfTest(options = {}) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-selftest-"));
    const port = await (0, self_test_1.getFreePort)();
    fs.writeFileSync(path.join(dir, "server.js"), [
        "const http = require('http');",
        "const html = '<!doctype html><title>TestAgent self-test</title><button id=\"ok\">Ready</button>';",
        "http.createServer((req, res) => { res.writeHead(200, {'content-type':'text/html'}); res.end(html); }).listen(process.env.PORT);",
    ].join("\n"), "utf-8");
    const report = await (0, self_test_policy_1.runTestAgentForSelfTest)({
        id: `self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent command and optional browser execution.",
        acceptanceCriteria: ["Command verification runs", ...(options.includeBrowser ? ["Browser can open the test page"] : [])],
        requiredChecks: options.includeBrowser ? ["commands", "browser_e2e", "screenshots", "console_errors"] : ["commands"],
        projects: [{
                name: "self-test",
                workDir: dir,
                verificationCommands: [`"${process.execPath}" -e "console.log('command ok')"`],
                runCommand: options.includeBrowser ? `"${process.execPath}" server.js` : "",
                targetUrl: options.includeBrowser ? `http://127.0.0.1:${port}` : "",
                env: { PORT: port },
                browserChecks: options.includeBrowser ? [{
                        name: "self-test page loads",
                        url: `http://127.0.0.1:${port}`,
                        assertions: [{ type: "text", text: "Ready" }, { type: "consoleNoErrors" }],
                        screenshot: true,
                    }] : [],
            }],
    });
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    return {
        pass: options.includeBrowser ? report.status === "passed" : report.commandResults.some(item => item.status === "passed"),
        report,
    };
}
async function runTestAgentMcpProviderSelfTest() {
    const calls = [];
    const executor = (0, tool_executor_1.createStaticBrowserToolExecutor)({
        tools: [
            "mcp__playwright__browser_navigate",
            "mcp__playwright__browser_snapshot",
            "mcp__playwright__browser_take_screenshot",
            "mcp__playwright__browser_console_messages",
            "mcp__playwright__browser_network_requests",
        ],
        onCall: (toolName, input) => {
            calls.push({ toolName, input });
            if (toolName.endsWith("browser_snapshot"))
                return "Ready\nMCP browser tools are invoked";
            if (toolName.endsWith("browser_console_messages"))
                return [];
            if (toolName.endsWith("browser_network_requests"))
                return "request GET http://example.test/\nrequest_details GET http://example.test/ headers={\"x-test-agent\":\"mcp-metadata\"} body={\"clientNonce\":\"client-nonce-mcp\"}\nresponse 200 document http://example.test/\nresponse_details 200 document http://example.test/ headers={\"content-type\":\"application/json\"} body={\"ok\":true,\"message\":\"MCP ready\"}";
            if (toolName.endsWith("browser_take_screenshot"))
                return { path: "fake-screenshot.png" };
            return { ok: true };
        },
    });
    const report = await (0, self_test_policy_1.runTestAgentForSelfTest)({
        id: `mcp-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent MCP browser provider path.",
        acceptanceCriteria: ["MCP browser tools are invoked", "Tool calls are recorded"],
        requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
        projects: [{
                name: "mcp-self-test",
                workDir: process.cwd(),
                browserChecks: [{
                        name: "MCP navigation",
                        url: "http://example.test/",
                        actions: [{ type: "goto", url: "http://example.test/" }],
                        assertions: [
                            { type: "text", text: "Ready" },
                            { type: "networkRequest", method: "GET", urlIncludes: "http://example.test/" },
                            { type: "networkRequest", method: "GET", urlIncludes: "http://example.test/", headerName: "x-test-agent", headerValueIncludes: "mcp-metadata", bodyIncludes: "client-nonce-mcp" },
                            { type: "networkRequest", method: "GET", urlIncludes: "http://example.test/", bodyJsonPath: "clientNonce", bodyJsonIncludes: "nonce-mcp" },
                            { type: "networkResponse", status: 200, resourceType: "document", urlIncludes: "http://example.test/" },
                            { type: "networkResponse", status: 200, resourceType: "document", urlIncludes: "http://example.test/", bodyJsonPath: "message", bodyJsonEquals: "MCP ready" },
                            { type: "networkRequestNot", method: "POST", urlIncludes: "/api/debug" },
                            { type: "networkResponseNotIncludes", text: "500 fetch http://example.test/api/debug" },
                            { type: "consoleNoErrors" },
                            { type: "networkNoErrors" },
                        ],
                        screenshot: true,
                    }],
            }],
        options: { browserProvider: "mcp" },
    }, { browserProvider: "mcp", browserToolExecutor: executor });
    return {
        pass: report.status === "passed"
            && report.browserToolCalls.length >= 2
            && calls.length >= 2
            && report.browserResults[0]?.steps.some(step => step.name === "playwright:networkRequest" && step.status === "passed")
            && report.browserResults[0]?.steps.some(step => step.name === "playwright:networkRequest" && step.status === "passed" && String(step.detail || "").includes("bodyIncludes=client-nonce-mcp"))
            && report.browserResults[0]?.steps.some(step => step.name === "playwright:networkRequest" && step.status === "passed" && String(step.detail || "").includes("bodyJsonPath=clientNonce"))
            && report.browserResults[0]?.steps.some(step => step.name === "playwright:networkResponse" && step.status === "passed")
            && report.browserResults[0]?.steps.some(step => step.name === "playwright:networkResponse" && step.status === "passed" && String(step.detail || "").includes("bodyJsonPath=message"))
            && report.browserResults[0]?.steps.some(step => step.name === "playwright:networkRequestNot" && step.status === "passed")
            && report.browserResults[0]?.steps.some(step => step.name === "playwright:networkResponseNotIncludes" && step.status === "passed"),
        report,
        calls,
    };
}
async function runTestAgentClaudeChromeMcpSelfTest() {
    const calls = [];
    const executor = (0, tool_executor_1.createStaticBrowserToolExecutor)({
        tools: [
            "mcp__claude-in-chrome__tabs_create_mcp",
            "mcp__claude-in-chrome__navigate",
            "mcp__claude-in-chrome__get_page_text",
            "mcp__claude-in-chrome__read_console_messages",
            "mcp__claude-in-chrome__read_network_requests",
            "mcp__claude-in-chrome__gif_creator",
        ],
        onCall: (toolName, input) => {
            calls.push({ toolName, input });
            if (toolName.endsWith("tabs_create_mcp"))
                return { tabId: 42 };
            if (toolName.endsWith("get_page_text"))
                return "Chrome Ready\nClaude in Chrome verifier";
            if (toolName.endsWith("read_console_messages"))
                return [];
            if (toolName.endsWith("read_network_requests"))
                return [];
            if (toolName.endsWith("gif_creator"))
                return { frame: "fake-frame.png" };
            return { ok: true };
        },
    });
    const report = await (0, self_test_policy_1.runTestAgentForSelfTest)({
        id: `chrome-mcp-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent Claude in Chrome MCP adapter path.",
        acceptanceCriteria: ["Claude in Chrome MCP tools are invoked", "tabId is propagated"],
        requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
        projects: [{
                name: "chrome-mcp-self-test",
                workDir: process.cwd(),
                browserChecks: [{
                        name: "Claude Chrome navigation",
                        url: "http://example.test/chrome",
                        context: {
                            source: "self_test",
                            acceptanceCriteria: ["Claude in Chrome MCP tools are invoked", "tabId is propagated"],
                        },
                        actions: [{ type: "goto", url: "http://example.test/chrome" }],
                        assertions: [{ type: "text", text: "Chrome Ready" }, { type: "urlIncludes", text: "/chrome" }, { type: "consoleNoErrors" }],
                        screenshot: true,
                    }],
            }],
        options: { browserProvider: "mcp" },
    }, { browserProvider: "mcp", browserToolExecutor: executor });
    const passedTabId = report.browserToolCalls.some(call => call.toolName.endsWith("navigate") && call.input.tabId === 42);
    return {
        pass: report.status === "passed" && passedTabId && calls.length >= 4,
        report,
        calls,
    };
}
async function runTestAgentComputerUseMcpSelfTest() {
    const calls = [];
    const executor = (0, tool_executor_1.createStaticBrowserToolExecutor)({
        tools: [
            "mcp__computer-use__request_access",
            "mcp__computer-use__left_click",
            "mcp__computer-use__type",
            "mcp__computer-use__key",
            "mcp__computer-use__scroll",
            "mcp__computer-use__wait",
            "mcp__computer-use__screenshot",
        ],
        onCall: (toolName, input) => {
            calls.push({ toolName, input });
            if (toolName.endsWith("screenshot"))
                return { image: "fake-computer-use-screenshot.png" };
            return { ok: true };
        },
    });
    const report = await (0, self_test_policy_1.runTestAgentForSelfTest)({
        id: `computer-use-mcp-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent Computer Use MCP adapter path.",
        acceptanceCriteria: ["Computer Use MCP tools are invoked", "desktop action tool calls are recorded"],
        requiredChecks: ["browser_e2e", "screenshots"],
        projects: [{
                name: "computer-use-mcp-self-test",
                workDir: process.cwd(),
                browserChecks: [{
                        name: "Computer Use desktop action chain",
                        url: "computer-use://active-session",
                        actions: [
                            { type: "requestAccess", apps: [{ displayName: "Browser", bundleId: "com.example.Browser" }] },
                            { type: "click", coordinate: [120, 180] },
                            { type: "fill", text: "hello from TestAgent" },
                            { type: "press", key: "enter" },
                            { type: "scroll", direction: "down", amount: 2, coordinate: [240, 320] },
                            { type: "waitForTimeout", value: "10" },
                        ],
                        screenshot: true,
                    }],
            }],
        options: { browserProvider: "mcp" },
    }, { browserProvider: "mcp", browserToolExecutor: executor });
    const usedComputerUse = report.browserToolCalls.every(call => call.toolName.startsWith("mcp__computer-use__"));
    const tookScreenshot = report.browserToolCalls.some(call => call.toolName.endsWith("screenshot"));
    return {
        pass: report.status === "passed" && usedComputerUse && tookScreenshot && calls.length >= 6,
        report,
        calls,
    };
}
function runTestAgentWorkOrderNormalizationSelfTest() {
    const normalized = (0, self_test_policy_1.normalizeTestAgentWorkOrderForSelfTest)({
        id: `work-order-normalization-self-test-${process.pid}-${Date.now()}`,
        original_user_goal: "Verify work order aliases normalize before execution.",
        acceptance_criteria: ["Browser aliases normalize"],
        required_checks: ["browser_e2e"],
        projects: [{
                name: "normalization-self-test",
                work_dir: process.cwd(),
                browser_checks: [{
                        title: "snake case browser check",
                        target_url: "http://example.test/",
                        repeat_runs: 3,
                        steps: [
                            { action: "request_access", apps: [{ display_name: "Browser", bundle_id: "com.example.Browser" }] },
                            { action: "open_application", bundle_id: "com.example.Browser" },
                            { action: "go_offline" },
                            { action: "set_online" },
                            { action: "press_key", key_text: "enter" },
                            { action: "wait_for_url", text: "example.test/dashboard" },
                            { action: "wait_for_timeout", value: "10" },
                        ],
                        expectations: [
                            { assertion: "url_includes", text: "example.test" },
                            { assertion: "browser_offline" },
                            { assertion: "online_state", value: "online" },
                            { assertion: "element_exists", selector: "#status" },
                            { assertion: "element_removed", selector: "#toast" },
                            { assertion: "accessible_name_equals", role: "button", name: "Save", value: "Save profile" },
                            { assertion: "accessible_description_includes", role: "button", name: "Save", value: "profile changes" },
                            { assertion: "aria_snapshot_includes", role: "button", name: "Save", text: "Save profile" },
                            { assertion: "aria_expanded", role: "button", name: "Menu" },
                            { assertion: "aria_pressed", role: "button", name: "Bold" },
                            { assertion: "aria_invalid", label: "Email" },
                            { assertion: "console_message_contains", text: "ready" },
                            { assertion: "console_not_contains", text: "deprecated" },
                            { assertion: "no_console_warning" },
                            { assertion: "console_no_errors" },
                        ],
                    }],
            }],
    });
    const invalid = (0, self_test_policy_1.normalizeTestAgentWorkOrderForSelfTest)({
        id: `work-order-invalid-self-test-${process.pid}-${Date.now()}`,
        projects: [{
                name: "invalid-normalization-self-test",
                workDir: process.cwd(),
                browserChecks: [
                    { actions: [{ type: "teleport" }] },
                    { name: "invalid stability runs", stabilityRuns: 11 },
                ],
            }],
    });
    const check = normalized.workOrder.projects[0].browserChecks[0];
    const actionTypes = check.actions.map(action => action.type);
    const assertionTypes = check.assertions.map(assertion => assertion.type);
    return {
        pass: normalized.issues.every(issue => issue.severity !== "error")
            && actionTypes.join(",") === "requestAccess,openApplication,setOffline,setOnline,press,waitForUrl,waitForTimeout"
            && assertionTypes.join(",") === "urlIncludes,browserOffline,onlineState,present,notPresent,accessibleNameEquals,accessibleDescriptionIncludes,ariaSnapshotIncludes,ariaExpanded,ariaPressed,ariaInvalid,consoleIncludes,consoleNotIncludes,consoleNoWarnings,consoleNoErrors"
            && check.stabilityRuns === 3
            && check.stability_runs === 3
            && invalid.issues.some(issue => issue.code === "invalid_browser_action_type")
            && invalid.issues.some(issue => issue.code === "invalid_browser_stability_runs"),
        normalized,
        invalid,
    };
}
async function runTestAgentSelfTestMatrixSelfTest() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-self-test-matrix-selftest-"));
    const modulePath = path.join(dir, "fake-self-test.js");
    fs.writeFileSync(modulePath, [
        "exports.runTestAgentFastSelfTest = async () => ({ pass: true, report: { status: 'passed' } });",
        "exports.runTestAgentFailSelfTest = () => ({ pass: false, reason: 'intentional failure', report: { status: 'failed' } });",
        "exports.runTestAgentSlowSelfTest = () => new Promise(() => {});",
        "exports.helper = () => true;",
    ].join("\n"), "utf-8");
    const discovered = (0, self_test_matrix_1.discoverTestAgentSelfTests)(modulePath);
    const report = await (0, self_test_matrix_1.runTestAgentSelfTestMatrix)({
        selfTestModulePath: modulePath,
        names: ["runTestAgentFastSelfTest", "runTestAgentFailSelfTest"],
        timeoutMs: 1000,
        cwd: dir,
        stopOnFailure: false,
    });
    const timeoutReport = await (0, self_test_matrix_1.runTestAgentSelfTestMatrix)({
        selfTestModulePath: modulePath,
        names: ["runTestAgentSlowSelfTest"],
        timeoutMs: 200,
        cwd: dir,
    });
    const summary = (0, self_test_matrix_1.formatTestAgentSelfTestMatrixSummary)(report);
    const pass = discovered.join(",") === "runTestAgentFailSelfTest,runTestAgentFastSelfTest,runTestAgentSlowSelfTest"
        && report.pass === false
        && report.total === 2
        && report.passed === 1
        && report.failed === 1
        && report.results[0].name === "runTestAgentFastSelfTest"
        && report.results[0].pass === true
        && report.results[1].name === "runTestAgentFailSelfTest"
        && report.results[1].pass === false
        && String(report.results[1].reason || "").includes("intentional failure")
        && timeoutReport.pass === false
        && timeoutReport.failed === 1
        && timeoutReport.results[0].timedOut === true
        && String(timeoutReport.results[0].reason || "").includes("timeout 200ms")
        && summary.includes("TestAgent self-test matrix: failed")
        && summary.includes("PASS runTestAgentFastSelfTest")
        && summary.includes("FAIL runTestAgentFailSelfTest");
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    return {
        pass,
        discovered,
        report,
        timeoutReport,
        summary,
    };
}
function runTestAgentHandoffBuilderSelfTest() {
    const built = (0, work_order_builder_1.buildTestAgentWorkOrderFromHandoff)({
        taskId: "handoff-task-42",
        groupId: "handoff-group",
        originalUserGoal: "Ship the task board feature and prove it works in a browser.",
        acceptanceCriteria: [
            'Task board shows "Ready" at /tasks.',
        ],
        completedTasks: [
            "Task creation flow implemented",
        ],
        completedByProjectAgents: ["frontend-agent", "api-agent"],
        projects: [{
                name: "handoff-web",
                workDir: process.cwd(),
                runCommand: "npm run dev -- --host 127.0.0.1",
                targetUrl: "http://127.0.0.1:5173/tasks",
                changedFiles: ["src/App.tsx", "src/api/tasks.ts"],
                verificationCommands: ["npm test"],
                httpChecks: [{
                        name: "Tasks page HTTP",
                        url: "http://127.0.0.1:5173/tasks",
                        assertions: [{ type: "status", status: 200 }],
                    }],
                browserChecks: [{
                        name: "Persisted task list",
                        coversAcceptanceCriteria: ["Task list persists after save"],
                    }],
                adversarialBrowserProbeTemplates: [{
                        kind: "repeated_click",
                        name: "Repeated add task click",
                        url: "http://127.0.0.1:5173/tasks",
                        target: { role: "button", name: "Add task" },
                        expectedText: "Ready",
                    }],
                completedTasks: ["Task list persists after save"],
                risks: ["Local storage behavior must be checked in browser."],
            }],
        options: {
            browserProvider: "playwright",
            collectBrowserArtifacts: true,
        },
    });
    const validation = (0, contract_1.validateTestAgentWorkOrderContract)(built.workOrder);
    const normalized = (0, self_test_policy_1.normalizeTestAgentWorkOrderForSelfTest)(built.workOrder);
    const required = new Set(built.workOrder.requiredChecks || []);
    const project = built.workOrder.projects?.[0];
    const metadata = built.workOrder.metadata || {};
    const minimalExample = (0, work_order_builder_1.buildTestAgentWorkOrderFromHandoff)(contract_1.TEST_AGENT_MINIMAL_HANDOFF_EXAMPLE);
    const webExample = (0, work_order_builder_1.buildTestAgentWorkOrderFromHandoff)(contract_1.TEST_AGENT_WEB_APP_HANDOFF_EXAMPLE);
    const minimalValidation = (0, contract_1.validateTestAgentWorkOrderContract)(minimalExample.workOrder);
    const webValidation = (0, contract_1.validateTestAgentWorkOrderContract)(webExample.workOrder);
    const webRequired = new Set(webExample.workOrder.requiredChecks || []);
    const webProject = webExample.workOrder.projects?.[0];
    const webMetadata = webExample.workOrder.metadata || {};
    return {
        pass: built.warnings.length === 0
            && validation.valid
            && normalized.issues.every(issue => issue.severity !== "error")
            && built.workOrder.schema === "ccm-test-agent-work-order-v1"
            && built.workOrder.issuedBy === "group-main-agent"
            && built.workOrder.acceptanceCriteria?.some(item => item.includes("Task creation flow implemented"))
            && built.workOrder.acceptanceCriteria?.some(item => item.includes("Task list persists after save"))
            && required.has("commands")
            && required.has("http")
            && required.has("browser_e2e")
            && required.has("screenshots")
            && required.has("console_errors")
            && required.has("browser_snapshots")
            && required.has("browser_accessibility_snapshot")
            && required.has("browser_console_logs")
            && required.has("browser_network_logs")
            && required.has("browser_trace")
            && required.has("browser_har")
            && required.has("adversarial")
            && project.agentSummary.includes("Task list persists after save")
            && project.browserChecks[0].coversAcceptanceCriteria[0] === "Completed task is independently verified: Task list persists after save"
            && project.changedFiles.length === 2
            && metadata.handoffSource === "test-agent-handoff-builder"
            && metadata.completedByProjectAgents.length === 2
            && minimalExample.warnings.length === 0
            && minimalValidation.valid
            && minimalExample.workOrder.projects?.[0]?.verificationCommands?.includes("npm test")
            && minimalExample.workOrder.metadata?.handoffSource === "group-main-agent-example"
            && webExample.warnings.length === 0
            && webValidation.valid
            && webExample.workOrder.acceptanceCriteria?.some(item => item.includes("Frontend login form"))
            && webExample.workOrder.acceptanceCriteria?.some(item => item.includes("Invalid auth response"))
            && webRequired.has("commands")
            && webRequired.has("http")
            && webRequired.has("browser_e2e")
            && webRequired.has("screenshots")
            && webRequired.has("browser_accessibility_snapshot")
            && webRequired.has("browser_trace")
            && webRequired.has("browser_har")
            && webRequired.has("adversarial")
            && webProject.changedFiles.length === 3
            && webProject.browserChecks.length === 1
            && webProject.adversarialBrowserProbeTemplates.length === 1
            && webMetadata.completedByProjectAgents.length === 2
            && webMetadata.handoffSource === "group-main-agent-example",
        built,
        validation,
        normalized,
        examples: {
            minimal: { built: minimalExample, validation: minimalValidation },
            webApp: { built: webExample, validation: webValidation },
        },
    };
}
function runTestAgentHandoffContractSelfTest() {
    const minimal = (0, contract_1.validateTestAgentHandoffContract)(contract_1.TEST_AGENT_MINIMAL_HANDOFF_EXAMPLE, { browserProvider: "none" });
    const web = (0, contract_1.validateTestAgentHandoffContract)(contract_1.TEST_AGENT_WEB_APP_HANDOFF_EXAMPLE);
    const singleProject = (0, contract_1.validateTestAgentHandoffContract)({
        taskId: "single-project-handoff-contract-self-test",
        originalUserGoal: "Verify a handoff can use a single project object.",
        completedTasks: ["Single project handoff shape is accepted."],
        project: {
            name: "single-project",
            workDir: process.cwd(),
            verificationCommands: [`"${process.execPath}" -e "console.log('single project handoff ok')"`],
        },
        options: {
            browserProvider: "none",
        },
    });
    const warning = (0, contract_1.validateTestAgentHandoffContract)({
        taskId: "warning-handoff-contract-self-test",
        originalUserGoal: "Verify handoff builder warnings are returned by contract validation.",
        completedTasks: ["Warning handoff includes executable evidence but omits workDir."],
        projects: [{
                name: "warning-project",
                verificationCommands: [`"${process.execPath}" -e "console.log('warning handoff ok')"`],
            }],
        options: {
            browserProvider: "none",
        },
    });
    const missingProjects = (0, contract_1.validateTestAgentHandoffContract)({
        originalUserGoal: "This handoff is missing project targets.",
        completedTasks: ["No project target supplied."],
    });
    const invalidProjectsType = (0, contract_1.validateTestAgentHandoffContract)({
        originalUserGoal: "This handoff has the wrong projects type.",
        projects: "not-an-array",
    });
    const invalidNestedHttp = (0, contract_1.validateTestAgentHandoffContract)({
        originalUserGoal: "This handoff has an invalid nested HTTP check.",
        acceptanceCriteria: ["Nested HTTP contract errors are surfaced."],
        projects: [{
                name: "invalid-http-project",
                workDir: process.cwd(),
                httpChecks: [{
                        name: "Missing URL",
                        assertions: [{ type: "status", status: 200 }],
                    }],
            }],
    });
    const missingProjectError = missingProjects.errors.find(issue => issue.path === "projects");
    const invalidProjectsTypeError = invalidProjectsType.errors.find(issue => issue.path === "projects");
    const invalidNestedHttpError = invalidNestedHttp.errors.find(issue => String(issue.path || "").includes("httpChecks"));
    return {
        pass: minimal.valid
            && minimal.workOrder?.schema === "ccm-test-agent-work-order-v1"
            && minimal.normalized?.options.browserProvider === "none"
            && minimal.builderWarnings.length === 0
            && web.valid
            && web.workOrder?.metadata?.handoffSource === "group-main-agent-example"
            && web.workOrder?.requiredChecks?.includes("browser_e2e")
            && web.workOrder?.requiredChecks?.includes("browser_trace")
            && web.builderWarnings.length === 0
            && singleProject.valid
            && singleProject.workOrder?.projects?.length === 1
            && singleProject.workOrder?.projects?.[0]?.name === "single-project"
            && singleProject.workOrder?.requiredChecks?.includes("commands")
            && warning.valid
            && warning.builderWarnings.some(item => item.includes("missing workDir"))
            && warning.warnings.some(item => item.code === "handoff_builder_warning" && item.message.includes("missing workDir"))
            && warning.normalized?.metadata?.handoffWarnings?.some((item) => item.includes("missing workDir"))
            && !missingProjects.valid
            && missingProjectError?.code === "contract_custom"
            && !invalidProjectsType.valid
            && invalidProjectsTypeError?.code === "contract_invalid_type"
            && !invalidNestedHttp.valid
            && invalidNestedHttpError?.code === "contract_custom",
        minimal,
        web,
        singleProject,
        warning,
        missingProjects,
        invalidProjectsType,
        invalidNestedHttp,
    };
}
async function runTestAgentArtifactSelfTest() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-artifacts-selftest-"));
    const artifactDir = path.join(dir, "artifacts");
    const report = await (0, self_test_policy_1.runTestAgentForSelfTest)({
        id: `artifact-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent writes report artifacts.",
        acceptanceCriteria: ["Report artifacts are written"],
        requiredChecks: ["commands"],
        projects: [{
                name: "artifact-self-test",
                workDir: dir,
                verificationCommands: [`"${process.execPath}" -e "console.log('Report artifacts are written')"`],
            }],
        options: { artifactDir },
    });
    const files = report.metadata.artifactFiles;
    const jsonPath = String(files?.reportJsonPath || "");
    const markdownPath = String(files?.reportMarkdownPath || "");
    const verdictPath = String(files?.verdictJsonPath || "");
    const jsonText = fs.existsSync(jsonPath) ? fs.readFileSync(jsonPath, "utf-8") : "";
    const markdownText = fs.existsSync(markdownPath) ? fs.readFileSync(markdownPath, "utf-8") : "";
    const verdict = fs.existsSync(verdictPath) ? JSON.parse(fs.readFileSync(verdictPath, "utf-8")) : null;
    const verdictValidation = (0, contract_1.validateTestAgentVerdictContract)(verdict);
    const pass = report.status === "passed"
        && jsonText.includes(report.id)
        && markdownText.includes("# TestAgent Report")
        && verdict?.schema === "ccm-test-agent-verdict-v1"
        && verdict?.reportId === report.id
        && verdict?.canAccept === true
        && verdict?.recommendation === "accept"
        && verdict?.requiredCheckSummary?.statusCounts?.verified === 1
        && verdict?.requiredCheckSummary?.statusCounts?.not_verified === 0
        && verdict?.requiredCheckSummary?.verified?.some((item) => item.check === "commands" && item.evidence?.some((evidence) => evidence.includes("exit=0")))
        && verdict?.artifacts?.verdictJsonPath === verdictPath
        && verdictValidation.valid
        && markdownText.includes("## Required Check Summary")
        && markdownText.includes("Status counts: verified:1, not_verified:0, unknown:0, total:1")
        && markdownText.includes("Verified commands:")
        && markdownText.includes("## Command Details")
        && markdownText.includes("**Output observed:**")
        && markdownText.includes("Report artifacts are written")
        && report.evidence.some(item => item.path === jsonPath)
        && report.evidence.some(item => item.path === markdownPath)
        && report.evidence.some(item => item.path === verdictPath);
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    return {
        pass,
        report,
        files: { jsonPath, markdownPath, verdictPath },
        verdict,
        verdictValidation,
    };
}
async function runTestAgentVerdictSelfTest() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-verdict-selftest-"));
    const artifactDir = path.join(dir, "artifacts");
    const report = await (0, self_test_policy_1.runTestAgentForSelfTest)({
        id: `verdict-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent verdict marks failing evidence as rework.",
        acceptanceCriteria: ["Failing command produces a rework verdict"],
        requiredChecks: ["commands"],
        projects: [{
                name: "verdict-self-test",
                workDir: dir,
                verificationCommands: [`"${process.execPath}" -e "console.error('verdict failure'); process.exit(7)"`],
            }],
        options: { artifactDir, browserProvider: "none" },
    });
    const verdictPath = String(report.metadata.artifactFiles?.verdictJsonPath || "");
    const manifestPath = String(report.metadata.artifactFiles?.manifestPath || "");
    const verdict = fs.existsSync(verdictPath) ? JSON.parse(fs.readFileSync(verdictPath, "utf-8")) : null;
    const validation = (0, contract_1.validateTestAgentVerdictContract)(verdict);
    const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, "utf-8")) : null;
    const manifestVerdict = (manifest?.files || []).find((item) => item.type === "verdict_json");
    const cliSummary = (0, cli_1.formatTestAgentCliReportSummary)(report);
    const markdown = (0, artifacts_1.buildTestAgentMarkdownReport)(report);
    const pass = report.status === "failed"
        && report.recommendation === "rework"
        && verdict?.schema === "ccm-test-agent-verdict-v1"
        && verdict?.status === "failed"
        && verdict?.canAccept === false
        && verdict?.needsRework === true
        && verdict?.needsHuman === false
        && verdict?.failedRequiredChecks?.some((item) => item.check === "commands")
        && verdict?.requiredCheckSummary?.total === 1
        && verdict?.requiredCheckSummary?.statusCounts?.not_verified === 1
        && verdict?.requiredCheckSummary?.notVerified?.some((item) => item.check === "commands")
        && cliSummary.includes("Required checks: verified:0, not_verified:1, unknown:0, total:1")
        && cliSummary.includes("- not_verified commands:")
        && markdown.includes("Attention not_verified commands:")
        && verdict?.risks?.some((item) => item.includes("command failed"))
        && verdict?.nextActions?.some((item) => item.includes("Route the task back for rework"))
        && verdict?.evidenceSummary?.commands?.failed === 1
        && verdict?.artifacts?.manifestPath === manifestPath
        && validation.valid
        && manifestVerdict?.integrity?.exists === true
        && typeof manifestVerdict?.integrity?.sha256 === "string";
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    return {
        pass,
        report,
        verdict,
        validation,
        manifest,
        cliSummary,
        markdown,
    };
}
function runTestAgentFailureSummarySelfTest() {
    const { workOrder, issues } = (0, self_test_policy_1.normalizeTestAgentWorkOrderForSelfTest)({
        id: `failure-summary-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent failure summaries identify rework points.",
        acceptanceCriteria: ["The dashboard browser check must pass."],
        requiredChecks: ["commands", "browser_e2e"],
        projects: [{
                name: "failure-summary-self-test",
                workDir: process.cwd(),
                verificationCommands: ["npm test"],
                targetUrl: "http://example.test/dashboard",
            }],
        options: { browserProvider: "none" },
    });
    const startedAt = new Date(Date.now() - 1000).toISOString();
    const now = new Date().toISOString();
    const commandResults = [{
            project: "failure-summary-self-test",
            command: "npm test",
            cwd: process.cwd(),
            status: "failed",
            exitCode: 1,
            startedAt,
            finishedAt: now,
            durationMs: 100,
            stdout: "",
            stderr: "expected dashboard to render",
            output: "expected dashboard to render",
        }];
    const browserResults = [{
            provider: "playwright",
            project: "failure-summary-self-test",
            name: "Dashboard smoke",
            url: "http://example.test/dashboard",
            finalUrl: "http://example.test/dashboard",
            title: "Dashboard",
            pageTextPreview: "Loading",
            status: "failed",
            startedAt,
            finishedAt: now,
            durationMs: 200,
            steps: [
                { kind: "action", name: "goto", status: "passed", detail: "http://example.test/dashboard" },
                { kind: "assertion", name: "assert:text", status: "failed", detail: "Ready", error: "Expected page text to include Ready." },
            ],
            screenshots: ["C:\\tmp\\dashboard-failure.png"],
            consoleErrors: [],
            pageErrors: [],
            networkErrors: [],
        }];
    const report = (0, result_builder_1.buildTestAgentReport)({
        workOrder,
        startedAt,
        issues,
        commandResults,
        devServerResults: [],
        httpResults: [],
        browserResults,
        browserToolCalls: [],
    });
    const markdown = (0, artifacts_1.buildTestAgentMarkdownReport)(report);
    const verdict = (0, verdict_1.buildTestAgentVerdict)(report);
    const reportValidation = (0, contract_1.validateTestAgentReportContract)(report);
    const verdictValidation = (0, contract_1.validateTestAgentVerdictContract)(verdict);
    const commandFailure = report.failureSummary.find(item => item.type === "command");
    const browserFailure = report.failureSummary.find(item => item.type === "browser");
    const requiredFailure = report.failureSummary.find(item => item.type === "required_check" && item.title === "commands");
    const acceptanceFailure = report.failureSummary.find(item => item.type === "acceptance" && item.title === "The dashboard browser check must pass.");
    const pass = report.status === "failed"
        && report.failureSummary.length >= 3
        && commandFailure?.reason.includes("expected dashboard")
        && commandFailure?.nextAction?.includes("rerun TestAgent")
        && commandFailure?.diagnostics?.some(item => item.includes("Rerun `npm test`"))
        && browserFailure?.reason.includes("assert:text")
        && browserFailure?.evidence?.some(item => item.includes("screenshot="))
        && browserFailure?.diagnostics?.some(item => item.includes("Open screenshot artifact"))
        && browserFailure?.diagnostics?.some(item => item.includes("pageTextPreview"))
        && requiredFailure?.status === "not_verified"
        && requiredFailure?.diagnostics?.some(item => item.includes("exact verification command"))
        && acceptanceFailure?.status === "not_verified"
        && acceptanceFailure?.reason.includes("evidence strength=token")
        && acceptanceFailure?.reason.includes("source=matched_evidence")
        && acceptanceFailure?.nextAction?.includes("Fix the matched failed evidence")
        && acceptanceFailure?.diagnostics?.some(item => item.includes("Acceptance evidence strength=token"))
        && acceptanceFailure?.diagnostics?.some(item => item.includes("Only token-level evidence matched"))
        && markdown.includes("## Failure Summary")
        && markdown.includes("diagnostics=")
        && markdown.includes("evidence strength=token")
        && markdown.includes("command failure-summary-self-test npm test")
        && markdown.includes("browser failure-summary-self-test Dashboard smoke")
        && verdict.failureSummary?.some(item => item.type === "browser" && item.reason.includes("Expected page text"))
        && verdict.failureSummary?.some(item => item.type === "browser" && item.diagnostics?.some((diagnostic) => diagnostic.includes("Open screenshot artifact")))
        && verdict.failureSummary?.some(item => item.type === "acceptance" && item.reason.includes("evidence strength=token"))
        && reportValidation.valid
        && verdictValidation.valid;
    return {
        pass,
        report,
        verdict,
        markdown,
        reportValidation,
        verdictValidation,
    };
}
function runTestAgentBrowserProviderGapSummarySelfTest() {
    const { workOrder, issues } = (0, self_test_policy_1.normalizeTestAgentWorkOrderForSelfTest)({
        id: `browser-provider-gap-summary-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify browser provider capability gaps are surfaced for handoff.",
        acceptanceCriteria: ["Unsupported MCP browser operations produce a provider gap summary."],
        requiredChecks: ["browser_e2e", "browser_upload", "browser_network"],
        projects: [{
                name: "provider-gap-self-test",
                workDir: process.cwd(),
                targetUrl: "http://example.test/app",
                browserChecks: [{
                        name: "Provider gap fixture",
                        url: "http://example.test/app",
                        actions: [{ type: "uploadFile", selector: "#file", filePath: "fixture.txt" }],
                        assertions: [{ type: "networkNoErrors" }],
                    }],
            }],
        options: { browserProvider: "mcp" },
    });
    const startedAt = new Date(Date.now() - 1000).toISOString();
    const now = new Date().toISOString();
    const browserResults = [{
            provider: "mcp",
            project: "provider-gap-self-test",
            name: "Provider gap fixture",
            url: "http://example.test/app",
            finalUrl: "http://example.test/app",
            title: "Provider Gap Fixture",
            pageTextPreview: "Upload form",
            status: "failed",
            startedAt,
            finishedAt: now,
            durationMs: 150,
            steps: [
                {
                    kind: "action",
                    name: "computer-use:uploadFile",
                    status: "failed",
                    error: "Computer Use MCP cannot verify local file uploads from TestAgent; use the Playwright provider for this action.",
                },
                {
                    kind: "assertion",
                    name: "computer-use:networkNoErrors",
                    status: "failed",
                    error: "Computer Use MCP does not expose console, network, offline/online emulation, accessibility/ARIA DOM state, or popup page telemetry.",
                },
            ],
            screenshots: [],
            consoleErrors: [],
            pageErrors: [],
            networkErrors: [],
        }];
    const report = (0, result_builder_1.buildTestAgentReport)({
        workOrder,
        startedAt,
        issues,
        commandResults: [],
        devServerResults: [],
        httpResults: [],
        browserResults,
        browserToolCalls: [],
    });
    const verdict = (0, verdict_1.buildTestAgentVerdict)(report);
    const reportValidation = (0, contract_1.validateTestAgentReportContract)(report);
    const verdictValidation = (0, contract_1.validateTestAgentVerdictContract)(verdict);
    const cliSummary = (0, cli_1.formatTestAgentCliReportSummary)(report);
    const markdown = (0, artifacts_1.buildTestAgentMarkdownReport)(report);
    const uploadGap = report.browserProviderGaps.find(item => item.category === "unsupported_action" && item.step === "computer-use:uploadFile");
    const networkGap = report.browserProviderGaps.find(item => item.category === "unsupported_assertion" && item.step === "computer-use:networkNoErrors");
    const pass = report.status === "failed"
        && report.browserProviderGaps.length === 2
        && uploadGap?.recommendation.includes("Playwright provider")
        && networkGap?.recommendation.includes("DOM, JavaScript, console, network")
        && verdict.browserProviderGaps?.length === 2
        && verdict.evidenceSummary.browserProviderGaps === 2
        && report.risks.some(item => item.includes("provider gap mcp computer-use:uploadFile"))
        && cliSummary.includes("Browser provider gaps: 2")
        && cliSummary.includes("computer-use:uploadFile")
        && markdown.includes("## Browser Provider Gaps")
        && markdown.includes("computer-use:networkNoErrors")
        && reportValidation.valid
        && verdictValidation.valid;
    return {
        pass,
        report,
        verdict,
        uploadGap,
        networkGap,
        cliSummary,
        markdown,
        reportValidation,
        verdictValidation,
    };
}
async function runTestAgentBrowserSessionComparisonSelfTest() {
    const runtime = (name, evaluate) => ({
        name,
        page: { evaluate: async (expression) => evaluate(expression) },
    });
    let leftAttempts = 0;
    const equals = await (0, session_comparison_1.runBrowserSessionComparison)({
        spec: {
            leftSession: "left",
            rightSession: "right",
            leftExpression: "state",
            rightExpression: "state",
            operator: "equals",
            timeoutMs: 250,
            pollMs: 10,
        },
        left: runtime("left", () => {
            leftAttempts += 1;
            return leftAttempts === 1 ? { state: "loading" } : { count: 2, state: "ready" };
        }),
        right: runtime("right", () => ({ state: "ready", count: 2 })),
        defaultTimeoutMs: 1000,
    });
    const notEquals = await (0, session_comparison_1.runBrowserSessionComparison)({
        spec: {
            leftSession: "left",
            rightSession: "right",
            leftExpression: "state",
            rightExpression: "state",
            operator: "notEquals",
            timeoutMs: 100,
            pollMs: 10,
        },
        left: runtime("left", () => ["alpha"]),
        right: runtime("right", () => ["beta"]),
        defaultTimeoutMs: 1000,
    });
    const includes = await (0, session_comparison_1.runBrowserSessionComparison)({
        spec: {
            leftSession: "left",
            rightSession: "right",
            leftExpression: "state",
            rightExpression: "state",
            operator: "includes",
            timeoutMs: 100,
            pollMs: 10,
        },
        left: runtime("left", () => "alpha beta gamma"),
        right: runtime("right", () => "beta"),
        defaultTimeoutMs: 1000,
    });
    const sensitiveMessage = "DO_NOT_STORE_THIS_DYNAMIC_PAGE_VALUE";
    const redacted = await (0, session_comparison_1.runBrowserSessionComparison)({
        spec: {
            leftSession: "left",
            rightSession: "right",
            leftExpression: "state",
            rightExpression: "state",
            operator: "equals",
            timeoutMs: 25,
            pollMs: 10,
        },
        left: runtime("left", () => {
            throw new Error(sensitiveMessage);
        }),
        right: runtime("right", () => "ready"),
        defaultTimeoutMs: 1000,
    });
    const hangingStarted = Date.now();
    const hanging = await (0, session_comparison_1.runBrowserSessionComparison)({
        spec: {
            leftSession: "left",
            rightSession: "right",
            leftExpression: "state",
            rightExpression: "state",
            operator: "equals",
            timeoutMs: 25,
            pollMs: 10,
        },
        left: runtime("left", () => new Promise(() => { })),
        right: runtime("right", () => new Promise(() => { })),
        defaultTimeoutMs: 1000,
    });
    const hangingElapsedMs = Date.now() - hangingStarted;
    const normalized = (0, self_test_policy_1.normalizeTestAgentWorkOrderForSelfTest)({
        id: `browser-session-comparison-self-test-${process.pid}-${Date.now()}`,
        projects: [{
                name: "browser-session-comparison-self-test",
                workDir: process.cwd(),
                browserChecks: [{
                        name: "comparison aliases normalize",
                        sessions: [{ name: "left" }, { name: "right" }],
                        session_steps: [{
                                comparison: {
                                    left: "left",
                                    right: "right",
                                    left_expression: "document.title",
                                    right_expression: "document.title",
                                    mode: "not_equal",
                                    timeout_ms: 250,
                                    interval_ms: 25,
                                },
                            }],
                    }],
            }],
    });
    const normalizedComparison = normalized.workOrder.projects[0]?.browserChecks[0]?.sessionSteps?.[0];
    const redactedJson = JSON.stringify(redacted);
    const hangingJson = JSON.stringify(hanging);
    const pass = equals.step.status === "passed"
        && equals.result.status === "passed"
        && equals.result.attempts === 2
        && equals.result.left?.sha256 === equals.result.right?.sha256
        && !Object.prototype.hasOwnProperty.call(equals.result.left || {}, "value")
        && notEquals.result.status === "passed"
        && notEquals.result.left?.sha256 !== notEquals.result.right?.sha256
        && includes.result.status === "passed"
        && redacted.result.status === "failed"
        && !redactedJson.includes(sensitiveMessage)
        && /messageSha256=[a-f0-9]{64}/.test(redacted.result.evaluationErrors?.left || "")
        && hanging.result.status === "failed"
        && hangingElapsedMs < 500
        && !hangingJson.includes("state")
        && normalized.issues.every(issue => issue.severity !== "error")
        && normalizedComparison?.compare?.operator === "notEquals"
        && normalizedComparison?.compare?.timeoutMs === 250
        && normalizedComparison?.compare?.pollMs === 25;
    return {
        pass,
        equals,
        notEquals,
        includes,
        redacted,
        hanging,
        hangingElapsedMs,
        normalized,
    };
}
function runTestAgentBrowserFlowSummarySelfTest() {
    const acceptanceCriteria = [
        "Click settings opens the panel",
        "Help popup opens with support content",
        "Billing popup opens with invoice content",
    ];
    const { workOrder, issues } = (0, self_test_policy_1.normalizeTestAgentWorkOrderForSelfTest)({
        id: `browser-flow-summary-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify browser acceptance flows are grouped for handoff evidence.",
        acceptanceCriteria,
        requiredChecks: ["browser_e2e"],
        projects: [{
                name: "browser-flow-summary-self-test",
                workDir: process.cwd(),
                targetUrl: "http://example.test/app",
            }],
        options: { browserProvider: "playwright" },
    });
    const startedAt = new Date(Date.now() - 1000).toISOString();
    const now = new Date().toISOString();
    const baseResult = {
        provider: "playwright",
        project: "browser-flow-summary-self-test",
        startedAt,
        finishedAt: now,
        durationMs: 100,
        screenshots: [],
        consoleErrors: [],
        pageErrors: [],
        networkErrors: [],
    };
    const browserResults = [
        {
            ...baseResult,
            name: "Settings click flow",
            url: "http://example.test/app/settings",
            finalUrl: "http://example.test/app/settings",
            status: "passed",
            probeType: acceptance_click_flows_1.ACCEPTANCE_CLICK_FLOW_PROBE_TYPE,
            context: {
                source: "acceptance_criteria",
                generatedBy: acceptance_click_flows_1.ACCEPTANCE_CLICK_FLOW_PROBE_TYPE,
                acceptanceCriteria: [acceptanceCriteria[0]],
            },
            steps: [
                { kind: "action", name: "action:click", status: "passed", detail: "role=button; name=Settings" },
                { kind: "assertion", name: "assert:text", status: "passed", detail: acceptanceCriteria[0] },
            ],
        },
        {
            ...baseResult,
            name: "Help popup flow",
            url: "http://example.test/app/help",
            finalUrl: "http://example.test/app/help",
            status: "failed",
            error: "Expected popup support content.",
            probeType: acceptance_popup_flows_1.ACCEPTANCE_POPUP_FLOW_PROBE_TYPE,
            context: {
                source: "acceptance_criteria",
                generatedBy: acceptance_popup_flows_1.ACCEPTANCE_POPUP_FLOW_PROBE_TYPE,
                acceptanceCriteria: [acceptanceCriteria[1]],
            },
            steps: [
                { kind: "action", name: "action:click", status: "passed", detail: "role=link; name=Help" },
                { kind: "assertion", name: "assert:popupTextIncludes", status: "failed", detail: "support content", error: "Popup text did not include support content." },
            ],
        },
        {
            ...baseResult,
            name: "Billing popup flow",
            url: "http://example.test/app/billing",
            status: "blocked",
            error: "Popup provider unavailable.",
            probeType: acceptance_popup_flows_1.ACCEPTANCE_POPUP_FLOW_PROBE_TYPE,
            context: {
                source: "acceptance_criteria",
                generatedBy: acceptance_popup_flows_1.ACCEPTANCE_POPUP_FLOW_PROBE_TYPE,
                acceptanceCriteria: [acceptanceCriteria[2]],
            },
            steps: [
                { kind: "action", name: "action:click", status: "failed", detail: "role=link; name=Billing", error: "Popup provider unavailable." },
            ],
        },
        {
            ...baseResult,
            name: "Explicit browser smoke",
            url: "http://example.test/app",
            finalUrl: "http://example.test/app",
            status: "passed",
            steps: [{ kind: "assertion", name: "assert:pageNotBlank", status: "passed" }],
        },
    ];
    const report = (0, result_builder_1.buildTestAgentReport)({
        workOrder,
        startedAt,
        issues,
        commandResults: [],
        devServerResults: [],
        httpResults: [],
        browserResults,
        browserToolCalls: [],
    });
    const verdict = (0, verdict_1.buildTestAgentVerdict)(report);
    const cliSummary = (0, cli_1.formatTestAgentCliReportSummary)(report);
    const markdown = (0, artifacts_1.buildTestAgentMarkdownReport)(report);
    const reportValidation = (0, contract_1.validateTestAgentReportContract)(report);
    const verdictValidation = (0, contract_1.validateTestAgentVerdictContract)(verdict);
    const summary = report.browserFlowSummary;
    const clickFlow = summary?.items.find(item => item.flowType === acceptance_click_flows_1.ACCEPTANCE_CLICK_FLOW_PROBE_TYPE);
    const popupFlow = summary?.items.find(item => item.flowType === acceptance_popup_flows_1.ACCEPTANCE_POPUP_FLOW_PROBE_TYPE);
    const pass = report.status === "failed"
        && summary?.total === 3
        && summary?.flowTypeCount === 2
        && summary?.criteriaCount === 3
        && summary?.statusCounts.passed === 1
        && summary?.statusCounts.failed === 1
        && summary?.statusCounts.blocked === 1
        && summary?.statusCounts.skipped === 0
        && summary?.actionCount === 3
        && summary?.assertionCount === 2
        && summary?.failedStepCount === 2
        && clickFlow?.total === 1
        && clickFlow?.statusCounts.passed === 1
        && clickFlow?.criteriaCount === 1
        && clickFlow?.failures.length === 0
        && popupFlow?.total === 2
        && popupFlow?.statusCounts.failed === 1
        && popupFlow?.statusCounts.blocked === 1
        && popupFlow?.criteriaCount === 2
        && popupFlow?.failures.length === 2
        && popupFlow?.failures.some(item => item.name === "Help popup flow" && item.failedSteps.some(step => step.includes("popupTextIncludes")))
        && popupFlow?.failures.some(item => item.name === "Billing popup flow" && item.error?.includes("provider unavailable"))
        && verdict.browserFlowSummary?.total === 3
        && verdict.evidenceSummary.browserAcceptanceFlows === 3
        && verdict.evidenceSummary.browserFailedAcceptanceFlows === 2
        && cliSummary.includes("Browser acceptance flows: passed:1, failed:1, blocked:1, skipped:0, total:3, types:2, criteria:3")
        && cliSummary.includes("Browser flow attention:")
        && cliSummary.includes(acceptance_popup_flows_1.ACCEPTANCE_POPUP_FLOW_PROBE_TYPE)
        && markdown.includes("## Browser Acceptance Flow Summary")
        && markdown.includes("firstFailure=browser-flow-summary-self-test/Help popup flow")
        && !markdown.includes("Explicit browser smoke; total=")
        && reportValidation.valid
        && verdictValidation.valid;
    return {
        pass,
        report,
        verdict,
        summary,
        cliSummary,
        markdown,
        reportValidation,
        verdictValidation,
    };
}
function runTestAgentBrowserMultiSessionSummarySelfTest() {
    const { workOrder, issues } = (0, self_test_policy_1.normalizeTestAgentWorkOrderForSelfTest)({
        id: `browser-multi-session-summary-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify multi-session browser results are summarized for project-agent handoff.",
        acceptanceCriteria: ["Cross-user browser scenarios expose role-specific completion evidence."],
        projects: [{
                name: "browser-multi-session-summary-self-test",
                workDir: process.cwd(),
                targetUrl: "http://example.test/",
            }],
    });
    const startedAt = new Date(Date.now() - 1000).toISOString();
    const now = new Date().toISOString();
    const browserResults = [
        {
            provider: "playwright",
            project: "browser-multi-session-summary-self-test",
            name: "Sender and receiver synchronize",
            url: "http://example.test/chat?user=sender",
            finalUrl: "http://example.test/chat?user=sender",
            status: "passed",
            startedAt,
            finishedAt: now,
            durationMs: 200,
            steps: [
                { kind: "action", name: "session:sender:action:click", status: "passed" },
                { kind: "assertion", name: "session:receiver:assert:visible", status: "passed" },
                { kind: "assertion", name: "session:sender:assert:sessionCompare", status: "passed", detail: "session=sender; compareSessions=sender,receiver; operator=equals; attempts=1; left=string(bytes=12,length=10,sha256=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa); right=string(bytes=12,length=10,sha256=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa)" },
            ],
            screenshots: ["sender.png", "receiver.png"],
            consoleErrors: [],
            pageErrors: [],
            networkErrors: [],
            browserSessions: [
                { name: "sender", url: "http://example.test/chat?user=sender", screenshots: ["sender.png"], consoleErrors: [], pageErrors: [], networkErrors: [] },
                { name: "receiver", url: "http://example.test/chat?user=receiver", screenshots: ["receiver.png"], consoleErrors: [], pageErrors: [], networkErrors: [] },
            ],
            browserSessionComparisons: [
                {
                    leftSession: "sender",
                    rightSession: "receiver",
                    operator: "equals",
                    status: "passed",
                    attempts: 1,
                    durationMs: 25,
                    timeoutMs: 5000,
                    pollMs: 100,
                    left: { type: "string", length: 10, serializedBytes: 12, sha256: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" },
                    right: { type: "string", length: 10, serializedBytes: 12, sha256: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" },
                },
            ],
            context: { multiSession: true, sessionCount: 2, sessionNames: ["sender", "receiver"], comparisonCount: 1 },
        },
        {
            provider: "playwright",
            project: "browser-multi-session-summary-self-test",
            name: "Author update reaches observer",
            url: "http://example.test/doc?user=author",
            finalUrl: "http://example.test/doc?user=author",
            status: "failed",
            startedAt,
            finishedAt: now,
            durationMs: 250,
            steps: [
                { kind: "action", name: "session:author:action:fill", status: "passed" },
                { kind: "assertion", name: "session:observer:assert:text", status: "failed", error: "Observer did not receive the update." },
                { kind: "assertion", name: "session:author:assert:sessionCompare", status: "failed", detail: "session=author; compareSessions=author,observer; operator=equals; attempts=5; left=string(bytes=15,length=13,sha256=bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb); right=string(bytes=4,length=2,sha256=cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc)", error: "Timed out after 5000ms waiting for author equals observer." },
            ],
            screenshots: ["author.png", "observer.png"],
            consoleErrors: ["[observer] websocket disconnected"],
            pageErrors: [],
            networkErrors: ["[observer] failed GET /events"],
            browserSessions: [
                { name: "author", url: "http://example.test/doc?user=author", screenshots: ["author.png"], consoleErrors: [], pageErrors: [], networkErrors: [] },
                {
                    name: "observer",
                    url: "http://example.test/doc?user=observer",
                    screenshots: ["observer.png"],
                    consoleErrors: ["websocket disconnected"],
                    pageErrors: [],
                    networkErrors: ["failed GET /events"],
                },
            ],
            browserSessionComparisons: [
                {
                    leftSession: "author",
                    rightSession: "observer",
                    operator: "equals",
                    status: "failed",
                    attempts: 5,
                    durationMs: 5000,
                    timeoutMs: 5000,
                    pollMs: 100,
                    left: { type: "string", length: 13, serializedBytes: 15, sha256: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" },
                    right: { type: "string", length: 2, serializedBytes: 4, sha256: "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc" },
                    error: "Timed out after 5000ms waiting for author equals observer.",
                },
            ],
            context: { multiSession: true, sessionCount: 2, sessionNames: ["author", "observer"], comparisonCount: 1 },
        },
        {
            provider: "playwright",
            project: "browser-multi-session-summary-self-test",
            name: "Ordinary single-page check",
            url: "http://example.test/",
            finalUrl: "http://example.test/",
            status: "passed",
            startedAt,
            finishedAt: now,
            durationMs: 50,
            steps: [{ kind: "assertion", name: "assert:pageNotBlank", status: "passed" }],
            screenshots: [],
            consoleErrors: [],
            pageErrors: [],
            networkErrors: [],
        },
    ];
    const report = (0, result_builder_1.buildTestAgentReport)({
        workOrder,
        startedAt,
        issues,
        commandResults: [],
        devServerResults: [],
        httpResults: [],
        browserResults,
        browserToolCalls: [],
    });
    const verdict = (0, verdict_1.buildTestAgentVerdict)(report);
    const cliSummary = (0, cli_1.formatTestAgentCliReportSummary)(report);
    const markdown = (0, artifacts_1.buildTestAgentMarkdownReport)(report);
    const reportValidation = (0, contract_1.validateTestAgentReportContract)(report);
    const verdictValidation = (0, contract_1.validateTestAgentVerdictContract)(verdict);
    const summary = report.browserMultiSessionSummary;
    const failedItem = summary?.items.find(item => item.name === "Author update reaches observer");
    const pass = report.status === "failed"
        && summary?.total === 2
        && summary?.statusCounts.passed === 1
        && summary?.statusCounts.failed === 1
        && summary?.sessionCount === 4
        && summary?.uniqueSessionCount === 4
        && summary?.comparisonCount === 2
        && summary?.failedComparisonCount === 1
        && summary?.actionCount === 2
        && summary?.assertionCount === 4
        && summary?.failedStepCount === 2
        && summary?.screenshotCount === 4
        && summary?.consoleErrorCount === 1
        && summary?.pageErrorCount === 0
        && summary?.networkErrorCount === 1
        && failedItem?.failedSessionNames.join(",") === "author,observer"
        && failedItem?.failedSteps[0]?.includes("Observer did not receive the update")
        && verdict.browserMultiSessionSummary?.total === 2
        && verdict.evidenceSummary.browserMultiSessionScenarios === 2
        && verdict.evidenceSummary.browserMultiSessionSessions === 4
        && verdict.evidenceSummary.browserMultiSessionComparisons === 2
        && verdict.evidenceSummary.browserFailedSessionComparisons === 1
        && verdict.evidenceSummary.browserFailedMultiSessionScenarios === 1
        && cliSummary.includes("Browser multi-session: scenarios=2; passed=1; failed=1; blocked=0; sessions=4")
        && cliSummary.includes("failedSessions=author,observer")
        && markdown.includes("## Browser Multi-Session Summary")
        && markdown.includes("failedSessions=author,observer")
        && !markdown.includes("Ordinary single-page check: passed; sessions=")
        && reportValidation.valid
        && verdictValidation.valid;
    return {
        pass,
        report,
        verdict,
        summary,
        cliSummary,
        markdown,
        reportValidation,
        verdictValidation,
    };
}
//# sourceMappingURL=part-01.js.map