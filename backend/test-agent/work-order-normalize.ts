// Behavior-freeze split from work-order.ts (part 3/3).
import * as path from "path";
import { buildAdversarialBrowserProbeChecks } from "./browser-probe-templates";
import {
  browserActionValueEnvName,
  browserActionSupportsEnvironmentValue,
  isValidBrowserEnvironmentName,
} from "./browser/authentication";
import { normalizeBrowserAuthenticationConfig } from "./browser/existing-session";
import { hasMultiSessionBrowserScenario, validateMultiSessionBrowserScenario } from "./browser/multi-session";
import { MAX_BROWSER_STABILITY_RUNS } from "./browser/stability-summary";
import { BROWSER_ACTION_EFFECT_SIGNALS } from "./browser/action-effects";
import {
  BrowserActionSpec,
  BrowserAssertionSpec,
  BrowserCheckSpec,
  BrowserSessionComparisonStepSpec,
  BrowserSessionLeafStepSpec,
  BrowserSessionSpec,
  BrowserSessionStepSpec,
  HttpAssertionSpec,
  HttpCheckSpec,
  HttpConcurrencyAssertionSpec,
  HttpConcurrencySpec,
  NormalizedTestAgentProjectTarget,
  NormalizedTestAgentWorkOrder,
  TestAgentOptions,
  TestAgentProjectTarget,
  TestAgentWorkOrder,
  WorkOrderIssue,
} from "./types";
import {
  MAX_HTTP_CONCURRENT_REQUESTS,
  MIN_HTTP_CONCURRENT_REQUESTS,
} from "./http-concurrency";
import { asArray, defaultArtifactDir, isLikelyProductionTestAgentUrl, makeRunId, resolveUrl, resolveWorkDir, stringifyEnv, validateTestAgentUrl, validateTestAgentWorkDir } from "./utils";

import {
  DEFAULT_OPTIONS,
  text,
} from "./work-order-aliases";

