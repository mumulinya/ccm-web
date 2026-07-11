import * as fs from "fs";
import * as path from "path";
import {
  BrowserActionSpec,
  BrowserAuthenticationEvidence,
  BrowserCheckResult,
  BrowserCheckSpec,
  BrowserStepResult,
  NormalizedTestAgentProjectTarget,
} from "../types";
import { compactText, ensureDir, nowIso, resolveUrl, safeSegment } from "../utils";
import { createMcpBrowserAdapter } from "./mcp-adapters";
import { writeBrowserEvidenceArtifacts } from "./evidence-artifacts";
import { captureMcpFailureScreenshot } from "./mcp-failure-screenshots";
import { BrowserProvider, BrowserProviderContext, blockedBrowserResult } from "./provider-types";
import { writeMcpScreenshotArtifacts } from "./screenshot-artifacts";
import { checksForProject } from "./shared";
import { browserSessionScenarioMetadata, hasMultiSessionBrowserScenario, MULTI_SESSION_BROWSER_PROBE_TYPE } from "./multi-session";
import { browserCheckStabilityRuns } from "./stability-summary";
import { browserCheckRequiresManagedAuthentication } from "./authentication";
import {
  browserExistingSessionConfig,
  buildExistingSessionAuthenticationEvidence,
} from "./existing-session";
import {
  BrowserActionEffectObservation,
  browserActionEffectRequired,
  suppressBrowserActionEffectDetails,
  verifyBrowserActionEffect,
} from "./action-effects";
import { withBrowserCheckExecutionIdentity } from "./check-execution-coverage";

async function listTools(context: BrowserProviderContext) {
  const listed = await context.runtime.browserToolExecutor?.listTools?.();
  return Array.isArray(listed) ? listed.map(String) : [];
}

async function callTool(context: BrowserProviderContext, tool: string, input: Record<string, any>) {
  return context.runtime.browserToolExecutor!.callTool(tool, input);
}

function browserTools(tools: string[]) {
  return tools.filter(tool => /mcp__(playwright|claude-in-chrome|chrome|chrome-devtools|chromedevtools|computer-use)__/.test(tool));
}

