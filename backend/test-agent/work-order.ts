import * as path from "path";
import { buildAdversarialBrowserProbeChecks } from "./browser-probe-templates";
import {
  BrowserActionSpec,
  BrowserAssertionSpec,
  BrowserCheckSpec,
  HttpAssertionSpec,
  HttpCheckSpec,
  NormalizedTestAgentProjectTarget,
  NormalizedTestAgentWorkOrder,
  TestAgentOptions,
  TestAgentProjectTarget,
  TestAgentWorkOrder,
  WorkOrderIssue,
} from "./types";
import { asArray, defaultArtifactDir, makeRunId, resolveWorkDir, stringifyEnv } from "./utils";

const DEFAULT_OPTIONS: Required<TestAgentOptions> = {
  artifactDir: "",
  commandTimeoutMs: 120_000,
  browserTimeoutMs: 60_000,
  httpTimeoutMs: 15_000,
  startupTimeoutMs: 30_000,
  maxOutputChars: 16_000,
  maxHttpResourceChecks: 12,
  failOnConsoleError: true,
  failOnHttpResourceError: true,
  verificationOnly: true,
  browserProvider: "auto",
  autoDiscoverVerificationCommands: true,
  collectBrowserArtifacts: true,
  collectBrowserVideo: false,
};

function text(value: any) {
  return String(value || "").trim();
}

const BROWSER_ACTION_TYPES = new Set([
  "goto",
  "click",
  "fill",
  "selectOption",
  "check",
  "uncheck",
  "hover",
  "press",
  "scroll",
  "openApplication",
  "requestAccess",
  "reload",
  "goBack",
  "goForward",
  "waitForSelector",
  "waitForText",
  "waitForTimeout",
  "evaluate",
]);

const BROWSER_ACTION_ALIASES: Record<string, BrowserActionSpec["type"]> = {
  navigate: "goto",
  navigation: "goto",
  open: "goto",
  type: "fill",
  input: "fill",
  enter_text: "fill",
  select_option: "selectOption",
  press_key: "press",
  key: "press",
  wait: "waitForTimeout",
  wait_for_timeout: "waitForTimeout",
  wait_for_selector: "waitForSelector",
  wait_for_text: "waitForText",
  open_application: "openApplication",
  request_access: "requestAccess",
  refresh: "reload",
  reload_page: "reload",
  go_back: "goBack",
  back: "goBack",
  go_forward: "goForward",
  forward: "goForward",
};

const BROWSER_ASSERTION_TYPES = new Set([
  "visible",
  "notVisible",
  "text",
  "urlIncludes",
  "titleIncludes",
  "elementTextIncludes",
  "networkNoErrors",
  "consoleNoErrors",
  "jsTruthy",
  "jsEquals",
  "localStorageEquals",
  "localStorageIncludes",
  "sessionStorageEquals",
  "sessionStorageIncludes",
]);

const BROWSER_ASSERTION_ALIASES: Record<string, BrowserAssertionSpec["type"]> = {
  hidden: "notVisible",
  not_visible: "notVisible",
  contains_text: "text",
  text_includes: "text",
  url_includes: "urlIncludes",
  title_includes: "titleIncludes",
  element_text_includes: "elementTextIncludes",
  no_network_errors: "networkNoErrors",
  network_no_errors: "networkNoErrors",
  no_console_errors: "consoleNoErrors",
  console_no_errors: "consoleNoErrors",
  js_truthy: "jsTruthy",
  javascript_truthy: "jsTruthy",
  js_equals: "jsEquals",
  javascript_equals: "jsEquals",
  local_storage_equals: "localStorageEquals",
  local_storage_includes: "localStorageIncludes",
  session_storage_equals: "sessionStorageEquals",
  session_storage_includes: "sessionStorageIncludes",
};

const HTTP_ASSERTION_TYPES = new Set([
  "status",
  "contentTypeIncludes",
  "textIncludes",
  "textNotIncludes",
  "jsonPathEquals",
  "jsonPathIncludes",
]);

