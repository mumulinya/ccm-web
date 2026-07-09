import { BrowserAssertionSpec } from "../types";
import { buildAcceptanceCookieBrowserAssertions } from "./acceptance-cookie-assertions";
import { buildAcceptanceNetworkBrowserAssertions } from "./acceptance-network-assertions";
import { buildAcceptanceNegativeUiBrowserAssertions } from "./acceptance-negative-ui-assertions";
import { buildAcceptanceStorageBrowserAssertions } from "./acceptance-storage-assertions";

export interface AcceptanceDerivedBrowserAssertion {
  criterion: string;
  assertion: BrowserAssertionSpec;
  reason: "quoted_text" | "explicit_url_path" | "accessible_name" | "accessible_description" | "aria_state" | "web_storage" | "browser_cookie" | "browser_network" | "negative_ui";
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

interface QuotedTextSpan {
  text: string;
  index: number;
  end: number;
}

function quotedTextSpans(criterion: string) {
  const spans: QuotedTextSpan[] = [];
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
      if (value) spans.push({ text: value, index: match.index, end: match.index + match[0].length });
    }
  }
  return spans.sort((a, b) => a.index - b.index);
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

function quoteBefore(quotes: QuotedTextSpan[], index: number) {
  return [...quotes].reverse().find(item => item.end <= index);
}

function quoteAfter(quotes: QuotedTextSpan[], index: number) {
  return quotes.find(item => item.index >= index);
}

function targetForQuotedText(criterion: string, quote: QuotedTextSpan, exact = true): Partial<BrowserAssertionSpec> {
  const context = criterion.slice(Math.max(0, quote.index - 80), Math.min(criterion.length, quote.end + 80));
  if (/\b(?:field|input|textbox|textarea|select|checkbox|radio)\b/i.test(context)) return { label: quote.text, exact };
  if (/\btab\b/i.test(context)) return { role: "tab", name: quote.text, exact };
  if (/\boption\b/i.test(context)) return { role: "option", name: quote.text, exact };
  if (/\blink\b/i.test(context)) return { role: "link", name: quote.text, exact };
  if (/\b(?:button|toggle|menu|accordion|disclosure)\b/i.test(context)) return { role: "button", name: quote.text, exact };
  return { text: quote.text, exact };
}

function semanticComparisonType(criterion: string, start: number, end: number, equalsType: BrowserAssertionSpec["type"], includesType: BrowserAssertionSpec["type"]) {
  const segment = criterion.slice(start, end);
  return /\b(?:include|includes|included|contain|contains|contained)\b/i.test(segment) ? includesType : equalsType;
}

function buildAccessibleAssertionsForCriterion(criterion: string, quotes: QuotedTextSpan[]): AcceptanceDerivedBrowserAssertion[] {
  const assertions: AcceptanceDerivedBrowserAssertion[] = [];
  const seen = new Set<string>();
  const specs: Array<{
    reason: "accessible_name" | "accessible_description";
    pattern: RegExp;
    equalsType: BrowserAssertionSpec["type"];
    includesType: BrowserAssertionSpec["type"];
  }> = [
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
    let match: RegExpExecArray | null;
    while ((match = spec.pattern.exec(criterion))) {
      const expected = quoteAfter(quotes, match.index + match[0].length);
      const target = quoteBefore(quotes, match.index);
      if (!target || !expected || target.index === expected.index) continue;
      const type = semanticComparisonType(criterion, match.index, expected.index, spec.equalsType, spec.includesType);
      const assertion: BrowserAssertionSpec = {
        type,
        ...targetForQuotedText(criterion, target, false),
        value: expected.text,
      } as BrowserAssertionSpec;
      addUnique(assertions, seen, assertionKey({ criterion, reason: spec.reason, assertion }), {
        criterion,
        reason: spec.reason,
        assertion,
      });
    }
  }

  return assertions;
}

interface AriaStateSpec {
  pattern: RegExp;
  trueType: BrowserAssertionSpec["type"];
  falseType: BrowserAssertionSpec["type"];
}

