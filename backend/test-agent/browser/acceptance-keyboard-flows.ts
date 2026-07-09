import {
  BrowserActionSpec,
  BrowserAssertionSpec,
  BrowserCheckSpec,
  NormalizedTestAgentProjectTarget,
} from "../types";
import { resolveUrl } from "../utils";

export const ACCEPTANCE_KEYBOARD_FLOW_PROBE_TYPE = "acceptance_keyboard_flow";

export interface AcceptanceKeyboardFlow {
  criterion: string;
  url: string;
  path: string;
  key: string;
  expectedText: string;
}

const NAMED_KEYS: Record<string, string> = {
  enter: "Enter",
  return: "Enter",
  esc: "Escape",
  escape: "Escape",
  tab: "Tab",
  space: "Space",
  backspace: "Backspace",
  delete: "Delete",
  del: "Delete",
  home: "Home",
  end: "End",
  pageup: "PageUp",
  "page up": "PageUp",
  pagedown: "PageDown",
  "page down": "PageDown",
  arrowup: "ArrowUp",
  "arrow up": "ArrowUp",
  up: "ArrowUp",
  arrowdown: "ArrowDown",
  "arrow down": "ArrowDown",
  down: "ArrowDown",
  arrowleft: "ArrowLeft",
  "arrow left": "ArrowLeft",
  left: "ArrowLeft",
  arrowright: "ArrowRight",
  "arrow right": "ArrowRight",
  right: "ArrowRight",
};

function clean(value: string) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function quotedText(value: string) {
  const out: string[] = [];
  const patterns = [
    /"([^"\r\n]{1,120})"/g,
    /'([^'\r\n]{1,120})'/g,
    /`([^`\r\n]{1,120})`/g,
    /“([^”\r\n]{1,120})”/g,
    /‘([^’\r\n]{1,120})’/g,
    /「([^」\r\n]{1,120})」/g,
    /『([^』\r\n]{1,120})』/g,
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

export function acceptanceKeyboardIntent(criterion: string) {
  return /\b(?:keyboard|shortcut|hotkey|key\s+combo|key\s+combination|press\s+(?:the\s+)?(?:key|shortcut|hotkey))\b/i.test(criterion)
    || /(?:快捷键|热键|键盘|按键|组合键|按下[^。！？；\r\n]{0,30}(?:键|快捷键|热键|组合键))/.test(criterion);
}

function looksLikeKeyboardCriterion(criterion: string) {
  if (!acceptanceKeyboardIntent(criterion)) return false;
  return /\b(?:then|after(?:wards)?|should|must|will|shows?|displays?|visible|appears?|opens?)\b/i.test(criterion)
    || /(?:然后|之后|随后|应该|应当|必须|会|显示|出现|可见|打开)/.test(criterion);
}

function canonicalKeyPart(part: string) {
  const normalized = clean(part).replace(/\s+/g, " ");
  const lower = normalized.toLowerCase();
  if (lower === "ctrl" || lower === "control") return "Control";
  if (lower === "cmd" || lower === "command" || lower === "meta" || lower === "win" || lower === "windows") return "Meta";
  if (lower === "alt" || lower === "option") return "Alt";
  if (lower === "shift") return "Shift";
  if (NAMED_KEYS[lower]) return NAMED_KEYS[lower];
  if (/^f(?:[1-9]|1[0-2])$/i.test(normalized)) return normalized.toUpperCase();
  if (/^[a-z]$/i.test(normalized)) return normalized.toUpperCase();
  if (/^[0-9]$/.test(normalized)) return normalized;
  return normalized;
}

function canonicalKeyboardKey(value: string) {
  const cleaned = clean(value)
    .replace(/[，。；：！？,.;:!?]+$/g, "")
    .replace(/\s*\+\s*/g, "+");
  if (!cleaned) return "";
  const parts = cleaned.split("+").map(canonicalKeyPart).filter(Boolean);
  if (!parts.length) return "";
  const key = parts.join("+");
  const hasModifier = parts.some(part => /^(?:Control|Alt|Shift|Meta)$/.test(part));
  if (hasModifier && parts.length >= 2) return key;
  const single = parts[0];
  if (NAMED_KEYS[single.toLowerCase()] || /^F(?:[1-9]|1[0-2])$/.test(single)) return single;
  return "";
}

function keyLikePattern() {
  return /((?:(?:Ctrl|Control|Alt|Option|Shift|Meta|Cmd|Command|Win|Windows)\s*\+\s*)+(?:[A-Za-z0-9]|F(?:[1-9]|1[0-2])|Enter|Return|Escape|Esc|Tab|Space|Backspace|Delete|Del|Arrow(?:Up|Down|Left|Right)|Page\s*Up|Page\s*Down|Home|End)|(?:Enter|Return|Escape|Esc|Tab|Space|Backspace|Delete|Del|Arrow(?:Up|Down|Left|Right)|Page\s*Up|Page\s*Down|Home|End|F(?:[1-9]|1[0-2])))/i;
}

function keyboardKeyFromCriterion(criterion: string) {
  const quoted = firstQuotedAfter(criterion, /(?:\b(?:press|pressed|keyboard|shortcut|hotkey|key\s+combo|key\s+combination)\b|按下|快捷键|热键|键盘|按键|组合键)[^"'`“‘「『]{0,80}["'`“‘「『]/i);
  const quotedKey = canonicalKeyboardKey(quoted);
  if (quotedKey) return quotedKey;
  const intentMatch = /(?:\b(?:press|pressed|keyboard|shortcut|hotkey|key\s+combo|key\s+combination)\b|按下|快捷键|热键|键盘|按键|组合键)/i.exec(criterion);
  const tail = intentMatch ? criterion.slice(intentMatch.index, Math.min(criterion.length, intentMatch.index + 140)) : criterion;
  const match = keyLikePattern().exec(tail);
  return canonicalKeyboardKey(match?.[1] || "");
}

