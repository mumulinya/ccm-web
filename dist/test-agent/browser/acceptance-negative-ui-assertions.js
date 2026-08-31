"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildAcceptanceNegativeUiBrowserAssertions = buildAcceptanceNegativeUiBrowserAssertions;
function clean(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
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
function looksLikePathOrUrl(value) {
    return /^https?:\/\//i.test(value) || /^\/[^\s]+/.test(value);
}
function usefulUiText(value) {
    if (!value || looksLikePathOrUrl(value))
        return "";
    if (/^[\d\s.,:;!?/_-]+$/.test(value))
        return "";
    return value;
}
function sentenceTail(value) {
    return value.replace(/[\s\S]*[.!?;。！？；\r\n]/, "");
}
function sentenceHead(value) {
    const punctuation = value.search(/[.!?;。！？；\r\n]/);
    return punctuation >= 0 ? value.slice(0, punctuation) : value;
}
function negativeBeforeQuotedTarget(before) {
    return /\b(?:does\s+not|do\s+not|did\s+not|must\s+not|should\s+not|cannot|can't|won't|never)\s+(?:show|display|render|include|contain|expose|surface|list|emit|return|present|showing|displaying)[^.!?;。！？；\r\n]{0,80}$/i.test(before)
        || /\b(?:no|without)\s+(?:visible\s+|displayed\s+|rendered\s+|error\s+|warning\s+|debug\s+|obsolete\s+|removed\s+|deleted\s+|forbidden\s+|stale\s+|unexpected\s+|extra\s+)?$/i.test(before)
        || /(?:不要|不应|不能|不会|不得|没有|隐藏|移除|删除)[^。！？；\r\n]{0,80}$/.test(before);
}
function negativeAfterQuotedTarget(after) {
    return /^\s*(?:(?:should|must|does|do|did|can|may|will)\s+not\s+(?:be\s+)?(?:visible|shown|displayed|present|rendered|included|contained|listed|exposed|shown\s+on\s+screen|in\s+the\s+dom|exist|exists?|appear|appears)|(?:is|are|was|were)\s+not\s+(?:visible|shown|displayed|present|rendered|included|contained|listed|exposed|in\s+the\s+dom)|not\s+(?:visible|shown|displayed|present|rendered|included|contained|listed|exposed|in\s+the\s+dom))\b/i.test(after)
        || /^\s*(?:(?:should|must|needs?\s+to|has\s+to)\s+(?:be\s+)?(?:hidden|absent|removed|deleted|detached|suppressed)|(?:is|are|was|were|becomes?|remains?)\s+(?:hidden|absent|removed|deleted|detached|suppressed)|(?:hidden|absent|removed|deleted|detached|suppressed))\b/i.test(after)
        || /^\s*(?:不应|不能|不得|不会|不要|不可|不再|没有|隐藏|移除|删除|不可见|不存在)/.test(after);
}
function associatedNegativeContext(criterion, quote) {
    const before = sentenceTail(criterion.slice(Math.max(0, quote.index - 140), quote.index));
    const after = sentenceHead(criterion.slice(quote.end, Math.min(criterion.length, quote.end + 140)));
    if (!negativeBeforeQuotedTarget(before) && !negativeAfterQuotedTarget(after))
        return "";
    return `${before}${quote.text}${after}`;
}
function requiresDomAbsence(context) {
    return /\b(?:not\s+(?:be\s+)?present|must\s+not\s+(?:be\s+)?present|should\s+not\s+(?:be\s+)?present|not\s+(?:be\s+)?in\s+the\s+dom|absent|removed|deleted|detached|does\s+not\s+exist|do\s+not\s+exist|must\s+not\s+exist|should\s+not\s+exist|no\s+dom)\b/i.test(context)
        || /(?:不存在|移除|删除|从\s*dom\s*移除)/i.test(context);
}
function assertionForQuote(criterion, quote) {
    const text = usefulUiText(quote.text);
    if (!text)
        return null;
    const context = associatedNegativeContext(criterion, quote);
    if (!context)
        return null;
    return {
        type: requiresDomAbsence(context) ? "notPresent" : "notVisible",
        text,
        exact: true,
    };
}
function assertionKey(assertion) {
    return [
        assertion.type,
        assertion.text,
        assertion.label,
        assertion.role,
        assertion.name,
    ].map(value => String(value || "").toLowerCase()).join(":");
}
function buildAcceptanceNegativeUiBrowserAssertions(criterion) {
    const assertions = [];
    const seen = new Set();
    for (const quote of quotedTextSpans(criterion)) {
        const assertion = assertionForQuote(criterion, quote);
        if (!assertion)
            continue;
        const key = assertionKey(assertion);
        if (seen.has(key))
            continue;
        seen.add(key);
        assertions.push(assertion);
    }
    return assertions;
}
//# sourceMappingURL=acceptance-negative-ui-assertions.js.map