import {
  BrowserActionSpec,
  BrowserAssertionSpec,
  BrowserCheckSpec,
  NormalizedTestAgentProjectTarget,
} from "../types";
import { resolveUrl } from "../utils";

export const ACCEPTANCE_HOVER_FLOW_PROBE_TYPE = "acceptance_hover_flow";

export interface AcceptanceHoverFlow {
  criterion: string;
  url: string;
  path: string;
  targetRole: "button" | "link";
  targetName: string;
  expectedText: string;
}

function clean(value: string) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function quotedText(value: string) {
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

function hoverPattern(flags = "i") {
  return new RegExp(String.raw`(?:\b(?:hover|hovering|mouse\s*over|mouseover|move\s+the\s+mouse\s+over|move\s+mouse\s+over)\b|悬停|鼠标移到|鼠标移动到|鼠标经过|移入)`, flags);
}

function hoverMatch(criterion: string) {
  return hoverPattern("i").exec(criterion);
}

function looksLikeHoverCriterion(criterion: string) {
  if (!hoverMatch(criterion)) return false;
  return /\b(?:then|after(?:wards)?|should|must|will|shows?|displays?|visible|appears?|reveals?)\b/i.test(criterion)
    || /(?:然后|之后|随后|应该|应当|必须|会|显示|出现|可见|展示|露出)/.test(criterion);
}

function targetRoleFromCriterion(criterion: string, hoverIndex: number): AcceptanceHoverFlow["targetRole"] {
  const context = criterion.slice(Math.max(0, hoverIndex - 60), Math.min(criterion.length, hoverIndex + 140));
  return /\b(?:link|nav|navigation|menu item|anchor)\b/i.test(context) || /(?:链接|导航|菜单项)/.test(context) ? "link" : "button";
}

function unquotedTargetNameFromCriterion(criterion: string, match: RegExpExecArray) {
  const tail = criterion.slice(match.index + match[0].length);
  const boundary = /\b(?:then|after(?:wards)?|should|must|will|shows?|displays?|appears?|reveals?)\b|(?:然后|之后|随后|应该|应当|必须|显示|出现|可见|展示|露出)|[,.;，。；]/i.exec(tail);
  const segment = clean(boundary ? tail.slice(0, boundary.index) : tail);
  if (!segment || /["'`“‘「『]/.test(segment)) return "";
  const withoutLeading = segment
    .replace(/^(?:over|on|the|a|an)\s+/i, "")
    .replace(/^(?:button|link|nav(?:igation)? item|menu item)\s+/i, "")
    .replace(/\s+(?:button|link|nav(?:igation)? item|menu item)$/i, "")
    .replace(/^(?:在|到|至|给|为|上方|上面)\s*/i, "")
    .replace(/\s+(?:上方|上面)$/i, "")
    .trim();
  if (!withoutLeading || withoutLeading.length > 80) return "";
  if (/^(?:button|link|page|route|url|path)$/i.test(withoutLeading)) return "";
  if (/^\/[^\s]+/.test(withoutLeading)) return "";
  return withoutLeading;
}

function targetNameFromCriterion(criterion: string, match: RegExpExecArray) {
  return firstQuotedAfter(criterion.slice(match.index), hoverPattern("i"))
    || unquotedTargetNameFromCriterion(criterion, match);
}

function expectedTextFromCriterion(criterion: string, targetName: string) {
  const afterThen = /(?:then|after(?:wards)?|and then|should|must|will)\b|(?:然后|之后|随后|并且|应该|应当|必须|会)/i.exec(criterion);
  const tail = afterThen ? criterion.slice(afterThen.index) : criterion;
  const expected = firstQuotedAfter(tail, /(?:(?:show|shows|display|displays|see|visible|appear|appears|reveal|reveals|contain|contains|include|includes|render|renders)\w*|显示|出现|看到|可见|展示|露出|包含|包括|渲染)[^"'`“‘「『]{0,80}["'`“‘「『]/i);
  if (expected && expected.toLowerCase() !== targetName.toLowerCase()) return expected;
  return quotedText(tail).find(item => item.toLowerCase() !== targetName.toLowerCase()) || "";
}

function flowName(project: NormalizedTestAgentProjectTarget, flow: AcceptanceHoverFlow) {
  try {
    const parsed = new URL(flow.url);
    return `Acceptance hover flow: ${project.name} ${parsed.pathname || "/"}`;
  } catch {
    return `Acceptance hover flow: ${project.name}`;
  }
}

function flowActions(flow: AcceptanceHoverFlow): BrowserActionSpec[] {
  return [
    { type: "goto", url: flow.url, waitUntil: "domcontentloaded" },
    { type: "hover", role: flow.targetRole, name: flow.targetName, exact: true },
    { type: "waitForTimeout", value: "250" },
  ];
}

function flowAssertions(flow: AcceptanceHoverFlow): BrowserAssertionSpec[] {
  return [
    { type: "pageNotBlank" },
    { type: "text", text: flow.expectedText },
    { type: "visible", text: flow.expectedText, exact: true },
    { type: "inViewport", text: flow.expectedText, exact: true },
    { type: "urlIncludes", text: flow.path || "/" },
    { type: "consoleNoErrors" },
    { type: "networkNoErrors" },
  ];
}

export function buildAcceptanceHoverFlows(project: NormalizedTestAgentProjectTarget, acceptanceCriteria: string[] = []): AcceptanceHoverFlow[] {
  if (!project.targetUrl) return [];
  const flows: AcceptanceHoverFlow[] = [];
  const seen = new Set<string>();

  for (const raw of acceptanceCriteria) {
    const criterion = clean(raw);
    if (!criterion || !looksLikeHoverCriterion(criterion)) continue;
    const hover = hoverMatch(criterion);
    if (!hover) continue;
    const path = explicitUrlPath(criterion);
    const url = path ? resolveUrl(project.targetUrl, path) : project.targetUrl;
    const targetName = targetNameFromCriterion(criterion, hover);
    const targetRole = targetRoleFromCriterion(criterion, hover.index);
    const expectedText = expectedTextFromCriterion(criterion, targetName);
    if (!url || !targetName || !expectedText) continue;
    const key = `${url}:${targetRole}:${targetName.toLowerCase()}:${expectedText.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    flows.push({
      criterion,
      url,
      path: path || "/",
      targetRole,
      targetName,
      expectedText,
    });
  }

  return flows;
}

export function buildAcceptanceHoverFlowBrowserChecks(project: NormalizedTestAgentProjectTarget, acceptanceCriteria: string[] = []): BrowserCheckSpec[] {
  return buildAcceptanceHoverFlows(project, acceptanceCriteria).map(flow => ({
    name: flowName(project, flow),
    url: flow.url,
    probeType: ACCEPTANCE_HOVER_FLOW_PROBE_TYPE,
    context: {
      source: "acceptance_criteria",
      generatedBy: ACCEPTANCE_HOVER_FLOW_PROBE_TYPE,
      acceptanceCriteria: [flow.criterion],
      hoverTarget: {
        role: flow.targetRole,
        name: flow.targetName,
      },
      expectedText: flow.expectedText,
    },
    actions: flowActions(flow),
    assertions: flowAssertions(flow),
    screenshot: true,
  }));
}
