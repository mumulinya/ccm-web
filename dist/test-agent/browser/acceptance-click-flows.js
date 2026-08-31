"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ACCEPTANCE_CLICK_FLOW_PROBE_TYPE = void 0;
exports.buildAcceptanceClickFlows = buildAcceptanceClickFlows;
exports.buildAcceptanceClickFlowBrowserChecks = buildAcceptanceClickFlowBrowserChecks;
const utils_1 = require("../utils");
const acceptance_derived_checks_1 = require("./acceptance-derived-checks");
exports.ACCEPTANCE_CLICK_FLOW_PROBE_TYPE = "acceptance_click_flow";
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
function inQuotedRange(index, ranges) {
    return ranges.some(range => index > range.start && index < range.end);
}
function firstQuotedAfter(value, pattern) {
    const match = pattern.exec(value);
    if (!match)
        return "";
    return quotedText(value.slice(match.index))[0] || "";
}
function clickPattern(flags = "i") {
    return new RegExp(String.raw `(?:\b(?:click|clicking|press|tap|follow|open)\b|点击|点按|轻触|打开|按下)`, flags);
}
function clickMatch(criterion) {
    return clickPattern("i").exec(criterion);
}
function clickMatches(criterion) {
    const matches = [];
    const ranges = quotedRanges(criterion);
    const pattern = clickPattern("ig");
    let match;
    while ((match = pattern.exec(criterion))) {
        if (!inQuotedRange(match.index, ranges))
            matches.push({ index: match.index, text: match[0] });
    }
    return matches;
}
function looksLikePureClickCriterion(criterion) {
    if (!clickMatch(criterion))
        return false;
    if (/\b(?:fill|type|enter|input|set|select|choose|pick|check|uncheck|upload|attach|download|export)\b/i.test(criterion)
        || /(?:填写|输入|录入|选择|勾选|取消勾选|上传|添加附件|下载|导出)/.test(criterion))
        return false;
    return /\b(?:then|after(?:wards)?|should|must|will|opens?|shows?|displays?|visible|appears?|redirects?|navigates?)\b/i.test(criterion)
        || /(?:然后|之后|随后|应当|应该|必须|会|显示|出现|可见|跳转|导航|进入)/.test(criterion);
}
function targetRoleFromCriterion(criterion, clickIndex) {
    const context = criterion.slice(Math.max(0, clickIndex - 60), Math.min(criterion.length, clickIndex + 140));
    return /\b(?:link|nav|navigation|menu item|anchor)\b/i.test(context) || /(?:链接|导航|菜单项)/.test(context) ? "link" : "button";
}
function targetNameFromCriterion(criterion) {
    return firstQuotedAfter(criterion, /(?:\b(?:click|clicking|press|tap|follow|open)\b|点击|点按|轻触|打开|按下)[^"'`“‘「『]{0,100}["'`“‘「『]/i)
        || unquotedTargetNameFromCriterion(criterion);
}
function targetNameFromClick(criterion, click) {
    return firstQuotedAfter(criterion.slice(click.index), /(?:\b(?:click|clicking|press|tap|follow|open)\b|点击|点按|轻触|打开|按下)[^"'`“‘「『]{0,100}["'`“‘「『]/i)
        || unquotedTargetNameFromCriterion(criterion, click);
}
function unquotedTargetNameFromCriterion(criterion, click) {
    const match = click || (() => {
        const found = clickMatch(criterion);
        return found ? { index: found.index, text: found[0] } : null;
    })();
    if (!match)
        return "";
    const tail = criterion.slice(match.index + match.text.length);
    const boundary = /\b(?:then|after(?:wards)?|should|must|will|shows?|displays?|appears?|opens?|redirects?|navigates?|goes?)\b|(?:然后|之后|随后|应该|应当|必须|显示|出现|可见|打开|跳转|导航|进入)|[,.;，。；]/i.exec(tail);
    const segment = clean(boundary ? tail.slice(0, boundary.index) : tail);
    if (!segment || /["'`“‘「『]/.test(segment))
        return "";
    const withoutLeading = segment
        .replace(/^(?:the|a|an)\s+/i, "")
        .replace(/^(?:button|link|nav(?:igation)? item|menu item)\s+/i, "")
        .replace(/\s+(?:button|link|nav(?:igation)? item|menu item)$/i, "")
        .replace(/\s+(?:and|to|for)$/i, "")
        .trim();
    if (!withoutLeading || withoutLeading.length > 80)
        return "";
    if (/^(?:button|link|page|route|url|path)$/i.test(withoutLeading))
        return "";
    if (/^\/[^\s]+/.test(withoutLeading))
        return "";
    return withoutLeading;
}
function clickTargetsFromCriterion(criterion) {
    const targets = [];
    const seen = new Set();
    for (const click of clickMatches(criterion)) {
        const targetName = targetNameFromClick(criterion, click);
        if (!targetName)
            continue;
        const targetRole = targetRoleFromCriterion(criterion, click.index);
        const key = `${targetRole}:${targetName.toLowerCase()}`;
        if (seen.has(key))
            continue;
        seen.add(key);
        targets.push({ targetRole, targetName });
    }
    if (!targets.length) {
        const click = clickMatch(criterion);
        const targetName = targetNameFromCriterion(criterion);
        if (click && targetName)
            targets.push({ targetRole: targetRoleFromCriterion(criterion, click.index), targetName });
    }
    return targets.slice(0, 5);
}
function expectedTextFromCriterion(criterion, targetNames) {
    const afterThen = /(?:then|after(?:wards)?|and then|should|must|will)\b|(?:然后|之后|随后|并且|应该|应当|必须|会)/i.exec(criterion);
    const tail = afterThen ? criterion.slice(afterThen.index) : criterion;
    const expected = firstQuotedAfter(tail, /(?:(?:show|shows|display|displays|see|visible|appear|appears|contain|contains|include|includes|render|renders|open|opens)\w*|显示|出现|看到|可见|包含|包括|渲染|打开)\s*["'`“‘「『]/i);
    const ignored = new Set(targetNames.map(item => clean(item).toLowerCase()));
    if (expected && !ignored.has(expected.toLowerCase()))
        return expected;
    return quotedText(tail).find(item => !ignored.has(item.toLowerCase())) || "";
}
function browserAssertionKey(assertion) {
    return [
        assertion.type,
        assertion.selector,
        assertion.locator,
        assertion.label,
        assertion.role,
        assertion.name,
        assertion.text,
        assertion.value,
        assertion.expression,
        assertion.key,
        assertion.method,
        assertion.urlIncludes,
        assertion.url_includes,
        assertion.url,
        Array.isArray(assertion.status) ? assertion.status.join("|") : assertion.status,
        Array.isArray(assertion.statusCode) ? assertion.statusCode.join("|") : assertion.statusCode,
        Array.isArray(assertion.status_code) ? assertion.status_code.join("|") : assertion.status_code,
    ].map(value => String(value || "").toLowerCase()).join(":");
}
function addUniqueAssertion(items, seen, assertion) {
    const key = browserAssertionKey(assertion);
    if (seen.has(key))
        return;
    seen.add(key);
    items.push(assertion);
}
function assertionVisibleText(assertion) {
    return clean(String(assertion.text ?? assertion.value ?? assertion.name ?? assertion.label ?? ""));
}
function flowDerivedAssertions(assertions, targetNames, expectedText) {
    const ignored = new Set([...targetNames, expectedText].map(item => clean(item).toLowerCase()).filter(Boolean));
    return assertions
        .filter(item => item.reason !== "explicit_url_path")
        .filter(item => {
        if (item.reason !== "quoted_text")
            return true;
        const visible = assertionVisibleText(item.assertion).toLowerCase();
        return !ignored.has(visible);
    })
        .map(item => item.assertion);
}
function flowName(project, flow) {
    try {
        const parsed = new URL(flow.url);
        return `Acceptance click flow: ${project.name} ${parsed.pathname || "/"}`;
    }
    catch {
        return `Acceptance click flow: ${project.name}`;
    }
}
function flowActions(flow) {
    const waits = flow.expectedUrlPath && flow.expectedUrlPath !== flow.path
        ? [{ type: "waitForUrl", text: flow.expectedUrlPath }]
        : [];
    const effectSignals = [
        "url",
        "title",
        "page_text",
        "dom",
        "dialog",
        "popup",
        "download",
    ];
    return [
        { type: "goto", url: flow.url, waitUntil: "domcontentloaded" },
        ...flow.targets.map(target => ({
            type: "click",
            role: target.targetRole,
            name: target.targetName,
            exact: true,
            verifyEffect: true,
            effectSignals,
        })),
        ...waits,
        { type: "waitForTimeout", value: "250" },
    ];
}
function flowAssertions(flow) {
    const assertions = [];
    const seen = new Set();
    for (const assertion of [
        { type: "pageNotBlank" },
        ...(flow.expectedText ? [{ type: "text", text: flow.expectedText }] : []),
        { type: "urlIncludes", text: flow.expectedUrlPath || flow.path || "/" },
        ...flow.derivedAssertions,
        { type: "consoleNoErrors" },
        { type: "networkNoErrors" },
    ])
        addUniqueAssertion(assertions, seen, assertion);
    return assertions;
}
function buildAcceptanceClickFlows(project, acceptanceCriteria = []) {
    if (!project.targetUrl)
        return [];
    const flows = [];
    const seen = new Set();
    for (const group of (0, acceptance_derived_checks_1.buildAcceptanceDerivedBrowserAssertionsByCriterion)(acceptanceCriteria)) {
        const criterion = group.criterion;
        if (!looksLikePureClickCriterion(criterion))
            continue;
        const click = clickMatch(criterion);
        if (!click)
            continue;
        const pathItems = group.assertions.filter(item => item.reason === "explicit_url_path");
        const path = String(pathItems[0]?.assertion.text || pathItems[0]?.assertion.value || "");
        const expectedUrlPath = String(pathItems[pathItems.length - 1]?.assertion.text || pathItems[pathItems.length - 1]?.assertion.value || path || "/");
        const url = path ? (0, utils_1.resolveUrl)(project.targetUrl, path) : project.targetUrl;
        const targets = clickTargetsFromCriterion(criterion);
        const targetNames = targets.map(target => target.targetName);
        const expectedText = expectedTextFromCriterion(criterion, targetNames);
        if (!url || !targets.length || (!expectedText && expectedUrlPath === path))
            continue;
        const firstTarget = targets[0];
        const key = `${url}:${targets.map(target => `${target.targetRole}:${target.targetName.toLowerCase()}`).join(">")}:${expectedUrlPath.toLowerCase()}:${expectedText.toLowerCase()}`;
        if (seen.has(key))
            continue;
        seen.add(key);
        flows.push({
            criterion,
            url,
            path: path || "/",
            expectedUrlPath,
            targetRole: firstTarget.targetRole,
            targetName: firstTarget.targetName,
            targets,
            expectedText,
            derivedAssertions: flowDerivedAssertions(group.assertions, targetNames, expectedText),
        });
    }
    return flows;
}
function buildAcceptanceClickFlowBrowserChecks(project, acceptanceCriteria = []) {
    return buildAcceptanceClickFlows(project, acceptanceCriteria).map(flow => ({
        name: flowName(project, flow),
        url: flow.url,
        probeType: exports.ACCEPTANCE_CLICK_FLOW_PROBE_TYPE,
        context: {
            source: "acceptance_criteria",
            generatedBy: exports.ACCEPTANCE_CLICK_FLOW_PROBE_TYPE,
            acceptanceCriteria: [flow.criterion],
            clickTargets: flow.targets,
            expectedText: flow.expectedText,
            expectedUrlPath: flow.expectedUrlPath,
        },
        actions: flowActions(flow),
        assertions: flowAssertions(flow),
        screenshot: true,
    }));
}
//# sourceMappingURL=acceptance-click-flows.js.map