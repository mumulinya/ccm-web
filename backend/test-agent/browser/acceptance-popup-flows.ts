import {
  BrowserActionSpec,
  BrowserAssertionSpec,
  BrowserCheckSpec,
  NormalizedTestAgentProjectTarget,
} from "../types";
import { resolveUrl } from "../utils";

export const ACCEPTANCE_POPUP_FLOW_PROBE_TYPE = "acceptance_popup_flow";

export interface AcceptancePopupFlow {
  criterion: string;
  url: string;
  path: string;
  targetRole: "button" | "link";
  targetName: string;
  popupUrlPath: string;
  popupTextIncludes: string;
  popupTitleIncludes: string;
}

interface UrlPathSpan {
  value: string;
  index: number;
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

function explicitUrlPathSpans(criterion: string) {
  const out: UrlPathSpan[] = [];
  const pattern = /(^|[\s(["'`])((?:\/(?!\/)[a-zA-Z0-9._~!$&'()*+,;=:@%-]+)+(?:\?[a-zA-Z0-9._~!$&'()*+,;=:@/?%-]+)?)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(criterion))) {
    const value = clean(match[2]).replace(/[),.;:!?，。；：！？]+$/g, "");
    if (value.length >= 2) out.push({ value, index: match.index + match[1].length });
  }
  return out;
}

function clickPattern(flags = "i") {
  return new RegExp(String.raw`(?:\b(?:click|clicking|press|tap|open|follow)\b|点击|点按|轻触|打开|按下)`, flags);
}

function popupPattern(flags = "i") {
  return new RegExp(String.raw`(?:\b(?:popup(?:\s+(?:page|window))?|new\s+tab|new\s+window|separate\s+tab|separate\s+window)\b|新标签页|新窗口|弹出窗口|弹出页面)`, flags);
}

export function acceptancePopupIntent(criterion: string) {
  return popupPattern("i").test(criterion);
}

function looksLikePopupCriterion(criterion: string) {
  return acceptancePopupIntent(criterion) && clickPattern("i").test(criterion);
}

function targetRoleFromCriterion(criterion: string, clickIndex: number): AcceptancePopupFlow["targetRole"] {
  const context = criterion.slice(Math.max(0, clickIndex - 60), Math.min(criterion.length, clickIndex + 140));
  return /\b(?:link|nav|navigation|menu item|anchor)\b/i.test(context) || /(?:链接|导航|菜单项)/.test(context) ? "link" : "button";
}

function unquotedTargetNameFromCriterion(criterion: string, click: RegExpExecArray) {
  const tail = criterion.slice(click.index + click[0].length);
  const boundary = /\b(?:then|after(?:wards)?|should|must|will|opens?|shows?|displays?|popup|new\s+tab|new\s+window)\b|(?:然后|之后|随后|应该|应当|必须|打开|显示|出现|新标签页|新窗口|弹出窗口|弹出页面)|[,.;，。；]/i.exec(tail);
  const segment = clean(boundary ? tail.slice(0, boundary.index) : tail);
  if (!segment || /["'`“‘「『]/.test(segment)) return "";
  const withoutLeading = segment
    .replace(/^(?:the|a|an)\s+/i, "")
    .replace(/^(?:button|link|nav(?:igation)? item|menu item)\s+/i, "")
    .replace(/\s+(?:button|link|nav(?:igation)? item|menu item)$/i, "")
    .replace(/\s+(?:and|to|for)$/i, "")
    .trim();
  if (!withoutLeading || withoutLeading.length > 80) return "";
  if (/^(?:button|link|page|route|url|path)$/i.test(withoutLeading)) return "";
  if (/^\/[^\s]+/.test(withoutLeading)) return "";
  return withoutLeading;
}

function targetNameFromCriterion(criterion: string, click: RegExpExecArray) {
  return firstQuotedAfter(criterion.slice(click.index), clickPattern("i"))
    || unquotedTargetNameFromCriterion(criterion, click);
}

function popupTitleFromCriterion(criterion: string, targetName: string) {
  const title = firstQuotedAfter(criterion, /(?:\b(?:popup\s+)?title\s+(?:include|includes|contain|contains|is|equals?)\b|标题包含|标题为|标题是)[^"'`“‘「『]{0,80}["'`“‘「『]/i);
  return title && title.toLowerCase() !== targetName.toLowerCase() ? title : "";
}

function popupTextFromCriterion(criterion: string, targetName: string, title: string) {
  const popup = popupPattern("i").exec(criterion);
  const tail = popup ? criterion.slice(popup.index) : criterion;
  const expected = firstQuotedAfter(tail, /(?:(?:text\s+)?(?:include|includes|contain|contains|show|shows|display|displays|render|renders)\w*|文本包含|内容包含|包含|包括|显示|出现|渲染)[^"'`“‘「『]{0,80}["'`“‘「『]/i);
  const ignored = new Set([targetName, title].map(item => item.toLowerCase()).filter(Boolean));
  if (expected && !ignored.has(expected.toLowerCase())) return expected;
  return quotedText(tail).find(item => !ignored.has(item.toLowerCase())) || "";
}

function flowName(project: NormalizedTestAgentProjectTarget, flow: AcceptancePopupFlow) {
  try {
    const parsed = new URL(flow.url);
    return `Acceptance popup flow: ${project.name} ${parsed.pathname || "/"}`;
  } catch {
    return `Acceptance popup flow: ${project.name}`;
  }
}

function flowActions(flow: AcceptancePopupFlow): BrowserActionSpec[] {
  return [
    { type: "goto", url: flow.url, waitUntil: "domcontentloaded" },
    { type: "click", role: flow.targetRole, name: flow.targetName, exact: true },
    { type: "waitForTimeout", value: "350" },
  ];
}

function flowAssertions(flow: AcceptancePopupFlow): BrowserAssertionSpec[] {
  return [
    { type: "pageNotBlank" },
    { type: "popupOpened" },
    ...(flow.popupUrlPath ? [{ type: "popupUrlIncludes", url: flow.popupUrlPath } as BrowserAssertionSpec] : []),
    ...(flow.popupTextIncludes ? [{ type: "popupTextIncludes", text: flow.popupTextIncludes } as BrowserAssertionSpec] : []),
    ...(flow.popupTitleIncludes ? [{ type: "popupTitleIncludes", title: flow.popupTitleIncludes } as BrowserAssertionSpec] : []),
    { type: "urlIncludes", text: flow.path || "/" },
    { type: "consoleNoErrors" },
    { type: "networkNoErrors" },
  ];
}

export function buildAcceptancePopupFlows(project: NormalizedTestAgentProjectTarget, acceptanceCriteria: string[] = []): AcceptancePopupFlow[] {
  if (!project.targetUrl) return [];
  const flows: AcceptancePopupFlow[] = [];
  const seen = new Set<string>();

  for (const raw of acceptanceCriteria) {
    const criterion = clean(raw);
    if (!criterion || !looksLikePopupCriterion(criterion)) continue;
    const click = clickPattern("i").exec(criterion);
    const popup = popupPattern("i").exec(criterion);
    if (!click || !popup) continue;
    const paths = explicitUrlPathSpans(criterion);
    const sourcePath = paths.find(item => item.index < click.index)?.value || "";
    const popupUrlPath = paths.find(item => item.index > popup.index)?.value
      || paths.find(item => item.index > click.index && item.value !== sourcePath)?.value
      || "";
    const url = sourcePath ? resolveUrl(project.targetUrl, sourcePath) : project.targetUrl;
    const targetName = targetNameFromCriterion(criterion, click);
    const targetRole = targetRoleFromCriterion(criterion, click.index);
    const popupTitleIncludes = popupTitleFromCriterion(criterion, targetName);
    const popupTextIncludes = popupTextFromCriterion(criterion, targetName, popupTitleIncludes);
    if (!url || !targetName || (!popupUrlPath && !popupTextIncludes && !popupTitleIncludes)) continue;
    const key = `${url}:${targetRole}:${targetName.toLowerCase()}:${popupUrlPath.toLowerCase()}:${popupTextIncludes.toLowerCase()}:${popupTitleIncludes.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    flows.push({
      criterion,
      url,
      path: sourcePath || "/",
      targetRole,
      targetName,
      popupUrlPath,
      popupTextIncludes,
      popupTitleIncludes,
    });
  }

  return flows;
}

export function buildAcceptancePopupFlowBrowserChecks(project: NormalizedTestAgentProjectTarget, acceptanceCriteria: string[] = []): BrowserCheckSpec[] {
  return buildAcceptancePopupFlows(project, acceptanceCriteria).map(flow => ({
    name: flowName(project, flow),
    url: flow.url,
    probeType: ACCEPTANCE_POPUP_FLOW_PROBE_TYPE,
    context: {
      source: "acceptance_criteria",
      generatedBy: ACCEPTANCE_POPUP_FLOW_PROBE_TYPE,
      acceptanceCriteria: [flow.criterion],
      clickTarget: {
        role: flow.targetRole,
        name: flow.targetName,
      },
      popupUrlPath: flow.popupUrlPath,
      popupTextIncludes: flow.popupTextIncludes,
      popupTitleIncludes: flow.popupTitleIncludes,
    },
    actions: flowActions(flow),
    assertions: flowAssertions(flow),
    screenshot: true,
  }));
}
