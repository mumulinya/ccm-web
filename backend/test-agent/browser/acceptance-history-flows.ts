import {
  BrowserActionSpec,
  BrowserAssertionSpec,
  BrowserCheckSpec,
  NormalizedTestAgentProjectTarget,
} from "../types";
import { resolveUrl } from "../utils";

export const ACCEPTANCE_HISTORY_FLOW_PROBE_TYPE = "acceptance_history_flow";

export interface AcceptanceHistoryFlow {
  criterion: string;
  url: string;
  initialPath: string;
  destinationPath: string;
  targetRole: "button" | "link";
  targetName: string;
  mode: "back" | "back_forward";
  backExpectedText: string;
  forwardExpectedText: string;
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

function quotedRanges(value: string) {
  const out: Array<{ start: number; end: number }> = [];
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
      out.push({ start: match.index, end: match.index + match[0].length });
    }
  }
  return out;
}

function firstUnquotedMatch(value: string, patterns: RegExp[]) {
  const ranges = quotedRanges(value);
  let earliest: RegExpExecArray | null = null;
  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(value))) {
      if (ranges.some(range => match!.index >= range.start && match!.index < range.end)) continue;
      if (!earliest || match.index < earliest.index) earliest = match;
      break;
    }
  }
  return earliest;
}

function clickMarker(criterion: string) {
  return firstUnquotedMatch(criterion, [
    /\b(?:click|clicking|press|tap|follow|open)\b/ig,
    /(?:点击|点按|轻触|打开|按下)/g,
  ]);
}

function backMarker(criterion: string) {
  return firstUnquotedMatch(criterion, [
    /\bbrowser\s+back\b/ig,
    /\bgo(?:es|ing)?\s+back\b/ig,
    /\bnavigate(?:s|d|ing)?\s+back\b/ig,
    /\bhistory\s+back\b/ig,
    /\bback\s+navigation\b/ig,
    /浏览器(?:返回|后退)/g,
    /(?:返回|回到|后退到)上一页/g,
    /(?:执行|使用)(?:浏览器)?后退/g,
  ]);
}

function forwardMarker(criterion: string) {
  return firstUnquotedMatch(criterion, [
    /\bbrowser\s+forward\b/ig,
    /\bgo(?:es|ing)?\s+forward\b/ig,
    /\bnavigate(?:s|d|ing)?\s+forward\b/ig,
    /\bhistory\s+forward\b/ig,
    /\bforward\s+navigation\b/ig,
    /浏览器前进/g,
    /前进到下一页/g,
    /(?:执行|使用)(?:浏览器)?前进/g,
    /再前进/g,
  ]);
}

export function acceptanceHistoryIntent(criterion: string) {
  const click = clickMarker(criterion);
  const back = backMarker(criterion);
  return Boolean(click && back && back.index > click.index);
}

