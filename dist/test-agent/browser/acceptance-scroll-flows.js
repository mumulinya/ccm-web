"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ACCEPTANCE_SCROLL_FLOW_PROBE_TYPE = void 0;
exports.buildAcceptanceScrollFlows = buildAcceptanceScrollFlows;
exports.buildAcceptanceScrollFlowBrowserChecks = buildAcceptanceScrollFlowBrowserChecks;
const utils_1 = require("../utils");
exports.ACCEPTANCE_SCROLL_FLOW_PROBE_TYPE = "acceptance_scroll_flow";
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
function firstQuotedAfter(value, pattern) {
    const match = pattern.exec(value);
    if (!match)
        return "";
    return quotedText(value.slice(match.index))[0] || "";
}
function explicitUrlPath(criterion) {
    const match = /(^|[\s(["'`])((?:\/(?!\/)[a-zA-Z0-9._~!$&'()*+,;=:@%-]+)+(?:\?[a-zA-Z0-9._~!$&'()*+,;=:@/?%-]+)?)/.exec(criterion);
    return clean(match?.[2] || "").replace(/[),.;:!?，。；：！？]+$/g, "");
}
function looksLikeScrollCriterion(criterion) {
    const negativeHorizontalLayout = /\b(?:no|without)\s+horizontal\s+scroll/i.test(criterion)
        || /(?:没有|无|不要|不应|不能)[^。！？；\r\n]{0,20}横向滚动/.test(criterion);
    const explicitScrollAction = /\b(?:scroll|scrolling|scrolled)\s+(?:down|up|left|right|to)\b/i.test(criterion)
        || /\b(?:swipe|swiping|wheel|page\s+down|page\s+up)\b/i.test(criterion)
        || /(?:向下滚动|向上滚动|向左滚动|向右滚动|滚动到|下滑|上滑|左滑|右滑|滑到底部|滚到底部|滑到顶部|滚到顶部)/.test(criterion);
    if (negativeHorizontalLayout && !explicitScrollAction)
        return false;
    return /\b(?:scroll|scrolling|scrolled|swipe|swiping|wheel|page\s+down|page\s+up)\b/i.test(criterion)
        || /(?:滚动|滑动|下滑|上滑|左滑|右滑|滚到底部|滑到底部|滚到顶部|滑到顶部)/.test(criterion);
}
function scrollDirectionFromCriterion(criterion) {
    if (/\b(?:left|horizontal\s+left)\b/i.test(criterion) || /(?:左滑|向左|往左)/.test(criterion))
        return "left";
    if (/\b(?:right|horizontal\s+right)\b/i.test(criterion) || /(?:右滑|向右|往右)/.test(criterion))
        return "right";
    if (/\b(?:up|top|page\s+up)\b/i.test(criterion) || /(?:上滑|向上|往上|顶部)/.test(criterion))
        return "up";
    return "down";
}
function scrollAmountFromCriterion(criterion) {
    const match = /(\d{2,5})\s*(?:px|pixels?|像素)?/i.exec(criterion);
    const amount = Number(match?.[1] || 0);
    if (Number.isFinite(amount) && amount > 0)
        return Math.min(Math.max(amount, 100), 5000);
    if (/\b(?:bottom|end|page\s+down)\b/i.test(criterion) || /(?:底部|末尾|尽头)/.test(criterion))
        return 1200;
    return 900;
}
function scrollRepetitionsFromCriterion(criterion) {
    const match = /(\d{1,2})\s*(?:times?|次)/i.exec(criterion);
    const count = Number(match?.[1] || 0);
    if (Number.isFinite(count) && count > 0)
        return Math.min(count, 6);
    if (/\b(?:bottom|end)\b/i.test(criterion) || /(?:底部|末尾|尽头)/.test(criterion))
        return 3;
    return 1;
}
function expectedTextFromCriterion(criterion) {
    const tailMarker = /(?:\b(?:then|after(?:wards)?|and then|should|must|will)\b|然后|之后|随后|应该|应当|必须|会)/i.exec(criterion);
    const tail = tailMarker ? criterion.slice(tailMarker.index) : criterion;
    const expected = firstQuotedAfter(tail, /(?:\b(?:show|shows|display|displays|see|visible|appear|appears|contain|contains|include|includes|render|renders)\w*\b|显示|出现|看到|可见|包含|包括|渲染)[^"'`“‘「『]{0,80}["'`“‘「『]/i);
    if (expected)
        return expected;
    const candidates = quotedText(tail);
    return candidates[candidates.length - 1] || "";
}
function flowName(project, flow) {
    try {
        const parsed = new URL(flow.url);
        return `Acceptance scroll flow: ${project.name} ${parsed.pathname || "/"}`;
    }
    catch {
        return `Acceptance scroll flow: ${project.name}`;
    }
}
function flowActions(flow) {
    const scrollActions = Array.from({ length: flow.repetitions }, () => ({
        type: "scroll",
        direction: flow.direction,
        amount: flow.amount,
    }));
    return [
        { type: "goto", url: flow.url, waitUntil: "domcontentloaded" },
        { type: "waitForTimeout", value: "150" },
        ...scrollActions,
        { type: "waitForTimeout", value: "150" },
    ];
}
function flowAssertions(flow) {
    return [
        { type: "pageNotBlank" },
        { type: "text", text: flow.expectedText },
        { type: "inViewport", text: flow.expectedText, exact: true },
        { type: "urlIncludes", text: flow.path || "/" },
        { type: "consoleNoErrors" },
        { type: "networkNoErrors" },
    ];
}
function buildAcceptanceScrollFlows(project, acceptanceCriteria = []) {
    if (!project.targetUrl)
        return [];
    const flows = [];
    const seen = new Set();
    for (const raw of acceptanceCriteria) {
        const criterion = clean(raw);
        if (!criterion || !looksLikeScrollCriterion(criterion))
            continue;
        const path = explicitUrlPath(criterion);
        const url = path ? (0, utils_1.resolveUrl)(project.targetUrl, path) : project.targetUrl;
        const expectedText = expectedTextFromCriterion(criterion);
        if (!url || !expectedText)
            continue;
        const direction = scrollDirectionFromCriterion(criterion);
        const amount = scrollAmountFromCriterion(criterion);
        const repetitions = scrollRepetitionsFromCriterion(criterion);
        const key = `${url}:${direction}:${amount}:${repetitions}:${expectedText.toLowerCase()}`;
        if (seen.has(key))
            continue;
        seen.add(key);
        flows.push({
            criterion,
            url,
            path: path || "/",
            direction,
            amount,
            repetitions,
            expectedText,
        });
    }
    return flows;
}
function buildAcceptanceScrollFlowBrowserChecks(project, acceptanceCriteria = []) {
    return buildAcceptanceScrollFlows(project, acceptanceCriteria).map(flow => ({
        name: flowName(project, flow),
        url: flow.url,
        probeType: exports.ACCEPTANCE_SCROLL_FLOW_PROBE_TYPE,
        context: {
            source: "acceptance_criteria",
            generatedBy: exports.ACCEPTANCE_SCROLL_FLOW_PROBE_TYPE,
            acceptanceCriteria: [flow.criterion],
            direction: flow.direction,
            amount: flow.amount,
            repetitions: flow.repetitions,
            expectedText: flow.expectedText,
        },
        actions: flowActions(flow),
        assertions: flowAssertions(flow),
        screenshot: true,
    }));
}
//# sourceMappingURL=acceptance-scroll-flows.js.map