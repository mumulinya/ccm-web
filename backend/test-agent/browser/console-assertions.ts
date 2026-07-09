import { BrowserAssertionSpec } from "../types";

function text(value: any) {
  return String(value ?? "").trim();
}

export function normalizeBrowserConsoleLines(lines: string[]) {
  return lines
    .flatMap(line => String(line ?? "").split(/\r?\n/))
    .map(line => line.trim())
    .filter(Boolean);
}

function consoleAssertionExpected(assertion: BrowserAssertionSpec) {
  return text(
    assertion.messageIncludes
    || assertion.message_includes
    || assertion.message
    || assertion.value
    || assertion.text,
  );
}

function consoleLineLevel(line: string) {
  const normalized = text(line).toLowerCase();
  const bracketed = normalized.match(/^\[(error|exception|pageerror|warning|warn|info|log|debug|trace|assert)\]\s*/i);
  if (bracketed) return bracketed[1] === "warn" ? "warning" : bracketed[1];
  const explicit = normalized.match(/^(?:\[[^\]]+\]\s*)?(error|exception|pageerror|warning|warn|info|log|debug|trace|assert)\s*[:\]]/i);
  if (explicit) return explicit[1] === "warn" ? "warning" : explicit[1];
  if (/\b(uncaught|exception|pageerror|console error)\b/i.test(normalized)) return "error";
  if (/\b(console warning|warning:|warn:)\b/i.test(normalized)) return "warning";
  return "";
}

export function isBrowserConsoleErrorLine(line: string) {
  const level = consoleLineLevel(line);
  return level === "error" || level === "exception" || level === "pageerror" || level === "assert";
}

export function isBrowserConsoleWarningLine(line: string) {
  return consoleLineLevel(line) === "warning";
}

export function filterBrowserConsoleErrorLines(lines: string[]) {
  return normalizeBrowserConsoleLines(lines).filter(isBrowserConsoleErrorLine);
}

export function browserConsoleAssertionHasExpectation(assertion: BrowserAssertionSpec) {
  if (assertion.type === "consoleIncludes" || assertion.type === "consoleNotIncludes") {
    return Boolean(consoleAssertionExpected(assertion));
  }
  return assertion.type === "consoleNoWarnings";
}

export function browserConsoleAssertionIsNegative(assertion: BrowserAssertionSpec) {
  return assertion.type === "consoleNotIncludes" || assertion.type === "consoleNoWarnings";
}

export function browserConsoleAssertionSettleMs(assertion: BrowserAssertionSpec, defaultTimeout: number, fallback = 500) {
  const raw = assertion.settleMs ?? assertion.settle_ms ?? fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(value, Math.max(1, Number(defaultTimeout || fallback))));
}

export function browserConsoleAssertionDetail(assertion: BrowserAssertionSpec) {
  if (assertion.type === "consoleNoWarnings") return "no console warning messages";
  const expected = consoleAssertionExpected(assertion);
  return expected ? `expected substring length=${expected.length}` : "console message substring";
}

export function findMatchingBrowserConsoleLine(lines: string[], assertion: BrowserAssertionSpec) {
  const normalized = normalizeBrowserConsoleLines(lines);
  if (assertion.type === "consoleNoWarnings") {
    return normalized.find(isBrowserConsoleWarningLine) || "";
  }
  const expected = consoleAssertionExpected(assertion);
  if (!expected) return "";
  return normalized.find(line => line.includes(expected)) || "";
}

export async function waitForBrowserConsoleLine(lines: string[], assertion: BrowserAssertionSpec, timeout: number) {
  const deadline = Date.now() + Math.max(1, timeout);
  while (Date.now() <= deadline) {
    const matched = findMatchingBrowserConsoleLine(lines, assertion);
    if (matched) return matched;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  return "";
}

export async function waitForAbsentBrowserConsoleLine(lines: string[], assertion: BrowserAssertionSpec, settleMs: number) {
  const deadline = Date.now() + Math.max(0, settleMs);
  while (true) {
    const matched = findMatchingBrowserConsoleLine(lines, assertion);
    if (matched) return matched;
    const remaining = deadline - Date.now();
    if (remaining <= 0) break;
    await new Promise(resolve => setTimeout(resolve, Math.min(100, remaining)));
  }
  return "";
}
