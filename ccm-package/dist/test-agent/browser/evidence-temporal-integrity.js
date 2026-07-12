"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BROWSER_TEMPORAL_TOLERANCE_MS = void 0;
exports.buildBrowserEvidenceTemporalIntegrity = buildBrowserEvidenceTemporalIntegrity;
exports.browserEvidenceTemporalIntegrityErrors = browserEvidenceTemporalIntegrityErrors;
exports.formatBrowserEvidenceTemporalIntegrityLine = formatBrowserEvidenceTemporalIntegrityLine;
exports.formatBrowserEvidenceTemporalIntegrityAttentionLines = formatBrowserEvidenceTemporalIntegrityAttentionLines;
const tool_evidence_lineage_1 = require("./tool-evidence-lineage");
exports.BROWSER_TEMPORAL_TOLERANCE_MS = 100;
function timestampMs(value, item, counts, field) {
    const parsed = typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
        ? Date.parse(value)
        : Number.NaN;
    if (!Number.isFinite(parsed)) {
        item.errors.push(`${field} is not a canonical UTC ISO timestamp.`);
        counts.invalidTimestampCount += 1;
    }
    return parsed;
}
function validateInterval(item, counts, toleranceMs) {
    const started = timestampMs(item.startedAt, item, counts, "startedAt");
    const finished = timestampMs(item.finishedAt, item, counts, "finishedAt");
    if (!Number.isFinite(started) || !Number.isFinite(finished))
        return { started, finished };
    if (finished < started) {
        item.errors.push("finishedAt is earlier than startedAt.");
        counts.invalidTimestampCount += 1;
    }
    const elapsed = finished - started;
    if (!Number.isFinite(item.durationMs) || item.durationMs < 0 || Math.abs(item.durationMs - elapsed) > toleranceMs) {
        item.errors.push(`durationMs does not match the timestamp interval within ${toleranceMs}ms.`);
        counts.durationMismatchCount += 1;
    }
    return { started, finished };
}
function insideWindow(started, finished, windowStarted, windowFinished, toleranceMs) {
    return Number.isFinite(started)
        && Number.isFinite(finished)
        && Number.isFinite(windowStarted)
        && Number.isFinite(windowFinished)
        && started >= windowStarted - toleranceMs
        && finished <= windowFinished + toleranceMs;
}
function finalize(item) {
    item.status = item.errors.length ? "invalid" : "complete";
    return item;
}
function buildBrowserEvidenceTemporalIntegrity(input, toleranceMs = exports.BROWSER_TEMPORAL_TOLERANCE_MS) {
    const counts = {
        invalidTimestampCount: 0,
        durationMismatchCount: 0,
        outsideReportWindowCount: 0,
        outsideResultWindowCount: 0,
        planMismatchCount: 0,
    };
    const items = [];
    const reportItem = {
        kind: "report",
        id: "report",
        startedAt: input.startedAt,
        finishedAt: input.finishedAt,
        durationMs: input.durationMs,
        status: "complete",
        errors: [],
    };
    const reportInterval = validateInterval(reportItem, counts, toleranceMs);
    items.push(finalize(reportItem));
    if (input.plan) {
        const planItem = {
            kind: "execution_plan",
            id: input.plan.planId || "missing-plan-id",
            startedAt: input.plan.createdAt,
            finishedAt: input.plan.createdAt,
            durationMs: 0,
            status: "complete",
            errors: [],
        };
        const interval = validateInterval(planItem, counts, toleranceMs);
        if (!insideWindow(interval.started, interval.finished, reportInterval.started, reportInterval.finished, toleranceMs)) {
            planItem.errors.push("execution plan createdAt is outside the report time window.");
            counts.outsideReportWindowCount += 1;
        }
        items.push(finalize(planItem));
    }
    const resultIntervals = new Map();
    for (const [index, result] of input.browserResults.entries()) {
        const execution = result.execution;
        const item = {
            kind: "browser_result",
            id: execution ? (0, tool_evidence_lineage_1.browserExecutionLineageKey)(execution) : `diagnostic:${index + 1}`,
            ...(execution ? { checkId: execution.checkId, run: execution.run } : {}),
            startedAt: result.startedAt,
            finishedAt: result.finishedAt,
            durationMs: result.durationMs,
            status: "complete",
            errors: [],
        };
        const interval = validateInterval(item, counts, toleranceMs);
        if (!insideWindow(interval.started, interval.finished, reportInterval.started, reportInterval.finished, toleranceMs)) {
            item.errors.push("browser result is outside the report time window.");
            counts.outsideReportWindowCount += 1;
        }
        if (execution && execution.planId !== input.plan?.planId) {
            item.errors.push("browser result execution planId does not match the report execution plan.");
            counts.planMismatchCount += 1;
        }
        if (execution)
            resultIntervals.set((0, tool_evidence_lineage_1.browserExecutionLineageKey)(execution), interval);
        items.push(finalize(item));
    }
    for (const record of input.browserToolCalls) {
        const execution = record.browserExecution;
        const item = {
            kind: "browser_tool_call",
            id: record.id,
            ...(execution ? { checkId: execution.checkId, run: execution.run } : {}),
            startedAt: record.startedAt,
            finishedAt: record.finishedAt,
            durationMs: record.durationMs,
            status: "complete",
            errors: [],
        };
        const interval = validateInterval(item, counts, toleranceMs);
        if (!insideWindow(interval.started, interval.finished, reportInterval.started, reportInterval.finished, toleranceMs)) {
            item.errors.push("browser tool call is outside the report time window.");
            counts.outsideReportWindowCount += 1;
        }
        if (execution && execution.planId !== input.plan?.planId) {
            item.errors.push("browser tool call execution planId does not match the report execution plan.");
            counts.planMismatchCount += 1;
        }
        const owner = execution ? resultIntervals.get((0, tool_evidence_lineage_1.browserExecutionLineageKey)(execution)) : undefined;
        if (owner && !insideWindow(interval.started, interval.finished, owner.started, owner.finished, toleranceMs)) {
            item.errors.push("browser tool call is outside its owning browser result time window.");
            counts.outsideResultWindowCount += 1;
        }
        items.push(finalize(item));
    }
    const invalidItemCount = items.filter(item => item.status === "invalid").length;
    return {
        status: invalidItemCount ? "invalid" : "complete",
        toleranceMs,
        reportDurationMs: input.durationMs,
        browserResultCount: input.browserResults.length,
        browserToolCallCount: input.browserToolCalls.length,
        invalidItemCount,
        ...counts,
        items,
    };
}
function browserEvidenceTemporalIntegrityErrors(report) {
    const expected = buildBrowserEvidenceTemporalIntegrity({
        startedAt: report.startedAt,
        finishedAt: report.finishedAt,
        durationMs: report.durationMs,
        plan: report.metadata?.browserCheckExecutionPlan,
        browserResults: report.browserResults || [],
        browserToolCalls: report.browserToolCalls || [],
    });
    const errors = [];
    if (!report.browserEvidenceTemporalIntegrity)
        errors.push("browserEvidenceTemporalIntegrity is missing.");
    else if (JSON.stringify(report.browserEvidenceTemporalIntegrity) !== JSON.stringify(expected)) {
        errors.push("browserEvidenceTemporalIntegrity does not match report, browser result, and browser tool-call timestamps.");
    }
    for (const item of expected.items) {
        for (const error of item.errors)
            errors.push(`${item.kind} ${item.id}: ${error}`);
    }
    if (report.status === "passed" && expected.status !== "complete") {
        errors.push("passed report has invalid browser evidence temporal integrity.");
    }
    return errors;
}
function formatBrowserEvidenceTemporalIntegrityLine(summary) {
    if (!summary)
        return "status=invalid; items=0; timestamps=0; durations=0; reportWindow=0; resultWindow=0; planMismatch=0";
    return [
        `status=${summary.status}`,
        `items=${summary.items.length}`,
        `timestamps=${summary.invalidTimestampCount}`,
        `durations=${summary.durationMismatchCount}`,
        `reportWindow=${summary.outsideReportWindowCount}`,
        `resultWindow=${summary.outsideResultWindowCount}`,
        `planMismatch=${summary.planMismatchCount}`,
    ].join("; ");
}
function formatBrowserEvidenceTemporalIntegrityAttentionLines(summary, limit = 5) {
    const attention = (summary?.items || []).filter(item => item.status === "invalid");
    if (!attention.length)
        return ["Browser temporal evidence attention: none"];
    return [
        "Browser temporal evidence attention:",
        ...attention.slice(0, Math.max(0, limit)).map(item => `- ${item.kind} ${item.id}: ${item.errors.join("; ")}`),
    ];
}
//# sourceMappingURL=evidence-temporal-integrity.js.map