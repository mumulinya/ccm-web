"use strict";
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
exports.runTestAgentBrowserStabilitySummarySelfTest = runTestAgentBrowserStabilitySummarySelfTest;
exports.runTestAgentAcceptanceSummarySelfTest = runTestAgentAcceptanceSummarySelfTest;
exports.runTestAgentArtifactManifestSelfTest = runTestAgentArtifactManifestSelfTest;
exports.runTestAgentArtifactVerifierSelfTest = runTestAgentArtifactVerifierSelfTest;
exports.runTestAgentMcpScreenshotArtifactSelfTest = runTestAgentMcpScreenshotArtifactSelfTest;
exports.runTestAgentMcpFailureScreenshotSelfTest = runTestAgentMcpFailureScreenshotSelfTest;
exports.runTestAgentBrowserEvidenceArtifactSelfTest = runTestAgentBrowserEvidenceArtifactSelfTest;
exports.runTestAgentCoverageSelfTest = runTestAgentCoverageSelfTest;
exports.runTestAgentCommandPlannerSelfTest = runTestAgentCommandPlannerSelfTest;
exports.runTestAgentExecutionPlanSelfTest = runTestAgentExecutionPlanSelfTest;
exports.runTestAgentHttpApiSelfTest = runTestAgentHttpApiSelfTest;
exports.runTestAgentAdversarialHttpSelfTest = runTestAgentAdversarialHttpSelfTest;
exports.runTestAgentAdversarialBrowserSelfTest = runTestAgentAdversarialBrowserSelfTest;
exports.runTestAgentBrowserProbeTemplateSelfTest = runTestAgentBrowserProbeTemplateSelfTest;
exports.runTestAgentAutoBrowserSmokeSelfTest = runTestAgentAutoBrowserSmokeSelfTest;
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const self_test_policy_1 = require("./self-test-policy");
const artifact_verifier_1 = require("./artifact-verifier");
const acceptance_click_flows_1 = require("./browser/acceptance-click-flows");
const acceptance_derived_checks_1 = require("./browser/acceptance-derived-checks");
const acceptance_popup_flows_1 = require("./browser/acceptance-popup-flows");
const session_comparison_1 = require("./browser/session-comparison");
const stability_summary_1 = require("./browser/stability-summary");
const auto_checks_1 = require("./browser/auto-checks");
const tool_executor_1 = require("./browser/tool-executor");
const cli_1 = require("./cli");
const contract_1 = require("./contract");
const coverage_1 = require("./coverage");
const acceptance_summary_1 = require("./acceptance-summary");
const execution_plan_1 = require("./execution-plan");
const artifacts_1 = require("./artifacts");
const result_builder_1 = require("./result-builder");
const self_test_matrix_1 = require("./self-test-matrix");
const verdict_1 = require("./verdict");
const work_order_builder_1 = require("./work-order-builder");
const self_test_1 = require("./self-test");
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
function runTestAgentBrowserStabilitySummarySelfTest() {
    const { workOrder, issues } = (0, self_test_policy_1.normalizeTestAgentWorkOrderForSelfTest)({
        id: `browser-stability-summary-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify repeated isolated browser checks are summarized and gate acceptance.",
        acceptanceCriteria: ["Repeated browser checks distinguish stable delivery from flaky delivery."],
        requiredChecks: ["browser_stability"],
        projects: [{
                name: "browser-stability-summary-self-test",
                workDir: process.cwd(),
                targetUrl: "http://example.test/chat",
            }],
    });
    const startedAt = new Date(Date.now() - 2000).toISOString();
    const finishedAt = new Date().toISOString();
    const fixtureResult = (input) => ({
        provider: "playwright",
        project: "browser-stability-summary-self-test",
        name: input.name,
        url: "http://example.test/chat",
        finalUrl: "http://example.test/chat",
        status: input.status,
        startedAt,
        finishedAt,
        durationMs: 100,
        steps: [{
                kind: "assertion",
                name: "assert:text",
                status: input.status === "passed" ? "passed" : input.status === "failed" ? "failed" : "skipped",
                ...(input.error ? { error: input.error } : {}),
            }],
        screenshots: [`${input.groupId}-${input.run}.png`],
        consoleErrors: [],
        pageErrors: [],
        networkErrors: [],
        context: {
            browserStability: true,
            stabilityGroupId: input.groupId,
            stabilityRun: input.run,
            stabilityRuns: input.runs ?? 3,
        },
        ...(input.error ? { error: input.error } : {}),
    });
    const browserResults = [
        fixtureResult({ groupId: "stable-group", name: "Chat delivery remains stable", run: 1, status: "passed" }),
        fixtureResult({ groupId: "stable-group", name: "Chat delivery remains stable", run: 2, status: "passed" }),
        fixtureResult({ groupId: "stable-group", name: "Chat delivery remains stable", run: 3, status: "passed" }),
        fixtureResult({ groupId: "flaky-group", name: "Presence update remains stable", run: 1, status: "passed" }),
        fixtureResult({ groupId: "flaky-group", name: "Presence update remains stable", run: 2, status: "failed", error: "transient presence mismatch" }),
        fixtureResult({ groupId: "flaky-group", name: "Presence update remains stable", run: 3, status: "passed" }),
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
    const summary = report.browserStabilitySummary;
    const cliSummary = (0, cli_1.formatTestAgentCliReportSummary)(report);
    const markdown = (0, artifacts_1.buildTestAgentMarkdownReport)(report);
    const reportValidation = (0, contract_1.validateTestAgentReportContract)(report);
    const verdictValidation = (0, contract_1.validateTestAgentVerdictContract)(verdict);
    const duplicateSummary = (0, stability_summary_1.buildBrowserStabilitySummary)([
        fixtureResult({ groupId: "duplicate-group", name: "Duplicate run metadata", run: 1, status: "passed" }),
        fixtureResult({ groupId: "duplicate-group", name: "Duplicate run metadata", run: 1, status: "passed" }),
        fixtureResult({ groupId: "duplicate-group", name: "Duplicate run metadata", run: 3, status: "passed" }),
    ]);
    const incompleteSummary = (0, stability_summary_1.buildBrowserStabilitySummary)([
        fixtureResult({ groupId: "incomplete-group", name: "Incomplete runs", run: 1, status: "passed" }),
        fixtureResult({ groupId: "incomplete-group", name: "Incomplete runs", run: 2, status: "passed" }),
    ]);
    const blockedSummary = (0, stability_summary_1.buildBrowserStabilitySummary)([
        fixtureResult({ groupId: "blocked-group", name: "Blocked run", run: 1, status: "passed" }),
        fixtureResult({ groupId: "blocked-group", name: "Blocked run", run: 2, status: "blocked", error: "browser infrastructure unavailable" }),
        fixtureResult({ groupId: "blocked-group", name: "Blocked run", run: 3, status: "passed" }),
    ]);
    const stableFailSummary = (0, stability_summary_1.buildBrowserStabilitySummary)([
        fixtureResult({ groupId: "stable-fail-group", name: "Consistently failing run", run: 1, status: "failed", error: "delivery missing" }),
        fixtureResult({ groupId: "stable-fail-group", name: "Consistently failing run", run: 2, status: "failed", error: "delivery missing" }),
        fixtureResult({ groupId: "stable-fail-group", name: "Consistently failing run", run: 3, status: "failed", error: "delivery missing" }),
    ]);
    const stabilityCoverage = report.requiredCheckCoverage.find(item => item.check === "browser_stability");
    const pass = report.status === "failed"
        && summary?.total === 2
        && summary?.statusCounts.stable_pass === 1
        && summary?.statusCounts.flaky === 1
        && summary?.statusCounts.stable_fail === 0
        && summary?.statusCounts.blocked === 0
        && summary?.expectedRunCount === 6
        && summary?.runCount === 6
        && summary?.passedRunCount === 5
        && summary?.failedRunCount === 1
        && summary?.items.find(item => item.groupId === "flaky-group")?.failedRuns.join(",") === "2"
        && summary?.items.find(item => item.groupId === "flaky-group")?.firstFailure === "run 2: transient presence mismatch"
        && duplicateSummary.items[0]?.status === "blocked"
        && incompleteSummary.items[0]?.status === "blocked"
        && blockedSummary.items[0]?.status === "blocked"
        && stableFailSummary.items[0]?.status === "stable_fail"
        && stabilityCoverage?.status === "not_verified"
        && verdict.browserStabilitySummary?.statusCounts.flaky === 1
        && verdict.evidenceSummary.browserStabilityGroups === 2
        && verdict.evidenceSummary.browserFlakyStabilityGroups === 1
        && verdict.evidenceSummary.browserStabilityRuns === 6
        && verdict.evidenceSummary.browserFailedStabilityRuns === 1
        && cliSummary.includes("Browser stability: groups=2; stable=1; flaky=1; failed=0; blocked=0; runs=6/6")
        && cliSummary.includes("Presence update remains stable: flaky")
        && markdown.includes("## Browser Stability Summary")
        && markdown.includes("Presence update remains stable")
        && markdown.includes("failedRuns=2")
        && report.risks.some(item => item.includes("browser stability flaky"))
        && reportValidation.valid
        && verdictValidation.valid;
    return {
        pass,
        report,
        verdict,
        summary,
        duplicateSummary,
        incompleteSummary,
        blockedSummary,
        stableFailSummary,
        cliSummary,
        markdown,
        reportValidation,
        verdictValidation,
    };
}
function runTestAgentAcceptanceSummarySelfTest() {
    const { workOrder, issues } = (0, self_test_policy_1.normalizeTestAgentWorkOrderForSelfTest)({
        id: `acceptance-summary-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify acceptance criteria are summarized for handoff.",
        acceptanceCriteria: [
            "Ready banner appears",
            "Payment succeeds",
            "Audit log is created",
        ],
        requiredChecks: ["browser_e2e"],
        projects: [{
                name: "acceptance-summary-self-test",
                workDir: process.cwd(),
                targetUrl: "http://example.test/app",
            }],
        options: { browserProvider: "playwright" },
    });
    const startedAt = new Date(Date.now() - 1000).toISOString();
    const now = new Date().toISOString();
    const browserResults = [
        {
            provider: "playwright",
            project: "acceptance-summary-self-test",
            name: "Ready banner appears",
            url: "http://example.test/app",
            finalUrl: "http://example.test/app",
            title: "Ready",
            pageTextPreview: "Ready banner appears",
            status: "passed",
            startedAt,
            finishedAt: now,
            durationMs: 100,
            steps: [{ kind: "assertion", name: "assert:text", status: "passed", detail: "Ready banner appears" }],
            screenshots: ["C:\\tmp\\ready-banner.png"],
            consoleErrors: [],
            pageErrors: [],
            networkErrors: [],
        },
        {
            provider: "playwright",
            project: "acceptance-summary-self-test",
            name: "Payment succeeds",
            url: "http://example.test/pay",
            finalUrl: "http://example.test/pay",
            title: "Payment",
            pageTextPreview: "Payment failed",
            status: "failed",
            startedAt,
            finishedAt: now,
            durationMs: 120,
            error: "Payment succeeds assertion failed.",
            steps: [{ kind: "assertion", name: "assert:text", status: "failed", detail: "Payment succeeds", error: "Expected page text to include Payment succeeds." }],
            screenshots: ["C:\\tmp\\payment-failure.png"],
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
    const reportValidation = (0, contract_1.validateTestAgentReportContract)(report);
    const verdictValidation = (0, contract_1.validateTestAgentVerdictContract)(verdict);
    const cliSummary = (0, cli_1.formatTestAgentCliReportSummary)(report);
    const markdown = (0, artifacts_1.buildTestAgentMarkdownReport)(report);
    const byCriterion = new Map(report.acceptanceCoverage.map(item => [item.criterion, item]));
    const { workOrder: fallbackWorkOrder } = (0, self_test_policy_1.normalizeTestAgentWorkOrderForSelfTest)({
        id: `acceptance-fallback-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify single acceptance fallback evidence is labeled.",
        acceptanceCriteria: ["Checkout flow completes"],
        requiredChecks: ["unit_tests"],
        projects: [{
                name: "acceptance-fallback-self-test",
                workDir: process.cwd(),
                verificationCommands: ["npm test"],
            }],
    });
    const fallbackCoverage = (0, coverage_1.buildAcceptanceCoverage)({
        workOrder: fallbackWorkOrder,
        status: "passed",
        issues: [],
        commandResults: [{
                project: "acceptance-fallback-self-test",
                command: "npm test",
                cwd: process.cwd(),
                status: "passed",
                exitCode: 0,
                startedAt,
                finishedAt: now,
                durationMs: 20,
                stdout: "all automated checks passed",
                stderr: "",
                output: "all automated checks passed",
            }],
        devServerResults: [],
        httpResults: [],
        browserResults: [],
        browserToolCalls: [],
        evidence: [],
    });
    const fallbackSummary = (0, acceptance_summary_1.buildAcceptanceSummary)(fallbackCoverage);
    const fallbackItem = fallbackCoverage[0];
    const readyCoverage = byCriterion.get("Ready banner appears");
    const paymentCoverage = byCriterion.get("Payment succeeds");
    const auditCoverage = byCriterion.get("Audit log is created");
    const pass = report.status === "failed"
        && readyCoverage?.status === "verified"
        && readyCoverage?.matchStrength === "direct"
        && readyCoverage?.matchScore === 100
        && readyCoverage?.evidenceSource === "matched_evidence"
        && paymentCoverage?.status === "not_verified"
        && paymentCoverage?.matchStrength === "direct"
        && paymentCoverage?.matchScore === 100
        && paymentCoverage?.evidenceSource === "matched_evidence"
        && auditCoverage?.status === "unknown"
        && auditCoverage?.matchStrength === "none"
        && auditCoverage?.matchScore === 0
        && auditCoverage?.evidenceSource === "none"
        && verdict.acceptanceSummary?.total === 3
        && verdict.acceptanceSummary?.statusCounts?.verified === 1
        && verdict.acceptanceSummary?.statusCounts?.not_verified === 1
        && verdict.acceptanceSummary?.statusCounts?.unknown === 1
        && verdict.acceptanceSummary?.matchStrengthCounts?.direct === 2
        && verdict.acceptanceSummary?.matchStrengthCounts?.none === 1
        && verdict.acceptanceSummary?.evidenceSourceCounts?.matched_evidence === 2
        && verdict.acceptanceSummary?.evidenceSourceCounts?.none === 1
        && verdict.acceptanceSummary?.verified?.some(item => item.criterion === "Ready banner appears" && item.matchStrength === "direct")
        && verdict.acceptanceSummary?.notVerified?.some(item => item.criterion === "Payment succeeds" && item.matchStrength === "direct" && item.evidence.some(evidence => evidence.includes("Payment succeeds assertion failed")))
        && verdict.acceptanceSummary?.unknown?.some(item => item.criterion === "Audit log is created" && item.matchStrength === "none")
        && fallbackItem?.status === "verified"
        && fallbackItem?.matchStrength === "fallback"
        && fallbackItem?.matchScore === 0
        && fallbackItem?.evidenceSource === "single_criterion_report_status"
        && fallbackSummary.matchStrengthCounts.fallback === 1
        && fallbackSummary.evidenceSourceCounts.single_criterion_report_status === 1
        && cliSummary.includes("Acceptance coverage: verified:1, not_verified:1, unknown:1, total:3")
        && cliSummary.includes("Acceptance attention:")
        && cliSummary.includes("Payment succeeds")
        && cliSummary.includes("Audit log is created")
        && markdown.includes("## Acceptance Summary")
        && markdown.includes("Match strength counts: direct:2")
        && markdown.includes("Evidence source counts: matched_evidence:2")
        && markdown.includes("Attention not_verified Payment succeeds")
        && markdown.includes("Attention unknown Audit log is created")
        && reportValidation.valid
        && verdictValidation.valid;
    return {
        pass,
        report,
        verdict,
        byCriterion: Object.fromEntries(byCriterion),
        fallbackCoverage,
        fallbackSummary,
        cliSummary,
        markdown,
        reportValidation,
        verdictValidation,
    };
}
async function runTestAgentArtifactManifestSelfTest() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-manifest-selftest-"));
    const artifactDir = path.join(dir, "artifacts");
    const executor = (0, tool_executor_1.createStaticBrowserToolExecutor)({
        tools: [
            "mcp__playwright__browser_navigate",
            "mcp__playwright__browser_snapshot",
            "mcp__playwright__browser_take_screenshot",
            "mcp__playwright__browser_console_messages",
            "mcp__playwright__browser_network_requests",
        ],
        onCall: (toolName) => {
            if (toolName.endsWith("browser_snapshot"))
                return "Manifest Ready";
            if (toolName.endsWith("browser_console_messages"))
                return [];
            if (toolName.endsWith("browser_network_requests"))
                return [];
            if (toolName.endsWith("browser_take_screenshot"))
                return { path: "manifest-screenshot.png" };
            return { ok: true };
        },
    });
    const report = await (0, self_test_policy_1.runTestAgentForSelfTest)({
        id: `artifact-manifest-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent writes an artifact manifest.",
        acceptanceCriteria: ["Artifact manifest lists reports, screenshots, and browser tool transcripts"],
        requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
        projects: [{
                name: "artifact-manifest-self-test",
                workDir: dir,
                browserChecks: [{
                        name: "Manifest browser check",
                        url: "http://example.test/manifest",
                        actions: [{ type: "goto", url: "http://example.test/manifest" }],
                        assertions: [{ type: "text", text: "Manifest Ready" }, { type: "consoleNoErrors" }],
                        screenshot: true,
                    }],
            }],
        options: { artifactDir, browserProvider: "mcp" },
    }, { browserProvider: "mcp", browserToolExecutor: executor });
    const files = report.metadata.artifactFiles;
    const manifestPath = String(files?.manifestPath || "");
    const transcriptPath = String(report.metadata.browserToolTranscriptPath || "");
    const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, "utf-8")) : null;
    const manifestFiles = manifest?.files || [];
    const manifestTypes = new Set(manifestFiles.map((item) => String(item.type)));
    const reportJsonEntry = manifestFiles.find((item) => item.type === "report_json");
    const verdictEntry = manifestFiles.find((item) => item.type === "verdict_json");
    const screenshotEntry = manifestFiles.find((item) => item.type === "screenshot");
    const manifestEntry = manifestFiles.find((item) => item.type === "artifact_manifest");
    const pass = report.status === "passed"
        && fs.existsSync(manifestPath)
        && fs.existsSync(transcriptPath)
        && manifest?.schema === "ccm-test-agent-artifact-manifest-v1"
        && manifestTypes.has("report_json")
        && manifestTypes.has("report_markdown")
        && manifestTypes.has("verdict_json")
        && manifestTypes.has("artifact_manifest")
        && manifestTypes.has("screenshot")
        && manifestTypes.has("browser_snapshot")
        && manifestTypes.has("browser_console_log")
        && manifestTypes.has("browser_network_log")
        && manifestTypes.has("browser_tool_transcript")
        && manifest.summary?.screenshots === 1
        && manifest.summary?.browserSnapshots === 1
        && manifest.summary?.browserConsoleLogs === 1
        && manifest.summary?.browserNetworkLogs === 1
        && manifest.summary?.browserToolTranscripts === 1
        && manifest.summary?.integrityMissing === 0
        && manifest.summary?.integrityVerified === manifestFiles.length
        && manifestFiles.every((item) => item.integrity?.exists === true)
        && typeof reportJsonEntry?.integrity?.sha256 === "string"
        && reportJsonEntry.integrity.sha256.length === 64
        && typeof verdictEntry?.integrity?.sha256 === "string"
        && verdictEntry.integrity.sha256.length === 64
        && typeof screenshotEntry?.integrity?.sha256 === "string"
        && screenshotEntry.integrity.sha256.length === 64
        && manifestEntry?.integrity?.exists === true
        && manifestEntry?.integrity?.error === "sha256 omitted for self-referential artifact.";
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    return {
        pass,
        report,
        manifest,
    };
}
async function runTestAgentArtifactVerifierSelfTest() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-artifact-verifier-selftest-"));
    const artifactDir = path.join(dir, "artifacts");
    const report = await (0, self_test_policy_1.runTestAgentForSelfTest)({
        id: `artifact-verifier-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent artifact manifest can be independently checked.",
        acceptanceCriteria: ["Artifact verifier detects intact and tampered files"],
        requiredChecks: ["commands"],
        projects: [{
                name: "artifact-verifier-self-test",
                workDir: dir,
                verificationCommands: [`"${process.execPath}" -e "console.log('Artifact verifier detects intact and tampered files')"`],
            }],
        options: { artifactDir, browserProvider: "none" },
    });
    const manifestPath = String(report.metadata.artifactFiles?.manifestPath || "");
    const markdownPath = String(report.metadata.artifactFiles?.reportMarkdownPath || "");
    const verdictPath = String(report.metadata.artifactFiles?.verdictJsonPath || "");
    const verification = (0, artifact_verifier_1.verifyTestAgentArtifactManifestFile)(manifestPath);
    const summary = (0, cli_1.formatTestAgentCliArtifactVerificationSummary)(verification);
    const cliStdout = [];
    const cliStderr = [];
    const cliResult = await (0, cli_1.runTestAgentCli)(["--verify-artifacts", manifestPath, "--summary"], {
        stdout: { write: message => cliStdout.push(String(message)) },
        stderr: { write: message => cliStderr.push(String(message)) },
    });
    const verdict = JSON.parse(fs.readFileSync(verdictPath, "utf-8"));
    verdict.reportId = `${verdict.reportId}-tampered`;
    verdict.canAccept = !verdict.canAccept;
    fs.writeFileSync(verdictPath, `${JSON.stringify(verdict, null, 2)}\n`, "utf-8");
    (0, self_test_1.refreshManifestItemIntegrity)(manifestPath, "verdict_json");
    const semanticTampered = (0, artifact_verifier_1.verifyTestAgentArtifactManifestFile)(manifestPath);
    const semanticSummary = (0, cli_1.formatTestAgentCliArtifactVerificationSummary)(semanticTampered);
    fs.appendFileSync(markdownPath, "\nTAMPERED\n", "utf-8");
    const tampered = (0, artifact_verifier_1.verifyTestAgentArtifactManifestFile)(manifestPath);
    const tamperedStdout = [];
    const tamperedResult = await (0, cli_1.runTestAgentCli)(["--verify-artifacts", manifestPath, "--summary"], {
        stdout: { write: message => tamperedStdout.push(String(message)) },
        stderr: { write: message => cliStderr.push(String(message)) },
    });
    const pass = report.status === "passed"
        && verification.status === "passed"
        && verification.summary.failed === 0
        && verification.summary.passed > 0
        && verification.summary.skipped >= 1
        && verification.items.some(item => item.type === "verdict_consistency" && item.status === "passed")
        && summary.includes("TestAgent artifact verification: passed")
        && cliResult.exitCode === 0
        && cliStdout.join("").includes("TestAgent artifact verification: passed")
        && cliStderr.length === 0
        && semanticTampered.status === "failed"
        && semanticTampered.items.some(item => item.type === "verdict_consistency" && item.status === "failed" && String(item.error || "").includes("verdict.reportId"))
        && semanticSummary.includes("TestAgent artifact verification: failed")
        && tampered.status === "failed"
        && tampered.items.some(item => item.path === markdownPath && item.error === "Size mismatch: expected " + item.expectedSizeBytes + ", got " + item.actualSizeBytes + ".")
        && tamperedResult.exitCode === 1
        && tamperedStdout.join("").includes("TestAgent artifact verification: failed");
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    return {
        pass,
        report,
        verification,
        semanticTampered,
        tampered,
    };
}
async function runTestAgentMcpScreenshotArtifactSelfTest() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-mcp-screenshot-selftest-"));
    const artifactDir = path.join(dir, "artifacts");
    const onePixelPng = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";
    const executor = (0, tool_executor_1.createStaticBrowserToolExecutor)({
        tools: [
            "mcp__playwright__browser_navigate",
            "mcp__playwright__browser_snapshot",
            "mcp__playwright__browser_take_screenshot",
            "mcp__playwright__browser_console_messages",
            "mcp__playwright__browser_network_requests",
        ],
        onCall: (toolName) => {
            if (toolName.endsWith("browser_snapshot"))
                return "Screenshot artifact ready";
            if (toolName.endsWith("browser_console_messages"))
                return [];
            if (toolName.endsWith("browser_network_requests"))
                return [];
            if (toolName.endsWith("browser_take_screenshot"))
                return { image: `data:image/png;base64,${onePixelPng}` };
            return { ok: true };
        },
    });
    const report = await (0, self_test_policy_1.runTestAgentForSelfTest)({
        id: `mcp-screenshot-artifact-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify MCP screenshot captures become local artifacts.",
        acceptanceCriteria: ["Screenshot artifact is written as a local image"],
        requiredChecks: ["browser_e2e", "screenshots"],
        projects: [{
                name: "mcp-screenshot-artifact-self-test",
                workDir: dir,
                browserChecks: [{
                        name: "MCP screenshot artifact",
                        url: "http://example.test/screenshot",
                        actions: [{ type: "goto", url: "http://example.test/screenshot" }],
                        assertions: [{ type: "text", text: "Screenshot artifact ready" }],
                        screenshot: true,
                    }],
            }],
        options: { artifactDir, browserProvider: "mcp" },
    }, { browserProvider: "mcp", browserToolExecutor: executor });
    const result = report.browserResults[0];
    const screenshotPath = String(result?.screenshots?.[0] || "");
    const originalScreenshotSize = fs.existsSync(screenshotPath) ? fs.statSync(screenshotPath).size : 0;
    const manifestPath = String(report.metadata.artifactFiles?.manifestPath || "");
    const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, "utf-8")) : null;
    const manifestScreenshot = (manifest?.files || []).find((item) => item.type === "screenshot");
    const verification = (0, artifact_verifier_1.verifyTestAgentArtifactManifestFile)(manifestPath);
    const screenshotMetadata = verification.items.find(item => item.type === "screenshot_png_metadata");
    const screenshotContent = verification.items.find(item => item.type === "screenshot_png_content");
    (0, self_test_1.writeSolidRgbaPng)(screenshotPath, 4, 4, [255, 255, 255, 255]);
    (0, self_test_1.refreshManifestItemIntegrity)(manifestPath, "screenshot");
    const blank = (0, artifact_verifier_1.verifyTestAgentArtifactManifestFile)(manifestPath);
    const blankScreenshotContent = blank.items.find(item => item.type === "screenshot_png_content");
    fs.writeFileSync(screenshotPath, "not a png screenshot\n", "utf-8");
    (0, self_test_1.refreshManifestItemIntegrity)(manifestPath, "screenshot");
    const tampered = (0, artifact_verifier_1.verifyTestAgentArtifactManifestFile)(manifestPath);
    const tamperedScreenshotMetadata = tampered.items.find(item => item.type === "screenshot_png_metadata");
    const pass = report.status === "passed"
        && screenshotPath.endsWith(".png")
        && fs.existsSync(screenshotPath)
        && originalScreenshotSize > 20
        && manifestScreenshot?.path === screenshotPath
        && report.evidence.some(item => item.path === screenshotPath)
        && report.requiredCheckCoverage.some(item => item.check === "screenshots" && item.status === "verified")
        && verification.status === "passed"
        && screenshotMetadata?.status === "passed"
        && screenshotMetadata?.imageWidth === 1
        && screenshotMetadata?.imageHeight === 1
        && screenshotContent?.status === "skipped"
        && String(screenshotContent?.error || "").includes("too small for blank-image detection")
        && blank.status === "failed"
        && blankScreenshotContent?.status === "failed"
        && blankScreenshotContent?.imageBlank === true
        && blankScreenshotContent?.imageUniqueColors === 1
        && blankScreenshotContent?.imageWidth === 4
        && blankScreenshotContent?.imageHeight === 4
        && tampered.status === "failed"
        && tamperedScreenshotMetadata?.status === "failed"
        && String(tamperedScreenshotMetadata?.error || "").includes("Invalid PNG signature");
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    return {
        pass,
        report,
        screenshotPath,
        manifest,
        verification,
        blank,
        tampered,
    };
}
async function runTestAgentMcpFailureScreenshotSelfTest() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-mcp-failure-screenshot-selftest-"));
    const artifactDir = path.join(dir, "artifacts");
    const onePixelPng = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";
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
                return "MCP failure page ready";
            if (toolName.endsWith("browser_console_messages"))
                return [];
            if (toolName.endsWith("browser_network_requests"))
                return [];
            if (toolName.endsWith("browser_take_screenshot"))
                return { image: `data:image/png;base64,${onePixelPng}` };
            return { ok: true };
        },
    });
    const report = await (0, self_test_policy_1.runTestAgentForSelfTest)({
        id: `mcp-failure-screenshot-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify MCP browser provider captures failure screenshots when normal screenshots are disabled.",
        acceptanceCriteria: ["A failing MCP browser assertion produces a local failure screenshot artifact."],
        requiredChecks: ["browser_e2e", "console_errors"],
        projects: [{
                name: "mcp-failure-screenshot-self-test",
                workDir: dir,
                browserChecks: [{
                        name: "MCP failure screenshot",
                        url: "http://example.test/mcp-failure",
                        actions: [{ type: "goto", url: "http://example.test/mcp-failure" }],
                        assertions: [{ type: "text", text: "Missing MCP text" }],
                        screenshot: false,
                    }],
            }],
        options: { artifactDir, browserProvider: "mcp" },
    }, { browserProvider: "mcp", browserToolExecutor: executor });
    const browser = report.browserResults[0];
    const screenshotPath = String(browser?.screenshots?.[0] || "");
    const manifestPath = String(report.metadata.artifactFiles?.manifestPath || "");
    const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, "utf-8")) : null;
    const verification = manifestPath ? (0, artifact_verifier_1.verifyTestAgentArtifactManifestFile)(manifestPath) : null;
    const screenshotEntry = (manifest?.files || []).find((item) => item.type === "screenshot" && String(item.path || "").includes("failure"));
    const screenshotMetadata = verification?.items.find(item => item.type === "screenshot_png_metadata" && String(item.path || "").includes("failure"));
    const byCheck = new Map(report.requiredCheckCoverage.map(item => [item.check, item]));
    const pass = report.status === "failed"
        && browser?.provider === "mcp"
        && browser?.status === "failed"
        && browser?.steps.some(step => step.name === "playwright:text" && step.status === "failed")
        && browser?.screenshots.length === 1
        && screenshotPath.endsWith(".png")
        && screenshotPath.includes("failure")
        && fs.existsSync(screenshotPath)
        && fs.statSync(screenshotPath).size > 20
        && calls.some(call => call.toolName.endsWith("browser_take_screenshot"))
        && calls.some(call => call.toolName.endsWith("browser_take_screenshot") && String(call.input?.filename || "").includes("failure"))
        && manifest?.summary?.screenshots === 1
        && screenshotEntry?.path === screenshotPath
        && verification?.status === "passed"
        && screenshotMetadata?.status === "passed"
        && byCheck.get("browser_e2e")?.status === "not_verified"
        && report.failureSummary.some(item => item.type === "browser" && item.evidence?.some(evidence => evidence.includes(screenshotPath)));
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    return {
        pass,
        report,
        manifest,
        verification,
        calls,
        screenshotPath,
    };
}
async function runTestAgentBrowserEvidenceArtifactSelfTest() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-browser-evidence-artifact-selftest-"));
    const artifactDir = path.join(dir, "artifacts");
    const providerDir = path.join(dir, "provider-artifacts");
    fs.mkdirSync(providerDir, { recursive: true });
    const harPath = path.join(providerDir, "session.har");
    const videoPath = path.join(providerDir, "session.webm");
    fs.writeFileSync(harPath, JSON.stringify({ log: { version: "1.2", entries: [] } }), "utf-8");
    fs.writeFileSync(videoPath, Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81, 0x01]));
    const traceZip = (0, self_test_1.buildStoredZip)([{ name: "trace.trace", data: '{"type":"context-options"}\n' }]);
    const traceBase64 = traceZip.toString("base64");
    const onePixelPng = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";
    const executor = (0, tool_executor_1.createStaticBrowserToolExecutor)({
        tools: [
            "mcp__playwright__browser_navigate",
            "mcp__playwright__browser_snapshot",
            "mcp__playwright__browser_take_screenshot",
            "mcp__playwright__browser_console_messages",
            "mcp__playwright__browser_network_requests",
        ],
        onCall: (toolName) => {
            if (toolName.endsWith("browser_snapshot"))
                return "Evidence artifacts ready";
            if (toolName.endsWith("browser_console_messages"))
                return [];
            if (toolName.endsWith("browser_network_requests"))
                return [];
            if (toolName.endsWith("browser_take_screenshot"))
                return {
                    image: `data:image/png;base64,${onePixelPng}`,
                    trace: `data:application/zip;base64,${traceBase64}`,
                    harPath,
                    videoPath,
                };
            return { ok: true };
        },
    });
    const report = await (0, self_test_policy_1.runTestAgentForSelfTest)({
        id: `browser-evidence-artifact-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent preserves rich browser evidence artifacts.",
        acceptanceCriteria: ["Browser evidence artifacts are listed, hashed, and verifiable"],
        requiredChecks: ["browser_e2e", "browser_trace", "browser_har", "browser_video", "browser_artifacts"],
        projects: [{
                name: "browser-evidence-artifact-self-test",
                workDir: dir,
                browserChecks: [{
                        name: "Browser evidence artifact bundle",
                        url: "http://example.test/evidence",
                        actions: [{ type: "goto", url: "http://example.test/evidence" }],
                        assertions: [{ type: "text", text: "Evidence artifacts ready" }],
                        screenshot: true,
                    }],
            }],
        options: { artifactDir, browserProvider: "mcp" },
    }, { browserProvider: "mcp", browserToolExecutor: executor });
    const result = report.browserResults[0];
    const artifacts = result?.browserArtifacts || [];
    const manifestPath = String(report.metadata.artifactFiles?.manifestPath || "");
    const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, "utf-8")) : null;
    const verification = manifestPath ? (0, artifact_verifier_1.verifyTestAgentArtifactManifestFile)(manifestPath) : null;
    const byCheck = new Map(report.requiredCheckCoverage.map(item => [item.check, item]));
    const manifestTypes = new Set((manifest?.files || []).map((item) => item.type));
    const traceMetadata = verification?.items.find(item => item.type === "browser_trace_zip");
    const harMetadata = verification?.items.find(item => item.type === "browser_har_metadata");
    const videoMetadata = verification?.items.find(item => item.type === "browser_video_container");
    const copiedTrace = artifacts.find(item => item.type === "trace")?.path || "";
    if (copiedTrace) {
        fs.writeFileSync(copiedTrace, (0, self_test_1.buildEmptyZip)());
        (0, self_test_1.refreshManifestItemIntegrity)(manifestPath, "browser_trace");
    }
    const emptyTrace = manifestPath ? (0, artifact_verifier_1.verifyTestAgentArtifactManifestFile)(manifestPath) : null;
    const emptyTraceMetadata = emptyTrace?.items.find(item => item.type === "browser_trace_zip");
    if (copiedTrace) {
        fs.writeFileSync(copiedTrace, (0, self_test_1.buildStoredZip)([{ name: "trace.trace", data: "" }]));
        (0, self_test_1.refreshManifestItemIntegrity)(manifestPath, "browser_trace");
    }
    const noEventTrace = manifestPath ? (0, artifact_verifier_1.verifyTestAgentArtifactManifestFile)(manifestPath) : null;
    const noEventTraceMetadata = noEventTrace?.items.find(item => item.type === "browser_trace_zip");
    if (copiedTrace) {
        fs.writeFileSync(copiedTrace, traceZip);
        (0, self_test_1.refreshManifestItemIntegrity)(manifestPath, "browser_trace");
    }
    const copiedHar = artifacts.find(item => item.type === "har")?.path || "";
    if (copiedHar) {
        fs.writeFileSync(copiedHar, JSON.stringify({ notLog: true }), "utf-8");
        (0, self_test_1.refreshManifestItemIntegrity)(manifestPath, "browser_har");
    }
    const tamperedHar = manifestPath ? (0, artifact_verifier_1.verifyTestAgentArtifactManifestFile)(manifestPath) : null;
    const tamperedHarMetadata = tamperedHar?.items.find(item => item.type === "browser_har_metadata");
    const pass = report.status === "passed"
        && artifacts.some(item => item.type === "trace" && item.path.endsWith(".zip") && fs.existsSync(item.path))
        && artifacts.some(item => item.type === "har" && item.path.endsWith(".har") && fs.existsSync(item.path))
        && artifacts.some(item => item.type === "video" && item.path.endsWith(".webm") && fs.existsSync(item.path))
        && byCheck.get("browser_trace")?.status === "verified"
        && byCheck.get("browser_har")?.status === "verified"
        && byCheck.get("browser_video")?.status === "verified"
        && byCheck.get("browser_artifacts")?.status === "verified"
        && manifestTypes.has("browser_trace")
        && manifestTypes.has("browser_har")
        && manifestTypes.has("browser_video")
        && manifest?.summary?.browserTraces === 1
        && manifest?.summary?.browserHars === 1
        && manifest?.summary?.browserVideos === 1
        && verification?.status === "passed"
        && traceMetadata?.status === "passed"
        && traceMetadata?.artifactFormat === "zip:trace"
        && traceMetadata?.artifactEntries === 1
        && traceMetadata?.artifactEvents === 1
        && harMetadata?.status === "passed"
        && harMetadata?.artifactFormat === "har:1.2"
        && harMetadata?.artifactEntries === 0
        && videoMetadata?.status === "passed"
        && videoMetadata?.artifactFormat === "webm"
        && emptyTrace?.status === "failed"
        && emptyTraceMetadata?.status === "failed"
        && String(emptyTraceMetadata?.error || "").includes("at least one entry")
        && noEventTrace?.status === "failed"
        && noEventTraceMetadata?.status === "failed"
        && String(noEventTraceMetadata?.error || "").includes("at least one JSON event")
        && tamperedHar?.status === "failed"
        && tamperedHarMetadata?.status === "failed"
        && String(tamperedHarMetadata?.error || "").includes("log object");
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    return {
        pass,
        report,
        manifest,
        verification,
        emptyTrace,
        noEventTrace,
        tamperedHar,
    };
}
function runTestAgentCoverageSelfTest() {
    const { workOrder } = (0, self_test_policy_1.normalizeTestAgentWorkOrderForSelfTest)({
        id: `coverage-self-test-${process.pid}-${Date.now()}`,
        acceptanceCriteria: [
            "Login page renders",
            "Settings save persists",
            "Checkout flow completes",
        ],
        projects: [{
                name: "coverage-self-test",
                workDir: process.cwd(),
                verificationCommands: ["npm test"],
            }],
    });
    const startedAt = new Date().toISOString();
    const baseCommand = {
        project: "coverage-self-test",
        command: "npm test",
        cwd: process.cwd(),
        startedAt,
        finishedAt: startedAt,
        durationMs: 1,
        stdout: "",
        stderr: "",
        output: "",
        exitCode: 0,
    };
    const coverage = (0, coverage_1.buildAcceptanceCoverage)({
        workOrder,
        status: "partial",
        issues: [],
        commandResults: [{
                ...baseCommand,
                status: "passed",
                stdout: "Login page renders",
                output: "Login page renders",
            }],
        devServerResults: [],
        httpResults: [],
        browserResults: [{
                provider: "playwright",
                project: "coverage-self-test",
                name: "Settings save persists",
                url: "http://example.test/settings",
                status: "failed",
                startedAt,
                finishedAt: startedAt,
                durationMs: 1,
                steps: [{ kind: "assertion", name: "assert:text", status: "failed", detail: "Settings save persists", error: "Expected saved toast." }],
                screenshots: [],
                consoleErrors: [],
                pageErrors: [],
                networkErrors: [],
            }],
        browserToolCalls: [],
        evidence: [],
    });
    const byCriterion = new Map(coverage.map(item => [item.criterion, item]));
    return {
        pass: byCriterion.get("Login page renders")?.status === "verified"
            && byCriterion.get("Settings save persists")?.status === "not_verified"
            && byCriterion.get("Checkout flow completes")?.status === "unknown",
        coverage,
    };
}
async function runTestAgentCommandPlannerSelfTest() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-command-planner-selftest-"));
    fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({
        private: true,
        scripts: {
            build: "node -e \"console.log('auto build ok')\"",
            "test:unit": "node -e \"console.log('auto unit ok')\"",
            typecheck: "node -e \"console.log('auto typecheck ok')\"",
            lint: "node -e \"console.log('auto lint ok')\"",
        },
    }, null, 2), "utf-8");
    const report = await (0, self_test_policy_1.runTestAgentForSelfTest)({
        id: `command-planner-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent auto-discovers package scripts for required checks.",
        acceptanceCriteria: ["Auto-discovered verification commands run"],
        requiredChecks: ["build", "unit_tests", "typecheck", "lint"],
        projects: [{
                name: "command-planner-self-test",
                workDir: dir,
            }],
    });
    const planned = report.metadata.autoDiscoveredVerificationCommands;
    const output = report.commandResults.map(item => item.output).join("\n");
    const pass = report.status === "passed"
        && Array.isArray(planned)
        && planned.length === 4
        && report.commandResults.length === 4
        && output.includes("auto build ok")
        && output.includes("auto unit ok")
        && output.includes("auto typecheck ok")
        && output.includes("auto lint ok")
        && !report.issues.some(issue => issue.code === "no_executable_checks");
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    return {
        pass,
        report,
        planned,
    };
}
async function runTestAgentExecutionPlanSelfTest() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-execution-plan-selftest-"));
    const artifactDir = path.join(dir, "artifacts");
    fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({
        private: true,
        scripts: {
            build: "node -e \"console.log('plan build ok')\"",
            test: "node -e \"console.log('plan test ok')\"",
            e2e: "node -e \"console.log('plan e2e ok')\"",
        },
    }, null, 2), "utf-8");
    const workOrder = (0, work_order_builder_1.buildTestAgentWorkOrderFromHandoff)({
        taskId: `execution-plan-self-test-${process.pid}-${Date.now()}`,
        groupId: "execution-plan-group",
        originalUserGoal: "Preview TestAgent checks before execution.",
        acceptanceCriteria: ["The web preview page renders Ready"],
        completedTasks: ["Project delivery is ready for dry-run planning."],
        requiredChecks: ["build", "unit_tests", "browser_e2e", "http"],
        projects: [{
                name: "execution-plan-web",
                workDir: dir,
                runCommand: "npm run dev",
                targetUrl: "http://127.0.0.1:5173/preview",
                httpChecks: [{
                        name: "Preview HTTP",
                        url: "http://127.0.0.1:5173/preview",
                        assertions: [{ type: "status", status: 200 }],
                    }],
            }],
        options: {
            artifactDir,
            browserProvider: "playwright",
            collectBrowserArtifacts: true,
        },
    }).workOrder;
    const validation = (0, contract_1.validateTestAgentWorkOrderContract)(workOrder);
    const plan = (0, execution_plan_1.buildTestAgentExecutionPlan)(workOrder, {}, validation);
    const summary = (0, cli_1.formatTestAgentCliExecutionPlanSummary)(plan);
    const providerWarningWorkOrder = (0, work_order_builder_1.buildTestAgentWorkOrderFromHandoff)({
        taskId: `execution-plan-provider-warning-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Preview browser provider limitations before execution.",
        acceptanceCriteria: ["The upload flow can upload and download a file."],
        requiredChecks: ["browser_e2e", "browser_upload", "browser_download"],
        projects: [{
                name: "execution-plan-provider-warning-web",
                workDir: dir,
                targetUrl: "http://127.0.0.1:5173/upload",
                browserChecks: [{
                        name: "Upload download MCP warning",
                        url: "http://127.0.0.1:5173/upload",
                        actions: [{ type: "uploadFile", selector: "#file", filePath: "fixture.txt" }],
                        assertions: [{ type: "downloadedFile", fileName: "fixture.txt" }],
                    }],
            }],
        options: {
            artifactDir,
            browserProvider: "mcp",
        },
    }).workOrder;
    const providerWarningValidation = (0, contract_1.validateTestAgentWorkOrderContract)(providerWarningWorkOrder);
    const providerWarningPlan = (0, execution_plan_1.buildTestAgentExecutionPlan)(providerWarningWorkOrder, {}, providerWarningValidation);
    const providerWarningSummary = (0, cli_1.formatTestAgentCliExecutionPlanSummary)(providerWarningPlan);
    const handoffPath = path.join(dir, "handoff.json");
    fs.writeFileSync(handoffPath, JSON.stringify({
        taskId: `execution-plan-cli-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Preview TestAgent CLI plan from handoff.",
        acceptanceCriteria: ["The handoff preview page renders Ready"],
        completedTasks: ["CLI handoff dry-run planning is available."],
        requiredChecks: ["build", "unit_tests", "browser_e2e", "http"],
        projects: [{
                name: "execution-plan-cli-web",
                workDir: dir,
                runCommand: "npm run dev",
                targetUrl: "http://127.0.0.1:5173/preview",
                httpChecks: [{
                        name: "CLI preview HTTP",
                        url: "http://127.0.0.1:5173/preview",
                        assertions: [{ type: "status", status: 200 }],
                    }],
            }],
        options: {
            artifactDir,
            browserProvider: "playwright",
            collectBrowserArtifacts: true,
        },
    }, null, 2), "utf-8");
    const cliStdout = [];
    const cliStderr = [];
    let runAgentCalled = false;
    const cliResult = await (0, cli_1.runTestAgentCli)([
        "--from-handoff",
        handoffPath,
        "--plan-only",
        "--summary",
        "--no-auto-discover",
    ], {
        stdout: { write: message => cliStdout.push(String(message)) },
        stderr: { write: message => cliStderr.push(String(message)) },
        runAgent: async () => {
            runAgentCalled = true;
            throw new Error("plan-only should not execute TestAgent");
        },
    });
    const cliSummary = cliStdout.join("");
    const commandNames = plan.projects[0].commands.map(item => item.command);
    const browserCheck = plan.projects[0].browserChecks[0];
    const pass = validation.valid
        && plan.valid
        && plan.schema === "ccm-test-agent-execution-plan-v1"
        && plan.summary.projects === 1
        && plan.summary.commands === 3
        && plan.summary.autoDiscoveredCommands === 3
        && commandNames.includes("npm run build")
        && commandNames.includes("npm run test")
        && commandNames.includes("npm run e2e")
        && plan.summary.devServers === 1
        && plan.projects[0].devServer.command === "npm run dev"
        && plan.summary.httpChecks === 1
        && plan.summary.browserChecks === 1
        && plan.summary.autoBrowserChecks === 1
        && plan.summary.browserProviderWarnings === 0
        && plan.browserProviderWarnings.length === 0
        && browserCheck?.autoGenerated === true
        && browserCheck?.screenshot === true
        && plan.summary.expectedArtifactTypes.includes("browser_accessibility_snapshot")
        && plan.summary.expectedArtifactTypes.includes("browser_trace")
        && plan.summary.expectedArtifactTypes.includes("browser_har")
        && plan.summary.expectedArtifactTypes.includes("screenshot")
        && summary.includes("TestAgent execution plan: valid")
        && summary.includes("Commands: 3")
        && summary.includes("Browser provider warnings: 0")
        && providerWarningValidation.valid
        && providerWarningPlan.valid
        && providerWarningPlan.browserProvider === "mcp"
        && providerWarningPlan.summary.browserProviderWarnings === 3
        && providerWarningPlan.browserProviderWarnings.some(item => item.kind === "artifact" && item.item === "trace/har")
        && providerWarningPlan.browserProviderWarnings.some(item => item.kind === "action" && item.item === "uploadFile" && item.category === "requires_playwright")
        && providerWarningPlan.browserProviderWarnings.some(item => item.kind === "assertion" && item.item === "downloadedFile" && item.recommendation.includes("Playwright"))
        && providerWarningSummary.includes("Browser provider warnings: 3")
        && providerWarningSummary.includes("trace/har")
        && providerWarningSummary.includes("uploadFile")
        && providerWarningSummary.includes("downloadedFile")
        && cliResult.exitCode === 0
        && !runAgentCalled
        && cliStderr.length === 0
        && cliSummary.includes("TestAgent execution plan: valid")
        && cliSummary.includes("Commands: 0")
        && cliSummary.includes("Browser checks: 1");
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    return {
        pass,
        validation,
        plan,
        summary,
        providerWarningPlan,
        providerWarningSummary,
        cliResult,
        cliSummary,
        runAgentCalled,
    };
}
async function runTestAgentHttpApiSelfTest() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-http-api-selftest-"));
    const port = await (0, self_test_1.getFreePort)();
    fs.writeFileSync(path.join(dir, "server.js"), [
        "const http = require('http');",
        "const readBody = req => new Promise(resolve => { let body = ''; req.on('data', c => body += c); req.on('end', () => resolve(body)); });",
        "http.createServer(async (req, res) => {",
        "  if (req.url === '/api/health') { res.writeHead(200, {'content-type':'application/json'}); res.end(JSON.stringify({ status: 'ok', service: { name: 'test-agent-api' } })); return; }",
        "  if (req.url === '/api/echo' && req.method === 'POST') { const body = await readBody(req); res.writeHead(201, {'content-type':'application/json'}); res.end(JSON.stringify({ received: JSON.parse(body || '{}') })); return; }",
        "  res.writeHead(404, {'content-type':'application/json'}); res.end(JSON.stringify({ error: 'not found' }));",
        "}).listen(process.env.PORT);",
    ].join("\n"), "utf-8");
    const baseUrl = `http://127.0.0.1:${port}`;
    const report = await (0, self_test_policy_1.runTestAgentForSelfTest)({
        id: `http-api-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent explicit HTTP/API checks.",
        acceptanceCriteria: ["Health endpoint returns ok", "Echo endpoint returns submitted JSON", "Missing endpoint returns 404"],
        requiredChecks: ["api"],
        projects: [{
                name: "http-api-self-test",
                workDir: dir,
                runCommand: `"${process.execPath}" server.js`,
                startupUrl: `${baseUrl}/api/health`,
                env: { PORT: port },
                httpChecks: [{
                        name: "Health endpoint",
                        url: `${baseUrl}/api/health`,
                        assertions: [
                            { type: "status", status: 200 },
                            { type: "jsonPathEquals", path: "status", value: "ok" },
                            { type: "jsonPathIncludes", path: "service.name", value: "agent" },
                        ],
                    }, {
                        name: "Echo endpoint",
                        method: "POST",
                        url: `${baseUrl}/api/echo`,
                        json: { name: "Ada" },
                        assertions: [
                            { type: "status", status: 201 },
                            { type: "jsonPathEquals", path: "received.name", value: "Ada" },
                        ],
                    }, {
                        name: "Missing endpoint",
                        url: `${baseUrl}/api/missing`,
                        assertions: [
                            { type: "status", status: 404 },
                            { type: "jsonPathEquals", path: "error", value: "not found" },
                        ],
                    }],
            }],
    });
    const apiResults = report.httpResults.filter(item => item.name && item.name !== "Page HTTP probe");
    const pass = report.status === "passed"
        && apiResults.length === 3
        && apiResults.every(item => item.status === "passed")
        && apiResults.some(item => item.method === "POST" && item.statusCode === 201)
        && apiResults.some(item => item.statusCode === 404 && item.status === "passed")
        && report.acceptanceCoverage.some(item => item.criterion.includes("Health") && item.status === "verified");
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    return {
        pass,
        report,
    };
}
async function runTestAgentAdversarialHttpSelfTest() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-adversarial-http-selftest-"));
    const port = await (0, self_test_1.getFreePort)();
    fs.writeFileSync(path.join(dir, "server.js"), [
        "const http = require('http');",
        "const readBody = req => new Promise(resolve => { let body = ''; req.on('data', c => body += c); req.on('end', () => resolve(body)); });",
        "http.createServer(async (req, res) => {",
        "  if (req.url === '/api/health') { res.writeHead(200, {'content-type':'application/json'}); res.end(JSON.stringify({ status: 'ok' })); return; }",
        "  if (req.url === '/api/items' && req.method === 'POST') { const body = JSON.parse(await readBody(req) || '{}'); if (!body.name) { res.writeHead(400, {'content-type':'application/json'}); res.end(JSON.stringify({ error: 'name is required' })); return; } res.writeHead(201, {'content-type':'application/json'}); res.end(JSON.stringify({ id: 'item-1', name: body.name })); return; }",
        "  if (req.url.startsWith('/api/items/')) { res.writeHead(404, {'content-type':'application/json'}); res.end(JSON.stringify({ error: 'item not found' })); return; }",
        "  res.writeHead(404, {'content-type':'application/json'}); res.end(JSON.stringify({ error: 'not found' }));",
        "}).listen(process.env.PORT);",
    ].join("\n"), "utf-8");
    const baseUrl = `http://127.0.0.1:${port}`;
    const report = await (0, self_test_policy_1.runTestAgentForSelfTest)({
        id: `adversarial-http-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent records adversarial HTTP probes.",
        acceptanceCriteria: ["Invalid item create is rejected", "Orphan item lookup returns 404"],
        requiredChecks: ["api", "adversarial"],
        projects: [{
                name: "adversarial-http-self-test",
                workDir: dir,
                runCommand: `"${process.execPath}" server.js`,
                startupUrl: `${baseUrl}/api/health`,
                env: { PORT: port },
                adversarialHttpChecks: [{
                        name: "Invalid item create",
                        probeType: "boundary",
                        method: "POST",
                        url: `${baseUrl}/api/items`,
                        json: {},
                        assertions: [
                            { type: "status", status: 400 },
                            { type: "jsonPathIncludes", path: "error", value: "name" },
                        ],
                    }, {
                        name: "Orphan item lookup",
                        probeType: "orphan",
                        url: `${baseUrl}/api/items/does-not-exist`,
                        assertions: [
                            { type: "status", status: 404 },
                            { type: "jsonPathIncludes", path: "error", value: "not found" },
                        ],
                    }],
            }],
    });
    const probes = report.httpResults.filter(item => item.adversarial);
    const pass = report.status === "passed"
        && probes.length === 2
        && probes.every(item => item.status === "passed")
        && probes.some(item => item.probeType === "boundary" && item.statusCode === 400)
        && probes.some(item => item.probeType === "orphan" && item.statusCode === 404)
        && report.evidence.some(item => item.title.includes("Adversarial"))
        && report.acceptanceCoverage.every(item => item.status === "verified");
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    return {
        pass,
        report,
    };
}
async function runTestAgentAdversarialBrowserSelfTest() {
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
                return "Login\nInvalid password\nPlease try again";
            if (toolName.endsWith("browser_console_messages"))
                return [];
            if (toolName.endsWith("browser_network_requests"))
                return [];
            if (toolName.endsWith("browser_take_screenshot"))
                return { path: "adversarial-browser.png" };
            return { ok: true };
        },
    });
    const report = await (0, self_test_policy_1.runTestAgentForSelfTest)({
        id: `adversarial-browser-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent records adversarial browser probes.",
        acceptanceCriteria: ["Invalid login stays on login page"],
        requiredChecks: ["browser_e2e", "adversarial", "screenshots", "browser_snapshots", "browser_console_logs", "browser_network_logs", "console_errors"],
        projects: [{
                name: "adversarial-browser-self-test",
                workDir: process.cwd(),
                adversarialBrowserChecks: [{
                        name: "Invalid login stays on login page",
                        probeType: "negative_auth_ui",
                        url: "http://example.test/login",
                        actions: [
                            { type: "goto", url: "http://example.test/login" },
                        ],
                        assertions: [
                            { type: "urlIncludes", text: "/login" },
                            { type: "visible", text: "Invalid password" },
                            { type: "consoleNoErrors" },
                        ],
                        screenshot: true,
                    }],
            }],
        options: { browserProvider: "mcp" },
    }, { browserProvider: "mcp", browserToolExecutor: executor });
    const adversarialResults = report.browserResults.filter(item => item.adversarial);
    const byCheck = new Map(report.requiredCheckCoverage.map(item => [item.check, item]));
    return {
        pass: report.status === "passed"
            && adversarialResults.length === 1
            && adversarialResults[0].status === "passed"
            && adversarialResults[0].probeType === "negative_auth_ui"
            && adversarialResults[0].finalUrl === "http://example.test/login"
            && adversarialResults[0].pageTextPreview?.includes("Invalid password")
            && byCheck.get("adversarial")?.status === "verified"
            && report.evidence.some(item => item.title.includes("Adversarial"))
            && report.acceptanceCoverage.every(item => item.status === "verified")
            && calls.length >= 4,
        report,
        calls,
    };
}
async function runTestAgentBrowserProbeTemplateSelfTest() {
    const calls = [];
    const executor = (0, tool_executor_1.createStaticBrowserToolExecutor)({
        tools: [
            "mcp__playwright__browser_navigate",
            "mcp__playwright__browser_type",
            "mcp__playwright__browser_click",
            "mcp__playwright__browser_snapshot",
            "mcp__playwright__browser_take_screenshot",
            "mcp__playwright__browser_console_messages",
            "mcp__playwright__browser_network_requests",
        ],
        onCall: (toolName, input) => {
            calls.push({ toolName, input });
            if (toolName.endsWith("browser_snapshot"))
                return [
                    "Login",
                    "Invalid password",
                    "Counter stable",
                    "Saved draft",
                ].join("\n");
            if (toolName.endsWith("browser_console_messages"))
                return [];
            if (toolName.endsWith("browser_network_requests"))
                return [];
            if (toolName.endsWith("browser_take_screenshot"))
                return { path: `${input.filename || "template-check"}.png` };
            return { ok: true };
        },
    });
    const report = await (0, self_test_policy_1.runTestAgentForSelfTest)({
        id: `browser-probe-template-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent expands browser probe templates into executable checks.",
        acceptanceCriteria: [
            "Invalid form input template produces a real browser probe",
            "Repeated click template produces idempotent browser click evidence",
            "Refresh persistence template reloads and verifies saved state",
        ],
        requiredChecks: ["browser_e2e", "adversarial", "screenshots", "browser_snapshots", "browser_console_logs", "browser_network_logs", "console_errors"],
        projects: [{
                name: "browser-probe-template-self-test",
                workDir: process.cwd(),
                adversarialBrowserProbeTemplates: [
                    {
                        kind: "invalid_form_input",
                        name: "Invalid form input template",
                        url: "http://example.test/login",
                        fields: [
                            { label: "Email", value: "bad@example.test" },
                            { label: "Password", value: "wrong-password" },
                        ],
                        submit: { role: "button", name: "Sign in" },
                        expectedUrlIncludes: "/login",
                        expectedText: "Invalid password",
                        screenshot: true,
                    },
                    {
                        kind: "repeated_click",
                        name: "Repeated click template",
                        url: "http://example.test/counter",
                        target: { role: "button", name: "Retry" },
                        repeat: 4,
                        expectedUrlIncludes: "/counter",
                        expectedText: "Counter stable",
                        screenshot: true,
                    },
                    {
                        kind: "refresh_persistence",
                        name: "Refresh persistence template",
                        url: "http://example.test/editor",
                        setupActions: [
                            { type: "fill", label: "Title", value: "Draft title" },
                        ],
                        stateAssertions: [
                            { type: "visible", text: "Saved draft" },
                        ],
                        expectedUrlIncludes: "/editor",
                        screenshot: true,
                    },
                ],
            }],
        options: { browserProvider: "mcp" },
    }, { browserProvider: "mcp", browserToolExecutor: executor });
    const byProbe = new Map(report.browserResults.map(result => [result.probeType, result]));
    const invalidResult = byProbe.get("invalid_form_input");
    const repeatedResult = byProbe.get("repeated_click");
    const refreshResult = byProbe.get("refresh_persistence");
    const typed = report.browserToolCalls.filter(call => call.toolName.endsWith("browser_type"));
    const retryClicks = report.browserToolCalls.filter(call => call.toolName.endsWith("browser_click") && call.input?.name === "Retry");
    const navigations = report.browserToolCalls.filter(call => call.toolName.endsWith("browser_navigate"));
    const byCheck = new Map(report.requiredCheckCoverage.map(item => [item.check, item]));
    return {
        pass: report.status === "passed"
            && report.browserResults.length === 3
            && invalidResult?.adversarial === true
            && invalidResult?.finalUrl === "http://example.test/login"
            && invalidResult?.pageTextPreview?.includes("Invalid password")
            && (invalidResult?.pageSnapshots || []).length === 1
            && !!invalidResult?.consoleLogPath
            && !!invalidResult?.networkLogPath
            && invalidResult.steps.some(step => step.name.includes("fill") && step.status === "passed")
            && invalidResult.steps.some(step => step.name.includes("click") && step.status === "passed")
            && repeatedResult?.adversarial === true
            && repeatedResult?.finalUrl === "http://example.test/counter"
            && repeatedResult?.pageTextPreview?.includes("Counter stable")
            && repeatedResult.steps.filter(step => step.name.includes("click") && step.status === "passed").length === 4
            && refreshResult?.adversarial === true
            && refreshResult?.finalUrl === "http://example.test/editor"
            && refreshResult?.pageTextPreview?.includes("Saved draft")
            && refreshResult.steps.some(step => step.name.includes("reload") && step.status === "passed")
            && typed.length === 3
            && retryClicks.length === 4
            && navigations.length === 4
            && byCheck.get("browser_snapshots")?.status === "verified"
            && byCheck.get("browser_console_logs")?.status === "verified"
            && byCheck.get("browser_network_logs")?.status === "verified"
            && byCheck.get("adversarial")?.status === "verified"
            && !report.issues.some(issue => issue.code === "no_executable_checks"),
        report,
        calls,
    };
}
async function runTestAgentAutoBrowserSmokeSelfTest() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-auto-browser-smoke-selftest-"));
    const port = await (0, self_test_1.getFreePort)();
    const targetUrl = `http://127.0.0.1:${port}/dashboard`;
    const artifactDir = path.join(dir, "artifacts");
    fs.writeFileSync(path.join(dir, "server.js"), [
        "const http = require('http');",
        "const html = '<!doctype html><title>Auto smoke</title><main><h1>Dashboard</h1><p>Ready for verification</p></main>';",
        "http.createServer((req, res) => { res.writeHead(200, {'content-type':'text/html'}); res.end(html); }).listen(process.env.PORT);",
    ].join("\n"), "utf-8");
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
                return "Dashboard\nReady for verification";
            if (toolName.endsWith("browser_console_messages"))
                return [];
            if (toolName.endsWith("browser_network_requests"))
                return [];
            if (toolName.endsWith("browser_take_screenshot"))
                return { path: "auto-smoke.png" };
            return { ok: true };
        },
    });
    const acceptanceCriteria = ['Target URL opens with "Ready for verification" at /dashboard'];
    const derivedAssertions = (0, acceptance_derived_checks_1.buildAcceptanceDerivedBrowserAssertions)(acceptanceCriteria);
    const autoCheck = (0, auto_checks_1.buildAutoBrowserSmokeCheck)({
        name: "auto-browser-smoke-self-test",
        workDir: dir,
        runCommand: "",
        devServerCommand: "",
        targetUrl,
        startupUrl: targetUrl,
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
    }, acceptanceCriteria);
    const report = await (0, self_test_policy_1.runTestAgentForSelfTest)({
        id: `auto-browser-smoke-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent auto-generates a browser smoke check from targetUrl.",
        acceptanceCriteria,
        requiredChecks: ["browser_e2e", "screenshots", "console_errors", "browser_snapshots", "browser_console_logs", "browser_network_logs"],
        projects: [{
                name: "auto-browser-smoke-self-test",
                workDir: dir,
                runCommand: `"${process.execPath}" server.js`,
                targetUrl,
                env: { PORT: port },
            }],
        options: { browserProvider: "mcp", artifactDir },
    }, { browserProvider: "mcp", browserToolExecutor: executor });
    const result = report.browserResults[0];
    const byCheck = new Map(report.requiredCheckCoverage.map(item => [item.check, item]));
    const pass = autoCheck?.probeType === auto_checks_1.AUTO_BROWSER_SMOKE_PROBE_TYPE
        && autoCheck?.assertions?.some(assertion => assertion.type === "pageNotBlank") === true
        && derivedAssertions.some(item => item.reason === "quoted_text" && item.assertion.type === "text" && item.assertion.text === "Ready for verification")
        && derivedAssertions.some(item => item.reason === "explicit_url_path" && item.assertion.type === "urlIncludes" && item.assertion.text === "/dashboard")
        && autoCheck?.assertions?.some(assertion => assertion.type === "text" && assertion.text === "Ready for verification") === true
        && autoCheck?.assertions?.some(assertion => assertion.type === "urlIncludes" && assertion.text === "/dashboard") === true
        && report.status === "passed"
        && report.devServerResults.some(item => item.status === "started" || item.status === "already_running")
        && report.httpResults.some(item => item.name === "Page HTTP probe" && item.status === "passed")
        && report.browserResults.length === 1
        && result?.name === "Auto browser smoke: auto-browser-smoke-self-test"
        && result?.probeType === auto_checks_1.AUTO_BROWSER_SMOKE_PROBE_TYPE
        && result?.status === "passed"
        && result?.pageTextPreview?.includes("Ready for verification")
        && result?.steps.some(step => step.name.includes("pageNotBlank") && step.status === "passed")
        && result?.steps.some(step => step.name.includes("text") && step.status === "passed" && step.detail === "Ready for verification")
        && result?.steps.some(step => step.name.includes("urlIncludes") && step.status === "passed" && step.detail === "/dashboard")
        && result?.screenshots.length === 1
        && (result?.pageSnapshots || []).length === 1
        && !!result?.consoleLogPath
        && !!result?.networkLogPath
        && byCheck.get("browser_e2e")?.status === "verified"
        && byCheck.get("screenshots")?.status === "verified"
        && byCheck.get("console_errors")?.status === "verified"
        && byCheck.get("browser_snapshots")?.status === "verified"
        && byCheck.get("browser_console_logs")?.status === "verified"
        && byCheck.get("browser_network_logs")?.status === "verified"
        && report.acceptanceCoverage.every(item => item.status === "verified")
        && calls.some(call => call.toolName.endsWith("browser_navigate"))
        && calls.some(call => call.toolName.endsWith("browser_snapshot"));
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    return {
        pass,
        report,
        calls,
        autoCheck,
        derivedAssertions,
    };
}
//# sourceMappingURL=self-test-core.js.map