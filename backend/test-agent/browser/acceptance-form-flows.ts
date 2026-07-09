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
  adversarial: boolean;
  fields: AcceptanceFormFlowField[];
  fieldLabel: string;
  inputValue: string;
  buttonName: string;
  expectedText: string;
  derivedAssertions: BrowserAssertionSpec[];
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
  const boundary = /\b(?:fill|type|enter|input|set|select|choose|pick|check|tick|enable|uncheck|untick|disable|clear|click|press|tap|submit|then|afterwards|after|should|must|will)\b|(?:填写|输入|录入|填入|设置|选择|选中|勾选|取消勾选|取消选择|启用|禁用|清空|点击|点按|轻触|提交|然后|之后|随后|应该|应当|必须|会)/ig;
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
  if (/(?:到|至|进|进入|给|为)/.test(segment)) {
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
  if (/(?:在|从|给|为|到|至)/.test(segment)) {
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
  if (!values.length || (!/\bradio(?:\s+button)?\b/i.test(segment) && !/单选/.test(segment))) return null;
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
    ...matchControlActions(criterion, /\b(?:fill|type|enter|input|set)\b|(?:填写|输入|录入|填入|设置)/ig, fieldForFillSegment),
    ...matchControlActions(criterion, /\b(?:select|choose|pick)\b|(?:选择|选中|挑选)/ig, fieldForSelectSegment),
    ...matchControlActions(criterion, /\b(?:check|tick|enable)\b|(?:勾选|启用)/ig, fieldForCheckSegment),
    ...matchControlActions(criterion, /\b(?:uncheck|untick|disable|clear)\b|(?:取消勾选|取消选择|禁用|清空)/ig, fieldForUncheckSegment),
    ...matchControlActions(criterion, /(?:\b(?:choose|select|pick)\b(?=[^.;，。；]{0,120}\bradio(?:\s+button)?\b)|(?:选择|选中|挑选)(?=[^.;，。；]{0,120}单选))/ig, fieldForRadioSegment),
  ].sort((a, b) => a.index - b.index);
  return fields.map(({ index: _index, ...field }) => field);
}

