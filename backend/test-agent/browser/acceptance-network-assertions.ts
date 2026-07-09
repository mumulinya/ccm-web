import { BrowserAssertionSpec } from "../types";

export interface AcceptanceNetworkBrowserAssertion {
  assertion: BrowserAssertionSpec;
  urlPath: string;
}

interface PathSpan {
  value: string;
  index: number;
  end: number;
}

function clean(value: string) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function explicitUrlPathSpans(criterion: string) {
  const out: PathSpan[] = [];
  const pattern = /(^|[\s(["'`])((?:\/(?!\/)[a-zA-Z0-9._~!$&'()*+,;=:@%-]+)+(?:\?[a-zA-Z0-9._~!$&'()*+,;=:@/?%-]+)?)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(criterion))) {
    const value = clean(match[2]).replace(/[),.;:!?，。；：！？]+$/g, "");
    if (value.length >= 2) out.push({ value, index: match.index + match[1].length, end: match.index + match[0].length });
  }
  return out;
}

function methodNear(text: string) {
  const match = text.match(/\b(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/i);
  return match ? match[1].toUpperCase() : "";
}

function statusNear(text: string) {
  const match = text.match(/\b([1-5]\d\d)\b/);
  const value = match ? Number(match[1]) : NaN;
  return Number.isFinite(value) ? value : undefined;
}

function hasNetworkIntent(text: string) {
  return /\b(?:api|endpoint|request|response|fetch|xhr|call|calls|called|send|sends|sent|receive|receives|received|return|returns|returned|post|get|put|patch|delete)\b/i.test(text);
}

function pathLooksLikeApi(value: string) {
  return /^\/(?:api|graphql|trpc|rpc|rest|v\d+)(?:\/|$|\?)/i.test(value);
}

function hasNetworkIntentForPath(path: PathSpan, before: string, after: string) {
  const context = `${before} ${path.value} ${after}`;
  if (pathLooksLikeApi(path.value) && hasNetworkIntent(context)) return true;
  const immediateBefore = before.slice(-90);
  const immediateAfter = after.slice(0, 60);
  return /\b(?:api|endpoint|request|response|fetch|xhr|call|calls|called|send|sends|sent|receive|receives|received|return|returns|returned|to|from)\s*$/i.test(immediateBefore)
    || /\b(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s*$/i.test(immediateBefore)
    || /^\s*(?:endpoint|api|request|response)\b/i.test(immediateAfter)
    || /^\s*(?:with\s+)?(?:status\s+)?[1-5]\d\d\b/i.test(immediateAfter);
}

function hasRequestIntent(text: string) {
  return /\b(?:request|fetch|xhr|call|calls|called|send|sends|sent|post|get|put|patch|delete)\b/i.test(text);
}

function hasResponseIntent(text: string) {
  return /\b(?:response|responds?|receive|receives|received|return|returns|returned|status)\b/i.test(text);
}

function isNegative(text: string) {
  return /\b(?:does\s+not|do\s+not|must\s+not|should\s+not|never|without|no)\b/i.test(text);
}

function assertionKey(assertion: BrowserAssertionSpec) {
  return [
    assertion.type,
    assertion.method,
    assertion.urlIncludes,
    assertion.url_includes,
    assertion.url,
    Array.isArray(assertion.status) ? assertion.status.join("|") : assertion.status,
    Array.isArray(assertion.statusCode) ? assertion.statusCode.join("|") : assertion.statusCode,
    Array.isArray(assertion.status_code) ? assertion.status_code.join("|") : assertion.status_code,
  ].map(value => String(value || "").toLowerCase()).join(":");
}

export function buildAcceptanceNetworkBrowserAssertions(criterion: string): AcceptanceNetworkBrowserAssertion[] {
  const assertions: AcceptanceNetworkBrowserAssertion[] = [];
  const seen = new Set<string>();
  const paths = explicitUrlPathSpans(criterion);

  for (const path of paths) {
    const before = criterion.slice(Math.max(0, path.index - 120), path.index);
    const after = criterion.slice(path.end, Math.min(criterion.length, path.end + 180));
    const context = `${before} ${path.value} ${after}`;
    if (!hasNetworkIntentForPath(path, before, after)) continue;

    const method = methodNear(context);
    const negative = isNegative(context);
    if (method || hasRequestIntent(context)) {
      const assertion: BrowserAssertionSpec = {
        type: negative ? "networkRequestNot" : "networkRequest",
        urlIncludes: path.value,
        ...(method ? { method } : {}),
        ...(negative ? { settleMs: 500 } : {}),
      };
      const key = assertionKey(assertion);
      if (!seen.has(key)) {
        seen.add(key);
        assertions.push({ assertion, urlPath: path.value });
      }
    }

    const status = statusNear(after) ?? statusNear(before);
    if (status !== undefined && hasResponseIntent(context)) {
      const responseNegative = negative || /\b(?:does\s+not|must\s+not|should\s+not|never|without|no)\b(?=[^.;]{0,80}\b(?:response|status|return|returns|returned)\b)/i.test(context);
      const assertion: BrowserAssertionSpec = {
        type: responseNegative ? "networkResponseNot" : "networkResponse",
        urlIncludes: path.value,
        status,
        ...(responseNegative ? { settleMs: 500 } : {}),
      };
      const key = assertionKey(assertion);
      if (!seen.has(key)) {
        seen.add(key);
        assertions.push({ assertion, urlPath: path.value });
      }
    }
  }

  return assertions;
}
