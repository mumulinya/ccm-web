"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ACCEPTANCE_HISTORY_FLOW_PROBE_TYPE = void 0;
exports.acceptanceHistoryIntent = acceptanceHistoryIntent;
exports.buildAcceptanceHistoryFlows = buildAcceptanceHistoryFlows;
exports.buildAcceptanceHistoryFlowBrowserChecks = buildAcceptanceHistoryFlowBrowserChecks;
const utils_1 = require("../utils");
exports.ACCEPTANCE_HISTORY_FLOW_PROBE_TYPE = "acceptance_history_flow";
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
function quotedRanges(value) {
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
            out.push({ start: match.index, end: match.index + match[0].length });
        }
    }
    return out;
}
function firstUnquotedMatch(value, patterns) {
    const ranges = quotedRanges(value);
    let earliest = null;
    for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(value))) {
            if (ranges.some(range => match.index >= range.start && match.index < range.end))
                continue;
            if (!earliest || match.index < earliest.index)
                earliest = match;
            break;
        }
    }
    return earliest;
}
function clickMarker(criterion) {
    return firstUnquotedMatch(criterion, [
        /\b(?:click|clicking|press|tap|follow|open)\b/ig,
        /(?:点击|点按|轻触|打开|按下)/g,
    ]);
}
function backMarker(criterion) {
    return firstUnquotedMatch(criterion, [
        /\bbrowser\s+back\b/ig,
        /\bgo(?:es|ing)?\s+back\b/ig,
        /\bnavigate(?:s|d|ing)?\s+back\b/ig,
        /\bhistory\s+back\b/ig,
        /\bback\s+navigation\b/ig,
        /浏览器(?:返回|后退)/g,
        /(?:返回|回到|后退到)上一页/g,
        /(?:执行|使用)(?:浏览器)?后退/g,
    ]);
}
function forwardMarker(criterion) {
    return firstUnquotedMatch(criterion, [
        /\bbrowser\s+forward\b/ig,
        /\bgo(?:es|ing)?\s+forward\b/ig,
        /\bnavigate(?:s|d|ing)?\s+forward\b/ig,
        /\bhistory\s+forward\b/ig,
        /\bforward\s+navigation\b/ig,
        /浏览器前进/g,
        /前进到下一页/g,
        /(?:执行|使用)(?:浏览器)?前进/g,
        /再前进/g,
    ]);
}
function acceptanceHistoryIntent(criterion) {
    const click = clickMarker(criterion);
    const back = backMarker(criterion);
    return Boolean(click && back && back.index > click.index);
}
function explicitUrlPaths(criterion) {
    const paths = [];
    const seen = new Set();
    const pattern = /(^|[\s(["'`])((?:\/(?!\/)[a-zA-Z0-9._~!$&'()*+,;=:@%-]+)+(?:\?[a-zA-Z0-9._~!$&'()*+,;=:@/?%-]+)?)/g;
    let match;
    while ((match = pattern.exec(criterion))) {
        const path = clean(match[2]).replace(/[),.;:!?，。；：！？]+$/g, "");
        const key = path.toLowerCase();
        if (!path || seen.has(key))
            continue;
        seen.add(key);
        paths.push(path);
    }
    return paths;
}
function firstQuotedAfterClick(criterion, click) {
    return quotedText(criterion.slice(click.index + click[0].length))[0] || "";
}
function targetRoleFromCriterion(criterion, clickIndex) {
    const context = criterion.slice(Math.max(0, clickIndex - 60), Math.min(criterion.length, clickIndex + 140));
    return /\b(?:link|nav|navigation|menu item|anchor)\b/i.test(context) || /(?:链接|导航|菜单项)/.test(context) ? "link" : "button";
}
function expectedTextBetween(criterion, start, end) {
    const from = start.index + start[0].length;
    const to = end && end.index > from ? end.index : criterion.length;
    const segment = criterion.slice(from, to);
    const display = /(?:\b(?:show|shows|display|displays|see|visible|appear|appears|contain|contains|include|includes|render|renders|restore|restores)\w*\b|显示|出现|看到|可见|包含|包括|渲染|恢复)[^"'`“‘「『]{0,100}["'`“‘「『]/i.exec(segment);
    if (display)
        return quotedText(segment.slice(display.index))[0] || "";
    return quotedText(segment)[0] || "";
}
function flowName(project, flow) {
    return `Acceptance history flow: ${project.name} ${flow.initialPath} ${flow.mode}`;
}
function flowActions(flow) {
    const actions = [
        { type: "goto", url: flow.url, waitUntil: "domcontentloaded" },
        { type: "click", role: flow.targetRole, name: flow.targetName, exact: true },
        { type: "waitForUrl", text: flow.destinationPath },
        { type: "waitForTimeout", value: "150" },
        { type: "goBack", waitUntil: "domcontentloaded" },
        { type: "waitForUrl", text: flow.initialPath },
        { type: "waitForText", text: flow.backExpectedText },
    ];
    if (flow.mode === "back_forward") {
        actions.push({ type: "goForward", waitUntil: "domcontentloaded" }, { type: "waitForUrl", text: flow.destinationPath }, { type: "waitForText", text: flow.forwardExpectedText });
    }
    actions.push({ type: "waitForTimeout", value: "150" });
    return actions;
}
function flowAssertions(flow) {
    const finalPath = flow.mode === "back_forward" ? flow.destinationPath : flow.initialPath;
    const finalText = flow.mode === "back_forward" ? flow.forwardExpectedText : flow.backExpectedText;
    return [
        { type: "pageNotBlank" },
        { type: "text", text: finalText },
        { type: "visible", text: finalText, exact: true },
        { type: "inViewport", text: finalText, exact: true },
        { type: "urlIncludes", text: finalPath },
        { type: "consoleNoErrors" },
        { type: "networkNoErrors" },
    ];
}
function buildAcceptanceHistoryFlows(project, acceptanceCriteria = []) {
    if (!project.targetUrl)
        return [];
    const flows = [];
    const seen = new Set();
    for (const raw of acceptanceCriteria) {
        const criterion = clean(raw);
        if (!criterion || !acceptanceHistoryIntent(criterion))
            continue;
        const click = clickMarker(criterion);
        const back = backMarker(criterion);
        if (!click || !back)
            continue;
        const forward = forwardMarker(criterion);
        const paths = explicitUrlPaths(criterion);
        const initialPath = paths[0] || "";
        const destinationPath = paths[1] || "";
        const targetName = firstQuotedAfterClick(criterion, click);
        const mode = forward && forward.index > back.index ? "back_forward" : "back";
        const backExpectedText = expectedTextBetween(criterion, back, mode === "back_forward" ? forward : null);
        const forwardExpectedText = mode === "back_forward" && forward ? expectedTextBetween(criterion, forward) : "";
        const url = initialPath ? (0, utils_1.resolveUrl)(project.targetUrl, initialPath) : "";
        if (!url || !initialPath || !destinationPath || !targetName || !backExpectedText)
            continue;
        if (mode === "back_forward" && !forwardExpectedText)
            continue;
        const targetRole = targetRoleFromCriterion(criterion, click.index);
        const key = `${url}:${destinationPath.toLowerCase()}:${targetRole}:${targetName.toLowerCase()}:${mode}:${backExpectedText.toLowerCase()}:${forwardExpectedText.toLowerCase()}`;
        if (seen.has(key))
            continue;
        seen.add(key);
        flows.push({
            criterion,
            url,
            initialPath,
            destinationPath,
            targetRole,
            targetName,
            mode,
            backExpectedText,
            forwardExpectedText,
        });
    }
    return flows;
}
function buildAcceptanceHistoryFlowBrowserChecks(project, acceptanceCriteria = []) {
    return buildAcceptanceHistoryFlows(project, acceptanceCriteria).map(flow => ({
        name: flowName(project, flow),
        url: flow.url,
        probeType: exports.ACCEPTANCE_HISTORY_FLOW_PROBE_TYPE,
        context: {
            source: "acceptance_criteria",
            generatedBy: exports.ACCEPTANCE_HISTORY_FLOW_PROBE_TYPE,
            acceptanceCriteria: [flow.criterion],
            historyMode: flow.mode,
            initialPath: flow.initialPath,
            destinationPath: flow.destinationPath,
            targetRole: flow.targetRole,
            targetName: flow.targetName,
            backExpectedText: flow.backExpectedText,
            forwardExpectedText: flow.forwardExpectedText,
        },
        actions: flowActions(flow),
        assertions: flowAssertions(flow),
        screenshot: true,
    }));
}
//# sourceMappingURL=acceptance-history-flows.js.map