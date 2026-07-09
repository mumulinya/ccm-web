import { BrowserAssertionSpec } from "../types";

export interface AcceptanceDerivedBrowserAssertion {
  criterion: string;
  assertion: BrowserAssertionSpec;
  reason: "quoted_text" | "explicit_url_path";
}

export interface AcceptanceDerivedBrowserCriterionAssertions {
  criterion: string;
  assertions: AcceptanceDerivedBrowserAssertion[];
}

function clean(value: string) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function addUnique<T>(items: T[], seen: Set<string>, key: string, item: T) {
  if (seen.has(key)) return;
  seen.add(key);
  items.push(item);
}

function quotedText(criterion: string) {
  const out: string[] = [];
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
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(criterion))) {
      const value = clean(match[1]);
      if (value) out.push(value);
    }
  }
  return out;
}

function explicitUrlPaths(criterion: string) {
  const out: string[] = [];
  const pattern = /(^|[\s(["'`])((?:\/(?!\/)[a-zA-Z0-9._~!$&'()*+,;=:@%-]+)+(?:\?[a-zA-Z0-9._~!$&'()*+,;=:@/?%-]+)?)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(criterion))) {
    const value = clean(match[2]).replace(/[),.;:!?，。；：！？]+$/g, "");
    if (value.length >= 2) out.push(value);
  }
  return out;
}

function looksLikePathOrUrl(value: string) {
  return /^https?:\/\//i.test(value) || /^\/[^\s]+/.test(value);
}

function usefulVisibleText(value: string) {
  if (!value || looksLikePathOrUrl(value)) return "";
  if (/^[\d\s.,:;!?/_-]+$/.test(value)) return "";
  return value;
}

function assertionKey(item: AcceptanceDerivedBrowserAssertion) {
  const value = String(item.assertion.text || item.assertion.value || "").toLowerCase();
  return `${item.reason}:${value}`;
}

function buildAcceptanceDerivedBrowserAssertionsForCriterion(criterion: string): AcceptanceDerivedBrowserAssertion[] {
  const assertions: AcceptanceDerivedBrowserAssertion[] = [];
  const seen = new Set<string>();

  for (const text of quotedText(criterion)) {
    const visible = usefulVisibleText(text);
    if (!visible) continue;
    addUnique(assertions, seen, `text:${visible.toLowerCase()}`, {
      criterion,
      reason: "quoted_text",
      assertion: { type: "text", text: visible },
    });
  }

  for (const path of explicitUrlPaths(criterion)) {
    addUnique(assertions, seen, `url:${path.toLowerCase()}`, {
      criterion,
      reason: "explicit_url_path",
      assertion: { type: "urlIncludes", text: path },
    });
  }

  return assertions;
}

export function buildAcceptanceDerivedBrowserAssertionsByCriterion(criteria: string[]): AcceptanceDerivedBrowserCriterionAssertions[] {
  return criteria
    .map(clean)
    .filter(Boolean)
    .map(criterion => ({
      criterion,
      assertions: buildAcceptanceDerivedBrowserAssertionsForCriterion(criterion),
    }))
    .filter(item => item.assertions.length > 0);
}

export function buildAcceptanceDerivedBrowserAssertions(criteria: string[]): AcceptanceDerivedBrowserAssertion[] {
  const derived: AcceptanceDerivedBrowserAssertion[] = [];
  const seen = new Set<string>();

  for (const group of buildAcceptanceDerivedBrowserAssertionsByCriterion(criteria)) {
    for (const item of group.assertions) {
      addUnique(derived, seen, assertionKey(item), item);
    }
  }

  return derived;
}
