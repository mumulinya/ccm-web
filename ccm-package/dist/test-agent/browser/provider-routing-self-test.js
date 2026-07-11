"use strict";
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
exports.runTestAgentCapabilityAwareProviderRoutingSelfTest = runTestAgentCapabilityAwareProviderRoutingSelfTest;
const fs = __importStar(require("fs"));
const http = __importStar(require("http"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const agent_1 = require("../agent");
const artifact_verifier_1 = require("../artifact-verifier");
const artifacts_1 = require("../artifacts");
const cli_1 = require("../cli");
const contract_1 = require("../contract");
const execution_plan_1 = require("../execution-plan");
const work_order_1 = require("../work-order");
const provider_gaps_1 = require("./provider-gaps");
const playwright_provider_1 = require("./playwright-provider");
const tool_executor_1 = require("./tool-executor");
function listen(server) {
    return new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, "127.0.0.1", () => {
            server.off("error", reject);
            const address = server.address();
            resolve(typeof address === "object" && address ? address.port : 0);
        });
    });
}
function close(server) {
    return new Promise(resolve => server.close(() => resolve()));
}
function artifactPaths(report) {
    const files = (report.metadata?.artifactFiles || {});
    return {
        markdownPath: String(files.reportMarkdownPath || ""),
        manifestPath: String(files.manifestPath || ""),
    };
}
async function runTestAgentCapabilityAwareProviderRoutingSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
    if (!availability.available)
        return { pass: false, availability, reason: availability.reason };
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-provider-routing-"));
    const server = http.createServer((request, response) => {
        const route = String(request.url || "/").split("?")[0];
        response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        if (route === "/advanced") {
            response.end([
                "<!doctype html><html><head><title>Advanced provider route</title></head><body>",
                "<main><h1>Advanced browser controls</h1>",
                "<label for=\"mode\">Mode</label>",
                "<select id=\"mode\"><option value=\"\">Choose</option><option value=\"collaboration\">Collaboration</option></select>",
                "<p id=\"status\">No mode selected</p>",
                "<script>document.getElementById('mode').addEventListener('change', event => { document.getElementById('status').textContent = 'Selected ' + event.target.value; });</script>",
                "</main></body></html>",
            ].join(""));
            return;
        }
        response.end("<!doctype html><title>MCP route</title><main><h1>MCP route ready</h1></main>");
    });
    const port = await listen(server);
    const baseUrl = `http://127.0.0.1:${port}`;
    const mcpCriterion = "The MCP-compatible status page is verified with browser tools";
    const playwrightCriterion = "The advanced mode selector changes to collaboration in a real browser";
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
                return "MCP route ready";
            if (toolName.endsWith("browser_console_messages"))
                return [];
            if (toolName.endsWith("browser_network_requests"))
                return [];
            return { ok: true };
        },
    });
    const input = {
        id: `capability-aware-provider-routing-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify each browser check is routed to a provider that can execute it.",
        acceptanceCriteria: [mcpCriterion, playwrightCriterion],
        requiredChecks: ["browser_e2e"],
        projects: [{
                name: "capability-aware-provider-routing",
                workDir: dir,
                targetUrl: baseUrl,
                browserChecks: [{
                        name: "MCP-compatible status page",
                        url: `${baseUrl}/mcp`,
                        actions: [{ type: "goto", url: `${baseUrl}/mcp` }],
                        assertions: [{ type: "text", text: "MCP route ready" }],
                        coversAcceptanceCriteria: [mcpCriterion],
                        screenshot: false,
                    }, {
                        name: "Playwright-required mode selector",
                        url: `${baseUrl}/advanced`,
                        actions: [
                            { type: "goto", url: `${baseUrl}/advanced` },
                            { type: "selectOption", selector: "#mode", value: "collaboration" },
                        ],
                        assertions: [
                            { type: "selectedValue", selector: "#mode", value: "collaboration" },
                            { type: "elementTextIncludes", selector: "#status", text: "Selected collaboration" },
                        ],
                        coversAcceptanceCriteria: [playwrightCriterion],
                        screenshot: false,
                    }],
            }],
        options: {
            artifactDir: path.join(dir, "artifacts"),
            browserProvider: "mcp",
            collectBrowserArtifacts: false,
            collectBrowserVideo: false,
            requireAdversarialProbe: false,
            adversarialProbeWaiver: "Provider routing self-test verifies execution ownership without a hostile product input surface.",
        },
    };
    try {
        const normalized = (0, work_order_1.normalizeTestAgentWorkOrder)(input).workOrder;
        const checks = normalized.projects[0].browserChecks;
        const report = await (0, agent_1.runTestAgent)(input, {
            browserProvider: "mcp",
            browserToolExecutor: executor,
        });
        const plan = (0, execution_plan_1.buildTestAgentExecutionPlan)(input);
        const mcpResult = report.browserResults.find(result => result.name === "MCP-compatible status page");
        const playwrightResult = report.browserResults.find(result => result.name === "Playwright-required mode selector");
        const mcpPlanCheck = plan.projects[0].browserChecks.find(check => check.name === "MCP-compatible status page");
        const playwrightPlanCheck = plan.projects[0].browserChecks.find(check => check.name === "Playwright-required mode selector");
        const summary = report.browserProviderSummary;
        const paths = artifactPaths(report);
        const artifactVerification = (0, artifact_verifier_1.verifyTestAgentArtifactManifestFile)(paths.manifestPath);
        const markdown = (0, artifacts_1.buildTestAgentMarkdownReport)(report);
        const cliSummary = (0, cli_1.formatTestAgentCliReportSummary)(report);
        const planSummary = (0, cli_1.formatTestAgentCliExecutionPlanSummary)(plan);
        const mcpNavigationUrls = calls
            .filter(call => call.toolName.endsWith("browser_navigate"))
            .map(call => String(call.input.url || ""));
        const pass = report.status === "passed"
            && mcpResult?.provider === "mcp"
            && mcpResult.status === "passed"
            && playwrightResult?.provider === "playwright"
            && playwrightResult.status === "passed"
            && playwrightResult.steps.some(step => step.name === "action:selectOption" && step.status === "passed")
            && playwrightResult.steps.some(step => step.name === "assert:selectedValue" && step.status === "passed")
            && (0, provider_gaps_1.browserCheckRequiresPlaywright)(normalized, checks[0]) === false
            && (0, provider_gaps_1.browserCheckRequiresPlaywright)(normalized, checks[1]) === true
            && mcpPlanCheck?.plannedProvider === "mcp"
            && mcpPlanCheck.providerRoutingReason === "preferred_provider"
            && playwrightPlanCheck?.plannedProvider === "playwright"
            && playwrightPlanCheck.providerRoutingReason === "capability_requires_playwright"
            && plan.summary.browserPlannedMcpChecks === 1
            && plan.summary.browserPlannedPlaywrightChecks === 1
            && plan.summary.browserCapabilityRoutedChecks === 1
            && mcpNavigationUrls.length === 1
            && mcpNavigationUrls[0] === `${baseUrl}/mcp`
            && !calls.some(call => JSON.stringify(call.input).includes("/advanced"))
            && summary.selectedProviders?.join(",") === "mcp,playwright"
            && summary.attemptedProviders.join(",") === "mcp,playwright"
            && summary.fallbackUsed === true
            && summary.items.find(item => item.provider === "mcp")?.passed === 1
            && summary.items.find(item => item.provider === "playwright")?.passed === 1
            && report.browserProviderGaps.length === 0
            && report.acceptanceCoverage.every(item => item.status === "verified")
            && plan.browserProviderWarnings.some(item => item.item === "selectOption" && item.category === "requires_playwright")
            && plan.browserProviderWarnings.some(item => item.item === "selectedValue" && item.category === "requires_playwright")
            && planSummary.includes("Browser provider warnings: 2")
            && planSummary.includes("Browser provider routing plan: playwright:1 mcp:1 capabilityFallback:1 existingSession:0")
            && planSummary.includes("Playwright-required mode selector -> playwright (capability_requires_playwright)")
            && cliSummary.includes("selected=mcp,playwright")
            && cliSummary.includes("fallback=yes")
            && markdown.includes("selected=mcp,playwright")
            && fs.readFileSync(paths.markdownPath, "utf-8").includes("fallback=yes")
            && (0, contract_1.validateTestAgentReportContract)(report).valid
            && artifactVerification.status === "passed";
        return {
            pass,
            availability,
            report,
            plan,
            calls,
            artifactVerification,
        };
    }
    finally {
        await close(server);
        try {
            fs.rmSync(dir, { recursive: true, force: true });
        }
        catch { }
    }
}
//# sourceMappingURL=provider-routing-self-test.js.map