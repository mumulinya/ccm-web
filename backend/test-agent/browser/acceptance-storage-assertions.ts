import { BrowserAssertionSpec } from "../types";

interface QuotedTextSpan {
  text: string;
  index: number;
  end: number;
}

function clean(value: string) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function quotedTextSpans(criterion: string) {
  const spans: QuotedTextSpan[] = [];
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
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(criterion))) {
      const value = clean(match[1]);
      if (value) spans.push({ text: value, index: match.index, end: match.index + match[0].length });
    }
  }
  return spans.sort((a, b) => a.index - b.index);
}

function quoteAfter(quotes: QuotedTextSpan[], index: number, maxDistance = 180) {
  return quotes.find(item => item.index >= index && item.index - index <= maxDistance);
}

function quotesBetween(quotes: QuotedTextSpan[], start: number, end: number) {
  return quotes.filter(item => item.index >= start && item.end <= end);
}

function quoteBefore(quotes: QuotedTextSpan[], index: number, maxDistance = 90) {
  return [...quotes].reverse().find(item => item.end <= index && index - item.end <= maxDistance);
}

function comparisonKind(value: string): "equals" | "includes" {
  return /\b(?:include|includes|included|contain|contains|contained)\b/i.test(value) ? "includes" : "equals";
}

function storageArea(value: string): "localStorage" | "sessionStorage" {
  return /\bsession/i.test(value) ? "sessionStorage" : "localStorage";
}

function assertionType(area: "localStorage" | "sessionStorage", kind: "equals" | "includes"): BrowserAssertionSpec["type"] {
  if (area === "sessionStorage") return kind === "includes" ? "sessionStorageIncludes" : "sessionStorageEquals";
  return kind === "includes" ? "localStorageIncludes" : "localStorageEquals";
}

function unquotedKeyBetween(segment: string) {
  const match = /\b(?:key|item|entry)\s+([a-zA-Z0-9._:-]{2,120})\b/i.exec(segment);
  return clean(match?.[1] || "");
}

function keyBeforeStorage(criterion: string, quotes: QuotedTextSpan[], storageIndex: number, comparisonIndex: number) {
  const before = quoteBefore(quotes, storageIndex);
  if (!before) return "";
  const context = criterion.slice(before.end, comparisonIndex);
  if (!/\b(?:key|item|entry)\b/i.test(context)) return "";
  return before.text;
}

interface StorageComparisonMatch {
  index: number;
  end: number;
  text: string;
}

function findStorageComparison(criterion: string, start: number): StorageComparisonMatch | null {
  const pattern = /\b(?:equals?|equal\s+to|is|is\s+set\s+to|set\s+to|has\s+value|value\s+is|includes?|contains?)\b|(?:===|==|=|:)/ig;
  pattern.lastIndex = start;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(criterion))) {
    if (match.index - start > 220) return null;
    return { index: match.index, end: match.index + match[0].length, text: match[0] };
  }
  return null;
}

function assertionKey(assertion: BrowserAssertionSpec) {
  return [
    assertion.type,
    assertion.key,
    assertion.text,
    assertion.value,
  ].map(value => String(value || "").toLowerCase()).join(":");
}

export function buildAcceptanceStorageBrowserAssertions(criterion: string): BrowserAssertionSpec[] {
  const assertions: BrowserAssertionSpec[] = [];
  const seen = new Set<string>();
  const quotes = quotedTextSpans(criterion);
  const storagePattern = /\b(?:session\s*storage|session_storage|sessionStorage|local\s*storage|local_storage|localStorage|web\s*storage|storage)\b/ig;
  let match: RegExpExecArray | null;

  while ((match = storagePattern.exec(criterion))) {
    const mention = match[0];
    const comparison = findStorageComparison(criterion, match.index + mention.length);
    if (!comparison) continue;

    const quotedKeys = quotesBetween(quotes, match.index + mention.length, comparison.index);
    const key = quotedKeys[0]?.text
      || unquotedKeyBetween(criterion.slice(match.index + mention.length, comparison.index))
      || keyBeforeStorage(criterion, quotes, match.index, comparison.index);
    const value = quoteAfter(quotes, comparison.end)?.text;
    if (!key || value === undefined) continue;

    const area = storageArea(mention);
    const type = assertionType(area, comparisonKind(comparison.text));
    const assertion: BrowserAssertionSpec = { type, key, value };
    const keyValue = assertionKey(assertion);
    if (seen.has(keyValue)) continue;
    seen.add(keyValue);
    assertions.push(assertion);
  }

  return assertions;
}
