"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildBrowserFlowSummary = buildBrowserFlowSummary;
exports.formatBrowserFlowSummaryLine = formatBrowserFlowSummaryLine;
exports.formatBrowserFlowAttentionLines = formatBrowserFlowAttentionLines;
function emptyStatusCounts() {
    return {
        passed: 0,
        failed: 0,
        blocked: 0,
        skipped: 0,
    };
}
function acceptanceCriteria(result) {
    const raw = result.context?.acceptanceCriteria;
    if (!Array.isArray(raw))
        return [];
    return raw.map(item => String(item || "").trim()).filter(Boolean);
}
function flowType(result) {
    const generatedBy = String(result.context?.generatedBy || "").trim();
    const source = String(result.context?.source || "").trim();
    const criteria = acceptanceCriteria(result);
    if (!criteria.length)
        return "";
    if (source && source !== "acceptance_criteria")
        return "";
    return generatedBy || String(result.probeType || "").trim();
}
function failedStepLines(result) {
    return result.steps
        .filter(step => step.status === "failed")
        .map(step => `${step.name}${step.error ? `: ${step.error}` : step.detail ? `: ${step.detail}` : ""}`);
}
function failureItem(result) {
    const failedSteps = failedStepLines(result);
    if (result.status !== "failed" && result.status !== "blocked" && !failedSteps.length)
        return null;
    return {
        project: result.project,
        name: result.name,
        status: result.status,
        ...(result.error ? { error: result.error } : {}),
        failedSteps,
    };
}
function summarizeGroup(group) {
    const statusCounts = emptyStatusCounts();
    let actionCount = 0;
    let assertionCount = 0;
    let failedStepCount = 0;
    const failures = [];
    for (const result of group.results) {
        statusCounts[result.status] += 1;
        actionCount += result.steps.filter(step => step.kind === "action").length;
        assertionCount += result.steps.filter(step => step.kind === "assertion").length;
        failedStepCount += result.steps.filter(step => step.status === "failed").length;
        const failure = failureItem(result);
        if (failure)
            failures.push(failure);
    }
    return {
        flowType: group.flowType,
        total: group.results.length,
        statusCounts,
        criteriaCount: group.criteria.size,
        criteria: [...group.criteria].sort(),
        projects: [...group.projects].sort(),
        providers: [...group.providers].sort(),
        actionCount,
        assertionCount,
        failedStepCount,
        failures,
    };
}
function buildBrowserFlowSummary(browserResults) {
    const groups = new Map();
    const included = [];
    const allCriteria = new Set();
    for (const result of browserResults) {
        const type = flowType(result);
        if (!type)
            continue;
        const criteria = acceptanceCriteria(result);
        included.push(result);
        for (const criterion of criteria)
            allCriteria.add(criterion);
        let group = groups.get(type);
        if (!group) {
            group = {
                flowType: type,
                results: [],
                criteria: new Set(),
                projects: new Set(),
                providers: new Set(),
            };
            groups.set(type, group);
        }
        group.results.push(result);
        for (const criterion of criteria)
            group.criteria.add(criterion);
        if (result.project)
            group.projects.add(result.project);
        if (result.provider)
            group.providers.add(result.provider);
    }
    const statusCounts = emptyStatusCounts();
    let actionCount = 0;
    let assertionCount = 0;
    let failedStepCount = 0;
    for (const result of included) {
        statusCounts[result.status] += 1;
        actionCount += result.steps.filter(step => step.kind === "action").length;
        assertionCount += result.steps.filter(step => step.kind === "assertion").length;
        failedStepCount += result.steps.filter(step => step.status === "failed").length;
    }
    const items = [...groups.values()].map(summarizeGroup).sort((a, b) => a.flowType.localeCompare(b.flowType));
    return {
        total: included.length,
        statusCounts,
        flowTypeCount: items.length,
        criteriaCount: allCriteria.size,
        actionCount,
        assertionCount,
        failedStepCount,
        items,
    };
}
function formatBrowserFlowSummaryLine(summary) {
    if (!summary)
        return "passed:0, failed:0, blocked:0, skipped:0, total:0, types:0, criteria:0";
    const counts = summary.statusCounts;
    return `passed:${counts.passed}, failed:${counts.failed}, blocked:${counts.blocked}, skipped:${counts.skipped}, total:${summary.total}, types:${summary.flowTypeCount}, criteria:${summary.criteriaCount}`;
}
function formatBrowserFlowAttentionLines(summary, limit = 5) {
    if (!summary)
        return ["Browser flow attention: none"];
    const attention = summary.items.filter(item => item.statusCounts.failed > 0 || item.statusCounts.blocked > 0 || item.failedStepCount > 0);
    if (!attention.length)
        return ["Browser flow attention: none"];
    return [
        "Browser flow attention:",
        ...attention.slice(0, Math.max(0, limit)).map(item => `- ${item.flowType}: failed=${item.statusCounts.failed}, blocked=${item.statusCounts.blocked}, failedSteps=${item.failedStepCount}${item.failures[0] ? `; first=${item.failures[0].project}/${item.failures[0].name}` : ""}`),
    ];
}
//# sourceMappingURL=flow-summary.js.map