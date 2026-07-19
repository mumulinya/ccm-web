// Behavior-freeze split from playwright-provider.ts (part 4/4).
import * as path from "path";
import * as fs from "fs";
import * as zlib from "zlib";
import {
  BrowserAuthenticationEvidence,
  BrowserActionSpec,
  BrowserAssertionSpec,
  BrowserCheckResult,
  BrowserEvidenceArtifact,
  BrowserCheckSpec,
  BrowserSessionLeafStepSpec,
  BrowserSessionResult,
  BrowserSessionSpec,
  BrowserStepResult,
  BrowserResourceLifecycleRecorder,
  NormalizedTestAgentProjectTarget,
} from "../types";
import { compactText, ensureDir, hasRequiredCheck, nowIso, resolveUrl, safeSegment, validateTestAgentUrl } from "../utils";
import { BrowserProvider, BrowserProviderContext, blockedBrowserResult } from "./provider-types";
import { browserTargetDetail, buildSemanticLocatorPlan, resolvePlaywrightLocator } from "./semantic-locator";
import { writePlaywrightAccessibilitySnapshotArtifact } from "./accessibility-snapshot-artifacts";
import { writePlaywrightFailureScreenshot } from "./failure-screenshots";
import {
  browserSessionInitialUrl,
  browserSessionScenarioMetadata,
  browserSessionSteps,
  flattenBrowserSessionSteps,
  hasMultiSessionBrowserScenario,
  isBrowserSessionComparisonStep,
  isBrowserSessionLeafStep,
  isBrowserSessionParallelStep,
  MULTI_SESSION_BROWSER_PROBE_TYPE,
  prefixBrowserSessionStep,
  validateMultiSessionBrowserScenario,
} from "./multi-session";
import { runBrowserSessionComparison } from "./session-comparison";
import { browserCheckStabilityRuns, browserStabilityGroupId, withBrowserStabilityMetadata } from "./stability-summary";
import { checksForProject } from "./shared";
import {
  BrowserSecretBinding,
  browserActionSupportsEnvironmentValue,
  browserAuthenticationEnvNames,
  browserCheckAuthenticationActions,
  browserCheckAuthenticationEnvNames,
  browserCheckHasStorageState,
  browserSessionAuthenticationActions,
  browserStorageStatePath,
  buildBrowserAuthenticationEvidence,
  loadBrowserStorageState,
  redactBrowserSensitiveText,
  resolveBrowserActionValue,
  resolveBrowserSecretBindings,
  ResolvedBrowserActionValue,
} from "./authentication";
import {
  browserCheckUsesExistingSession,
} from "./existing-session";
import { withBrowserCheckExecutionIdentity } from "./check-execution-coverage";
import {
  BrowserActionEffectObservation,
  browserActionEffectRequired,
  browserActionEffectSession,
  verifyBrowserActionEffect,
} from "./action-effects";
import {
  browserNetworkAssertionDetail,
  browserNetworkAssertionHasExpectation,
  browserNetworkAssertionIsNegative,
  browserNetworkAssertionSettleMs,
  waitForAbsentBrowserNetworkLine,
  waitForBrowserNetworkLine,
} from "./network-assertions";
import {
  browserConsoleAssertionDetail,
  browserConsoleAssertionHasExpectation,
  browserConsoleAssertionIsNegative,
  browserConsoleAssertionSettleMs,
  waitForAbsentBrowserConsoleLine,
  waitForBrowserConsoleLine,
} from "./console-assertions";
import {
  browserAccessibilityAssertionDetail,
  waitForBrowserAccessibilityAssertion,
} from "./accessibility-assertions";
import {
  browserAriaStateAssertionDetail,
  isBrowserAriaStateAssertion,
  waitForBrowserAriaStateAssertion,
} from "./aria-state-assertions";

import {
  BrowserContextRuntimeOptions,
  CapturedBrowserDialog,
  CapturedBrowserPopup,
  PlaywrightMultiSessionRuntime,
  browserPopupLogLine,
  captureBrowserPopup,
  capturePageFinalState,
  capturePlaywrightActionEffectObservation,
  checkPlaywrightAvailability,
  launchChromiumWithFallback,
  redactBrowserStepResult,
} from "./playwright-provider-part-01";

import {
  browserArtifactBase,
  browserCheckContextOptions,
  browserCheckViewport,
  browserContextLaunchOptions,
  browserDialogLogLine,
  downloadArtifacts,
  finalizePlaywrightBrowserArtifacts,
  grantBrowserContextPermissions,
  grantClipboardPermissions,
  installPlaywrightNetworkSafetyBoundary,
  originOf,
  playwrightNetworkErrorForResponse,
  requestDetailsLine,
  responseDetailsLine,
  responseResourceType,
  savePlaywrightDownload,
  writeBrowserTelemetryLogs,
  writePlaywrightPageSnapshots,
} from "./playwright-provider-part-02";

