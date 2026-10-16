"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runBrowserVerification = runBrowserVerification;
const registry_1 = require("./browser/registry");
const failure_observation_1 = require("./failure-observation");
async function runBrowserVerification(workOrder, runtime = {}) {
    const results = await (0, registry_1.runBrowserVerificationWithProviders)(workOrder, runtime);
    return results.map(result => ({ ...result, ...(0, failure_observation_1.browserFailureObservation)(result) }));
}
//# sourceMappingURL=browser-verifier.js.map