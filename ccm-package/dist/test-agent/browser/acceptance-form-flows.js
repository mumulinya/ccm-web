"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ACCEPTANCE_FORM_FLOW_PROBE_TYPE = void 0;
exports.buildAcceptanceFormFlows = buildAcceptanceFormFlows;
exports.buildAcceptanceFormFlowBrowserChecks = buildAcceptanceFormFlowBrowserChecks;
const utils_1 = require("../utils");
const acceptance_derived_checks_1 = require("./acceptance-derived-checks");
exports.ACCEPTANCE_FORM_FLOW_PROBE_TYPE = "acceptance_form_flow";
function clean(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
}
function quotedText(value) {
    const out = [];
    const patterns = [
        /"([^"\r\n]{2,120})"/g,
        /'([^'\r\n]{2,120})'/g,
        /`([^`\r\n]{2,120})`/g,
        /“([^”\r\n]{2,120})”/g,
        /‘([^’\r\n]{2,120})’/g,
        /「([^」\r\n]{2,120})」/g,
        /『([^』\r\n]{2,120})』/g,
    ];
    for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(value))) {
            const text = clean(match[1]);
            if (text)
                out.push(text);
        }
    }
    return out;
}
function firstQuotedAfter(criterion, pattern) {
    const match = pattern.exec(criterion);
    if (!match)
        return "";
    return quotedText(criterion.slice(match.index))[0] || "";
}
function nextBoundary(criterion, start) {
    const tail = criterion.slice(start);
    const boundary = /\b(?:fill|type|enter|input|set|select|choose|pick|check|tick|enable|uncheck|untick|disable|clear|click|press|tap|submit|then|afterwards|after|should|must|will)\b/ig;
    boundary.lastIndex = 1;
    const match = boundary.exec(tail);
    return match ? start + match.index : criterion.length;
}
function fieldForFillSegment(segment) {
    const values = quotedText(segment);
    if (values.length < 2)
        return null;
    if (/\b(?:with|as|value)\b/i.test(segment) && !/\b(?:in|into|for)\b/i.test(segment)) {
        return { actionType: "fill", fieldLabel: values[0], inputValue: values[1] };
    }
    if (/\b(?:in|into|to|for)\b/i.test(segment)) {
        return { actionType: "fill", inputValue: values[0], fieldLabel: values[1] };
    }
    if (/\b(?:with|as|value)\b/i.test(segment)) {
        return { actionType: "fill", fieldLabel: values[0], inputValue: values[1] };
    }
    return null;
}
function fieldForSelectSegment(segment) {
    if (/\bradio(?:\s+button)?\b/i.test(segment))
        return null;
    const values = quotedText(segment);
    if (values.length < 2)
        return null;
    if (/\b(?:in|from|for|to)\b/i.test(segment)) {
        return { actionType: "selectOption", inputValue: values[0], fieldLabel: values[1] };
    }
    return { actionType: "selectOption", inputValue: values[0], fieldLabel: values[1] };
}
function fieldForCheckSegment(segment) {
    const values = quotedText(segment);
    if (!values.length)
        return null;
    return { actionType: "check", fieldLabel: values[0], inputValue: "true" };
}
function fieldForUncheckSegment(segment) {
    const values = quotedText(segment);
    if (!values.length)
        return null;
    return { actionType: "uncheck", fieldLabel: values[0], inputValue: "false" };
}
function fieldForRadioSegment(segment) {
    const values = quotedText(segment);
    if (!values.length || !/\bradio(?:\s+button)?\b/i.test(segment))
        return null;
    return { actionType: "check", fieldLabel: values[0], inputValue: "true" };
}
function matchControlActions(criterion, pattern, build) {
    const fields = [];
    const seen = new Set();
    let match;
    while ((match = pattern.exec(criterion))) {
        const start = match.index;
        const end = nextBoundary(criterion, start + match[0].length);
        const field = build(criterion.slice(start, end));
        if (!field?.fieldLabel || !field.inputValue)
            continue;
        const key = `${field.actionType || "fill"}:${field.fieldLabel.toLowerCase()}`;
        if (seen.has(key))
            continue;
        seen.add(key);
        fields.push({ ...field, index: start });
    }
    return fields;
}
function matchFormControlActions(criterion) {
    const fields = [
        ...matchControlActions(criterion, /\b(?:fill|type|enter|input|set)\b/ig, fieldForFillSegment),
        ...matchControlActions(criterion, /\b(?:select|choose|pick)\b/ig, fieldForSelectSegment),
        ...matchControlActions(criterion, /\b(?:check|tick|enable)\b/ig, fieldForCheckSegment),
        ...matchControlActions(criterion, /\b(?:uncheck|untick|disable|clear)\b/ig, fieldForUncheckSegment),
        ...matchControlActions(criterion, /\b(?:choose|select|pick)\b(?=[^.;]{0,120}\bradio(?:\s+button)?\b)/ig, fieldForRadioSegment),
    ].sort((a, b) => a.index - b.index);
    return fields.map(({ index: _index, ...field }) => field);
}
function matchSubmitAction(criterion) {
    return firstQuotedAfter(criterion, /(?:click|press|tap|submit)\s+(?:the\s+)?(?:button\s+)?["'`“‘「『]/i);
}
function matchExpectedText(criterion, inputValues) {
    const afterThen = /(?:then|after(?:wards)?|and then|should|must|will)\b/i.exec(criterion);
    const tail = afterThen ? criterion.slice(afterThen.index) : criterion;
    const expected = firstQuotedAfter(tail, /(?:show|shows|display|displays|see|visible|appear|appears|contain|contains|include|includes|list|lists|render|renders)\w*\s+["'`“‘「『]/i);
    if (expected)
        return expected;
    const inputValueSet = new Set(inputValues);
    const tailQuotes = quotedText(tail);
    const distinct = tailQuotes.find(item => !inputValueSet.has(item));
    return distinct || tailQuotes.find(item => inputValueSet.has(item)) || "";
}
function requiresReloadPersistence(criterion) {
    return /\b(?:after|following)\s+(?:a\s+|the\s+)?(?:page\s+)?(?:refresh|reload|reloading|refreshing)\b/i.test(criterion)
        || /\b(?:refresh|reload)\s+(?:the\s+)?page\b/i.test(criterion)
        || /\bpersists?\b(?=[^.;]{0,120}\b(?:refresh|reload|reloading|refreshing)\b)/i.test(criterion)
        || /\bstill\s+(?:show|shows|display|displays|contain|contains|include|includes)\b(?=[^.;]{0,160}\b(?:refresh|reload|reloading|refreshing)\b)/i.test(criterion);
}
function flowName(project, flow) {
    try {
        const parsed = new URL(flow.url);
        return `Acceptance form flow: ${project.name} ${parsed.pathname || "/"}`;
    }
    catch {
        return `Acceptance form flow: ${project.name}`;
    }
}
function flowActions(flow) {
    const waits = flow.expectedUrlPath && flow.expectedUrlPath !== flow.path
        ? [{ type: "waitForUrl", text: flow.expectedUrlPath }]
        : [];
    const postSubmit = [
        ...waits,
        { type: "waitForTimeout", value: "250" },
        ...(flow.reloadBeforeAssertions ? [
            { type: "reload", waitUntil: "domcontentloaded" },
            { type: "waitForTimeout", value: "250" },
        ] : []),
    ];
    return [
        { type: "goto", url: flow.url, waitUntil: "domcontentloaded" },
        ...flow.fields.map(field => {
            if (field.actionType === "selectOption")
                return { type: "selectOption", label: field.fieldLabel, value: field.inputValue, exact: true };
            if (field.actionType === "check")
                return { type: "check", label: field.fieldLabel, exact: true };
            if (field.actionType === "uncheck")
                return { type: "uncheck", label: field.fieldLabel, exact: true };
            return { type: "fill", label: field.fieldLabel, value: field.inputValue, exact: true };
        }),
        { type: "click", role: "button", name: flow.buttonName, exact: true },
        ...postSubmit,
    ];
}
function flowAssertions(flow) {
    const stateAssertions = [];
    for (const field of flow.fields) {
        if (field.actionType === "selectOption")
            stateAssertions.push({ type: "selectedTextIncludes", label: field.fieldLabel, text: field.inputValue, exact: true });
        if (field.actionType === "check")
            stateAssertions.push({ type: "checked", label: field.fieldLabel, exact: true });
        if (field.actionType === "uncheck")
            stateAssertions.push({ type: "notChecked", label: field.fieldLabel, exact: true });
    }
    return [
        { type: "pageNotBlank" },
        ...stateAssertions,
        { type: "text", text: flow.expectedText },
        { type: "urlIncludes", text: flow.expectedUrlPath || flow.path },
        { type: "consoleNoErrors" },
        { type: "networkNoErrors" },
    ];
}
function buildAcceptanceFormFlows(project, acceptanceCriteria = []) {
    if (!project.targetUrl)
        return [];
    const flows = [];
    for (const group of (0, acceptance_derived_checks_1.buildAcceptanceDerivedBrowserAssertionsByCriterion)(acceptanceCriteria)) {
        const criterion = group.criterion;
        const pathItems = group.assertions.filter(item => item.reason === "explicit_url_path");
        const path = String(pathItems[0]?.assertion.text || pathItems[0]?.assertion.value || "");
        const expectedUrlPath = String(pathItems[pathItems.length - 1]?.assertion.text || pathItems[pathItems.length - 1]?.assertion.value || path);
        const fields = matchFormControlActions(criterion);
        const buttonName = matchSubmitAction(criterion);
        if (!path || !fields.length || !buttonName)
            continue;
        const expectedText = matchExpectedText(criterion, fields.map(field => field.inputValue));
        if (!expectedText)
            continue;
        const firstField = fields[0];
        flows.push({
            criterion,
            url: (0, utils_1.resolveUrl)(project.targetUrl, path),
            path,
            expectedUrlPath,
            reloadBeforeAssertions: requiresReloadPersistence(criterion),
            fields,
            fieldLabel: firstField.fieldLabel,
            inputValue: firstField.inputValue,
            buttonName,
            expectedText,
        });
    }
    return flows;
}
function buildAcceptanceFormFlowBrowserChecks(project, acceptanceCriteria = []) {
    return buildAcceptanceFormFlows(project, acceptanceCriteria).map(flow => ({
        name: flowName(project, flow),
        url: flow.url,
        probeType: exports.ACCEPTANCE_FORM_FLOW_PROBE_TYPE,
        actions: flowActions(flow),
        assertions: flowAssertions(flow),
        screenshot: true,
    }));
}
//# sourceMappingURL=acceptance-form-flows.js.map