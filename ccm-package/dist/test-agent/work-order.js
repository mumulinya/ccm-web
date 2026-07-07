"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeTestAgentWorkOrder = normalizeTestAgentWorkOrder;
const path = __importStar(require("path"));
const browser_probe_templates_1 = require("./browser-probe-templates");
const utils_1 = require("./utils");
const DEFAULT_OPTIONS = {
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
function text(value) {
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
const BROWSER_ACTION_ALIASES = {
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
const BROWSER_ASSERTION_ALIASES = {
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
const HTTP_ASSERTION_ALIASES = {
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
function normalizedType(rawType, aliases) {
    const raw = text(rawType);
    return aliases[raw] || raw;
}
function optionalNumber(value) {
    if (value === undefined || value === null || value === "")
        return undefined;
    const number = Number(value);
    return Number.isFinite(number) ? number : undefined;
}
function coordinate(value) {
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
function normalizeBrowserApps(value) {
    return (0, utils_1.asArray)(value).map(app => ({
        displayName: text(app?.displayName || app?.display_name || app?.name) || undefined,
        bundleId: text(app?.bundleId || app?.bundle_id) || undefined,
        bundle_id: text(app?.bundle_id || app?.bundleId) || undefined,
    })).filter(app => app.displayName || app.bundleId || app.bundle_id);
}
function normalizeBrowserAction(raw, issues, project, checkName, index) {
    if (!raw || typeof raw !== "object") {
        issues.push({ severity: "error", code: "invalid_browser_action", message: `Browser action ${index + 1} in "${checkName}" must be an object.`, project });
        return null;
    }
    const type = normalizedType(raw.type || raw.action || raw.kind, BROWSER_ACTION_ALIASES);
    if (!BROWSER_ACTION_TYPES.has(type)) {
        issues.push({ severity: "error", code: "invalid_browser_action_type", message: `Browser action ${index + 1} in "${checkName}" has unsupported type "${type || "(missing)"}".`, project });
        return null;
    }
    const normalized = {
        ...raw,
        type: type,
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
function normalizeBrowserAssertion(raw, issues, project, checkName, index) {
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
        type: type,
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
function normalizeHeaders(raw) {
    const out = {};
    if (!raw || typeof raw !== "object" || Array.isArray(raw))
        return out;
    for (const [key, value] of Object.entries(raw)) {
        if (value !== undefined && value !== null)
            out[key] = String(value);
    }
    return out;
}
function normalizeHttpAssertion(raw, issues, project, checkName, index) {
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
        type: type,
        status: raw.status ?? raw.statusCode ?? raw.status_code ?? raw.expectedStatus ?? raw.expected_status,
        statusCode: raw.statusCode ?? raw.status_code ?? raw.status,
        status_code: raw.status_code ?? raw.statusCode ?? raw.status,
        text: raw.text === undefined ? undefined : String(raw.text),
        value: raw.value,
        path: text(raw.path || raw.jsonPath || raw.json_path) || undefined,
    };
}
function normalizeHttpCheck(raw, issues, project, index, forceAdversarial = false) {
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
    const assertions = (0, utils_1.asArray)(raw.assertions || raw.expectations)
        .map((assertion, assertionIndex) => normalizeHttpAssertion(assertion, issues, project, checkName, assertionIndex))
        .filter(Boolean);
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
function normalizeBrowserCheck(raw, issues, project, index, forceAdversarial = false) {
    if (!raw || typeof raw !== "object") {
        issues.push({ severity: "error", code: "invalid_browser_check", message: `Browser check ${index + 1} must be an object.`, project });
        return null;
    }
    const checkName = text(raw.name || raw.title) || `browser check ${index + 1}`;
    const actions = (0, utils_1.asArray)(raw.actions || raw.steps)
        .map((action, actionIndex) => normalizeBrowserAction(action, issues, project, checkName, actionIndex))
        .filter(Boolean);
    const assertions = (0, utils_1.asArray)(raw.assertions || raw.expectations)
        .map((assertion, assertionIndex) => normalizeBrowserAssertion(assertion, issues, project, checkName, assertionIndex))
        .filter(Boolean);
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
function normalizeProject(raw, index, globalStartupTimeoutMs, issues) {
    const name = text(raw?.name) || `project-${index + 1}`;
    const workDir = (0, utils_1.resolveWorkDir)(text(raw?.workDir || raw?.work_dir || process.cwd()));
    const runCommand = text(raw?.runCommand || raw?.run_command);
    const devServerCommand = text(raw?.devServerCommand || raw?.dev_server_command || runCommand);
    const targetUrl = text(raw?.targetUrl || raw?.target_url);
    const startupUrl = text(raw?.startupUrl || raw?.startup_url || targetUrl);
    const generatedAdversarialBrowserChecks = (0, browser_probe_templates_1.buildAdversarialBrowserProbeChecks)({
        project: name,
        templates: (0, utils_1.asArray)(raw?.adversarialBrowserProbeTemplates || raw?.adversarial_browser_probe_templates),
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
        env: (0, utils_1.stringifyEnv)(raw?.env),
        changedFiles: (0, utils_1.asArray)(raw?.changedFiles || raw?.changed_files).map(String).filter(Boolean),
        verificationCommands: (0, utils_1.asArray)(raw?.verificationCommands || raw?.verification_commands).map(String).map(item => item.trim()).filter(Boolean),
        httpChecks: (0, utils_1.asArray)(raw?.httpChecks || raw?.http_checks || raw?.apiChecks || raw?.api_checks)
            .map((check, checkIndex) => normalizeHttpCheck(check, issues, name, checkIndex))
            .filter(Boolean),
        adversarialHttpChecks: (0, utils_1.asArray)(raw?.adversarialHttpChecks || raw?.adversarial_http_checks || raw?.adversarialApiChecks || raw?.adversarial_api_checks)
            .map((check, checkIndex) => normalizeHttpCheck(check, issues, name, checkIndex, true))
            .filter(Boolean),
        adversarialBrowserChecks: (0, utils_1.asArray)(raw?.adversarialBrowserChecks || raw?.adversarial_browser_checks)
            .concat(generatedAdversarialBrowserChecks)
            .map((check, checkIndex) => normalizeBrowserCheck(check, issues, name, checkIndex, true))
            .filter(Boolean),
        browserChecks: (0, utils_1.asArray)(raw?.browserChecks || raw?.browser_checks)
            .map((check, checkIndex) => normalizeBrowserCheck(check, issues, name, checkIndex))
            .filter(Boolean),
        agentSummary: text(raw?.agentSummary || raw?.agent_summary),
        risks: (0, utils_1.asArray)(raw?.risks).map(String).filter(Boolean),
    };
}
function normalizeTestAgentWorkOrder(input, overrides = {}) {
    const issues = [];
    const runId = text(input?.id) || (0, utils_1.makeRunId)("test-agent-work-order");
    const options = {
        ...DEFAULT_OPTIONS,
        ...(input?.options || {}),
        ...(overrides || {}),
    };
    options.artifactDir = path.resolve(text(options.artifactDir) || (0, utils_1.defaultArtifactDir)(runId));
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
    if (!["auto", "playwright", "mcp", "none"].includes(String(options.browserProvider || "")))
        options.browserProvider = "auto";
    const projects = (0, utils_1.asArray)(input?.projects).map((item, index) => normalizeProject(item, index, options.startupTimeoutMs, issues));
    if (!projects.length) {
        issues.push({ severity: "error", code: "missing_projects", message: "TestAgent work order must include at least one project target." });
    }
    for (const project of projects) {
        if (!project.workDir)
            issues.push({ severity: "error", code: "missing_work_dir", message: "Project workDir is required.", project: project.name });
        if (!project.verificationCommands.length && !project.targetUrl && !project.httpChecks.length && !project.adversarialHttpChecks.length && !project.browserChecks.length && !project.adversarialBrowserChecks.length) {
            issues.push({ severity: "warning", code: "no_executable_checks", message: "Project has no verification commands or browser target URL.", project: project.name });
        }
    }
    const requiredChecks = (0, utils_1.asArray)(input?.requiredChecks || input?.required_checks).map(String).filter(Boolean);
    const workOrder = {
        schema: "ccm-test-agent-work-order-v1",
        id: runId,
        taskId: text(input?.taskId || input?.task_id),
        groupId: text(input?.groupId || input?.group_id),
        issuedBy: text(input?.issuedBy || input?.issued_by || "group-main-agent"),
        originalUserGoal: text(input?.originalUserGoal || input?.original_user_goal),
        acceptanceCriteria: (0, utils_1.asArray)(input?.acceptanceCriteria || input?.acceptance_criteria).map(String).filter(Boolean),
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
//# sourceMappingURL=work-order.js.map