function explicitUrlPaths(criterion: string) {
  const paths: string[] = [];
  const seen = new Set<string>();
  const pattern = /(^|[\s(["'`])((?:\/(?!\/)[a-zA-Z0-9._~!$&'()*+,;=:@%-]+)+(?:\?[a-zA-Z0-9._~!$&'()*+,;=:@/?%-]+)?)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(criterion))) {
    const path = clean(match[2]).replace(/[),.;:!?，。；：！？]+$/g, "");
    const key = path.toLowerCase();
    if (!path || seen.has(key)) continue;
    seen.add(key);
    paths.push(path);
  }
  return paths;
}

function firstQuotedAfterClick(criterion: string, click: RegExpExecArray) {
  return quotedText(criterion.slice(click.index + click[0].length))[0] || "";
}

function targetRoleFromCriterion(criterion: string, clickIndex: number): AcceptanceHistoryFlow["targetRole"] {
  const context = criterion.slice(Math.max(0, clickIndex - 60), Math.min(criterion.length, clickIndex + 140));
  return /\b(?:link|nav|navigation|menu item|anchor)\b/i.test(context) || /(?:链接|导航|菜单项)/.test(context) ? "link" : "button";
}

function expectedTextBetween(criterion: string, start: RegExpExecArray, end?: RegExpExecArray | null) {
  const from = start.index + start[0].length;
  const to = end && end.index > from ? end.index : criterion.length;
  const segment = criterion.slice(from, to);
  const display = /(?:\b(?:show|shows|display|displays|see|visible|appear|appears|contain|contains|include|includes|render|renders|restore|restores)\w*\b|显示|出现|看到|可见|包含|包括|渲染|恢复)[^"'`“‘「『]{0,100}["'`“‘「『]/i.exec(segment);
  if (display) return quotedText(segment.slice(display.index))[0] || "";
  return quotedText(segment)[0] || "";
}

function flowName(project: NormalizedTestAgentProjectTarget, flow: AcceptanceHistoryFlow) {
  return `Acceptance history flow: ${project.name} ${flow.initialPath} ${flow.mode}`;
}

function flowActions(flow: AcceptanceHistoryFlow): BrowserActionSpec[] {
  const actions: BrowserActionSpec[] = [
    { type: "goto", url: flow.url, waitUntil: "domcontentloaded" },
    { type: "click", role: flow.targetRole, name: flow.targetName, exact: true },
    { type: "waitForUrl", text: flow.destinationPath },
    { type: "waitForTimeout", value: "150" },
    { type: "goBack", waitUntil: "domcontentloaded" },
    { type: "waitForUrl", text: flow.initialPath },
    { type: "waitForText", text: flow.backExpectedText },
  ];
  if (flow.mode === "back_forward") {
    actions.push(
      { type: "goForward", waitUntil: "domcontentloaded" },
      { type: "waitForUrl", text: flow.destinationPath },
      { type: "waitForText", text: flow.forwardExpectedText },
    );
  }
  actions.push({ type: "waitForTimeout", value: "150" });
  return actions;
}

function flowAssertions(flow: AcceptanceHistoryFlow): BrowserAssertionSpec[] {
  const finalPath = flow.mode === "back_forward" ? flow.destinationPath : flow.initialPath;
  const finalText = flow.mode === "back_forward" ? flow.forwardExpectedText : flow.backExpectedText;
  return [
    { type: "pageNotBlank" },
    { type: "text", text: finalText },
    { type: "visible", text: finalText, exact: true },
    { type: "inViewport", text: finalText, exact: true },
    { type: "urlIncludes", text: finalPath },
    { type: "consoleNoErrors" },
    { type: "networkNoErrors" },
  ];
}

export function buildAcceptanceHistoryFlows(project: NormalizedTestAgentProjectTarget, acceptanceCriteria: string[] = []): AcceptanceHistoryFlow[] {
  if (!project.targetUrl) return [];
  const flows: AcceptanceHistoryFlow[] = [];
  const seen = new Set<string>();

  for (const raw of acceptanceCriteria) {
    const criterion = clean(raw);
    if (!criterion || !acceptanceHistoryIntent(criterion)) continue;
    const click = clickMarker(criterion);
    const back = backMarker(criterion);
    if (!click || !back) continue;
    const forward = forwardMarker(criterion);
    const paths = explicitUrlPaths(criterion);
    const initialPath = paths[0] || "";
    const destinationPath = paths[1] || "";
    const targetName = firstQuotedAfterClick(criterion, click);
    const mode: AcceptanceHistoryFlow["mode"] = forward && forward.index > back.index ? "back_forward" : "back";
    const backExpectedText = expectedTextBetween(criterion, back, mode === "back_forward" ? forward : null);
    const forwardExpectedText = mode === "back_forward" && forward ? expectedTextBetween(criterion, forward) : "";
    const url = initialPath ? resolveUrl(project.targetUrl, initialPath) : "";
    if (!url || !initialPath || !destinationPath || !targetName || !backExpectedText) continue;
    if (mode === "back_forward" && !forwardExpectedText) continue;
    const targetRole = targetRoleFromCriterion(criterion, click.index);
    const key = `${url}:${destinationPath.toLowerCase()}:${targetRole}:${targetName.toLowerCase()}:${mode}:${backExpectedText.toLowerCase()}:${forwardExpectedText.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    flows.push({
      criterion,
      url,
      initialPath,
      destinationPath,
      targetRole,
      targetName,
      mode,
      backExpectedText,
      forwardExpectedText,
    });
  }

  return flows;
}

export function buildAcceptanceHistoryFlowBrowserChecks(project: NormalizedTestAgentProjectTarget, acceptanceCriteria: string[] = []): BrowserCheckSpec[] {
  return buildAcceptanceHistoryFlows(project, acceptanceCriteria).map(flow => ({
    name: flowName(project, flow),
    url: flow.url,
    probeType: ACCEPTANCE_HISTORY_FLOW_PROBE_TYPE,
    context: {
      source: "acceptance_criteria",
      generatedBy: ACCEPTANCE_HISTORY_FLOW_PROBE_TYPE,
      acceptanceCriteria: [flow.criterion],
      historyMode: flow.mode,
      initialPath: flow.initialPath,
      destinationPath: flow.destinationPath,
      targetRole: flow.targetRole,
      targetName: flow.targetName,
      backExpectedText: flow.backExpectedText,
      forwardExpectedText: flow.forwardExpectedText,
    },
    actions: flowActions(flow),
    assertions: flowAssertions(flow),
    screenshot: true,
  }));
}
