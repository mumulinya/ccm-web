"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runBrowserVerification = runBrowserVerification;
const registry_1 = require("./browser/registry");
async function runBrowserVerification(workOrder, runtime = {}) {
    return (0, registry_1.runBrowserVerificationWithProviders)(workOrder, runtime);
}
