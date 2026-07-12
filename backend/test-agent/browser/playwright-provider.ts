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
import { compactText, ensureDir, hasRequiredCheck, nowIso, resolveUrl, safeSegment } from "../utils";
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

type PlaywrightLoader = () => any;

interface PlaywrightLaunchAttempt {
  label: string;
  options: Record<string, any>;
}

interface CapturedBrowserDownload {
  suggestedFilename: string;
  path: string;
  url: string;
  failure?: string;
  sizeBytes?: number;
  mediaType?: string;
}

interface CapturedBrowserDialog {
  type: string;
  message: string;
  defaultValue?: string;
  accepted: boolean;
  occurredAt: string;
  error?: string;
}

interface CapturedBrowserPopup {
  url: string;
  title: string;
  textPreview: string;
  openedAt: string;
  error?: string;
}

interface BrowserRuntimeSignals {
  consoleMessages: string[];
  consoleErrors: string[];
  networkErrors: string[];
  networkRequests: string[];
  downloads: CapturedBrowserDownload[];
  downloadPromises: Promise<CapturedBrowserDownload>[];
  dialogs: CapturedBrowserDialog[];
  popups: CapturedBrowserPopup[];
  viewport?: {
    width: number;
    height: number;
    isMobile?: boolean;
    deviceScaleFactor?: number;
  };
}

interface PlaywrightMultiSessionRuntime extends BrowserRuntimeSignals {
  name: string;
  initialUrl: string;
  browserContext: any;
  page: any;
  traceStarted: boolean;
  tracePath: string;
  harPath: string;
  artifactBase: string;
  screenshots: string[];
  pageSnapshots: string[];
  browserArtifacts: BrowserEvidenceArtifact[];
  consoleLogPath?: string;
  networkLogPath?: string;
  consoleMessages: string[];
  dialogMessages: string[];
  popupMessages: string[];
  pageErrors: string[];
  popupCapturePromises: Promise<CapturedBrowserPopup>[];
  monitoredOrigins: Set<string>;
  authentication?: BrowserAuthenticationEvidence;
  secretBindings: BrowserSecretBinding[];
  collectBrowserVideo: boolean;
  lifecycleResourceId?: string;
}

interface BrowserContextRuntimeOptions {
  userAgent?: string;
  locale?: string;
  timezoneId?: string;
  colorScheme?: string;
  reducedMotion?: string;
  permissions?: string[];
  geolocation?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  storageStatePath?: string;
  storageState?: NonNullable<BrowserCheckResult["contextOptions"]>["storageState"];
}

function redactBrowserStepResult(step: BrowserStepResult, secretBindings: BrowserSecretBinding[]) {
  if (!secretBindings.length) return step;
  return {
    ...step,
    ...(step.detail ? { detail: redactBrowserSensitiveText(step.detail, secretBindings) } : {}),
    ...(step.error ? { error: redactBrowserSensitiveText(step.error, secretBindings) } : {}),
  };
}

