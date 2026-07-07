import {
  BrowserActionSpec,
  BrowserAssertionSpec,
  BrowserCheckSpec,
  BrowserProbeTemplateFieldSpec,
  BrowserProbeTemplateSpec,
  WorkOrderIssue,
} from "./types";
import { asArray } from "./utils";

function text(value: any) {
  return String(value || "").trim();
}

function kindOf(template: BrowserProbeTemplateSpec) {
  return text(template.kind || template.type || template.template || template.probeType || template.probe_type).toLowerCase().replace(/[\s:-]+/g, "_");
}

function templateName(template: BrowserProbeTemplateSpec, fallback: string) {
  return text(template.name || template.title) || fallback;
}

function templateUrl(template: BrowserProbeTemplateSpec) {
  return text(template.url || template.targetUrl || template.target_url);
}

function probeType(template: BrowserProbeTemplateSpec, fallback: string) {
  return text(template.probeType || template.probe_type || template.kind || template.type || template.template) || fallback;
}

function setupActions(template: BrowserProbeTemplateSpec): BrowserActionSpec[] {
  return asArray(template.setupActions || template.setup_actions || template.actions).filter(item => item && typeof item === "object") as BrowserActionSpec[];
}

function explicitAssertions(template: BrowserProbeTemplateSpec): BrowserAssertionSpec[] {
  return asArray(template.assertions || template.expectations).filter(item => item && typeof item === "object") as BrowserAssertionSpec[];
}

function gotoAction(url: string): BrowserActionSpec[] {
  return url ? [{ type: "goto", url, waitUntil: "domcontentloaded" }] : [];
}

function fillAction(field: BrowserProbeTemplateFieldSpec): BrowserActionSpec {
  return {
    ...field,
    type: "fill",
    value: String(field.value ?? field.text ?? ""),
  };
}

function clickAction(action: Partial<BrowserActionSpec> | undefined): BrowserActionSpec | null {
  if (!action || typeof action !== "object") return null;
  return {
    ...action,
    type: action.type || "click",
  };
}

function defaultAssertions(template: BrowserProbeTemplateSpec) {
  const assertions: BrowserAssertionSpec[] = [];
  const expectedUrlIncludes = text(template.expectedUrlIncludes || template.expected_url_includes);
  const expectedText = text(template.expectedText || template.expected_text);
  if (expectedUrlIncludes) assertions.push({ type: "urlIncludes", text: expectedUrlIncludes });
  if (expectedText) assertions.push({ type: "visible", text: expectedText });
  return assertions;
}

function withConsoleAssertion(assertions: BrowserAssertionSpec[]) {
  if (assertions.some(item => item.type === "consoleNoErrors" || (item as any).assertion === "console_no_errors")) return assertions;
  return [...assertions, { type: "consoleNoErrors" as const }];
}

function boundedRepeat(value: any) {
  const repeat = Number(value || 2);
  if (!Number.isFinite(repeat)) return 2;
  return Math.max(2, Math.min(10, Math.floor(repeat)));
}

function invalidFormInput(template: BrowserProbeTemplateSpec): BrowserCheckSpec {
  const url = templateUrl(template);
  const fields = asArray(template.fields).filter(item => item && typeof item === "object") as BrowserProbeTemplateFieldSpec[];
  const submit = clickAction(template.submit);
  const actions = [
    ...gotoAction(url),
    ...setupActions(template),
    ...fields.map(fillAction),
    ...(submit ? [submit] : []),
  ];
  return {
    name: templateName(template, "Invalid form input"),
    url,
    actions,
    assertions: withConsoleAssertion([
      ...defaultAssertions(template),
      ...explicitAssertions(template),
    ]),
    screenshot: template.screenshot !== false,
    adversarial: true,
    probeType: probeType(template, "invalid_form_input"),
    probe_type: probeType(template, "invalid_form_input"),
  };
}

function repeatedClick(template: BrowserProbeTemplateSpec): BrowserCheckSpec {
  const url = templateUrl(template);
  const target = clickAction(template.target);
  const repeat = boundedRepeat(template.repeat);
  const actions = [
    ...gotoAction(url),
    ...setupActions(template),
    ...(target ? Array.from({ length: repeat }, () => ({ ...target })) : []),
  ];
  return {
    name: templateName(template, "Repeated click is safe"),
    url,
    actions,
    assertions: withConsoleAssertion([
      ...defaultAssertions(template),
      ...explicitAssertions(template),
    ]),
    screenshot: template.screenshot !== false,
    adversarial: true,
    probeType: probeType(template, "repeated_click"),
    probe_type: probeType(template, "repeated_click"),
  };
}

function refreshPersistence(template: BrowserProbeTemplateSpec): BrowserCheckSpec {
  const url = templateUrl(template);
  const stateAssertions = asArray(template.stateAssertions || template.state_assertions).filter(item => item && typeof item === "object") as BrowserAssertionSpec[];
  return {
    name: templateName(template, "State persists after refresh"),
    url,
    actions: [
      ...gotoAction(url),
      ...setupActions(template),
      { type: "reload", waitUntil: "domcontentloaded" },
    ],
    assertions: withConsoleAssertion([
      ...stateAssertions,
      ...defaultAssertions(template),
      ...explicitAssertions(template),
    ]),
    screenshot: template.screenshot !== false,
    adversarial: true,
    probeType: probeType(template, "refresh_persistence"),
    probe_type: probeType(template, "refresh_persistence"),
  };
}

export function buildAdversarialBrowserProbeChecks(input: {
  project: string;
  templates: BrowserProbeTemplateSpec[];
  issues?: WorkOrderIssue[];
}): BrowserCheckSpec[] {
  const checks: BrowserCheckSpec[] = [];
  for (let index = 0; index < input.templates.length; index += 1) {
    const template = input.templates[index];
    const kind = kindOf(template);
    if (kind === "invalid_form_input" || kind === "invalid_form" || kind === "invalid_input") {
      checks.push(invalidFormInput(template));
    } else if (kind === "repeated_click" || kind === "double_click" || kind === "idempotent_click") {
      checks.push(repeatedClick(template));
    } else if (kind === "refresh_persistence" || kind === "reload_persistence" || kind === "state_persistence") {
      checks.push(refreshPersistence(template));
    } else {
      input.issues?.push({
        severity: "warning",
        code: "unsupported_browser_probe_template",
        message: `Browser probe template ${index + 1} has unsupported kind "${kind || "(missing)"}".`,
        project: input.project,
      });
    }
  }
  return checks;
}
