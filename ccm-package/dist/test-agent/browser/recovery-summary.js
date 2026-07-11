"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildBrowserRecoverySummary = buildBrowserRecoverySummary;
exports.formatBrowserRecoverySummaryLine = formatBrowserRecoverySummaryLine;
function buildBrowserRecoverySummary(results) {
    const items = results
        .filter(result => result.recovery?.attempted)
        .map(result => ({
        project: result.project,
        name: result.name,
        provider: result.provider,
        status: result.status,
        attempted: result.recovery.attempted,
        recovered: result.recovery.recovered,
        failed: result.recovery.failed,
        notRetried: result.recovery.notRetried,
        events: result.recovery.events.map(event => ({ ...event })),
    }));
    return {
        checks: items.length,
        attempted: items.reduce((sum, item) => sum + item.attempted, 0),
        recovered: items.reduce((sum, item) => sum + item.recovered, 0),
        failed: items.reduce((sum, item) => sum + item.failed, 0),
        notRetried: items.reduce((sum, item) => sum + item.notRetried, 0),
        items,
    };
}
function formatBrowserRecoverySummaryLine(summary) {
    if (!summary)
        return "checks=0; attempted=0; recovered=0; failed=0; unsafeRetriesPrevented=0";
    return [
        `checks=${summary.checks}`,
        `attempted=${summary.attempted}`,
        `recovered=${summary.recovered}`,
        `failed=${summary.failed}`,
        `unsafeRetriesPrevented=${summary.notRetried}`,
    ].join("; ");
}
//# sourceMappingURL=recovery-summary.js.map