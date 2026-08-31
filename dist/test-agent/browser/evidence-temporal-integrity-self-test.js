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
exports.runTestAgentBrowserEvidenceTemporalIntegritySelfTest = runTestAgentBrowserEvidenceTemporalIntegritySelfTest;
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
const check_execution_coverage_1 = require("./check-execution-coverage");
const evidence_temporal_integrity_1 = require("./evidence-temporal-integrity");
const tool_call_timeout_1 = require("./tool-call-timeout");
const tool_evidence_lineage_1 = require("./tool-evidence-lineage");
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
function planFor(report) {
    return report.metadata.browserCheckExecutionPlan;
}
function rebuildDerivedBrowserEvidence(report) {
    const plan = planFor(report);
    report.browserCheckExecutionCoverage = (0, check_execution_coverage_1.buildBrowserCheckExecutionCoverage)(plan, report.browserResults);
    report.browserToolEvidenceLineage = (0, tool_evidence_lineage_1.buildBrowserToolEvidenceLineage)(report.browserResults, report.browserToolCalls);
    report.browserToolCallTimeoutSummary = (0, tool_call_timeout_1.buildBrowserToolCallTimeoutSummary)(report.browserToolCalls);
    report.browserEvidenceTemporalIntegrity = (0, evidence_temporal_integrity_1.buildBrowserEvidenceTemporalIntegrity)({
        startedAt: report.startedAt,
        finishedAt: report.finishedAt,
        durationMs: report.durationMs,
        plan,
        browserResults: report.browserResults,
        browserToolCalls: report.browserToolCalls,
    });
}
function inputFor(dir, artifactName, baseUrl) {
    const criterion = "Temporal fixture is visible in the browser";
    return {
        id: `browser-temporal-${artifactName}-${process.pid}-${Date.now()}`,
        originalUserGoal: "Prove browser evidence belongs to this TestAgent run and its recorded time window.",
        acceptanceCriteria: [criterion],
        requiredChecks: ["browser_e2e"],
        projects: [{
                name: "browser-temporal-integrity",
                workDir: dir,
                targetUrl: baseUrl,
                browserChecks: [{
                        name: "Temporal browser check",
                        url: baseUrl,
                        actions: [{ type: "goto", url: baseUrl }],
                        assertions: [{ type: "text", text: "Temporal fixture ready" }],
                        coversAcceptanceCriteria: [criterion],
                        screenshot: false,
                    }],
            }],
        options: {
            artifactDir: path.join(dir, artifactName),
            browserProvider: "mcp",
            collectBrowserArtifacts: false,
            collectBrowserVideo: false,
            requireAdversarialProbe: false,
            adversarialProbeWaiver: "This self-test targets browser evidence provenance and time integrity.",
        },
    };
}
async function runTestAgentBrowserEvidenceTemporalIntegritySelfTest() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-browser-temporal-"));
    const server = http.createServer((_request, response) => {
        response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        response.end("<!doctype html><title>Temporal evidence</title><main><h1>Temporal fixture ready</h1></main>");
    });
    const port = await listen(server);
    const baseUrl = `http://127.0.0.1:${port}`;
    const executor = (0, tool_executor_1.createStaticBrowserToolExecutor)({
        tools: [
            "mcp__playwright__browser_navigate",
            "mcp__playwright__browser_snapshot",
            "mcp__playwright__browser_console_messages",
            "mcp__playwright__browser_network_requests",
        ],
        onCall: toolName => {
            if (toolName.endsWith("browser_snapshot"))
                return "Temporal fixture ready";
            if (toolName.endsWith("browser_console_messages"))
                return [];
            if (toolName.endsWith("browser_network_requests"))
                return [];
            return { ok: true };
        },
    });
    try {
        const first = await (0, agent_1.runTestAgent)(inputFor(dir, "first-artifacts", baseUrl), {
            browserProvider: "mcp",
            browserToolExecutor: executor,
        });
        const second = await (0, agent_1.runTestAgent)(inputFor(dir, "second-artifacts", baseUrl), {
            browserProvider: "mcp",
            browserToolExecutor: executor,
        });
        const firstPlan = planFor(first);
        const secondPlan = planFor(second);
        const secondFiles = second.metadata.artifactFiles;
        const reportContract = (0, contract_1.validateTestAgentReportContract)(second);
        const verdictContract = (0, contract_1.validateTestAgentVerdictContract)(JSON.parse(fs.readFileSync(secondFiles.verdictJsonPath, "utf-8")));
        const artifactVerification = (0, artifact_verifier_1.verifyTestAgentArtifactManifestFile)(secondFiles.manifestPath);
        const cli = (0, cli_1.formatTestAgentCliReportSummary)(second);
        const markdown = (0, artifacts_1.buildTestAgentMarkdownReport)(second);
        const crossRun = clone(second);
        crossRun.browserResults = clone(first.browserResults);
        crossRun.browserToolCalls = clone(first.browserToolCalls);
        rebuildDerivedBrowserEvidence(crossRun);
        const crossRunContract = (0, contract_1.validateTestAgentReportContract)(crossRun);
        const outsideReport = clone(second);
        const outsideResult = outsideReport.browserResults.find(result => result.execution?.evidence === "provider");
        const outsideAt = new Date(Date.parse(outsideReport.finishedAt) + 5_000).toISOString();
        outsideResult.startedAt = outsideAt;
        outsideResult.finishedAt = outsideAt;
        outsideResult.durationMs = 0;
        rebuildDerivedBrowserEvidence(outsideReport);
        const outsideReportContract = (0, contract_1.validateTestAgentReportContract)(outsideReport);
        const durationTamper = clone(second);
        durationTamper.browserResults[0].durationMs += 1_000;
        rebuildDerivedBrowserEvidence(durationTamper);
        const durationContract = (0, contract_1.validateTestAgentReportContract)(durationTamper);
        const toolOutsideOwner = clone(second);
        const toolRecord = toolOutsideOwner.browserToolCalls.find(record => record.browserExecution);
        const owner = toolOutsideOwner.browserResults.find(result => result.execution?.planId === toolRecord.browserExecution?.planId
            && result.execution?.checkId === toolRecord.browserExecution?.checkId
            && result.execution?.run === toolRecord.browserExecution?.run);
        const beforeOwner = new Date(Date.parse(owner.startedAt) - 5_000).toISOString();
        toolRecord.startedAt = beforeOwner;
        toolRecord.finishedAt = beforeOwner;
        toolRecord.durationMs = 0;
        rebuildDerivedBrowserEvidence(toolOutsideOwner);
        const toolWindowContract = (0, contract_1.validateTestAgentReportContract)(toolOutsideOwner);
        fs.writeFileSync(secondFiles.reportJsonPath, `${JSON.stringify(crossRun, null, 2)}\n`, "utf-8");
        refreshReportIntegrity(secondFiles.manifestPath, secondFiles.reportJsonPath);
        const crossRunArtifactVerification = (0, artifact_verifier_1.verifyTestAgentArtifactManifestFile)(secondFiles.manifestPath);
        const pass = first.status === "passed"
            && second.status === "passed"
            && firstPlan.planId !== secondPlan.planId
            && Date.parse(firstPlan.createdAt) >= Date.parse(first.startedAt)
            && Date.parse(secondPlan.createdAt) >= Date.parse(second.startedAt)
            && second.browserEvidenceTemporalIntegrity?.status === "complete"
            && second.browserEvidenceTemporalIntegrity.invalidItemCount === 0
            && second.browserResults.every(result => !result.execution || result.execution.planId === secondPlan.planId)
            && second.browserToolCalls.every(record => !record.browserExecution || record.browserExecution.planId === secondPlan.planId)
            && reportContract.valid
            && verdictContract.valid
            && artifactVerification.status === "passed"
            && artifactVerification.items.some(item => item.type === "browser_temporal_evidence" && item.status === "passed")
            && cli.includes("Browser temporal evidence: status=complete")
            && markdown.includes("## Browser Evidence Temporal Integrity")
            && crossRun.browserEvidenceTemporalIntegrity?.status === "invalid"
            && crossRun.browserEvidenceTemporalIntegrity.planMismatchCount > 0
            && !crossRunContract.valid
            && outsideReport.browserEvidenceTemporalIntegrity?.outsideReportWindowCount > 0
            && !outsideReportContract.valid
            && durationTamper.browserEvidenceTemporalIntegrity?.durationMismatchCount > 0
            && !durationContract.valid
            && toolOutsideOwner.browserEvidenceTemporalIntegrity?.outsideResultWindowCount > 0
            && !toolWindowContract.valid
            && crossRunArtifactVerification.status === "failed"
            && crossRunArtifactVerification.items.some(item => item.type === "browser_temporal_evidence" && item.status === "failed");
        return {
            pass,
            report: second,
            firstPlan,
            secondPlan,
            reportContract,
            verdictContract,
            artifactVerification,
            crossRunSummary: crossRun.browserEvidenceTemporalIntegrity,
            crossRunContract,
            outsideReportSummary: outsideReport.browserEvidenceTemporalIntegrity,
            outsideReportContract,
            durationSummary: durationTamper.browserEvidenceTemporalIntegrity,
            durationContract,
            toolWindowSummary: toolOutsideOwner.browserEvidenceTemporalIntegrity,
            toolWindowContract,
            crossRunArtifactVerification,
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
//# sourceMappingURL=evidence-temporal-integrity-self-test.js.map