"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.invokeTestAgent = invokeTestAgent;
exports.invokeTestAgentHandoff = invokeTestAgentHandoff;
exports.invokeTestAgentWorkOrder = invokeTestAgentWorkOrder;
const agent_1 = require("./agent");
const artifact_verifier_1 = require("./artifact-verifier");
const contract_1 = require("./contract");
const utils_1 = require("./utils");
const verdict_1 = require("./verdict");
function sourceFor(request) {
    const source = String(request?.source || "");
    return source === "handoff" || source === "work_order" ? source : "unknown";
}
function validationSnapshot(input) {
    return {
        valid: input.valid,
        errors: input.errors.map(issue => ({ ...issue })),
        warnings: input.warnings.map(issue => ({ ...issue })),
    };
}
function finishedResult(base) {
    const finishedAt = (0, utils_1.nowIso)();
    return {
        ...base,
        finishedAt,
        durationMs: Date.parse(finishedAt) - Date.parse(base.startedAt),
    };
}
function runtimeIssue(message) {
    return {
        severity: "error",
        code: "test_agent_invocation_output_error",
        message,
    };
}
async function invokeTestAgent(request, runtime = {}) {
    const startedAt = (0, utils_1.nowIso)();
    const invocationId = (0, utils_1.makeRunId)("test-agent-invocation");
    const source = sourceFor(request);
    const envelopeValidation = (0, contract_1.validateTestAgentInvocationRequestContract)(request);
    if (!envelopeValidation.valid) {
        return finishedResult({
            schema: contract_1.TEST_AGENT_CONTRACT_IDS.invocationResult,
            invocationId,
            source,
            status: "rejected",
            startedAt,
            inputValidation: validationSnapshot(envelopeValidation),
            canAccept: false,
        });
    }
    const typedRequest = request;
    const payloadValidation = typedRequest.source === "handoff"
        ? (0, contract_1.validateTestAgentHandoffContract)(typedRequest.payload, runtime)
        : (0, contract_1.validateTestAgentWorkOrderContract)(typedRequest.payload, runtime);
    const inputValidation = validationSnapshot(payloadValidation);
    if (!payloadValidation.valid) {
        return finishedResult({
            schema: contract_1.TEST_AGENT_CONTRACT_IDS.invocationResult,
            invocationId,
            source: typedRequest.source,
            status: "rejected",
            startedAt,
            inputValidation,
            canAccept: false,
        });
    }
    const workOrder = typedRequest.source === "handoff"
        ? payloadValidation.workOrder
        : typedRequest.payload;
    try {
        const report = await (0, agent_1.runTestAgent)(workOrder, runtime);
        const verdict = (0, verdict_1.buildTestAgentVerdict)(report);
        const reportValidation = (0, contract_1.validateTestAgentReportContract)(report);
        const verdictValidation = (0, contract_1.validateTestAgentVerdictContract)(verdict);
        let artifactVerification;
        const outputErrors = [...reportValidation.errors, ...verdictValidation.errors];
        const outputWarnings = [...reportValidation.warnings, ...verdictValidation.warnings];
        const manifestPath = String(report.metadata?.artifactFiles?.manifestPath || "");
        if (!manifestPath) {
            outputErrors.push(runtimeIssue("TestAgent report did not expose an artifact manifest path."));
        }
        else {
            try {
                artifactVerification = (0, artifact_verifier_1.verifyTestAgentArtifactManifestFile)(manifestPath);
                if (artifactVerification.status !== "passed") {
                    outputErrors.push(runtimeIssue(`Artifact verification failed for ${manifestPath}.`));
                }
            }
            catch (error) {
                outputErrors.push(runtimeIssue(`Artifact verification could not run: ${error.message || String(error)}`));
            }
        }
        const outputValidation = {
            valid: outputErrors.length === 0,
            errors: outputErrors,
            warnings: outputWarnings,
        };
        if (!outputValidation.valid || !artifactVerification) {
            return finishedResult({
                schema: contract_1.TEST_AGENT_CONTRACT_IDS.invocationResult,
                invocationId,
                source: typedRequest.source,
                status: "runtime_error",
                startedAt,
                inputValidation,
                outputValidation,
                outcome: report.status,
                recommendation: report.recommendation,
                canAccept: false,
                ...(reportValidation.valid ? { report } : {}),
                ...(verdictValidation.valid ? { verdict } : {}),
                ...(artifactVerification ? { artifactVerification } : {}),
                error: outputErrors.map(issue => issue.message).join(" ") || "TestAgent output validation failed.",
            });
        }
        return finishedResult({
            schema: contract_1.TEST_AGENT_CONTRACT_IDS.invocationResult,
            invocationId,
            source: typedRequest.source,
            status: "completed",
            startedAt,
            inputValidation,
            outputValidation,
            outcome: report.status,
            recommendation: report.recommendation,
            canAccept: verdict.canAccept,
            report,
            verdict,
            artifactVerification,
        });
    }
    catch (error) {
        return finishedResult({
            schema: contract_1.TEST_AGENT_CONTRACT_IDS.invocationResult,
            invocationId,
            source: typedRequest.source,
            status: "runtime_error",
            startedAt,
            inputValidation,
            canAccept: false,
            error: error.message || String(error),
        });
    }
}
function invokeTestAgentHandoff(handoff, runtime = {}) {
    return invokeTestAgent({
        schema: contract_1.TEST_AGENT_CONTRACT_IDS.invocationRequest,
        source: "handoff",
        payload: handoff,
    }, runtime);
}
function invokeTestAgentWorkOrder(workOrder, runtime = {}) {
    return invokeTestAgent({
        schema: contract_1.TEST_AGENT_CONTRACT_IDS.invocationRequest,
        source: "work_order",
        payload: workOrder,
    }, runtime);
}
//# sourceMappingURL=invocation.js.map