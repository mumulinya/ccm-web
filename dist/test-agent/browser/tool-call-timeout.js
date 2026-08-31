"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MIN_BROWSER_TOOL_CALL_TIMEOUT_MS = void 0;
exports.isBrowserToolCallTimeout = isBrowserToolCallTimeout;
exports.browserResultHasToolCallTimeout = browserResultHasToolCallTimeout;
exports.buildBrowserToolCallTimeoutSummary = buildBrowserToolCallTimeoutSummary;
exports.browserToolCallTimeoutEvidenceErrors = browserToolCallTimeoutEvidenceErrors;
exports.formatBrowserToolCallTimeoutSummaryLine = formatBrowserToolCallTimeoutSummaryLine;
exports.formatBrowserToolCallTimeoutAttentionLines = formatBrowserToolCallTimeoutAttentionLines;
exports.MIN_BROWSER_TOOL_CALL_TIMEOUT_MS = 1_000;
function isBrowserToolCallTimeout(value) {
    return value?.code === "BROWSER_TOOL_CALL_TIMEOUT"
        || /browser tool call timed out after \d+ms/i.test(String(value?.message || value?.error || value || ""));
}
function browserResultHasToolCallTimeout(result) {
    return isBrowserToolCallTimeout(result.error)
        || (result.steps || []).some(step => isBrowserToolCallTimeout(step.error || step.detail));
}
function buildBrowserToolCallTimeoutSummary(browserToolCalls) {
    const timedOut = browserToolCalls.filter(record => record.timedOut === true);
    const timedOutByTool = {};
    for (const record of timedOut) {
        timedOutByTool[record.toolName] = (timedOutByTool[record.toolName] || 0) + 1;
    }
    return {
        totalCalls: browserToolCalls.length,
        passedCalls: browserToolCalls.filter(record => record.status === "passed").length,
        failedCalls: browserToolCalls.filter(record => record.status === "failed").length,
        timedOutCalls: timedOut.length,
        abortRequestedCalls: browserToolCalls.filter(record => record.abortRequested === true).length,
        timedOutByTool,
        items: timedOut.map(record => ({
            id: record.id,
            toolName: record.toolName,
            ...(record.browserExecution ? {
                checkId: record.browserExecution.checkId,
                run: record.browserExecution.run,
            } : {}),
            timeoutMs: Number(record.timeoutMs || 0),
            durationMs: Number(record.durationMs || 0),
            abortRequested: record.abortRequested === true,
        })),
    };
}
function browserToolCallTimeoutEvidenceErrors(input) {
    const expected = buildBrowserToolCallTimeoutSummary(input.browserToolCalls || []);
    const errors = [];
    if (!input.summary)
        errors.push("browserToolCallTimeoutSummary is missing.");
    else if (JSON.stringify(input.summary) !== JSON.stringify(expected)) {
        errors.push("browserToolCallTimeoutSummary does not match browser tool records.");
    }
    const resultByCallId = new Map();
    for (const result of input.browserResults || []) {
        for (const id of result.browserToolCallIds || []) {
            const owners = resultByCallId.get(id) || [];
            owners.push(result);
            resultByCallId.set(id, owners);
        }
    }
    for (const [index, record] of (input.browserToolCalls || []).entries()) {
        const label = `browserToolCalls[${index}]`;
        const timeoutMs = Number(record.timeoutMs || 0);
        if (!Number.isFinite(timeoutMs) || timeoutMs < exports.MIN_BROWSER_TOOL_CALL_TIMEOUT_MS) {
            errors.push(`${label}.timeoutMs must be at least ${exports.MIN_BROWSER_TOOL_CALL_TIMEOUT_MS}.`);
        }
        if (record.timedOut === true) {
            if (record.status !== "failed")
                errors.push(`${label} timed out but status is not failed.`);
            if (record.abortRequested !== true)
                errors.push(`${label} timed out without abortRequested=true.`);
            if (record.outputPreview)
                errors.push(`${label} timed out but retained outputPreview.`);
            if (Number(record.durationMs || 0) < timeoutMs)
                errors.push(`${label}.durationMs is shorter than its timeoutMs.`);
            const allowedErrors = new Set([
                `Browser tool call timed out after ${timeoutMs}ms.`,
                "Browser tool call failed; raw provider error suppressed.",
            ]);
            if (!allowedErrors.has(String(record.error || "")))
                errors.push(`${label} has invalid timeout error evidence.`);
            const owners = resultByCallId.get(record.id) || [];
            if (owners.some(result => result.status === "passed")) {
                errors.push(`${label} timed out but is linked to a passed browser result.`);
            }
        }
        else if (record.abortRequested === true) {
            errors.push(`${label} requested abort without timedOut=true.`);
        }
    }
    if (input.reportStatus === "passed" && expected.timedOutCalls > 0) {
        errors.push("passed report contains timed-out browser tool calls.");
    }
    return errors;
}
function formatBrowserToolCallTimeoutSummaryLine(summary) {
    if (!summary)
        return "calls=0; passed=0; failed=0; timedOut=0; abortRequested=0";
    return [
        `calls=${summary.totalCalls}`,
        `passed=${summary.passedCalls}`,
        `failed=${summary.failedCalls}`,
        `timedOut=${summary.timedOutCalls}`,
        `abortRequested=${summary.abortRequestedCalls}`,
    ].join("; ");
}
function formatBrowserToolCallTimeoutAttentionLines(summary, limit = 5) {
    if (!summary?.items.length)
        return ["Browser tool timeout attention: none"];
    return [
        "Browser tool timeout attention:",
        ...summary.items.slice(0, Math.max(0, limit)).map(item => `- ${item.toolName} [${item.id}]: timeout=${item.timeoutMs}ms; duration=${item.durationMs}ms; abortRequested=${item.abortRequested}${item.checkId ? `; execution=${item.checkId} run ${item.run}` : ""}`),
    ];
}
//# sourceMappingURL=tool-call-timeout.js.map