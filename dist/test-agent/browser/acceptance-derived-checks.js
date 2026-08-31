"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildAcceptanceDerivedBrowserAssertionsByCriterion = buildAcceptanceDerivedBrowserAssertionsByCriterion;
exports.buildAcceptanceDerivedBrowserAssertions = buildAcceptanceDerivedBrowserAssertions;
const acceptance_cookie_assertions_1 = require("./acceptance-cookie-assertions");
const acceptance_network_assertions_1 = require("./acceptance-network-assertions");
const acceptance_negative_ui_assertions_1 = require("./acceptance-negative-ui-assertions");
const acceptance_storage_assertions_1 = require("./acceptance-storage-assertions");
function clean(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
}
function addUnique(items, seen, key, item) {
    if (seen.has(key))
        return;
    seen.add(key);
    items.push(item);
}
function quotedTextSpans(criterion) {
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
        while ((match = pattern.exec(criterion))) {
            const value = clean(match[1]);
            if (value)
                spans.push({ text: value, index: match.index, end: match.index + match[0].length });
        }
    }
    return spans.sort((a, b) => a.index - b.index);
}
function explicitUrlPaths(criterion) {
    const out = [];
    const pattern = /(^|[\s(["'`])((?:\/(?!\/)[a-zA-Z0-9._~!$&'()*+,;=:@%-]+)+(?:\?[a-zA-Z0-9._~!$&'()*+,;=:@/?%-]+)?)/g;
    let match;
    while ((match = pattern.exec(criterion))) {
        const value = clean(match[2]).replace(/[),.;:!?，。；：！？]+$/g, "");
        if (value.length >= 2)
            out.push(value);
    }
    return out;
}
function looksLikePathOrUrl(value) {
    return /^https?:\/\//i.test(value) || /^\/[^\s]+/.test(value);
}
function usefulVisibleText(value) {
    if (!value || looksLikePathOrUrl(value))
        return "";
    if (/^[\d\s.,:;!?/_-]+$/.test(value))
        return "";
    return value;
}
function assertionKey(item) {
    const assertion = item.assertion;
    const target = [
        assertion.selector,
        assertion.locator,
        assertion.label,
        assertion.role,
        assertion.name,
        assertion.text,
        assertion.value,
        assertion.attribute,
        assertion.key,
        assertion.method,
        assertion.urlIncludes,
        assertion.url_includes,
        assertion.url,
        Array.isArray(assertion.status) ? assertion.status.join("|") : assertion.status,
        Array.isArray(assertion.statusCode) ? assertion.statusCode.join("|") : assertion.statusCode,
        Array.isArray(assertion.status_code) ? assertion.status_code.join("|") : assertion.status_code,
        assertion.resourceType,
        assertion.resource_type,
    ].map(value => String(value || "").toLowerCase()).join("|");
    return `${item.reason}:${assertion.type}:${target}`;
}
function quoteBefore(quotes, index) {
    return [...quotes].reverse().find(item => item.end <= index);
}
function quoteAfter(quotes, index) {
    return quotes.find(item => item.index >= index);
}
function targetForQuotedText(criterion, quote, exact = true) {
    const context = criterion.slice(Math.max(0, quote.index - 80), Math.min(criterion.length, quote.end + 80));
    if (/\b(?:field|input|textbox|textarea|select|checkbox|radio)\b/i.test(context))
        return { label: quote.text, exact };
    if (/\btab\b/i.test(context))
        return { role: "tab", name: quote.text, exact };
    if (/\boption\b/i.test(context))
        return { role: "option", name: quote.text, exact };
    if (/\blink\b/i.test(context))
        return { role: "link", name: quote.text, exact };
    if (/\b(?:button|toggle|menu|accordion|disclosure)\b/i.test(context))
        return { role: "button", name: quote.text, exact };
    return { text: quote.text, exact };
}
function semanticComparisonType(criterion, start, end, equalsType, includesType) {
    const segment = criterion.slice(start, end);
    return /\b(?:include|includes|included|contain|contains|contained)\b/i.test(segment) ? includesType : equalsType;
}
function buildAccessibleAssertionsForCriterion(criterion, quotes) {
    const assertions = [];
    const seen = new Set();
    const specs = [
        {
            reason: "accessible_name",
            pattern: /\b(?:accessible|aria)\s+name\b/ig,
            equalsType: "accessibleNameEquals",
            includesType: "accessibleNameIncludes",
        },
        {
            reason: "accessible_description",
            pattern: /\b(?:accessible|aria)\s+description\b/ig,
            equalsType: "accessibleDescriptionEquals",
            includesType: "accessibleDescriptionIncludes",
        },
    ];
    for (const spec of specs) {
        let match;
        while ((match = spec.pattern.exec(criterion))) {
            const expected = quoteAfter(quotes, match.index + match[0].length);
            const target = quoteBefore(quotes, match.index);
            if (!target || !expected || target.index === expected.index)
                continue;
            const type = semanticComparisonType(criterion, match.index, expected.index, spec.equalsType, spec.includesType);
            const assertion = {
                type,
                ...targetForQuotedText(criterion, target, false),
                value: expected.text,
            };
            addUnique(assertions, seen, assertionKey({ criterion, reason: spec.reason, assertion }), {
                criterion,
                reason: spec.reason,
                assertion,
            });
        }
    }
    return assertions;
}
const ARIA_STATE_SPECS = [
    { pattern: /\baria[-\s]?expanded\b/ig, trueType: "ariaExpanded", falseType: "ariaCollapsed" },
    { pattern: /\baria[-\s]?pressed\b/ig, trueType: "ariaPressed", falseType: "ariaNotPressed" },
    { pattern: /\baria[-\s]?selected\b/ig, trueType: "ariaSelected", falseType: "ariaNotSelected" },
    { pattern: /\baria[-\s]?invalid\b/ig, trueType: "ariaInvalid", falseType: "ariaValid" },
    { pattern: /\baria[-\s]?required\b/ig, trueType: "ariaRequired", falseType: "ariaNotRequired" },
];
function ariaStateIsFalse(criterion, start) {
    const segment = criterion.slice(start, Math.min(criterion.length, start + 100));
    return /\b(?:false|no|not|off|closed|collapsed|valid|optional)\b/i.test(segment)
        || /["'`“‘「『]\s*(?:false|no|off)\s*["'`”’」』]/i.test(segment);
}
function targetForAriaState(criterion, quotes, index) {
    const before = quoteBefore(quotes, index);
    const after = quoteAfter(quotes, index);
    if (before && index - before.end <= 140)
        return before;
    if (after && after.index - index <= 140 && !/^(?:true|false|yes|no|on|off)$/i.test(after.text))
        return after;
    return before || after;
}
function buildAriaStateAssertionsForCriterion(criterion, quotes) {
    const assertions = [];
    const seen = new Set();
    for (const spec of ARIA_STATE_SPECS) {
        let match;
        while ((match = spec.pattern.exec(criterion))) {
            const target = targetForAriaState(criterion, quotes, match.index);
            if (!target)
                continue;
            const type = ariaStateIsFalse(criterion, match.index + match[0].length) ? spec.falseType : spec.trueType;
            const assertion = {
                type,
                ...targetForQuotedText(criterion, target),
            };
            addUnique(assertions, seen, assertionKey({ criterion, reason: "aria_state", assertion }), {
                criterion,
                reason: "aria_state",
                assertion,
            });
        }
    }
    return assertions;
}
function buildAcceptanceDerivedBrowserAssertionsForCriterion(criterion) {
    const assertions = [];
    const seen = new Set();
    const quotes = quotedTextSpans(criterion);
    const networkAssertions = (0, acceptance_network_assertions_1.buildAcceptanceNetworkBrowserAssertions)(criterion);
    const networkPaths = new Set(networkAssertions.map(item => item.urlPath.toLowerCase()));
    const semanticAssertions = [
        ...buildAccessibleAssertionsForCriterion(criterion, quotes),
        ...buildAriaStateAssertionsForCriterion(criterion, quotes),
        ...(0, acceptance_storage_assertions_1.buildAcceptanceStorageBrowserAssertions)(criterion).map(assertion => ({
            criterion,
            reason: "web_storage",
            assertion,
        })),
        ...(0, acceptance_cookie_assertions_1.buildAcceptanceCookieBrowserAssertions)(criterion).map(assertion => ({
            criterion,
            reason: "browser_cookie",
            assertion,
        })),
        ...networkAssertions.map(item => ({
            criterion,
            reason: "browser_network",
            assertion: item.assertion,
        })),
        ...(0, acceptance_negative_ui_assertions_1.buildAcceptanceNegativeUiBrowserAssertions)(criterion).map(assertion => ({
            criterion,
            reason: "negative_ui",
            assertion,
        })),
    ];
    if (!semanticAssertions.length) {
        for (const quote of quotes) {
            const visible = usefulVisibleText(quote.text);
            if (!visible)
                continue;
            addUnique(assertions, seen, `text:${visible.toLowerCase()}`, {
                criterion,
                reason: "quoted_text",
                assertion: { type: "text", text: visible },
            });
        }
    }
    else {
        for (const item of semanticAssertions) {
            addUnique(assertions, seen, assertionKey(item), item);
        }
    }
    for (const path of explicitUrlPaths(criterion)) {
        if (networkPaths.has(path.toLowerCase()))
            continue;
        addUnique(assertions, seen, `url:${path.toLowerCase()}`, {
            criterion,
            reason: "explicit_url_path",
            assertion: { type: "urlIncludes", text: path },
        });
    }
    return assertions;
}
function buildAcceptanceDerivedBrowserAssertionsByCriterion(criteria) {
    return criteria
        .map(clean)
        .filter(Boolean)
        .map(criterion => ({
        criterion,
        assertions: buildAcceptanceDerivedBrowserAssertionsForCriterion(criterion),
    }))
        .filter(item => item.assertions.length > 0);
}
function buildAcceptanceDerivedBrowserAssertions(criteria) {
    const derived = [];
    const seen = new Set();
    for (const group of buildAcceptanceDerivedBrowserAssertionsByCriterion(criteria)) {
        for (const item of group.assertions) {
            addUnique(derived, seen, assertionKey(item), item);
        }
    }
    return derived;
}
//# sourceMappingURL=acceptance-derived-checks.js.map