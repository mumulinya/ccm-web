"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildBrowserMultiSessionSummary = buildBrowserMultiSessionSummary;
exports.formatBrowserMultiSessionSummaryLine = formatBrowserMultiSessionSummaryLine;
exports.formatBrowserMultiSessionAttentionLines = formatBrowserMultiSessionAttentionLines;
function emptyStatusCounts() {
    return {
        passed: 0,
        failed: 0,
        blocked: 0,
        skipped: 0,
    };
}
function sessionNameFromStep(name) {
    return /^session:([^:]+):/.exec(String(name || ""))?.[1] || "";
}
function summarizeResult(result) {
    const sessions = result.browserSessions || [];
    const comparisons = result.browserSessionComparisons || [];
    const failedSteps = result.steps
        .filter(step => step.status === "failed")
        .map(step => `${step.name}${step.error ? `: ${step.error}` : step.detail ? `: ${step.detail}` : ""}`);
    const failedSessionNames = new Set();
    for (const step of result.steps.filter(step => step.status === "failed")) {
        const sessionName = sessionNameFromStep(step.name);
        if (sessionName)
            failedSessionNames.add(sessionName);
    }
    for (const comparison of comparisons.filter(item => item.status === "failed")) {
        failedSessionNames.add(comparison.leftSession);
        failedSessionNames.add(comparison.rightSession);
    }
    for (const session of sessions) {
        if (session.consoleErrors.length || session.pageErrors.length || session.networkErrors.length)
            failedSessionNames.add(session.name);
    }
    return {
        project: result.project,
        name: result.name,
        provider: result.provider,
        status: result.status,
        ...(result.probeType ? { probeType: result.probeType } : {}),
        sessionCount: sessions.length,
        sessionNames: sessions.map(session => session.name),
        parallelGroupCount: Math.max(0, Number(result.context?.parallelGroupCount || 0)),
        comparisonCount: comparisons.length,
        failedComparisonCount: comparisons.filter(item => item.status === "failed").length,
        sessions: sessions.map(session => ({
            name: session.name,
            url: session.url,
            ...(session.finalUrl ? { finalUrl: session.finalUrl } : {}),
            screenshotCount: session.screenshots.length,
            consoleErrorCount: session.consoleErrors.length,
            pageErrorCount: session.pageErrors.length,
            networkErrorCount: session.networkErrors.length,
        })),
        actionCount: result.steps.filter(step => step.kind === "action").length,
        assertionCount: result.steps.filter(step => step.kind === "assertion").length,
        failedStepCount: failedSteps.length,
        screenshotCount: result.screenshots.length,
        consoleErrorCount: result.consoleErrors.length,
        pageErrorCount: result.pageErrors.length,
        networkErrorCount: (result.networkErrors || []).length,
        failedSessionNames: [...failedSessionNames].sort(),
        failedSteps,
    };
}
function buildBrowserMultiSessionSummary(browserResults) {
    const items = browserResults
        .filter(result => (result.browserSessions || []).length >= 2)
        .map(summarizeResult);
    const statusCounts = emptyStatusCounts();
    const sessionNames = new Set();
    for (const item of items) {
        statusCounts[item.status] += 1;
        for (const sessionName of item.sessionNames)
            sessionNames.add(sessionName);
    }
    return {
        total: items.length,
        statusCounts,
        sessionCount: items.reduce((sum, item) => sum + item.sessionCount, 0),
        uniqueSessionCount: sessionNames.size,
        sessionNames: [...sessionNames].sort(),
        parallelGroupCount: items.reduce((sum, item) => sum + item.parallelGroupCount, 0),
        comparisonCount: items.reduce((sum, item) => sum + item.comparisonCount, 0),
        failedComparisonCount: items.reduce((sum, item) => sum + item.failedComparisonCount, 0),
        actionCount: items.reduce((sum, item) => sum + item.actionCount, 0),
        assertionCount: items.reduce((sum, item) => sum + item.assertionCount, 0),
        failedStepCount: items.reduce((sum, item) => sum + item.failedStepCount, 0),
        screenshotCount: items.reduce((sum, item) => sum + item.screenshotCount, 0),
        consoleErrorCount: items.reduce((sum, item) => sum + item.consoleErrorCount, 0),
        pageErrorCount: items.reduce((sum, item) => sum + item.pageErrorCount, 0),
        networkErrorCount: items.reduce((sum, item) => sum + item.networkErrorCount, 0),
        items,
    };
}
function formatBrowserMultiSessionSummaryLine(summary) {
    if (!summary)
        return "unavailable";
    const counts = summary.statusCounts;
    return `scenarios=${summary.total}; passed=${counts.passed}; failed=${counts.failed}; blocked=${counts.blocked}; sessions=${summary.sessionCount}; parallelGroups=${summary.parallelGroupCount}; roles=${summary.sessionNames.join(",") || "none"}; comparisons=${summary.comparisonCount}; failedComparisons=${summary.failedComparisonCount}`;
}
function formatBrowserMultiSessionAttentionLines(summary, limit = 5) {
    if (!summary)
        return [];
    return summary.items
        .filter(item => item.status === "failed" || item.status === "blocked" || item.failedStepCount > 0)
        .slice(0, limit)
        .map(item => {
        const failedSessions = item.failedSessionNames.length ? `; failedSessions=${item.failedSessionNames.join(",")}` : "";
        const firstFailure = item.failedSteps[0] ? `; firstFailure=${item.failedSteps[0]}` : "";
        return `- ${item.project} / ${item.name}: ${item.status}; sessions=${item.sessionNames.join(",")}${failedSessions}${firstFailure}`;
    });
}
//# sourceMappingURL=multi-session-summary.js.map