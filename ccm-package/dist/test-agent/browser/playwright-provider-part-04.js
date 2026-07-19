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
exports.PlaywrightBrowserProvider = void 0;
// Behavior-freeze split from playwright-provider.ts (part 4/4).
const path = __importStar(require("path"));
const utils_1 = require("../utils");
const provider_types_1 = require("./provider-types");
const accessibility_snapshot_artifacts_1 = require("./accessibility-snapshot-artifacts");
const failure_screenshots_1 = require("./failure-screenshots");
const multi_session_1 = require("./multi-session");
const session_comparison_1 = require("./session-comparison");
const stability_summary_1 = require("./stability-summary");
const shared_1 = require("./shared");
const authentication_1 = require("./authentication");
const existing_session_1 = require("./existing-session");
const check_execution_coverage_1 = require("./check-execution-coverage");
const action_effects_1 = require("./action-effects");
const playwright_provider_part_01_1 = require("./playwright-provider-part-01");
const playwright_provider_part_02_1 = require("./playwright-provider-part-02");
const playwright_provider_part_03_1 = require("./playwright-provider-part-03");
async function createPlaywrightMultiSessionRuntime(input) {
    const { browser, providerContext, project, check, checkName, session, initialUrl, index, viewport, contextOptions, secretBindings, credentialEnvNames, authenticationConfigured, } = input;
    const { workOrder } = providerContext;
    const sessionName = session.name;
    const sensitiveArtifactsSuppressed = authenticationConfigured
        && (workOrder.options.collectBrowserArtifacts || workOrder.options.collectBrowserVideo);
    const collectBrowserArtifacts = workOrder.options.collectBrowserArtifacts && !authenticationConfigured;
    const collectBrowserVideo = workOrder.options.collectBrowserVideo && !authenticationConfigured;
    const evidenceDir = collectBrowserArtifacts ? (0, utils_1.ensureDir)(path.join(workOrder.options.artifactDir, "browser-artifacts")) : "";
    const downloadDir = (0, utils_1.ensureDir)(path.join(workOrder.options.artifactDir, "browser-artifacts", "downloads"));
    const artifactBase = (0, playwright_provider_part_02_1.browserArtifactBase)(project.name, `${checkName}-${sessionName}`, index);
    const tracePath = collectBrowserArtifacts ? path.join(evidenceDir, `${artifactBase}.trace.zip`) : "";
    const harPath = collectBrowserArtifacts ? path.join(evidenceDir, `${artifactBase}.har`) : "";
    const monitoredOrigins = new Set([(0, playwright_provider_part_02_1.originOf)(project.targetUrl), (0, playwright_provider_part_02_1.originOf)(initialUrl)].filter(Boolean));
    const networkSafetyErrors = [];
    let browserContext = null;
    let lifecycleResourceId = "";
    try {
        const storageStateSource = (0, authentication_1.browserStorageStatePath)(session) ? session : check;
        const loadedStorageState = (0, authentication_1.loadBrowserStorageState)(project, storageStateSource);
        const runtimeContextOptions = {
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
        const authentication = (0, authentication_1.buildBrowserAuthenticationEvidence)({
            credentialEnvNames,
            storageState: loadedStorageState?.evidence,
            sensitiveArtifactsSuppressed,
        });
        browserContext = await browser.newContext({
            viewport: { width: viewport.width, height: viewport.height },
            isMobile: viewport.isMobile,
            deviceScaleFactor: viewport.deviceScaleFactor,
            ...(0, playwright_provider_part_02_1.browserContextLaunchOptions)(runtimeContextOptions),
            acceptDownloads: true,
            ...(collectBrowserArtifacts ? { recordHar: { path: harPath, content: "attach" } } : {}),
            ...(collectBrowserVideo ? { recordVideo: { dir: (0, utils_1.ensureDir)(path.join(workOrder.options.artifactDir, "browser-videos")), size: { width: viewport.width, height: viewport.height } } } : {}),
        });
        lifecycleResourceId = providerContext.runtime.browserResourceLifecycle?.acquire({
            planId: String(workOrder.metadata?.browserCheckExecutionPlan?.planId || ""),
            provider: "playwright",
            resourceType: "browser_context",
            scope: `${project.name}/${checkName}/${sessionName}`,
        }) || "";
        await (0, playwright_provider_part_02_1.grantClipboardPermissions)(browserContext, monitoredOrigins);
        await (0, playwright_provider_part_02_1.grantBrowserContextPermissions)(browserContext, monitoredOrigins, contextOptions.permissions || []);
        let traceStarted = false;
        if (collectBrowserArtifacts && browserContext.tracing?.start) {
            try {
                await browserContext.tracing.start({ screenshots: true, snapshots: true, sources: true });
                traceStarted = true;
            }
            catch { }
        }
        const page = await browserContext.newPage();
        const recordUnsafeRequest = (event) => {
            networkSafetyErrors.push((0, authentication_1.redactBrowserSensitiveText)(`blocked_unsafe_url ${event.error}: ${event.url}`, sessionSecretBindings));
        };
        await (0, playwright_provider_part_02_1.installPlaywrightNetworkSafetyBoundary)(browserContext, page, recordUnsafeRequest);
        browserContext.on?.("page", (childPage) => {
            if (childPage === page)
                return;
            void (0, playwright_provider_part_02_1.installPlaywrightNetworkSafetyBoundary)(browserContext, childPage, recordUnsafeRequest).catch(() => { });
        });
        const runtime = {
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
        page.on("popup", (popup) => {
            const popupRecordIndex = runtime.popups.length;
            const pendingRecord = { url: "", title: "", textPreview: "", openedAt: (0, utils_1.nowIso)() };
            runtime.popups.push(pendingRecord);
            runtime.popupMessages.push((0, playwright_provider_part_01_1.browserPopupLogLine)(pendingRecord));
            const promise = (0, playwright_provider_part_01_1.captureBrowserPopup)(popup, runtime.secretBindings)
                .then(record => {
                runtime.popups[popupRecordIndex] = record;
                runtime.popupMessages[popupRecordIndex] = (0, playwright_provider_part_01_1.browserPopupLogLine)(record);
                return record;
            })
                .catch((error) => {
                pendingRecord.error = (0, authentication_1.redactBrowserSensitiveText)(error.message || String(error), runtime.secretBindings);
                runtime.popupMessages[popupRecordIndex] = (0, playwright_provider_part_01_1.browserPopupLogLine)(pendingRecord);
                return pendingRecord;
            });
            runtime.popupCapturePromises.push(promise);
        });
        page.on("console", (message) => {
            const type = message.type?.() || "console";
            const text = (0, authentication_1.redactBrowserSensitiveText)(message.text?.() || "", runtime.secretBindings);
            runtime.consoleMessages.push(`${type}: ${text}`);
            if (type === "error")
                runtime.consoleErrors.push(text);
        });
        page.on("pageerror", (error) => runtime.pageErrors.push((0, authentication_1.redactBrowserSensitiveText)(error.message || String(error), runtime.secretBindings)));
        page.on("dialog", (dialog) => {
            const record = {
                type: String(dialog.type?.() || "dialog"),
                message: (0, authentication_1.redactBrowserSensitiveText)(String(dialog.message?.() || ""), runtime.secretBindings),
                defaultValue: dialog.defaultValue
                    ? (0, authentication_1.redactBrowserSensitiveText)(String(dialog.defaultValue()), runtime.secretBindings)
                    : undefined,
                accepted: false,
                occurredAt: (0, utils_1.nowIso)(),
            };
            const dialogIndex = runtime.dialogs.length;
            runtime.dialogs.push(record);
            runtime.dialogMessages.push((0, playwright_provider_part_02_1.browserDialogLogLine)(record));
            Promise.resolve(dialog.accept?.())
                .then(() => {
                record.accepted = true;
                runtime.dialogMessages[dialogIndex] = (0, playwright_provider_part_02_1.browserDialogLogLine)(record);
            })
                .catch((error) => {
                record.error = (0, authentication_1.redactBrowserSensitiveText)(error.message || String(error), runtime.secretBindings);
                runtime.dialogMessages[dialogIndex] = (0, playwright_provider_part_02_1.browserDialogLogLine)(record);
            });
        });
        page.on("download", (download) => {
            const downloadIndex = runtime.downloadPromises.length;
            const promise = (0, playwright_provider_part_02_1.savePlaywrightDownload)(download, downloadDir, artifactBase, downloadIndex)
                .then(record => {
                runtime.downloads.push(record);
                return record;
            });
            runtime.downloadPromises.push(promise);
        });
        page.on("request", (request) => {
            runtime.networkRequests.push((0, authentication_1.redactBrowserSensitiveText)(`request ${request.method?.() || "GET"} ${request.url?.() || ""}`, runtime.secretBindings));
            runtime.networkRequests.push((0, playwright_provider_part_02_1.requestDetailsLine)(request, runtime.secretBindings));
        });
        page.on("requestfailed", (request) => {
            const line = (0, authentication_1.redactBrowserSensitiveText)(`failed ${request.method?.() || "GET"} ${request.url?.() || ""}: ${request.failure?.()?.errorText || "request failed"}`, runtime.secretBindings);
            runtime.networkRequests.push(line);
            runtime.networkErrors.push(line);
        });
        page.on("response", (response) => {
            const status = Number(response.status?.() || 0);
            const responseUrl = response.url?.() || "";
            const resourceType = (0, playwright_provider_part_02_1.responseResourceType)(response);
            runtime.networkRequests.push((0, authentication_1.redactBrowserSensitiveText)(`response ${status}${resourceType ? ` ${resourceType}` : ""} ${responseUrl}`, runtime.secretBindings));
            (0, playwright_provider_part_02_1.responseDetailsLine)(response, status, resourceType, responseUrl, runtime.secretBindings)
                .then(detailLine => runtime.networkRequests.push(detailLine))
                .catch(() => { });
            if (resourceType === "document" && status < 400) {
                const origin = (0, playwright_provider_part_02_1.originOf)(responseUrl);
                if (origin)
                    runtime.monitoredOrigins.add(origin);
            }
            const networkError = (0, playwright_provider_part_02_1.playwrightNetworkErrorForResponse)({
                status,
                responseUrl,
                resourceType,
                monitoredOrigins: runtime.monitoredOrigins,
                failOnHttpResourceError: workOrder.options.failOnHttpResourceError,
            });
            if (networkError)
                runtime.networkErrors.push((0, authentication_1.redactBrowserSensitiveText)(networkError, runtime.secretBindings));
        });
        return runtime;
    }
    catch (error) {
        try {
            await browserContext?.close?.();
            if (lifecycleResourceId)
                providerContext.runtime.browserResourceLifecycle?.released(lifecycleResourceId);
        }
        catch (closeError) {
            if (lifecycleResourceId)
                providerContext.runtime.browserResourceLifecycle?.cleanupFailed(lifecycleResourceId, closeError.message || String(closeError));
        }
        throw error;
    }
}
async function finalizePlaywrightMultiSessionRuntime(input) {
    const { runtime, providerContext, project, checkName, index, normalScreenshotRequested, steps } = input;
    const { workOrder } = providerContext;
    const failedStep = steps.find(step => step.status === "failed" && step.name.startsWith(`session:${runtime.name}:`));
    if (failedStep && !normalScreenshotRequested) {
        const failureShots = await (0, failure_screenshots_1.writePlaywrightFailureScreenshot)({
            page: runtime.page,
            artifactDir: workOrder.options.artifactDir,
            projectName: project.name,
            checkName: `${checkName}-${runtime.name}`,
            index,
            failedStep,
        }).catch(() => []);
        runtime.screenshots.push(...failureShots.map(item => item.path));
        runtime.screenshotRefs = [...(runtime.screenshotRefs || []), ...failureShots];
    }
    if (normalScreenshotRequested) {
        try {
            const screenshotDir = (0, utils_1.ensureDir)(path.join(workOrder.options.artifactDir, "screenshots"));
            const screenshotPath = path.join(screenshotDir, `${(0, utils_1.safeSegment)(project.name)}-${(0, utils_1.safeSegment)(checkName)}-${index + 1}-${(0, utils_1.safeSegment)(runtime.name)}.png`);
            await runtime.page.screenshot({ path: screenshotPath, fullPage: true });
            runtime.screenshots.push(screenshotPath);
        }
        catch (error) {
            steps.push((0, multi_session_1.prefixBrowserSessionStep)(runtime.name, {
                kind: "assertion",
                name: "assert:screenshot",
                status: "failed",
                error: (0, authentication_1.redactBrowserSensitiveText)(error.message || String(error), runtime.secretBindings),
            }));
        }
    }
    if (runtime.popupCapturePromises.length)
        await Promise.all(runtime.popupCapturePromises).catch(() => []);
    if (runtime.downloadPromises.length)
        await Promise.all(runtime.downloadPromises).catch(() => []);
    runtime.pageSnapshots.push(...await (0, playwright_provider_part_02_1.writePlaywrightPageSnapshots)(runtime.page, workOrder.options.artifactDir, project.name, `${checkName}-${runtime.name}`, index, runtime.secretBindings).catch(() => []));
    runtime.browserArtifacts.push(...await (0, accessibility_snapshot_artifacts_1.writePlaywrightAccessibilitySnapshotArtifact)(runtime.page, workOrder.options.artifactDir, project.name, `${checkName}-${runtime.name}`, index, value => (0, authentication_1.redactBrowserSensitiveText)(value, runtime.secretBindings)).catch(() => []));
    runtime.browserArtifacts.push(...(0, playwright_provider_part_02_1.downloadArtifacts)(runtime.downloads));
    const finalState = await (0, playwright_provider_part_01_1.capturePageFinalState)(runtime.page, runtime.secretBindings);
    const telemetryLogs = (0, playwright_provider_part_02_1.writeBrowserTelemetryLogs)({
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
    runtime.browserArtifacts.push(...await (0, playwright_provider_part_02_1.finalizePlaywrightBrowserArtifacts)({
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
    };
}
async function runPlaywrightMultiSessionAction(input) {
    const { runtime, project, action, actionIndex, timeout } = input;
    const effectRuntime = input.effectRuntime || runtime;
    const verifyEffect = (0, action_effects_1.browserActionEffectRequired)(action);
    const beforeObservation = verifyEffect
        ? await (0, playwright_provider_part_01_1.capturePlaywrightActionEffectObservation)(effectRuntime.page, effectRuntime).catch(() => ({}))
        : {};
    const actionStep = (0, multi_session_1.prefixBrowserSessionStep)(runtime.name, (0, playwright_provider_part_01_1.redactBrowserStepResult)(await (0, playwright_provider_part_03_1.runAction)(runtime.page, project, action, timeout), runtime.secretBindings));
    const steps = [actionStep];
    if (actionStep.status === "failed" || !verifyEffect)
        return { steps };
    const verified = await (0, action_effects_1.verifyBrowserActionEffect)({
        provider: "playwright",
        action,
        actionIndex,
        session: runtime.name,
        ...(effectRuntime.name !== runtime.name ? { effectSession: effectRuntime.name } : {}),
        defaultTimeout: timeout,
        beforeObservation,
        capture: () => (0, playwright_provider_part_01_1.capturePlaywrightActionEffectObservation)(effectRuntime.page, effectRuntime),
    });
    steps.push((0, multi_session_1.prefixBrowserSessionStep)(runtime.name, (0, playwright_provider_part_01_1.redactBrowserStepResult)(verified.step, runtime.secretBindings)));
    return {
        steps,
        effect: verified.evidence,
    };
}
async function runMultiSessionBrowserCheck(browser, context, project, check, index) {
    const startedAt = (0, utils_1.nowIso)();
    const started = Date.now();
    const name = check.name || `Multi-session browser check ${index + 1}`;
    const timeout = Number(check.timeoutMs || check.timeout_ms || context.workOrder.options.browserTimeoutMs);
    const viewport = (0, playwright_provider_part_02_1.browserCheckViewport)(check);
    const contextOptions = (0, playwright_provider_part_02_1.browserCheckContextOptions)(check);
    const normalScreenshotRequested = check.screenshot !== false || (0, utils_1.hasRequiredCheck)(context.workOrder.requiredChecks, /screenshot/i);
    const steps = [];
    const runtimes = [];
    const browserSessions = [];
    const browserSessionComparisons = [];
    const actionEffects = [];
    let nextActionIndex = 0;
    const credentialEnvNames = (0, authentication_1.browserCheckAuthenticationEnvNames)(check);
    const authenticationConfigured = credentialEnvNames.length > 0 || (0, authentication_1.browserCheckHasStorageState)(check);
    const sensitiveArtifactsSuppressed = authenticationConfigured
        && (context.workOrder.options.collectBrowserArtifacts || context.workOrder.options.collectBrowserVideo);
    let secretBindings = [];
    let authentication = (0, authentication_1.buildBrowserAuthenticationEvidence)({
        credentialEnvNames,
        sensitiveArtifactsSuppressed,
    });
    let infrastructureError = "";
    const validationErrors = (0, multi_session_1.validateMultiSessionBrowserScenario)(check);
    if (validationErrors.length)
        infrastructureError = validationErrors.join(" ");
    try {
        if (!infrastructureError) {
            secretBindings = (0, authentication_1.resolveBrowserSecretBindings)(project, (0, authentication_1.browserCheckAuthenticationActions)(check));
            for (const session of check.sessions || []) {
                const initialUrl = (0, utils_1.resolveUrl)(project.targetUrl, (0, multi_session_1.browserSessionInitialUrl)(session, check.url || project.targetUrl));
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
                    credentialEnvNames: (0, authentication_1.browserAuthenticationEnvNames)((0, authentication_1.browserSessionAuthenticationActions)(check, session)),
                    authenticationConfigured,
                });
                runtimes.push(runtime);
            }
            authentication = (0, authentication_1.buildBrowserAuthenticationEvidence)({
                credentialEnvNames,
                storageState: (0, authentication_1.browserStorageStatePath)(check)
                    ? runtimes.find(runtime => runtime.authentication?.storageState)?.authentication?.storageState
                    : undefined,
                sensitiveArtifactsSuppressed,
            });
            for (const session of check.sessions || []) {
                const runtime = runtimes.find(item => item.name.toLowerCase() === session.name.toLowerCase());
                const setupActions = [
                    { type: "goto", url: runtime.initialUrl, waitUntil: "domcontentloaded" },
                    ...(session.setupActions || session.setup_actions || []),
                ];
                for (const action of setupActions) {
                    const effectSession = (0, action_effects_1.browserActionEffectSession)(action);
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
                    if (executed.effect)
                        actionEffects.push(executed.effect);
                    if (executed.steps.some(step => step.status === "failed"))
                        break;
                }
                if (steps.some(step => step.status === "failed"))
                    break;
            }
            if (!steps.some(step => step.status === "failed")) {
                const runScenarioStep = async (scenarioStep, actionIndex) => {
                    const runtime = runtimes.find(item => item.name.toLowerCase() === scenarioStep.session.toLowerCase());
                    if (scenarioStep.action) {
                        const effectSession = (0, action_effects_1.browserActionEffectSession)(scenarioStep.action);
                        const effectRuntime = effectSession
                            ? runtimes.find(item => item.name.toLowerCase() === effectSession.toLowerCase())
                            : runtime;
                        return runPlaywrightMultiSessionAction({
                            runtime,
                            effectRuntime,
                            project,
                            action: scenarioStep.action,
                            actionIndex: actionIndex,
                            timeout,
                        });
                    }
                    const step = await (0, playwright_provider_part_03_1.runAssertion)(runtime.page, scenarioStep.assertion, runtime, timeout);
                    return {
                        steps: [(0, multi_session_1.prefixBrowserSessionStep)(runtime.name, (0, playwright_provider_part_01_1.redactBrowserStepResult)(step, runtime.secretBindings))],
                    };
                };
                let parallelGroupIndex = 0;
                for (const scenarioStep of (0, multi_session_1.browserSessionSteps)(check)) {
                    const isParallel = (0, multi_session_1.isBrowserSessionParallelStep)(scenarioStep);
                    const isComparison = (0, multi_session_1.isBrowserSessionComparisonStep)(scenarioStep);
                    if (isParallel)
                        parallelGroupIndex += 1;
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
                        if (executedSteps.some(step => step.status === "failed"))
                            break;
                        continue;
                    }
                    if (isComparison) {
                        const left = runtimes.find(item => item.name.toLowerCase() === scenarioStep.compare.leftSession.toLowerCase());
                        const right = runtimes.find(item => item.name.toLowerCase() === scenarioStep.compare.rightSession.toLowerCase());
                        const comparison = await (0, session_comparison_1.runBrowserSessionComparison)({
                            spec: scenarioStep.compare,
                            left,
                            right,
                            defaultTimeoutMs: timeout,
                        });
                        browserSessionComparisons.push(comparison.result);
                        const comparisonStep = (0, multi_session_1.prefixBrowserSessionStep)(left.name, (0, playwright_provider_part_01_1.redactBrowserStepResult)(comparison.step, secretBindings));
                        steps.push(comparisonStep);
                        if (comparisonStep.status === "failed")
                            break;
                        continue;
                    }
                    const execution = await runScenarioStep(scenarioStep, scenarioStep.action ? nextActionIndex++ : undefined);
                    steps.push(...execution.steps);
                    if (execution.effect)
                        actionEffects.push(execution.effect);
                    if (execution.steps.some(step => step.status === "failed"))
                        break;
                }
            }
            for (const runtime of runtimes) {
                const sessionAssertions = (0, multi_session_1.flattenBrowserSessionSteps)(check)
                    .filter(multi_session_1.isBrowserSessionLeafStep)
                    .filter(step => step.session.toLowerCase() === runtime.name.toLowerCase())
                    .map(step => step.assertion)
                    .filter(Boolean);
                if (context.workOrder.options.failOnConsoleError && runtime.consoleErrors.length && !sessionAssertions.some(item => item.type === "consoleNoErrors")) {
                    steps.push((0, multi_session_1.prefixBrowserSessionStep)(runtime.name, { kind: "assertion", name: "assert:consoleNoErrors", status: "failed", error: runtime.consoleErrors.slice(0, 3).join(" | ") }));
                }
                if (runtime.networkErrors.length && !sessionAssertions.some(item => item.type === "networkNoErrors")) {
                    steps.push((0, multi_session_1.prefixBrowserSessionStep)(runtime.name, { kind: "assertion", name: "assert:networkNoErrors", status: "failed", error: runtime.networkErrors.slice(0, 3).join(" | ") }));
                }
                if (runtime.pageErrors.length) {
                    steps.push((0, multi_session_1.prefixBrowserSessionStep)(runtime.name, { kind: "assertion", name: "assert:pageErrors", status: "failed", error: runtime.pageErrors.slice(0, 3).join(" | ") }));
                }
            }
        }
    }
    catch (error) {
        infrastructureError = (0, authentication_1.redactBrowserSensitiveText)(error.message || String(error), secretBindings);
    }
    for (const runtime of runtimes) {
        try {
            browserSessions.push(await finalizePlaywrightMultiSessionRuntime({ runtime, providerContext: context, project, checkName: name, index, normalScreenshotRequested, steps }));
        }
        catch (error) {
            infrastructureError ||= error.message || String(error);
            try {
                await runtime.browserContext?.close?.();
                if (runtime.lifecycleResourceId)
                    context.runtime.browserResourceLifecycle?.released(runtime.lifecycleResourceId);
            }
            catch (closeError) {
                if (runtime.lifecycleResourceId)
                    context.runtime.browserResourceLifecycle?.cleanupFailed(runtime.lifecycleResourceId, closeError.message || String(closeError));
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
    const screenshotRefs = browserSessions.flatMap(session => session.screenshotRefs || []);
    const pageSnapshots = browserSessions.flatMap(session => session.pageSnapshots || []);
    const browserArtifacts = browserSessions.flatMap(session => session.browserArtifacts || []);
    const firstSession = browserSessions[0];
    const failed = steps.some(step => step.status === "failed");
    const status = infrastructureError ? "blocked" : failed ? "failed" : "passed";
    return {
        provider: "playwright",
        project: project.name,
        name,
        url: firstSession?.url || (0, utils_1.resolveUrl)(project.targetUrl, check.url || project.targetUrl),
        ...(firstSession?.finalUrl ? { finalUrl: firstSession.finalUrl } : {}),
        ...(firstSession?.title ? { title: firstSession.title } : {}),
        pageTextPreview: (0, utils_1.compactText)(browserSessions.map(session => `[${session.name}]\n${session.pageTextPreview || ""}`).join("\n\n"), 4000),
        viewport,
        contextOptions,
        authentication,
        status,
        startedAt,
        finishedAt: (0, utils_1.nowIso)(),
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
        probeType: check.probeType || check.probe_type || multi_session_1.MULTI_SESSION_BROWSER_PROBE_TYPE,
        context: { ...(check.context || {}), ...(0, multi_session_1.browserSessionScenarioMetadata)(check) },
        ...(infrastructureError ? { error: (0, authentication_1.redactBrowserSensitiveText)(infrastructureError, secretBindings) } : {}),
    };
}
exports.PlaywrightBrowserProvider = {
    id: "playwright",
    label: "Playwright",
    async availability() {
        return (0, playwright_provider_part_01_1.checkPlaywrightAvailability)();
    },
    async run(context) {
        const routedChecks = context.workOrder.projects.flatMap(project => (0, shared_1.checksForProject)(project, context.workOrder.acceptanceCriteria)
            .map((check, index) => ({ project, check, index }))
            .filter(item => !context.checkFilter || context.checkFilter(item.project, item.check, item.index)));
        if (!routedChecks.length)
            return [];
        const existingSessionChecks = routedChecks.filter(item => (0, existing_session_1.browserCheckUsesExistingSession)(item.check));
        const executableChecks = routedChecks.filter(item => !(0, existing_session_1.browserCheckUsesExistingSession)(item.check));
        const existingSessionBlocked = existingSessionChecks.map(({ project, check, index }) => {
            const name = check.name || `Browser check ${index + 1}`;
            const result = (0, provider_types_1.blockedBrowserResult)("playwright", name, `Browser check "${name}" requires an existing authenticated Chrome session. Playwright launches an isolated browser profile; use the Claude in Chrome or Chrome DevTools MCP provider.`);
            result.project = project.name;
            result.url = (0, utils_1.resolveUrl)(project.targetUrl, check.url || project.targetUrl);
            result.adversarial = check.adversarial === true;
            result.probeType = check.probeType || check.probe_type;
            result.context = check.context;
            return (0, check_execution_coverage_1.withBrowserCheckExecutionIdentity)({
                result,
                workOrder: context.workOrder,
                project,
                checkIndex: index,
            });
        });
        if (!executableChecks.length)
            return existingSessionBlocked;
        let playwright;
        try {
            playwright = require("playwright");
        }
        catch (error) {
            return [(0, provider_types_1.blockedBrowserResult)("playwright", "Load Playwright", `Playwright is unavailable: ${error.message || String(error)}`)];
        }
        const results = [];
        let browser;
        let browserLifecycleResourceId = "";
        try {
            const launched = await (0, playwright_provider_part_01_1.launchChromiumWithFallback)(playwright, { headless: true });
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
        }
        catch (error) {
            return [(0, provider_types_1.blockedBrowserResult)("playwright", "Launch browser", error.message || String(error))];
        }
        try {
            for (const project of context.workOrder.projects) {
                const checks = (0, shared_1.checksForProject)(project, context.workOrder.acceptanceCriteria);
                let artifactIndex = 0;
                for (let i = 0; i < checks.length; i += 1) {
                    if (context.checkFilter && !context.checkFilter(project, checks[i], i))
                        continue;
                    if ((0, existing_session_1.browserCheckUsesExistingSession)(checks[i]))
                        continue;
                    const runs = (0, stability_summary_1.browserCheckStabilityRuns)(checks[i]);
                    const groupId = (0, stability_summary_1.browserStabilityGroupId)(project.name, checks[i], i);
                    for (let run = 1; run <= runs; run += 1) {
                        const result = (0, multi_session_1.hasMultiSessionBrowserScenario)(checks[i])
                            ? await runMultiSessionBrowserCheck(browser, context, project, checks[i], artifactIndex)
                            : await (0, playwright_provider_part_03_1.runBrowserCheck)(browser, context, project, checks[i], artifactIndex);
                        artifactIndex += 1;
                        results.push((0, check_execution_coverage_1.withBrowserCheckExecutionIdentity)({
                            result: (0, stability_summary_1.withBrowserStabilityMetadata)({ result, groupId, run, runs }),
                            workOrder: context.workOrder,
                            project,
                            checkIndex: i,
                            run,
                            expectedRuns: runs,
                        }));
                    }
                }
            }
        }
        finally {
            try {
                await browser.close();
                if (typeof browser.isConnected === "function" && browser.isConnected()) {
                    throw new Error("Playwright browser remained connected after close().");
                }
                if (browserLifecycleResourceId)
                    context.runtime.browserResourceLifecycle?.released(browserLifecycleResourceId);
            }
            catch (error) {
                if (browserLifecycleResourceId)
                    context.runtime.browserResourceLifecycle?.cleanupFailed(browserLifecycleResourceId, error.message || String(error));
            }
        }
        return [...results, ...existingSessionBlocked];
    },
};
//# sourceMappingURL=playwright-provider-part-04.js.map