import {
  runAction,
  runAssertion,
  runBrowserCheck,
} from "./playwright-provider-part-03";

async function createPlaywrightMultiSessionRuntime(input: {
  browser: any;
  providerContext: BrowserProviderContext;
  project: NormalizedTestAgentProjectTarget;
  check: BrowserCheckSpec;
  checkName: string;
  session: BrowserSessionSpec;
  initialUrl: string;
  index: number;
  viewport: ReturnType<typeof browserCheckViewport>;
  contextOptions: BrowserContextRuntimeOptions;
  secretBindings: BrowserSecretBinding[];
  credentialEnvNames: string[];
  authenticationConfigured: boolean;
}) {
  const {
    browser,
    providerContext,
    project,
    check,
    checkName,
    session,
    initialUrl,
    index,
    viewport,
    contextOptions,
    secretBindings,
    credentialEnvNames,
    authenticationConfigured,
  } = input;
  const { workOrder } = providerContext;
  const sessionName = session.name;
  const sensitiveArtifactsSuppressed = authenticationConfigured
    && (workOrder.options.collectBrowserArtifacts || workOrder.options.collectBrowserVideo);
  const collectBrowserArtifacts = workOrder.options.collectBrowserArtifacts && !authenticationConfigured;
  const collectBrowserVideo = workOrder.options.collectBrowserVideo && !authenticationConfigured;
  const evidenceDir = collectBrowserArtifacts ? ensureDir(path.join(workOrder.options.artifactDir, "browser-artifacts")) : "";
  const downloadDir = ensureDir(path.join(workOrder.options.artifactDir, "browser-artifacts", "downloads"));
  const artifactBase = browserArtifactBase(project.name, `${checkName}-${sessionName}`, index);
  const tracePath = collectBrowserArtifacts ? path.join(evidenceDir, `${artifactBase}.trace.zip`) : "";
  const harPath = collectBrowserArtifacts ? path.join(evidenceDir, `${artifactBase}.har`) : "";
  const monitoredOrigins = new Set([originOf(project.targetUrl), originOf(initialUrl)].filter(Boolean));
  const networkSafetyErrors: string[] = [];
  let browserContext: any = null;
  let lifecycleResourceId = "";
  try {
    const storageStateSource = browserStorageStatePath(session) ? session : check;
    const loadedStorageState = loadBrowserStorageState(project, storageStateSource);
    const runtimeContextOptions: BrowserContextRuntimeOptions = {
      ...contextOptions,
      ...(loadedStorageState ? {
        storageStatePath: loadedStorageState.path,
        storageState: loadedStorageState.evidence,
      } : {}),
    };
    const sessionSecretBindings = [
      ...secretBindings,
      ...(loadedStorageState?.secretBindings || []),
    ];
    const authentication = buildBrowserAuthenticationEvidence({
      credentialEnvNames,
      storageState: loadedStorageState?.evidence,
      sensitiveArtifactsSuppressed,
    });
    browserContext = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      isMobile: viewport.isMobile,
      deviceScaleFactor: viewport.deviceScaleFactor,
      ...browserContextLaunchOptions(runtimeContextOptions),
      acceptDownloads: true,
      ...(collectBrowserArtifacts ? { recordHar: { path: harPath, content: "attach" } } : {}),
      ...(collectBrowserVideo ? { recordVideo: { dir: ensureDir(path.join(workOrder.options.artifactDir, "browser-videos")), size: { width: viewport.width, height: viewport.height } } } : {}),
    });
    lifecycleResourceId = providerContext.runtime.browserResourceLifecycle?.acquire({
      planId: String(workOrder.metadata?.browserCheckExecutionPlan?.planId || ""),
      provider: "playwright",
      resourceType: "browser_context",
      scope: `${project.name}/${checkName}/${sessionName}`,
    }) || "";
    await grantClipboardPermissions(browserContext, monitoredOrigins);
    await grantBrowserContextPermissions(browserContext, monitoredOrigins, contextOptions.permissions || []);
    let traceStarted = false;
    if (collectBrowserArtifacts && browserContext.tracing?.start) {
      try {
        await browserContext.tracing.start({ screenshots: true, snapshots: true, sources: true });
        traceStarted = true;
      } catch {}
    }
    const page = await browserContext.newPage();
    const recordUnsafeRequest = (event: { url: string; error: string }) => {
      networkSafetyErrors.push(redactBrowserSensitiveText(`blocked_unsafe_url ${event.error}: ${event.url}`, sessionSecretBindings));
    };
    await installPlaywrightNetworkSafetyBoundary(browserContext, page, recordUnsafeRequest);
    browserContext.on?.("page", (childPage: any) => {
      if (childPage === page) return;
      void installPlaywrightNetworkSafetyBoundary(browserContext, childPage, recordUnsafeRequest).catch(() => {});
    });
    const runtime: PlaywrightMultiSessionRuntime = {
      name: sessionName,
      initialUrl,
      browserContext,
      page,
      traceStarted,
      tracePath,
      harPath,
      artifactBase,
      screenshots: [],
      screenshotRefs: [],
      pageSnapshots: [],
      browserArtifacts: [],
      consoleMessages: [],
      dialogMessages: [],
      popupMessages: [],
      consoleErrors: [],
      pageErrors: [],
      networkRequests: [],
      networkErrors: networkSafetyErrors,
      downloads: [],
      downloadPromises: [],
      dialogs: [],
      popups: [],
      popupCapturePromises: [],
      viewport,
      monitoredOrigins,
      authentication,
      secretBindings: sessionSecretBindings,
      collectBrowserVideo,
      lifecycleResourceId,
    };

    page.on("popup", (popup: any) => {
      const popupRecordIndex = runtime.popups.length;
      const pendingRecord: CapturedBrowserPopup = { url: "", title: "", textPreview: "", openedAt: nowIso() };
      runtime.popups.push(pendingRecord);
      runtime.popupMessages.push(browserPopupLogLine(pendingRecord));
      const promise = captureBrowserPopup(popup, runtime.secretBindings)
        .then(record => {
          runtime.popups[popupRecordIndex] = record;
          runtime.popupMessages[popupRecordIndex] = browserPopupLogLine(record);
          return record;
        })
        .catch((error: any) => {
          pendingRecord.error = redactBrowserSensitiveText(error.message || String(error), runtime.secretBindings);
          runtime.popupMessages[popupRecordIndex] = browserPopupLogLine(pendingRecord);
          return pendingRecord;
        });
      runtime.popupCapturePromises.push(promise);
    });
    page.on("console", (message: any) => {
      const type = message.type?.() || "console";
      const text = redactBrowserSensitiveText(message.text?.() || "", runtime.secretBindings);
      runtime.consoleMessages.push(`${type}: ${text}`);
      if (type === "error") runtime.consoleErrors.push(text);
    });
    page.on("pageerror", (error: any) => runtime.pageErrors.push(redactBrowserSensitiveText(error.message || String(error), runtime.secretBindings)));
    page.on("dialog", (dialog: any) => {
      const record: CapturedBrowserDialog = {
        type: String(dialog.type?.() || "dialog"),
        message: redactBrowserSensitiveText(String(dialog.message?.() || ""), runtime.secretBindings),
        defaultValue: dialog.defaultValue
          ? redactBrowserSensitiveText(String(dialog.defaultValue()), runtime.secretBindings)
          : undefined,
        accepted: false,
        occurredAt: nowIso(),
      };
      const dialogIndex = runtime.dialogs.length;
      runtime.dialogs.push(record);
      runtime.dialogMessages.push(browserDialogLogLine(record));
      Promise.resolve(dialog.accept?.())
        .then(() => {
          record.accepted = true;
          runtime.dialogMessages[dialogIndex] = browserDialogLogLine(record);
        })
        .catch((error: any) => {
          record.error = redactBrowserSensitiveText(error.message || String(error), runtime.secretBindings);
          runtime.dialogMessages[dialogIndex] = browserDialogLogLine(record);
        });
    });
    page.on("download", (download: any) => {
      const downloadIndex = runtime.downloadPromises.length;
      const promise = savePlaywrightDownload(download, downloadDir, artifactBase, downloadIndex)
        .then(record => {
          runtime.downloads.push(record);
          return record;
        });
      runtime.downloadPromises.push(promise);
    });
    page.on("request", (request: any) => {
      runtime.networkRequests.push(redactBrowserSensitiveText(
        `request ${request.method?.() || "GET"} ${request.url?.() || ""}`,
        runtime.secretBindings,
      ));
      runtime.networkRequests.push(requestDetailsLine(request, runtime.secretBindings));
    });
    page.on("requestfailed", (request: any) => {
      const line = redactBrowserSensitiveText(
        `failed ${request.method?.() || "GET"} ${request.url?.() || ""}: ${request.failure?.()?.errorText || "request failed"}`,
        runtime.secretBindings,
      );
      runtime.networkRequests.push(line);
      runtime.networkErrors.push(line);
    });
    page.on("response", (response: any) => {
      const status = Number(response.status?.() || 0);
      const responseUrl = response.url?.() || "";
      const resourceType = responseResourceType(response);
      runtime.networkRequests.push(redactBrowserSensitiveText(
        `response ${status}${resourceType ? ` ${resourceType}` : ""} ${responseUrl}`,
        runtime.secretBindings,
      ));
      responseDetailsLine(response, status, resourceType, responseUrl, runtime.secretBindings)
        .then(detailLine => runtime.networkRequests.push(detailLine))
        .catch(() => {});
      if (resourceType === "document" && status < 400) {
        const origin = originOf(responseUrl);
        if (origin) runtime.monitoredOrigins.add(origin);
      }
      const networkError = playwrightNetworkErrorForResponse({
        status,
        responseUrl,
        resourceType,
        monitoredOrigins: runtime.monitoredOrigins,
        failOnHttpResourceError: workOrder.options.failOnHttpResourceError,
      });
      if (networkError) runtime.networkErrors.push(redactBrowserSensitiveText(networkError, runtime.secretBindings));
    });
    return runtime;
  } catch (error) {
    try {
      await browserContext?.close?.();
      if (lifecycleResourceId) providerContext.runtime.browserResourceLifecycle?.released(lifecycleResourceId);
    } catch (closeError: any) {
      if (lifecycleResourceId) providerContext.runtime.browserResourceLifecycle?.cleanupFailed(lifecycleResourceId, closeError.message || String(closeError));
    }
    throw error;
  }
}

