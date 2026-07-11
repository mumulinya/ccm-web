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
exports.runTestAgentHttpConcurrencySelfTest = runTestAgentHttpConcurrencySelfTest;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const http = __importStar(require("http"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const agent_1 = require("./agent");
const artifact_verifier_1 = require("./artifact-verifier");
const artifacts_1 = require("./artifacts");
const cli_1 = require("./cli");
const contract_1 = require("./contract");
const execution_plan_1 = require("./execution-plan");
const http_concurrency_1 = require("./http-concurrency");
function sha256File(filePath) {
    return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}
function refreshManifestItemIntegrity(manifestPath, artifactType) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    const item = (manifest.files || []).find((entry) => entry.type === artifactType);
    if (!item?.path)
        return;
    const targetPath = path.resolve(item.path);
    const stat = fs.statSync(targetPath);
    const integrity = {
        exists: true,
        sizeBytes: stat.size,
        sha256: sha256File(targetPath),
    };
    for (const entry of manifest.files || []) {
        if (entry.type === artifactType || (entry.path && path.resolve(entry.path) === targetPath)) {
            entry.integrity = integrity;
        }
    }
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf-8");
}
function artifactPaths(report) {
    const files = (report.metadata?.artifactFiles || {});
    return {
        reportPath: String(files.reportJsonPath || ""),
        markdownPath: String(files.reportMarkdownPath || ""),
        verdictPath: String(files.verdictJsonPath || ""),
        manifestPath: String(files.manifestPath || ""),
    };
}
function readBody(request) {
    return new Promise((resolve, reject) => {
        let body = "";
        request.setEncoding("utf-8");
        request.on("data", chunk => {
            body += chunk;
        });
        request.on("end", () => resolve(body));
        request.on("error", reject);
    });
}
function sendJson(response, status, value) {
    response.writeHead(status, { "content-type": "application/json" });
    response.end(JSON.stringify(value));
}
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
async function listen(server) {
    return new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, "127.0.0.1", () => {
            server.off("error", reject);
            const address = server.address();
            resolve(typeof address === "object" && address ? address.port : 0);
        });
    });
}
async function close(server) {
    return new Promise(resolve => {
        server.close(() => resolve());
    });
}
async function closedLocalPort() {
    const server = http.createServer();
    const port = await listen(server);
    await close(server);
    return port;
}
async function createConcurrencyServer() {
    let activeRequests = 0;
    let maximumActiveRequests = 0;
    let resourceSequence = 0;
    let brokenSequence = 0;
    const idempotentResources = new Map();
    async function holdConcurrentRequest() {
        activeRequests += 1;
        maximumActiveRequests = Math.max(maximumActiveRequests, activeRequests);
        try {
            await delay(90);
        }
        finally {
            activeRequests -= 1;
        }
    }
    const server = http.createServer(async (request, response) => {
        try {
            const target = new URL(request.url || "/", "http://127.0.0.1");
            if (target.pathname === "/api/messages" && request.method === "POST") {
                const body = JSON.parse(await readBody(request) || "{}");
                const requestIndex = Number(target.searchParams.get("index"));
                const requestNumber = Number(target.searchParams.get("number"));
                const interpolationValid = requestIndex === Number(request.headers["x-request-index"])
                    && requestNumber === Number(request.headers["x-request-number"])
                    && requestIndex === Number(body.requestIndex)
                    && requestNumber === Number(body.requestNumber)
                    && requestNumber === requestIndex + 1;
                await holdConcurrentRequest();
                if (!interpolationValid) {
                    sendJson(response, 422, { error: "request interpolation mismatch" });
                    return;
                }
                sendJson(response, 201, {
                    messageId: `message-${requestNumber}`,
                    resourceId: "room-concurrency",
                });
                return;
            }
            if (target.pathname === "/api/idempotent" && request.method === "POST") {
                await readBody(request);
                const key = String(request.headers["idempotency-key"] || "");
                if (!idempotentResources.has(key)) {
                    resourceSequence += 1;
                    idempotentResources.set(key, `resource-${resourceSequence}`);
                }
                const resourceId = idempotentResources.get(key);
                await holdConcurrentRequest();
                sendJson(response, 201, { resourceId });
                return;
            }
            if (target.pathname === "/api/broken-idempotent" && request.method === "POST") {
                await readBody(request);
                brokenSequence += 1;
                const resourceId = `broken-resource-${brokenSequence}`;
                await holdConcurrentRequest();
                sendJson(response, 201, { resourceId });
                return;
            }
            sendJson(response, 404, { error: "not found" });
        }
        catch (error) {
            sendJson(response, 500, { error: error.message || String(error) });
        }
    });
    const port = await listen(server);
    return {
        baseUrl: `http://127.0.0.1:${port}`,
        server,
        maximumActiveRequests: () => maximumActiveRequests,
    };
}
function passWorkOrder(dir, baseUrl) {
    const messageCriterion = "Four simultaneous message creates are preserved without lost writes";
    const idempotencyCriterion = "Repeated idempotent requests return one shared resource";
    return {
        id: `http-concurrency-pass-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify concurrent collaboration writes and duplicate request idempotency.",
        acceptanceCriteria: [messageCriterion, idempotencyCriterion],
        requiredChecks: ["adversarial concurrency idempotency"],
        projects: [{
                name: "http-concurrency-pass",
                workDir: dir,
                adversarialHttpChecks: [{
                        name: "Concurrent collaboration message writes",
                        probeType: "concurrency",
                        method: "POST",
                        url: `${baseUrl}/api/messages?number={{requestNumber}}&index={{requestIndex}}`,
                        headers: {
                            "x-request-index": "{{requestIndex}}",
                            "x-request-number": "{{requestNumber}}",
                        },
                        json: {
                            requestIndex: "{{requestIndex}}",
                            requestNumber: "{{requestNumber}}",
                        },
                        assertions: [{ type: "status", status: 201 }],
                        concurrency: {
                            requests: 4,
                            aggregateAssertions: [
                                { type: "responseCount", count: 4 },
                                { type: "statusCount", status: 201, count: 4 },
                                { type: "jsonPathUniqueCount", path: "messageId", count: 4 },
                            ],
                        },
                        coversAcceptanceCriteria: [messageCriterion],
                    }, {
                        name: "Concurrent idempotent duplicate submissions",
                        probeType: "idempotency",
                        method: "POST",
                        url: `${baseUrl}/api/idempotent`,
                        headers: {
                            "idempotency-key": "shared-operation",
                            "x-request-number": "{{requestNumber}}",
                        },
                        json: {
                            operation: "shared-operation",
                            attempt: "{{requestNumber}}",
                        },
                        assertions: [{ type: "status", status: 201 }],
                        concurrency: {
                            requests: 4,
                            aggregateAssertions: [
                                { type: "responseCount", count: 4 },
                                { type: "statusCount", status: 201, count: 4 },
                                { type: "jsonPathAllEqual", path: "resourceId" },
                            ],
                        },
                        coversAcceptanceCriteria: [idempotencyCriterion],
                    }],
            }],
        options: {
            artifactDir: path.join(dir, "pass-artifacts"),
            browserProvider: "none",
            requireAdversarialProbe: true,
        },
    };
}
function brokenWorkOrder(dir, baseUrl) {
    const criterion = "Concurrent duplicate submissions are idempotent";
    return {
        id: `http-concurrency-broken-${process.pid}-${Date.now()}`,
        originalUserGoal: "Detect a duplicate-submission race that creates multiple resources.",
        acceptanceCriteria: [criterion],
        requiredChecks: ["adversarial concurrency idempotency"],
        projects: [{
                name: "http-concurrency-broken",
                workDir: dir,
                adversarialHttpChecks: [{
                        name: "Broken concurrent idempotency",
                        probeType: "idempotency",
                        method: "POST",
                        url: `${baseUrl}/api/broken-idempotent`,
                        json: { operation: "same" },
                        assertions: [{ type: "status", status: 201 }],
                        concurrency: {
                            requests: 4,
                            aggregateAssertions: [
                                { type: "jsonPathAllEqual", path: "resourceId" },
                            ],
                        },
                        coversAcceptanceCriteria: [criterion],
                    }],
            }],
        options: {
            artifactDir: path.join(dir, "broken-artifacts"),
            browserProvider: "none",
            requireAdversarialProbe: true,
        },
    };
}
function blockedWorkOrder(dir, port) {
    const criterion = "Concurrent endpoint is reachable for race verification";
    return {
        id: `http-concurrency-blocked-${process.pid}-${Date.now()}`,
        originalUserGoal: "Classify unreachable concurrent verification as blocked.",
        acceptanceCriteria: [criterion],
        requiredChecks: ["adversarial concurrency"],
        projects: [{
                name: "http-concurrency-blocked",
                workDir: dir,
                adversarialHttpChecks: [{
                        name: "Unreachable concurrent endpoint",
                        probeType: "concurrency",
                        method: "POST",
                        url: `http://127.0.0.1:${port}/api/unreachable`,
                        json: { request: "{{requestNumber}}" },
                        assertions: [{ type: "status", status: 201 }],
                        concurrency: {
                            requests: 3,
                            aggregateAssertions: [{ type: "responseCount", count: 3 }],
                        },
                        coversAcceptanceCriteria: [criterion],
                        timeoutMs: 500,
                    }],
            }],
        options: {
            artifactDir: path.join(dir, "blocked-artifacts"),
            browserProvider: "none",
            requireAdversarialProbe: true,
            httpTimeoutMs: 500,
        },
    };
}
function invalidConcurrencyWorkOrder(dir, concurrency) {
    return {
        schema: "ccm-test-agent-work-order-v1",
        id: `invalid-http-concurrency-${process.pid}-${Date.now()}-${Math.random()}`,
        projects: [{
                name: "invalid-http-concurrency",
                workDir: dir,
                httpChecks: [{
                        name: "Invalid concurrency",
                        url: "http://127.0.0.1/invalid",
                        concurrency,
                    }],
            }],
    };
}
async function runTestAgentHttpConcurrencySelfTest() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-http-concurrency-"));
    const service = await createConcurrencyServer();
    try {
        const closedPort = await closedLocalPort();
        const passingWorkOrder = passWorkOrder(dir, service.baseUrl);
        const passingReport = await (0, agent_1.runTestAgent)(passingWorkOrder);
        const brokenReport = await (0, agent_1.runTestAgent)(brokenWorkOrder(dir, service.baseUrl));
        const blockedReport = await (0, agent_1.runTestAgent)(blockedWorkOrder(dir, closedPort));
        const passingResults = passingReport.httpResults.filter(result => result.concurrency);
        const brokenResult = brokenReport.httpResults.find(result => result.concurrency);
        const blockedResult = blockedReport.httpResults.find(result => result.concurrency);
        const plan = (0, execution_plan_1.buildTestAgentExecutionPlan)(passingWorkOrder);
        const planSummary = (0, cli_1.formatTestAgentCliExecutionPlanSummary)(plan);
        const cliSummary = (0, cli_1.formatTestAgentCliReportSummary)(passingReport);
        const markdown = (0, artifacts_1.buildTestAgentMarkdownReport)(passingReport);
        const paths = artifactPaths(passingReport);
        const originalReportJson = fs.readFileSync(paths.reportPath, "utf-8");
        const originalVerdictJson = fs.readFileSync(paths.verdictPath, "utf-8");
        const verdict = JSON.parse(originalVerdictJson);
        const artifactVerification = (0, artifact_verifier_1.verifyTestAgentArtifactManifestFile)(paths.manifestPath);
        const tamperedReport = JSON.parse(originalReportJson);
        tamperedReport.httpResults.find((result) => result.concurrency)
            .concurrency.requests[0].requestNumber = 99;
        fs.writeFileSync(paths.reportPath, `${JSON.stringify(tamperedReport, null, 2)}\n`, "utf-8");
        refreshManifestItemIntegrity(paths.manifestPath, "report_json");
        const reportTamperedVerification = (0, artifact_verifier_1.verifyTestAgentArtifactManifestFile)(paths.manifestPath);
        fs.writeFileSync(paths.reportPath, originalReportJson, "utf-8");
        refreshManifestItemIntegrity(paths.manifestPath, "report_json");
        const statusTamperedReport = JSON.parse(originalReportJson);
        statusTamperedReport.httpResults.find((result) => result.concurrency).status = "blocked";
        fs.writeFileSync(paths.reportPath, `${JSON.stringify(statusTamperedReport, null, 2)}\n`, "utf-8");
        refreshManifestItemIntegrity(paths.manifestPath, "report_json");
        const statusTamperedVerification = (0, artifact_verifier_1.verifyTestAgentArtifactManifestFile)(paths.manifestPath);
        fs.writeFileSync(paths.reportPath, originalReportJson, "utf-8");
        refreshManifestItemIntegrity(paths.manifestPath, "report_json");
        const tamperedVerdict = JSON.parse(originalVerdictJson);
        tamperedVerdict.httpConcurrencySummary.requests += 1;
        tamperedVerdict.evidenceSummary.httpConcurrentRequests += 1;
        fs.writeFileSync(paths.verdictPath, `${JSON.stringify(tamperedVerdict, null, 2)}\n`, "utf-8");
        refreshManifestItemIntegrity(paths.manifestPath, "verdict_json");
        const verdictTamperedVerification = (0, artifact_verifier_1.verifyTestAgentArtifactManifestFile)(paths.manifestPath);
        const invalidContracts = [
            (0, contract_1.validateTestAgentWorkOrderContract)(invalidConcurrencyWorkOrder(dir, 1)),
            (0, contract_1.validateTestAgentWorkOrderContract)(invalidConcurrencyWorkOrder(dir, 51)),
            (0, contract_1.validateTestAgentWorkOrderContract)(invalidConcurrencyWorkOrder(dir, {
                requests: 4,
                aggregateAssertions: [{ type: "responseCount" }],
            })),
            (0, contract_1.validateTestAgentWorkOrderContract)(invalidConcurrencyWorkOrder(dir, {
                requests: 4,
                aggregateAssertions: [{ type: "jsonPathAllEqual" }],
            })),
            (0, contract_1.validateTestAgentWorkOrderContract)(invalidConcurrencyWorkOrder(dir, {
                requests: 4,
                aggregateAssertions: [{ type: "statusCount", status: 99, count: 4 }],
            })),
        ];
        const rawAggregateValuesSuppressed = !originalReportJson.includes("message-1")
            && !originalReportJson.includes("resource-1")
            && originalReportJson.includes("raw aggregate values suppressed");
        const baselineEvidence = passingResults[0]?.concurrency;
        const directIntegrityChecks = baselineEvidence ? [
            (() => {
                const evidence = structuredClone(baselineEvidence);
                evidence.requests.pop();
                return (0, http_concurrency_1.httpConcurrencyEvidenceErrors)(evidence);
            })(),
            (() => {
                const evidence = structuredClone(baselineEvidence);
                evidence.requests[0].statusCode = null;
                return (0, http_concurrency_1.httpConcurrencyEvidenceErrors)(evidence);
            })(),
            (() => {
                const evidence = structuredClone(baselineEvidence);
                evidence.requests[0].aggregateValues[0].sha256 = "not-a-digest";
                return (0, http_concurrency_1.httpConcurrencyEvidenceErrors)(evidence);
            })(),
        ] : [];
        const requestEvidenceComplete = passingResults.every(result => result.concurrency?.requests.length === result.concurrency.requested
            && result.concurrency.requests.every((request, index) => request.requestIndex === index
                && request.requestNumber === index + 1
                && request.status === "passed"
                && request.statusCode === 201
                && request.aggregateValues.every(value => value.present
                    && typeof value.sha256 === "string"
                    && value.sha256.length === 64
                    && Number(value.serializedBytes) > 0)));
        const pass = passingReport.status === "passed"
            && passingReport.recommendation === "accept"
            && passingResults.length === 2
            && passingResults.every(result => result.status === "passed"
                && result.concurrency?.requested === 4
                && result.concurrency.completed === 4
                && result.concurrency.passed === 4
                && result.concurrency.failed === 0
                && result.concurrency.blocked === 0
                && result.concurrency.overlapObserved
                && result.concurrency.maxInFlight >= 2
                && result.concurrency.aggregateAssertions.every(assertion => assertion.status === "passed"))
            && requestEvidenceComplete
            && service.maximumActiveRequests() >= 2
            && passingReport.httpConcurrencySummary?.checks === 2
            && passingReport.httpConcurrencySummary.requests === 8
            && passingReport.httpConcurrencySummary.failed === 0
            && passingReport.httpConcurrencySummary.blocked === 0
            && passingReport.acceptanceCoverage.every(item => item.status === "verified")
            && rawAggregateValuesSuppressed
            && brokenReport.status === "failed"
            && brokenResult?.status === "failed"
            && brokenResult.concurrency?.aggregateAssertions.some(assertion => assertion.name === "http:concurrency:jsonPathAllEqual"
                && assertion.status === "failed")
            && blockedReport.status === "blocked"
            && blockedResult?.status === "blocked"
            && blockedResult.concurrency?.blocked === 3
            && blockedResult.concurrency.failed === 0
            && blockedResult.concurrency.requests.every(request => request.status === "blocked"
                && request.statusCode === null)
            && invalidContracts.every(validation => !validation.valid)
            && (0, contract_1.validateTestAgentReportContract)(passingReport).valid
            && (0, contract_1.validateTestAgentReportContract)(brokenReport).valid
            && (0, contract_1.validateTestAgentReportContract)(blockedReport).valid
            && (0, contract_1.validateTestAgentVerdictContract)(verdict).valid
            && artifactVerification.status === "passed"
            && artifactVerification.items.some(item => item.type === "http_concurrency_evidence"
                && item.status === "passed")
            && reportTamperedVerification.status === "failed"
            && reportTamperedVerification.items.some(item => item.type === "http_concurrency_evidence"
                && item.status === "failed"
                && String(item.error || "").includes("requestNumber"))
            && statusTamperedVerification.status === "failed"
            && statusTamperedVerification.items.some(item => item.type === "http_concurrency_evidence"
                && item.status === "failed"
                && String(item.error || "").includes("status must be passed"))
            && verdictTamperedVerification.status === "failed"
            && verdictTamperedVerification.items.some(item => item.type === "verdict_consistency"
                && item.status === "failed"
                && String(item.error || "").includes("httpConcurrencySummary"))
            && plan.valid
            && plan.summary.httpConcurrencyChecks === 2
            && plan.summary.httpConcurrentRequests === 8
            && plan.projects[0].httpChecks.every(check => check.concurrentRequests === 4
                && check.concurrencyAssertionCount === 3)
            && planSummary.includes("HTTP concurrency plan: checks:2 requests:8")
            && cliSummary.includes("HTTP concurrency: checks=2; requests=8")
            && markdown.includes("## HTTP Concurrency Summary")
            && markdown.includes("raw aggregate values suppressed")
            && fs.readFileSync(paths.markdownPath, "utf-8").includes("Max in flight")
            && directIntegrityChecks.length === 3
            && directIntegrityChecks.every(errors => errors.length > 0);
        return {
            pass,
            passingReport,
            brokenReport,
            blockedReport,
            plan,
            artifactVerification,
            reportTamperedVerification,
            statusTamperedVerification,
            verdictTamperedVerification,
            invalidContracts,
        };
    }
    finally {
        await close(service.server);
        try {
            fs.rmSync(dir, { recursive: true, force: true });
        }
        catch { }
    }
}
//# sourceMappingURL=http-concurrency-self-test.js.map