const HTTP_ASSERTION_ALIASES: Record<string, HttpAssertionSpec["type"]> = {
  status_code: "status",
  expect_status: "status",
  expected_status: "status",
  content_type: "contentTypeIncludes",
  content_type_includes: "contentTypeIncludes",
  contains_text: "textIncludes",
  text_includes: "textIncludes",
  response_contains: "textIncludes",
  not_contains_text: "textNotIncludes",
  text_not_includes: "textNotIncludes",
  json_equals: "jsonPathEquals",
  json_path_equals: "jsonPathEquals",
  json_includes: "jsonPathIncludes",
  json_path_includes: "jsonPathIncludes",
};

function normalizedType<T extends string>(rawType: any, aliases: Record<string, T>) {
  const raw = text(rawType);
  return aliases[raw] || raw;
}

function optionalNumber(value: any) {
  if (value === undefined || value === null || value === "") return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function coordinate(value: any): [number, number] | undefined {
  if (Array.isArray(value) && value.length === 2) {
    const x = Number(value[0]);
    const y = Number(value[1]);
    return Number.isFinite(x) && Number.isFinite(y) ? [x, y] : undefined;
  }
  if (value && typeof value === "object") {
    const x = Number(value.x);
    const y = Number(value.y);
    return Number.isFinite(x) && Number.isFinite(y) ? [x, y] : undefined;
  }
  return undefined;
}

function normalizeBrowserApps(value: any) {
  return asArray(value).map(app => ({
    displayName: text(app?.displayName || app?.display_name || app?.name) || undefined,
    bundleId: text(app?.bundleId || app?.bundle_id) || undefined,
    bundle_id: text(app?.bundle_id || app?.bundleId) || undefined,
  })).filter(app => app.displayName || app.bundleId || app.bundle_id);
}

function normalizeBrowserAction(raw: any, issues: WorkOrderIssue[], project: string, checkName: string, index: number): BrowserActionSpec | null {
  if (!raw || typeof raw !== "object") {
    issues.push({ severity: "error", code: "invalid_browser_action", message: `Browser action ${index + 1} in "${checkName}" must be an object.`, project });
    return null;
  }
  const type = normalizedType(raw.type || raw.action || raw.kind, BROWSER_ACTION_ALIASES);
  if (!BROWSER_ACTION_TYPES.has(type)) {
    issues.push({ severity: "error", code: "invalid_browser_action_type", message: `Browser action ${index + 1} in "${checkName}" has unsupported type "${type || "(missing)"}".`, project });
    return null;
  }
  const normalized: BrowserActionSpec = {
    ...raw,
    type: type as BrowserActionSpec["type"],
    selector: text(raw.selector || raw.css || raw.locator) || undefined,
    locator: text(raw.locator || raw.selector || raw.css) || undefined,
    text: raw.text === undefined ? undefined : String(raw.text),
    value: raw.value === undefined ? undefined : String(raw.value),
    url: text(raw.url || raw.href) || undefined,
    key: text(raw.key || raw.key_text || raw.keyText) || undefined,
    testId: text(raw.testId || raw.test_id || raw.dataTestId || raw.data_testid || raw.dataTestid) || undefined,
    test_id: text(raw.test_id || raw.testId || raw.dataTestId || raw.data_testid || raw.dataTestid) || undefined,
    dataTestId: text(raw.dataTestId || raw.data_testid || raw.dataTestid || raw.testId || raw.test_id) || undefined,
    data_testid: text(raw.data_testid || raw.dataTestId || raw.dataTestid || raw.testId || raw.test_id) || undefined,
    label: text(raw.label || raw.ariaLabel || raw.aria_label) || undefined,
    placeholder: text(raw.placeholder) || undefined,
    role: text(raw.role) || undefined,
    name: text(raw.name || raw.accessibleName || raw.accessible_name) || undefined,
    altText: text(raw.altText || raw.alt_text || raw.alt) || undefined,
    alt_text: text(raw.alt_text || raw.altText || raw.alt) || undefined,
    title: text(raw.title) || undefined,
    exact: raw.exact === undefined ? undefined : raw.exact !== false,
    coordinate: coordinate(raw.coordinate || raw.coords || raw.point),
    startCoordinate: coordinate(raw.startCoordinate || raw.start_coordinate),
    start_coordinate: coordinate(raw.start_coordinate || raw.startCoordinate),
    direction: raw.direction,
    amount: optionalNumber(raw.amount),
    duration: optionalNumber(raw.duration),
    region: raw.region,
    bundleId: text(raw.bundleId || raw.bundle_id) || undefined,
    bundle_id: text(raw.bundle_id || raw.bundleId) || undefined,
    apps: normalizeBrowserApps(raw.apps),
    timeoutMs: optionalNumber(raw.timeoutMs || raw.timeout_ms),
    timeout_ms: optionalNumber(raw.timeout_ms || raw.timeoutMs),
    waitUntil: raw.waitUntil || raw.wait_until,
  };
  return normalized;
}

function normalizeBrowserAssertion(raw: any, issues: WorkOrderIssue[], project: string, checkName: string, index: number): BrowserAssertionSpec | null {
  if (!raw || typeof raw !== "object") {
    issues.push({ severity: "error", code: "invalid_browser_assertion", message: `Browser assertion ${index + 1} in "${checkName}" must be an object.`, project });
    return null;
  }
  const type = normalizedType(raw.type || raw.assertion || raw.kind, BROWSER_ASSERTION_ALIASES);
  if (!BROWSER_ASSERTION_TYPES.has(type)) {
    issues.push({ severity: "error", code: "invalid_browser_assertion_type", message: `Browser assertion ${index + 1} in "${checkName}" has unsupported type "${type || "(missing)"}".`, project });
    return null;
  }
  return {
    ...raw,
    type: type as BrowserAssertionSpec["type"],
    selector: text(raw.selector || raw.css || raw.locator) || undefined,
    locator: text(raw.locator || raw.selector || raw.css) || undefined,
    text: raw.text === undefined ? undefined : String(raw.text),
    value: raw.value === undefined ? undefined : String(raw.value),
    key: text(raw.key || raw.storageKey || raw.storage_key) || undefined,
    expression: text(raw.expression || raw.js || raw.javascript) || undefined,
    testId: text(raw.testId || raw.test_id || raw.dataTestId || raw.data_testid || raw.dataTestid) || undefined,
    test_id: text(raw.test_id || raw.testId || raw.dataTestId || raw.data_testid || raw.dataTestid) || undefined,
    dataTestId: text(raw.dataTestId || raw.data_testid || raw.dataTestid || raw.testId || raw.test_id) || undefined,
    data_testid: text(raw.data_testid || raw.dataTestId || raw.dataTestid || raw.testId || raw.test_id) || undefined,
    label: text(raw.label || raw.ariaLabel || raw.aria_label) || undefined,
    placeholder: text(raw.placeholder) || undefined,
    role: text(raw.role) || undefined,
    name: text(raw.name || raw.accessibleName || raw.accessible_name) || undefined,
    altText: text(raw.altText || raw.alt_text || raw.alt) || undefined,
    alt_text: text(raw.alt_text || raw.altText || raw.alt) || undefined,
    title: text(raw.title) || undefined,
    exact: raw.exact === undefined ? undefined : raw.exact !== false,
    timeoutMs: optionalNumber(raw.timeoutMs || raw.timeout_ms),
    timeout_ms: optionalNumber(raw.timeout_ms || raw.timeoutMs),
  };
}

function normalizeHeaders(raw: any) {
  const out: Record<string, string> = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  for (const [key, value] of Object.entries(raw)) {
    if (value !== undefined && value !== null) out[key] = String(value);
  }
  return out;
}

function normalizeHttpAssertion(raw: any, issues: WorkOrderIssue[], project: string, checkName: string, index: number): HttpAssertionSpec | null {
  if (!raw || typeof raw !== "object") {
    issues.push({ severity: "error", code: "invalid_http_assertion", message: `HTTP assertion ${index + 1} in "${checkName}" must be an object.`, project });
    return null;
  }
  const type = normalizedType(raw.type || raw.assertion || raw.kind, HTTP_ASSERTION_ALIASES);
  if (!HTTP_ASSERTION_TYPES.has(type)) {
    issues.push({ severity: "error", code: "invalid_http_assertion_type", message: `HTTP assertion ${index + 1} in "${checkName}" has unsupported type "${type || "(missing)"}".`, project });
    return null;
  }
  return {
    ...raw,
    type: type as HttpAssertionSpec["type"],
    status: raw.status ?? raw.statusCode ?? raw.status_code ?? raw.expectedStatus ?? raw.expected_status,
    statusCode: raw.statusCode ?? raw.status_code ?? raw.status,
    status_code: raw.status_code ?? raw.statusCode ?? raw.status,
    text: raw.text === undefined ? undefined : String(raw.text),
    value: raw.value,
    path: text(raw.path || raw.jsonPath || raw.json_path) || undefined,
  };
}

function normalizeHttpCheck(raw: any, issues: WorkOrderIssue[], project: string, index: number, forceAdversarial = false): HttpCheckSpec | null {
  if (!raw || typeof raw !== "object") {
    issues.push({ severity: "error", code: "invalid_http_check", message: `HTTP check ${index + 1} must be an object.`, project });
    return null;
  }
  const checkName = text(raw.name || raw.title) || `HTTP check ${index + 1}`;
  const url = text(raw.url || raw.targetUrl || raw.target_url || raw.path);
  if (!url) {
    issues.push({ severity: "error", code: "invalid_http_check_url", message: `HTTP check "${checkName}" must include url/path.`, project });
    return null;
  }
  const assertions = asArray(raw.assertions || raw.expectations)
    .map((assertion, assertionIndex) => normalizeHttpAssertion(assertion, issues, project, checkName, assertionIndex))
    .filter(Boolean) as HttpAssertionSpec[];
  if (!assertions.length && (raw.expectStatus !== undefined || raw.expect_status !== undefined || raw.expectedStatus !== undefined || raw.expected_status !== undefined)) {
    assertions.push({
      type: "status",
      status: raw.expectStatus ?? raw.expect_status ?? raw.expectedStatus ?? raw.expected_status,
    });
  }
  if (!assertions.length && (raw.responseContains !== undefined || raw.response_contains !== undefined)) {
    assertions.push({
      type: "textIncludes",
      text: String(raw.responseContains ?? raw.response_contains),
    });
  }
  return {
    name: checkName,
    url,
    method: text(raw.method || raw.httpMethod || raw.http_method || "GET").toUpperCase(),
    headers: normalizeHeaders(raw.headers),
    body: raw.body === undefined ? undefined : typeof raw.body === "string" ? raw.body : JSON.stringify(raw.body),
    json: raw.json,
    assertions,
    adversarial: forceAdversarial || raw.adversarial === true || raw.probe === true,
    probeType: text(raw.probeType || raw.probe_type || raw.kind || raw.category) || undefined,
    probe_type: text(raw.probe_type || raw.probeType || raw.kind || raw.category) || undefined,
    timeoutMs: optionalNumber(raw.timeoutMs || raw.timeout_ms),
    timeout_ms: optionalNumber(raw.timeout_ms || raw.timeoutMs),
  };
}

function normalizeBrowserCheck(raw: any, issues: WorkOrderIssue[], project: string, index: number, forceAdversarial = false): BrowserCheckSpec | null {
  if (!raw || typeof raw !== "object") {
    issues.push({ severity: "error", code: "invalid_browser_check", message: `Browser check ${index + 1} must be an object.`, project });
    return null;
  }
  const checkName = text(raw.name || raw.title) || `browser check ${index + 1}`;
  const actions = asArray(raw.actions || raw.steps)
    .map((action, actionIndex) => normalizeBrowserAction(action, issues, project, checkName, actionIndex))
    .filter(Boolean) as BrowserActionSpec[];
  const assertions = asArray(raw.assertions || raw.expectations)
    .map((assertion, assertionIndex) => normalizeBrowserAssertion(assertion, issues, project, checkName, assertionIndex))
    .filter(Boolean) as BrowserAssertionSpec[];
  return {
    name: checkName,
    url: text(raw.url || raw.targetUrl || raw.target_url) || undefined,
    actions,
    assertions,
    screenshot: raw.screenshot === undefined ? undefined : raw.screenshot !== false,
    adversarial: forceAdversarial || raw.adversarial === true || raw.probe === true,
    probeType: text(raw.probeType || raw.probe_type || raw.kind || raw.category) || undefined,
    probe_type: text(raw.probe_type || raw.probeType || raw.kind || raw.category) || undefined,
    timeoutMs: optionalNumber(raw.timeoutMs || raw.timeout_ms),
    timeout_ms: optionalNumber(raw.timeout_ms || raw.timeoutMs),
  };
}

function normalizeProject(raw: TestAgentProjectTarget, index: number, globalStartupTimeoutMs: number, issues: WorkOrderIssue[]): NormalizedTestAgentProjectTarget {
  const name = text(raw?.name) || `project-${index + 1}`;
  const workDir = resolveWorkDir(text(raw?.workDir || raw?.work_dir || process.cwd()));
  const runCommand = text(raw?.runCommand || raw?.run_command);
  const devServerCommand = text(raw?.devServerCommand || raw?.dev_server_command || runCommand);
  const targetUrl = text(raw?.targetUrl || raw?.target_url);
  const startupUrl = text(raw?.startupUrl || raw?.startup_url || targetUrl);
  const generatedAdversarialBrowserChecks = buildAdversarialBrowserProbeChecks({
    project: name,
    templates: asArray((raw as any)?.adversarialBrowserProbeTemplates || (raw as any)?.adversarial_browser_probe_templates),
    issues,
  });
  return {
    name,
    workDir,
    runCommand,
    devServerCommand,
    targetUrl,
    startupUrl,
    startupTimeoutMs: Number(raw?.startupTimeoutMs || raw?.startup_timeout_ms || globalStartupTimeoutMs || DEFAULT_OPTIONS.startupTimeoutMs),
    env: stringifyEnv(raw?.env),
    changedFiles: asArray(raw?.changedFiles || raw?.changed_files).map(String).filter(Boolean),
    verificationCommands: asArray(raw?.verificationCommands || raw?.verification_commands).map(String).map(item => item.trim()).filter(Boolean),
    httpChecks: asArray((raw as any)?.httpChecks || (raw as any)?.http_checks || (raw as any)?.apiChecks || (raw as any)?.api_checks)
      .map((check, checkIndex) => normalizeHttpCheck(check, issues, name, checkIndex))
      .filter(Boolean) as HttpCheckSpec[],
    adversarialHttpChecks: asArray((raw as any)?.adversarialHttpChecks || (raw as any)?.adversarial_http_checks || (raw as any)?.adversarialApiChecks || (raw as any)?.adversarial_api_checks)
      .map((check, checkIndex) => normalizeHttpCheck(check, issues, name, checkIndex, true))
      .filter(Boolean) as HttpCheckSpec[],
    adversarialBrowserChecks: asArray((raw as any)?.adversarialBrowserChecks || (raw as any)?.adversarial_browser_checks)
      .concat(generatedAdversarialBrowserChecks)
      .map((check, checkIndex) => normalizeBrowserCheck(check, issues, name, checkIndex, true))
      .filter(Boolean) as BrowserCheckSpec[],
    browserChecks: asArray(raw?.browserChecks || raw?.browser_checks)
      .map((check, checkIndex) => normalizeBrowserCheck(check, issues, name, checkIndex))
      .filter(Boolean) as BrowserCheckSpec[],
    agentSummary: text(raw?.agentSummary || raw?.agent_summary),
    risks: asArray(raw?.risks).map(String).filter(Boolean),
  };
}

export function normalizeTestAgentWorkOrder(input: TestAgentWorkOrder, overrides: Partial<TestAgentOptions> = {}) {
  const issues: WorkOrderIssue[] = [];
  const runId = text(input?.id) || makeRunId("test-agent-work-order");
  const options: Required<TestAgentOptions> = {
    ...DEFAULT_OPTIONS,
    ...(input?.options || {}),
    ...(overrides || {}),
  };
  options.artifactDir = path.resolve(text(options.artifactDir) || defaultArtifactDir(runId));
  options.commandTimeoutMs = Math.max(1_000, Number(options.commandTimeoutMs || DEFAULT_OPTIONS.commandTimeoutMs));
  options.browserTimeoutMs = Math.max(1_000, Number(options.browserTimeoutMs || DEFAULT_OPTIONS.browserTimeoutMs));
  options.httpTimeoutMs = Math.max(1_000, Number(options.httpTimeoutMs || DEFAULT_OPTIONS.httpTimeoutMs));
  options.startupTimeoutMs = Math.max(1_000, Number(options.startupTimeoutMs || DEFAULT_OPTIONS.startupTimeoutMs));
  options.maxOutputChars = Math.max(1_000, Number(options.maxOutputChars || DEFAULT_OPTIONS.maxOutputChars));
  options.maxHttpResourceChecks = Math.max(0, Number(options.maxHttpResourceChecks || DEFAULT_OPTIONS.maxHttpResourceChecks));
  options.failOnConsoleError = options.failOnConsoleError !== false;
  options.failOnHttpResourceError = options.failOnHttpResourceError !== false;
  options.verificationOnly = options.verificationOnly !== false;
  options.autoDiscoverVerificationCommands = options.autoDiscoverVerificationCommands !== false;
  options.collectBrowserArtifacts = options.collectBrowserArtifacts !== false;
  options.collectBrowserVideo = options.collectBrowserVideo === true;
  if (!["auto", "playwright", "mcp", "none"].includes(String(options.browserProvider || ""))) options.browserProvider = "auto";

  const projects = asArray(input?.projects).map((item, index) => normalizeProject(item, index, options.startupTimeoutMs, issues));
  if (!projects.length) {
    issues.push({ severity: "error", code: "missing_projects", message: "TestAgent work order must include at least one project target." });
  }
  for (const project of projects) {
    if (!project.workDir) issues.push({ severity: "error", code: "missing_work_dir", message: "Project workDir is required.", project: project.name });
    if (!project.verificationCommands.length && !project.targetUrl && !project.httpChecks.length && !project.adversarialHttpChecks.length && !project.browserChecks.length && !project.adversarialBrowserChecks.length) {
      issues.push({ severity: "warning", code: "no_executable_checks", message: "Project has no verification commands or browser target URL.", project: project.name });
    }
  }

  const requiredChecks = asArray(input?.requiredChecks || input?.required_checks).map(String).filter(Boolean);
  const workOrder: NormalizedTestAgentWorkOrder = {
    schema: "ccm-test-agent-work-order-v1",
    id: runId,
    taskId: text(input?.taskId || input?.task_id),
    groupId: text(input?.groupId || input?.group_id),
    issuedBy: text(input?.issuedBy || input?.issued_by || "group-main-agent"),
    originalUserGoal: text(input?.originalUserGoal || input?.original_user_goal),
    acceptanceCriteria: asArray(input?.acceptanceCriteria || input?.acceptance_criteria).map(String).filter(Boolean),
    requiredChecks,
    projects,
    options,
    metadata: input?.metadata || {},
  };

  if (!workOrder.acceptanceCriteria.length) {
    issues.push({ severity: "warning", code: "missing_acceptance_criteria", message: "No acceptance criteria were provided; report coverage will be weaker." });
  }

  return { workOrder, issues };
}
