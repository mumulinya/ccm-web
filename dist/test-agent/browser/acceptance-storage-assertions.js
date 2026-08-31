"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildAcceptanceStorageBrowserAssertions = buildAcceptanceStorageBrowserAssertions;
function clean(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
}
function quotedTextSpans(criterion) {
    const spans = [];
    const patterns = [
        /"([^"\r\n]{1,160})"/g,
        /'([^'\r\n]{1,160})'/g,
        /`([^`\r\n]{1,160})`/g,
        /“([^”\r\n]{1,160})”/g,
        /‘([^’\r\n]{1,160})’/g,
        /「([^」\r\n]{1,160})」/g,
        /『([^』\r\n]{1,160})』/g,
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
function quoteAfter(quotes, index, maxDistance = 180) {
    return quotes.find(item => item.index >= index && item.index - index <= maxDistance);
}
function quotesBetween(quotes, start, end) {
    return quotes.filter(item => item.index >= start && item.end <= end);
}
function quoteBefore(quotes, index, maxDistance = 90) {
    return [...quotes].reverse().find(item => item.end <= index && index - item.end <= maxDistance);
}
function comparisonKind(value) {
    return /\b(?:include|includes|included|contain|contains|contained)\b/i.test(value) ? "includes" : "equals";
}
function storageArea(value) {
    return /\bsession/i.test(value) ? "sessionStorage" : "localStorage";
}
function assertionType(area, kind) {
    if (area === "sessionStorage")
        return kind === "includes" ? "sessionStorageIncludes" : "sessionStorageEquals";
    return kind === "includes" ? "localStorageIncludes" : "localStorageEquals";
}
function unquotedKeyBetween(segment) {
    const match = /\b(?:key|item|entry)\s+([a-zA-Z0-9._:-]{2,120})\b/i.exec(segment);
    return clean(match?.[1] || "");
}
function keyBeforeStorage(criterion, quotes, storageIndex, comparisonIndex) {
    const before = quoteBefore(quotes, storageIndex);
    if (!before)
        return "";
    const context = criterion.slice(before.end, comparisonIndex);
    if (!/\b(?:key|item|entry)\b/i.test(context))
        return "";
    return before.text;
}
function findStorageComparison(criterion, start) {
    const pattern = /\b(?:equals?|equal\s+to|is|is\s+set\s+to|set\s+to|has\s+value|value\s+is|includes?|contains?)\b|(?:===|==|=|:)/ig;
    pattern.lastIndex = start;
    let match;
    while ((match = pattern.exec(criterion))) {
        if (match.index - start > 220)
            return null;
        return { index: match.index, end: match.index + match[0].length, text: match[0] };
    }
    return null;
}
function assertionKey(assertion) {
    return [
        assertion.type,
        assertion.key,
        assertion.text,
        assertion.value,
    ].map(value => String(value || "").toLowerCase()).join(":");
}
function buildAcceptanceStorageBrowserAssertions(criterion) {
    const assertions = [];
    const seen = new Set();
    const quotes = quotedTextSpans(criterion);
    const storagePattern = /\b(?:session\s*storage|session_storage|sessionStorage|local\s*storage|local_storage|localStorage|web\s*storage|storage)\b/ig;
    let match;
    while ((match = storagePattern.exec(criterion))) {
        const mention = match[0];
        const comparison = findStorageComparison(criterion, match.index + mention.length);
        if (!comparison)
            continue;
        const quotedKeys = quotesBetween(quotes, match.index + mention.length, comparison.index);
        const key = quotedKeys[0]?.text
            || unquotedKeyBetween(criterion.slice(match.index + mention.length, comparison.index))
            || keyBeforeStorage(criterion, quotes, match.index, comparison.index);
        const value = quoteAfter(quotes, comparison.end)?.text;
        if (!key || value === undefined)
            continue;
        const area = storageArea(mention);
        const type = assertionType(area, comparisonKind(comparison.text));
        const assertion = { type, key, value };
        const keyValue = assertionKey(assertion);
        if (seen.has(keyValue))
            continue;
        seen.add(keyValue);
        assertions.push(assertion);
    }
    return assertions;
}
//# sourceMappingURL=acceptance-storage-assertions.js.map