function matchSubmitAction(criterion: string) {
  return firstQuotedAfter(criterion, /(?:\b(?:click|press|tap|submit)\b|点击|点按|轻触|按下|提交)\s*(?:the\s+)?(?:button\s+)?["'`“‘「『]/i);
}

function matchExpectedText(criterion: string, inputValues: string[]) {
  const afterThen = /(?:then|after(?:wards)?|and then|should|must|will)\b|(?:然后|之后|随后|并且|应该|应当|必须|会)/i.exec(criterion);
  const tail = afterThen ? criterion.slice(afterThen.index) : criterion;
  const expected = firstQuotedAfter(tail, /(?:(?:show|shows|display|displays|see|visible|appear|appears|contain|contains|include|includes|list|lists|render|renders)\w*|显示|出现|看到|可见|包含|包括|列出|渲染)\s*["'`“‘「『]/i);
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
    || /\bstill\s+(?:show|shows|display|displays|contain|contains|include|includes)\b(?=[^.;]{0,160}\b(?:refresh|reload|reloading|refreshing)\b)/i.test(criterion)
    || /(?:刷新|重新加载|重载).{0,120}(?:仍然|依然|继续)?(?:显示|可见|包含)/.test(criterion)
    || /(?:仍然|依然|继续)(?:显示|可见|包含).{0,160}(?:刷新|重新加载|重载)/.test(criterion);
}

function hasInvalidFormIntent(criterion: string, fields: AcceptanceFormFlowField[], expectedText: string) {
  const fieldValues = fields.map(field => field.inputValue).join(" ");
  const haystack = clean([criterion, expectedText, fieldValues].join(" "));
  return /\b(?:invalid|wrong|bad|incorrect|malformed|empty|required|missing|rejected?|denied|unauthorized|forbidden|error|failure|fails?|negative)\b/i.test(haystack)
    || /\b(?:stays?|remains?|keeps?)\s+(?:on|at)\b/i.test(haystack)
    || /\b(?:does|do|did|should|must|can|will)\s+not\s+(?:navigate|redirect|submit|save|sign\s*in|log\s*in|login|authenticate|create|delete|update)\b/i.test(haystack)
    || /(?:无效|错误|失败|拒绝|缺失|必填|未授权|禁止|停留|保持|不跳转|不登录|不能提交|不可提交)/.test(haystack);
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

function browserAssertionKey(assertion: BrowserAssertionSpec) {
  return [
    assertion.type,
    assertion.selector,
    assertion.locator,
    assertion.label,
    assertion.role,
    assertion.name,
    assertion.text,
    assertion.value,
    assertion.expression,
    assertion.key,
    assertion.method,
    assertion.urlIncludes,
    assertion.url_includes,
    assertion.url,
    Array.isArray(assertion.status) ? assertion.status.join("|") : assertion.status,
    Array.isArray(assertion.statusCode) ? assertion.statusCode.join("|") : assertion.statusCode,
    Array.isArray(assertion.status_code) ? assertion.status_code.join("|") : assertion.status_code,
  ].map(value => String(value || "").toLowerCase()).join(":");
}

function addUniqueAssertion(items: BrowserAssertionSpec[], seen: Set<string>, assertion: BrowserAssertionSpec) {
  const key = browserAssertionKey(assertion);
  if (seen.has(key)) return;
  seen.add(key);
  items.push(assertion);
}

function assertionVisibleText(assertion: BrowserAssertionSpec) {
  return clean(String(assertion.text ?? assertion.value ?? ""));
}

function flowDerivedAssertions(
  assertions: Array<{ reason: string; assertion: BrowserAssertionSpec }>,
  fields: AcceptanceFormFlowField[],
  buttonName: string,
  expectedText: string,
) {
  const fieldInputValues = new Set(fields.map(field => clean(field.inputValue).toLowerCase()).filter(Boolean));
  const formControlText = new Set([
    ...fields.map(field => clean(field.fieldLabel).toLowerCase()).filter(Boolean),
    clean(buttonName).toLowerCase(),
  ].filter(Boolean));
  const normalizedExpectedText = clean(expectedText).toLowerCase();
  return assertions
    .filter(item => item.reason !== "explicit_url_path")
    .filter(item => {
      if (item.reason !== "quoted_text") return true;
      const visible = assertionVisibleText(item.assertion);
      if (!visible) return true;
      const normalized = visible.toLowerCase();
      if (normalized === normalizedExpectedText) return false;
      if (fieldInputValues.has(normalized)) return false;
      if (formControlText.has(normalized)) return false;
      return true;
    })
    .map(item => item.assertion);
}

function flowAssertions(flow: AcceptanceFormFlow): BrowserAssertionSpec[] {
  const stateAssertions: BrowserAssertionSpec[] = [];
  for (const field of flow.fields) {
    if (field.actionType === "selectOption") stateAssertions.push({ type: "selectedTextIncludes", label: field.fieldLabel, text: field.inputValue, exact: true });
    if (field.actionType === "check") stateAssertions.push({ type: "checked", label: field.fieldLabel, exact: true });
    if (field.actionType === "uncheck") stateAssertions.push({ type: "notChecked", label: field.fieldLabel, exact: true });
  }
  const assertions: BrowserAssertionSpec[] = [];
  const seen = new Set<string>();
  for (const assertion of [
    { type: "pageNotBlank" } as BrowserAssertionSpec,
    ...stateAssertions,
    { type: "text", text: flow.expectedText } as BrowserAssertionSpec,
    { type: "urlIncludes", text: flow.expectedUrlPath || flow.path } as BrowserAssertionSpec,
    ...flow.derivedAssertions,
    { type: "consoleNoErrors" } as BrowserAssertionSpec,
    { type: "networkNoErrors" } as BrowserAssertionSpec,
  ]) addUniqueAssertion(assertions, seen, assertion);
  return assertions;
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
    const derivedAssertions = flowDerivedAssertions(group.assertions, fields, buttonName, expectedText);

    flows.push({
      criterion,
      url: resolveUrl(project.targetUrl, path),
      path,
      expectedUrlPath,
      reloadBeforeAssertions: requiresReloadPersistence(criterion),
      adversarial: hasInvalidFormIntent(criterion, fields, expectedText),
      fields,
      fieldLabel: firstField.fieldLabel,
      inputValue: firstField.inputValue,
      buttonName,
      expectedText,
      derivedAssertions,
    });
  }

  return flows;
}

export function buildAcceptanceFormFlowBrowserChecks(project: NormalizedTestAgentProjectTarget, acceptanceCriteria: string[] = []): BrowserCheckSpec[] {
  return buildAcceptanceFormFlows(project, acceptanceCriteria).map(flow => ({
    name: flowName(project, flow),
    url: flow.url,
    ...(flow.adversarial ? { adversarial: true } : {}),
    probeType: ACCEPTANCE_FORM_FLOW_PROBE_TYPE,
    context: {
      source: "acceptance_criteria",
      generatedBy: ACCEPTANCE_FORM_FLOW_PROBE_TYPE,
      acceptanceCriteria: [flow.criterion],
      ...(flow.adversarial ? { adversarialIntent: "invalid_form_input" } : {}),
      fields: flow.fields,
      buttonName: flow.buttonName,
      expectedText: flow.expectedText,
      expectedUrlPath: flow.expectedUrlPath,
    },
    actions: flowActions(flow),
    assertions: flowAssertions(flow),
    screenshot: true,
  }));
}