async function finalizePlaywrightMultiSessionRuntime(input: {
  runtime: PlaywrightMultiSessionRuntime;
  providerContext: BrowserProviderContext;
  project: NormalizedTestAgentProjectTarget;
  checkName: string;
  index: number;
  normalScreenshotRequested: boolean;
  steps: BrowserStepResult[];
}) {
  const { runtime, providerContext, project, checkName, index, normalScreenshotRequested, steps } = input;
  const { workOrder } = providerContext;
  const failedStep = steps.find(step => step.status === "failed" && step.name.startsWith(`session:${runtime.name}:`));
  if (failedStep && !normalScreenshotRequested) {
    const failureShots = await writePlaywrightFailureScreenshot({
      page: runtime.page,
      artifactDir: workOrder.options.artifactDir,
      projectName: project.name,
      checkName: `${checkName}-${runtime.name}`,
      index,
      failedStep,
    }).catch(() => [] as Array<{ stepName: string; path: string; kind: "failure" | "capture" }>);
    runtime.screenshots.push(...failureShots.map(item => item.path));
    runtime.screenshotRefs = [...(runtime.screenshotRefs || []), ...failureShots];
  }
  if (normalScreenshotRequested) {
    try {
      const screenshotDir = ensureDir(path.join(workOrder.options.artifactDir, "screenshots"));
      const screenshotPath = path.join(screenshotDir, `${safeSegment(project.name)}-${safeSegment(checkName)}-${index + 1}-${safeSegment(runtime.name)}.png`);
      await runtime.page.screenshot({ path: screenshotPath, fullPage: true });
      runtime.screenshots.push(screenshotPath);
    } catch (error: any) {
      steps.push(prefixBrowserSessionStep(runtime.name, {
        kind: "assertion",
        name: "assert:screenshot",
        status: "failed",
        error: redactBrowserSensitiveText(error.message || String(error), runtime.secretBindings),
      }));
    }
  }
  if (runtime.popupCapturePromises.length) await Promise.all(runtime.popupCapturePromises).catch(() => []);
  if (runtime.downloadPromises.length) await Promise.all(runtime.downloadPromises).catch(() => []);
  runtime.pageSnapshots.push(...await writePlaywrightPageSnapshots(
    runtime.page,
    workOrder.options.artifactDir,
    project.name,
    `${checkName}-${runtime.name}`,
    index,
    runtime.secretBindings,
  ).catch(() => []));
  runtime.browserArtifacts.push(...await writePlaywrightAccessibilitySnapshotArtifact(
    runtime.page,
    workOrder.options.artifactDir,
    project.name,
    `${checkName}-${runtime.name}`,
    index,
    value => redactBrowserSensitiveText(value, runtime.secretBindings),
  ).catch(() => []));
  runtime.browserArtifacts.push(...downloadArtifacts(runtime.downloads));
  const finalState = await capturePageFinalState(runtime.page, runtime.secretBindings);
  const telemetryLogs = writeBrowserTelemetryLogs({
    artifactDir: workOrder.options.artifactDir,
    projectName: project.name,
    checkName: `${checkName}-${runtime.name}`,
    index,
    consoleMessages: runtime.consoleMessages,
    dialogMessages: runtime.dialogMessages,
    popupMessages: runtime.popupMessages,
    networkRequests: runtime.networkRequests,
  });
  runtime.consoleLogPath = telemetryLogs.consoleLogPath;
  runtime.networkLogPath = telemetryLogs.networkLogPath;
  runtime.browserArtifacts.push(...await finalizePlaywrightBrowserArtifacts({
    browserContext: runtime.browserContext,
    page: runtime.page,
    traceStarted: runtime.traceStarted,
    tracePath: runtime.tracePath,
    harPath: runtime.harPath,
    collectVideo: runtime.collectBrowserVideo,
    lifecycle: providerContext.runtime.browserResourceLifecycle,
    lifecycleResourceId: runtime.lifecycleResourceId,
  }));
  return {
    name: runtime.name,
    url: runtime.initialUrl,
    ...finalState,
    screenshots: runtime.screenshots,
    screenshotRefs: runtime.screenshotRefs || [],
    pageSnapshots: runtime.pageSnapshots,
    browserArtifacts: runtime.browserArtifacts,
    consoleErrors: runtime.consoleErrors,
    pageErrors: runtime.pageErrors,
    networkErrors: runtime.networkErrors,
    consoleLogPath: runtime.consoleLogPath,
    networkLogPath: runtime.networkLogPath,
    authentication: runtime.authentication,
  } as BrowserSessionResult;
}

