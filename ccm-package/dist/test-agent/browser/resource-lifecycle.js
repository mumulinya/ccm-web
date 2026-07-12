"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBrowserResourceLifecycleRecorder = createBrowserResourceLifecycleRecorder;
exports.buildBrowserResourceLifecycleSummary = buildBrowserResourceLifecycleSummary;
exports.browserResourceLifecycleErrors = browserResourceLifecycleErrors;
exports.formatBrowserResourceLifecycleLine = formatBrowserResourceLifecycleLine;
exports.formatBrowserResourceLifecycleAttentionLines = formatBrowserResourceLifecycleAttentionLines;
const utils_1 = require("../utils");
function cloneEvents(events) {
    return events.map(event => ({ ...event }));
}
function createBrowserResourceLifecycleRecorder() {
    const events = [];
    const byId = new Map();
    const add = (input, ownership, status) => {
        const event = {
            id: (0, utils_1.makeRunId)("browser-resource"),
            planId: input.planId,
            provider: input.provider,
            resourceType: input.resourceType,
            scope: input.scope,
            ownership,
            acquiredAt: (0, utils_1.nowIso)(),
            status,
        };
        events.push(event);
        byId.set(event.id, event);
        return event.id;
    };
    return {
        acquire: input => add(input, "owned", "open"),
        retainExternal: input => add(input, "external", "retained"),
        released(id) {
            const event = byId.get(id);
            if (!event || event.status !== "open")
                return;
            const at = (0, utils_1.nowIso)();
            event.releaseAttemptedAt = at;
            event.releasedAt = at;
            event.status = "released";
        },
        cleanupFailed(id, error) {
            const event = byId.get(id);
            if (!event || event.status !== "open")
                return;
            event.releaseAttemptedAt = (0, utils_1.nowIso)();
            event.status = "cleanup_failed";
            event.error = String(error || "Browser resource cleanup failed.");
        },
        getEvents: () => cloneEvents(events),
    };
}
function canonicalTimestamp(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value))
        return Number.NaN;
    return Date.parse(value);
}
function emptyResourceTypeCounts() {
    return { browser: 0, browser_context: 0, external_browser_session: 0 };
}
function buildBrowserResourceLifecycleSummary(input) {
    const events = cloneEvents(input.events || []);
    const ids = events.map(event => String(event.id || ""));
    const duplicateResourceCount = ids.length - new Set(ids).size;
    const reportStarted = canonicalTimestamp(input.reportStartedAt);
    const reportFinished = canonicalTimestamp(input.reportFinishedAt);
    let planMismatchCount = 0;
    let invalidOwnershipCount = 0;
    let invalidTimestampCount = 0;
    let outsideReportWindowCount = 0;
    const resourceTypeCounts = emptyResourceTypeCounts();
    for (const event of events) {
        if (event.resourceType in resourceTypeCounts)
            resourceTypeCounts[event.resourceType] += 1;
        if (!input.plan?.planId || event.planId !== input.plan.planId)
            planMismatchCount += 1;
        const validOwnership = event.ownership === "external"
            ? event.resourceType === "external_browser_session" && event.status === "retained"
            : event.resourceType !== "external_browser_session" && event.status !== "retained";
        if (!validOwnership)
            invalidOwnershipCount += 1;
        const acquired = canonicalTimestamp(event.acquiredAt);
        const attempted = event.releaseAttemptedAt === undefined ? undefined : canonicalTimestamp(event.releaseAttemptedAt);
        const released = event.releasedAt === undefined ? undefined : canonicalTimestamp(event.releasedAt);
        const timestamps = [acquired, attempted, released].filter(value => value !== undefined);
        invalidTimestampCount += timestamps.filter(value => !Number.isFinite(value)).length;
        if (Number.isFinite(acquired)
            && Number.isFinite(reportStarted)
            && Number.isFinite(reportFinished)
            && (acquired < reportStarted || acquired > reportFinished))
            outsideReportWindowCount += 1;
        for (const value of [attempted, released]) {
            if (value !== undefined && Number.isFinite(value) && (value < acquired || value < reportStarted || value > reportFinished))
                outsideReportWindowCount += 1;
        }
        if (event.status === "released" && (!event.releaseAttemptedAt || !event.releasedAt))
            invalidTimestampCount += 1;
        if (event.status === "cleanup_failed" && (!event.releaseAttemptedAt || !event.error))
            invalidTimestampCount += 1;
        if ((event.status === "open" || event.status === "retained") && (event.releaseAttemptedAt || event.releasedAt))
            invalidTimestampCount += 1;
    }
    const ownedResourceCount = events.filter(event => event.ownership === "owned").length;
    const externalResourceCount = events.filter(event => event.ownership === "external").length;
    const releasedResourceCount = events.filter(event => event.status === "released").length;
    const retainedExternalResourceCount = events.filter(event => event.status === "retained").length;
    const openResourceCount = events.filter(event => event.status === "open").length;
    const cleanupFailureCount = events.filter(event => event.status === "cleanup_failed").length;
    const invalid = duplicateResourceCount
        || planMismatchCount
        || invalidOwnershipCount
        || invalidTimestampCount
        || outsideReportWindowCount;
    const status = invalid
        ? "invalid"
        : openResourceCount || cleanupFailureCount
            ? "incomplete"
            : "complete";
    return {
        status,
        eventCount: events.length,
        ownedResourceCount,
        externalResourceCount,
        releasedResourceCount,
        retainedExternalResourceCount,
        openResourceCount,
        cleanupFailureCount,
        planMismatchCount,
        duplicateResourceCount,
        invalidOwnershipCount,
        invalidTimestampCount,
        outsideReportWindowCount,
        resourceTypeCounts,
        events,
    };
}
function browserResourceLifecycleErrors(report) {
    const expected = buildBrowserResourceLifecycleSummary({
        events: report.browserResourceLifecycleEvents || [],
        plan: report.metadata?.browserCheckExecutionPlan,
        reportStartedAt: report.startedAt,
        reportFinishedAt: report.finishedAt,
    });
    const errors = [];
    if (!report.browserResourceLifecycleSummary)
        errors.push("browserResourceLifecycleSummary is missing.");
    else if (JSON.stringify(report.browserResourceLifecycleSummary) !== JSON.stringify(expected)) {
        errors.push("browserResourceLifecycleSummary does not match browser resource events.");
    }
    if (expected.openResourceCount)
        errors.push(`${expected.openResourceCount} owned browser resource(s) remain open.`);
    if (expected.cleanupFailureCount)
        errors.push(`${expected.cleanupFailureCount} browser resource cleanup operation(s) failed.`);
    if (expected.planMismatchCount)
        errors.push(`${expected.planMismatchCount} browser resource event(s) belong to another execution plan.`);
    if (expected.duplicateResourceCount)
        errors.push(`${expected.duplicateResourceCount} duplicate browser resource event ID(s) were recorded.`);
    if (expected.invalidOwnershipCount)
        errors.push(`${expected.invalidOwnershipCount} browser resource ownership policy violation(s) were recorded.`);
    if (expected.invalidTimestampCount || expected.outsideReportWindowCount) {
        errors.push(`Browser resource lifecycle timestamps are invalid: invalid=${expected.invalidTimestampCount}; outsideReport=${expected.outsideReportWindowCount}.`);
    }
    if (report.status === "passed" && expected.status !== "complete") {
        errors.push(`passed report has ${expected.status} browser resource lifecycle evidence.`);
    }
    return errors;
}
function formatBrowserResourceLifecycleLine(summary) {
    if (!summary)
        return "status=incomplete; owned=0; released=0; external=0; open=0; cleanupFailed=0; invalid=0";
    return [
        `status=${summary.status}`,
        `owned=${summary.ownedResourceCount}`,
        `released=${summary.releasedResourceCount}`,
        `external=${summary.externalResourceCount}`,
        `open=${summary.openResourceCount}`,
        `cleanupFailed=${summary.cleanupFailureCount}`,
        `invalid=${summary.planMismatchCount + summary.duplicateResourceCount + summary.invalidOwnershipCount + summary.invalidTimestampCount + summary.outsideReportWindowCount}`,
    ].join("; ");
}
function formatBrowserResourceLifecycleAttentionLines(summary, limit = 5) {
    const attention = (summary?.events || []).filter(event => event.status === "open" || event.status === "cleanup_failed");
    if (!attention.length)
        return ["Browser resource lifecycle attention: none"];
    return [
        "Browser resource lifecycle attention:",
        ...attention.slice(0, Math.max(0, limit)).map(event => `- ${event.provider} ${event.resourceType} ${event.scope}: ${event.status}${event.error ? `; ${event.error}` : ""}`),
    ];
}
//# sourceMappingURL=resource-lifecycle.js.map