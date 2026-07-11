import {
  BrowserActionSpec,
  BrowserAssertionSpec,
  BrowserCheckSpec,
  NormalizedTestAgentProjectTarget,
} from "../types";
import { resolveUrl } from "../utils";

export const ACCEPTANCE_CLIPBOARD_FLOW_PROBE_TYPE = "acceptance_clipboard_flow";

export interface AcceptanceClipboardFlow {
  criterion: string;
  url: string;
  path: string;
  targetRole: "button" | "link";
  targetName: string;
  expectation: "equals" | "includes";
  expectedClipboardText: string;
}

function clean(value: string) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function quotedText(value: string) {
  const out: string[] = [];
  const patterns = [
    /"([^"\r\n]{1,200})"/g,
    /'([^'\r\n]{1,200})'/g,
    /`([^`\r\n]{1,200})`/g,
    /“([^”\r\n]{1,200})”/g,
    /‘([^’\r\n]{1,200})’/g,
    /「([^」\r\n]{1,200})」/g,
    /『([^』\r\n]{1,200})』/g,
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

function clickPattern(flags = "i") {
  return new RegExp(String.raw`(?:\b(?:click|clicking|press|tap)\b|点击|点按|轻触|按下)`, flags);
}

export function acceptanceClipboardIntent(criterion: string) {
  return /\bclipboard\b/i.test(criterion)
    || /\bcopy\b[^.!?;。！？；\r\n]{0,80}\bclipboard\b/i.test(criterion)
    || /(?:剪贴板|复制到剪贴板|拷贝到剪贴板)/.test(criterion);
}

function looksLikeClipboardCriterion(criterion: string) {
  return acceptanceClipboardIntent(criterion) && clickPattern("i").test(criterion);
}

function targetRoleFromCriterion(criterion: string, clickIndex: number): AcceptanceClipboardFlow["targetRole"] {
  const context = criterion.slice(Math.max(0, clickIndex - 60), Math.min(criterion.length, clickIndex + 140));
  return /\b(?:link|nav|navigation|menu item|anchor)\b/i.test(context) || /(?:链接|导航|菜单项)/.test(context) ? "link" : "button";
}

function unquotedTargetNameFromCriterion(criterion: string, click: RegExpExecArray) {
  const tail = criterion.slice(click.index + click[0].length);
  const boundary = /\b(?:then|after(?:wards)?|should|must|will|clipboard|copies?|copied)\b|(?:然后|之后|随后|应该|应当|必须|剪贴板|复制到|拷贝到)|[,.;，。；]/i.exec(tail);
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

function clipboardExpectation(criterion: string): AcceptanceClipboardFlow["expectation"] {
  return /\b(?:include|includes|included|contain|contains|contained)\b/i.test(criterion)
    || /(?:包含|包括|含有)/.test(criterion)
    ? "includes"
    : "equals";
}

function expectedClipboardTextFromCriterion(criterion: string, targetName: string) {
  const clipboard = /(?:\bclipboard\b|剪贴板|复制到剪贴板|拷贝到剪贴板)/i.exec(criterion);
  const tail = clipboard ? criterion.slice(clipboard.index) : criterion;
  const expected = firstQuotedAfter(tail, /(?:(?:text\s+)?(?:equal|equals|is|include|includes|contain|contains|hold|holds)\w*|内容为|内容是|等于|包含|包括|含有|写入|保存)[^"'`“‘「『]{0,80}["'`“‘「『]/i);
  if (expected && expected.toLowerCase() !== targetName.toLowerCase()) return expected;
  return quotedText(tail).find(item => item.toLowerCase() !== targetName.toLowerCase()) || "";
}

function flowName(project: NormalizedTestAgentProjectTarget, flow: AcceptanceClipboardFlow) {
  try {
    const parsed = new URL(flow.url);
    return `Acceptance clipboard flow: ${project.name} ${parsed.pathname || "/"}`;
  } catch {
    return `Acceptance clipboard flow: ${project.name}`;
  }
}

function flowActions(flow: AcceptanceClipboardFlow): BrowserActionSpec[] {
  return [
    { type: "goto", url: flow.url, waitUntil: "domcontentloaded" },
    { type: "click", role: flow.targetRole, name: flow.targetName, exact: true },
    { type: "waitForTimeout", value: "250" },
  ];
}

function flowAssertions(flow: AcceptanceClipboardFlow): BrowserAssertionSpec[] {
  return [
    { type: "pageNotBlank" },
    flow.expectation === "includes"
      ? { type: "clipboardTextIncludes", value: flow.expectedClipboardText }
      : { type: "clipboardTextEquals", value: flow.expectedClipboardText },
    { type: "urlIncludes", text: flow.path || "/" },
    { type: "consoleNoErrors" },
    { type: "networkNoErrors" },
  ];
}

export function buildAcceptanceClipboardFlows(project: NormalizedTestAgentProjectTarget, acceptanceCriteria: string[] = []): AcceptanceClipboardFlow[] {
  if (!project.targetUrl) return [];
  const flows: AcceptanceClipboardFlow[] = [];
  const seen = new Set<string>();

  for (const raw of acceptanceCriteria) {
    const criterion = clean(raw);
    if (!criterion || !looksLikeClipboardCriterion(criterion)) continue;
    const click = clickPattern("i").exec(criterion);
    if (!click) continue;
    const path = explicitUrlPath(criterion);
    const url = path ? resolveUrl(project.targetUrl, path) : project.targetUrl;
    const targetName = targetNameFromCriterion(criterion, click);
    const targetRole = targetRoleFromCriterion(criterion, click.index);
    const expectation = clipboardExpectation(criterion);
    const expectedClipboardText = expectedClipboardTextFromCriterion(criterion, targetName);
    if (!url || !targetName || !expectedClipboardText) continue;
    const key = `${url}:${targetRole}:${targetName.toLowerCase()}:${expectation}:${expectedClipboardText.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    flows.push({
      criterion,
      url,
      path: path || "/",
      targetRole,
      targetName,
      expectation,
      expectedClipboardText,
    });
  }

  return flows;
}

export function buildAcceptanceClipboardFlowBrowserChecks(project: NormalizedTestAgentProjectTarget, acceptanceCriteria: string[] = []): BrowserCheckSpec[] {
  return buildAcceptanceClipboardFlows(project, acceptanceCriteria).map(flow => ({
    name: flowName(project, flow),
    url: flow.url,
    probeType: ACCEPTANCE_CLIPBOARD_FLOW_PROBE_TYPE,
    context: {
      source: "acceptance_criteria",
      generatedBy: ACCEPTANCE_CLIPBOARD_FLOW_PROBE_TYPE,
      acceptanceCriteria: [flow.criterion],
      clickTarget: {
        role: flow.targetRole,
        name: flow.targetName,
      },
      expectation: flow.expectation,
      expectedClipboardText: flow.expectedClipboardText,
    },
    actions: flowActions(flow),
    assertions: flowAssertions(flow),
    screenshot: true,
  }));
}
