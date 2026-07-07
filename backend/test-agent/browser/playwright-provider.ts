import * as path from "path";
import * as fs from "fs";
import {
  BrowserActionSpec,
  BrowserAssertionSpec,
  BrowserCheckResult,
  BrowserEvidenceArtifact,
  BrowserCheckSpec,
  BrowserStepResult,
  NormalizedTestAgentProjectTarget,
} from "../types";
import { compactText, ensureDir, hasRequiredCheck, nowIso, resolveUrl, safeSegment } from "../utils";
import { BrowserProvider, BrowserProviderContext, blockedBrowserResult } from "./provider-types";
import { browserTargetDetail, buildSemanticLocatorPlan, resolvePlaywrightLocator } from "./semantic-locator";
import { checksForProject } from "./shared";

type PlaywrightLoader = () => any;

interface PlaywrightLaunchAttempt {
  label: string;
  options: Record<string, any>;
}

const PLAYWRIGHT_LAUNCH_ATTEMPTS: PlaywrightLaunchAttempt[] = [
  { label: "bundled-chromium", options: {} },
  { label: "msedge-channel", options: { channel: "msedge" } },
  { label: "chrome-channel", options: { channel: "chrome" } },
];

async function launchChromiumWithFallback(playwright: any, baseOptions: Record<string, any> = {}) {
  const errors: string[] = [];
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
    } catch (error: any) {
      errors.push(`${attempt.label}: ${error.message || String(error)}`);
    }
  }
  throw new Error(errors.join(" | "));
}

export async function checkPlaywrightAvailability(loadPlaywright: PlaywrightLoader = () => require("playwright")) {
  let playwright: any;
  try {
    playwright = loadPlaywright();
  } catch (error: any) {
    return {
      available: false,
      reason: `Playwright is unavailable: ${error.message || String(error)}`,
      diagnostics: {
        packageAvailable: false,
        launchChecked: false,
      },
    };
  }

  let browser: any;
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
  } catch (error: any) {
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
  } finally {
    try { await browser?.close?.(); } catch {}
  }
}

function expectedValue(assertion: BrowserAssertionSpec) {
  return assertion.value !== undefined ? assertion.value : assertion.text;
}

function valuesEqual(actual: any, expected: any) {
  if (actual === expected) return true;
  if (typeof actual === "number" && String(actual) === String(expected)) return true;
  if (typeof actual === "boolean" && String(actual) === String(expected).toLowerCase()) return true;
  try {
    return JSON.stringify(actual) === JSON.stringify(expected);
  } catch {
    return String(actual) === String(expected);
  }
}

function stateAssertionDetail(assertion: BrowserAssertionSpec) {
  if (assertion.expression) return `expression=${assertion.expression}`;
  if (assertion.key) return `key=${assertion.key}`;
  return browserTargetDetail(assertion) || assertion.value || assertion.text || "";
}

async function capturePageFinalState(page: any) {
  if (!page) return {};
  let finalUrl = "";
  let title = "";
  let pageText = "";
  try { finalUrl = String(page.url?.() || ""); } catch {}
  try { title = String(await page.title?.() || ""); } catch {}
  try {
    const body = page.locator?.("body");
    pageText = body ? String(await body.innerText({ timeout: 1_000 }) || "") : "";
  } catch {}
  return {
    ...(finalUrl ? { finalUrl } : {}),
    ...(title ? { title: compactText(title, 500) } : {}),
    ...(pageText ? { pageTextPreview: compactText(pageText, 2000) } : {}),
  };
}

async function writePlaywrightPageSnapshots(page: any, artifactDir: string, projectName: string, checkName: string, index: number) {
  if (!page) return [];
  const snapshotDir = ensureDir(path.join(artifactDir, "page-snapshots"));
  const base = `${safeSegment(projectName)}-${safeSegment(checkName)}-${index + 1}`;
  const snapshots: string[] = [];
  try {
    const html = String(await page.content?.() || "");
    if (html) {
      const htmlPath = path.join(snapshotDir, `${base}.html`);
      fs.writeFileSync(htmlPath, html, "utf-8");
      snapshots.push(htmlPath);
    }
  } catch {}
  try {
    const body = page.locator?.("body");
    const text = body ? String(await body.innerText({ timeout: 1_000 }) || "") : "";
    if (text) {
      const textPath = path.join(snapshotDir, `${base}.txt`);
      fs.writeFileSync(textPath, `${text}\n`, "utf-8");
      snapshots.push(textPath);
    }
  } catch {}
  return snapshots;
}

