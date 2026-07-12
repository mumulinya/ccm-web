"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.browserExecutionLineageKey = browserExecutionLineageKey;
exports.buildBrowserToolEvidenceLineage = buildBrowserToolEvidenceLineage;
exports.browserToolEvidenceLineageErrors = browserToolEvidenceLineageErrors;
exports.formatBrowserToolEvidenceLineageLine = formatBrowserToolEvidenceLineageLine;
exports.formatBrowserToolEvidenceLineageAttentionLines = formatBrowserToolEvidenceLineageAttentionLines;
function browserExecutionLineageKey(execution) {
    return `${execution.planId}::${execution.checkId}::${execution.run}`;
}
function sameExecution(left, right) {
    if (!left || !right)
        return false;
    return left.planId === right.planId
        && left.checkId === right.checkId
        && left.projectIndex === right.projectIndex
        && left.checkIndex === right.checkIndex
        && left.run === right.run
        && left.expectedRuns === right.expectedRuns
        && left.evidence === "provider"
        && right.evidence === "provider";
}
function emptyStatusCounts() {
    return { complete: 0, incomplete: 0, invalid: 0 };
}
function buildBrowserToolEvidenceLineage(browserResults, browserToolCalls) {
    const recordsById = new Map();
    const duplicateRecordIds = new Set();
    for (const record of browserToolCalls) {
        if (recordsById.has(record.id))
            duplicateRecordIds.add(record.id);
        else
            recordsById.set(record.id, record);
    }
    const mcpResults = browserResults.filter(result => result.provider === "mcp"
        && result.execution?.evidence === "provider");
    const resultByExecution = new Map();
    for (const result of mcpResults)
        resultByExecution.set(browserExecutionLineageKey(result.execution), result);
    const references = new Map();
    const items = mcpResults.map(result => {
        const execution = result.execution;
        const executionKey = browserExecutionLineageKey(execution);
        const toolCallIds = Array.isArray(result.browserToolCallIds) ? result.browserToolCallIds.map(String) : [];
        const duplicateToolCallIds = [...new Set(toolCallIds.filter((id, index) => toolCallIds.indexOf(id) !== index))].sort();
        const missingToolCallIds = [];
        const foreignToolCallIds = [];
        let linkedToolCallCount = 0;
        let failedToolCallCount = 0;
        for (const id of toolCallIds) {
            const owners = references.get(id) || new Set();
            owners.add(executionKey);
            references.set(id, owners);
            const record = recordsById.get(id);
            if (!record) {
                missingToolCallIds.push(id);
                continue;
            }
            if (!sameExecution(record.browserExecution, execution)) {
                foreignToolCallIds.push(id);
                continue;
            }
            linkedToolCallCount += 1;
            if (record.status === "failed")
                failedToolCallCount += 1;
        }
        const evidenceRequired = result.status !== "blocked" || toolCallIds.length > 0;
        const status = duplicateToolCallIds.length || missingToolCallIds.length || foreignToolCallIds.length
            ? "invalid"
            : evidenceRequired && linkedToolCallCount === 0
                ? "incomplete"
                : "complete";
        return {
            checkId: execution.checkId,
            run: execution.run,
            project: result.project,
            name: result.name,
            resultStatus: result.status,
            evidenceRequired,
            toolCallIds,
            linkedToolCallCount,
            failedToolCallCount,
            missingToolCallIds: [...new Set(missingToolCallIds)].sort(),
            foreignToolCallIds: [...new Set(foreignToolCallIds)].sort(),
            duplicateToolCallIds,
            status,
        };
    });
    const crossLinkedIds = new Set([...references.entries()].filter(([, owners]) => owners.size > 1).map(([id]) => id));
    for (const item of items) {
        const crossLinkedForItem = item.toolCallIds.filter(id => crossLinkedIds.has(id));
        if (crossLinkedForItem.length) {
            item.duplicateToolCallIds = [...new Set([...item.duplicateToolCallIds, ...crossLinkedForItem])].sort();
            item.status = "invalid";
        }
    }
    let orphanScopedToolCallCount = 0;
    let unscopedToolCallCount = 0;
    for (const record of browserToolCalls) {
        if (!record.browserExecution) {
            unscopedToolCallCount += 1;
            continue;
        }
        const key = browserExecutionLineageKey(record.browserExecution);
        const result = resultByExecution.get(key);
        if (!result || !sameExecution(record.browserExecution, result.execution) || !(result.browserToolCallIds || []).includes(record.id)) {
            orphanScopedToolCallCount += 1;
        }
    }
    const statusCounts = emptyStatusCounts();
    for (const item of items)
        statusCounts[item.status] += 1;
    const unlinkedRequiredResultCount = items.filter(item => item.evidenceRequired && item.linkedToolCallCount === 0).length;
    const missingToolCallReferenceCount = items.reduce((sum, item) => sum + item.missingToolCallIds.length, 0);
    const foreignToolCallReferenceCount = items.reduce((sum, item) => sum + item.foreignToolCallIds.length, 0);
    const duplicateToolCallReferenceCount = items.reduce((sum, item) => sum + item.duplicateToolCallIds.length, 0);
    const invalid = missingToolCallReferenceCount
        || foreignToolCallReferenceCount
        || duplicateToolCallReferenceCount
        || duplicateRecordIds.size
        || orphanScopedToolCallCount
        || unscopedToolCallCount;
    const status = invalid
        ? "invalid"
        : unlinkedRequiredResultCount
            ? "incomplete"
            : "complete";
    return {
        status,
        mcpResultCount: items.length,
        evidenceRequiredResultCount: items.filter(item => item.evidenceRequired).length,
        linkedResultCount: items.filter(item => item.linkedToolCallCount > 0).length,
        toolCallCount: browserToolCalls.length,
        scopedToolCallCount: browserToolCalls.filter(record => record.browserExecution).length,
        linkedToolCallCount: items.reduce((sum, item) => sum + item.linkedToolCallCount, 0),
        failedToolCallCount: items.reduce((sum, item) => sum + item.failedToolCallCount, 0),
        unlinkedRequiredResultCount,
        missingToolCallReferenceCount,
        foreignToolCallReferenceCount,
        duplicateToolCallReferenceCount,
        duplicateToolCallRecordCount: duplicateRecordIds.size,
        orphanScopedToolCallCount,
        unscopedToolCallCount,
        statusCounts,
        items,
    };
}
function browserToolEvidenceLineageErrors(input) {
    const expected = buildBrowserToolEvidenceLineage(input.browserResults || [], input.browserToolCalls || []);
    const errors = [];
    if (!input.summary)
        errors.push("browserToolEvidenceLineage is missing.");
    else if (JSON.stringify(input.summary) !== JSON.stringify(expected)) {
        errors.push("browserToolEvidenceLineage does not match browser results and tool calls.");
    }
    for (const [index, result] of (input.browserResults || []).entries()) {
        if ((result.browserToolCallIds || []).length && (result.provider !== "mcp" || result.execution?.evidence !== "provider")) {
            errors.push(`browserResults[${index}] has browserToolCallIds without MCP provider execution identity.`);
        }
    }
    if (input.reportStatus === "passed" && expected.status !== "complete") {
        errors.push(`passed report has ${expected.status} browser tool evidence lineage.`);
    }
    return errors;
}
function formatBrowserToolEvidenceLineageLine(summary) {
    if (!summary)
        return "status=incomplete; results=0/0; calls=0/0; orphan=0; unscoped=0; invalid=0";
    return [
        `status=${summary.status}`,
        `results=${summary.linkedResultCount}/${summary.evidenceRequiredResultCount}`,
        `calls=${summary.linkedToolCallCount}/${summary.toolCallCount}`,
        `orphan=${summary.orphanScopedToolCallCount}`,
        `unscoped=${summary.unscopedToolCallCount}`,
        `invalid=${summary.missingToolCallReferenceCount + summary.foreignToolCallReferenceCount + summary.duplicateToolCallReferenceCount + summary.duplicateToolCallRecordCount}`,
    ].join("; ");
}
function formatBrowserToolEvidenceLineageAttentionLines(summary, limit = 5) {
    const attention = (summary?.items || []).filter(item => item.status !== "complete");
    if (!attention.length)
        return ["Browser tool evidence lineage attention: none"];
    return [
        "Browser tool evidence lineage attention:",
        ...attention.slice(0, Math.max(0, limit)).map(item => `- ${item.project} / ${item.name} [${item.checkId} run ${item.run}]: ${item.status}; linked=${item.linkedToolCallCount}; missing=${item.missingToolCallIds.join(",") || "none"}; foreign=${item.foreignToolCallIds.join(",") || "none"}; duplicate=${item.duplicateToolCallIds.join(",") || "none"}`),
    ];
}
//# sourceMappingURL=tool-evidence-lineage.js.map