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
exports.checkPlaywrightAvailability = checkPlaywrightAvailability;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const utils_1 = require("../utils");
const provider_types_1 = require("./provider-types");
const semantic_locator_1 = require("./semantic-locator");
const shared_1 = require("./shared");
const PLAYWRIGHT_LAUNCH_ATTEMPTS = [
    { label: "bundled-chromium", options: {} },
    { label: "msedge-channel", options: { channel: "msedge" } },
    { label: "chrome-channel", options: { channel: "chrome" } },
];
async function launchChromiumWithFallback(playwright, baseOptions = {}) {
    const errors = [];
    for (const attempt of PLAYWRIGHT_LAUNCH_ATTEMPTS) {
        try {
            const browser = await playwright.chromium.launch({
                ...baseOptions,
                ...attempt.options,
            });
            return {
                browser,
                channel: attempt.options.channel || "bundled",
                launchAttempt: attempt.label,
                errors,
            };
        }
        catch (error) {
            errors.push(`${attempt.label}: ${error.message || String(error)}`);
        }
    }
    throw new Error(errors.join(" | "));
}
async function checkPlaywrightAvailability(loadPlaywright = () => require("playwright")) {
    let playwright;
    try {
        playwright = loadPlaywright();
    }
    catch (error) {
        return {
            available: false,
            reason: `Playwright is unavailable: ${error.message || String(error)}`,
            diagnostics: {
                packageAvailable: false,
                launchChecked: false,
            },
        };
    }
    let browser;
    try {
        const launched = await launchChromiumWithFallback(playwright, { headless: true, timeout: 10_000 });
        browser = launched.browser;
        return {
            available: true,
            diagnostics: {
                packageAvailable: true,
                launchChecked: true,
                browser: "chromium",
                channel: launched.channel,
                launchAttempt: launched.launchAttempt,
                launchFallbackErrors: launched.errors,
            },
        };
    }
    catch (error) {
        return {
            available: false,
            reason: `Playwright Chromium launch failed: ${error.message || String(error)}`,
            diagnostics: {
                packageAvailable: true,
                launchChecked: true,
                browser: "chromium",
                launchAttempts: PLAYWRIGHT_LAUNCH_ATTEMPTS.map(attempt => attempt.label),
            },
        };
    }
    finally {
        try {
            await browser?.close?.();
        }
        catch { }
    }
}
function expectedValue(assertion) {
    return assertion.value !== undefined ? assertion.value : assertion.text;
}
function valuesEqual(actual, expected) {
    if (actual === expected)
        return true;
    if (typeof actual === "number" && String(actual) === String(expected))
        return true;
    if (typeof actual === "boolean" && String(actual) === String(expected).toLowerCase())
        return true;
    try {
        return JSON.stringify(actual) === JSON.stringify(expected);
    }
    catch {
        return String(actual) === String(expected);
    }
}
function stateAssertionDetail(assertion) {
    if (assertion.expression)
        return `expression=${assertion.expression}`;
    if (assertion.key)
        return `key=${assertion.key}`;
    return (0, semantic_locator_1.browserTargetDetail)(assertion) || assertion.value || assertion.text || "";
}
async function capturePageFinalState(page) {
    if (!page)
        return {};
    let finalUrl = "";
    let title = "";
    let pageText = "";
    try {
        finalUrl = String(page.url?.() || "");
    }
    catch { }
    try {
        title = String(await page.title?.() || "");
    }
    catch { }
    try {
        const body = page.locator?.("body");
        pageText = body ? String(await body.innerText({ timeout: 1_000 }) || "") : "";
    }
    catch { }
    return {
        ...(finalUrl ? { finalUrl } : {}),
        ...(title ? { title: (0, utils_1.compactText)(title, 500) } : {}),
        ...(pageText ? { pageTextPreview: (0, utils_1.compactText)(pageText, 2000) } : {}),
    };
}
async function writePlaywrightPageSnapshots(page, artifactDir, projectName, checkName, index) {
    if (!page)
        return [];
    const snapshotDir = (0, utils_1.ensureDir)(path.join(artifactDir, "page-snapshots"));
    const base = `${(0, utils_1.safeSegment)(projectName)}-${(0, utils_1.safeSegment)(checkName)}-${index + 1}`;
    const snapshots = [];
    try {
        const html = String(await page.content?.() || "");
        if (html) {
            const htmlPath = path.join(snapshotDir, `${base}.html`);
            fs.writeFileSync(htmlPath, html, "utf-8");
            snapshots.push(htmlPath);
        }
    }
    catch { }
    try {
        const body = page.locator?.("body");
        const text = body ? String(await body.innerText({ timeout: 1_000 }) || "") : "";
        if (text) {
            const textPath = path.join(snapshotDir, `${base}.txt`);
            fs.writeFileSync(textPath, `${text}\n`, "utf-8");
            snapshots.push(textPath);
        }
    }
    catch { }
    return snapshots;
}
function writeBrowserTelemetryLogs(input) {
    const telemetryDir = (0, utils_1.ensureDir)(path.join(input.artifactDir, "browser-telemetry"));
    const base = `${(0, utils_1.safeSegment)(input.projectName)}-${(0, utils_1.safeSegment)(input.checkName)}-${input.index + 1}`;
    const consoleLogPath = path.join(telemetryDir, `${base}.console.log`);
    const networkLogPath = path.join(telemetryDir, `${base}.network.log`);
    fs.writeFileSync(consoleLogPath, `${input.consoleMessages.length ? input.consoleMessages.join("\n") : "(none observed)"}\n`, "utf-8");
    fs.writeFileSync(networkLogPath, `${input.networkRequests.length ? input.networkRequests.join("\n") : "(none observed)"}\n`, "utf-8");
    return { consoleLogPath, networkLogPath };
}
function browserArtifactBase(projectName, checkName, index) {
    return `${(0, utils_1.safeSegment)(projectName)}-${(0, utils_1.safeSegment)(checkName)}-${index + 1}`;
}
function browserEvidenceArtifact(type, title, artifactPath, source, mediaType = "") {
    if (!artifactPath || !fs.existsSync(artifactPath))
        return null;
    return {
        type,
        title,
        path: artifactPath,
        source,
        ...(mediaType ? { mediaType } : {}),
    };
}
async function finalizePlaywrightBrowserArtifacts(input) {
    const artifacts = [];
    let video = null;
    try {
        video = input.collectVideo ? input.page?.video?.() : null;
    }
    catch { }
    if (input.traceStarted) {
        try {
            await input.browserContext?.tracing?.stop?.({ path: input.tracePath });
        }
        catch { }
    }
    try {
        await input.browserContext?.close?.();
    }
    catch { }
    const trace = browserEvidenceArtifact("trace", "Playwright trace", input.tracePath, "playwright:tracing", "application/zip");
    const har = browserEvidenceArtifact("har", "Playwright HAR", input.harPath, "playwright:recordHar", "application/json");
    if (trace)
        artifacts.push(trace);
    if (har)
        artifacts.push(har);
    if (video) {
        try {
            const videoPath = await video.path();
            const videoArtifact = browserEvidenceArtifact("video", "Playwright video", videoPath, "playwright:recordVideo", "video/webm");
            if (videoArtifact)
                artifacts.push(videoArtifact);
        }
        catch { }
    }
    return artifacts;
}
async function runAction(page, project, action, defaultTimeout) {
    const timeout = Number(action.timeoutMs || action.timeout_ms || defaultTimeout);
    const name = `action:${action.type}`;
    try {
        if (action.type === "goto") {
            const url = (0, utils_1.resolveUrl)(project.targetUrl, action.url || "");
            await page.goto(url, { waitUntil: action.waitUntil || "domcontentloaded", timeout });
        }
        else if (action.type === "reload") {
            await page.reload({ waitUntil: action.waitUntil || "domcontentloaded", timeout });
        }
        else if (action.type === "goBack") {
            await page.goBack({ waitUntil: action.waitUntil || "domcontentloaded", timeout });
        }
        else if (action.type === "goForward") {
            await page.goForward({ waitUntil: action.waitUntil || "domcontentloaded", timeout });
        }
        else if (action.type === "click") {
            await (0, semantic_locator_1.resolvePlaywrightLocator)(page, action).click({ timeout });
        }
        else if (action.type === "fill") {
            await (0, semantic_locator_1.resolvePlaywrightLocator)(page, action).fill(String(action.value ?? action.text ?? ""), { timeout });
        }
        else if (action.type === "selectOption") {
            await (0, semantic_locator_1.resolvePlaywrightLocator)(page, action).selectOption(String(action.value ?? action.text ?? ""), { timeout });
        }
        else if (action.type === "check") {
            await (0, semantic_locator_1.resolvePlaywrightLocator)(page, action).check({ timeout });
        }
        else if (action.type === "uncheck") {
            await (0, semantic_locator_1.resolvePlaywrightLocator)(page, action).uncheck({ timeout });
        }
        else if (action.type === "hover") {
            await (0, semantic_locator_1.resolvePlaywrightLocator)(page, action).hover({ timeout });
        }
        else if (action.type === "press") {
            const key = String(action.key || "Enter");
            const locatorPlan = (0, semantic_locator_1.buildSemanticLocatorPlan)(action);
            if (locatorPlan)
                await (0, semantic_locator_1.resolvePlaywrightLocator)(page, action).press(key, { timeout });
            else
                await page.keyboard.press(key);
        }
        else if (action.type === "waitForSelector") {
            await (0, semantic_locator_1.resolvePlaywrightLocator)(page, action).waitFor({ state: "visible", timeout });
        }
        else if (action.type === "waitForText") {
            await page.getByText(String(action.text || action.value || "")).first().waitFor({ state: "visible", timeout });
        }
        else if (action.type === "waitForTimeout") {
            await page.waitForTimeout(Math.min(timeout, Number(action.value || action.text || 1000)));
        }
        else if (action.type === "evaluate") {
            await page.evaluate(String(action.text || action.value || "undefined"));
        }
        return { kind: "action", name, status: "passed", detail: (0, semantic_locator_1.browserTargetDetail)(action) };
    }
    catch (error) {
        return { kind: "action", name, status: "failed", detail: (0, semantic_locator_1.browserTargetDetail)(action), error: error.message || String(error) };
    }
}
async function runAssertion(page, assertion, signals, defaultTimeout) {
    const timeout = Number(assertion.timeoutMs || assertion.timeout_ms || defaultTimeout);
    const name = `assert:${assertion.type}`;
    try {
        if (assertion.type === "visible") {
            await (0, semantic_locator_1.resolvePlaywrightLocator)(page, assertion).waitFor({ state: "visible", timeout });
        }
        else if (assertion.type === "notVisible") {
            const visible = await (0, semantic_locator_1.resolvePlaywrightLocator)(page, assertion).first().isVisible({ timeout }).catch(() => false);
            if (visible)
                throw new Error(`Expected target to be hidden: ${(0, semantic_locator_1.browserTargetDetail)(assertion)}`);
        }
        else if (assertion.type === "text") {
            await page.getByText(String(assertion.text || assertion.value || "")).first().waitFor({ state: "visible", timeout });
        }
        else if (assertion.type === "urlIncludes") {
            const value = String(assertion.value || assertion.text || "");
            if (!page.url().includes(value))
                throw new Error(`Expected URL to include "${value}", got "${page.url()}".`);
        }
        else if (assertion.type === "titleIncludes") {
            const value = String(assertion.value || assertion.text || "");
            const title = await page.title();
            if (!title.includes(value))
                throw new Error(`Expected title to include "${value}", got "${title}".`);
        }
        else if (assertion.type === "elementTextIncludes") {
            const value = String(assertion.value || assertion.text || "");
            const actual = await (0, semantic_locator_1.resolvePlaywrightLocator)(page, assertion).first().innerText({ timeout });
            if (!actual.includes(value))
                throw new Error(`Expected element text to include "${value}", got "${actual}".`);
        }
        else if (assertion.type === "consoleNoErrors") {
            if (signals.consoleErrors.length)
                throw new Error(`Console errors observed: ${signals.consoleErrors.slice(0, 3).join(" | ")}`);
        }
        else if (assertion.type === "networkNoErrors") {
            if (signals.networkErrors.length)
                throw new Error(`Network errors observed: ${signals.networkErrors.slice(0, 3).join(" | ")}`);
        }
        else if (assertion.type === "jsTruthy") {
            const expression = assertion.expression || assertion.text || assertion.value || "";
            if (!expression)
                throw new Error("jsTruthy requires expression/text/value.");
            const actual = await page.evaluate(expression);
            if (!actual)
                throw new Error(`Expected JS expression to be truthy, got ${JSON.stringify(actual)}.`);
        }
        else if (assertion.type === "jsEquals") {
            const expression = assertion.expression || assertion.text || "";
            if (!expression)
                throw new Error("jsEquals requires expression/text.");
            const actual = await page.evaluate(expression);
            const expected = expectedValue(assertion);
            if (!valuesEqual(actual, expected))
                throw new Error(`Expected JS expression to equal ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}.`);
        }
        else if (assertion.type === "localStorageEquals" || assertion.type === "localStorageIncludes" || assertion.type === "sessionStorageEquals" || assertion.type === "sessionStorageIncludes") {
            const key = assertion.key || assertion.text || "";
            if (!key)
                throw new Error(`${assertion.type} requires key/text.`);
            const storageName = assertion.type.startsWith("local") ? "localStorage" : "sessionStorage";
            const actual = await page.evaluate(({ storageName, key }) => globalThis[storageName].getItem(key), { storageName, key });
            const expected = expectedValue(assertion);
            const passed = assertion.type.endsWith("Equals")
                ? valuesEqual(actual, expected)
                : String(actual ?? "").includes(String(expected ?? ""));
            if (!passed)
                throw new Error(`Expected ${storageName}.${key} to ${assertion.type.endsWith("Equals") ? "equal" : "include"} ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}.`);
        }
        return { kind: "assertion", name, status: "passed", detail: stateAssertionDetail(assertion) };
    }
    catch (error) {
        return { kind: "assertion", name, status: "failed", detail: stateAssertionDetail(assertion), error: error.message || String(error) };
    }
}
async function runBrowserCheck(browser, context, project, check, index) {
    const { workOrder } = context;
    const startedAt = (0, utils_1.nowIso)();
    const started = Date.now();
    const timeout = Number(check.timeoutMs || check.timeout_ms || workOrder.options.browserTimeoutMs);
    const screenshots = [];
    const consoleMessages = [];
    const consoleErrors = [];
    const pageErrors = [];
    const networkRequests = [];
    const networkErrors = [];
    const pageSnapshots = [];
    const browserArtifacts = [];
    const steps = [];
    const name = check.name || `Browser check ${index + 1}`;
    const url = (0, utils_1.resolveUrl)(project.targetUrl, check.url || project.targetUrl);
    let page = null;
    let browserContext = null;
    let traceStarted = false;
    const collectBrowserArtifacts = workOrder.options.collectBrowserArtifacts;
    const collectBrowserVideo = workOrder.options.collectBrowserVideo;
    const evidenceDir = collectBrowserArtifacts ? (0, utils_1.ensureDir)(path.join(workOrder.options.artifactDir, "browser-artifacts")) : "";
    const artifactBase = browserArtifactBase(project.name, name, index);
    const tracePath = collectBrowserArtifacts ? path.join(evidenceDir, `${artifactBase}.trace.zip`) : "";
    const harPath = collectBrowserArtifacts ? path.join(evidenceDir, `${artifactBase}.har`) : "";
    try {
        browserContext = await browser.newContext({
            viewport: { width: 1366, height: 900 },
            ...(collectBrowserArtifacts ? { recordHar: { path: harPath, content: "attach" } } : {}),
            ...(collectBrowserVideo ? { recordVideo: { dir: (0, utils_1.ensureDir)(path.join(workOrder.options.artifactDir, "browser-videos")), size: { width: 1366, height: 900 } } } : {}),
        });
        if (collectBrowserArtifacts && browserContext.tracing?.start) {
            try {
                await browserContext.tracing.start({ screenshots: true, snapshots: true, sources: true });
                traceStarted = true;
            }
            catch { }
        }
        page = await browserContext.newPage();
        page.on("console", (message) => {
            const type = message.type?.() || "console";
            const text = message.text?.() || "";
            const line = `${type}: ${text}`;
            consoleMessages.push(line);
            if (type === "error")
                consoleErrors.push(text);
        });
        page.on("pageerror", (error) => pageErrors.push(error.message || String(error)));
        page.on("request", (request) => networkRequests.push(`request ${request.method?.() || "GET"} ${request.url?.() || ""}`));
        page.on("requestfailed", (request) => {
            const line = `failed ${request.method?.() || "GET"} ${request.url?.() || ""}: ${request.failure?.()?.errorText || "request failed"}`;
            networkRequests.push(line);
            networkErrors.push(line);
        });
        page.on("response", (response) => {
            const status = Number(response.status?.() || 0);
            const line = `response ${status} ${response.url?.() || ""}`;
            networkRequests.push(line);
            if (status >= 500)
                networkErrors.push(`${status} ${response.url?.() || ""}`);
        });
        const actions = check.actions?.length ? check.actions : [{ type: "goto", url, waitUntil: "domcontentloaded" }];
        for (const action of actions) {
            const step = await runAction(page, project, action, timeout);
            steps.push(step);
            if (step.status === "failed")
                break;
        }
        if (!steps.some(step => step.status === "failed")) {
            for (const assertion of check.assertions || []) {
                const step = await runAssertion(page, assertion, { consoleErrors, networkErrors }, timeout);
                steps.push(step);
            }
        }
        if (workOrder.options.failOnConsoleError && consoleErrors.length && !(check.assertions || []).some(item => item.type === "consoleNoErrors")) {
            steps.push({ kind: "assertion", name: "assert:consoleNoErrors", status: "failed", error: consoleErrors.slice(0, 3).join(" | ") });
        }
        if (networkErrors.length && !(check.assertions || []).some(item => item.type === "networkNoErrors")) {
            steps.push({ kind: "assertion", name: "assert:networkNoErrors", status: "failed", error: networkErrors.slice(0, 3).join(" | ") });
        }
        if (pageErrors.length) {
            steps.push({ kind: "assertion", name: "assert:pageErrors", status: "failed", error: pageErrors.slice(0, 3).join(" | ") });
        }
        if (check.screenshot !== false || (0, utils_1.hasRequiredCheck)(workOrder.requiredChecks, /screenshot/i)) {
            const screenshotDir = (0, utils_1.ensureDir)(path.join(workOrder.options.artifactDir, "screenshots"));
            const screenshotPath = path.join(screenshotDir, `${(0, utils_1.safeSegment)(project.name)}-${(0, utils_1.safeSegment)(name)}-${index + 1}.png`);
            await page.screenshot({ path: screenshotPath, fullPage: true });
            screenshots.push(screenshotPath);
        }
        pageSnapshots.push(...await writePlaywrightPageSnapshots(page, workOrder.options.artifactDir, project.name, name, index));
        const finalState = await capturePageFinalState(page);
        const telemetryLogs = writeBrowserTelemetryLogs({
            artifactDir: workOrder.options.artifactDir,
            projectName: project.name,
            checkName: name,
            index,
            consoleMessages,
            networkRequests,
        });
        browserArtifacts.push(...await finalizePlaywrightBrowserArtifacts({
            browserContext,
            page,
            traceStarted,
            tracePath,
            harPath,
            collectVideo: collectBrowserVideo,
        }));
        const failed = steps.some(step => step.status === "failed");
        return {
            provider: "playwright",
            project: project.name,
            name,
            url,
            ...finalState,
            status: failed ? "failed" : "passed",
            startedAt,
            finishedAt: (0, utils_1.nowIso)(),
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
            ...telemetryLogs,
            adversarial: check.adversarial === true,
            probeType: check.probeType || check.probe_type,
        };
    }
    catch (error) {
        const finalState = await capturePageFinalState(page);
        pageSnapshots.push(...await writePlaywrightPageSnapshots(page, context.workOrder.options.artifactDir, project.name, name, index).catch(() => []));
        const telemetryLogs = writeBrowserTelemetryLogs({
            artifactDir: context.workOrder.options.artifactDir,
            projectName: project.name,
            checkName: name,
            index,
            consoleMessages,
            networkRequests,
        });
        if (browserContext) {
            browserArtifacts.push(...await finalizePlaywrightBrowserArtifacts({
                browserContext,
                page,
                traceStarted,
                tracePath,
                harPath,
                collectVideo: collectBrowserVideo,
            }));
        }
        else {
            try {
                await page?.context?.().close?.();
            }
            catch { }
        }
        return {
            provider: "playwright",
            project: project.name,
            name,
            url,
            ...finalState,
            status: "blocked",
            startedAt,
            finishedAt: (0, utils_1.nowIso)(),
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
            ...telemetryLogs,
            adversarial: check.adversarial === true,
            probeType: check.probeType || check.probe_type,
            error: error.message || String(error),
        };
    }
}
exports.PlaywrightBrowserProvider = {
    id: "playwright",
    label: "Playwright",
    async availability() {
        return checkPlaywrightAvailability();
    },
    async run(context) {
        let playwright;
        try {
            playwright = require("playwright");
        }
        catch (error) {
            return [(0, provider_types_1.blockedBrowserResult)("playwright", "Load Playwright", `Playwright is unavailable: ${error.message || String(error)}`)];
        }
        const results = [];
        let browser;
        try {
            const launched = await launchChromiumWithFallback(playwright, { headless: true });
            browser = launched.browser;
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
                for (let i = 0; i < checks.length; i += 1) {
                    results.push(await runBrowserCheck(browser, context, project, checks[i], i));
                }
            }
        }
        finally {
            try {
                await browser.close();
            }
            catch { }
        }
        return results;
    },
};
