"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildBrowserInteractionSummary = buildBrowserInteractionSummary;
function stepType(name) {
    const text = String(name || "");
    const index = text.indexOf(":");
    return index >= 0 ? text.slice(index + 1) || text : text;
}
function countByType(steps) {
    const counts = {};
    for (const step of steps) {
        const type = stepType(step.name);
        counts[type] = (counts[type] || 0) + 1;
    }
    return counts;
}
function compactStep(step) {
    return {
        kind: step.kind,
        name: step.name,
        status: step.status,
        ...(step.detail ? { detail: step.detail } : {}),
        ...(step.error ? { error: step.error } : {}),
    };
}
function buildBrowserInteractionSummary(browserResults) {
    return browserResults.map(result => {
        const actionSteps = result.steps.filter(step => step.kind === "action");
        const assertionSteps = result.steps.filter(step => step.kind === "assertion");
        const failedSteps = result.steps.filter(step => step.status === "failed");
        return {
            project: result.project,
            name: result.name,
            provider: result.provider,
            status: result.status,
            url: result.url,
            ...(result.finalUrl ? { finalUrl: result.finalUrl } : {}),
            ...(result.probeType ? { probeType: result.probeType } : {}),
            actionCount: actionSteps.length,
            assertionCount: assertionSteps.length,
            passedActions: actionSteps.filter(step => step.status === "passed").length,
            failedActions: actionSteps.filter(step => step.status === "failed").length,
            passedAssertions: assertionSteps.filter(step => step.status === "passed").length,
            failedAssertions: assertionSteps.filter(step => step.status === "failed").length,
            actionTypes: countByType(actionSteps),
            assertionTypes: countByType(assertionSteps),
            actionSteps: actionSteps.map(compactStep),
            failedSteps: failedSteps.map(compactStep),
        };
    });
}
//# sourceMappingURL=interaction-summary.js.map