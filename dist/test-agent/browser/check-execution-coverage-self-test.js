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
exports.runTestAgentBrowserCheckExecutionCoverageSelfTest = runTestAgentBrowserCheckExecutionCoverageSelfTest;
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
const work_order_1 = require("../work-order");
const tool_executor_1 = require("./tool-executor");
const check_execution_coverage_1 = require("./check-execution-coverage");
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
function providerResult(plan, run) {
    const item = plan.items[0];
    const at = new Date().toISOString();
    return {
        provider: "playwright",
        project: item.project,
        name: item.name,
        url: item.url,
        status: "passed",
        startedAt: at,
        finishedAt: at,
        durationMs: 1,
        steps: [],
        screenshots: [],
        consoleErrors: [],
        pageErrors: [],
        networkErrors: [],
        execution: {
            planId: plan.planId,
            checkId: item.checkId,
            projectIndex: item.projectIndex,
            checkIndex: item.checkIndex,
            run,
            expectedRuns: item.expectedRuns,
            evidence: "provider",
        },
    };
}
async function runTestAgentBrowserCheckExecutionCoverageSelfTest() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-browser-execution-coverage-"));
    const server = http.createServer((_request, response) => {
        response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        response.end("<!doctype html><title>Coverage fixture</title><main><h1>First ready</h1><p>Second ready</p></main>");
    });
    const port = await listen(server);
    const baseUrl = `http://127.0.0.1:${port}`;
    const criteria = [
        "The first browser feature is visible",
        "The second browser feature is visible",
    ];
    const workOrder = {
        id: `browser-execution-coverage-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify every planned browser check produces identifiable execution evidence.",
        acceptanceCriteria: criteria,
        requiredChecks: ["browser_e2e"],
        projects: [{
                name: "browser-execution-coverage",
                workDir: dir,
                targetUrl: baseUrl,
                browserChecks: [{
                        name: "First browser feature",
                        url: baseUrl,
                        actions: [{ type: "goto", url: baseUrl }],
                        assertions: [{ type: "text", text: "First ready" }],
                        coversAcceptanceCriteria: [criteria[0]],
                        screenshot: false,
                    }, {
                        name: "Second browser feature",
                        url: baseUrl,
                        actions: [{ type: "goto", url: baseUrl }],
                        assertions: [{ type: "text", text: "Second ready" }],
                        coversAcceptanceCriteria: [criteria[1]],
                        screenshot: false,
                    }],
            }],
        options: {
            artifactDir: path.join(dir, "artifacts"),
            browserProvider: "mcp",
            collectBrowserArtifacts: false,
            collectBrowserVideo: false,
            requireAdversarialProbe: false,
            adversarialProbeWaiver: "This self-test targets execution accounting rather than a product input boundary.",
        },
    };
    const executor = (0, tool_executor_1.createStaticBrowserToolExecutor)({
        tools: [
            "mcp__playwright__browser_navigate",
            "mcp__playwright__browser_snapshot",
            "mcp__playwright__browser_console_messages",
            "mcp__playwright__browser_network_requests",
        ],
        onCall: toolName => {
            if (toolName.endsWith("browser_snapshot"))
                return "First ready Second ready";
            if (toolName.endsWith("browser_console_messages"))
                return [];
            if (toolName.endsWith("browser_network_requests"))
                return [];
            return { ok: true };
        },
    });
    try {
        const report = await (0, agent_1.runTestAgent)(workOrder, { browserProvider: "mcp", browserToolExecutor: executor });
        const plan = report.metadata.browserCheckExecutionPlan;
        const providerResults = report.browserResults.filter(result => result.execution?.evidence === "provider");
        const completeCoverage = report.browserCheckExecutionCoverage;
        const missing = (0, check_execution_coverage_1.reconcileBrowserCheckExecution)(plan, providerResults.slice(0, -1));
        const duplicate = (0, check_execution_coverage_1.reconcileBrowserCheckExecution)(plan, [...providerResults, { ...providerResults[0] }]);
        const stabilityNormalized = (0, work_order_1.normalizeTestAgentWorkOrder)({
            id: `browser-execution-stability-${process.pid}-${Date.now()}`,
            originalUserGoal: "Verify all stability runs are accounted for.",
            acceptanceCriteria: [],
            requiredChecks: ["browser_e2e"],
            projects: [{
                    name: "browser-execution-stability",
                    workDir: dir,
                    targetUrl: baseUrl,
                    browserChecks: [{ name: "Three stability runs", stabilityRuns: 3 }],
                }],
            options: {
                artifactDir: path.join(dir, "stability-artifacts"),
                browserProvider: "playwright",
                requireAdversarialProbe: false,
                adversarialProbeWaiver: "Execution coverage stability fixture.",
            },
        }).workOrder;
        const stabilityPlan = (0, check_execution_coverage_1.buildBrowserCheckExecutionPlan)(stabilityNormalized, "playwright");
        const stability = (0, check_execution_coverage_1.reconcileBrowserCheckExecution)(stabilityPlan, [
            providerResult(stabilityPlan, 1),
            providerResult(stabilityPlan, 2),
        ]);
        const files = report.metadata.artifactFiles;
        const reportPath = files.reportJsonPath;
        const verdictPath = files.verdictJsonPath;
        const manifestPath = files.manifestPath;
        const reportContract = (0, contract_1.validateTestAgentReportContract)(report);
        const verdictContract = (0, contract_1.validateTestAgentVerdictContract)(JSON.parse(fs.readFileSync(verdictPath, "utf-8")));
        const excessiveRunsReport = JSON.parse(JSON.stringify(report));
        excessiveRunsReport.metadata.browserCheckExecutionPlan.items[0].expectedRuns = 11;
        excessiveRunsReport.metadata.browserCheckExecutionPlan.expectedRunCount += 10;
        const excessiveRunsContract = (0, contract_1.validateTestAgentReportContract)(excessiveRunsReport);
        const artifactVerification = (0, artifact_verifier_1.verifyTestAgentArtifactManifestFile)(manifestPath);
        const cli = (0, cli_1.formatTestAgentCliReportSummary)(report);
        const markdown = (0, artifacts_1.buildTestAgentMarkdownReport)(report);
        const originalReport = fs.readFileSync(reportPath, "utf-8");
        const tamperedMissing = JSON.parse(originalReport);
        const removedIndex = tamperedMissing.browserResults.findIndex((result) => result.execution?.evidence === "provider");
        tamperedMissing.browserResults.splice(removedIndex, 1);
        tamperedMissing.browserCheckExecutionCoverage = (0, check_execution_coverage_1.buildBrowserCheckExecutionCoverage)(plan, tamperedMissing.browserResults);
        fs.writeFileSync(reportPath, `${JSON.stringify(tamperedMissing, null, 2)}\n`, "utf-8");
        refreshReportIntegrity(manifestPath, reportPath);
        const tamperedMissingVerification = (0, artifact_verifier_1.verifyTestAgentArtifactManifestFile)(manifestPath);
        const tamperedMissingContract = (0, contract_1.validateTestAgentReportContract)(tamperedMissing);
        const tamperedDuplicate = JSON.parse(originalReport);
        const duplicateSource = tamperedDuplicate.browserResults.find((result) => result.execution?.evidence === "provider");
        tamperedDuplicate.browserResults.push({ ...duplicateSource });
        tamperedDuplicate.browserCheckExecutionCoverage = (0, check_execution_coverage_1.buildBrowserCheckExecutionCoverage)(plan, tamperedDuplicate.browserResults);
        fs.writeFileSync(reportPath, `${JSON.stringify(tamperedDuplicate, null, 2)}\n`, "utf-8");
        refreshReportIntegrity(manifestPath, reportPath);
        const tamperedDuplicateVerification = (0, artifact_verifier_1.verifyTestAgentArtifactManifestFile)(manifestPath);
        const pass = report.status === "passed"
            && completeCoverage?.status === "complete"
            && completeCoverage.plannedCheckCount === plan.plannedCheckCount
            && completeCoverage.expectedRunCount === plan.expectedRunCount
            && completeCoverage.coveredRunCount === plan.expectedRunCount
            && completeCoverage.missingRunCount === 0
            && completeCoverage.duplicateResultCount === 0
            && providerResults.every(result => result.execution?.evidence === "provider")
            && missing.summary.status === "incomplete"
            && missing.summary.missingRunCount === 1
            && missing.summary.syntheticBlockedCount === 1
            && missing.results.some(result => result.execution?.evidence === "synthetic_missing" && result.status === "blocked")
            && duplicate.summary.status === "invalid"
            && duplicate.summary.duplicateResultCount === 1
            && duplicate.results.some(result => result.name === "Browser check execution coverage" && result.status === "blocked")
            && stability.summary.status === "incomplete"
            && stability.summary.expectedRunCount === 3
            && stability.summary.coveredRunCount === 2
            && stability.summary.missingRunCount === 1
            && stability.summary.items[0]?.missingRuns.join(",") === "3"
            && stability.summary.items[0]?.syntheticBlockedRuns.join(",") === "3"
            && reportContract.valid
            && verdictContract.valid
            && !excessiveRunsContract.valid
            && excessiveRunsContract.errors.some(issue => issue.path?.includes("browserCheckExecutionPlan"))
            && cli.includes("Browser execution coverage: status=complete")
            && markdown.includes("## Browser Check Execution Coverage")
            && markdown.includes("runs=2/2")
            && artifactVerification.status === "passed"
            && artifactVerification.items.some(item => item.type === "browser_execution_coverage_evidence" && item.status === "passed")
            && !tamperedMissingContract.valid
            && tamperedMissingVerification.status === "failed"
            && tamperedMissingVerification.items.some(item => item.type === "browser_execution_coverage_evidence" && item.status === "failed")
            && tamperedDuplicateVerification.status === "failed"
            && tamperedDuplicateVerification.items.some(item => item.type === "browser_execution_coverage_evidence" && item.status === "failed");
        return {
            pass,
            report,
            completeCoverage,
            missing: missing.summary,
            duplicate: duplicate.summary,
            stability: stability.summary,
            reportContract,
            verdictContract,
            excessiveRunsContract,
            artifactVerification,
            tamperedMissingContract,
            tamperedMissingVerification,
            tamperedDuplicateVerification,
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
//# sourceMappingURL=check-execution-coverage-self-test.js.map