async function runPlaywrightMultiSessionAction(input: {
  runtime: PlaywrightMultiSessionRuntime;
  effectRuntime?: PlaywrightMultiSessionRuntime;
  project: NormalizedTestAgentProjectTarget;
  action: BrowserActionSpec;
  actionIndex: number;
  timeout: number;
}) {
  const { runtime, project, action, actionIndex, timeout } = input;
  const effectRuntime = input.effectRuntime || runtime;
  const verifyEffect = browserActionEffectRequired(action);
  const beforeObservation = verifyEffect
    ? await capturePlaywrightActionEffectObservation(effectRuntime.page, effectRuntime).catch(() => ({}))
    : {};
  const actionStep = prefixBrowserSessionStep(runtime.name, redactBrowserStepResult(
    await runAction(runtime.page, project, action, timeout),
    runtime.secretBindings,
  ));
  const steps = [actionStep];
  if (actionStep.status === "failed" || !verifyEffect) return { steps };
  const verified = await verifyBrowserActionEffect({
    provider: "playwright",
    action,
    actionIndex,
    session: runtime.name,
    ...(effectRuntime.name !== runtime.name ? { effectSession: effectRuntime.name } : {}),
    defaultTimeout: timeout,
    beforeObservation,
    capture: () => capturePlaywrightActionEffectObservation(effectRuntime.page, effectRuntime),
  });
  steps.push(prefixBrowserSessionStep(runtime.name, redactBrowserStepResult(
    verified.step,
    runtime.secretBindings,
  )));
  return {
    steps,
    effect: verified.evidence,
  };
}

