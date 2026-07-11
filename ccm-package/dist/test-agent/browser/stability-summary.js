"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_BROWSER_STABILITY_RUNS = void 0;
exports.browserCheckStabilityRuns = browserCheckStabilityRuns;
exports.browserStabilityGroupId = browserStabilityGroupId;
exports.withBrowserStabilityMetadata = withBrowserStabilityMetadata;
exports.browserStabilityMetadata = browserStabilityMetadata;
exports.buildBrowserStabilitySummary = buildBrowserStabilitySummary;
exports.formatBrowserStabilitySummaryLine = formatBrowserStabilitySummaryLine;
exports.formatBrowserStabilityAttentionLines = formatBrowserStabilityAttentionLines;
exports.MAX_BROWSER_STABILITY_RUNS = 10;
function browserCheckStabilityRuns(check) {
    const parsed = Number(check.stabilityRuns ?? check.stability_runs ?? 1);
    if (!Number.isFinite(parsed))
        return 1;
    return Math.max(1, Math.min(exports.MAX_BROWSER_STABILITY_RUNS, Math.floor(parsed)));
}
function browserStabilityGroupId(project, check, index) {
    return [String(project || ""), String(index), String(check.name || `Browser check ${index + 1}`)].join("::");
}
function withBrowserStabilityMetadata(input) {
    if (input.runs <= 1)
        return input.result;
    return {
        ...input.result,
        context: {
            ...(input.result.context || {}),
            browserStability: true,
            stabilityGroupId: input.groupId,
            stabilityRun: input.run,
            stabilityRuns: input.runs,
        },
    };
}
function browserStabilityMetadata(result) {
    const runs = Number(result.context?.stabilityRuns || 0);
    const run = Number(result.context?.stabilityRun || 0);
    const groupId = String(result.context?.stabilityGroupId || "").trim();
    if (result.context?.browserStability !== true && runs <= 1)
        return null;
    if (!groupId || !Number.isInteger(run) || run <= 0 || !Number.isInteger(runs) || runs <= 1)
        return null;
    return { groupId, run, runs };
}
function emptyResultCounts() {
    return { passed: 0, failed: 0, blocked: 0, skipped: 0 };
}
function emptyStabilityCounts() {
    return { stable_pass: 0, stable_fail: 0, flaky: 0, blocked: 0 };
}
function groupStatus(expectedRuns, entries) {
    const results = entries.map(entry => entry.result);
    const runs = entries.map(entry => entry.metadata.run);
    const metadataIsConsistent = entries.every(entry => entry.metadata.runs === expectedRuns);
    const runSet = new Set(runs);
    const hasEveryRun = Array.from({ length: expectedRuns }, (_, index) => index + 1).every(run => runSet.has(run));
    if (!metadataIsConsistent || results.length !== expectedRuns || runSet.size !== expectedRuns || !hasEveryRun)
        return "blocked";
    if (results.some(result => result.status === "blocked" || result.status === "skipped"))
        return "blocked";
    if (results.every(result => result.status === "passed"))
        return "stable_pass";
    if (results.every(result => result.status === "failed"))
        return "stable_fail";
    return "flaky";
}
function failureLine(result, run) {
    const failedStep = result.steps.find(step => step.status === "failed");
    const reason = result.error || failedStep?.error || failedStep?.detail || failedStep?.name || result.status;
    return `run ${run}: ${reason}`;
}
function buildBrowserStabilitySummary(browserResults) {
    const groups = new Map();
    for (const result of browserResults) {
        const metadata = browserStabilityMetadata(result);
        if (!metadata)
            continue;
        const group = groups.get(metadata.groupId) || [];
        group.push({ result, metadata });
        groups.set(metadata.groupId, group);
    }
    const items = [];
    for (const [groupId, entries] of groups) {
        entries.sort((a, b) => a.metadata.run - b.metadata.run);
        const results = entries.map(entry => entry.result);
        const expectedRuns = Math.max(...entries.map(entry => entry.metadata.runs));
        const statusCounts = emptyResultCounts();
        for (const result of results)
            statusCounts[result.status] += 1;
        const status = groupStatus(expectedRuns, entries);
        const failedRuns = entries.filter(entry => entry.result.status === "failed").map(entry => entry.metadata.run);
        const blockedRuns = entries.filter(entry => entry.result.status === "blocked").map(entry => entry.metadata.run);
        const skippedRuns = entries.filter(entry => entry.result.status === "skipped").map(entry => entry.metadata.run);
        const firstFailureEntry = entries.find(entry => entry.result.status === "failed" || entry.result.status === "blocked");
        const first = entries[0];
        items.push({
            groupId,
            project: first?.result.project || "",
            name: first?.result.name || "",
            provider: first?.result.provider,
            probeType: first?.result.probeType,
            expectedRuns,
            runCount: results.length,
            status,
            statusCounts,
            failedRuns,
            blockedRuns,
            skippedRuns,
            durationMs: results.reduce((sum, result) => sum + Number(result.durationMs || 0), 0),
            screenshotCount: results.reduce((sum, result) => sum + (result.screenshots || []).length, 0),
            ...(firstFailureEntry ? { firstFailure: failureLine(firstFailureEntry.result, firstFailureEntry.metadata.run) } : {}),
        });
    }
    items.sort((a, b) => a.groupId.localeCompare(b.groupId));
    const statusCounts = emptyStabilityCounts();
    for (const item of items)
        statusCounts[item.status] += 1;
    return {
        total: items.length,
        statusCounts,
        expectedRunCount: items.reduce((sum, item) => sum + item.expectedRuns, 0),
        runCount: items.reduce((sum, item) => sum + item.runCount, 0),
        passedRunCount: items.reduce((sum, item) => sum + item.statusCounts.passed, 0),
        failedRunCount: items.reduce((sum, item) => sum + item.statusCounts.failed, 0),
        blockedRunCount: items.reduce((sum, item) => sum + item.statusCounts.blocked, 0),
        skippedRunCount: items.reduce((sum, item) => sum + item.statusCounts.skipped, 0),
        screenshotCount: items.reduce((sum, item) => sum + item.screenshotCount, 0),
        items,
    };
}
function formatBrowserStabilitySummaryLine(summary) {
    if (!summary)
        return "groups=0; stable=0; flaky=0; failed=0; blocked=0; runs=0/0";
    return [
        `groups=${summary.total}`,
        `stable=${summary.statusCounts.stable_pass}`,
        `flaky=${summary.statusCounts.flaky}`,
        `failed=${summary.statusCounts.stable_fail}`,
        `blocked=${summary.statusCounts.blocked}`,
        `runs=${summary.runCount}/${summary.expectedRunCount}`,
    ].join("; ");
}
function formatBrowserStabilityAttentionLines(summary, limit = 5) {
    const attention = (summary?.items || []).filter(item => item.status !== "stable_pass");
    if (!attention.length)
        return ["Browser stability attention: none"];
    return [
        "Browser stability attention:",
        ...attention.slice(0, Math.max(0, limit)).map(item => `- ${item.project} / ${item.name}: ${item.status}; runs=${item.runCount}/${item.expectedRuns}; failedRuns=${item.failedRuns.join(",") || "none"}; blockedRuns=${item.blockedRuns.join(",") || "none"}${item.firstFailure ? `; first=${item.firstFailure}` : ""}`),
    ];
}
//# sourceMappingURL=stability-summary.js.map