import {
  normalizeBrowserCheck,
  normalizeHttpCheck,
} from "./work-order-normalize-checks";

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
  const inputOptions = (input?.options || {}) as Record<string, any>;
  const overrideOptions = (overrides || {}) as Record<string, any>;
  const requireAdversarialProbe = Object.prototype.hasOwnProperty.call(overrideOptions, "requireAdversarialProbe")
    ? overrideOptions.requireAdversarialProbe
    : Object.prototype.hasOwnProperty.call(overrideOptions, "require_adversarial_probe")
      ? overrideOptions.require_adversarial_probe
      : Object.prototype.hasOwnProperty.call(inputOptions, "requireAdversarialProbe")
        ? inputOptions.requireAdversarialProbe
        : Object.prototype.hasOwnProperty.call(inputOptions, "require_adversarial_probe")
          ? inputOptions.require_adversarial_probe
          : DEFAULT_OPTIONS.requireAdversarialProbe;
  const adversarialProbeWaiver = text(
    overrideOptions.adversarialProbeWaiver
    || overrideOptions.adversarial_probe_waiver
    || inputOptions.adversarialProbeWaiver
    || inputOptions.adversarial_probe_waiver,
  );
  const options: Required<TestAgentOptions> = {
    ...DEFAULT_OPTIONS,
    ...inputOptions,
    ...(overrides || {}),
    requireAdversarialProbe: requireAdversarialProbe !== false,
    adversarialProbeWaiver,
  };
  options.artifactDir = path.resolve(text(options.artifactDir) || defaultArtifactDir(runId));
  options.commandTimeoutMs = Math.max(1_000, Number(options.commandTimeoutMs || DEFAULT_OPTIONS.commandTimeoutMs));
  options.browserTimeoutMs = Math.max(1_000, Number(options.browserTimeoutMs || DEFAULT_OPTIONS.browserTimeoutMs));
  options.httpTimeoutMs = Math.max(1_000, Number(options.httpTimeoutMs || DEFAULT_OPTIONS.httpTimeoutMs));
  options.startupTimeoutMs = Math.max(1_000, Number(options.startupTimeoutMs || DEFAULT_OPTIONS.startupTimeoutMs));
  options.maxOutputChars = Math.max(1_000, Number(options.maxOutputChars || DEFAULT_OPTIONS.maxOutputChars));
  options.maxHttpResourceChecks = Math.max(0, Number(options.maxHttpResourceChecks ?? DEFAULT_OPTIONS.maxHttpResourceChecks));
  options.failOnConsoleError = options.failOnConsoleError !== false;
  options.failOnHttpResourceError = options.failOnHttpResourceError !== false;
  options.verificationOnly = options.verificationOnly !== false;
  options.autoDiscoverVerificationCommands = options.autoDiscoverVerificationCommands !== false;
  options.collectBrowserArtifacts = options.collectBrowserArtifacts !== false;
  options.collectBrowserVideo = options.collectBrowserVideo === true;
  options.requireAdversarialProbe = options.requireAdversarialProbe !== false;
  options.adversarialProbeWaiver = text(options.adversarialProbeWaiver);
  if (!["auto", "playwright", "mcp", "none"].includes(String(options.browserProvider || ""))) options.browserProvider = "auto";
  if (!options.requireAdversarialProbe && !options.adversarialProbeWaiver) {
    issues.push({
      severity: "error",
      code: "missing_adversarial_probe_waiver",
      message: "Disabling the adversarial probe gate requires a non-empty adversarialProbeWaiver reason.",
    });
    options.requireAdversarialProbe = true;
  } else if (options.requireAdversarialProbe && options.adversarialProbeWaiver) {
    issues.push({
      severity: "warning",
      code: "unused_adversarial_probe_waiver",
      message: "adversarialProbeWaiver is ignored while requireAdversarialProbe is enabled.",
    });
    options.adversarialProbeWaiver = "";
  }

  const projects = asArray(input?.projects).map((item, index) => normalizeProject(item, index, options.startupTimeoutMs, issues));
  const productionMutationAuthorized = input?.metadata?.allowProductionMutation === true
    && !!String(input?.metadata?.productionMutationAuthorizedByUser || "").trim();
  if (!projects.length) {
    issues.push({ severity: "error", code: "missing_projects", message: "TestAgent work order must include at least one project target." });
  }
  for (const project of projects) {
    if (!project.workDir) issues.push({ severity: "error", code: "missing_work_dir", message: "Project workDir is required.", project: project.name });
    const workDirSafety = validateTestAgentWorkDir(project.workDir);
    if (!workDirSafety.valid) issues.push({ severity: "error", code: "unsafe_work_dir", message: `Project workDir is not allowed: ${workDirSafety.error}.`, project: project.name });
    for (const [label, candidate] of [["targetUrl", project.targetUrl], ["startupUrl", project.startupUrl]] as const) {
      const safety = validateTestAgentUrl(candidate);
      if (!safety.valid) issues.push({ severity: "error", code: "unsafe_target_url", message: `${label} is not allowed: ${safety.error}.`, project: project.name });
    }
    for (const check of [...project.httpChecks, ...project.adversarialHttpChecks]) {
      const resolvedUrl = resolveUrl(project.targetUrl || project.startupUrl, check.url);
      const safety = validateTestAgentUrl(resolvedUrl);
      if (!safety.valid) issues.push({ severity: "error", code: "unsafe_http_check_url", message: `HTTP check URL is not allowed: ${safety.error}.`, project: project.name });
      const method = String(check.method || "GET").toUpperCase();
      if (isLikelyProductionTestAgentUrl(resolvedUrl) && !["GET", "HEAD", "OPTIONS"].includes(method) && !productionMutationAuthorized) {
        issues.push({ severity: "error", code: "production_http_mutation_requires_authorization", message: `HTTP ${method} against a production-like URL requires explicit user authorization metadata.`, project: project.name });
      }
    }
    for (const check of [...project.browserChecks, ...project.adversarialBrowserChecks]) {
      const resolvedUrl = resolveUrl(project.targetUrl || project.startupUrl, check.url || "");
      const safety = validateTestAgentUrl(resolvedUrl);
      if (!safety.valid) issues.push({ severity: "error", code: "unsafe_browser_check_url", message: `Browser check URL is not allowed: ${safety.error}.`, project: project.name });
      const mutatingAction = (check.actions || []).some(action => /^(?:click|dblclick|fill|type|press|check|uncheck|selectOption|setInputFiles|upload|dragTo|clipboardWrite|storageSet|storageClear|cookieSet|cookieClear|networkOffline|networkOnline)$/i.test(String(action?.type || "")));
      if (isLikelyProductionTestAgentUrl(resolvedUrl) && mutatingAction && !productionMutationAuthorized) {
        issues.push({ severity: "error", code: "production_browser_mutation_requires_authorization", message: "Mutating browser actions against a production-like URL require explicit user authorization metadata.", project: project.name });
      }
    }
    if (!project.verificationCommands.length && !project.targetUrl && !project.httpChecks.length && !project.adversarialHttpChecks.length && !project.browserChecks.length && !project.adversarialBrowserChecks.length) {
      issues.push({ severity: "warning", code: "no_executable_checks", message: "Project has no verification commands or browser target URL.", project: project.name });
    }
  }

  const requiredChecks = asArray(input?.requiredChecks || input?.required_checks).map(String).filter(Boolean);
  const hasAdversarialRequiredCheck = requiredChecks.some(check =>
    /adversarial|boundary|orphan|idempot|concurr|race/i.test(String(check || "").replace(/[\s:-]+/g, "_"))
  );
  if (options.requireAdversarialProbe && !hasAdversarialRequiredCheck) requiredChecks.push("adversarial");
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
