import {
  BrowserActionSpec,
  BrowserAssertionSpec,
  BrowserCheckSpec,
  NormalizedTestAgentProjectTarget,
} from "../types";
import { resolveUrl } from "../utils";

export const ACCEPTANCE_DIALOG_FLOW_PROBE_TYPE = "acceptance_dialog_flow";

export interface AcceptanceDialogFlow {
  criterion: string;
  url: string;
  path: string;
  targetRole: "button" | "link";
  targetName: string;
  dialogType: "alert" | "confirm" | "prompt" | "";
  messageIncludes: string;
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

function clickPattern(flags = "i") {
  return new RegExp(String.raw`(?:\b(?:click|clicking|press|tap|open)\b|点击|点按|轻触|打开|按下)`, flags);
}

export function acceptanceDialogIntent(criterion: string) {
  return /\b(?:native\s+dialog|browser\s+dialog|dialog|alert|confirm|prompt)\b/i.test(criterion)
    || /(?:浏览器对话框|原生对话框|对话框|提示框|确认框|输入框)/.test(criterion);
}

function looksLikeDialogCriterion(criterion: string) {
  return acceptanceDialogIntent(criterion) && clickPattern("i").test(criterion);
}

function targetRoleFromCriterion(criterion: string, clickIndex: number): AcceptanceDialogFlow["targetRole"] {
  const context = criterion.slice(Math.max(0, clickIndex - 60), Math.min(criterion.length, clickIndex + 140));
  return /\b(?:link|nav|navigation|menu item|anchor)\b/i.test(context) || /(?:链接|导航|菜单项)/.test(context) ? "link" : "button";
}

function unquotedTargetNameFromCriterion(criterion: string, click: RegExpExecArray) {
  const tail = criterion.slice(click.index + click[0].length);
  const boundary = /\b(?:then|after(?:wards)?|should|must|will|shows?|displays?|appears?|opens?|dialog|alert|confirm|prompt)\b|(?:然后|之后|随后|应该|应当|必须|显示|出现|打开|对话框|提示框|确认框|输入框)|[,.;，。；]/i.exec(tail);
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

function dialogTypeFromCriterion(criterion: string): AcceptanceDialogFlow["dialogType"] {
  if (/\bprompt\b/i.test(criterion) || /(?:输入框|输入对话框|提示输入)/.test(criterion)) return "prompt";
  if (/\bconfirm\b/i.test(criterion) || /(?:确认框|确认对话框)/.test(criterion)) return "confirm";
  if (/\balert\b/i.test(criterion) || /(?:提示框|警告框|alert)/i.test(criterion)) return "alert";
  return "";
}

function messageIncludesFromCriterion(criterion: string, targetName: string) {
  const afterThen = /(?:then|after(?:wards)?|and then|should|must|will)\b|(?:然后|之后|随后|并且|应该|应当|必须|会)/i.exec(criterion);
  const tail = afterThen ? criterion.slice(afterThen.index) : criterion;
  const expected = firstQuotedAfter(tail, /(?:(?:message\s+)?(?:include|includes|contain|contains|show|shows|display|displays|say|says)\w*|消息包含|内容包含|包含|包括|显示|出现|提示)[^"'`“‘「『]{0,80}["'`“‘「『]/i);
  if (expected && expected.toLowerCase() !== targetName.toLowerCase()) return expected;
  return quotedText(tail).find(item => item.toLowerCase() !== targetName.toLowerCase()) || "";
}

function flowName(project: NormalizedTestAgentProjectTarget, flow: AcceptanceDialogFlow) {
  try {
    const parsed = new URL(flow.url);
    return `Acceptance dialog flow: ${project.name} ${parsed.pathname || "/"}`;
  } catch {
    return `Acceptance dialog flow: ${project.name}`;
  }
}

function flowActions(flow: AcceptanceDialogFlow): BrowserActionSpec[] {
  return [
    { type: "goto", url: flow.url, waitUntil: "domcontentloaded" },
    { type: "click", role: flow.targetRole, name: flow.targetName, exact: true },
    { type: "waitForTimeout", value: "250" },
  ];
}

function flowAssertions(flow: AcceptanceDialogFlow): BrowserAssertionSpec[] {
  return [
    { type: "pageNotBlank" },
    { type: "dialogAppeared", dialogType: flow.dialogType || undefined },
    {
      type: "dialogMessageIncludes",
      text: flow.messageIncludes,
      dialogType: flow.dialogType || undefined,
    },
    ...(flow.dialogType ? [{ type: "dialogTypeEquals", value: flow.dialogType } as BrowserAssertionSpec] : []),
    { type: "urlIncludes", text: flow.path || "/" },
    { type: "consoleNoErrors" },
    { type: "networkNoErrors" },
  ];
}

export function buildAcceptanceDialogFlows(project: NormalizedTestAgentProjectTarget, acceptanceCriteria: string[] = []): AcceptanceDialogFlow[] {
  if (!project.targetUrl) return [];
  const flows: AcceptanceDialogFlow[] = [];
  const seen = new Set<string>();

  for (const raw of acceptanceCriteria) {
    const criterion = clean(raw);
    if (!criterion || !looksLikeDialogCriterion(criterion)) continue;
    const click = clickPattern("i").exec(criterion);
    if (!click) continue;
    const path = explicitUrlPath(criterion);
    const url = path ? resolveUrl(project.targetUrl, path) : project.targetUrl;
    const targetName = targetNameFromCriterion(criterion, click);
    const targetRole = targetRoleFromCriterion(criterion, click.index);
    const dialogType = dialogTypeFromCriterion(criterion);
    const messageIncludes = messageIncludesFromCriterion(criterion, targetName);
    if (!url || !targetName || !messageIncludes) continue;
    const key = `${url}:${targetRole}:${targetName.toLowerCase()}:${dialogType}:${messageIncludes.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    flows.push({
      criterion,
      url,
      path: path || "/",
      targetRole,
      targetName,
      dialogType,
      messageIncludes,
    });
  }

  return flows;
}

export function buildAcceptanceDialogFlowBrowserChecks(project: NormalizedTestAgentProjectTarget, acceptanceCriteria: string[] = []): BrowserCheckSpec[] {
  return buildAcceptanceDialogFlows(project, acceptanceCriteria).map(flow => ({
    name: flowName(project, flow),
    url: flow.url,
    probeType: ACCEPTANCE_DIALOG_FLOW_PROBE_TYPE,
    context: {
      source: "acceptance_criteria",
      generatedBy: ACCEPTANCE_DIALOG_FLOW_PROBE_TYPE,
      acceptanceCriteria: [flow.criterion],
      clickTarget: {
        role: flow.targetRole,
        name: flow.targetName,
      },
      dialogType: flow.dialogType,
      messageIncludes: flow.messageIncludes,
    },
    actions: flowActions(flow),
    assertions: flowAssertions(flow),
    screenshot: true,
  }));
}
