"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processStartFailure = processStartFailure;
exports.browserFailureObservation = browserFailureObservation;
/** Only executor facts belong here. Error prose is never a routing input. */
function processStartFailure(code) {
    return { failure_code: code === "ENOENT" ? "program_not_found" : ["EACCES", "EPERM"].includes(code) ? "program_permission_denied" : "program_start_failed",
        failure_stage: "program_start", failure_kind: ["EACCES", "EPERM"].includes(code) ? "permission" : code === "ENOENT" ? "environment" : "unknown" };
}
function browserFailureObservation(result) {
    if (result.failure_kind || result.status === "passed")
        return {};
    const auth = result.authentication;
    if (auth && (["failed", "blocked"].includes(auth.status) || auth.mode === "managed" && (auth.credentialEnvNames?.length || auth.storageState) && result.status !== "passed")) {
        return { failure_code: "authentication_not_verified", failure_stage: "authentication", failure_kind: "evidence" };
    }
    const steps = Array.isArray(result.steps) ? result.steps : [];
    if (steps.some((step) => step.kind === "assertion" && step.status === "failed")) {
        return { failure_code: "browser_assertion_failed", failure_stage: "assertion", failure_kind: "implementation" };
    }
    if (steps.some((step) => step.kind === "action" && step.status === "failed")) {
        return { failure_code: "browser_operation_failed", failure_stage: "operation", failure_kind: "unknown" };
    }
    return { failure_code: "browser_evidence_incomplete", failure_stage: "operation", failure_kind: "evidence" };
}
//# sourceMappingURL=failure-observation.js.map