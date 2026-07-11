"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildBrowserActionEffectSummary = buildBrowserActionEffectSummary;
exports.formatBrowserActionEffectSummaryLine = formatBrowserActionEffectSummaryLine;
exports.browserActionEffectSummaryErrors = browserActionEffectSummaryErrors;
const action_effects_1 = require("./action-effects");
function emptySignalCounts() {
    return {
        url: 0,
        title: 0,
        page_text: 0,
        dom: 0,
        network: 0,
        dialog: 0,
        popup: 0,
        download: 0,
    };
}
function increment(counts, key) {
    counts[key] = (counts[key] || 0) + 1;
}
function summarizeResult(result) {
    const effects = result.actionEffects || [];
    const actionTypes = {};
    const changedSignals = emptySignalCounts();
    for (const effect of effects) {
        increment(actionTypes, effect.actionType);
        for (const signal of effect.changedSignals)
            changedSignals[signal] += 1;
    }
    const unchanged = effects.filter(effect => effect.status === "unchanged").length;
    const unavailable = effects.filter(effect => effect.status === "unavailable").length;
    return {
        project: result.project,
        name: result.name,
        provider: result.provider,
        status: result.status,
        actions: effects.length,
        changed: effects.filter(effect => effect.status === "changed").length,
        unchanged,
        unavailable,
        failed: unchanged + unavailable,
        detailSuppressed: effects.filter(effect => effect.detailSuppressed).length,
        crossSession: effects.filter(effect => Boolean(effect.session && effect.effectSession && effect.session !== effect.effectSession)).length,
        actionTypes,
        changedSignals,
    };
}
function buildBrowserActionEffectSummary(results) {
    const items = results.filter(result => (result.actionEffects || []).length > 0).map(summarizeResult);
    const actionTypes = {};
    const changedSignals = emptySignalCounts();
    for (const item of items) {
        for (const [type, count] of Object.entries(item.actionTypes)) {
            actionTypes[type] = (actionTypes[type] || 0) + count;
        }
        for (const signal of action_effects_1.BROWSER_ACTION_EFFECT_SIGNALS) {
            changedSignals[signal] += item.changedSignals[signal] || 0;
        }
    }
    const unchanged = items.reduce((sum, item) => sum + item.unchanged, 0);
    const unavailable = items.reduce((sum, item) => sum + item.unavailable, 0);
    return {
        checks: items.length,
        actions: items.reduce((sum, item) => sum + item.actions, 0),
        changed: items.reduce((sum, item) => sum + item.changed, 0),
        unchanged,
        unavailable,
        failed: unchanged + unavailable,
        detailSuppressed: items.reduce((sum, item) => sum + item.detailSuppressed, 0),
        crossSession: items.reduce((sum, item) => sum + item.crossSession, 0),
        actionTypes,
        changedSignals,
        items,
    };
}
function formatBrowserActionEffectSummaryLine(summary) {
    if (!summary)
        return "checks=0; actions=0; changed=0; failed=0; unchanged=0; unavailable=0; crossSession=0; detailSuppressed=0";
    return [
        `checks=${summary.checks}`,
        `actions=${summary.actions}`,
        `changed=${summary.changed}`,
        `failed=${summary.failed}`,
        `unchanged=${summary.unchanged}`,
        `unavailable=${summary.unavailable}`,
        `crossSession=${summary.crossSession}`,
        `detailSuppressed=${summary.detailSuppressed}`,
    ].join("; ");
}
function browserActionEffectSummaryErrors(summary, results, label = "browser action effect summary") {
    if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
        return [`${label} must be an object.`];
    }
    const errors = [];
    const items = Array.isArray(summary.items) ? summary.items : [];
    const allowedSummaryKeys = new Set([
        "checks",
        "actions",
        "changed",
        "unchanged",
        "unavailable",
        "failed",
        "detailSuppressed",
        "crossSession",
        "actionTypes",
        "changedSignals",
        "items",
    ]);
    const allowedItemKeys = new Set([
        "project",
        "name",
        "provider",
        "status",
        "actions",
        "changed",
        "unchanged",
        "unavailable",
        "failed",
        "detailSuppressed",
        "crossSession",
        "actionTypes",
        "changedSignals",
    ]);
    for (const key of Object.keys(summary)) {
        if (!allowedSummaryKeys.has(key))
            errors.push(`${label}.${key} is not permitted.`);
    }
    const numericKeys = ["actions", "changed", "unchanged", "unavailable", "failed", "detailSuppressed", "crossSession"];
    if (summary.checks !== items.length)
        errors.push(`${label}.checks must match items.`);
    for (const [index, item] of items.entries()) {
        for (const key of Object.keys(item || {})) {
            if (!allowedItemKeys.has(key))
                errors.push(`${label}.items[${index}].${key} is not permitted.`);
        }
        if (Number(item.actions) !== Number(item.changed) + Number(item.unchanged) + Number(item.unavailable)) {
            errors.push(`${label}.items[${index}].actions must equal changed + unchanged + unavailable.`);
        }
        if (Number(item.failed) !== Number(item.unchanged) + Number(item.unavailable)) {
            errors.push(`${label}.items[${index}].failed must equal unchanged + unavailable.`);
        }
        if (Number(item.detailSuppressed) > Number(item.actions)) {
            errors.push(`${label}.items[${index}].detailSuppressed cannot exceed actions.`);
        }
        if (Number(item.crossSession) > Number(item.actions)) {
            errors.push(`${label}.items[${index}].crossSession cannot exceed actions.`);
        }
    }
    for (const key of numericKeys) {
        const expected = items.reduce((sum, item) => sum + Number(item?.[key] || 0), 0);
        if (Number(summary[key]) !== expected)
            errors.push(`${label}.${key} must match items.`);
    }
    const expectedActionTypes = {};
    const expectedSignals = emptySignalCounts();
    for (const item of items) {
        for (const [type, count] of Object.entries(item?.actionTypes || {})) {
            expectedActionTypes[type] = (expectedActionTypes[type] || 0) + Number(count || 0);
        }
        for (const signal of action_effects_1.BROWSER_ACTION_EFFECT_SIGNALS) {
            expectedSignals[signal] += Number(item?.changedSignals?.[signal] || 0);
        }
        for (const signal of Object.keys(item?.changedSignals || {})) {
            if (!action_effects_1.BROWSER_ACTION_EFFECT_SIGNALS.includes(signal)) {
                errors.push(`${label} contains unsupported changed signal ${signal}.`);
            }
        }
    }
    if (JSON.stringify(summary.actionTypes || {}) !== JSON.stringify(expectedActionTypes)) {
        errors.push(`${label}.actionTypes must match items.`);
    }
    if (JSON.stringify(summary.changedSignals || {}) !== JSON.stringify(expectedSignals)) {
        errors.push(`${label}.changedSignals must match items.`);
    }
    if (results && JSON.stringify(summary) !== JSON.stringify(buildBrowserActionEffectSummary(results))) {
        errors.push(`${label} does not match browserResults.`);
    }
    return errors;
}
//# sourceMappingURL=action-effect-summary.js.map