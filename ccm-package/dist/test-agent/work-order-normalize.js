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
// Behavior-freeze split from work-order.ts (part 3/3).
const path = __importStar(require("path"));
const browser_probe_templates_1 = require("./browser-probe-templates");
const utils_1 = require("./utils");
const work_order_aliases_1 = require("./work-order-aliases");
const work_order_normalize_checks_1 = require("./work-order-normalize-checks");
function normalizeProject(raw, index, globalStartupTimeoutMs, issues) {
    const name = (0, work_order_aliases_1.text)(raw?.name) || `project-${index + 1}`;
    const workDir = (0, utils_1.resolveWorkDir)((0, work_order_aliases_1.text)(raw?.workDir || raw?.work_dir || process.cwd()));
    const runCommand = (0, work_order_aliases_1.text)(raw?.runCommand || raw?.run_command);
    const devServerCommand = (0, work_order_aliases_1.text)(raw?.devServerCommand || raw?.dev_server_command || runCommand);
    const targetUrl = (0, work_order_aliases_1.text)(raw?.targetUrl || raw?.target_url);
    const startupUrl = (0, work_order_aliases_1.text)(raw?.startupUrl || raw?.startup_url || targetUrl);
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
        startupTimeoutMs: Number(raw?.startupTimeoutMs || raw?.startup_timeout_ms || globalStartupTimeoutMs || work_order_aliases_1.DEFAULT_OPTIONS.startupTimeoutMs),
        env: (0, utils_1.stringifyEnv)(raw?.env),
        changedFiles: (0, utils_1.asArray)(raw?.changedFiles || raw?.changed_files).map(String).filter(Boolean),
        verificationCommands: (0, utils_1.asArray)(raw?.verificationCommands || raw?.verification_commands).map(String).map(item => item.trim()).filter(Boolean),
        httpChecks: (0, utils_1.asArray)(raw?.httpChecks || raw?.http_checks || raw?.apiChecks || raw?.api_checks)
            .map((check, checkIndex) => (0, work_order_normalize_checks_1.normalizeHttpCheck)(check, issues, name, checkIndex))
            .filter(Boolean),
        adversarialHttpChecks: (0, utils_1.asArray)(raw?.adversarialHttpChecks || raw?.adversarial_http_checks || raw?.adversarialApiChecks || raw?.adversarial_api_checks)
            .map((check, checkIndex) => (0, work_order_normalize_checks_1.normalizeHttpCheck)(check, issues, name, checkIndex, true))
            .filter(Boolean),
        adversarialBrowserChecks: (0, utils_1.asArray)(raw?.adversarialBrowserChecks || raw?.adversarial_browser_checks)
            .concat(generatedAdversarialBrowserChecks)
            .map((check, checkIndex) => (0, work_order_normalize_checks_1.normalizeBrowserCheck)(check, issues, name, checkIndex, true))
            .filter(Boolean),
        browserChecks: (0, utils_1.asArray)(raw?.browserChecks || raw?.browser_checks)
            .map((check, checkIndex) => (0, work_order_normalize_checks_1.normalizeBrowserCheck)(check, issues, name, checkIndex))
            .filter(Boolean),
        agentSummary: (0, work_order_aliases_1.text)(raw?.agentSummary || raw?.agent_summary),
        risks: (0, utils_1.asArray)(raw?.risks).map(String).filter(Boolean),
    };
}
function normalizeTestAgentWorkOrder(input, overrides = {}) {
    const issues = [];
    const runId = (0, work_order_aliases_1.text)(input?.id) || (0, utils_1.makeRunId)("test-agent-work-order");
    const inputOptions = (input?.options || {});
    const overrideOptions = (overrides || {});
    const requireAdversarialProbe = Object.prototype.hasOwnProperty.call(overrideOptions, "requireAdversarialProbe")
        ? overrideOptions.requireAdversarialProbe
        : Object.prototype.hasOwnProperty.call(overrideOptions, "require_adversarial_probe")
            ? overrideOptions.require_adversarial_probe
            : Object.prototype.hasOwnProperty.call(inputOptions, "requireAdversarialProbe")
                ? inputOptions.requireAdversarialProbe
                : Object.prototype.hasOwnProperty.call(inputOptions, "require_adversarial_probe")
                    ? inputOptions.require_adversarial_probe
                    : work_order_aliases_1.DEFAULT_OPTIONS.requireAdversarialProbe;
    const adversarialProbeWaiver = (0, work_order_aliases_1.text)(overrideOptions.adversarialProbeWaiver
        || overrideOptions.adversarial_probe_waiver
        || inputOptions.adversarialProbeWaiver
        || inputOptions.adversarial_probe_waiver);
    const options = {
        ...work_order_aliases_1.DEFAULT_OPTIONS,
        ...inputOptions,
        ...(overrides || {}),
        requireAdversarialProbe: requireAdversarialProbe !== false,
        adversarialProbeWaiver,
    };
    options.artifactDir = path.resolve((0, work_order_aliases_1.text)(options.artifactDir) || (0, utils_1.defaultArtifactDir)(runId));
    options.commandTimeoutMs = Math.max(1_000, Number(options.commandTimeoutMs || work_order_aliases_1.DEFAULT_OPTIONS.commandTimeoutMs));
    options.browserTimeoutMs = Math.max(1_000, Number(options.browserTimeoutMs || work_order_aliases_1.DEFAULT_OPTIONS.browserTimeoutMs));
    options.httpTimeoutMs = Math.max(1_000, Number(options.httpTimeoutMs || work_order_aliases_1.DEFAULT_OPTIONS.httpTimeoutMs));
    options.startupTimeoutMs = Math.max(1_000, Number(options.startupTimeoutMs || work_order_aliases_1.DEFAULT_OPTIONS.startupTimeoutMs));
    options.maxOutputChars = Math.max(1_000, Number(options.maxOutputChars || work_order_aliases_1.DEFAULT_OPTIONS.maxOutputChars));
    options.maxHttpResourceChecks = Math.max(0, Number(options.maxHttpResourceChecks ?? work_order_aliases_1.DEFAULT_OPTIONS.maxHttpResourceChecks));
    options.failOnConsoleError = options.failOnConsoleError !== false;
    options.failOnHttpResourceError = options.failOnHttpResourceError !== false;
    options.verificationOnly = options.verificationOnly !== false;
    options.autoDiscoverVerificationCommands = options.autoDiscoverVerificationCommands !== false;
    options.collectBrowserArtifacts = options.collectBrowserArtifacts !== false;
    options.collectBrowserVideo = options.collectBrowserVideo === true;
    options.requireAdversarialProbe = options.requireAdversarialProbe !== false;
    options.adversarialProbeWaiver = (0, work_order_aliases_1.text)(options.adversarialProbeWaiver);
    options.agenticPlanning = options.agenticPlanning === true;
    if (!["auto", "playwright", "mcp", "none"].includes(String(options.browserProvider || "")))
        options.browserProvider = "auto";
    if (!options.requireAdversarialProbe && !options.adversarialProbeWaiver) {
        issues.push({
            severity: "error",
            code: "missing_adversarial_probe_waiver",
            message: "Disabling the adversarial probe gate requires a non-empty adversarialProbeWaiver reason.",
        });
        options.requireAdversarialProbe = true;
    }
    else if (options.requireAdversarialProbe && options.adversarialProbeWaiver) {
        issues.push({
            severity: "warning",
            code: "unused_adversarial_probe_waiver",
            message: "adversarialProbeWaiver is ignored while requireAdversarialProbe is enabled.",
        });
        options.adversarialProbeWaiver = "";
    }
    const projects = (0, utils_1.asArray)(input?.projects).map((item, index) => normalizeProject(item, index, options.startupTimeoutMs, issues));
    const productionMutationAuthorized = input?.metadata?.allowProductionMutation === true
        && !!String(input?.metadata?.productionMutationAuthorizedByUser || "").trim();
    if (!projects.length) {
        issues.push({ severity: "error", code: "missing_projects", message: "TestAgent work order must include at least one project target." });
    }
    for (const project of projects) {
        if (!project.workDir)
            issues.push({ severity: "error", code: "missing_work_dir", message: "Project workDir is required.", project: project.name });
        const workDirSafety = (0, utils_1.validateTestAgentWorkDir)(project.workDir);
        if (!workDirSafety.valid)
            issues.push({ severity: "error", code: "unsafe_work_dir", message: `Project workDir is not allowed: ${workDirSafety.error}.`, project: project.name });
        for (const [label, candidate] of [["targetUrl", project.targetUrl], ["startupUrl", project.startupUrl]]) {
            const safety = (0, utils_1.validateTestAgentUrl)(candidate);
            if (!safety.valid)
                issues.push({ severity: "error", code: "unsafe_target_url", message: `${label} is not allowed: ${safety.error}.`, project: project.name });
        }
        for (const check of [...project.httpChecks, ...project.adversarialHttpChecks]) {
            const resolvedUrl = (0, utils_1.resolveUrl)(project.targetUrl || project.startupUrl, check.url);
            const safety = (0, utils_1.validateTestAgentUrl)(resolvedUrl);
            if (!safety.valid)
                issues.push({ severity: "error", code: "unsafe_http_check_url", message: `HTTP check URL is not allowed: ${safety.error}.`, project: project.name });
            const method = String(check.method || "GET").toUpperCase();
            if ((0, utils_1.isLikelyProductionTestAgentUrl)(resolvedUrl) && !["GET", "HEAD", "OPTIONS"].includes(method) && !productionMutationAuthorized) {
                issues.push({ severity: "error", code: "production_http_mutation_requires_authorization", message: `HTTP ${method} against a production-like URL requires explicit user authorization metadata.`, project: project.name });
            }
        }
        for (const check of [...project.browserChecks, ...project.adversarialBrowserChecks]) {
            const resolvedUrl = (0, utils_1.resolveUrl)(project.targetUrl || project.startupUrl, check.url || "");
            const safety = (0, utils_1.validateTestAgentUrl)(resolvedUrl);
            if (!safety.valid)
                issues.push({ severity: "error", code: "unsafe_browser_check_url", message: `Browser check URL is not allowed: ${safety.error}.`, project: project.name });
            const mutatingAction = (check.actions || []).some(action => /^(?:click|dblclick|fill|type|press|check|uncheck|selectOption|setInputFiles|upload|dragTo|clipboardWrite|storageSet|storageClear|cookieSet|cookieClear|networkOffline|networkOnline)$/i.test(String(action?.type || "")));
            if ((0, utils_1.isLikelyProductionTestAgentUrl)(resolvedUrl) && mutatingAction && !productionMutationAuthorized) {
                issues.push({ severity: "error", code: "production_browser_mutation_requires_authorization", message: "Mutating browser actions against a production-like URL require explicit user authorization metadata.", project: project.name });
            }
        }
        if (!project.verificationCommands.length && !project.targetUrl && !project.httpChecks.length && !project.adversarialHttpChecks.length && !project.browserChecks.length && !project.adversarialBrowserChecks.length) {
            issues.push({ severity: "warning", code: "no_executable_checks", message: "Project has no verification commands or browser target URL.", project: project.name });
        }
    }
    const requiredChecks = (0, utils_1.asArray)(input?.requiredChecks || input?.required_checks).map(String).filter(Boolean);
    const hasAdversarialRequiredCheck = requiredChecks.some(check => /adversarial|boundary|orphan|idempot|concurr|race/i.test(String(check || "").replace(/[\s:-]+/g, "_")));
    if (options.requireAdversarialProbe && !hasAdversarialRequiredCheck)
        requiredChecks.push("adversarial");
    const workOrder = {
        schema: "ccm-test-agent-work-order-v1",
        id: runId,
        taskId: (0, work_order_aliases_1.text)(input?.taskId || input?.task_id),
        groupId: (0, work_order_aliases_1.text)(input?.groupId || input?.group_id),
        issuedBy: (0, work_order_aliases_1.text)(input?.issuedBy || input?.issued_by || "group-main-agent"),
        originalUserGoal: (0, work_order_aliases_1.text)(input?.originalUserGoal || input?.original_user_goal),
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
//# sourceMappingURL=work-order-normalize.js.map