async function runMultiSessionBrowserCheck(browser: any, context: BrowserProviderContext, project: NormalizedTestAgentProjectTarget, check: BrowserCheckSpec, index: number): Promise<BrowserCheckResult> {
  const startedAt = nowIso();
  const started = Date.now();
  const name = check.name || `Multi-session browser check ${index + 1}`;
  const timeout = Number(check.timeoutMs || check.timeout_ms || context.workOrder.options.browserTimeoutMs);
  const viewport = browserCheckViewport(check);
  const contextOptions = browserCheckContextOptions(check);
  const normalScreenshotRequested = check.screenshot !== false || hasRequiredCheck(context.workOrder.requiredChecks, /screenshot/i);
  const steps: BrowserStepResult[] = [];
  const runtimes: PlaywrightMultiSessionRuntime[] = [];
  const browserSessions: BrowserSessionResult[] = [];
  const browserSessionComparisons: NonNullable<BrowserCheckResult["browserSessionComparisons"]> = [];
  const actionEffects: NonNullable<BrowserCheckResult["actionEffects"]> = [];
  let nextActionIndex = 0;
  const credentialEnvNames = browserCheckAuthenticationEnvNames(check);
  const authenticationConfigured = credentialEnvNames.length > 0 || browserCheckHasStorageState(check);
  const sensitiveArtifactsSuppressed = authenticationConfigured
    && (context.workOrder.options.collectBrowserArtifacts || context.workOrder.options.collectBrowserVideo);
  let secretBindings: BrowserSecretBinding[] = [];
  let authentication = buildBrowserAuthenticationEvidence({
    credentialEnvNames,
    sensitiveArtifactsSuppressed,
  });
  let infrastructureError = "";

  const validationErrors = validateMultiSessionBrowserScenario(check);
  if (validationErrors.length) infrastructureError = validationErrors.join(" ");

  try {
    if (!infrastructureError) {
      secretBindings = resolveBrowserSecretBindings(project, browserCheckAuthenticationActions(check));
      for (const session of check.sessions || []) {
        const initialUrl = resolveUrl(project.targetUrl, browserSessionInitialUrl(session, check.url || project.targetUrl));
        const runtime = await createPlaywrightMultiSessionRuntime({
          browser,
          providerContext: context,
          project,
          check,
          checkName: name,
          session,
          initialUrl,
          index,
          viewport,
          contextOptions,
          secretBindings,
          credentialEnvNames: browserAuthenticationEnvNames(browserSessionAuthenticationActions(check, session)),
          authenticationConfigured,
        });
        runtimes.push(runtime);
      }
      authentication = buildBrowserAuthenticationEvidence({
        credentialEnvNames,
        storageState: browserStorageStatePath(check)
          ? runtimes.find(runtime => runtime.authentication?.storageState)?.authentication?.storageState
          : undefined,
        sensitiveArtifactsSuppressed,
      });

      for (const session of check.sessions || []) {
        const runtime = runtimes.find(item => item.name.toLowerCase() === session.name.toLowerCase())!;
        const setupActions: BrowserActionSpec[] = [
          { type: "goto", url: runtime.initialUrl, waitUntil: "domcontentloaded" },
          ...(session.setupActions || session.setup_actions || []),
        ];
        for (const action of setupActions) {
          const effectSession = browserActionEffectSession(action);
          const effectRuntime = effectSession
            ? runtimes.find(item => item.name.toLowerCase() === effectSession.toLowerCase())
            : runtime;
          const executed = await runPlaywrightMultiSessionAction({
            runtime,
            effectRuntime,
            project,
            action,
            actionIndex: nextActionIndex,
            timeout,
          });
          nextActionIndex += 1;
          steps.push(...executed.steps);
          if (executed.effect) actionEffects.push(executed.effect);
          if (executed.steps.some(step => step.status === "failed")) break;
        }
        if (steps.some(step => step.status === "failed")) break;
      }

      if (!steps.some(step => step.status === "failed")) {
        const runScenarioStep = async (
          scenarioStep: BrowserSessionLeafStepSpec,
          actionIndex?: number,
        ) => {
          const runtime = runtimes.find(item => item.name.toLowerCase() === scenarioStep.session.toLowerCase())!;
          if (scenarioStep.action) {
            const effectSession = browserActionEffectSession(scenarioStep.action);
            const effectRuntime = effectSession
              ? runtimes.find(item => item.name.toLowerCase() === effectSession.toLowerCase())
              : runtime;
            return runPlaywrightMultiSessionAction({
              runtime,
              effectRuntime,
              project,
              action: scenarioStep.action,
              actionIndex: actionIndex!,
              timeout,
            });
          }
          const step = await runAssertion(runtime.page, scenarioStep.assertion!, runtime, timeout);
          return {
            steps: [prefixBrowserSessionStep(runtime.name, redactBrowserStepResult(step, runtime.secretBindings))],
          };
        };
        let parallelGroupIndex = 0;
        for (const scenarioStep of browserSessionSteps(check)) {
          const isParallel = isBrowserSessionParallelStep(scenarioStep);
          const isComparison = isBrowserSessionComparisonStep(scenarioStep);
          if (isParallel) parallelGroupIndex += 1;
          if (isParallel) {
            const planned = scenarioStep.parallel.map(step => ({
              step,
              actionIndex: step.action ? nextActionIndex++ : undefined,
            }));
            const executions = await Promise.all(planned.map(item => runScenarioStep(item.step, item.actionIndex)));
            const executedSteps = executions.flatMap(execution => execution.steps.map(step => ({
              ...step,
              detail: [`parallelGroup=${parallelGroupIndex}`, step.detail || ""].filter(Boolean).join("; "),
            })));
            steps.push(...executedSteps);
            actionEffects.push(...executions.map(execution => execution.effect).filter(Boolean));
            if (executedSteps.some(step => step.status === "failed")) break;
            continue;
          }
          if (isComparison) {
            const left = runtimes.find(item => item.name.toLowerCase() === scenarioStep.compare.leftSession.toLowerCase())!;
            const right = runtimes.find(item => item.name.toLowerCase() === scenarioStep.compare.rightSession.toLowerCase())!;
            const comparison = await runBrowserSessionComparison({
              spec: scenarioStep.compare,
              left,
              right,
              defaultTimeoutMs: timeout,
            });
            browserSessionComparisons.push(comparison.result);
            const comparisonStep = prefixBrowserSessionStep(left.name, redactBrowserStepResult(comparison.step, secretBindings));
            steps.push(comparisonStep);
            if (comparisonStep.status === "failed") break;
            continue;
          }
          const execution = await runScenarioStep(
            scenarioStep,
            scenarioStep.action ? nextActionIndex++ : undefined,
          );
          steps.push(...execution.steps);
          if (execution.effect) actionEffects.push(execution.effect);
          if (execution.steps.some(step => step.status === "failed")) break;
        }
      }

      for (const runtime of runtimes) {
        const sessionAssertions = flattenBrowserSessionSteps(check)
          .filter(isBrowserSessionLeafStep)
          .filter(step => step.session.toLowerCase() === runtime.name.toLowerCase())
          .map(step => step.assertion)
          .filter(Boolean) as BrowserAssertionSpec[];
        if (context.workOrder.options.failOnConsoleError && runtime.consoleErrors.length && !sessionAssertions.some(item => item.type === "consoleNoErrors")) {
          steps.push(prefixBrowserSessionStep(runtime.name, { kind: "assertion", name: "assert:consoleNoErrors", status: "failed", error: runtime.consoleErrors.slice(0, 3).join(" | ") }));
        }
        if (runtime.networkErrors.length && !sessionAssertions.some(item => item.type === "networkNoErrors")) {
          steps.push(prefixBrowserSessionStep(runtime.name, { kind: "assertion", name: "assert:networkNoErrors", status: "failed", error: runtime.networkErrors.slice(0, 3).join(" | ") }));
        }
        if (runtime.pageErrors.length) {
          steps.push(prefixBrowserSessionStep(runtime.name, { kind: "assertion", name: "assert:pageErrors", status: "failed", error: runtime.pageErrors.slice(0, 3).join(" | ") }));
        }
      }
    }
  } catch (error: any) {
    infrastructureError = redactBrowserSensitiveText(error.message || String(error), secretBindings);
  }

  for (const runtime of runtimes) {
    try {
      browserSessions.push(await finalizePlaywrightMultiSessionRuntime({ runtime, providerContext: context, project, checkName: name, index, normalScreenshotRequested, steps }));
    } catch (error: any) {
      infrastructureError ||= error.message || String(error);
      try {
        await runtime.browserContext?.close?.();
        if (runtime.lifecycleResourceId) context.runtime.browserResourceLifecycle?.released(runtime.lifecycleResourceId);
      } catch (closeError: any) {
        if (runtime.lifecycleResourceId) context.runtime.browserResourceLifecycle?.cleanupFailed(runtime.lifecycleResourceId, closeError.message || String(closeError));
      }
    }
  }

  const consoleMessages = runtimes.flatMap(runtime => runtime.consoleMessages.map(item => `[${runtime.name}] ${item}`));
  const dialogMessages = runtimes.flatMap(runtime => runtime.dialogMessages.map(item => `[${runtime.name}] ${item}`));
  const popupMessages = runtimes.flatMap(runtime => runtime.popupMessages.map(item => `[${runtime.name}] ${item}`));
  const consoleErrors = runtimes.flatMap(runtime => runtime.consoleErrors.map(item => `[${runtime.name}] ${item}`));
  const pageErrors = runtimes.flatMap(runtime => runtime.pageErrors.map(item => `[${runtime.name}] ${item}`));
  const networkRequests = runtimes.flatMap(runtime => runtime.networkRequests.map(item => `[${runtime.name}] ${item}`));
  const networkErrors = runtimes.flatMap(runtime => runtime.networkErrors.map(item => `[${runtime.name}] ${item}`));
  const screenshots = browserSessions.flatMap(session => session.screenshots);
  const screenshotRefs = browserSessions.flatMap(session => (session as any).screenshotRefs || []);
  const pageSnapshots = browserSessions.flatMap(session => session.pageSnapshots || []);
  const browserArtifacts = browserSessions.flatMap(session => session.browserArtifacts || []);
  const firstSession = browserSessions[0];
  const failed = steps.some(step => step.status === "failed");
  const status: BrowserCheckResult["status"] = infrastructureError ? "blocked" : failed ? "failed" : "passed";
  return {
    provider: "playwright",
    project: project.name,
    name,
    url: firstSession?.url || resolveUrl(project.targetUrl, check.url || project.targetUrl),
    ...(firstSession?.finalUrl ? { finalUrl: firstSession.finalUrl } : {}),
    ...(firstSession?.title ? { title: firstSession.title } : {}),
    pageTextPreview: compactText(browserSessions.map(session => `[${session.name}]\n${session.pageTextPreview || ""}`).join("\n\n"), 4000),
    viewport,
    contextOptions,
    authentication,
    status,
    startedAt,
    finishedAt: nowIso(),
    durationMs: Date.now() - started,
    steps,
    screenshots,
    screenshotRefs,
    pageSnapshots,
    consoleMessages,
    dialogMessages,
    popupMessages,
    consoleErrors,
    pageErrors,
    networkRequests,
    networkErrors,
    browserArtifacts,
    browserSessions,
    browserSessionComparisons,
    actionEffects,
    adversarial: check.adversarial === true,
    probeType: check.probeType || check.probe_type || MULTI_SESSION_BROWSER_PROBE_TYPE,
    context: { ...(check.context || {}), ...browserSessionScenarioMetadata(check) },
    ...(infrastructureError ? { error: redactBrowserSensitiveText(infrastructureError, secretBindings) } : {}),
  };
}