function writeBrowserTelemetryLogs(input: {
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
  fs.writeFileSync(consoleLogPath, `${input.consoleMessages.length ? input.consoleMessages.join("\n") : "(none observed)"}\n`, "utf-8");
  fs.writeFileSync(networkLogPath, `${input.networkRequests.length ? input.networkRequests.join("\n") : "(none observed)"}\n`, "utf-8");
  return { consoleLogPath, networkLogPath };
}

function browserArtifactBase(projectName: string, checkName: string, index: number) {
  return `${safeSegment(projectName)}-${safeSegment(checkName)}-${index + 1}`;
}

function browserEvidenceArtifact(type: BrowserEvidenceArtifact["type"], title: string, artifactPath: string, source: string, mediaType = ""): BrowserEvidenceArtifact | null {
  if (!artifactPath || !fs.existsSync(artifactPath)) return null;
  return {
    type,
    title,
    path: artifactPath,
    source,
    ...(mediaType ? { mediaType } : {}),
  };
}

async function finalizePlaywrightBrowserArtifacts(input: {
  browserContext: any;
  page: any;
  traceStarted: boolean;
  tracePath: string;
  harPath: string;
  collectVideo: boolean;
}) {
  const artifacts: BrowserEvidenceArtifact[] = [];
  let video: any = null;
  try { video = input.collectVideo ? input.page?.video?.() : null; } catch {}
  if (input.traceStarted) {
    try { await input.browserContext?.tracing?.stop?.({ path: input.tracePath }); } catch {}
  }
  try { await input.browserContext?.close?.(); } catch {}
  const trace = browserEvidenceArtifact("trace", "Playwright trace", input.tracePath, "playwright:tracing", "application/zip");
  const har = browserEvidenceArtifact("har", "Playwright HAR", input.harPath, "playwright:recordHar", "application/json");
  if (trace) artifacts.push(trace);
  if (har) artifacts.push(har);
  if (video) {
    try {
      const videoPath = await video.path();
      const videoArtifact = browserEvidenceArtifact("video", "Playwright video", videoPath, "playwright:recordVideo", "video/webm");
      if (videoArtifact) artifacts.push(videoArtifact);
    } catch {}
  }
  return artifacts;
}

async function runAction(page: any, project: NormalizedTestAgentProjectTarget, action: BrowserActionSpec, defaultTimeout: number): Promise<BrowserStepResult> {
  const timeout = Number(action.timeoutMs || action.timeout_ms || defaultTimeout);
  const name = `action:${action.type}`;
  try {
    if (action.type === "goto") {
      const url = resolveUrl(project.targetUrl, action.url || "");
      await page.goto(url, { waitUntil: action.waitUntil || "domcontentloaded", timeout });
    } else if (action.type === "reload") {
      await page.reload({ waitUntil: action.waitUntil || "domcontentloaded", timeout });
    } else if (action.type === "goBack") {
      await page.goBack({ waitUntil: action.waitUntil || "domcontentloaded", timeout });
    } else if (action.type === "goForward") {
      await page.goForward({ waitUntil: action.waitUntil || "domcontentloaded", timeout });
    } else if (action.type === "click") {
      await resolvePlaywrightLocator(page, action).click({ timeout });
    } else if (action.type === "fill") {
      await resolvePlaywrightLocator(page, action).fill(String(action.value ?? action.text ?? ""), { timeout });
    } else if (action.type === "selectOption") {
      await resolvePlaywrightLocator(page, action).selectOption(String(action.value ?? action.text ?? ""), { timeout });
    } else if (action.type === "check") {
      await resolvePlaywrightLocator(page, action).check({ timeout });
    } else if (action.type === "uncheck") {
      await resolvePlaywrightLocator(page, action).uncheck({ timeout });
    } else if (action.type === "hover") {
      await resolvePlaywrightLocator(page, action).hover({ timeout });
    } else if (action.type === "press") {
      const key = String(action.key || "Enter");
      const locatorPlan = buildSemanticLocatorPlan(action);
      if (locatorPlan) await resolvePlaywrightLocator(page, action).press(key, { timeout });
      else await page.keyboard.press(key);
    } else if (action.type === "waitForSelector") {
      await resolvePlaywrightLocator(page, action).waitFor({ state: "visible", timeout });
    } else if (action.type === "waitForText") {
      await page.getByText(String(action.text || action.value || "")).first().waitFor({ state: "visible", timeout });
    } else if (action.type === "waitForTimeout") {
      await page.waitForTimeout(Math.min(timeout, Number(action.value || action.text || 1000)));
    } else if (action.type === "evaluate") {
      await page.evaluate(String(action.text || action.value || "undefined"));
    }
    return { kind: "action", name, status: "passed", detail: browserTargetDetail(action) };
  } catch (error: any) {
    return { kind: "action", name, status: "failed", detail: browserTargetDetail(action), error: error.message || String(error) };
  }
}

async function runAssertion(page: any, assertion: BrowserAssertionSpec, signals: { consoleErrors: string[]; networkErrors: string[] }, defaultTimeout: number): Promise<BrowserStepResult> {
  const timeout = Number(assertion.timeoutMs || assertion.timeout_ms || defaultTimeout);
  const name = `assert:${assertion.type}`;
  try {
    if (assertion.type === "visible") {
      await resolvePlaywrightLocator(page, assertion).waitFor({ state: "visible", timeout });
    } else if (assertion.type === "notVisible") {
      const visible = await resolvePlaywrightLocator(page, assertion).first().isVisible({ timeout }).catch(() => false);
      if (visible) throw new Error(`Expected target to be hidden: ${browserTargetDetail(assertion)}`);
    } else if (assertion.type === "text") {
      await page.getByText(String(assertion.text || assertion.value || "")).first().waitFor({ state: "visible", timeout });
    } else if (assertion.type === "urlIncludes") {
      const value = String(assertion.value || assertion.text || "");
      if (!page.url().includes(value)) throw new Error(`Expected URL to include "${value}", got "${page.url()}".`);
    } else if (assertion.type === "titleIncludes") {
      const value = String(assertion.value || assertion.text || "");
      const title = await page.title();
      if (!title.includes(value)) throw new Error(`Expected title to include "${value}", got "${title}".`);
    } else if (assertion.type === "elementTextIncludes") {
      const value = String(assertion.value || assertion.text || "");
      const actual = await resolvePlaywrightLocator(page, assertion).first().innerText({ timeout });
      if (!actual.includes(value)) throw new Error(`Expected element text to include "${value}", got "${actual}".`);
    } else if (assertion.type === "consoleNoErrors") {
      if (signals.consoleErrors.length) throw new Error(`Console errors observed: ${signals.consoleErrors.slice(0, 3).join(" | ")}`);
    } else if (assertion.type === "networkNoErrors") {
      if (signals.networkErrors.length) throw new Error(`Network errors observed: ${signals.networkErrors.slice(0, 3).join(" | ")}`);
    } else if (assertion.type === "jsTruthy") {
      const expression = assertion.expression || assertion.text || assertion.value || "";
      if (!expression) throw new Error("jsTruthy requires expression/text/value.");
      const actual = await page.evaluate(expression);
      if (!actual) throw new Error(`Expected JS expression to be truthy, got ${JSON.stringify(actual)}.`);
    } else if (assertion.type === "jsEquals") {
      const expression = assertion.expression || assertion.text || "";
      if (!expression) throw new Error("jsEquals requires expression/text.");
      const actual = await page.evaluate(expression);
      const expected = expectedValue(assertion);
      if (!valuesEqual(actual, expected)) throw new Error(`Expected JS expression to equal ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}.`);
    } else if (assertion.type === "localStorageEquals" || assertion.type === "localStorageIncludes" || assertion.type === "sessionStorageEquals" || assertion.type === "sessionStorageIncludes") {
      const key = assertion.key || assertion.text || "";
      if (!key) throw new Error(`${assertion.type} requires key/text.`);
      const storageName = assertion.type.startsWith("local") ? "localStorage" : "sessionStorage";
      const actual = await page.evaluate(({ storageName, key }: any) => (globalThis as any)[storageName].getItem(key), { storageName, key });
      const expected = expectedValue(assertion);
      const passed = assertion.type.endsWith("Equals")
        ? valuesEqual(actual, expected)
        : String(actual ?? "").includes(String(expected ?? ""));
      if (!passed) throw new Error(`Expected ${storageName}.${key} to ${assertion.type.endsWith("Equals") ? "equal" : "include"} ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}.`);
    }
    return { kind: "assertion", name, status: "passed", detail: stateAssertionDetail(assertion) };
  } catch (error: any) {
    return { kind: "assertion", name, status: "failed", detail: stateAssertionDetail(assertion), error: error.message || String(error) };
  }
}

async function runBrowserCheck(browser: any, context: BrowserProviderContext, project: NormalizedTestAgentProjectTarget, check: BrowserCheckSpec, index: number): Promise<BrowserCheckResult> {
  const { workOrder } = context;
  const startedAt = nowIso();
  const started = Date.now();
  const timeout = Number(check.timeoutMs || check.timeout_ms || workOrder.options.browserTimeoutMs);
  const screenshots: string[] = [];
  const consoleMessages: string[] = [];
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const networkRequests: string[] = [];
  const networkErrors: string[] = [];
  const pageSnapshots: string[] = [];
  const browserArtifacts: BrowserCheckResult["browserArtifacts"] = [];
  const steps: BrowserStepResult[] = [];
  const name = check.name || `Browser check ${index + 1}`;
  const url = resolveUrl(project.targetUrl, check.url || project.targetUrl);
  let page: any = null;
  let browserContext: any = null;
  let traceStarted = false;
  const collectBrowserArtifacts = workOrder.options.collectBrowserArtifacts;
  const collectBrowserVideo = workOrder.options.collectBrowserVideo;
  const evidenceDir = collectBrowserArtifacts ? ensureDir(path.join(workOrder.options.artifactDir, "browser-artifacts")) : "";
  const artifactBase = browserArtifactBase(project.name, name, index);
  const tracePath = collectBrowserArtifacts ? path.join(evidenceDir, `${artifactBase}.trace.zip`) : "";
  const harPath = collectBrowserArtifacts ? path.join(evidenceDir, `${artifactBase}.har`) : "";

  try {
    browserContext = await browser.newContext({
      viewport: { width: 1366, height: 900 },
      ...(collectBrowserArtifacts ? { recordHar: { path: harPath, content: "attach" } } : {}),
      ...(collectBrowserVideo ? { recordVideo: { dir: ensureDir(path.join(workOrder.options.artifactDir, "browser-videos")), size: { width: 1366, height: 900 } } } : {}),
    });
    if (collectBrowserArtifacts && browserContext.tracing?.start) {
      try {
        await browserContext.tracing.start({ screenshots: true, snapshots: true, sources: true });
        traceStarted = true;
      } catch {}
    }
    page = await browserContext.newPage();
    page.on("console", (message: any) => {
      const type = message.type?.() || "console";
      const text = message.text?.() || "";
      const line = `${type}: ${text}`;
      consoleMessages.push(line);
      if (type === "error") consoleErrors.push(text);
    });
    page.on("pageerror", (error: any) => pageErrors.push(error.message || String(error)));
    page.on("request", (request: any) => networkRequests.push(`request ${request.method?.() || "GET"} ${request.url?.() || ""}`));
    page.on("requestfailed", (request: any) => {
      const line = `failed ${request.method?.() || "GET"} ${request.url?.() || ""}: ${request.failure?.()?.errorText || "request failed"}`;
      networkRequests.push(line);
      networkErrors.push(line);
    });
    page.on("response", (response: any) => {
      const status = Number(response.status?.() || 0);
      const line = `response ${status} ${response.url?.() || ""}`;
      networkRequests.push(line);
      if (status >= 500) networkErrors.push(`${status} ${response.url?.() || ""}`);
    });

    const actions = check.actions?.length ? check.actions : [{ type: "goto", url, waitUntil: "domcontentloaded" } as BrowserActionSpec];
    for (const action of actions) {
      const step = await runAction(page, project, action, timeout);
      steps.push(step);
      if (step.status === "failed") break;
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

    if (check.screenshot !== false || hasRequiredCheck(workOrder.requiredChecks, /screenshot/i)) {
      const screenshotDir = ensureDir(path.join(workOrder.options.artifactDir, "screenshots"));
      const screenshotPath = path.join(screenshotDir, `${safeSegment(project.name)}-${safeSegment(name)}-${index + 1}.png`);
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
      ...telemetryLogs,
      adversarial: check.adversarial === true,
      probeType: check.probeType || check.probe_type,
    };
  } catch (error: any) {
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
    } else {
      try { await page?.context?.().close?.(); } catch {}
    }
    return {
      provider: "playwright",
      project: project.name,
      name,
      url,
      ...finalState,
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
      ...telemetryLogs,
      adversarial: check.adversarial === true,
      probeType: check.probeType || check.probe_type,
      error: error.message || String(error),
    };
  }
}

export const PlaywrightBrowserProvider: BrowserProvider = {
  id: "playwright",
  label: "Playwright",
  async availability() {
    return checkPlaywrightAvailability();
  },
  async run(context) {
    let playwright: any;
    try {
      playwright = require("playwright");
    } catch (error: any) {
      return [blockedBrowserResult("playwright", "Load Playwright", `Playwright is unavailable: ${error.message || String(error)}`)];
    }

    const results: BrowserCheckResult[] = [];
    let browser: any;
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
    } catch (error: any) {
      return [blockedBrowserResult("playwright", "Launch browser", error.message || String(error))];
    }
    try {
      for (const project of context.workOrder.projects) {
        const checks = checksForProject(project, context.workOrder.acceptanceCriteria);
        for (let i = 0; i < checks.length; i += 1) {
          results.push(await runBrowserCheck(browser, context, project, checks[i], i));
        }
      }
    } finally {
      try { await browser.close(); } catch {}
    }
    return results;
  },
};