function expectedTextFromCriterion(criterion: string, key: string) {
  const afterThen = /(?:then|after(?:wards)?|and then|should|must|will)\b|(?:然后|之后|随后|并且|应该|应当|必须|会)/i.exec(criterion);
  const tail = afterThen ? criterion.slice(afterThen.index) : criterion;
  const expected = firstQuotedAfter(tail, /(?:(?:show|shows|display|displays|see|visible|appear|appears|open|opens|contain|contains|include|includes|render|renders)\w*|显示|出现|看到|可见|打开|包含|包括|渲染)[^"'`“‘「『]{0,80}["'`“‘「『]/i);
  if (expected && expected.toLowerCase() !== key.toLowerCase()) return expected;
  return quotedText(tail).find(item => item.toLowerCase() !== key.toLowerCase()) || "";
}

function flowName(project: NormalizedTestAgentProjectTarget, flow: AcceptanceKeyboardFlow) {
  try {
    const parsed = new URL(flow.url);
    return `Acceptance keyboard flow: ${project.name} ${parsed.pathname || "/"}`;
  } catch {
    return `Acceptance keyboard flow: ${project.name}`;
  }
}

function flowActions(flow: AcceptanceKeyboardFlow): BrowserActionSpec[] {
  return [
    { type: "goto", url: flow.url, waitUntil: "domcontentloaded" },
    { type: "press", key: flow.key },
    { type: "waitForTimeout", value: "250" },
  ];
}

function flowAssertions(flow: AcceptanceKeyboardFlow): BrowserAssertionSpec[] {
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

export function buildAcceptanceKeyboardFlows(project: NormalizedTestAgentProjectTarget, acceptanceCriteria: string[] = []): AcceptanceKeyboardFlow[] {
  if (!project.targetUrl) return [];
  const flows: AcceptanceKeyboardFlow[] = [];
  const seen = new Set<string>();

  for (const raw of acceptanceCriteria) {
    const criterion = clean(raw);
    if (!criterion || !looksLikeKeyboardCriterion(criterion)) continue;
    const path = explicitUrlPath(criterion);
    const url = path ? resolveUrl(project.targetUrl, path) : project.targetUrl;
    const key = keyboardKeyFromCriterion(criterion);
    const expectedText = expectedTextFromCriterion(criterion, key);
    if (!url || !key || !expectedText) continue;
    const dedupeKey = `${url}:${key.toLowerCase()}:${expectedText.toLowerCase()}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    flows.push({
      criterion,
      url,
      path: path || "/",
      key,
      expectedText,
    });
  }

  return flows;
}

export function buildAcceptanceKeyboardFlowBrowserChecks(project: NormalizedTestAgentProjectTarget, acceptanceCriteria: string[] = []): BrowserCheckSpec[] {
  return buildAcceptanceKeyboardFlows(project, acceptanceCriteria).map(flow => ({
    name: flowName(project, flow),
    url: flow.url,
    probeType: ACCEPTANCE_KEYBOARD_FLOW_PROBE_TYPE,
    context: {
      source: "acceptance_criteria",
      generatedBy: ACCEPTANCE_KEYBOARD_FLOW_PROBE_TYPE,
      acceptanceCriteria: [flow.criterion],
      key: flow.key,
      expectedText: flow.expectedText,
    },
    actions: flowActions(flow),
    assertions: flowAssertions(flow),
    screenshot: true,
  }));
}
