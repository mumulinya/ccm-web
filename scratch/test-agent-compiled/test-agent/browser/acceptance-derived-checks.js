"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildAcceptanceDerivedBrowserAssertions = buildAcceptanceDerivedBrowserAssertions;
function clean(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
}
function addUnique(items, seen, key, item) {
    if (seen.has(key))
        return;
    seen.add(key);
    items.push(item);
}
function quotedText(criterion) {
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
        while ((match = pattern.exec(criterion))) {
            const value = clean(match[1]);
            if (value)
                out.push(value);
        }
    }
    return out;
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
function buildAcceptanceDerivedBrowserAssertions(criteria) {
    const derived = [];
    const seen = new Set();
    for (const criterion of criteria.map(clean).filter(Boolean)) {
        for (const text of quotedText(criterion)) {
            const visible = usefulVisibleText(text);
            if (!visible)
                continue;
            addUnique(derived, seen, `text:${visible.toLowerCase()}`, {
                criterion,
                reason: "quoted_text",
                assertion: { type: "text", text: visible },
            });
        }
        for (const path of explicitUrlPaths(criterion)) {
            addUnique(derived, seen, `url:${path.toLowerCase()}`, {
                criterion,
                reason: "explicit_url_path",
                assertion: { type: "urlIncludes", text: path },
            });
        }
    }
    return derived;
}