export const PlaywrightBrowserProvider: BrowserProvider = {
  id: "playwright",
  label: "Playwright",
  async availability() {
    return checkPlaywrightAvailability();
  },
  async run(context) {
    const routedChecks = context.workOrder.projects.flatMap(project =>
      checksForProject(project, context.workOrder.acceptanceCriteria)
        .map((check, index) => ({ project, check, index }))
        .filter(item => !context.checkFilter || context.checkFilter(item.project, item.check, item.index))
    );
    if (!routedChecks.length) return [];
    const existingSessionChecks = routedChecks.filter(item => browserCheckUsesExistingSession(item.check));
    const executableChecks = routedChecks.filter(item => !browserCheckUsesExistingSession(item.check));
    const existingSessionBlocked = existingSessionChecks.map(({ project, check, index }) => {
      const name = check.name || `Browser check ${index + 1}`;
      const result = blockedBrowserResult(
        "playwright",
        name,
        `Browser check "${name}" requires an existing authenticated Chrome session. Playwright launches an isolated browser profile; use the Claude in Chrome or Chrome DevTools MCP provider.`,
      );
      result.project = project.name;
      result.url = resolveUrl(project.targetUrl, check.url || project.targetUrl);
      result.adversarial = check.adversarial === true;
      result.probeType = check.probeType || check.probe_type;
      result.context = check.context;
      return withBrowserCheckExecutionIdentity({
        result,
        workOrder: context.workOrder,
        project,
        checkIndex: index,
      });
    });
    if (!executableChecks.length) return existingSessionBlocked;

    let playwright: any;
    try {
      playwright = require("playwright");
    } catch (error: any) {
      return [blockedBrowserResult("playwright", "Load Playwright", `Playwright is unavailable: ${error.message || String(error)}`)];
    }

    const results: BrowserCheckResult[] = [];
    let browser: any;
    let browserLifecycleResourceId = "";
    try {
      const launched = await launchChromiumWithFallback(playwright, { headless: true });
      browser = launched.browser;
      browserLifecycleResourceId = context.runtime.browserResourceLifecycle?.acquire({
        planId: String(context.workOrder.metadata?.browserCheckExecutionPlan?.planId || ""),
        provider: "playwright",
        resourceType: "browser",
        scope: "provider-run",
      }) || "";
      context.workOrder.metadata = {
        ...context.workOrder.metadata,
        playwrightLaunch: {
          channel: launched.channel,
          launchAttempt: launched.launchAttempt,
          fallbackErrors: launched.errors,
        },
      };
    } catch (error: any) {
      return [blockedBrowserResult("playwright", "Launch browser", error.message || String(error))];
    }
    try {
      for (const project of context.workOrder.projects) {
        const checks = checksForProject(project, context.workOrder.acceptanceCriteria);
        let artifactIndex = 0;
        for (let i = 0; i < checks.length; i += 1) {
          if (context.checkFilter && !context.checkFilter(project, checks[i], i)) continue;
          if (browserCheckUsesExistingSession(checks[i])) continue;
          const runs = browserCheckStabilityRuns(checks[i]);
          const groupId = browserStabilityGroupId(project.name, checks[i], i);
          for (let run = 1; run <= runs; run += 1) {
            const result = hasMultiSessionBrowserScenario(checks[i])
              ? await runMultiSessionBrowserCheck(browser, context, project, checks[i], artifactIndex)
              : await runBrowserCheck(browser, context, project, checks[i], artifactIndex);
            artifactIndex += 1;
            results.push(withBrowserCheckExecutionIdentity({
              result: withBrowserStabilityMetadata({ result, groupId, run, runs }),
              workOrder: context.workOrder,
              project,
              checkIndex: i,
              run,
              expectedRuns: runs,
            }));
          }
        }
      }
    } finally {
      try {
        await browser.close();
        if (typeof browser.isConnected === "function" && browser.isConnected()) {
          throw new Error("Playwright browser remained connected after close().");
        }
        if (browserLifecycleResourceId) context.runtime.browserResourceLifecycle?.released(browserLifecycleResourceId);
      } catch (error: any) {
        if (browserLifecycleResourceId) context.runtime.browserResourceLifecycle?.cleanupFailed(browserLifecycleResourceId, error.message || String(error));
      }
    }
    return [...results, ...existingSessionBlocked];
  },
};
