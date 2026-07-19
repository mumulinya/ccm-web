"use strict";
// Behavior-freeze extraction from self-test-core.ts (part-03.ts).
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
exports.runTestAgentAutoBrowserSmokeSelfTest = runTestAgentAutoBrowserSmokeSelfTest;
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const self_test_policy_1 = require("../self-test-policy");
const acceptance_derived_checks_1 = require("../browser/acceptance-derived-checks");
const auto_checks_1 = require("../browser/auto-checks");
const tool_executor_1 = require("../browser/tool-executor");
const self_test_1 = require("../self-test");
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
//# sourceMappingURL=part-03.js.map