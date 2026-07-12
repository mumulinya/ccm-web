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
exports.runTestAgentBrowserResourceLifecycleSelfTest = runTestAgentBrowserResourceLifecycleSelfTest;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const http = __importStar(require("http"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const agent_1 = require("../agent");
const artifact_verifier_1 = require("../artifact-verifier");
const artifacts_1 = require("../artifacts");
const cli_1 = require("../cli");
const contract_1 = require("../contract");
const playwright_provider_1 = require("./playwright-provider");
const resource_lifecycle_1 = require("./resource-lifecycle");
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
function clone(value) {
    return JSON.parse(JSON.stringify(value));
}
function sha256File(filePath) {
    return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}
function refreshReportIntegrity(manifestPath, reportPath) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    const stat = fs.statSync(reportPath);
    const integrity = { exists: true, sizeBytes: stat.size, sha256: sha256File(reportPath) };
    for (const item of manifest.files || []) {
        if (item.type === "report_json" || (item.path && path.resolve(item.path) === path.resolve(reportPath))) {
            item.integrity = integrity;
        }
    }
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf-8");
}
function rebuildLifecycle(report) {
    report.browserResourceLifecycleSummary = (0, resource_lifecycle_1.buildBrowserResourceLifecycleSummary)({
        events: report.browserResourceLifecycleEvents,
        plan: report.metadata.browserCheckExecutionPlan,
        reportStartedAt: report.startedAt,
        reportFinishedAt: report.finishedAt,
    });
}
function workOrder(dir, artifactName, baseUrl, text, provider) {
    const criterion = `${text} is visible in the browser`;
    return {
        id: `browser-resource-${artifactName}-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify browser resource cleanup after real functional checks.",
        acceptanceCriteria: [criterion],
        requiredChecks: ["browser_e2e"],
        projects: [{
                name: `browser-resource-${provider}`,
                workDir: dir,
                targetUrl: baseUrl,
                browserChecks: [{
                        name: `${provider} resource lifecycle`,
                        url: baseUrl,
                        actions: [{ type: "goto", url: baseUrl }],
                        assertions: [{ type: "text", text, timeoutMs: 1_000 }],
                        coversAcceptanceCriteria: [criterion],
                        screenshot: false,
                    }],
            }],
        options: {
            artifactDir: path.join(dir, artifactName),
            browserProvider: provider,
            browserTimeoutMs: 2_000,
            collectBrowserArtifacts: false,
            collectBrowserVideo: false,
            requireAdversarialProbe: false,
            adversarialProbeWaiver: "This self-test targets provider resource cleanup.",
        },
    };
}
async function runTestAgentBrowserResourceLifecycleSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
    if (!availability.available)
        return { pass: false, availability, reason: availability.reason };
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-browser-resource-lifecycle-"));
    const server = http.createServer((_request, response) => {
        response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        response.end("<!doctype html><title>Resource lifecycle</title><main><h1>Resource fixture ready</h1></main>");
    });
    const port = await listen(server);
    const baseUrl = `http://127.0.0.1:${port}`;
    const mcpExecutor = (0, tool_executor_1.createStaticBrowserToolExecutor)({
        tools: [
            "mcp__playwright__browser_navigate",
            "mcp__playwright__browser_snapshot",
            "mcp__playwright__browser_console_messages",
            "mcp__playwright__browser_network_requests",
        ],
        onCall: toolName => {
            if (toolName.endsWith("browser_snapshot"))
                return "Resource fixture ready";
            if (toolName.endsWith("browser_console_messages"))
                return [];
            if (toolName.endsWith("browser_network_requests"))
                return [];
            return { ok: true };
        },
    });
    try {
        const passedReport = await (0, agent_1.runTestAgent)(workOrder(dir, "passed-artifacts", baseUrl, "Resource fixture ready", "playwright"), { browserProvider: "playwright" });
        const failedReport = await (0, agent_1.runTestAgent)(workOrder(dir, "failed-artifacts", baseUrl, "Text that is not present", "playwright"), { browserProvider: "playwright" });
        const mcpReport = await (0, agent_1.runTestAgent)(workOrder(dir, "mcp-artifacts", baseUrl, "Resource fixture ready", "mcp"), { browserProvider: "mcp", browserToolExecutor: mcpExecutor });
        const files = passedReport.metadata.artifactFiles;
        const reportContract = (0, contract_1.validateTestAgentReportContract)(passedReport);
        const failedContract = (0, contract_1.validateTestAgentReportContract)(failedReport);
        const mcpContract = (0, contract_1.validateTestAgentReportContract)(mcpReport);
        const verdictContract = (0, contract_1.validateTestAgentVerdictContract)(JSON.parse(fs.readFileSync(files.verdictJsonPath, "utf-8")));
        const artifactVerification = (0, artifact_verifier_1.verifyTestAgentArtifactManifestFile)(files.manifestPath);
        const cli = (0, cli_1.formatTestAgentCliReportSummary)(passedReport);
        const markdown = (0, artifacts_1.buildTestAgentMarkdownReport)(passedReport);
        const openReport = clone(passedReport);
        const openEvent = openReport.browserResourceLifecycleEvents.find(event => event.ownership === "owned");
        openEvent.status = "open";
        delete openEvent.releaseAttemptedAt;
        delete openEvent.releasedAt;
        rebuildLifecycle(openReport);
        const openContract = (0, contract_1.validateTestAgentReportContract)(openReport);
        const cleanupFailedReport = clone(passedReport);
        const cleanupEvent = cleanupFailedReport.browserResourceLifecycleEvents.find(event => event.resourceType === "browser_context");
        cleanupEvent.status = "cleanup_failed";
        cleanupEvent.error = "Injected context close failure.";
        cleanupEvent.releaseAttemptedAt = cleanupEvent.releasedAt || cleanupEvent.acquiredAt;
        delete cleanupEvent.releasedAt;
        rebuildLifecycle(cleanupFailedReport);
        const cleanupFailedContract = (0, contract_1.validateTestAgentReportContract)(cleanupFailedReport);
        const foreignPlanReport = clone(passedReport);
        foreignPlanReport.browserResourceLifecycleEvents[0].planId = "browser-execution-plan-foreign";
        rebuildLifecycle(foreignPlanReport);
        const foreignPlanContract = (0, contract_1.validateTestAgentReportContract)(foreignPlanReport);
        const duplicateReport = clone(passedReport);
        duplicateReport.browserResourceLifecycleEvents.push(clone(duplicateReport.browserResourceLifecycleEvents[0]));
        rebuildLifecycle(duplicateReport);
        const duplicateContract = (0, contract_1.validateTestAgentReportContract)(duplicateReport);
        fs.writeFileSync(files.reportJsonPath, `${JSON.stringify(cleanupFailedReport, null, 2)}\n`, "utf-8");
        refreshReportIntegrity(files.manifestPath, files.reportJsonPath);
        const tamperedArtifactVerification = (0, artifact_verifier_1.verifyTestAgentArtifactManifestFile)(files.manifestPath);
        const passedSummary = passedReport.browserResourceLifecycleSummary;
        const failedSummary = failedReport.browserResourceLifecycleSummary;
        const mcpSummary = mcpReport.browserResourceLifecycleSummary;
        const pass = passedReport.status === "passed"
            && passedSummary.status === "complete"
            && passedSummary.ownedResourceCount === 2
            && passedSummary.releasedResourceCount === 2
            && passedSummary.resourceTypeCounts.browser === 1
            && passedSummary.resourceTypeCounts.browser_context === 1
            && passedSummary.openResourceCount === 0
            && passedSummary.cleanupFailureCount === 0
            && failedReport.status === "failed"
            && failedSummary.status === "complete"
            && failedSummary.ownedResourceCount === 2
            && failedSummary.releasedResourceCount === 2
            && mcpReport.status === "passed"
            && mcpSummary.status === "complete"
            && mcpSummary.externalResourceCount === 1
            && mcpSummary.retainedExternalResourceCount === 1
            && mcpSummary.resourceTypeCounts.external_browser_session === 1
            && reportContract.valid
            && failedContract.valid
            && mcpContract.valid
            && verdictContract.valid
            && artifactVerification.status === "passed"
            && artifactVerification.items.some(item => item.type === "browser_resource_lifecycle_evidence" && item.status === "passed")
            && cli.includes("Browser resource lifecycle: status=complete")
            && markdown.includes("## Browser Resource Lifecycle")
            && openReport.browserResourceLifecycleSummary?.status === "incomplete"
            && openReport.browserResourceLifecycleSummary.openResourceCount === 1
            && !openContract.valid
            && cleanupFailedReport.browserResourceLifecycleSummary?.status === "incomplete"
            && cleanupFailedReport.browserResourceLifecycleSummary.cleanupFailureCount === 1
            && !cleanupFailedContract.valid
            && foreignPlanReport.browserResourceLifecycleSummary?.status === "invalid"
            && foreignPlanReport.browserResourceLifecycleSummary.planMismatchCount === 1
            && !foreignPlanContract.valid
            && duplicateReport.browserResourceLifecycleSummary?.status === "invalid"
            && duplicateReport.browserResourceLifecycleSummary.duplicateResourceCount === 1
            && !duplicateContract.valid
            && tamperedArtifactVerification.status === "failed"
            && tamperedArtifactVerification.items.some(item => item.type === "browser_resource_lifecycle_evidence" && item.status === "failed");
        return {
            pass,
            report: passedReport,
            failedReport,
            mcpReport,
            reportContract,
            failedContract,
            mcpContract,
            verdictContract,
            artifactVerification,
            openSummary: openReport.browserResourceLifecycleSummary,
            cleanupFailedSummary: cleanupFailedReport.browserResourceLifecycleSummary,
            foreignPlanSummary: foreignPlanReport.browserResourceLifecycleSummary,
            duplicateSummary: duplicateReport.browserResourceLifecycleSummary,
            tamperedArtifactVerification,
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
//# sourceMappingURL=resource-lifecycle-self-test.js.map