import {
  BrowserActionSpec,
  BrowserAssertionSpec,
  BrowserCheckSpec,
  NormalizedTestAgentProjectTarget,
} from "../types";
import { resolveUrl } from "../utils";
import { buildAcceptanceDerivedBrowserAssertionsByCriterion } from "./acceptance-derived-checks";

export const ACCEPTANCE_FORM_FLOW_PROBE_TYPE = "acceptance_form_flow";

export interface AcceptanceFormFlowField {
  actionType?: "fill" | "selectOption" | "check" | "uncheck";
  fieldLabel: string;
  inputValue: string;
}

interface MatchedAcceptanceFormFlowField extends AcceptanceFormFlowField {
  index: number;
}

export interface AcceptanceFormFlow {
  criterion: string;
  url: string;
  path: string;
  expectedUrlPath: string;
  reloadBeforeAssertions: boolean;
  fields: AcceptanceFormFlowField[];
  fieldLabel: string;
  inputValue: string;
  buttonName: string;
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

function firstQuotedAfter(criterion: string, pattern: RegExp) {
  const match = pattern.exec(criterion);
  if (!match) return "";
  return quotedText(criterion.slice(match.index))[0] || "";
}

function nextBoundary(criterion: string, start: number) {
  const tail = criterion.slice(start);
  const boundary = /\b(?:fill|type|enter|input|set|select|choose|pick|check|tick|enable|uncheck|untick|disable|clear|click|press|tap|submit|then|afterwards|after|should|must|will)\b/ig;
  boundary.lastIndex = 1;
  const match = boundary.exec(tail);
  return match ? start + match.index : criterion.length;
}

function fieldForFillSegment(segment: string): AcceptanceFormFlowField | null {
  const values = quotedText(segment);
  if (values.length < 2) return null;
  if (/\b(?:with|as|value)\b/i.test(segment) && !/\b(?:in|into|for)\b/i.test(segment)) {
    return { actionType: "fill", fieldLabel: values[0], inputValue: values[1] };
  }
  if (/\b(?:in|into|to|for)\b/i.test(segment)) {
    return { actionType: "fill", inputValue: values[0], fieldLabel: values[1] };
  }
  if (/\b(?:with|as|value)\b/i.test(segment)) {
    return { actionType: "fill", fieldLabel: values[0], inputValue: values[1] };
  }
  return null;
}

function fieldForSelectSegment(segment: string): AcceptanceFormFlowField | null {
  if (/\bradio(?:\s+button)?\b/i.test(segment)) return null;
  const values = quotedText(segment);
  if (values.length < 2) return null;
  if (/\b(?:in|from|for|to)\b/i.test(segment)) {
    return { actionType: "selectOption", inputValue: values[0], fieldLabel: values[1] };
  }
  return { actionType: "selectOption", inputValue: values[0], fieldLabel: values[1] };
}

function fieldForCheckSegment(segment: string): AcceptanceFormFlowField | null {
  const values = quotedText(segment);
  if (!values.length) return null;
  return { actionType: "check", fieldLabel: values[0], inputValue: "true" };
}

function fieldForUncheckSegment(segment: string): AcceptanceFormFlowField | null {
  const values = quotedText(segment);
  if (!values.length) return null;
  return { actionType: "uncheck", fieldLabel: values[0], inputValue: "false" };
}

function fieldForRadioSegment(segment: string): AcceptanceFormFlowField | null {
  const values = quotedText(segment);
  if (!values.length || !/\bradio(?:\s+button)?\b/i.test(segment)) return null;
  return { actionType: "check", fieldLabel: values[0], inputValue: "true" };
}

function matchControlActions(
  criterion: string,
  pattern: RegExp,
  build: (segment: string) => AcceptanceFormFlowField | null,
): MatchedAcceptanceFormFlowField[] {
  const fields: MatchedAcceptanceFormFlowField[] = [];
  const seen = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(criterion))) {
    const start = match.index;
    const end = nextBoundary(criterion, start + match[0].length);
    const field = build(criterion.slice(start, end));
    if (!field?.fieldLabel || !field.inputValue) continue;
    const key = `${field.actionType || "fill"}:${field.fieldLabel.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    fields.push({ ...field, index: start });
  }
  return fields;
}

function matchFormControlActions(criterion: string): AcceptanceFormFlowField[] {
  const fields = [
    ...matchControlActions(criterion, /\b(?:fill|type|enter|input|set)\b/ig, fieldForFillSegment),
    ...matchControlActions(criterion, /\b(?:select|choose|pick)\b/ig, fieldForSelectSegment),
    ...matchControlActions(criterion, /\b(?:check|tick|enable)\b/ig, fieldForCheckSegment),
    ...matchControlActions(criterion, /\b(?:uncheck|untick|disable|clear)\b/ig, fieldForUncheckSegment),
    ...matchControlActions(criterion, /\b(?:choose|select|pick)\b(?=[^.;]{0,120}\bradio(?:\s+button)?\b)/ig, fieldForRadioSegment),
  ].sort((a, b) => a.index - b.index);
  return fields.map(({ index: _index, ...field }) => field);
}

function matchSubmitAction(criterion: string) {
  return firstQuotedAfter(criterion, /(?:click|press|tap|submit)\s+(?:the\s+)?(?:button\s+)?["'`“‘「『]/i);
}