function authenticatedSessionSafeUrl(value: string) {
  try {
    const url = new URL(String(value || ""));
    return `${url.origin}${url.pathname}`;
  } catch {
    return String(value || "").split(/[?#]/)[0];
  }
}

function minimalAuthenticatedSessionSteps(steps: BrowserStepResult[]) {
  return steps.map(step => ({
    ...step,
    detail: step.status === "passed" ? "authenticated browser step executed; raw detail suppressed" : undefined,
    ...(step.error ? { error: "Authenticated browser step failed; raw provider detail suppressed." } : {}),
  }));
}

function minimalExistingSessionBlockedError(error: any) {
  const message = String(error?.message || error || "");
  if (/tabs_context_mcp/i.test(message)) {
    return "Existing authenticated Chrome verification is blocked because tabs_context_mcp is unavailable.";
  }
  if (/tabs_create_mcp/i.test(message)) {
    return "Existing authenticated Chrome verification is blocked because tabs_create_mcp is unavailable.";
  }
  if (/\blist_pages\b/i.test(message)) {
    return "Existing authenticated Chrome verification is blocked because list_pages is unavailable.";
  }
  if (/\bnew_page\b/i.test(message)) {
    return "Existing authenticated Chrome verification is blocked because new_page is unavailable.";
  }
  return "Existing authenticated browser verification was blocked; raw provider detail suppressed.";
}

function writeMcpPageSnapshot(artifactDir: string, projectName: string, checkName: string, index: number, pageText: string) {
  const text = String(pageText || "").trim();
  if (!text) return [];
  const snapshotDir = ensureDir(path.join(artifactDir, "page-snapshots"));
  const snapshotPath = path.join(snapshotDir, `${safeSegment(projectName)}-${safeSegment(checkName)}-${index + 1}.txt`);
  fs.writeFileSync(snapshotPath, `${text}\n`, "utf-8");
  return [snapshotPath];
}

function writeMcpTelemetryLogs(input: {
  artifactDir: string;
  projectName: string;
  checkName: string;
  index: number;
  consoleMessages: string[];
  networkRequests: string[];
}) {
  const telemetryDir = ensureDir(path.join(input.artifactDir, "browser-telemetry"));
  const base = `${safeSegment(input.projectName)}-${safeSegment(input.checkName)}-${input.index + 1}`;
  const consoleLogPath = path.join(telemetryDir, `${base}.console.log`);
  const networkLogPath = path.join(telemetryDir, `${base}.network.log`);
  fs.writeFileSync(consoleLogPath, `${input.consoleMessages.length ? input.consoleMessages.join("\n") : "(none observed or provider returned no entries)"}\n`, "utf-8");
  fs.writeFileSync(networkLogPath, `${input.networkRequests.length ? input.networkRequests.join("\n") : "(none observed or provider returned no entries)"}\n`, "utf-8");
  return { consoleLogPath, networkLogPath };
}

async function runMcpCheck(context: BrowserProviderContext, tools: string[], project: NormalizedTestAgentProjectTarget, check: BrowserCheckSpec, index: number): Promise<BrowserCheckResult> {
  const startedAt = nowIso();
  const started = Date.now();
  const steps: BrowserStepResult[] = [];
  const name = check.name || `MCP browser check ${index + 1}`;
  const url = resolveUrl(project.targetUrl, check.url || project.targetUrl);
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const networkErrors: string[] = [];
  const screenshots: string[] = [];
  const browserArtifacts: BrowserCheckResult["browserArtifacts"] = [];
  const actionEffects: NonNullable<BrowserCheckResult["actionEffects"]> = [];
  const pageSnapshots: string[] = [];
  const consoleMessages: string[] = [];
  const networkRequests: string[] = [];
  const existingSessionConfig = browserExistingSessionConfig(check);
  const minimalExistingSessionEvidence = existingSessionConfig?.evidencePolicy === "minimal";
  const adapter = createMcpBrowserAdapter(
    tools,
    (toolName, input) => callTool(context, toolName, input),
    existingSessionConfig
      ? { existingSession: true, preferredAdapter: existingSessionConfig.provider }
      : {},
  );
  const screenshotConfigured = check.screenshot !== false;
  const normalScreenshotRequested = screenshotConfigured && !minimalExistingSessionEvidence;
  const existingSessionAuthentication = (): BrowserAuthenticationEvidence | undefined => {
    if (!existingSessionConfig || !adapter || (adapter.id !== "claude-in-chrome" && adapter.id !== "chrome-devtools")) return undefined;
    const contextEvidence = adapter.existingSessionContextEvidence?.() || {
      provider: adapter.id,
      tabContextChecked: false,
      createdNewTab: false,
    };
    return buildExistingSessionAuthenticationEvidence({
      ...contextEvidence,
      evidencePolicy: existingSessionConfig.evidencePolicy,
      pageTextObserved: Boolean(pageTextObserved),
      consoleMessageCount: consoleMessages.length,
      networkRequestCount: networkRequests.length,
      ...(minimalExistingSessionEvidence && screenshotConfigured ? { screenshotSuppressed: true } : {}),
      ...(minimalExistingSessionEvidence ? { transcriptDetailsSuppressed: true } : {}),
    });
  };
  const browserRecovery = () => adapter?.browserRecoveryEvidence?.();
  let pageTextObserved = false;
  const captureActionEffectObservation = async (): Promise<BrowserActionEffectObservation> => {
    const pageText = await adapter?.pageText?.() || "";
    if (pageText) pageTextObserved = true;
    return {
      url: adapter?.currentUrl || "",
      pageText,
    };
  };

  if (hasMultiSessionBrowserScenario(check)) {
    return {
      provider: "mcp",
      project: project.name,
      name,
      url,
      status: "blocked",
      startedAt,
      finishedAt: nowIso(),
      durationMs: Date.now() - started,
      steps: [],
      screenshots: [],
      pageSnapshots: [],
      consoleMessages: [],
      consoleErrors: [],
      pageErrors: [],
      networkRequests: [],
      networkErrors: [],
      browserArtifacts: [],
      adversarial: check.adversarial === true,
      probeType: check.probeType || check.probe_type || MULTI_SESSION_BROWSER_PROBE_TYPE,
      context: { ...(check.context || {}), ...browserSessionScenarioMetadata(check) },
      error: "MCP browser providers cannot execute deterministic isolated multi-session scenarios; use Playwright.",
    };
  }

  if (!adapter) {
    return {
      provider: "mcp",
      project: project.name,
      name,
      url,
      status: "blocked",
      startedAt,
      finishedAt: nowIso(),
      durationMs: Date.now() - started,
      steps,
      screenshots,
      pageSnapshots,
      consoleMessages,
      consoleErrors,
      pageErrors,
      networkRequests,
      networkErrors,
      browserArtifacts,
      adversarial: check.adversarial === true,
      probeType: check.probeType || check.probe_type,
      context: check.context,
      authentication: existingSessionAuthentication(),
      error: existingSessionConfig
        ? `No ${existingSessionConfig.provider === "auto" ? "Claude in Chrome or Chrome DevTools" : existingSessionConfig.provider} MCP adapter matched the existing authenticated browser session requirement.`
        : "No supported MCP browser adapter matched the available tools.",
    };
  }

  try {
    if (existingSessionConfig) {
      if (!adapter.prepareExistingSession) {
        throw new Error(`${adapter.label} cannot prepare an existing authenticated browser session.`);
      }
      await adapter.prepareExistingSession(url);
    }
    const actions = check.actions?.length ? check.actions : [{ type: "goto", url } as BrowserActionSpec];
    for (let actionIndex = 0; actionIndex < actions.length; actionIndex += 1) {
      const action = actions[actionIndex];
      const verifyEffect = browserActionEffectRequired(action);
      const beforeObservation = verifyEffect
        ? await captureActionEffectObservation().catch(() => ({}))
        : {};
      const step = await adapter.runAction(project, action, Number(action.timeoutMs || action.timeout_ms || context.workOrder.options.browserTimeoutMs));
      steps.push(step);
      if (step.status === "failed") break;
      if (verifyEffect) {
        const verified = await verifyBrowserActionEffect({
          provider: "mcp",
          action,
          actionIndex,
          defaultTimeout: context.workOrder.options.browserTimeoutMs,
          beforeObservation,
          capture: captureActionEffectObservation,
        });
        actionEffects.push(verified.evidence);
        steps.push(verified.step);
        if (verified.step.status === "failed") break;
      }
    }

    const readConsoleMessages = (adapter as any).readConsoleMessages;
    if (typeof readConsoleMessages === "function") {
      consoleMessages.push(...await readConsoleMessages.call(adapter).catch((error: any) => [`console read failed: ${error.message || String(error)}`]));
    }
    consoleErrors.push(...await adapter.readConsoleErrors().catch((error: any) => [`console read failed: ${error.message || String(error)}`]));
    networkRequests.push(...await adapter.readNetworkRequests().catch((error: any) => [`network read failed: ${error.message || String(error)}`]));
    networkErrors.push(...await adapter.readNetworkErrors().catch((error: any) => [`network read failed: ${error.message || String(error)}`]));
    if (!consoleMessages.length) consoleMessages.push(...consoleErrors.map(item => `error: ${item}`));
    if (!networkRequests.length) networkRequests.push(...networkErrors.map(item => `error: ${item}`));
    const pageText = await (adapter as any).pageText?.().catch((error: any) => {
      pageErrors.push(`page text read failed: ${error.message || String(error)}`);
      return "";
    }) || "";
    pageTextObserved = Boolean(pageText);

    if (!steps.some(step => step.status === "failed")) {
      for (const assertion of check.assertions || []) {
        const step = await adapter.runAssertion(assertion, { pageText, consoleMessages, consoleErrors, networkRequests, networkErrors }, Number(assertion.timeoutMs || assertion.timeout_ms || context.workOrder.options.browserTimeoutMs));
        steps.push(step);
      }
    }

    if (context.workOrder.options.failOnConsoleError && consoleErrors.length && !(check.assertions || []).some(item => item.type === "consoleNoErrors")) {
      steps.push({ kind: "assertion", name: `${adapter.id}:consoleNoErrors`, status: "failed", error: consoleErrors.slice(0, 3).join(" | ") });
    }
    if (networkErrors.length && !(check.assertions || []).some(item => item.type === "networkNoErrors")) {
      steps.push({ kind: "assertion", name: `${adapter.id}:networkNoErrors`, status: "failed", error: networkErrors.slice(0, 3).join(" | ") });
    }
    if (pageErrors.length) {
      steps.push({ kind: "assertion", name: `${adapter.id}:pageText`, status: "failed", error: pageErrors.slice(0, 3).join(" | ") });
    }
    if (normalScreenshotRequested) {
      try {
        const captures = await adapter.captureScreenshot(name);
        screenshots.push(...writeMcpScreenshotArtifacts({
          artifactDir: context.workOrder.options.artifactDir,
          projectName: project.name,
          checkName: name,
          index,
          captures,
        }));
        if (context.workOrder.options.collectBrowserArtifacts) {
          browserArtifacts.push(...writeBrowserEvidenceArtifacts({
            artifactDir: context.workOrder.options.artifactDir,
            projectName: project.name,
            checkName: name,
            index,
            captures,
            source: `${adapter.id}:captureScreenshot`,
          }));
        }
      } catch (error: any) {
        screenshots.push(`screenshot failed: ${error.message || String(error)}`);
      }
    }
    const failedStep = steps.find(step => step.status === "failed");
    if (failedStep && !normalScreenshotRequested && !minimalExistingSessionEvidence) {
      const failureCapture = await captureMcpFailureScreenshot({
        adapter,
        artifactDir: context.workOrder.options.artifactDir,
        projectName: project.name,
        checkName: name,
        index,
        failedStep,
        collectBrowserArtifacts: context.workOrder.options.collectBrowserArtifacts,
      });
      screenshots.push(...failureCapture.screenshots);
      browserArtifacts.push(...failureCapture.browserArtifacts);
    }
    if (!minimalExistingSessionEvidence) {
      pageSnapshots.push(...writeMcpPageSnapshot(context.workOrder.options.artifactDir, project.name, name, index, pageText));
    }
    const telemetryLogs = minimalExistingSessionEvidence
      ? {}
      : writeMcpTelemetryLogs({
          artifactDir: context.workOrder.options.artifactDir,
          projectName: project.name,
          checkName: name,
          index,
          consoleMessages,
          networkRequests,
        });

    const failed = steps.some(step => step.status === "failed");
    const resultSteps = minimalExistingSessionEvidence ? minimalAuthenticatedSessionSteps(steps) : steps;
    const resultUrl = minimalExistingSessionEvidence ? authenticatedSessionSafeUrl(url) : url;
    const resultFinalUrl = minimalExistingSessionEvidence
      ? authenticatedSessionSafeUrl(adapter.currentUrl || url)
      : adapter.currentUrl || url;
    return {
      provider: "mcp",
      project: project.name,
      name,
      url: resultUrl,
      ...(!minimalExistingSessionEvidence ? { finalUrl: resultFinalUrl } : {}),
      ...(!minimalExistingSessionEvidence && pageText ? { pageTextPreview: compactText(pageText, 2000) } : {}),
      authentication: existingSessionAuthentication(),
      ...(browserRecovery() ? { recovery: browserRecovery() } : {}),
      status: failed ? "failed" : "passed",
      startedAt,
      finishedAt: nowIso(),
      durationMs: Date.now() - started,
      steps: resultSteps,
      screenshots: minimalExistingSessionEvidence ? [] : screenshots,
      pageSnapshots,
      consoleMessages: minimalExistingSessionEvidence ? [] : consoleMessages,
      consoleErrors: minimalExistingSessionEvidence && consoleErrors.length ? ["Authenticated browser console errors were observed; raw details suppressed."] : consoleErrors,
      pageErrors: minimalExistingSessionEvidence && pageErrors.length ? ["Authenticated browser page errors were observed; raw details suppressed."] : pageErrors,
      networkRequests: minimalExistingSessionEvidence ? [] : networkRequests,
      networkErrors: minimalExistingSessionEvidence && networkErrors.length ? ["Authenticated browser network errors were observed; raw details suppressed."] : networkErrors,
      browserArtifacts: minimalExistingSessionEvidence ? [] : browserArtifacts,
      actionEffects: minimalExistingSessionEvidence
        ? suppressBrowserActionEffectDetails(actionEffects)
        : actionEffects,
      ...telemetryLogs,
      adversarial: check.adversarial === true,
      probeType: check.probeType || check.probe_type,
      context: check.context,
    };
  } catch (error: any) {
    if (adapter && !normalScreenshotRequested && !minimalExistingSessionEvidence) {
      const failureCapture = await captureMcpFailureScreenshot({
        adapter,
        artifactDir: context.workOrder.options.artifactDir,
        projectName: project.name,
        checkName: name,
        index,
        failedStep: steps.find(step => step.status === "failed"),
        collectBrowserArtifacts: context.workOrder.options.collectBrowserArtifacts,
      });
      screenshots.push(...failureCapture.screenshots);
      browserArtifacts.push(...failureCapture.browserArtifacts);
    }
    return {
      provider: "mcp",
      project: project.name,
      name,
      url: minimalExistingSessionEvidence ? authenticatedSessionSafeUrl(url) : url,
      authentication: existingSessionAuthentication(),
      ...(browserRecovery() ? { recovery: browserRecovery() } : {}),
      status: "blocked",
      startedAt,
      finishedAt: nowIso(),
      durationMs: Date.now() - started,
      steps: minimalExistingSessionEvidence ? minimalAuthenticatedSessionSteps(steps) : steps,
      screenshots: minimalExistingSessionEvidence ? [] : screenshots,
      pageSnapshots,
      consoleMessages: minimalExistingSessionEvidence ? [] : consoleMessages,
      consoleErrors: minimalExistingSessionEvidence && consoleErrors.length ? ["Authenticated browser console errors were observed; raw details suppressed."] : consoleErrors,
      pageErrors: minimalExistingSessionEvidence && pageErrors.length ? ["Authenticated browser page errors were observed; raw details suppressed."] : pageErrors,
      networkRequests: minimalExistingSessionEvidence ? [] : networkRequests,
      networkErrors: minimalExistingSessionEvidence && networkErrors.length ? ["Authenticated browser network errors were observed; raw details suppressed."] : networkErrors,
      browserArtifacts: minimalExistingSessionEvidence ? [] : browserArtifacts,
      actionEffects: minimalExistingSessionEvidence
        ? suppressBrowserActionEffectDetails(actionEffects)
        : actionEffects,
      ...(minimalExistingSessionEvidence ? {} : writeMcpTelemetryLogs({
          artifactDir: context.workOrder.options.artifactDir,
          projectName: project.name,
          checkName: name,
          index,
          consoleMessages,
          networkRequests,
        })),
      adversarial: check.adversarial === true,
      probeType: check.probeType || check.probe_type,
      context: check.context,
      error: minimalExistingSessionEvidence
        ? minimalExistingSessionBlockedError(error)
        : error.message || String(error),
    };
  }
}

export const McpBrowserProvider: BrowserProvider = {
  id: "mcp",
  label: "MCP browser tools",
  async availability(context) {
    if (!context.runtime.browserToolExecutor) return { available: false, reason: "No browserToolExecutor was supplied." };
    const tools = await listTools(context).catch(() => []);
    const availableBrowserTools = browserTools(tools);
    if (!availableBrowserTools.length) return { available: false, reason: "No MCP browser tools were listed.", tools };
    const adapter = createMcpBrowserAdapter(availableBrowserTools, (toolName, input) => callTool(context, toolName, input));
    if (!adapter) return { available: false, reason: "MCP browser tools exist, but no supported adapter matched them.", tools: availableBrowserTools };
    return { available: true, tools: availableBrowserTools };
  },
  async run(context) {
    const availability = await this.availability(context);
    if (!availability.available) return [blockedBrowserResult("mcp", "MCP browser provider", availability.reason || "MCP browser provider unavailable.")];
    const tools = availability.tools || [];
    const results: BrowserCheckResult[] = [];
    const routedChecks = context.workOrder.projects
      .flatMap(project => checksForProject(project, context.workOrder.acceptanceCriteria)
        .map((check, index) => ({ project, check, index }))
        .filter(item => !context.checkFilter || context.checkFilter(item.project, item.check, item.index)));
    if (!routedChecks.length) return [];
    const stabilityCheck = routedChecks
      .map(item => item.check)
      .find(check => browserCheckStabilityRuns(check) > 1);
    if (stabilityCheck) {
      return [blockedBrowserResult(
        "mcp",
        "MCP browser stability verification",
        "MCP browser providers cannot guarantee a fresh isolated browser context for each stability run; use Playwright.",
      )];
    }
    const authenticationCheck = routedChecks
      .find(item => browserCheckRequiresManagedAuthentication(item.check));
    if (authenticationCheck) {
      return [blockedBrowserResult(
        "mcp",
        "MCP authenticated browser verification",
        `Browser check "${authenticationCheck.check.name || "Browser check"}" for project "${authenticationCheck.project.name}" uses credential environment bindings or a storage-state file. TestAgent keeps those inputs inside an isolated Playwright context and does not send them through MCP browser tool calls; use Playwright.`,
      )];
    }
    for (const project of context.workOrder.projects) {
      const checks = checksForProject(project, context.workOrder.acceptanceCriteria);
      for (let i = 0; i < checks.length; i += 1) {
        if (context.checkFilter && !context.checkFilter(project, checks[i], i)) continue;
        results.push(withBrowserCheckExecutionIdentity({
          result: await runMcpCheck(context, tools, project, checks[i], i),
          workOrder: context.workOrder,
          project,
          checkIndex: i,
        }));
      }
    }
    return results;
  },
};
