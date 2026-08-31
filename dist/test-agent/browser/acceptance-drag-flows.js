"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ACCEPTANCE_DRAG_FLOW_PROBE_TYPE = void 0;
exports.acceptanceDragIntent = acceptanceDragIntent;
exports.buildAcceptanceDragFlows = buildAcceptanceDragFlows;
exports.buildAcceptanceDragFlowBrowserChecks = buildAcceptanceDragFlowBrowserChecks;
const utils_1 = require("../utils");
exports.ACCEPTANCE_DRAG_FLOW_PROBE_TYPE = "acceptance_drag_flow";
function clean(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
}
function quotedText(value) {
    const out = [];
    const patterns = [
        /"([^"\r\n]{2,160})"/g,
        /'([^'\r\n]{2,160})'/g,
        /`([^`\r\n]{2,160})`/g,
        /“([^”\r\n]{2,160})”/g,
        /‘([^’\r\n]{2,160})’/g,
        /「([^」\r\n]{2,160})」/g,
        /『([^』\r\n]{2,160})』/g,
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
function explicitUrlPath(criterion) {
    const match = /(^|[\s(["'`])((?:\/(?!\/)[a-zA-Z0-9._~!$&'()*+,;=:@%-]+)+(?:\?[a-zA-Z0-9._~!$&'()*+,;=:@/?%-]+)?)/.exec(criterion);
    return clean(match?.[2] || "").replace(/[),.;:!?，。；：！？]+$/g, "");
}
function dragPattern(flags = "i") {
    return new RegExp(String.raw `(?:\b(?:drag|dragging|dragged|drag\s+and\s+drop|move)\b|拖动|拖拽|拖到|拖入|移动)`, flags);
}
function acceptanceDragIntent(criterion) {
    return dragPattern("i").test(criterion)
        && (/\b(?:to|into|onto)\b/i.test(criterion) || /(?:到|至|进|进入|移入)/.test(criterion));
}
function looksLikeDragCriterion(criterion) {
    if (!acceptanceDragIntent(criterion))
        return false;
    return /\b(?:then|after(?:wards)?|should|must|will|shows?|displays?|visible|appears?|moves?|moved)\b/i.test(criterion)
        || /(?:然后|之后|随后|应该|应当|必须|会|显示|出现|可见|移动|移入|完成)/.test(criterion);
}
function dragPartsFromCriterion(criterion) {
    const drag = dragPattern("i").exec(criterion);
    if (!drag)
        return { sourceText: "", destinationText: "", expectedText: "" };
    const quotes = quotedText(criterion);
    const sourceText = quotes[0] || "";
    const destinationText = quotes[1] || "";
    const afterThen = /(?:then|after(?:wards)?|and then|should|must|will)\b|(?:然后|之后|随后|并且|应该|应当|必须|会)/i.exec(criterion);
    const resultTail = afterThen ? criterion.slice(afterThen.index) : criterion;
    const ignored = new Set([sourceText, destinationText].map(item => item.toLowerCase()).filter(Boolean));
    const expectedText = quotedText(resultTail).find(item => !ignored.has(item.toLowerCase())) || quotes[2] || "";
    return { sourceText, destinationText, expectedText };
}
function flowName(project, flow) {
    try {
        const parsed = new URL(flow.url);
        return `Acceptance drag flow: ${project.name} ${parsed.pathname || "/"}`;
    }
    catch {
        return `Acceptance drag flow: ${project.name}`;
    }
}
function flowActions(flow) {
    return [
        { type: "goto", url: flow.url, waitUntil: "domcontentloaded" },
        {
            type: "dragTo",
            text: flow.sourceText,
            exact: true,
            destinationText: flow.destinationText,
            destinationExact: true,
        },
        { type: "waitForTimeout", value: "250" },
    ];
}
function flowAssertions(flow) {
    return [
        { type: "pageNotBlank" },
        { type: "text", text: flow.expectedText },
        { type: "visible", text: flow.expectedText, exact: true },
        { type: "inViewport", text: flow.expectedText, exact: true },
        { type: "urlIncludes", text: flow.path || "/" },
        { type: "consoleNoErrors" },
        { type: "networkNoErrors" },
    ];
}
function buildAcceptanceDragFlows(project, acceptanceCriteria = []) {
    if (!project.targetUrl)
        return [];
    const flows = [];
    const seen = new Set();
    for (const raw of acceptanceCriteria) {
        const criterion = clean(raw);
        if (!criterion || !looksLikeDragCriterion(criterion))
            continue;
        const path = explicitUrlPath(criterion);
        const url = path ? (0, utils_1.resolveUrl)(project.targetUrl, path) : project.targetUrl;
        const { sourceText, destinationText, expectedText } = dragPartsFromCriterion(criterion);
        if (!url || !sourceText || !destinationText || !expectedText)
            continue;
        const key = `${url}:${sourceText.toLowerCase()}:${destinationText.toLowerCase()}:${expectedText.toLowerCase()}`;
        if (seen.has(key))
            continue;
        seen.add(key);
        flows.push({
            criterion,
            url,
            path: path || "/",
            sourceText,
            destinationText,
            expectedText,
        });
    }
    return flows;
}
function buildAcceptanceDragFlowBrowserChecks(project, acceptanceCriteria = []) {
    return buildAcceptanceDragFlows(project, acceptanceCriteria).map(flow => ({
        name: flowName(project, flow),
        url: flow.url,
        probeType: exports.ACCEPTANCE_DRAG_FLOW_PROBE_TYPE,
        context: {
            source: "acceptance_criteria",
            generatedBy: exports.ACCEPTANCE_DRAG_FLOW_PROBE_TYPE,
            acceptanceCriteria: [flow.criterion],
            dragSourceText: flow.sourceText,
            dragDestinationText: flow.destinationText,
            expectedText: flow.expectedText,
        },
        actions: flowActions(flow),
        assertions: flowAssertions(flow),
        screenshot: true,
    }));
}
//# sourceMappingURL=acceptance-drag-flows.js.map