async function capturePlaywrightActionEffectObservation(
  page: any,
  signals: Pick<BrowserRuntimeSignals, "networkRequests" | "dialogs" | "popups" | "downloads">,
): Promise<BrowserActionEffectObservation> {
  const documentState = await page.evaluate(() => {
    const documentRef = (globalThis as any).document;
    const controls = Array.from(documentRef.querySelectorAll("input, textarea, select")).map((element: any) => ({
      tag: String(element.tagName || "").toLowerCase(),
      type: String(element.type || ""),
      name: String(element.name || ""),
      value: String(element.value ?? ""),
      checked: Boolean(element.checked),
      selectedIndex: Number(element.selectedIndex ?? -1),
    }));
    return {
      title: String(documentRef.title || ""),
      pageText: String(documentRef.body?.innerText || ""),
      dom: `${documentRef.documentElement?.outerHTML || ""}\n${JSON.stringify(controls)}`,
    };
  });
  return {
    url: String(page.url?.() || ""),
    title: documentState.title,
    pageText: documentState.pageText,
    dom: documentState.dom,
    networkCount: signals.networkRequests.length,
    dialogCount: signals.dialogs.length,
    popupCount: signals.popups.length,
    downloadCount: signals.downloads.length,
  };
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

function cookieName(assertion: BrowserAssertionSpec) {
  return String(assertion.key || assertion.name || assertion.text || assertion.value || "").trim();
}

function cookieAssertionDetail(assertion: BrowserAssertionSpec) {
  const name = cookieName(assertion);
  const expected = assertion.type === "cookieValueIncludes" || assertion.type === "cookieValueEquals" ? String(assertion.value ?? assertion.text ?? "") : "";
  const expectation = assertion.type === "cookieValueEquals" ? "expected length" : "expected substring length";
  return `cookie=${name || "(missing)"}${expected ? `; ${expectation}=${expected.length}` : ""}`;
}

function inputValueAssertionDetail(assertion: BrowserAssertionSpec) {
  const expected = String(assertion.value ?? assertion.text ?? "");
  const expectation = assertion.type === "inputValueIncludes" ? "expected substring length" : "expected length";
  return `${browserTargetDetail(assertion)}${expected ? `; ${expectation}=${expected.length}` : ""}`;
}

function attributeName(assertion: BrowserAssertionSpec) {
  return String(assertion.attribute || assertion.attributeName || assertion.attribute_name || assertion.key || "").trim();
}

function attributeAssertionDetail(assertion: BrowserAssertionSpec) {
  const expected = String(assertion.value ?? assertion.text ?? "");
  const expectation = assertion.type === "attributeIncludes" ? "expected substring length" : "expected length";
  const name = attributeName(assertion);
  return `${browserTargetDetail(assertion)}; attribute=${name || "(missing)"}${expected ? `; ${expectation}=${expected.length}` : ""}`;
}

function computedStylePropertyName(assertion: BrowserAssertionSpec) {
  const raw = String(assertion.property || assertion.cssProperty || assertion.css_property || assertion.styleProperty || assertion.style_property || assertion.attribute || assertion.key || "").trim();
  if (!raw || raw.startsWith("--")) return raw;
  return raw.replace(/[A-Z]/g, match => `-${match.toLowerCase()}`).replace(/^ms-/, "-ms-").toLowerCase();
}

function computedStyleExpected(assertion: BrowserAssertionSpec) {
  const hasExpected = assertion.value !== undefined || assertion.text !== undefined;
  return {
    hasExpected,
    value: String(assertion.value ?? assertion.text ?? ""),
  };
}

function computedStyleAssertionDetail(assertion: BrowserAssertionSpec) {
  const expected = computedStyleExpected(assertion);
  const expectation = assertion.type === "computedStyleIncludes" ? "expected substring length" : "expected length";
  return `${browserTargetDetail(assertion)}; property=${computedStylePropertyName(assertion) || "(missing)"}${expected.hasExpected ? `; ${expectation}=${expected.value.length}` : ""}`;
}

function optionalCountValue(value: any) {
  if (value === undefined || value === null || value === "") return undefined;
  const count = Number(value);
  return Number.isFinite(count) ? count : undefined;
}

function elementCountExpected(assertion: BrowserAssertionSpec) {
  if (assertion.type === "elementCountAtLeast") {
    return optionalCountValue(assertion.minCount ?? assertion.min_count ?? assertion.count ?? assertion.value ?? assertion.text);
  }
  if (assertion.type === "elementCountAtMost") {
    return optionalCountValue(assertion.maxCount ?? assertion.max_count ?? assertion.count ?? assertion.value ?? assertion.text);
  }
  return optionalCountValue(assertion.count ?? assertion.expectedCount ?? assertion.expected_count ?? assertion.value ?? assertion.text);
}

function elementCountAssertionDetail(assertion: BrowserAssertionSpec) {
  const expected = elementCountExpected(assertion);
  const comparator = assertion.type === "elementCountAtLeast"
    ? "min count"
    : assertion.type === "elementCountAtMost"
      ? "max count"
      : "expected count";
  return `${browserTargetDetail(assertion)}; ${comparator}=${expected === undefined ? "(missing)" : expected}`;
}

function dialogExpectedType(assertion: BrowserAssertionSpec) {
  const raw = assertion.dialogType || assertion.dialog_type || (assertion.type === "dialogTypeEquals" ? assertion.value ?? assertion.text : "");
  return String(raw || "").trim().toLowerCase();
}

function dialogExpectedMessage(assertion: BrowserAssertionSpec) {
  const raw = assertion.type === "dialogTypeEquals"
    ? assertion.messageIncludes || assertion.message_includes || assertion.message || ""
    : assertion.messageIncludes || assertion.message_includes || assertion.message || assertion.value || assertion.text || "";
  return String(raw || "").trim();
}

function dialogAssertionDetail(assertion: BrowserAssertionSpec) {
  const expectedType = dialogExpectedType(assertion);
  const expectedMessage = dialogExpectedMessage(assertion);
  const parts = [
    expectedType ? `dialogType=${expectedType}` : "",
    expectedMessage ? `message substring length=${expectedMessage.length}` : "",
  ].filter(Boolean);
  return parts.join("; ") || "any browser dialog";
}

function popupExpectedUrl(assertion: BrowserAssertionSpec) {
  return String(assertion.urlIncludes || assertion.url_includes || assertion.url || assertion.value || assertion.text || "").trim();
}

function popupExpectedText(assertion: BrowserAssertionSpec) {
  return String(assertion.value || assertion.text || "").trim();
}

function popupExpectedTitle(assertion: BrowserAssertionSpec) {
  return String(assertion.title || assertion.value || assertion.text || "").trim();
}

function popupIndex(assertion: BrowserAssertionSpec) {
  const value = assertion.popupIndex ?? assertion.popup_index;
  if (value === undefined || value === null) return undefined;
  if (String(value).trim() === "") return undefined;
  const index = Number(value);
  return Number.isInteger(index) && index >= 0 ? index : undefined;
}

function popupAssertionDetail(assertion: BrowserAssertionSpec) {
  const index = popupIndex(assertion);
  const target = index === undefined ? "any popup" : `popupIndex=${index}`;
  if (assertion.type === "popupUrlIncludes") {
    const expected = popupExpectedUrl(assertion);
    return `${target}${expected ? `; expected URL substring length=${expected.length}` : ""}`;
  }
  if (assertion.type === "popupTextIncludes") {
    const expected = popupExpectedText(assertion);
    return `${target}${expected ? `; expected text substring length=${expected.length}` : ""}`;
  }
  if (assertion.type === "popupTitleIncludes") {
    const expected = popupExpectedTitle(assertion);
    return `${target}${expected ? `; expected title substring length=${expected.length}` : ""}`;
  }
  return target;
}

function clipboardExpectedText(assertion: BrowserAssertionSpec | BrowserActionSpec) {
  return String(assertion.value ?? assertion.text ?? "");
}

function clipboardAssertionDetail(assertion: BrowserAssertionSpec) {
  const expected = clipboardExpectedText(assertion);
  const expectation = assertion.type === "clipboardTextIncludes" ? "expected substring length" : "expected length";
  return expected ? `${expectation}=${expected.length}` : "clipboard text";
}

function firstNonEmptyStringList(...values: any[]) {
  for (const value of values) {
    if (Array.isArray(value)) {
      const list = value.map(item => String(item ?? "").trim()).filter(Boolean);
      if (list.length) return list;
      continue;
    }
    const text = String(value ?? "").trim();
    if (text) return [text];
  }
  return [];
}

function optionalTableIndex(...values: any[]) {
  for (const value of values) {
    if (value === undefined || value === null || value === "") continue;
    const index = Number(value);
    if (Number.isInteger(index) && index >= 0) return index;
  }
  return undefined;
}

function tableExpectedTexts(assertion: BrowserAssertionSpec) {
  return firstNonEmptyStringList(
    assertion.expectedTexts,
    assertion.expected_texts,
    assertion.texts,
    assertion.values,
    assertion.value,
    assertion.text,
  );
}

function textOrderExpectedTexts(assertion: BrowserAssertionSpec) {
  return firstNonEmptyStringList(
    assertion.expectedTexts,
    assertion.expected_texts,
    assertion.texts,
    assertion.values,
  );
}

function tableRowText(assertion: BrowserAssertionSpec) {
  return String(assertion.rowText || assertion.row_text || "").trim();
}

function tableColumnName(assertion: BrowserAssertionSpec) {
  return String(assertion.columnName || assertion.column_name || assertion.columnHeader || assertion.column_header || "").trim();
}

function tableAssertionDetail(assertion: BrowserAssertionSpec) {
  const expectedTexts = tableExpectedTexts(assertion);
  const rowText = tableRowText(assertion);
  const rowIndex = optionalTableIndex(assertion.rowIndex, assertion.row_index);
  const rowNumber = optionalTableIndex(assertion.rowNumber, assertion.row_number);
  const columnName = tableColumnName(assertion);
  const columnIndex = optionalTableIndex(assertion.columnIndex, assertion.column_index);
  const columnNumber = optionalTableIndex(assertion.columnNumber, assertion.column_number);
  const target = String(
    assertion.tableSelector
    || assertion.table_selector
    || assertion.tableLocator
    || assertion.table_locator
    || assertion.selector
    || assertion.locator
    || assertion.testId
    || assertion.test_id
    || assertion.dataTestId
    || assertion.data_testid
    || (assertion.role ? `role=${assertion.role}${assertion.name ? `; name=${assertion.name}` : ""}` : "")
    || "first table",
  ).trim();
  const parts = [
    `table=${target}`,
    rowText ? `row text length=${rowText.length}` : "",
    rowIndex !== undefined ? `rowIndex=${rowIndex}` : "",
    rowNumber !== undefined ? `rowNumber=${rowNumber}` : "",
    columnName ? `column=${columnName}` : "",
    columnIndex !== undefined ? `columnIndex=${columnIndex}` : "",
    columnNumber !== undefined ? `columnNumber=${columnNumber}` : "",
    expectedTexts.length ? `expected text count=${expectedTexts.length}` : "",
  ].filter(Boolean);
  return parts.join("; ");
}

function optionalVisualNumber(value: any) {
  if (value === undefined || value === null || value === "") return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function visualAssertionDetail(assertion: BrowserAssertionSpec) {
  const minUniqueColors = optionalVisualNumber(assertion.minUniqueColors ?? assertion.min_unique_colors);
  const minNonWhitePixels = optionalVisualNumber(assertion.minNonWhitePixels ?? assertion.min_non_white_pixels) ?? 1;
  return `${browserTargetDetail(assertion)}; minNonWhitePixels=${minNonWhitePixels}${minUniqueColors ? `; minUniqueColors=${minUniqueColors}` : ""}`;
}

function textOrderAssertionDetail(assertion: BrowserAssertionSpec) {
  const expected = textOrderExpectedTexts(assertion);
  const target = String(
    assertion.selector
    || assertion.locator
    || assertion.testId
    || assertion.test_id
    || assertion.dataTestId
    || assertion.data_testid
    || (assertion.role ? `role=${assertion.role}${assertion.name ? `; name=${assertion.name}` : ""}` : "")
    || "body",
  ).trim();
  return `${target}; expected text count=${expected.length}`;
}

function urlAssertionExpected(assertion: BrowserAssertionSpec) {
  return String(assertion.url || assertion.urlIncludes || assertion.url_includes || assertion.value || assertion.text || "").trim();
}

function comparableUrl(actualUrl: string, expected: string) {
  if (!expected.startsWith("/")) return actualUrl;
  try {
    const url = new URL(actualUrl);
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return actualUrl;
  }
}

function titleAssertionExpected(assertion: BrowserAssertionSpec) {
  return String(assertion.value || assertion.text || assertion.title || "").trim();
}

function urlTitleAssertionDetail(assertion: BrowserAssertionSpec) {
  if (assertion.type.startsWith("url")) return `expected=${urlAssertionExpected(assertion) || "(missing)"}`;
  return `expected=${titleAssertionExpected(assertion) || "(missing)"}`;
}

function expectedOnlineState(assertion: BrowserAssertionSpec) {
  if (assertion.type === "browserOnline") return true;
  if (assertion.type === "browserOffline") return false;
  const raw = String(
    assertion.value
    ?? assertion.text
    ?? (assertion as any).state
    ?? (assertion as any).status
    ?? "",
  ).trim().toLowerCase();
  if (["online", "true", "connected", "up"].includes(raw)) return true;
  if (["offline", "false", "disconnected", "down"].includes(raw)) return false;
  return undefined;
}

function onlineStateAssertionDetail(assertion: BrowserAssertionSpec) {
  const expected = expectedOnlineState(assertion);
  return expected === undefined ? "navigator.onLine expected state=(missing)" : `navigator.onLine expected=${expected ? "online" : "offline"}`;
}

async function waitForTitleMatch(page: any, predicate: (title: string) => boolean, timeout: number) {
  const deadline = Date.now() + Math.max(1, timeout);
  let title = "";
  while (Date.now() <= deadline) {
    title = await page.title();
    if (predicate(title)) return title;
    await delay(100);
  }
  return await page.title().catch(() => title);
}

async function waitForOnlineState(page: any, expected: boolean, timeout: number) {
  const deadline = Date.now() + Math.max(1, timeout);
  let actual = true;
  while (Date.now() <= deadline) {
    actual = await page.evaluate("navigator.onLine === true").catch(() => true);
    if (actual === expected) return actual;
    await delay(100);
  }
  return await page.evaluate("navigator.onLine === true").catch(() => actual);
}

function stateAssertionDetail(assertion: BrowserAssertionSpec) {
  if (assertion.type === "pageNotBlank") return "visible user-facing page content";
  if (assertion.type === "noHorizontalOverflow") return "document has no horizontal overflow";
  if (assertion.type === "inViewport") return `${browserTargetDetail(assertion)} within viewport`;
  if (assertion.type === "present" || assertion.type === "notPresent") return `${browserTargetDetail(assertion)} DOM ${assertion.type === "present" ? "present" : "absent"}`;
  if (assertion.type === "urlEquals" || assertion.type === "urlIncludes" || assertion.type === "urlNotIncludes" || assertion.type === "titleEquals" || assertion.type === "titleIncludes" || assertion.type === "titleNotIncludes") return urlTitleAssertionDetail(assertion);
  if (assertion.type === "onlineState" || assertion.type === "browserOnline" || assertion.type === "browserOffline") return onlineStateAssertionDetail(assertion);
  if (
    assertion.type === "accessibleNameEquals"
    || assertion.type === "accessibleNameIncludes"
    || assertion.type === "accessibleDescriptionEquals"
    || assertion.type === "accessibleDescriptionIncludes"
    || assertion.type === "ariaSnapshotIncludes"
  ) return browserAccessibilityAssertionDetail(assertion);
  if (isBrowserAriaStateAssertion(assertion)) return browserAriaStateAssertionDetail(assertion);
  if (assertion.type === "focused" || assertion.type === "notFocused") return browserTargetDetail(assertion);
  if (assertion.type === "enabled" || assertion.type === "disabled") return browserTargetDetail(assertion);
  if (assertion.type === "cookieExists" || assertion.type === "cookieValueIncludes") return cookieAssertionDetail(assertion);
  if (assertion.type === "inputValueEquals" || assertion.type === "inputValueIncludes") return inputValueAssertionDetail(assertion);
  if (assertion.type === "attributeEquals" || assertion.type === "attributeIncludes") return attributeAssertionDetail(assertion);
  if (assertion.type === "computedStyleEquals" || assertion.type === "computedStyleIncludes") return computedStyleAssertionDetail(assertion);
  if (assertion.type === "elementCountEquals" || assertion.type === "elementCountAtLeast" || assertion.type === "elementCountAtMost") return elementCountAssertionDetail(assertion);
  if (assertion.type === "dialogAppeared" || assertion.type === "dialogMessageIncludes" || assertion.type === "dialogTypeEquals") return dialogAssertionDetail(assertion);
  if (assertion.type === "popupOpened" || assertion.type === "popupUrlIncludes" || assertion.type === "popupTextIncludes" || assertion.type === "popupTitleIncludes") return popupAssertionDetail(assertion);
  if (assertion.type === "tableRowIncludes" || assertion.type === "tableCellTextIncludes" || assertion.type === "tableCellTextEquals") return tableAssertionDetail(assertion);
  if (assertion.type === "clipboardTextEquals" || assertion.type === "clipboardTextIncludes") return clipboardAssertionDetail(assertion);
  if (assertion.type === "elementScreenshotNotBlank") return visualAssertionDetail(assertion);
  if (assertion.type === "textOrder") return textOrderAssertionDetail(assertion);
  if (assertion.type === "downloadedFile") return downloadedFileDetail(assertion);
  if (assertion.type === "consoleIncludes" || assertion.type === "consoleNotIncludes" || assertion.type === "consoleNoWarnings") return browserConsoleAssertionDetail(assertion);
  if (assertion.type === "selectedValue" || assertion.type === "selectedTextIncludes") {
    const target = browserTargetDetail(assertion);
    const expected = String(assertion.value ?? assertion.text ?? "");
    return `${target}${target ? "; " : ""}expected=${expected}`;
  }
  if (
    assertion.type === "networkRequest"
    || assertion.type === "networkResponse"
    || assertion.type === "networkRequestNot"
    || assertion.type === "networkResponseNot"
  ) return browserNetworkAssertionDetail(assertion);
  if (assertion.expression) return `expression=${assertion.expression}`;
  if (assertion.key) return `key=${assertion.key}`;
  return browserTargetDetail(assertion) || assertion.value || assertion.text || "";
}

async function capturePageFinalState(page: any, secretBindings: BrowserSecretBinding[] = []) {
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
    ...(title ? { title: compactText(redactBrowserSensitiveText(title, secretBindings), 500) } : {}),
    ...(pageText ? { pageTextPreview: compactText(redactBrowserSensitiveText(pageText, secretBindings), 2000) } : {}),
  };
}

async function evaluatePageNotBlank(page: any) {
  return await page.evaluate(`(() => {
    const body = globalThis.document && globalThis.document.body;
    if (!body) return { ok: false, reason: "document.body is missing" };
    const text = String(body.innerText || body.textContent || "").replace(/\s+/g, " ").trim();
    if (text.length >= 2) return { ok: true, reason: "visible text length=" + text.length };

    const visible = (element) => {
      const style = globalThis.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none"
        && style.visibility !== "hidden"
        && Number(style.opacity || "1") !== 0
        && rect.width > 0
        && rect.height > 0;
    };
    const candidates = Array.from(body.querySelectorAll("img,svg,canvas,video,iframe,button,input,select,textarea,[role='button'],[role='link'],[aria-label]"));
    const matched = candidates.find(element => visible(element));
    if (matched) {
      const tag = matched.tagName.toLowerCase();
      const descriptor = matched.getAttribute("aria-label") || matched.getAttribute("role") || matched.getAttribute("alt") || tag;
      return { ok: true, reason: "visible " + descriptor };
    }
    return { ok: false, reason: "no visible text, media, form control, or labeled interactive element" };
  })()`);
}

async function evaluateNoHorizontalOverflow(page: any, expectedViewportWidth = 0) {
  return await page.evaluate(`((expectedViewportWidth) => {
    const doc = globalThis.document && globalThis.document.documentElement;
    const body = globalThis.document && globalThis.document.body;
    const viewportWidth = Math.ceil(expectedViewportWidth || globalThis.visualViewport?.width || globalThis.innerWidth || doc?.clientWidth || 0);
    const documentWidth = Math.ceil(Math.max(doc?.scrollWidth || 0, body?.scrollWidth || 0, doc?.clientWidth || 0, body?.clientWidth || 0));
    let maxElementRight = documentWidth;
    let offender = "";
    const visible = (element) => {
      const style = globalThis.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none"
        && style.visibility !== "hidden"
        && Number(style.opacity || "1") !== 0
        && rect.width > 0
        && rect.height > 0;
    };
    for (const element of Array.from((body || doc).querySelectorAll("*"))) {
      if (!visible(element)) continue;
      const rect = element.getBoundingClientRect();
      const right = Math.ceil(rect.right + (globalThis.scrollX || 0));
      if (right > maxElementRight) {
        maxElementRight = right;
        offender = element.tagName.toLowerCase()
          + (element.id ? "#" + element.id : "")
          + (typeof element.className === "string" && element.className ? "." + element.className.trim().replace(/\\s+/g, ".") : "");
      }
    }
    const measuredWidth = Math.max(documentWidth, maxElementRight);
    const overflowPx = measuredWidth - viewportWidth;
    return {
      ok: overflowPx <= 1,
      viewportWidth,
      documentWidth,
      maxElementRight,
      measuredWidth,
      overflowPx,
      offender,
    };
  })(${Number(expectedViewportWidth || 0)})`);
}

async function evaluateElementInViewport(locator: any, expectedViewportWidth = 0, expectedViewportHeight = 0) {
  return await locator.evaluate((element: any, expected: any) => {
    const win = globalThis as any;
    const doc = win.document && win.document.documentElement;
    const viewportWidth = Math.ceil(expected?.width || win.visualViewport?.width || win.innerWidth || doc?.clientWidth || 0);
    const viewportHeight = Math.ceil(expected?.height || win.visualViewport?.height || win.innerHeight || doc?.clientHeight || 0);
    const style = win.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    const visible = style.display !== "none"
      && style.visibility !== "hidden"
      && Number(style.opacity || "1") !== 0
      && rect.width > 0
      && rect.height > 0;
    const ok = visible
      && rect.left >= -1
      && rect.top >= -1
      && rect.right <= viewportWidth + 1
      && rect.bottom <= viewportHeight + 1;
    return {
      ok,
      visible,
      viewportWidth,
      viewportHeight,
      rect: {
        left: Math.round(rect.left),
        top: Math.round(rect.top),
        right: Math.round(rect.right),
        bottom: Math.round(rect.bottom),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      },
    };
  }, {
    width: expectedViewportWidth,
    height: expectedViewportHeight,
  });
}

async function readBrowserCookie(page: any, assertion: BrowserAssertionSpec) {
  const name = cookieName(assertion);
  if (!name) throw new Error(`${assertion.type} requires key/name/text/value as the cookie name.`);
  const cookies = await page.context().cookies(page.url());
  return cookies.find((cookie: any) => cookie && cookie.name === name);
}

async function waitForComputedStyle(page: any, assertion: BrowserAssertionSpec, timeout: number) {
  const property = computedStylePropertyName(assertion);
  const expected = computedStyleExpected(assertion);
  if (!property) throw new Error(`${assertion.type} requires property/cssProperty/styleProperty/key.`);
  if (!expected.hasExpected) throw new Error(`${assertion.type} requires value/text.`);
  if (assertion.type === "computedStyleIncludes" && !expected.value) throw new Error("computedStyleIncludes requires value/text as the expected substring.");

  const locator = resolvePlaywrightLocator(page, assertion).first();
  await locator.waitFor({ state: "attached", timeout });
  const deadline = Date.now() + Math.max(1, timeout);
  let actual = "";
  while (Date.now() <= deadline) {
    actual = await locator.evaluate((element: any, cssProperty: string) => {
      return String(globalThis.getComputedStyle(element).getPropertyValue(cssProperty) || "").trim();
    }, property);
    const passed = assertion.type === "computedStyleEquals" ? actual === expected.value : actual.includes(expected.value);
    if (passed) return { passed: true, actualLength: actual.length, expectedLength: expected.value.length };
    await delay(100);
  }
  return { passed: false, actualLength: actual.length, expectedLength: expected.value.length };
}

async function waitForFocusedState(locator: any, expectedFocused: boolean, timeout: number) {
  const deadline = Date.now() + Math.max(1, timeout);
  let lastFocused = false;
  await locator.waitFor({ state: "attached", timeout });
  while (Date.now() <= deadline) {
    lastFocused = await locator.evaluate((element: any) => {
      return element === globalThis.document?.activeElement;
    }).catch(() => false);
    if (lastFocused === expectedFocused) return { focused: lastFocused };
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  return { focused: lastFocused };
}

async function waitForElementCount(locator: any, assertion: BrowserAssertionSpec, timeout: number) {
  const expected = elementCountExpected(assertion);
  if (expected === undefined) throw new Error(`${assertion.type} requires count/expectedCount/minCount/value/text.`);
  const deadline = Date.now() + Math.max(1, timeout);
  let actual = 0;
  while (Date.now() <= deadline) {
    actual = await locator.count();
    const matched = assertion.type === "elementCountAtLeast"
      ? actual >= expected
      : assertion.type === "elementCountAtMost"
        ? actual <= expected
        : actual === expected;
    if (matched) {
      return { actual, expected };
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  actual = await locator.count().catch(() => actual);
  return { actual, expected };
}

function browserDialogMatch(record: CapturedBrowserDialog, assertion: BrowserAssertionSpec) {
  const expectedType = dialogExpectedType(assertion);
  if (expectedType && record.type !== expectedType) {
    return { ok: false, reason: `type ${record.type || "(unknown)"} did not equal ${expectedType}` };
  }

  const expectedMessage = dialogExpectedMessage(assertion);
  if (assertion.type === "dialogMessageIncludes" && !expectedMessage) {
    return { ok: false, reason: "dialogMessageIncludes requires message/messageIncludes/text/value." };
  }
  if (expectedMessage && !record.message.includes(expectedMessage)) {
    return { ok: false, reason: `message length=${record.message.length} did not include expected substring length=${expectedMessage.length}` };
  }

  if (assertion.type === "dialogTypeEquals" && !expectedType) {
    return { ok: false, reason: "dialogTypeEquals requires dialogType/dialog_type/text/value." };
  }
  return { ok: true, reason: "" };
}

async function waitForBrowserDialog(signals: BrowserRuntimeSignals, assertion: BrowserAssertionSpec, timeout: number) {
  const deadline = Date.now() + Math.max(1, timeout);
  let lastReasons: string[] = [];
  while (Date.now() <= deadline) {
    lastReasons = signals.dialogs.map(record => `${record.type || "(dialog)"}: ${browserDialogMatch(record, assertion).reason || "matched"}`);
    const matched = signals.dialogs.find(record => browserDialogMatch(record, assertion).ok);
    if (matched) return matched;
    await delay(100);
  }
  const observed = lastReasons.length ? ` Observed dialogs: ${lastReasons.join(" | ")}.` : " No browser dialogs observed.";
  throw new Error(`Expected browser dialog matching ${dialogAssertionDetail(assertion)}.${observed}`);
}

function browserPopupLogLine(record: CapturedBrowserPopup) {
  const parts = [
    `popup url=${record.url || "(unknown)"}`,
    record.title ? `title=${record.title}` : "",
    record.textPreview ? `text=${record.textPreview}` : "",
    record.error ? `error=${record.error}` : "",
  ].filter(Boolean);
  return parts.join("; ");
}

async function captureBrowserPopup(popup: any, secretBindings: BrowserSecretBinding[] = []): Promise<CapturedBrowserPopup> {
  const record: CapturedBrowserPopup = {
    url: "",
    title: "",
    textPreview: "",
    openedAt: nowIso(),
  };
  try { await popup.waitForLoadState?.("domcontentloaded", { timeout: 5_000 }); } catch {}
  try { record.url = String(popup.url?.() || ""); } catch {}
  try { record.title = compactText(redactBrowserSensitiveText(String(await popup.title?.() || ""), secretBindings), 500); } catch {}
  try {
    const body = popup.locator?.("body");
    record.textPreview = body ? compactText(redactBrowserSensitiveText(String(await body.innerText({ timeout: 1_000 }) || ""), secretBindings), 2000) : "";
  } catch (error: any) {
    record.error = redactBrowserSensitiveText(error.message || String(error), secretBindings);
  }
  return record;
}

function browserPopupMatch(record: CapturedBrowserPopup, assertion: BrowserAssertionSpec) {
  if (assertion.type === "popupOpened") return true;
  if (assertion.type === "popupUrlIncludes") {
    const expected = popupExpectedUrl(assertion);
    if (!expected) throw new Error("popupUrlIncludes requires url/urlIncludes/text/value.");
    return record.url.includes(expected);
  }
  if (assertion.type === "popupTextIncludes") {
    const expected = popupExpectedText(assertion);
    if (!expected) throw new Error("popupTextIncludes requires text/value.");
    return record.textPreview.includes(expected);
  }
  if (assertion.type === "popupTitleIncludes") {
    const expected = popupExpectedTitle(assertion);
    if (!expected) throw new Error("popupTitleIncludes requires title/text/value.");
    return record.title.includes(expected);
  }
  return false;
}

async function waitForBrowserPopup(signals: BrowserRuntimeSignals, assertion: BrowserAssertionSpec, timeout: number) {
  const deadline = Date.now() + Math.max(1, timeout);
  const index = popupIndex(assertion);
  while (Date.now() <= deadline) {
    const candidates = index === undefined ? signals.popups : signals.popups[index] ? [signals.popups[index]] : [];
    for (const popup of candidates) {
      if (browserPopupMatch(popup, assertion)) return popup;
    }
    await delay(100);
  }
  throw new Error(`Expected browser popup matching ${popupAssertionDetail(assertion)}. Observed popups: ${signals.popups.length}.`);
}

async function readClipboardText(page: any) {
  return await page.evaluate(async () => {
    const clipboard = (globalThis.navigator as any)?.clipboard;
    if (!clipboard?.readText) throw new Error("navigator.clipboard.readText is unavailable.");
    return String(await clipboard.readText());
  });
}

async function writeClipboardText(page: any, value: string) {
  await page.evaluate(async (text: string) => {
    const clipboard = (globalThis.navigator as any)?.clipboard;
    if (!clipboard?.writeText) throw new Error("navigator.clipboard.writeText is unavailable.");
    await clipboard.writeText(text);
  }, value);
}

async function waitForClipboardText(page: any, assertion: BrowserAssertionSpec, timeout: number) {
  const expected = clipboardExpectedText(assertion);
  if (!expected && assertion.type === "clipboardTextIncludes") throw new Error("clipboardTextIncludes requires value/text as the expected substring.");
  if (assertion.type === "clipboardTextEquals" && assertion.value === undefined && assertion.text === undefined) throw new Error("clipboardTextEquals requires value/text.");
  const deadline = Date.now() + Math.max(1, timeout);
  let actual = "";
  while (Date.now() <= deadline) {
    actual = await readClipboardText(page);
    const passed = assertion.type === "clipboardTextEquals" ? actual === expected : actual.includes(expected);
    if (passed) return { passed: true, actualLength: actual.length, expectedLength: expected.length };
    await delay(100);
  }
  actual = await readClipboardText(page).catch(() => actual);
  return { passed: false, actualLength: String(actual || "").length, expectedLength: expected.length };
}

interface PngPixelStats {
  width: number;
  height: number;
  uniqueColors: number;
  nonTransparentPixels: number;
  nonWhitePixels: number;
}

function pngChannelCount(colorType: number) {
  if (colorType === 0) return 1;
  if (colorType === 2) return 3;
  if (colorType === 4) return 2;
  if (colorType === 6) return 4;
  return 0;
}

function pngPaeth(left: number, up: number, upperLeft: number) {
  const p = left + up - upperLeft;
  const pa = Math.abs(p - left);
  const pb = Math.abs(p - up);
  const pc = Math.abs(p - upperLeft);
  if (pa <= pb && pa <= pc) return left;
  if (pb <= pc) return up;
  return upperLeft;
}

function readPngPixelStats(buffer: Buffer): PngPixelStats {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (buffer.length < 33 || !buffer.subarray(0, 8).equals(signature)) throw new Error("Invalid PNG signature.");
  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;
  let sawIhdr = false;
  let sawIdat = false;
  let sawIend = false;
  const idatChunks: Buffer[] = [];
  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const dataOffset = offset + 8;
    const nextOffset = dataOffset + length + 4;
    if (nextOffset > buffer.length) throw new Error(`PNG chunk ${type || "(unknown)"} exceeds file length.`);
    if (!sawIhdr && type !== "IHDR") throw new Error("PNG IHDR chunk must be first.");
    if (type === "IHDR") {
      if (length !== 13) throw new Error(`PNG IHDR chunk has invalid length ${length}.`);
      width = buffer.readUInt32BE(dataOffset);
      height = buffer.readUInt32BE(dataOffset + 4);
      bitDepth = buffer[dataOffset + 8];
      colorType = buffer[dataOffset + 9];
      interlace = buffer[dataOffset + 12];
      sawIhdr = true;
    } else if (type === "IDAT") {
      sawIdat = true;
      idatChunks.push(buffer.subarray(dataOffset, dataOffset + length));
    } else if (type === "IEND") {
      sawIend = true;
      break;
    }
    offset = nextOffset;
  }
  if (!sawIhdr || !sawIdat || !sawIend) throw new Error("PNG is missing IHDR, IDAT, or IEND chunks.");
  if (width <= 0 || height <= 0) throw new Error(`PNG dimensions must be positive, got ${width}x${height}.`);
  if (bitDepth !== 8) throw new Error(`PNG visual assertion supports bit depth 8 only, got ${bitDepth}.`);
  if (interlace !== 0) throw new Error("PNG visual assertion does not support interlaced images.");
  const channels = pngChannelCount(colorType);
  if (!channels) throw new Error(`PNG visual assertion does not support color type ${colorType}.`);
  const bytesPerPixel = channels;
  const rowBytes = width * bytesPerPixel;
  const inflated = zlib.inflateSync(Buffer.concat(idatChunks));
  const expectedBytes = (rowBytes + 1) * height;
  if (inflated.length < expectedBytes) throw new Error(`PNG pixel data is truncated: expected at least ${expectedBytes} bytes, got ${inflated.length}.`);
  let readOffset = 0;
  let previous = Buffer.alloc(rowBytes);
  const uniqueColors = new Set<string>();
  let nonTransparentPixels = 0;
  let nonWhitePixels = 0;

  for (let y = 0; y < height; y += 1) {
    const filter = inflated[readOffset];
    readOffset += 1;
    const row = Buffer.from(inflated.subarray(readOffset, readOffset + rowBytes));
    readOffset += rowBytes;
    for (let i = 0; i < rowBytes; i += 1) {
      const left = i >= bytesPerPixel ? row[i - bytesPerPixel] : 0;
      const up = previous[i] || 0;
      const upperLeft = i >= bytesPerPixel ? previous[i - bytesPerPixel] || 0 : 0;
      if (filter === 1) row[i] = (row[i] + left) & 0xff;
      else if (filter === 2) row[i] = (row[i] + up) & 0xff;
      else if (filter === 3) row[i] = (row[i] + Math.floor((left + up) / 2)) & 0xff;
      else if (filter === 4) row[i] = (row[i] + pngPaeth(left, up, upperLeft)) & 0xff;
      else if (filter !== 0) throw new Error(`PNG uses unsupported filter type ${filter}.`);
    }
    for (let x = 0; x < rowBytes; x += bytesPerPixel) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 255;
      if (colorType === 0) {
        r = g = b = row[x];
      } else if (colorType === 2) {
        r = row[x]; g = row[x + 1]; b = row[x + 2];
      } else if (colorType === 4) {
        r = g = b = row[x]; a = row[x + 1];
      } else if (colorType === 6) {
        r = row[x]; g = row[x + 1]; b = row[x + 2]; a = row[x + 3];
      }
      uniqueColors.add(`${r},${g},${b},${a}`);
      if (a > 0) nonTransparentPixels += 1;
      if (a > 0 && !(r >= 250 && g >= 250 && b >= 250)) nonWhitePixels += 1;
    }
    previous = row;
  }
  return { width, height, uniqueColors: uniqueColors.size, nonTransparentPixels, nonWhitePixels };
}

async function evaluateElementScreenshotNotBlank(page: any, assertion: BrowserAssertionSpec, timeout: number) {
  const locator = resolvePlaywrightLocator(page, assertion).first();
  await locator.waitFor({ state: "visible", timeout });
  const png = await locator.screenshot({ type: "png", timeout });
  const stats = readPngPixelStats(Buffer.isBuffer(png) ? png : Buffer.from(png));
  const minUniqueColors = optionalVisualNumber(assertion.minUniqueColors ?? assertion.min_unique_colors);
  const minNonWhitePixels = optionalVisualNumber(assertion.minNonWhitePixels ?? assertion.min_non_white_pixels) ?? 1;
  const ok = stats.nonWhitePixels >= minNonWhitePixels
    && (minUniqueColors === undefined || stats.uniqueColors >= minUniqueColors);
  return { ok, stats, minUniqueColors, minNonWhitePixels };
}

function textOrderHasExplicitContainer(assertion: BrowserAssertionSpec) {
  return !!(
    assertion.selector
    || assertion.locator
    || assertion.testId
    || assertion.test_id
    || assertion.dataTestId
    || assertion.data_testid
    || assertion.label
    || assertion.placeholder
    || assertion.role
    || assertion.altText
    || assertion.alt_text
    || assertion.title
  );
}

function resolveTextOrderLocator(page: any, assertion: BrowserAssertionSpec) {
  return textOrderHasExplicitContainer(assertion)
    ? resolvePlaywrightLocator(page, assertion).first()
    : page.locator("body").first();
}

function normalizeVisibleText(value: string) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

async function waitForTextOrder(page: any, assertion: BrowserAssertionSpec, timeout: number) {
  const expected = textOrderExpectedTexts(assertion).map(normalizeVisibleText).filter(Boolean);
  if (expected.length < 2) throw new Error("textOrder requires at least two values in texts/values/expectedTexts.");
  const locator = resolveTextOrderLocator(page, assertion);
  await locator.waitFor({ state: "attached", timeout });
  const deadline = Date.now() + Math.max(1, timeout);
  let lastFoundCount = 0;
  let lastMissingIndex = 0;
  while (Date.now() <= deadline) {
    const text = normalizeVisibleText(await locator.innerText({ timeout: Math.min(1000, timeout) }).catch(async () => String(await locator.textContent({ timeout: Math.min(1000, timeout) }) || "")));
    let cursor = 0;
    let ok = true;
    const positions: number[] = [];
    for (let i = 0; i < expected.length; i += 1) {
      const index = text.indexOf(expected[i], cursor);
      if (index < 0) {
        ok = false;
        lastMissingIndex = i;
        break;
      }
      positions.push(index);
      cursor = index + expected[i].length;
    }
    lastFoundCount = positions.length;
    if (ok) return { ok: true, expectedCount: expected.length, positions };
    await delay(100);
  }
  return { ok: false, expectedCount: expected.length, foundCount: lastFoundCount, missingIndex: lastMissingIndex };
}

function resolvePlaywrightTableLocator(page: any, assertion: BrowserAssertionSpec) {
  const tableLocator = String(assertion.tableLocator || assertion.table_locator || assertion.tableSelector || assertion.table_selector || "").trim();
  if (tableLocator) return page.locator(tableLocator);
  const hasExplicitTarget = assertion.selector
    || assertion.locator
    || assertion.testId
    || assertion.test_id
    || assertion.dataTestId
    || assertion.data_testid
    || assertion.label
    || assertion.placeholder
    || assertion.role
    || assertion.name
    || assertion.altText
    || assertion.alt_text
    || assertion.title;
  if (hasExplicitTarget) return resolvePlaywrightLocator(page, assertion);
  return page.locator("table, [role='table'], [role='grid']").first();
}

function tableAssertionInput(assertion: BrowserAssertionSpec) {
  return {
    type: assertion.type,
    expectedTexts: tableExpectedTexts(assertion),
    rowText: tableRowText(assertion),
    rowIndex: optionalTableIndex(assertion.rowIndex, assertion.row_index),
    rowNumber: optionalTableIndex(assertion.rowNumber, assertion.row_number),
    columnName: tableColumnName(assertion),
    columnIndex: optionalTableIndex(assertion.columnIndex, assertion.column_index),
    columnNumber: optionalTableIndex(assertion.columnNumber, assertion.column_number),
    exact: assertion.exact === true,
  };
}

async function waitForTableAssertion(page: any, assertion: BrowserAssertionSpec, timeout: number) {
  const locator = resolvePlaywrightTableLocator(page, assertion).first();
  await locator.waitFor({ state: "attached", timeout });
  const input = tableAssertionInput(assertion);
  const deadline = Date.now() + Math.max(1, timeout);
  let lastResult: any = null;
  while (Date.now() <= deadline) {
    lastResult = await locator.evaluate((root: any, current: any) => {
      const win = globalThis as any;
      const normalize = (value: any) => String(value ?? "").replace(/\s+/g, " ").trim();
      const includesOrEquals = (actual: string, expected: string, exact: boolean) => exact ? actual === expected : actual.includes(expected);
      const isRowRoot = root.matches?.("tr,[role='row']");
      const rowElements = (isRowRoot ? [root] : Array.from(root.querySelectorAll?.("tr,[role='row']") || [])) as any[];
      const rows = rowElements.map((row: any, index: number) => {
        const cellElements = Array.from(row.querySelectorAll?.("th,td,[role='cell'],[role='gridcell'],[role='columnheader'],[role='rowheader']") || []) as any[];
        const cells = cellElements.map((cell: any) => normalize(cell.innerText || cell.textContent || ""));
        const headerOnly = cellElements.length > 0 && cellElements.every((cell: any) => {
          const tag = String(cell.tagName || "").toLowerCase();
          const role = String(cell.getAttribute?.("role") || "").toLowerCase();
          return tag === "th" || role === "columnheader";
        });
        return {
          index,
          text: normalize(row.innerText || row.textContent || ""),
          cells: cells.length ? cells : [normalize(row.innerText || row.textContent || "")].filter(Boolean),
          headerOnly,
        };
      }).filter((row: any) => row.text || row.cells.length);

      if (!rows.length) {
        const rootText = normalize(root.innerText || root.textContent || "");
        return { ok: false, reason: rootText ? "No table rows were found under the target." : "Target table has no readable text.", rowCount: 0, headerCount: 0 };
      }

      const headerRow = rows.find((row: any) => row.headerOnly) || rows[0];
      const headers = headerRow?.cells || [];
      const dataRows = rows.filter((row: any) => !row.headerOnly);
      const searchableRows = dataRows.length ? dataRows : rows;
      const expectedTexts = Array.isArray(current.expectedTexts) ? current.expectedTexts.map(normalize).filter(Boolean) : [];

      const rowMatchesLocator = (row: any) => {
        if (current.rowText && !row.text.includes(normalize(current.rowText))) return false;
        return true;
      };

      if (current.type === "tableRowIncludes") {
        if (!expectedTexts.length) return { ok: false, reason: "tableRowIncludes requires text/value/texts/values/expectedTexts.", rowCount: searchableRows.length, headerCount: headers.length };
        const rowIndex = Number.isInteger(current.rowIndex) ? current.rowIndex : Number.isInteger(current.rowNumber) ? current.rowNumber - 1 : undefined;
        const candidates = Number.isInteger(rowIndex)
          ? [searchableRows[rowIndex]].filter(Boolean)
          : searchableRows.filter(rowMatchesLocator);
        if (!candidates.length) {
          return { ok: false, reason: current.rowText ? "No row matched the requested row text." : "No candidate table row was found.", rowCount: searchableRows.length, headerCount: headers.length };
        }
        const matched = candidates.find((row: any) => expectedTexts.every((expected: string) => row.text.includes(expected)));
        return matched
          ? { ok: true, rowCount: searchableRows.length, headerCount: headers.length, matchedRowIndex: matched.index, expectedTextCount: expectedTexts.length }
          : { ok: false, reason: `Candidate rows did not include all ${expectedTexts.length} expected text value(s).`, rowCount: searchableRows.length, headerCount: headers.length };
      }

      if (!expectedTexts.length) return { ok: false, reason: `${current.type} requires text/value.`, rowCount: searchableRows.length, headerCount: headers.length };
      const expected = expectedTexts[0];
      const rowIndex = Number.isInteger(current.rowIndex) ? current.rowIndex : Number.isInteger(current.rowNumber) ? current.rowNumber - 1 : undefined;
      const candidateRows = Number.isInteger(rowIndex)
        ? [searchableRows[rowIndex]].filter(Boolean)
        : current.rowText
          ? searchableRows.filter(rowMatchesLocator)
          : searchableRows.slice(0, 1);
      if (!candidateRows.length) {
        return { ok: false, reason: current.rowText ? "No row matched the requested row text." : "No candidate table row was found.", rowCount: searchableRows.length, headerCount: headers.length };
      }

      let columnIndex = Number.isInteger(current.columnIndex) ? current.columnIndex : Number.isInteger(current.columnNumber) ? current.columnNumber - 1 : undefined;
      if (!Number.isInteger(columnIndex) && current.columnName) {
        const expectedColumn = normalize(current.columnName);
        columnIndex = headers.findIndex((header: string) => includesOrEquals(header, expectedColumn, current.exact));
      }
      if (!Number.isInteger(columnIndex) || columnIndex < 0) {
        return { ok: false, reason: "No table column matched the requested column name/index.", rowCount: searchableRows.length, headerCount: headers.length };
      }

      const actuals = candidateRows.map((row: any) => normalize(row.cells[columnIndex] || ""));
      const matchedIndex = actuals.findIndex((actual: string) => current.type === "tableCellTextEquals" ? actual === expected : actual.includes(expected));
      if (matchedIndex >= 0) {
        return {
          ok: true,
          rowCount: searchableRows.length,
          headerCount: headers.length,
          matchedRowIndex: candidateRows[matchedIndex].index,
          columnIndex,
          actualLength: actuals[matchedIndex].length,
        };
      }
      return {
        ok: false,
        reason: `Cell text did not ${current.type === "tableCellTextEquals" ? "equal" : "include"} the expected value.`,
        rowCount: searchableRows.length,
        headerCount: headers.length,
        columnIndex,
        actualLengths: actuals.map((actual: string) => actual.length),
      };
    }, input);
    if (lastResult?.ok) return lastResult;
    await delay(100);
  }
  return lastResult || { ok: false, reason: "Timed out waiting for table assertion." };
}

async function writePlaywrightPageSnapshots(
  page: any,
  artifactDir: string,
  projectName: string,
  checkName: string,
  index: number,
  secretBindings: BrowserSecretBinding[] = [],
) {
  if (!page) return [];
  const snapshotDir = ensureDir(path.join(artifactDir, "page-snapshots"));
  const base = `${safeSegment(projectName)}-${safeSegment(checkName)}-${index + 1}`;
  const snapshots: string[] = [];
  try {
    const html = String(await page.content?.() || "");
    if (html) {
      const htmlPath = path.join(snapshotDir, `${base}.html`);
      fs.writeFileSync(htmlPath, redactBrowserSensitiveText(html, secretBindings), "utf-8");
      snapshots.push(htmlPath);
    }
  } catch {}
  try {
    const body = page.locator?.("body");
    const text = body ? String(await body.innerText({ timeout: 1_000 }) || "") : "";
    if (text) {
      const textPath = path.join(snapshotDir, `${base}.txt`);
      fs.writeFileSync(textPath, `${redactBrowserSensitiveText(text, secretBindings)}\n`, "utf-8");
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
  dialogMessages: string[];
  popupMessages?: string[];
  networkRequests: string[];
}) {
  const telemetryDir = ensureDir(path.join(input.artifactDir, "browser-telemetry"));
  const base = `${safeSegment(input.projectName)}-${safeSegment(input.checkName)}-${input.index + 1}`;
  const consoleLogPath = path.join(telemetryDir, `${base}.console.log`);
  const dialogLogPath = path.join(telemetryDir, `${base}.dialogs.log`);
  const popupLogPath = path.join(telemetryDir, `${base}.popups.log`);
  const networkLogPath = path.join(telemetryDir, `${base}.network.log`);
  fs.writeFileSync(consoleLogPath, `${input.consoleMessages.length ? input.consoleMessages.join("\n") : "(none observed)"}\n`, "utf-8");
  fs.writeFileSync(dialogLogPath, `${input.dialogMessages.length ? input.dialogMessages.join("\n") : "(none observed)"}\n`, "utf-8");
  fs.writeFileSync(popupLogPath, `${input.popupMessages?.length ? input.popupMessages.join("\n") : "(none observed)"}\n`, "utf-8");
  fs.writeFileSync(networkLogPath, `${input.networkRequests.length ? input.networkRequests.join("\n") : "(none observed)"}\n`, "utf-8");
  return { consoleLogPath, dialogLogPath, popupLogPath, networkLogPath };
}

function browserArtifactBase(projectName: string, checkName: string, index: number) {
  return `${safeSegment(projectName)}-${safeSegment(checkName)}-${index + 1}`;
}

function browserCheckViewport(check: BrowserCheckSpec) {
  const width = Number(check.viewportWidth || check.viewport_width || check.viewport?.width || 1366);
  const height = Number(check.viewportHeight || check.viewport_height || check.viewport?.height || 900);
  const deviceScaleFactor = Number(check.deviceScaleFactor || check.device_scale_factor || 1);
  return {
    width: Number.isFinite(width) && width > 0 ? Math.round(width) : 1366,
    height: Number.isFinite(height) && height > 0 ? Math.round(height) : 900,
    isMobile: check.isMobile === true || check.is_mobile === true,
    deviceScaleFactor: Number.isFinite(deviceScaleFactor) && deviceScaleFactor > 0 ? deviceScaleFactor : 1,
  };
}

function browserCheckContextOptions(check: BrowserCheckSpec): BrowserContextRuntimeOptions {
  const userAgent = String(check.userAgent || check.user_agent || "").trim();
  const locale = String(check.locale || "").trim();
  const timezoneId = String(check.timezoneId || check.timezone_id || "").trim();
  const colorScheme = String(check.colorScheme || check.color_scheme || "").trim();
  const reducedMotion = String(check.reducedMotion || check.reduced_motion || "").trim();
  const permissions = Array.isArray(check.permissions) ? check.permissions.map(item => String(item || "").trim()).filter(Boolean) : [];
  const latitude = Number(check.geolocation?.latitude);
  const longitude = Number(check.geolocation?.longitude);
  const accuracy = Number(check.geolocation?.accuracy);
  const geolocation = Number.isFinite(latitude) && Number.isFinite(longitude)
    ? {
        latitude,
        longitude,
        ...(Number.isFinite(accuracy) ? { accuracy } : {}),
      }
    : undefined;
  return {
    ...(userAgent ? { userAgent } : {}),
    ...(locale ? { locale } : {}),
    ...(timezoneId ? { timezoneId } : {}),
    ...(colorScheme ? { colorScheme } : {}),
    ...(reducedMotion ? { reducedMotion } : {}),
    ...(permissions.length ? { permissions } : {}),
    ...(geolocation ? { geolocation } : {}),
  };
}

function browserContextEvidenceOptions(options: BrowserContextRuntimeOptions): BrowserCheckResult["contextOptions"] {
  return {
    ...(options.userAgent ? { userAgent: options.userAgent } : {}),
    ...(options.locale ? { locale: options.locale } : {}),
    ...(options.timezoneId ? { timezoneId: options.timezoneId } : {}),
    ...(options.colorScheme ? { colorScheme: options.colorScheme } : {}),
    ...(options.reducedMotion ? { reducedMotion: options.reducedMotion } : {}),
    ...(options.permissions?.length ? { permissions: options.permissions } : {}),
    ...(options.geolocation ? { geolocation: options.geolocation } : {}),
    ...(options.storageState ? { storageState: options.storageState } : {}),
  };
}

function browserContextLaunchOptions(options: BrowserContextRuntimeOptions) {
  return {
    ...(options.userAgent ? { userAgent: options.userAgent } : {}),
    ...(options.locale ? { locale: options.locale } : {}),
    ...(options.timezoneId ? { timezoneId: options.timezoneId } : {}),
    ...(options.colorScheme ? { colorScheme: options.colorScheme } : {}),
    ...(options.reducedMotion ? { reducedMotion: options.reducedMotion } : {}),
    ...(options.geolocation ? { geolocation: options.geolocation } : {}),
    ...(options.storageStatePath ? { storageState: options.storageStatePath } : {}),
  };
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

function browserDialogLogLine(record: CapturedBrowserDialog) {
  const parts = [
    `dialog ${record.type || "(unknown)"}`,
    `message=${JSON.stringify(compactText(record.message || "", 500))}`,
    record.defaultValue !== undefined ? `defaultValue=${JSON.stringify(compactText(record.defaultValue, 200))}` : "",
    `accepted=${record.accepted ? "yes" : "no"}`,
    record.error ? `error=${JSON.stringify(compactText(record.error, 500))}` : "",
    `at=${record.occurredAt}`,
  ].filter(Boolean);
  return parts.join(" ");
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function mediaTypeForDownload(fileName: string) {
  const ext = path.extname(fileName || "").toLowerCase();
  if (ext === ".csv") return "text/csv";
  if (ext === ".txt") return "text/plain";
  if (ext === ".json") return "application/json";
  if (ext === ".pdf") return "application/pdf";
  if (ext === ".zip") return "application/zip";
  if (ext === ".xlsx") return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  return "application/octet-stream";
}

async function savePlaywrightDownload(download: any, downloadDir: string, artifactBase: string, index: number): Promise<CapturedBrowserDownload> {
  const suggestedFilename = String(download.suggestedFilename?.() || `download-${index + 1}.bin`);
  const downloadUrl = String(download.url?.() || "");
  const fileName = `${artifactBase}-download-${index + 1}-${safeSegment(suggestedFilename) || "download.bin"}`;
  const targetPath = path.join(downloadDir, fileName);
  try {
    await download.saveAs(targetPath);
    const failure = String(await download.failure?.() || "");
    const sizeBytes = fs.existsSync(targetPath) ? fs.statSync(targetPath).size : 0;
    return {
      suggestedFilename,
      path: targetPath,
      url: downloadUrl,
      ...(failure ? { failure } : {}),
      sizeBytes,
      mediaType: mediaTypeForDownload(suggestedFilename),
    };
  } catch (error: any) {
    return {
      suggestedFilename,
      path: targetPath,
      url: downloadUrl,
      failure: error.message || String(error),
      mediaType: mediaTypeForDownload(suggestedFilename),
    };
  }
}

function downloadFileName(assertion: BrowserAssertionSpec) {
  return String(assertion.fileName || assertion.file_name || assertion.filename || "").trim();
}

function downloadFileNameIncludes(assertion: BrowserAssertionSpec) {
  return String(assertion.fileNameIncludes || assertion.file_name_includes || assertion.filenameIncludes || assertion.filename_includes || "").trim();
}

function downloadContentIncludes(assertion: BrowserAssertionSpec) {
  return String(assertion.contentIncludes || assertion.content_includes || "").trim();
}

function downloadMinBytes(assertion: BrowserAssertionSpec) {
  const raw = assertion.minBytes ?? assertion.min_bytes;
  const value = raw === undefined || raw === null ? 0 : Number(raw);
  return Number.isFinite(value) ? value : 0;
}

function downloadedFileDetail(assertion: BrowserAssertionSpec) {
  const parts = [
    downloadFileName(assertion) ? `filename=${downloadFileName(assertion)}` : "",
    downloadFileNameIncludes(assertion) ? `filenameIncludes=${downloadFileNameIncludes(assertion)}` : "",
    downloadContentIncludes(assertion) ? `contentIncludes=${downloadContentIncludes(assertion)}` : "",
    downloadMinBytes(assertion) ? `minBytes=${downloadMinBytes(assertion)}` : "",
  ].filter(Boolean);
  return parts.join("; ") || "downloaded file";
}

function downloadedFileMatch(record: CapturedBrowserDownload, assertion: BrowserAssertionSpec) {
  if (record.failure) return { ok: false, reason: `download failed: ${record.failure}` };
  if (!record.path || !fs.existsSync(record.path)) return { ok: false, reason: "download file was not saved" };
  const expectedName = downloadFileName(assertion);
  if (expectedName && record.suggestedFilename !== expectedName) {
    return { ok: false, reason: `filename ${record.suggestedFilename} did not equal ${expectedName}` };
  }
  const expectedNameIncludes = downloadFileNameIncludes(assertion);
  if (expectedNameIncludes && !record.suggestedFilename.includes(expectedNameIncludes)) {
    return { ok: false, reason: `filename ${record.suggestedFilename} did not include ${expectedNameIncludes}` };
  }
  const minBytes = downloadMinBytes(assertion);
  const sizeBytes = record.sizeBytes ?? fs.statSync(record.path).size;
  if (minBytes && sizeBytes < minBytes) return { ok: false, reason: `download size ${sizeBytes} was smaller than ${minBytes}` };
  const expectedContent = downloadContentIncludes(assertion);
  if (expectedContent) {
    const content = fs.readFileSync(record.path).toString("utf-8");
    if (!content.includes(expectedContent)) return { ok: false, reason: `download content did not include ${expectedContent}` };
  }
  return { ok: true, reason: record.path };
}

async function waitForDownloadedFile(signals: BrowserRuntimeSignals, assertion: BrowserAssertionSpec, timeout: number) {
  const deadline = Date.now() + timeout;
  let lastReasons: string[] = [];
  while (Date.now() <= deadline) {
    for (const record of signals.downloads) {
      const match = downloadedFileMatch(record, assertion);
      if (match.ok) return record;
    }
    lastReasons = signals.downloads.map(record => `${record.suggestedFilename || "(download)"}: ${downloadedFileMatch(record, assertion).reason}`);
    await delay(100);
  }
  const pending = Math.max(0, signals.downloadPromises.length - signals.downloads.length);
  const observed = signals.downloads.length ? ` Observed: ${lastReasons.join(" | ")}` : " No downloads were observed.";
  throw new Error(`Expected downloaded file matching ${downloadedFileDetail(assertion)}.${pending > 0 ? ` Pending downloads: ${pending}.` : ""}${observed}`);
}

function downloadArtifacts(downloads: CapturedBrowserDownload[]): BrowserEvidenceArtifact[] {
  return downloads
    .filter(download => download.path && fs.existsSync(download.path))
    .map(download => ({
      type: "download" as const,
      title: `Download: ${download.suggestedFilename}`,
      path: download.path,
      source: "playwright:download",
      ...(download.mediaType ? { mediaType: download.mediaType } : {}),
    }));
}

function uploadFilePath(action: BrowserActionSpec) {
  return String(action.filePath || action.file_path || action.path || "").trim();
}

function uploadFileName(action: BrowserActionSpec | NonNullable<BrowserActionSpec["files"]>[number]) {
  return String(action.fileName || action.file_name || action.filename || "upload.txt").trim();
}

function uploadMediaType(action: BrowserActionSpec | NonNullable<BrowserActionSpec["files"]>[number]) {
  return String(action.mediaType || action.media_type || "text/plain").trim();
}

function uploadFileContent(action: BrowserActionSpec | NonNullable<BrowserActionSpec["files"]>[number]) {
  if (action.fileContent !== undefined) return String(action.fileContent);
  if (action.file_content !== undefined) return String(action.file_content);
  if (action.content !== undefined) return String(action.content);
  return "";
}

function uploadFileActionDetail(action: BrowserActionSpec) {
  const target = browserTargetDetail(action);
  const filePath = uploadFilePath(action);
  const fileNames = uploadFileItems(action).map(item => {
    const itemPath = String(item.filePath || item.file_path || item.path || "").trim();
    return itemPath ? path.basename(itemPath) : uploadFileName(item);
  });
  const fallback = filePath ? path.basename(filePath) : uploadFileName(action);
  return `${target || "file input"}; file=${fileNames.length ? fileNames.join(", ") : fallback}`;
}

function uploadFileItems(action: BrowserActionSpec): Array<NonNullable<BrowserActionSpec["files"]>[number]> {
  const filePaths = Array.isArray(action.filePaths) && action.filePaths.length ? action.filePaths : Array.isArray(action.file_paths) ? action.file_paths : [];
  const files = Array.isArray(action.files) ? action.files : [];
  if (files.length || filePaths.length) {
    return [
      ...filePaths.map(filePath => ({ filePath, file_path: filePath, path: filePath })),
      ...files,
    ];
  }
  return [action];
}

function uploadFilePayloadForItem(project: NormalizedTestAgentProjectTarget, item: NonNullable<BrowserActionSpec["files"]>[number]) {
  const filePath = String(item.filePath || item.file_path || item.path || "").trim();
  if (filePath) {
    const resolved = path.isAbsolute(filePath) ? path.resolve(filePath) : path.resolve(project.workDir || process.cwd(), filePath);
    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) throw new Error(`Upload file does not exist: ${resolved}`);
    return resolved;
  }
  const content = uploadFileContent(item);
  if (content === "" && item.fileContent === undefined && item.file_content === undefined && item.content === undefined) {
    throw new Error("uploadFile requires filePath/file_path/path or fileContent/file_content/content.");
  }
  return {
    name: uploadFileName(item),
    mimeType: uploadMediaType(item),
    buffer: Buffer.from(content, "utf-8"),
  };
}

function uploadFilePayload(project: NormalizedTestAgentProjectTarget, action: BrowserActionSpec) {
  const payloads = uploadFileItems(action).map(item => uploadFilePayloadForItem(project, item));
  return payloads.length === 1 ? payloads[0] : payloads;
}

function originOf(rawUrl: string) {
  try {
    return new URL(rawUrl).origin;
  } catch {
    return "";
  }
}

function pathnameOf(rawUrl: string) {
  try {
    return new URL(rawUrl).pathname.toLowerCase();
  } catch {
    return "";
  }
}

function responseResourceType(response: any) {
  try {
    return String(response.request?.()?.resourceType?.() || "");
  } catch {
    return "";
  }
}

function isIgnorableHttpResourceError(responseUrl: string, resourceType: string) {
  const pathname = pathnameOf(responseUrl);
  if (pathname === "/favicon.ico" || pathname.endsWith("/favicon.ico")) return true;
  if (resourceType === "other" && pathname.endsWith(".map")) return true;
  return false;
}

function playwrightNetworkErrorForResponse(input: {
  status: number;
  responseUrl: string;
  resourceType: string;
  monitoredOrigins: Set<string>;
  failOnHttpResourceError: boolean;
}) {
  const kind = input.resourceType || "resource";
  if (input.status >= 500) return `http_error ${input.status} ${kind} ${input.responseUrl}`;
  if (input.status < 400 || !input.failOnHttpResourceError) return "";

  const origin = originOf(input.responseUrl);
  if (!origin || !input.monitoredOrigins.has(origin)) return "";
  if (isIgnorableHttpResourceError(input.responseUrl, input.resourceType)) return "";
  return `http_resource_error ${input.status} ${kind} ${input.responseUrl}`;
}

async function grantClipboardPermissions(browserContext: any, origins: Set<string>) {
  if (!browserContext?.grantPermissions) return;
  const permissions = ["clipboard-read", "clipboard-write"];
  const originList = Array.from(origins).filter(Boolean);
  if (!originList.length) {
    try { await browserContext.grantPermissions(permissions); } catch {}
    return;
  }
  for (const origin of originList) {
    try { await browserContext.grantPermissions(permissions, { origin }); } catch {}
  }
}

async function grantBrowserContextPermissions(browserContext: any, origins: Set<string>, permissions: string[]) {
  if (!browserContext?.grantPermissions || !permissions.length) return;
  const originList = Array.from(origins).filter(Boolean);
  if (!originList.length) {
    try { await browserContext.grantPermissions(permissions); } catch {}
    return;
  }
  for (const origin of originList) {
    try { await browserContext.grantPermissions(permissions, { origin }); } catch {}
  }
}

function compactNetworkPayload(value: any, max = 1000) {
  return compactText(value, max).replace(/\s+/g, " ").trim();
}

function redactRequestHeaders(headers: Record<string, any>) {
  const redacted: Record<string, string> = {};
  const sensitive = /^(authorization|cookie|set-cookie|x-api-key|x-auth-token|proxy-authorization)$/i;
  for (const [key, value] of Object.entries(headers || {})) {
    const name = String(key || "").toLowerCase();
    redacted[name] = sensitive.test(name) ? "[redacted]" : compactNetworkPayload(value, 500);
  }
  return redacted;
}

function requestDetailsLine(request: any, secretBindings: BrowserSecretBinding[] = []) {
  const method = request.method?.() || "GET";
  const requestUrl = request.url?.() || "";
  let headers: Record<string, any> = {};
  let body = "";
  try { headers = request.headers?.() || {}; } catch {}
  try { body = request.postData?.() || ""; } catch {}
  const headersText = JSON.stringify(redactRequestHeaders(headers));
  return redactBrowserSensitiveText(
    `request_details ${method} ${requestUrl} headers=${headersText}${body ? ` body=${compactNetworkPayload(body, 2000)}` : ""}`,
    secretBindings,
  );
}

function shouldCaptureResponseBody(resourceType: string, headers: Record<string, any>) {
  const contentType = String(headers["content-type"] || headers["Content-Type"] || "").toLowerCase();
  return resourceType === "fetch"
    || resourceType === "xhr"
    || contentType.includes("application/json")
    || contentType.startsWith("text/");
}

async function responseDetailsLine(
  response: any,
  status: number,
  resourceType: string,
  responseUrl: string,
  secretBindings: BrowserSecretBinding[] = [],
) {
  let headers: Record<string, any> = {};
  let body = "";
  try { headers = response.headers?.() || {}; } catch {}
  if (shouldCaptureResponseBody(resourceType, headers)) {
    try { body = await response.text(); } catch {}
  }
  const headersText = JSON.stringify(redactRequestHeaders(headers));
  return redactBrowserSensitiveText(
    `response_details ${status} ${resourceType || "unknown"} ${responseUrl} headers=${headersText}${body ? ` body=${compactNetworkPayload(body, 4000)}` : ""}`,
    secretBindings,
  );
}

async function finalizePlaywrightBrowserArtifacts(input: {
  browserContext: any;
  page: any;
  traceStarted: boolean;
  tracePath: string;
  harPath: string;
  collectVideo: boolean;
  lifecycle?: BrowserResourceLifecycleRecorder;
  lifecycleResourceId?: string;
}) {
  const artifacts: BrowserEvidenceArtifact[] = [];
  let video: any = null;
  try { video = input.collectVideo ? input.page?.video?.() : null; } catch {}
  if (input.traceStarted) {
    try { await input.browserContext?.tracing?.stop?.({ path: input.tracePath }); } catch {}
  }
  try {
    await input.browserContext?.close?.();
    if (input.lifecycleResourceId) input.lifecycle?.released(input.lifecycleResourceId);
  } catch (error: any) {
    if (input.lifecycleResourceId) input.lifecycle?.cleanupFailed(input.lifecycleResourceId, error.message || String(error));
  }
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

function dragDestinationTarget(action: BrowserActionSpec): Partial<BrowserActionSpec> {
  return {
    selector: action.destinationSelector || action.destination_selector || action.destinationLocator || action.destination_locator,
    locator: action.destinationLocator || action.destination_locator || action.destinationSelector || action.destination_selector,
    testId: action.destinationTestId || action.destination_test_id || action.destinationDataTestId || action.destination_data_testid,
    test_id: action.destination_test_id || action.destinationTestId || action.destinationDataTestId || action.destination_data_testid,
    dataTestId: action.destinationDataTestId || action.destination_data_testid || action.destinationTestId || action.destination_test_id,
    data_testid: action.destination_data_testid || action.destinationDataTestId || action.destinationTestId || action.destination_test_id,
    label: action.destinationLabel || action.destination_label,
    placeholder: action.destinationPlaceholder || action.destination_placeholder,
    role: action.destinationRole || action.destination_role,
    name: action.destinationName || action.destination_name || action.destinationText || action.destination_text,
    text: action.destinationText || action.destination_text,
    altText: action.destinationAltText || action.destination_alt_text,
    alt_text: action.destination_alt_text || action.destinationAltText,
    title: action.destinationTitle || action.destination_title,
    exact: action.destinationExact === undefined && action.destination_exact === undefined ? action.exact : action.destinationExact !== false && action.destination_exact !== false,
  };
}

function dragActionDetail(action: BrowserActionSpec) {
  const destination = dragDestinationTarget(action);
  return `${browserTargetDetail(action) || "source"} -> ${browserTargetDetail(destination) || "destination"}`;
}

function resolvedValueDetail(resolved?: ResolvedBrowserActionValue) {
  if (!resolved?.provided) return "";
  return resolved.source === "environment"
    ? `value source=env:${resolved.envName}; value length=${resolved.value.length}`
    : `value length=${resolved.value.length}`;
}

function clipboardActionDetail(action: BrowserActionSpec, resolved?: ResolvedBrowserActionValue) {
  const value = resolved?.provided ? resolved.value : clipboardExpectedText(action);
  const source = resolvedValueDetail(resolved);
  return source || (value ? `clipboard text length=${value.length}` : "clipboard text");
}

function cookieActionName(action: BrowserActionSpec) {
  return String(action.key || "").trim();
}

function cookieActionNames(action: BrowserActionSpec) {
  const names = Array.isArray(action.keys) ? action.keys.map(name => String(name || "").trim()).filter(Boolean) : [];
  const single = cookieActionName(action);
  return names.length ? names : single ? [single] : [];
}

function cookieActionValue(action: BrowserActionSpec) {
  return String(action.value ?? action.text ?? action.content ?? "");
}

function cookieActionHasValue(action: BrowserActionSpec) {
  return action.value !== undefined || action.text !== undefined || action.content !== undefined;
}

function cookieActionPath(action: BrowserActionSpec) {
  return String(action.cookiePath || action.cookie_path || "/").trim() || "/";
}

function cookieActionSameSite(action: BrowserActionSpec) {
  const raw = String(action.sameSite || action.same_site || "").trim().toLowerCase();
  if (raw === "strict") return "Strict";
  if (raw === "lax") return "Lax";
  if (raw === "none") return "None";
  return undefined;
}

function cookieActionBoolean(value: any) {
  return value === undefined ? undefined : value === true || String(value).toLowerCase() === "true";
}

function cookieActionUrl(page: any, project: NormalizedTestAgentProjectTarget, action: BrowserActionSpec) {
  const currentUrl = String(page?.url?.() || "");
  const rawUrl = action.url || (currentUrl && currentUrl !== "about:blank" ? currentUrl : "") || project.targetUrl;
  return resolveUrl(project.targetUrl, rawUrl);
}

function cookieActionDetail(action: BrowserActionSpec, resolved?: ResolvedBrowserActionValue) {
  const names = cookieActionNames(action);
  if (action.type === "clearCookies") {
    return `${names.length ? `cookie count=${names.length}` : "all cookies"}${action.domain ? `; domain=${action.domain}` : ""}`;
  }
  const valueLength = resolved?.provided ? resolved.value.length : cookieActionValue(action).length;
  const source = resolved?.source === "environment" ? `; value source=env:${resolved.envName}` : "";
  return `cookie=${cookieActionName(action) || "(missing)"}; value length=${valueLength}${source}${action.domain ? `; domain=${action.domain}` : ""}`;
}

function buildPlaywrightCookie(
  page: any,
  project: NormalizedTestAgentProjectTarget,
  action: BrowserActionSpec,
  resolved?: ResolvedBrowserActionValue,
) {
  const name = cookieActionName(action);
  if (!name) throw new Error("setCookie requires key/cookieName/name.");
  if (!resolved?.provided && !cookieActionHasValue(action)) throw new Error("setCookie requires value/text/content or valueEnv.");
  const cookie: Record<string, any> = {
    name,
    value: resolved?.provided ? resolved.value : cookieActionValue(action),
  };
  const domain = String(action.domain || "").trim();
  if (domain) {
    cookie.domain = domain;
    cookie.path = cookieActionPath(action);
  } else {
    cookie.url = cookieActionUrl(page, project, action);
    if (action.cookiePath || action.cookie_path) cookie.path = cookieActionPath(action);
  }
  const expires = Number(action.expires);
  if (Number.isFinite(expires)) cookie.expires = expires;
  const httpOnly = cookieActionBoolean(action.httpOnly ?? action.http_only);
  if (httpOnly !== undefined) cookie.httpOnly = httpOnly;
  const secure = cookieActionBoolean(action.secure);
  if (secure !== undefined) cookie.secure = secure;
  const sameSite = cookieActionSameSite(action);
  if (sameSite) cookie.sameSite = sameSite;
  return cookie;
}

function sanitizePlaywrightCookie(cookie: any) {
  const sanitized: Record<string, any> = {
    name: String(cookie.name || ""),
    value: String(cookie.value || ""),
    domain: cookie.domain,
    path: cookie.path || "/",
  };
  if (cookie.expires !== undefined) sanitized.expires = cookie.expires;
  if (cookie.httpOnly !== undefined) sanitized.httpOnly = cookie.httpOnly;
  if (cookie.secure !== undefined) sanitized.secure = cookie.secure;
  if (cookie.sameSite !== undefined) sanitized.sameSite = cookie.sameSite;
  return sanitized.name && sanitized.domain ? sanitized : null;
}

async function clearBrowserCookies(page: any, action: BrowserActionSpec) {
  const names = new Set(cookieActionNames(action));
  const browserContext = page.context();
  if (!names.size) {
    await browserContext.clearCookies();
    return;
  }
  const existing = await browserContext.cookies();
  const kept = existing
    .filter((cookie: any) => cookie && !names.has(String(cookie.name || "")))
    .map(sanitizePlaywrightCookie)
    .filter(Boolean);
  await browserContext.clearCookies();
  if (kept.length) await browserContext.addCookies(kept);
}

function storageActionValue(action: BrowserActionSpec) {
  return String(action.value ?? action.text ?? action.content ?? "");
}

function storageActionHasValue(action: BrowserActionSpec) {
  return action.value !== undefined || action.text !== undefined || action.content !== undefined;
}

function storageActionKey(action: BrowserActionSpec) {
  return String(action.key || "").trim();
}

function storageActionKeys(action: BrowserActionSpec) {
  const keys = Array.isArray(action.keys) ? action.keys.map(key => String(key || "").trim()).filter(Boolean) : [];
  const single = storageActionKey(action);
  return keys.length ? keys : single ? [single] : [];
}

function storageActionArea(action: BrowserActionSpec): "localStorage" | "sessionStorage" | "both" {
  if (action.type === "setLocalStorage") return "localStorage";
  if (action.type === "setSessionStorage") return "sessionStorage";
  const raw = String(action.storage || action.storageArea || action.storage_area || "").trim().toLowerCase();
  if (raw === "local" || raw === "localstorage" || raw === "local_storage") return "localStorage";
  if (raw === "session" || raw === "sessionstorage" || raw === "session_storage") return "sessionStorage";
  return "both";
}

function storageActionDetail(action: BrowserActionSpec, resolved?: ResolvedBrowserActionValue) {
  const area = storageActionArea(action);
  const keys = storageActionKeys(action);
  if (action.type === "clearStorage") {
    return `${area}; ${keys.length ? `key count=${keys.length}` : "clear all"}`;
  }
  const valueLength = resolved?.provided ? resolved.value.length : storageActionValue(action).length;
  const source = resolved?.source === "environment" ? `; value source=env:${resolved.envName}` : "";
  return `${area}; key=${storageActionKey(action) || "(missing)"}; value length=${valueLength}${source}`;
}

function scrollAmount(action: BrowserActionSpec) {
  const amount = Number(action.amount ?? action.value ?? action.text ?? 600);
  return Number.isFinite(amount) && amount !== 0 ? Math.abs(amount) : 600;
}

function scrollDirection(action: BrowserActionSpec) {
  return action.direction === "up" || action.direction === "left" || action.direction === "right" ? action.direction : "down";
}

function scrollDelta(action: BrowserActionSpec) {
  const amount = scrollAmount(action);
  const direction = scrollDirection(action);
  if (direction === "up") return { deltaX: 0, deltaY: -amount };
  if (direction === "left") return { deltaX: -amount, deltaY: 0 };
  if (direction === "right") return { deltaX: amount, deltaY: 0 };
  return { deltaX: 0, deltaY: amount };
}

function scrollHasExplicitTarget(action: BrowserActionSpec) {
  return !!(
    action.selector
    || action.locator
    || action.testId
    || action.test_id
    || action.dataTestId
    || action.data_testid
    || action.label
    || action.placeholder
    || action.role
    || action.name
    || action.altText
    || action.alt_text
    || action.title
  );
}

function scrollActionDetail(action: BrowserActionSpec) {
  const target = scrollHasExplicitTarget(action) ? browserTargetDetail(action) : "page";
  return `${target}; ${scrollDirection(action)} ${scrollAmount(action)}px`;
}

function typeTextValue(action: BrowserActionSpec) {
  return String(action.value ?? action.text ?? "");
}

function typeTextDelay(action: BrowserActionSpec) {
  const delay = Number(action.delay ?? action.delayMs ?? action.delay_ms ?? 0);
  return Number.isFinite(delay) && delay > 0 ? delay : 0;
}

function typeTextActionDetail(action: BrowserActionSpec, resolved?: ResolvedBrowserActionValue) {
  const target = browserTargetDetail(action) || "focused element";
  const delay = typeTextDelay(action);
  const valueLength = resolved?.provided ? resolved.value.length : typeTextValue(action).length;
  const source = resolved?.source === "environment" ? `; value source=env:${resolved.envName}` : "";
  return `${target}; text length=${valueLength}${source}${delay ? `; delay=${delay}ms` : ""}`;
}

function browserNetworkStateActionDetail(action: BrowserActionSpec) {
  return action.type === "setOffline" ? "browser network offline" : "browser network online";
}

function browserActionDetail(action: BrowserActionSpec, resolved?: ResolvedBrowserActionValue) {
  if (action.type === "uploadFile") return uploadFileActionDetail(action);
  if (action.type === "dragTo") return dragActionDetail(action);
  if (action.type === "setClipboard") return clipboardActionDetail(action, resolved);
  if (action.type === "setCookie" || action.type === "clearCookies") return cookieActionDetail(action, resolved);
  if (action.type === "setLocalStorage" || action.type === "setSessionStorage" || action.type === "clearStorage") return storageActionDetail(action, resolved);
  if (action.type === "setOffline" || action.type === "setOnline") return browserNetworkStateActionDetail(action);
  if (action.type === "scroll") return scrollActionDetail(action);
  if (action.type === "typeText") return typeTextActionDetail(action, resolved);
  const target = browserTargetDetail(action);
  const source = resolved?.source === "environment" ? resolvedValueDetail(resolved) : "";
  return [target, source].filter(Boolean).join("; ");
}

async function runAction(page: any, project: NormalizedTestAgentProjectTarget, action: BrowserActionSpec, defaultTimeout: number): Promise<BrowserStepResult> {
  const timeout = Number(action.timeoutMs || action.timeout_ms || defaultTimeout);
  const name = `action:${action.type}`;
  let resolvedValue: ResolvedBrowserActionValue | undefined;
  try {
    if (browserActionSupportsEnvironmentValue(action)) resolvedValue = resolveBrowserActionValue(project, action);
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
    } else if (action.type === "doubleClick") {
      await resolvePlaywrightLocator(page, action).dblclick({ timeout });
    } else if (action.type === "rightClick") {
      await resolvePlaywrightLocator(page, action).click({ button: "right", timeout });
    } else if (action.type === "fill") {
      await resolvePlaywrightLocator(page, action).fill(resolvedValue?.value ?? String(action.value ?? action.text ?? ""), { timeout });
    } else if (action.type === "selectOption") {
      const expected = resolvedValue?.value ?? String(action.value ?? action.text ?? "");
      const locator = resolvePlaywrightLocator(page, action).first();
      try {
        await locator.waitFor({ state: "attached", timeout });
        const matchesValue = await locator.evaluate((element: any, candidate: string) => {
          return Array.from(element.options || []).some((option: any) => String(option.value) === candidate);
        }, expected);
        await locator.selectOption(matchesValue ? { value: expected } : { label: expected }, { timeout });
      } catch (error: any) {
        throw new Error(`Could not select option using the configured value (length=${expected.length}): ${error.message || String(error)}`);
      }
    } else if (action.type === "check") {
      await resolvePlaywrightLocator(page, action).check({ timeout });
    } else if (action.type === "uncheck") {
      await resolvePlaywrightLocator(page, action).uncheck({ timeout });
    } else if (action.type === "uploadFile") {
      const payload = uploadFilePayload(project, action);
      await resolvePlaywrightLocator(page, action).first().setInputFiles(payload, { timeout });
    } else if (action.type === "dragTo") {
      const source = resolvePlaywrightLocator(page, action).first();
      const destinationTarget = dragDestinationTarget(action);
      const destination = resolvePlaywrightLocator(page, destinationTarget).first();
      await source.waitFor({ state: "visible", timeout });
      await destination.waitFor({ state: "visible", timeout });
      await source.dragTo(destination, { timeout });
    } else if (action.type === "setClipboard") {
      await writeClipboardText(page, resolvedValue?.value ?? clipboardExpectedText(action));
    } else if (action.type === "setCookie") {
      await page.context().addCookies([buildPlaywrightCookie(page, project, action, resolvedValue)]);
    } else if (action.type === "clearCookies") {
      await clearBrowserCookies(page, action);
    } else if (action.type === "setLocalStorage" || action.type === "setSessionStorage") {
      const storageName = storageActionArea(action);
      const key = storageActionKey(action);
      if (storageName === "both") throw new Error(`${action.type} requires a single storage area.`);
      if (!key) throw new Error(`${action.type} requires key/storageKey/text.`);
      if (!resolvedValue?.provided && !storageActionHasValue(action)) throw new Error(`${action.type} requires value/text/content or valueEnv.`);
      await page.evaluate(({ storageName, key, value }: any) => {
        (globalThis as any)[storageName].setItem(key, value);
      }, { storageName, key, value: resolvedValue?.value ?? storageActionValue(action) });
    } else if (action.type === "clearStorage") {
      const area = storageActionArea(action);
      const keys = storageActionKeys(action);
      const storageNames = area === "both" ? ["localStorage", "sessionStorage"] : [area];
      await page.evaluate(({ storageNames, keys }: any) => {
        for (const storageName of storageNames) {
          const storage = (globalThis as any)[storageName];
          if (!storage) continue;
          if (keys.length) {
            for (const key of keys) storage.removeItem(key);
          } else {
            storage.clear();
          }
        }
      }, { storageNames, keys });
    } else if (action.type === "setOffline" || action.type === "setOnline") {
      await page.context().setOffline(action.type === "setOffline");
    } else if (action.type === "hover") {
      await resolvePlaywrightLocator(page, action).hover({ timeout });
    } else if (action.type === "focus") {
      await resolvePlaywrightLocator(page, action).focus({ timeout });
    } else if (action.type === "typeText") {
      const value = resolvedValue?.value ?? typeTextValue(action);
      if (!value) throw new Error("typeText requires value/text or valueEnv.");
      const locatorPlan = buildSemanticLocatorPlan(action);
      if (locatorPlan) await resolvePlaywrightLocator(page, action).focus({ timeout });
      await page.keyboard.type(value, { delay: typeTextDelay(action) });
    } else if (action.type === "scroll") {
      const delta = scrollDelta(action);
      if (action.coordinate) {
        await page.mouse.move(Number(action.coordinate[0]), Number(action.coordinate[1]));
      }
      if (scrollHasExplicitTarget(action)) {
        const locator = resolvePlaywrightLocator(page, action).first();
        await locator.waitFor({ state: "attached", timeout });
        await locator.evaluate((element: any, current: any) => {
          element.scrollBy({ left: current.deltaX, top: current.deltaY, behavior: "instant" });
        }, delta);
      } else if (!action.coordinate) {
        await page.evaluate((current: any) => {
          globalThis.scrollBy({ left: current.deltaX, top: current.deltaY, behavior: "instant" });
        }, delta);
      } else {
        await page.mouse.wheel(delta.deltaX, delta.deltaY);
      }
    } else if (action.type === "press") {
      const key = String(action.key || action.value || action.text || "Enter");
      const locatorPlan = buildSemanticLocatorPlan(action);
      if (locatorPlan) await resolvePlaywrightLocator(page, action).press(key, { timeout });
      else await page.keyboard.press(key);
    } else if (action.type === "waitForSelector") {
      await resolvePlaywrightLocator(page, action).waitFor({ state: "visible", timeout });
    } else if (action.type === "waitForText") {
      await page.getByText(String(action.text || action.value || "")).first().waitFor({ state: "visible", timeout });
    } else if (action.type === "waitForUrl") {
      const expected = String(action.url || action.text || action.value || "");
      if (!expected) throw new Error("waitForUrl requires url/text/value.");
      await page.waitForURL((url: URL) => url.toString().includes(expected), { timeout });
    } else if (action.type === "waitForTimeout") {
      await page.waitForTimeout(Math.min(timeout, Number(action.value || action.text || 1000)));
    } else if (action.type === "evaluate") {
      await page.evaluate(String(action.text || action.value || "undefined"));
    } else {
      throw new Error(`Action ${action.type} is not mapped for Playwright.`);
    }
    return { kind: "action", name, status: "passed", detail: browserActionDetail(action, resolvedValue) };
  } catch (error: any) {
    return {
      kind: "action",
      name,
      status: "failed",
      detail: browserActionDetail(action, resolvedValue),
      error: redactBrowserSensitiveText(error.message || String(error), resolvedValue?.source === "environment"
        ? [{ envName: resolvedValue.envName || "credential", value: resolvedValue.value }]
        : []),
    };
  }
}

async function runAssertion(page: any, assertion: BrowserAssertionSpec, signals: BrowserRuntimeSignals, defaultTimeout: number): Promise<BrowserStepResult> {
  const timeout = Number(assertion.timeoutMs || assertion.timeout_ms || defaultTimeout);
  const name = `assert:${assertion.type}`;
  try {
    if (assertion.type === "visible") {
      await resolvePlaywrightLocator(page, assertion).waitFor({ state: "visible", timeout });
    } else if (assertion.type === "notVisible") {
      const visible = await resolvePlaywrightLocator(page, assertion).first().isVisible({ timeout }).catch(() => false);
      if (visible) throw new Error(`Expected target to be hidden: ${browserTargetDetail(assertion)}`);
    } else if (assertion.type === "present") {
      await resolvePlaywrightLocator(page, assertion).first().waitFor({ state: "attached", timeout });
    } else if (assertion.type === "notPresent") {
      const locator = resolvePlaywrightLocator(page, assertion);
      const result = await waitForElementCount(locator, { ...assertion, type: "elementCountEquals", count: 0 }, timeout);
      if (result.actual !== 0) throw new Error(`Expected target to be absent from DOM, got actual count=${result.actual}: ${browserTargetDetail(assertion)}.`);
    } else if (assertion.type === "focused" || assertion.type === "notFocused") {
      const locator = resolvePlaywrightLocator(page, assertion).first();
      const expectedFocused = assertion.type === "focused";
      const result = await waitForFocusedState(locator, expectedFocused, timeout);
      if (result.focused !== expectedFocused) {
        throw new Error(`Expected target to be ${expectedFocused ? "focused" : "not focused"}: ${browserTargetDetail(assertion)}.`);
      }
    } else if (assertion.type === "enabled" || assertion.type === "disabled") {
      const enabled = await resolvePlaywrightLocator(page, assertion).first().isEnabled({ timeout });
      if (assertion.type === "enabled" && !enabled) throw new Error(`Expected target to be enabled: ${browserTargetDetail(assertion)}`);
      if (assertion.type === "disabled" && enabled) throw new Error(`Expected target to be disabled: ${browserTargetDetail(assertion)}`);
    } else if (assertion.type === "checked" || assertion.type === "notChecked") {
      const checked = await resolvePlaywrightLocator(page, assertion).first().isChecked({ timeout });
      if (assertion.type === "checked" && !checked) throw new Error(`Expected target to be checked: ${browserTargetDetail(assertion)}`);
      if (assertion.type === "notChecked" && checked) throw new Error(`Expected target to be unchecked: ${browserTargetDetail(assertion)}`);
    } else if (assertion.type === "selectedValue") {
      const expected = String(assertion.value ?? assertion.text ?? "");
      const actual = await resolvePlaywrightLocator(page, assertion).first().inputValue({ timeout });
      if (actual !== expected) throw new Error(`Expected selected value ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}.`);
    } else if (assertion.type === "selectedTextIncludes") {
      const expected = String(assertion.value ?? assertion.text ?? "");
      const actual = await resolvePlaywrightLocator(page, assertion).first().evaluate((element: any) => {
        const options = Array.from(element.selectedOptions || []) as any[];
        return options.map(option => String(option.textContent || option.label || option.value || "").trim()).join(" | ");
      });
      if (!actual.includes(expected)) throw new Error(`Expected selected option text to include ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}.`);
    } else if (assertion.type === "inputValueEquals" || assertion.type === "inputValueIncludes") {
      const expected = String(assertion.value ?? assertion.text ?? "");
      if (!expected && assertion.type === "inputValueIncludes") throw new Error("inputValueIncludes requires value/text as the expected substring.");
      const actual = await resolvePlaywrightLocator(page, assertion).first().inputValue({ timeout });
      if (assertion.type === "inputValueEquals" && actual !== expected) {
        throw new Error(`Expected input value to equal requested value: ${inputValueAssertionDetail(assertion)}; actual length=${String(actual || "").length}.`);
      }
      if (assertion.type === "inputValueIncludes" && !actual.includes(expected)) {
        throw new Error(`Expected input value to include requested substring: ${inputValueAssertionDetail(assertion)}; actual length=${String(actual || "").length}.`);
      }
    } else if (assertion.type === "attributeEquals" || assertion.type === "attributeIncludes") {
      const attr = attributeName(assertion);
      const expected = String(assertion.value ?? assertion.text ?? "");
      if (!attr) throw new Error(`${assertion.type} requires attribute/attributeName/attribute_name/key.`);
      if (!expected && assertion.type === "attributeIncludes") throw new Error("attributeIncludes requires value/text as the expected substring.");
      const actual = await resolvePlaywrightLocator(page, assertion).first().getAttribute(attr, { timeout });
      if (actual === null || actual === undefined) throw new Error(`Expected attribute to exist: ${attributeAssertionDetail(assertion)}.`);
      if (assertion.type === "attributeEquals" && actual !== expected) {
        throw new Error(`Expected attribute to equal requested value: ${attributeAssertionDetail(assertion)}; actual length=${String(actual || "").length}.`);
      }
      if (assertion.type === "attributeIncludes" && !actual.includes(expected)) {
        throw new Error(`Expected attribute to include requested substring: ${attributeAssertionDetail(assertion)}; actual length=${String(actual || "").length}.`);
      }
    } else if (assertion.type === "computedStyleEquals" || assertion.type === "computedStyleIncludes") {
      const result = await waitForComputedStyle(page, assertion, timeout);
      if (!result.passed) {
        throw new Error(`Expected computed style to ${assertion.type === "computedStyleEquals" ? "equal" : "include"} requested value: ${computedStyleAssertionDetail(assertion)}; actual length=${result.actualLength}.`);
      }
    } else if (assertion.type === "elementCountEquals" || assertion.type === "elementCountAtLeast" || assertion.type === "elementCountAtMost") {
      const locator = resolvePlaywrightLocator(page, assertion);
      const result = await waitForElementCount(locator, assertion, timeout);
      if (assertion.type === "elementCountEquals" && result.actual !== result.expected) {
        throw new Error(`Expected element count to equal ${result.expected}, got actual count=${result.actual}: ${browserTargetDetail(assertion)}.`);
      }
      if (assertion.type === "elementCountAtLeast" && result.actual < result.expected) {
        throw new Error(`Expected element count to be at least ${result.expected}, got actual count=${result.actual}: ${browserTargetDetail(assertion)}.`);
      }
      if (assertion.type === "elementCountAtMost" && result.actual > result.expected) {
        throw new Error(`Expected element count to be at most ${result.expected}, got actual count=${result.actual}: ${browserTargetDetail(assertion)}.`);
      }
    } else if (assertion.type === "dialogAppeared" || assertion.type === "dialogMessageIncludes" || assertion.type === "dialogTypeEquals") {
      await waitForBrowserDialog(signals, assertion, timeout);
    } else if (assertion.type === "popupOpened" || assertion.type === "popupUrlIncludes" || assertion.type === "popupTextIncludes" || assertion.type === "popupTitleIncludes") {
      await waitForBrowserPopup(signals, assertion, timeout);
    } else if (assertion.type === "tableRowIncludes" || assertion.type === "tableCellTextIncludes" || assertion.type === "tableCellTextEquals") {
      const result = await waitForTableAssertion(page, assertion, timeout);
      if (!result?.ok) {
        throw new Error(`Expected table assertion to pass: ${tableAssertionDetail(assertion)}; ${result?.reason || "condition was not met"}; rows=${result?.rowCount ?? "unknown"}; headers=${result?.headerCount ?? "unknown"}.`);
      }
    } else if (assertion.type === "clipboardTextEquals" || assertion.type === "clipboardTextIncludes") {
      const result = await waitForClipboardText(page, assertion, timeout);
      if (assertion.type === "clipboardTextEquals" && !result.passed) {
        throw new Error(`Expected clipboard text to equal requested value: ${clipboardAssertionDetail(assertion)}; actual length=${result.actualLength}.`);
      }
      if (assertion.type === "clipboardTextIncludes" && !result.passed) {
        throw new Error(`Expected clipboard text to include requested substring: ${clipboardAssertionDetail(assertion)}; actual length=${result.actualLength}.`);
      }
    } else if (assertion.type === "elementScreenshotNotBlank") {
      const result = await evaluateElementScreenshotNotBlank(page, assertion, timeout);
      if (!result.ok) {
        throw new Error(`Expected element screenshot to be visually non-blank: ${visualAssertionDetail(assertion)}; size=${result.stats.width}x${result.stats.height}; uniqueColors=${result.stats.uniqueColors}; nonWhitePixels=${result.stats.nonWhitePixels}; nonTransparentPixels=${result.stats.nonTransparentPixels}.`);
      }
    } else if (assertion.type === "textOrder") {
      const result = await waitForTextOrder(page, assertion, timeout);
      if (!result.ok) {
        throw new Error(`Expected text order to match: ${textOrderAssertionDetail(assertion)}; foundCount=${result.foundCount ?? 0}; missingIndex=${result.missingIndex ?? "unknown"}.`);
      }
    } else if (assertion.type === "text") {
      await page.getByText(String(assertion.text || assertion.value || "")).first().waitFor({ state: "visible", timeout });
    } else if (assertion.type === "urlEquals") {
      const expected = urlAssertionExpected(assertion);
      if (!expected) throw new Error("urlEquals requires url/text/value.");
      const matches = (rawUrl: URL | string) => {
        const actual = comparableUrl(rawUrl.toString(), expected);
        return actual === expected;
      };
      if (!matches(page.url())) await page.waitForURL((url: URL) => matches(url), { timeout }).catch(() => {});
      if (!matches(page.url())) throw new Error(`Expected URL to equal "${expected}", got "${comparableUrl(page.url(), expected)}".`);
    } else if (assertion.type === "urlIncludes") {
      const value = urlAssertionExpected(assertion);
      if (!value) throw new Error("urlIncludes requires text/value.");
      if (!page.url().includes(value)) {
        await page.waitForURL((url: URL) => url.toString().includes(value), { timeout }).catch(() => {});
      }
      if (!page.url().includes(value)) throw new Error(`Expected URL to include "${value}", got "${page.url()}".`);
    } else if (assertion.type === "urlNotIncludes") {
      const value = urlAssertionExpected(assertion);
      if (!value) throw new Error("urlNotIncludes requires text/value.");
      if (page.url().includes(value)) {
        await page.waitForURL((url: URL) => !url.toString().includes(value), { timeout }).catch(() => {});
      }
      if (page.url().includes(value)) throw new Error(`Expected URL not to include "${value}", got "${page.url()}".`);
    } else if (assertion.type === "titleEquals") {
      const value = titleAssertionExpected(assertion);
      if (!value) throw new Error("titleEquals requires text/value/title.");
      const title = await waitForTitleMatch(page, current => current === value, timeout);
      if (title !== value) throw new Error(`Expected title to equal "${value}", got "${title}".`);
    } else if (assertion.type === "titleIncludes") {
      const value = titleAssertionExpected(assertion);
      if (!value) throw new Error("titleIncludes requires text/value/title.");
      const title = await waitForTitleMatch(page, current => current.includes(value), timeout);
      if (!title.includes(value)) throw new Error(`Expected title to include "${value}", got "${title}".`);
    } else if (assertion.type === "titleNotIncludes") {
      const value = titleAssertionExpected(assertion);
      if (!value) throw new Error("titleNotIncludes requires text/value/title.");
      const title = await waitForTitleMatch(page, current => !current.includes(value), timeout);
      if (title.includes(value)) throw new Error(`Expected title not to include "${value}", got "${title}".`);
    } else if (assertion.type === "elementTextIncludes") {
      const value = String(assertion.value || assertion.text || "");
      const actual = await resolvePlaywrightLocator(page, assertion).first().innerText({ timeout });
      if (!actual.includes(value)) throw new Error(`Expected element text to include "${value}", got "${actual}".`);
    } else if (
      assertion.type === "accessibleNameEquals"
      || assertion.type === "accessibleNameIncludes"
      || assertion.type === "accessibleDescriptionEquals"
      || assertion.type === "accessibleDescriptionIncludes"
      || assertion.type === "ariaSnapshotIncludes"
    ) {
      const locator = resolvePlaywrightLocator(page, assertion).first();
      const result = await waitForBrowserAccessibilityAssertion(locator, assertion, timeout);
      if (!result.passed) {
        throw new Error(`Expected accessibility assertion to pass: ${browserAccessibilityAssertionDetail(assertion)}; actual length=${result.actualLength}.`);
      }
    } else if (isBrowserAriaStateAssertion(assertion)) {
      const locator = resolvePlaywrightLocator(page, assertion).first();
      const result = await waitForBrowserAriaStateAssertion(locator, assertion, timeout);
      if (!result.passed) {
        throw new Error(`Expected ARIA state assertion to pass: ${browserAriaStateAssertionDetail(assertion)}; actual ${result.attribute}=${result.actual}.`);
      }
    } else if (assertion.type === "inViewport") {
      const locator = resolvePlaywrightLocator(page, assertion).first();
      await locator.waitFor({ state: "visible", timeout });
      const result = await evaluateElementInViewport(locator, signals.viewport?.width || 0, signals.viewport?.height || 0);
      if (!result?.ok) {
        throw new Error(`Expected target to be within viewport, got rect=${JSON.stringify(result?.rect)}, viewport=${result?.viewportWidth}x${result?.viewportHeight}, visible=${result?.visible}.`);
      }
    } else if (assertion.type === "pageNotBlank") {
      const result = await evaluatePageNotBlank(page);
      if (!result?.ok) throw new Error(`Expected page to have visible user-facing content, but found ${result?.reason || "no content"}.`);
    } else if (assertion.type === "noHorizontalOverflow") {
      const result = await evaluateNoHorizontalOverflow(page, signals.viewport?.width || 0);
      if (!result?.ok) throw new Error(`Expected no horizontal overflow, got documentWidth=${result?.documentWidth}, viewportWidth=${result?.viewportWidth}, overflowPx=${result?.overflowPx}.`);
    } else if (assertion.type === "onlineState" || assertion.type === "browserOnline" || assertion.type === "browserOffline") {
      const expected = expectedOnlineState(assertion);
      if (expected === undefined) throw new Error("onlineState requires value/text/state of online or offline.");
      const actual = await waitForOnlineState(page, expected, timeout);
      if (actual !== expected) throw new Error(`Expected browser to be ${expected ? "online" : "offline"}, got ${actual ? "online" : "offline"}.`);
    } else if (assertion.type === "cookieExists") {
      const cookie = await readBrowserCookie(page, assertion);
      if (!cookie) throw new Error(`Expected browser cookie to exist: ${cookieAssertionDetail(assertion)}.`);
    } else if (assertion.type === "cookieValueEquals" || assertion.type === "cookieValueIncludes") {
      const expected = String(assertion.value ?? assertion.text ?? "");
      if (!expected) throw new Error(`${assertion.type} requires value/text as the expected ${assertion.type === "cookieValueEquals" ? "value" : "substring"}.`);
      const cookie = await readBrowserCookie(page, assertion);
      if (!cookie) throw new Error(`Expected browser cookie to exist: ${cookieAssertionDetail(assertion)}.`);
      const actual = String(cookie.value || "");
      const passed = assertion.type === "cookieValueEquals" ? actual === expected : actual.includes(expected);
      if (!passed) throw new Error(`Expected browser cookie value to ${assertion.type === "cookieValueEquals" ? "equal requested value" : "include requested substring"}: ${cookieAssertionDetail(assertion)}.`);
    } else if (assertion.type === "consoleIncludes" || assertion.type === "consoleNotIncludes" || assertion.type === "consoleNoWarnings") {
      if (!browserConsoleAssertionHasExpectation(assertion)) throw new Error(`${assertion.type} requires text/value/message/messageIncludes.`);
      if (browserConsoleAssertionIsNegative(assertion)) {
        const settleMs = browserConsoleAssertionSettleMs(assertion, timeout);
        const matched = await waitForAbsentBrowserConsoleLine(signals.consoleMessages, assertion, settleMs);
        if (matched) throw new Error(`Unexpected browser console telemetry matched ${browserConsoleAssertionDetail(assertion)}: ${matched}`);
      } else {
        const matched = await waitForBrowserConsoleLine(signals.consoleMessages, assertion, timeout);
        if (!matched) throw new Error(`Expected browser console telemetry to match ${browserConsoleAssertionDetail(assertion)}.`);
      }
    } else if (assertion.type === "consoleNoErrors") {
      if (signals.consoleErrors.length) throw new Error(`Console errors observed: ${signals.consoleErrors.slice(0, 3).join(" | ")}`);
    } else if (assertion.type === "networkNoErrors") {
      if (signals.networkErrors.length) throw new Error(`Network errors observed: ${signals.networkErrors.slice(0, 3).join(" | ")}`);
    } else if (
      assertion.type === "networkRequestIncludes"
      || assertion.type === "networkResponseIncludes"
      || assertion.type === "networkRequest"
      || assertion.type === "networkResponse"
      || assertion.type === "networkRequestNotIncludes"
      || assertion.type === "networkResponseNotIncludes"
      || assertion.type === "networkRequestNot"
      || assertion.type === "networkResponseNot"
    ) {
      if (!browserNetworkAssertionHasExpectation(assertion)) throw new Error(`${assertion.type} requires text/value or structured network fields.`);
      if (browserNetworkAssertionIsNegative(assertion)) {
        const settleMs = browserNetworkAssertionSettleMs(assertion, timeout);
        const matched = await waitForAbsentBrowserNetworkLine(signals.networkRequests, assertion, settleMs);
        if (matched) throw new Error(`Unexpected browser network telemetry matched ${browserNetworkAssertionDetail(assertion) || assertion.type}: ${matched}`);
      } else {
        const matched = await waitForBrowserNetworkLine(signals.networkRequests, assertion, timeout);
        if (!matched) throw new Error(`Expected browser network telemetry to match ${browserNetworkAssertionDetail(assertion) || assertion.type}.`);
      }
    } else if (assertion.type === "downloadedFile") {
      await waitForDownloadedFile(signals, assertion, timeout);
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
  const dialogMessages: string[] = [];
  const popupMessages: string[] = [];
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const networkRequests: string[] = [];
  const networkErrors: string[] = [];
  const downloads: CapturedBrowserDownload[] = [];
  const downloadPromises: Promise<CapturedBrowserDownload>[] = [];
  const dialogs: CapturedBrowserDialog[] = [];
  const popups: CapturedBrowserPopup[] = [];
  const popupCapturePromises: Promise<CapturedBrowserPopup>[] = [];
  const pageSnapshots: string[] = [];
  const browserArtifacts: BrowserCheckResult["browserArtifacts"] = [];
  const actionEffects: NonNullable<BrowserCheckResult["actionEffects"]> = [];
  const steps: BrowserStepResult[] = [];
  const name = check.name || `Browser check ${index + 1}`;
  const url = resolveUrl(project.targetUrl, check.url || project.targetUrl);
  let page: any = null;
  let browserContext: any = null;
  let lifecycleResourceId = "";
  let traceStarted = false;
  const credentialEnvNames = browserCheckAuthenticationEnvNames(check);
  const authenticationConfigured = credentialEnvNames.length > 0 || browserCheckHasStorageState(check);
  const sensitiveArtifactsSuppressed = authenticationConfigured
    && (workOrder.options.collectBrowserArtifacts || workOrder.options.collectBrowserVideo);
  const collectBrowserArtifacts = workOrder.options.collectBrowserArtifacts && !authenticationConfigured;
  const collectBrowserVideo = workOrder.options.collectBrowserVideo && !authenticationConfigured;
  const normalScreenshotRequested = check.screenshot !== false || hasRequiredCheck(workOrder.requiredChecks, /screenshot/i);
  const evidenceDir = collectBrowserArtifacts ? ensureDir(path.join(workOrder.options.artifactDir, "browser-artifacts")) : "";
  const downloadDir = ensureDir(path.join(workOrder.options.artifactDir, "browser-artifacts", "downloads"));
  const artifactBase = browserArtifactBase(project.name, name, index);
  const viewport = browserCheckViewport(check);
  let runtimeContextOptions = browserCheckContextOptions(check);
  let contextOptions = browserContextEvidenceOptions(runtimeContextOptions);
  let authentication = buildBrowserAuthenticationEvidence({
    credentialEnvNames,
    sensitiveArtifactsSuppressed,
  });
  let secretBindings: BrowserSecretBinding[] = [];
  const tracePath = collectBrowserArtifacts ? path.join(evidenceDir, `${artifactBase}.trace.zip`) : "";
  const harPath = collectBrowserArtifacts ? path.join(evidenceDir, `${artifactBase}.har`) : "";
  const monitoredOrigins = new Set([originOf(project.targetUrl), originOf(url)].filter(Boolean));

  try {
    secretBindings = resolveBrowserSecretBindings(project, browserCheckAuthenticationActions(check));
    const loadedStorageState = loadBrowserStorageState(project, check);
    if (loadedStorageState) {
      secretBindings = [...secretBindings, ...loadedStorageState.secretBindings];
      runtimeContextOptions = {
        ...runtimeContextOptions,
        storageStatePath: loadedStorageState.path,
        storageState: loadedStorageState.evidence,
      };
      contextOptions = browserContextEvidenceOptions(runtimeContextOptions);
    }
    authentication = buildBrowserAuthenticationEvidence({
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
      ...(collectBrowserVideo ? { recordVideo: { dir: ensureDir(path.join(workOrder.options.artifactDir, "browser-videos")), size: { width: 1366, height: 900 } } } : {}),
    });
    lifecycleResourceId = context.runtime.browserResourceLifecycle?.acquire({
      planId: String(context.workOrder.metadata?.browserCheckExecutionPlan?.planId || ""),
      provider: "playwright",
      resourceType: "browser_context",
      scope: `${project.name}/${name}/${index + 1}`,
    }) || "";
    await grantClipboardPermissions(browserContext, monitoredOrigins);
    await grantBrowserContextPermissions(browserContext, monitoredOrigins, contextOptions.permissions || []);
    if (collectBrowserArtifacts && browserContext.tracing?.start) {
      try {
        await browserContext.tracing.start({ screenshots: true, snapshots: true, sources: true });
        traceStarted = true;
      } catch {}
    }
    page = await browserContext.newPage();
    page.on("popup", (popup: any) => {
      const popupRecordIndex = popups.length;
      const pendingRecord: CapturedBrowserPopup = {
        url: "",
        title: "",
        textPreview: "",
        openedAt: nowIso(),
      };
      popups.push(pendingRecord);
      popupMessages.push(browserPopupLogLine(pendingRecord));
      const promise = captureBrowserPopup(popup, secretBindings)
        .then(record => {
          popups[popupRecordIndex] = record;
          popupMessages[popupRecordIndex] = browserPopupLogLine(record);
          return record;
        })
        .catch((error: any) => {
          pendingRecord.error = redactBrowserSensitiveText(error.message || String(error), secretBindings);
          popupMessages[popupRecordIndex] = browserPopupLogLine(pendingRecord);
          return pendingRecord;
        });
      popupCapturePromises.push(promise);
    });
    page.on("console", (message: any) => {
      const type = message.type?.() || "console";
      const text = redactBrowserSensitiveText(message.text?.() || "", secretBindings);
      const line = `${type}: ${text}`;
      consoleMessages.push(line);
      if (type === "error") consoleErrors.push(text);
    });
    page.on("pageerror", (error: any) => pageErrors.push(redactBrowserSensitiveText(error.message || String(error), secretBindings)));
    page.on("dialog", (dialog: any) => {
      const record: CapturedBrowserDialog = {
        type: String(dialog.type?.() || "dialog"),
        message: redactBrowserSensitiveText(String(dialog.message?.() || ""), secretBindings),
        defaultValue: dialog.defaultValue ? redactBrowserSensitiveText(String(dialog.defaultValue()), secretBindings) : undefined,
        accepted: false,
        occurredAt: nowIso(),
      };
      const dialogIndex = dialogs.length;
      dialogs.push(record);
      dialogMessages.push(browserDialogLogLine(record));
      Promise.resolve(dialog.accept?.())
        .then(() => {
          record.accepted = true;
          dialogMessages[dialogIndex] = browserDialogLogLine(record);
        })
        .catch((error: any) => {
          record.error = redactBrowserSensitiveText(error.message || String(error), secretBindings);
          dialogMessages[dialogIndex] = browserDialogLogLine(record);
        });
    });
    page.on("download", (download: any) => {
      const downloadIndex = downloadPromises.length;
      const promise = savePlaywrightDownload(download, downloadDir, artifactBase, downloadIndex)
        .then(record => {
          downloads.push(record);
          return record;
        });
      downloadPromises.push(promise);
    });
    page.on("request", (request: any) => {
      networkRequests.push(redactBrowserSensitiveText(`request ${request.method?.() || "GET"} ${request.url?.() || ""}`, secretBindings));
      networkRequests.push(requestDetailsLine(request, secretBindings));
    });
    page.on("requestfailed", (request: any) => {
      const line = redactBrowserSensitiveText(`failed ${request.method?.() || "GET"} ${request.url?.() || ""}: ${request.failure?.()?.errorText || "request failed"}`, secretBindings);
      networkRequests.push(line);
      networkErrors.push(line);
    });
    page.on("response", (response: any) => {
      const status = Number(response.status?.() || 0);
      const responseUrl = response.url?.() || "";
      const resourceType = responseResourceType(response);
      const line = redactBrowserSensitiveText(`response ${status}${resourceType ? ` ${resourceType}` : ""} ${responseUrl}`, secretBindings);
      networkRequests.push(line);
      responseDetailsLine(response, status, resourceType, responseUrl, secretBindings)
        .then(detailLine => networkRequests.push(detailLine))
        .catch(() => {});
      if (resourceType === "document" && status < 400) {
        const origin = originOf(responseUrl);
        if (origin) monitoredOrigins.add(origin);
      }
      const networkError = playwrightNetworkErrorForResponse({
        status,
        responseUrl,
        resourceType,
        monitoredOrigins,
        failOnHttpResourceError: workOrder.options.failOnHttpResourceError,
      });
      if (networkError) networkErrors.push(redactBrowserSensitiveText(networkError, secretBindings));
    });

    const actions = check.actions?.length ? check.actions : [{ type: "goto", url, waitUntil: "domcontentloaded" } as BrowserActionSpec];
    for (let actionIndex = 0; actionIndex < actions.length; actionIndex += 1) {
      const action = actions[actionIndex];
      const verifyEffect = browserActionEffectRequired(action);
      const beforeObservation = verifyEffect
        ? await capturePlaywrightActionEffectObservation(page, { networkRequests, dialogs, popups, downloads }).catch(() => ({}))
        : {};
      const step = redactBrowserStepResult(await runAction(page, project, action, timeout), secretBindings);
      steps.push(step);
      if (step.status === "failed") break;
      if (verifyEffect) {
        const verified = await verifyBrowserActionEffect({
          provider: "playwright",
          action,
          actionIndex,
          defaultTimeout: timeout,
          beforeObservation,
          capture: () => capturePlaywrightActionEffectObservation(page, { networkRequests, dialogs, popups, downloads }),
        });
        actionEffects.push(verified.evidence);
        const effectStep = redactBrowserStepResult(verified.step, secretBindings);
        steps.push(effectStep);
        if (effectStep.status === "failed") break;
      }
    }

    if (!steps.some(step => step.status === "failed")) {
      for (const assertion of check.assertions || []) {
        const step = redactBrowserStepResult(
          await runAssertion(page, assertion, { consoleMessages, consoleErrors, networkErrors, networkRequests, downloads, downloadPromises, dialogs, popups, viewport }, timeout),
          secretBindings,
        );
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

    const failedStep = steps.find(step => step.status === "failed");
    if (failedStep && !normalScreenshotRequested) {
      screenshots.push(...await writePlaywrightFailureScreenshot({
        page,
        artifactDir: workOrder.options.artifactDir,
        projectName: project.name,
        checkName: name,
        index,
        failedStep,
      }));
    }

    if (normalScreenshotRequested) {
      const screenshotDir = ensureDir(path.join(workOrder.options.artifactDir, "screenshots"));
      const screenshotPath = path.join(screenshotDir, `${safeSegment(project.name)}-${safeSegment(name)}-${index + 1}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      screenshots.push(screenshotPath);
    }

    if (popupCapturePromises.length) await Promise.all(popupCapturePromises);
    pageSnapshots.push(...await writePlaywrightPageSnapshots(page, workOrder.options.artifactDir, project.name, name, index, secretBindings));
    browserArtifacts.push(...await writePlaywrightAccessibilitySnapshotArtifact(
      page,
      workOrder.options.artifactDir,
      project.name,
      name,
      index,
      value => redactBrowserSensitiveText(value, secretBindings),
    ));
    const finalState = await capturePageFinalState(page, secretBindings);
    const telemetryLogs = writeBrowserTelemetryLogs({
      artifactDir: workOrder.options.artifactDir,
      projectName: project.name,
      checkName: name,
      index,
      consoleMessages,
      dialogMessages,
      popupMessages,
      networkRequests,
    });
    if (downloadPromises.length) await Promise.all(downloadPromises);
    browserArtifacts.push(...downloadArtifacts(downloads));
    browserArtifacts.push(...await finalizePlaywrightBrowserArtifacts({
      browserContext,
      page,
      traceStarted,
      tracePath,
      harPath,
      collectVideo: collectBrowserVideo,
      lifecycle: context.runtime.browserResourceLifecycle,
      lifecycleResourceId,
    }));
    const failed = steps.some(step => step.status === "failed");
    return {
      provider: "playwright",
      project: project.name,
      name,
      url,
      ...finalState,
      viewport,
      contextOptions,
      authentication,
      status: failed ? "failed" : "passed",
      startedAt,
      finishedAt: nowIso(),
      durationMs: Date.now() - started,
      steps,
      screenshots,
      pageSnapshots,
      consoleMessages,
      dialogMessages,
      popupMessages,
      consoleErrors,
      pageErrors,
      networkRequests,
      networkErrors,
      browserArtifacts,
      actionEffects,
      ...telemetryLogs,
      adversarial: check.adversarial === true,
      probeType: check.probeType || check.probe_type,
      context: check.context,
    };
  } catch (error: any) {
    const finalState = await capturePageFinalState(page, secretBindings);
    if (popupCapturePromises.length) await Promise.all(popupCapturePromises).catch(() => []);
    if (!normalScreenshotRequested) {
      screenshots.push(...await writePlaywrightFailureScreenshot({
        page,
        artifactDir: context.workOrder.options.artifactDir,
        projectName: project.name,
        checkName: name,
        index,
        failedStep: steps.find(step => step.status === "failed"),
      }).catch(() => []));
    }
    pageSnapshots.push(...await writePlaywrightPageSnapshots(page, context.workOrder.options.artifactDir, project.name, name, index, secretBindings).catch(() => []));
    browserArtifacts.push(...await writePlaywrightAccessibilitySnapshotArtifact(
      page,
      context.workOrder.options.artifactDir,
      project.name,
      name,
      index,
      value => redactBrowserSensitiveText(value, secretBindings),
    ).catch(() => []));
    const telemetryLogs = writeBrowserTelemetryLogs({
      artifactDir: context.workOrder.options.artifactDir,
      projectName: project.name,
      checkName: name,
      index,
      consoleMessages,
      dialogMessages,
      popupMessages,
      networkRequests,
    });
    if (browserContext) {
      if (downloadPromises.length) await Promise.all(downloadPromises);
      browserArtifacts.push(...downloadArtifacts(downloads));
      browserArtifacts.push(...await finalizePlaywrightBrowserArtifacts({
        browserContext,
        page,
        traceStarted,
        tracePath,
        harPath,
        collectVideo: collectBrowserVideo,
        lifecycle: context.runtime.browserResourceLifecycle,
        lifecycleResourceId,
      }));
    } else {
      try {
        await page?.context?.().close?.();
        if (lifecycleResourceId) context.runtime.browserResourceLifecycle?.released(lifecycleResourceId);
      } catch (closeError: any) {
        if (lifecycleResourceId) context.runtime.browserResourceLifecycle?.cleanupFailed(lifecycleResourceId, closeError.message || String(closeError));
      }
    }
    return {
      provider: "playwright",
      project: project.name,
      name,
      url,
      ...finalState,
      viewport,
      contextOptions,
      authentication,
      status: "blocked",
      startedAt,
      finishedAt: nowIso(),
      durationMs: Date.now() - started,
      steps,
      screenshots,
      pageSnapshots,
      consoleMessages,
      dialogMessages,
      popupMessages,
      consoleErrors,
      pageErrors,
      networkRequests,
      networkErrors,
      browserArtifacts,
      actionEffects,
      ...telemetryLogs,
      adversarial: check.adversarial === true,
      probeType: check.probeType || check.probe_type,
      context: check.context,
      error: redactBrowserSensitiveText(error.message || String(error), secretBindings),
    };
  }
}

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
      pageSnapshots: [],
      browserArtifacts: [],
      consoleMessages: [],
      dialogMessages: [],
      popupMessages: [],
      consoleErrors: [],
      pageErrors: [],
      networkRequests: [],
      networkErrors: [],
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
    runtime.screenshots.push(...await writePlaywrightFailureScreenshot({
      page: runtime.page,
      artifactDir: workOrder.options.artifactDir,
      projectName: project.name,
      checkName: `${checkName}-${runtime.name}`,
      index,
      failedStep,
    }).catch(() => []));
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
