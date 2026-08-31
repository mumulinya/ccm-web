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
exports.runTestAgentBrowserToolEvidenceLineageSelfTest = runTestAgentBrowserToolEvidenceLineageSelfTest;
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
function mcpProviderResults(report) {
    return report.browserResults.filter(result => result.provider === "mcp"
        && result.execution?.evidence === "provider");
}
function rebuildLineage(report) {
    report.browserToolEvidenceLineage = (0, tool_evidence_lineage_1.buildBrowserToolEvidenceLineage)(report.browserResults, report.browserToolCalls);
    return report.browserToolEvidenceLineage;
}
async function runTestAgentBrowserToolEvidenceLineageSelfTest() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-browser-tool-lineage-"));
    const server = http.createServer((_request, response) => {
        response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        response.end("<!doctype html><title>Tool lineage</title><main><h1>Alpha ready</h1><p>Beta ready</p></main>");
    });
    const port = await listen(server);
    const baseUrl = `http://127.0.0.1:${port}`;
    const criteria = ["Alpha is visible in the browser", "Beta is visible in the browser"];
    const executor = (0, tool_executor_1.createStaticBrowserToolExecutor)({
        tools: [
            "mcp__playwright__browser_navigate",
            "mcp__playwright__browser_snapshot",
            "mcp__playwright__browser_console_messages",
            "mcp__playwright__browser_network_requests",
        ],
        onCall: toolName => {
            if (toolName.endsWith("browser_snapshot"))
                return "Alpha ready Beta ready";
            if (toolName.endsWith("browser_console_messages"))
                return [];
            if (toolName.endsWith("browser_network_requests"))
                return [];
            return { ok: true };
        },
    });
    const input = {
        id: `browser-tool-lineage-${process.pid}-${Date.now()}`,
        originalUserGoal: "Prove every passing MCP browser check is linked to its actual browser tool calls.",
        acceptanceCriteria: criteria,
        requiredChecks: ["browser_e2e"],
        projects: [{
                name: "browser-tool-lineage",
                workDir: dir,
                targetUrl: baseUrl,
                browserChecks: [{
                        name: "Alpha browser check",
                        url: baseUrl,
                        actions: [{ type: "goto", url: baseUrl }],
                        assertions: [{ type: "text", text: "Alpha ready" }],
                        coversAcceptanceCriteria: [criteria[0]],
                        screenshot: false,
                    }, {
                        name: "Beta browser check",
                        url: baseUrl,
                        actions: [{ type: "goto", url: baseUrl }],
                        assertions: [{ type: "text", text: "Beta ready" }],
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
            adversarialProbeWaiver: "This self-test targets evidence attribution rather than product input handling.",
        },
    };
    try {
        const report = await (0, agent_1.runTestAgent)(input, { browserProvider: "mcp", browserToolExecutor: executor });
        const mcpResults = mcpProviderResults(report);
        const firstIds = mcpResults[0]?.browserToolCallIds || [];
        const secondIds = mcpResults[1]?.browserToolCallIds || [];
        const firstExecution = mcpResults[0]?.execution;
        const summary = report.browserToolEvidenceLineage;
        const files = report.metadata.artifactFiles;
        const reportPath = files.reportJsonPath;
        const verdictPath = files.verdictJsonPath;
        const manifestPath = files.manifestPath;
        const reportContract = (0, contract_1.validateTestAgentReportContract)(report);
        const verdictContract = (0, contract_1.validateTestAgentVerdictContract)(JSON.parse(fs.readFileSync(verdictPath, "utf-8")));
        const artifactVerification = (0, artifact_verifier_1.verifyTestAgentArtifactManifestFile)(manifestPath);
        const cli = (0, cli_1.formatTestAgentCliReportSummary)(report);
        const markdown = (0, artifacts_1.buildTestAgentMarkdownReport)(report);
        const missingLinkReport = clone(report);
        const missingResult = mcpProviderResults(missingLinkReport)[0];
        missingResult.browserToolCallIds = [];
        const missingSummary = rebuildLineage(missingLinkReport);
        const missingContract = (0, contract_1.validateTestAgentReportContract)(missingLinkReport);
        const foreignLinkReport = clone(report);
        const foreignResults = mcpProviderResults(foreignLinkReport);
        foreignResults[1].browserToolCallIds = [foreignResults[0].browserToolCallIds[0]];
        const foreignSummary = rebuildLineage(foreignLinkReport);
        const foreignContract = (0, contract_1.validateTestAgentReportContract)(foreignLinkReport);
        const unscopedReport = clone(report);
        delete unscopedReport.browserToolCalls[0].browserExecution;
        const unscopedSummary = rebuildLineage(unscopedReport);
        const unscopedContract = (0, contract_1.validateTestAgentReportContract)(unscopedReport);
        const originalReport = fs.readFileSync(reportPath, "utf-8");
        fs.writeFileSync(reportPath, `${JSON.stringify(missingLinkReport, null, 2)}\n`, "utf-8");
        refreshReportIntegrity(manifestPath, reportPath);
        const tamperedMissingVerification = (0, artifact_verifier_1.verifyTestAgentArtifactManifestFile)(manifestPath);
        const transcriptMismatchReport = clone(report);
        transcriptMismatchReport.browserToolCalls[0].browserExecution = clone(mcpResults[1].execution);
        rebuildLineage(transcriptMismatchReport);
        fs.writeFileSync(reportPath, `${JSON.stringify(transcriptMismatchReport, null, 2)}\n`, "utf-8");
        refreshReportIntegrity(manifestPath, reportPath);
        const tamperedTranscriptVerification = (0, artifact_verifier_1.verifyTestAgentArtifactManifestFile)(manifestPath);
        const allResultIds = mcpResults.flatMap(result => result.browserToolCallIds || []);
        const pass = report.status === "passed"
            && mcpResults.length === 2
            && firstIds.length > 0
            && secondIds.length > 0
            && firstIds.every(id => !secondIds.includes(id))
            && new Set(allResultIds).size === allResultIds.length
            && summary?.status === "complete"
            && summary.mcpResultCount === 2
            && summary.linkedResultCount === 2
            && summary.linkedToolCallCount === report.browserToolCalls.length
            && summary.scopedToolCallCount === report.browserToolCalls.length
            && summary.orphanScopedToolCallCount === 0
            && summary.unscopedToolCallCount === 0
            && report.browserToolCalls.every(record => record.browserExecution?.evidence === "provider"
                && allResultIds.includes(record.id))
            && report.browserToolCalls.filter(record => record.browserExecution?.checkId === firstExecution?.checkId).every(record => firstIds.includes(record.id))
            && reportContract.valid
            && verdictContract.valid
            && cli.includes("Browser tool evidence lineage: status=complete")
            && markdown.includes("## Browser Tool Evidence Lineage")
            && markdown.includes("Browser execution: browser-check:")
            && artifactVerification.status === "passed"
            && artifactVerification.items.some(item => item.type === "browser_tool_lineage_evidence" && item.status === "passed")
            && missingSummary.status === "invalid"
            && missingSummary.orphanScopedToolCallCount > 0
            && !missingContract.valid
            && foreignSummary.status === "invalid"
            && foreignSummary.foreignToolCallReferenceCount > 0
            && !foreignContract.valid
            && unscopedSummary.status === "invalid"
            && unscopedSummary.unscopedToolCallCount === 1
            && !unscopedContract.valid
            && tamperedMissingVerification.status === "failed"
            && tamperedMissingVerification.items.some(item => item.type === "browser_tool_lineage_evidence" && item.status === "failed")
            && tamperedTranscriptVerification.status === "failed"
            && tamperedTranscriptVerification.items.some(item => item.type === "browser_tool_lineage_evidence"
                && item.status === "failed"
                && String(item.error || "").includes("transcript records do not match"));
        return {
            pass,
            report,
            summary,
            missingSummary,
            foreignSummary,
            unscopedSummary,
            reportContract,
            verdictContract,
            artifactVerification,
            tamperedMissingVerification,
            tamperedTranscriptVerification,
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
//# sourceMappingURL=tool-evidence-lineage-self-test.js.map