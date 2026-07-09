"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeBrowserConsoleLines = normalizeBrowserConsoleLines;
exports.isBrowserConsoleErrorLine = isBrowserConsoleErrorLine;
exports.isBrowserConsoleWarningLine = isBrowserConsoleWarningLine;
exports.filterBrowserConsoleErrorLines = filterBrowserConsoleErrorLines;
exports.browserConsoleAssertionHasExpectation = browserConsoleAssertionHasExpectation;
exports.browserConsoleAssertionIsNegative = browserConsoleAssertionIsNegative;
exports.browserConsoleAssertionSettleMs = browserConsoleAssertionSettleMs;
exports.browserConsoleAssertionDetail = browserConsoleAssertionDetail;
exports.findMatchingBrowserConsoleLine = findMatchingBrowserConsoleLine;
exports.waitForBrowserConsoleLine = waitForBrowserConsoleLine;
exports.waitForAbsentBrowserConsoleLine = waitForAbsentBrowserConsoleLine;
function text(value) {
    return String(value ?? "").trim();
}
function normalizeBrowserConsoleLines(lines) {
    return lines
        .flatMap(line => String(line ?? "").split(/\r?\n/))
        .map(line => line.trim())
        .filter(Boolean);
}
function consoleAssertionExpected(assertion) {
    return text(assertion.messageIncludes
        || assertion.message_includes
        || assertion.message
        || assertion.value
        || assertion.text);
}
function consoleLineLevel(line) {
    const normalized = text(line).toLowerCase();
    const bracketed = normalized.match(/^\[(error|exception|pageerror|warning|warn|info|log|debug|trace|assert)\]\s*/i);
    if (bracketed)
        return bracketed[1] === "warn" ? "warning" : bracketed[1];
    const explicit = normalized.match(/^(?:\[[^\]]+\]\s*)?(error|exception|pageerror|warning|warn|info|log|debug|trace|assert)\s*[:\]]/i);
    if (explicit)
        return explicit[1] === "warn" ? "warning" : explicit[1];
    if (/\b(uncaught|exception|pageerror|console error)\b/i.test(normalized))
        return "error";
    if (/\b(console warning|warning:|warn:)\b/i.test(normalized))
        return "warning";
    return "";
}
function isBrowserConsoleErrorLine(line) {
    const level = consoleLineLevel(line);
    return level === "error" || level === "exception" || level === "pageerror" || level === "assert";
}
function isBrowserConsoleWarningLine(line) {
    return consoleLineLevel(line) === "warning";
}
function filterBrowserConsoleErrorLines(lines) {
    return normalizeBrowserConsoleLines(lines).filter(isBrowserConsoleErrorLine);
}
function browserConsoleAssertionHasExpectation(assertion) {
    if (assertion.type === "consoleIncludes" || assertion.type === "consoleNotIncludes") {
        return Boolean(consoleAssertionExpected(assertion));
    }
    return assertion.type === "consoleNoWarnings";
}
function browserConsoleAssertionIsNegative(assertion) {
    return assertion.type === "consoleNotIncludes" || assertion.type === "consoleNoWarnings";
}
function browserConsoleAssertionSettleMs(assertion, defaultTimeout, fallback = 500) {
    const raw = assertion.settleMs ?? assertion.settle_ms ?? fallback;
    const value = Number(raw);
    if (!Number.isFinite(value))
        return fallback;
    return Math.max(0, Math.min(value, Math.max(1, Number(defaultTimeout || fallback))));
}
function browserConsoleAssertionDetail(assertion) {
    if (assertion.type === "consoleNoWarnings")
        return "no console warning messages";
    const expected = consoleAssertionExpected(assertion);
    return expected ? `expected substring length=${expected.length}` : "console message substring";
}
function findMatchingBrowserConsoleLine(lines, assertion) {
    const normalized = normalizeBrowserConsoleLines(lines);
    if (assertion.type === "consoleNoWarnings") {
        return normalized.find(isBrowserConsoleWarningLine) || "";
    }
    const expected = consoleAssertionExpected(assertion);
    if (!expected)
        return "";
    return normalized.find(line => line.includes(expected)) || "";
}
async function waitForBrowserConsoleLine(lines, assertion, timeout) {
    const deadline = Date.now() + Math.max(1, timeout);
    while (Date.now() <= deadline) {
        const matched = findMatchingBrowserConsoleLine(lines, assertion);
        if (matched)
            return matched;
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    return "";
}
async function waitForAbsentBrowserConsoleLine(lines, assertion, settleMs) {
    const deadline = Date.now() + Math.max(0, settleMs);
    while (true) {
        const matched = findMatchingBrowserConsoleLine(lines, assertion);
        if (matched)
            return matched;
        const remaining = deadline - Date.now();
        if (remaining <= 0)
            break;
        await new Promise(resolve => setTimeout(resolve, Math.min(100, remaining)));
    }
    return "";
}
//# sourceMappingURL=console-assertions.js.map