function matchExpectedText(criterion: string, inputValues: string[]) {
  const afterThen = /(?:then|after(?:wards)?|and then|should|must|will)\b/i.exec(criterion);
  const tail = afterThen ? criterion.slice(afterThen.index) : criterion;
  const expected = firstQuotedAfter(tail, /(?:show|shows|display|displays|see|visible|appear|appears|contain|contains|include|includes|list|lists|render|renders)\w*\s+["'`“‘「『]/i);
  if (expected) return expected;

  const inputValueSet = new Set(inputValues);
  const tailQuotes = quotedText(tail);
  const distinct = tailQuotes.find(item => !inputValueSet.has(item));
  return distinct || tailQuotes.find(item => inputValueSet.has(item)) || "";
}

function requiresReloadPersistence(criterion: string) {
  return /\b(?:after|following)\s+(?:a\s+|the\s+)?(?:page\s+)?(?:refresh|reload|reloading|refreshing)\b/i.test(criterion)
    || /\b(?:refresh|reload)\s+(?:the\s+)?page\b/i.test(criterion)
    || /\bpersists?\b(?=[^.;]{0,120}\b(?:refresh|reload|reloading|refreshing)\b)/i.test(criterion)
    || /\bstill\s+(?:show|shows|display|displays|contain|contains|include|includes)\b(?=[^.;]{0,160}\b(?:refresh|reload|reloading|refreshing)\b)/i.test(criterion);
}

function flowName(project: NormalizedTestAgentProjectTarget, flow: AcceptanceFormFlow) {
  try {
    const parsed = new URL(flow.url);
    return `Acceptance form flow: ${project.name} ${parsed.pathname || "/"}`;
  } catch {
    return `Acceptance form flow: ${project.name}`;
  }
}

function flowActions(flow: AcceptanceFormFlow): BrowserActionSpec[] {
  const waits: BrowserActionSpec[] = flow.expectedUrlPath && flow.expectedUrlPath !== flow.path
    ? [{ type: "waitForUrl", text: flow.expectedUrlPath }]
    : [];
  const postSubmit: BrowserActionSpec[] = [
    ...waits,
    { type: "waitForTimeout", value: "250" },
    ...(flow.reloadBeforeAssertions ? [
      { type: "reload" as const, waitUntil: "domcontentloaded" as const },
      { type: "waitForTimeout" as const, value: "250" },
    ] : []),
  ];
  return [
    { type: "goto", url: flow.url, waitUntil: "domcontentloaded" },
    ...flow.fields.map(field => {
      if (field.actionType === "selectOption") return { type: "selectOption" as const, label: field.fieldLabel, value: field.inputValue, exact: true };
      if (field.actionType === "check") return { type: "check" as const, label: field.fieldLabel, exact: true };
      if (field.actionType === "uncheck") return { type: "uncheck" as const, label: field.fieldLabel, exact: true };
      return { type: "fill" as const, label: field.fieldLabel, value: field.inputValue, exact: true };
    }),
    { type: "click", role: "button", name: flow.buttonName, exact: true },
    ...postSubmit,
  ];
}

function flowAssertions(flow: AcceptanceFormFlow): BrowserAssertionSpec[] {
  const stateAssertions: BrowserAssertionSpec[] = [];
  for (const field of flow.fields) {
    if (field.actionType === "selectOption") stateAssertions.push({ type: "selectedTextIncludes", label: field.fieldLabel, text: field.inputValue, exact: true });
    if (field.actionType === "check") stateAssertions.push({ type: "checked", label: field.fieldLabel, exact: true });
    if (field.actionType === "uncheck") stateAssertions.push({ type: "notChecked", label: field.fieldLabel, exact: true });
  }
  return [
    { type: "pageNotBlank" },
    ...stateAssertions,
    { type: "text", text: flow.expectedText },
    { type: "urlIncludes", text: flow.expectedUrlPath || flow.path },
    { type: "consoleNoErrors" },
    { type: "networkNoErrors" },
  ];
}

export function buildAcceptanceFormFlows(project: NormalizedTestAgentProjectTarget, acceptanceCriteria: string[] = []): AcceptanceFormFlow[] {
  if (!project.targetUrl) return [];
  const flows: AcceptanceFormFlow[] = [];

  for (const group of buildAcceptanceDerivedBrowserAssertionsByCriterion(acceptanceCriteria)) {
    const criterion = group.criterion;
    const pathItems = group.assertions.filter(item => item.reason === "explicit_url_path");
    const path = String(pathItems[0]?.assertion.text || pathItems[0]?.assertion.value || "");
    const expectedUrlPath = String(pathItems[pathItems.length - 1]?.assertion.text || pathItems[pathItems.length - 1]?.assertion.value || path);
    const fields = matchFormControlActions(criterion);
    const buttonName = matchSubmitAction(criterion);
    if (!path || !fields.length || !buttonName) continue;

    const expectedText = matchExpectedText(criterion, fields.map(field => field.inputValue));
    if (!expectedText) continue;
    const firstField = fields[0];

    flows.push({
      criterion,
      url: resolveUrl(project.targetUrl, path),
      path,
      expectedUrlPath,
      reloadBeforeAssertions: requiresReloadPersistence(criterion),
      fields,
      fieldLabel: firstField.fieldLabel,
      inputValue: firstField.inputValue,
      buttonName,
      expectedText,
    });
  }

  return flows;
}

export function buildAcceptanceFormFlowBrowserChecks(project: NormalizedTestAgentProjectTarget, acceptanceCriteria: string[] = []): BrowserCheckSpec[] {
  return buildAcceptanceFormFlows(project, acceptanceCriteria).map(flow => ({
    name: flowName(project, flow),
    url: flow.url,
    probeType: ACCEPTANCE_FORM_FLOW_PROBE_TYPE,
    actions: flowActions(flow),
    assertions: flowAssertions(flow),
    screenshot: true,
  }));
}
