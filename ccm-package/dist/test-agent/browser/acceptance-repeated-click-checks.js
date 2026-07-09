"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ACCEPTANCE_REPEATED_CLICK_PROBE_TYPE = void 0;
exports.acceptanceRepeatedClickIntent = acceptanceRepeatedClickIntent;
exports.buildAcceptanceRepeatedClickBrowserChecks = buildAcceptanceRepeatedClickBrowserChecks;
const utils_1 = require("../utils");
const acceptance_derived_checks_1 = require("./acceptance-derived-checks");
exports.ACCEPTANCE_REPEATED_CLICK_PROBE_TYPE = "acceptance_repeated_click";
function clean(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
}
function quotedTextSpans(value) {
    const spans = [];
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
                spans.push({ text, index: match.index, end: match.index + match[0].length });
        }
    }
    return spans.sort((a, b) => a.index - b.index);
}
function clickMatches(criterion) {
    const matches = [];
    const pattern = /(?:\b(?:click|clicking|press|tap)\b|点击|点按|轻触|按下)/ig;
    let match;
    while ((match = pattern.exec(criterion)))
        matches.push({ index: match.index, text: match[0] });
    return matches;
}
function chineseRepeatCount(value) {
    const text = clean(value);
    const counts = {
        两: 2,
        二: 2,
        三: 3,
        四: 4,
        五: 5,
        六: 6,
        七: 7,
        八: 8,
        九: 9,
        十: 10,
    };
    return counts[text] || 0;
}
function repeatWordCount(value) {
    const word = clean(value).toLowerCase();
    const counts = {
        two: 2,
        three: 3,
        four: 4,
        five: 5,
        six: 6,
        seven: 7,
        eight: 8,
        nine: 9,
        ten: 10,
    };
    return counts[word] || 0;
}
function boundedRepeatCount(value) {
    if (!Number.isFinite(value))
        return 3;
    return Math.max(2, Math.min(10, Math.floor(value)));
}
function repeatedClickMatch(tail) {
    const match = /\b(?:(\d+)|(two|three|four|five|six|seven|eight|nine|ten))\s+times?\b|\btwice\b|\bthrice\b|\brepeatedly\b|\bmultiple\s+times\b|(?:(\d+)|[两二三四五六七八九十])\s*次|多次|重复/i.exec(tail);
    if (!match)
        return null;
    let repeatCount = 3;
    if (match[1])
        repeatCount = Number(match[1]);
    else if (match[2])
        repeatCount = repeatWordCount(match[2]);
    else if (match[3])
        repeatCount = Number(match[3]);
    else if (/^[两二三四五六七八九十]\s*次$/.test(match[0]))
        repeatCount = chineseRepeatCount(match[0].replace(/\s*次$/, ""));
    else if (/\btwice\b/i.test(match[0]))
        repeatCount = 2;
    else if (/\bthrice\b/i.test(match[0]))
        repeatCount = 3;
    return { index: match.index, end: match.index + match[0].length, repeatCount: boundedRepeatCount(repeatCount) };
}
function acceptanceRepeatedClickIntent(criterion) {
    for (const click of clickMatches(criterion)) {
        const tail = criterion.slice(click.index + click.text.length);
        const repeat = repeatedClickMatch(tail);
        if (repeat && repeat.index <= 140)
            return true;
    }
    return false;
}
function targetRoleFromContext(context) {
    return /\b(?:link|nav|navigation|menu item|anchor)\b/i.test(context) || /(?:链接|导航|菜单项)/.test(context) ? "link" : "button";
}
function unquotedTarget(segment) {
    const withoutLeading = clean(segment)
        .replace(/^(?:the|a|an)\s+/i, "")
        .replace(/^(?:button|link|nav(?:igation)? item|menu item)\s+/i, "")
        .replace(/\s+(?:button|link|nav(?:igation)? item|menu item)$/i, "")
        .replace(/^(?:按钮|链接|导航项|菜单项)\s*/i, "")
        .replace(/\s*(?:按钮|链接|导航项|菜单项)$/i, "")
        .trim();
    if (!withoutLeading || withoutLeading.length > 80)
        return "";
    if (/["'`“‘「『]/.test(withoutLeading))
        return "";
    if (/^(?:button|link|page|route|url|path)$/i.test(withoutLeading))
        return "";
    if (/^\/[^\s]+/.test(withoutLeading))
        return "";
    return withoutLeading;
}
function repeatedClickTarget(criterion) {
    const quotes = quotedTextSpans(criterion);
    for (const click of clickMatches(criterion)) {
        const tailStart = click.index + click.text.length;
        const tail = criterion.slice(tailStart);
        const repeat = repeatedClickMatch(tail);
        if (!repeat || repeat.index > 140)
            continue;
        const repeatIndex = tailStart + repeat.index;
        const quotedTarget = quotes.find(quote => quote.index >= tailStart && quote.end <= repeatIndex);
        const segment = criterion.slice(tailStart, repeatIndex);
        const targetName = quotedTarget?.text || unquotedTarget(segment);
        if (!targetName)
            continue;
        const context = criterion.slice(Math.max(0, click.index - 80), Math.min(criterion.length, repeatIndex + 80));
        return {
            targetName,
            targetRole: targetRoleFromContext(context),
            repeatCount: repeat.repeatCount,
            repeatIndex,
        };
    }
    return null;
}
function expectedTextFromCriterion(criterion, targetName, repeatIndex) {
    const ignored = clean(targetName).toLowerCase();
    const tailMarker = /(?:then|after(?:wards)?|should|must|will)\b|(?:然后|之后|随后|并且|应该|应当|必须|会)/i.exec(criterion.slice(repeatIndex));
    const tailStart = tailMarker ? repeatIndex + tailMarker.index : repeatIndex;
    return quotedTextSpans(criterion)
        .filter(quote => quote.index >= tailStart)
        .map(quote => quote.text)
        .find(text => clean(text).toLowerCase() !== ignored) || "";
}
function assertionKey(assertion) {
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
    ].map(value => String(value || "").toLowerCase()).join(":");
}
function addUniqueAssertion(assertions, seen, assertion) {
    const key = assertionKey(assertion);
    if (seen.has(key))
        return;
    seen.add(key);
    assertions.push(assertion);
}
function assertionVisibleText(assertion) {
    return clean(String(assertion.text ?? assertion.value ?? assertion.name ?? assertion.label ?? ""));
}
function derivedAssertionsForRepeatedClick(assertions, targetName, expectedText) {
    const ignored = new Set([targetName, expectedText].map(item => clean(item).toLowerCase()).filter(Boolean));
    return assertions
        .filter(item => item.reason !== "explicit_url_path")
        .filter(item => {
        if (item.reason !== "quoted_text")
            return true;
        return !ignored.has(assertionVisibleText(item.assertion).toLowerCase());
    })
        .map(item => item.assertion);
}
function checkName(project, spec) {
    try {
        const parsed = new URL(spec.url);
        return `Adversarial repeated click: ${project.name} ${parsed.pathname || "/"}`;
    }
    catch {
        return `Adversarial repeated click: ${project.name}`;
    }
}
function actionsForSpec(spec) {
    const actions = [
        { type: "goto", url: spec.url, waitUntil: "domcontentloaded" },
        ...Array.from({ length: spec.repeatCount }, () => ({
            type: "click",
            role: spec.targetRole,
            name: spec.targetName,
            exact: true,
        })),
    ];
    if (spec.expectedUrlPath && spec.expectedUrlPath !== spec.path)
        actions.push({ type: "waitForUrl", text: spec.expectedUrlPath });
    actions.push({ type: "waitForTimeout", value: "250" });
    return actions;
}
function assertionsForSpec(spec) {
    const assertions = [];
    const seen = new Set();
    for (const assertion of [
        { type: "pageNotBlank" },
        ...(spec.expectedText ? [{ type: "text", text: spec.expectedText }] : []),
        { type: "urlIncludes", text: spec.expectedUrlPath || spec.path || "/" },
        ...spec.derivedAssertions,
        { type: "consoleNoErrors" },
        { type: "networkNoErrors" },
    ])
        addUniqueAssertion(assertions, seen, assertion);
    return assertions;
}
function buildRepeatedClickSpecs(project, acceptanceCriteria = []) {
    if (!project.targetUrl)
        return [];
    const specs = [];
    const seen = new Set();
    for (const group of (0, acceptance_derived_checks_1.buildAcceptanceDerivedBrowserAssertionsByCriterion)(acceptanceCriteria)) {
        const target = repeatedClickTarget(group.criterion);
        if (!target)
            continue;
        const pathItems = group.assertions.filter(item => item.reason === "explicit_url_path");
        const path = String(pathItems[0]?.assertion.text || pathItems[0]?.assertion.value || "");
        const expectedUrlPath = String(pathItems[pathItems.length - 1]?.assertion.text || pathItems[pathItems.length - 1]?.assertion.value || path || "/");
        const url = path ? (0, utils_1.resolveUrl)(project.targetUrl, path) : project.targetUrl;
        const expectedText = expectedTextFromCriterion(group.criterion, target.targetName, target.repeatIndex);
        if (!url || (!expectedText && expectedUrlPath === path))
            continue;
        const key = `${url}:${target.targetRole}:${target.targetName.toLowerCase()}:${target.repeatCount}:${expectedUrlPath.toLowerCase()}:${expectedText.toLowerCase()}`;
        if (seen.has(key))
            continue;
        seen.add(key);
        specs.push({
            criterion: group.criterion,
            url,
            path: path || "/",
            expectedUrlPath,
            targetRole: target.targetRole,
            targetName: target.targetName,
            repeatCount: target.repeatCount,
            expectedText,
            derivedAssertions: derivedAssertionsForRepeatedClick(group.assertions, target.targetName, expectedText),
        });
    }
    return specs;
}
function buildAcceptanceRepeatedClickBrowserChecks(project, acceptanceCriteria = []) {
    return buildRepeatedClickSpecs(project, acceptanceCriteria).map(spec => ({
        name: checkName(project, spec),
        url: spec.url,
        adversarial: true,
        probeType: exports.ACCEPTANCE_REPEATED_CLICK_PROBE_TYPE,
        probe_type: exports.ACCEPTANCE_REPEATED_CLICK_PROBE_TYPE,
        context: {
            source: "acceptance_criteria",
            generatedBy: exports.ACCEPTANCE_REPEATED_CLICK_PROBE_TYPE,
            acceptanceCriteria: [spec.criterion],
            clickTarget: {
                role: spec.targetRole,
                name: spec.targetName,
            },
            repeatCount: spec.repeatCount,
            expectedText: spec.expectedText,
            expectedUrlPath: spec.expectedUrlPath,
        },
        actions: actionsForSpec(spec),
        assertions: assertionsForSpec(spec),
        screenshot: true,
    }));
}
//# sourceMappingURL=acceptance-repeated-click-checks.js.map