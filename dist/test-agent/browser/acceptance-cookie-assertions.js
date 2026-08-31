"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildAcceptanceCookieBrowserAssertions = buildAcceptanceCookieBrowserAssertions;
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
function quotesBetween(quotes, start, end) {
    return quotes.filter(item => item.index >= start && item.end <= end);
}
function quoteAfter(quotes, index, maxDistance = 180) {
    return quotes.find(item => item.index >= index && item.index - index <= maxDistance);
}
function quoteBefore(quotes, index, maxDistance = 100) {
    return [...quotes].reverse().find(item => item.end <= index && index - item.end <= maxDistance);
}
function comparisonType(value) {
    return /\b(?:include|includes|included|contain|contains|contained)\b/i.test(value)
        ? "cookieValueIncludes"
        : "cookieValueEquals";
}
function unquotedCookieNameBetween(segment) {
    const match = /\b(?:cookie\s+)?(?:named|name|key)?\s*([a-zA-Z0-9._:-]{2,120})\b/i.exec(segment);
    const value = clean(match?.[1] || "");
    if (!value || /^(?:the|a|an|value|exists?|present|set|is|equals?|includes?|contains?)$/i.test(value))
        return "";
    return value;
}
function unquotedCookieNameBefore(criterion, cookieIndex) {
    const before = criterion.slice(Math.max(0, cookieIndex - 120), cookieIndex);
    const matches = before.match(/[a-zA-Z0-9._:-]{2,120}\s*$/);
    const value = clean(matches?.[0] || "");
    if (!value || /^(?:the|a|an|this|that|sets?|has|writes?|creates?)$/i.test(value))
        return "";
    return value;
}
function cookieNameForRange(criterion, quotes, cookieStart, rangeEnd) {
    return quotesBetween(quotes, cookieStart, rangeEnd)[0]?.text
        || unquotedCookieNameBetween(criterion.slice(cookieStart, rangeEnd))
        || quoteBefore(quotes, cookieStart)?.text
        || unquotedCookieNameBefore(criterion, cookieStart);
}
function findCookieComparison(criterion, start) {
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
function findCookieExistence(criterion, start) {
    const pattern = /\b(?:exists?|present|available|is\s+set|gets?\s+set|sets?|created|written|saved)\b/ig;
    pattern.lastIndex = start;
    let match;
    while ((match = pattern.exec(criterion))) {
        if (match.index - start > 180)
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
function buildAcceptanceCookieBrowserAssertions(criterion) {
    const assertions = [];
    const seen = new Set();
    const quotes = quotedTextSpans(criterion);
    const cookiePattern = /\bcookies?\b/ig;
    let match;
    while ((match = cookiePattern.exec(criterion))) {
        const afterCookie = match.index + match[0].length;
        const comparison = findCookieComparison(criterion, afterCookie);
        if (comparison) {
            const name = cookieNameForRange(criterion, quotes, afterCookie, comparison.index);
            const expected = quoteAfter(quotes, comparison.end)?.text;
            if (name && expected !== undefined) {
                const assertion = { type: comparisonType(comparison.text), key: name, value: expected };
                const key = assertionKey(assertion);
                if (!seen.has(key)) {
                    seen.add(key);
                    assertions.push(assertion);
                }
                continue;
            }
        }
        const existence = findCookieExistence(criterion, afterCookie);
        const rangeEnd = existence?.index || Math.min(criterion.length, afterCookie + 160);
        const name = cookieNameForRange(criterion, quotes, afterCookie, rangeEnd);
        if (!name || !existence)
            continue;
        const assertion = { type: "cookieExists", key: name };
        const key = assertionKey(assertion);
        if (seen.has(key))
            continue;
        seen.add(key);
        assertions.push(assertion);
    }
    return assertions;
}
//# sourceMappingURL=acceptance-cookie-assertions.js.map