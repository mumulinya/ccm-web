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
exports.runTestAgentInvocationSelfTest = runTestAgentInvocationSelfTest;
const fs = __importStar(require("fs"));
const http = __importStar(require("http"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const contract_1 = require("./contract");
const invocation_1 = require("./invocation");
const playwright_provider_1 = require("./browser/playwright-provider");
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
async function closedPort() {
    const server = http.createServer();
    const port = await listen(server);
    await close(server);
    return port;
}
function handoff(dir, artifactName, baseUrl, expectedText) {
    const criterion = `${expectedText} is visible in the browser`;
    return {
        id: `invocation-handoff-${artifactName}-${process.pid}-${Date.now()}`,
        taskId: "invocation-task",
        groupId: "invocation-group",
        issuedBy: "group-main-agent",
        originalUserGoal: "Verify the delivered web page through a real browser.",
        acceptanceCriteria: [criterion],
        requiredChecks: ["browser_e2e"],
        completedByProjectAgents: ["web-project-agent"],
        projects: [{
                name: "invocation-web",
                workDir: dir,
                targetUrl: baseUrl,
                browserChecks: [{
                        name: "Invocation browser acceptance",
                        url: baseUrl,
                        actions: [{ type: "goto", url: baseUrl }],
                        assertions: [{ type: "text", text: expectedText, timeoutMs: 1_000 }],
                        coversAcceptanceCriteria: [criterion],
                        screenshot: false,
                    }],
            }],
        options: {
            artifactDir: path.join(dir, artifactName),
            browserProvider: "playwright",
            browserTimeoutMs: 2_000,
            collectBrowserArtifacts: false,
            collectBrowserVideo: false,
            requireAdversarialProbe: false,
            adversarialProbeWaiver: "Invocation self-test targets the integration boundary.",
        },
    };
}
async function runTestAgentInvocationSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
    if (!availability.available)
        return { pass: false, availability, reason: availability.reason };
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-invocation-"));
    const server = http.createServer((_request, response) => {
        response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        response.end("<!doctype html><title>Invocation</title><main><h1>Invocation fixture ready</h1></main>");
    });
    const port = await listen(server);
    const baseUrl = `http://127.0.0.1:${port}`;
    try {
        const request = {
            schema: "ccm-test-agent-invocation-request-v1",
            source: "handoff",
            payload: handoff(dir, "passed-artifacts", baseUrl, "Invocation fixture ready"),
        };
        const requestContract = (0, contract_1.validateTestAgentInvocationRequestContract)(request);
        const passed = await (0, invocation_1.invokeTestAgentHandoff)(request.payload, { browserProvider: "playwright" });
        const passedContract = (0, contract_1.validateTestAgentInvocationResultContract)(passed);
        const failed = await (0, invocation_1.invokeTestAgentHandoff)(handoff(dir, "failed-artifacts", baseUrl, "Missing invocation text"), { browserProvider: "playwright" });
        const failedContract = (0, contract_1.validateTestAgentInvocationResultContract)(failed);
        const unavailablePort = await closedPort();
        const blockedWorkOrder = {
            schema: "ccm-test-agent-work-order-v1",
            id: `invocation-blocked-${process.pid}-${Date.now()}`,
            originalUserGoal: "Verify a web target that is currently unavailable.",
            acceptanceCriteria: ["Unavailable target should be reported as blocked"],
            requiredChecks: ["browser_e2e"],
            projects: [{
                    name: "invocation-blocked",
                    workDir: dir,
                    targetUrl: `http://127.0.0.1:${unavailablePort}`,
                    browserChecks: [{ name: "Blocked browser target", screenshot: false }],
                }],
            options: {
                artifactDir: path.join(dir, "blocked-artifacts"),
                browserProvider: "none",
                collectBrowserArtifacts: false,
                collectBrowserVideo: false,
                requireAdversarialProbe: false,
                adversarialProbeWaiver: "Invocation blocked-path fixture.",
            },
        };
        const blocked = await (0, invocation_1.invokeTestAgentWorkOrder)(blockedWorkOrder, { browserProvider: "none" });
        const blockedContract = (0, contract_1.validateTestAgentInvocationResultContract)(blocked);
        const rejectedEnvelope = await (0, invocation_1.invokeTestAgent)({
            schema: "invalid-invocation-schema",
            source: "unknown",
            payload: {},
        });
        const rejectedEnvelopeContract = (0, contract_1.validateTestAgentInvocationResultContract)(rejectedEnvelope);
        const rejectedPayload = await (0, invocation_1.invokeTestAgent)({
            schema: "ccm-test-agent-invocation-request-v1",
            source: "handoff",
            payload: {
                id: "invalid-handoff-without-projects",
                originalUserGoal: "This handoff is intentionally incomplete.",
            },
        });
        const rejectedPayloadContract = (0, contract_1.validateTestAgentInvocationResultContract)(rejectedPayload);
        const pass = requestContract.valid
            && passed.status === "completed"
            && passed.outcome === "passed"
            && passed.recommendation === "accept"
            && passed.canAccept === true
            && passed.inputValidation.valid
            && passed.outputValidation?.valid === true
            && passed.report?.status === "passed"
            && passed.verdict?.canAccept === true
            && passed.artifactVerification?.status === "passed"
            && passedContract.valid
            && failed.status === "completed"
            && failed.outcome === "failed"
            && failed.canAccept === false
            && failed.outputValidation?.valid === true
            && failed.report?.status === "failed"
            && failed.verdict?.needsRework === true
            && failed.artifactVerification?.status === "passed"
            && failedContract.valid
            && blocked.status === "completed"
            && ["blocked", "partial"].includes(String(blocked.outcome))
            && blocked.canAccept === false
            && blocked.outputValidation?.valid === true
            && blocked.verdict?.needsHuman === true
            && blocked.artifactVerification?.status === "passed"
            && blockedContract.valid
            && rejectedEnvelope.status === "rejected"
            && rejectedEnvelope.source === "unknown"
            && rejectedEnvelope.canAccept === false
            && rejectedEnvelope.inputValidation.valid === false
            && !rejectedEnvelope.report
            && rejectedEnvelopeContract.valid
            && rejectedPayload.status === "rejected"
            && rejectedPayload.source === "handoff"
            && rejectedPayload.canAccept === false
            && rejectedPayload.inputValidation.valid === false
            && rejectedPayload.inputValidation.errors.length > 0
            && !rejectedPayload.report
            && rejectedPayloadContract.valid;
        return {
            pass,
            report: passed.report,
            requestContract,
            passed,
            passedContract,
            failed,
            failedContract,
            blocked,
            blockedContract,
            rejectedEnvelope,
            rejectedEnvelopeContract,
            rejectedPayload,
            rejectedPayloadContract,
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
//# sourceMappingURL=invocation-self-test.js.map