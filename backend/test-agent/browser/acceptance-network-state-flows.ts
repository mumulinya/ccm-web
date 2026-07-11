import {
  BrowserActionSpec,
  BrowserAssertionSpec,
  BrowserCheckSpec,
  NormalizedTestAgentProjectTarget,
} from "../types";
import { resolveUrl } from "../utils";

export const ACCEPTANCE_NETWORK_STATE_FLOW_PROBE_TYPE = "acceptance_network_state_flow";

export interface AcceptanceNetworkStateFlow {
  criterion: string;
  url: string;
  path: string;
  mode: "offline" | "online_recovery";
  expectedText: string;
}

function clean(value: string) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function quotedText(value: string) {
  const out: string[] = [];
  const patterns = [
    /"([^"\r\n]{2,160})"/g,
    /'([^'\r\n]{2,160})'/g,
    /`([^`\r\n]{2,160})`/g,
    /“([^”\r\n]{2,160})”/g,
    /‘([^’\r\n]{2,160})’/g,
    /「([^」\r\n]{2,160})」/g,
    /『([^』\r\n]{2,160})』/g,
  ];
  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(value))) {
      const text = clean(match[1]);
      if (text) out.push(text);
    }
  }
  return out;
}

function firstQuotedAfter(value: string, pattern: RegExp) {
  const match = pattern.exec(value);
  if (!match) return "";
  return quotedText(value.slice(match.index))[0] || "";
}

function explicitUrlPath(criterion: string) {
  const match = /(^|[\s(["'`])((?:\/(?!\/)[a-zA-Z0-9._~!$&'()*+,;=:@%-]+)+(?:\?[a-zA-Z0-9._~!$&'()*+,;=:@/?%-]+)?)/.exec(criterion);
  return clean(match?.[2] || "").replace(/[),.;:!?，。；：！？]+$/g, "");
}

export function acceptanceNetworkStateIntent(criterion: string) {
  return /\b(?:offline|goes?\s+offline|network\s+(?:down|disconnected)|disconnect(?:ed|ion)?|back\s+online|goes?\s+online|reconnect(?:ed|ion)?|restore(?:d)?\s+(?:the\s+)?connection)\b/i.test(criterion)
    || /(?:离线|断网|无网络|网络断开|恢复在线|重新联网|网络恢复|恢复网络|重新连接)/.test(criterion);
}

function recoveryIntent(criterion: string) {
  return /\b(?:back\s+online|goes?\s+online|reconnect(?:ed|ion)?|restore(?:d)?\s+(?:the\s+)?connection|offline[^.!?;]{0,80}(?:online|reconnect))\b/i.test(criterion)
    || /(?:恢复在线|重新联网|网络恢复|恢复网络|重新连接|断网[^。！？；]{0,40}(?:恢复|联网|在线))/.test(criterion);
}

function expectedTextFromCriterion(criterion: string) {
  const expected = firstQuotedAfter(criterion, /(?:(?:show|shows|display|displays|see|visible|appear|appears|render|renders)w*|显示|出现|看到|可见|渲染)[^"'`“‘「『]{0,80}["'`“‘「『]/i);
  if (expected) return expected;
  const quotes = quotedText(criterion);
  return quotes[quotes.length - 1] || "";
}

function flowName(project: NormalizedTestAgentProjectTarget, flow: AcceptanceNetworkStateFlow) {
  try {
    const parsed = new URL(flow.url);
    return `Acceptance network state flow: ${project.name} ${parsed.pathname || "/"} ${flow.mode}`;
  } catch {
    return `Acceptance network state flow: ${project.name} ${flow.mode}`;
  }
}

function flowActions(flow: AcceptanceNetworkStateFlow): BrowserActionSpec[] {
  return [
    { type: "goto", url: flow.url, waitUntil: "domcontentloaded" },
    { type: "setOffline" },
    { type: "waitForTimeout", value: "250" },
    ...(flow.mode === "online_recovery"
      ? [{ type: "setOnline" } as BrowserActionSpec, { type: "waitForTimeout", value: "250" } as BrowserActionSpec]
      : []),
  ];
}

function flowAssertions(flow: AcceptanceNetworkStateFlow): BrowserAssertionSpec[] {
  return [
    { type: "pageNotBlank" },
    { type: flow.mode === "online_recovery" ? "browserOnline" : "browserOffline" },
    { type: "text", text: flow.expectedText },
    { type: "visible", text: flow.expectedText, exact: true },
    { type: "inViewport", text: flow.expectedText, exact: true },
    { type: "urlIncludes", text: flow.path || "/" },
    { type: "consoleNoErrors" },
  ];
}

export function buildAcceptanceNetworkStateFlows(project: NormalizedTestAgentProjectTarget, acceptanceCriteria: string[] = []): AcceptanceNetworkStateFlow[] {
  if (!project.targetUrl) return [];
  const flows: AcceptanceNetworkStateFlow[] = [];
  const seen = new Set<string>();

  for (const raw of acceptanceCriteria) {
    const criterion = clean(raw);
    if (!criterion || !acceptanceNetworkStateIntent(criterion)) continue;
    const path = explicitUrlPath(criterion);
    const url = path ? resolveUrl(project.targetUrl, path) : project.targetUrl;
    const mode: AcceptanceNetworkStateFlow["mode"] = recoveryIntent(criterion) ? "online_recovery" : "offline";
    const expectedText = expectedTextFromCriterion(criterion);
    if (!url || !expectedText) continue;
    const key = `${url}:${mode}:${expectedText.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    flows.push({
      criterion,
      url,
      path: path || "/",
      mode,
      expectedText,
    });
  }

  return flows;
}

export function buildAcceptanceNetworkStateFlowBrowserChecks(project: NormalizedTestAgentProjectTarget, acceptanceCriteria: string[] = []): BrowserCheckSpec[] {
  return buildAcceptanceNetworkStateFlows(project, acceptanceCriteria).map(flow => ({
    name: flowName(project, flow),
    url: flow.url,
    probeType: ACCEPTANCE_NETWORK_STATE_FLOW_PROBE_TYPE,
    context: {
      source: "acceptance_criteria",
      generatedBy: ACCEPTANCE_NETWORK_STATE_FLOW_PROBE_TYPE,
      acceptanceCriteria: [flow.criterion],
      networkStateMode: flow.mode,
      expectedText: flow.expectedText,
    },
    actions: flowActions(flow),
    assertions: flowAssertions(flow),
    screenshot: true,
  }));
}