const ARIA_STATE_SPECS: AriaStateSpec[] = [
  { pattern: /\baria[-\s]?expanded\b/ig, trueType: "ariaExpanded", falseType: "ariaCollapsed" },
  { pattern: /\baria[-\s]?pressed\b/ig, trueType: "ariaPressed", falseType: "ariaNotPressed" },
  { pattern: /\baria[-\s]?selected\b/ig, trueType: "ariaSelected", falseType: "ariaNotSelected" },
  { pattern: /\baria[-\s]?invalid\b/ig, trueType: "ariaInvalid", falseType: "ariaValid" },
  { pattern: /\baria[-\s]?required\b/ig, trueType: "ariaRequired", falseType: "ariaNotRequired" },
];

function ariaStateIsFalse(criterion: string, start: number) {
  const segment = criterion.slice(start, Math.min(criterion.length, start + 100));
  return /\b(?:false|no|not|off|closed|collapsed|valid|optional)\b/i.test(segment)
    || /["'`“‘「『]\s*(?:false|no|off)\s*["'`”’」』]/i.test(segment);
}

function targetForAriaState(criterion: string, quotes: QuotedTextSpan[], index: number) {
  const before = quoteBefore(quotes, index);
  const after = quoteAfter(quotes, index);
  if (before && index - before.end <= 140) return before;
  if (after && after.index - index <= 140 && !/^(?:true|false|yes|no|on|off)$/i.test(after.text)) return after;
  return before || after;
}

function buildAriaStateAssertionsForCriterion(criterion: string, quotes: QuotedTextSpan[]): AcceptanceDerivedBrowserAssertion[] {
  const assertions: AcceptanceDerivedBrowserAssertion[] = [];
  const seen = new Set<string>();

  for (const spec of ARIA_STATE_SPECS) {
    let match: RegExpExecArray | null;
    while ((match = spec.pattern.exec(criterion))) {
      const target = targetForAriaState(criterion, quotes, match.index);
      if (!target) continue;
      const type = ariaStateIsFalse(criterion, match.index + match[0].length) ? spec.falseType : spec.trueType;
      const assertion: BrowserAssertionSpec = {
        type,
        ...targetForQuotedText(criterion, target),
      } as BrowserAssertionSpec;
      addUnique(assertions, seen, assertionKey({ criterion, reason: "aria_state", assertion }), {
        criterion,
        reason: "aria_state",
        assertion,
      });
    }
  }

  return assertions;
}

function buildAcceptanceDerivedBrowserAssertionsForCriterion(criterion: string): AcceptanceDerivedBrowserAssertion[] {
  const assertions: AcceptanceDerivedBrowserAssertion[] = [];
  const seen = new Set<string>();
  const quotes = quotedTextSpans(criterion);
  const networkAssertions = buildAcceptanceNetworkBrowserAssertions(criterion);
  const networkPaths = new Set(networkAssertions.map(item => item.urlPath.toLowerCase()));
  const semanticAssertions = [
    ...buildAccessibleAssertionsForCriterion(criterion, quotes),
    ...buildAriaStateAssertionsForCriterion(criterion, quotes),
    ...buildAcceptanceStorageBrowserAssertions(criterion).map(assertion => ({
      criterion,
      reason: "web_storage" as const,
      assertion,
    })),
    ...buildAcceptanceCookieBrowserAssertions(criterion).map(assertion => ({
      criterion,
      reason: "browser_cookie" as const,
      assertion,
    })),
    ...networkAssertions.map(item => ({
      criterion,
      reason: "browser_network" as const,
      assertion: item.assertion,
    })),
    ...buildAcceptanceNegativeUiBrowserAssertions(criterion).map(assertion => ({
      criterion,
      reason: "negative_ui" as const,
      assertion,
    })),
  ];

  if (!semanticAssertions.length) {
    for (const quote of quotes) {
      const visible = usefulVisibleText(quote.text);
      if (!visible) continue;
      addUnique(assertions, seen, `text:${visible.toLowerCase()}`, {
        criterion,
        reason: "quoted_text",
        assertion: { type: "text", text: visible },
      });
    }
  } else {
    for (const item of semanticAssertions) {
      addUnique(assertions, seen, assertionKey(item), item);
    }
  }

  for (const path of explicitUrlPaths(criterion)) {
    if (networkPaths.has(path.toLowerCase())) continue;
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
