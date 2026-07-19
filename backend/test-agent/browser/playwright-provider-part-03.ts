// Behavior-freeze split from playwright-provider.ts (part 3/4).
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
  BrowserRuntimeSignals,
  CapturedBrowserDialog,
  CapturedBrowserDownload,
  CapturedBrowserPopup,
  attributeAssertionDetail,
  attributeName,
  browserPopupLogLine,
  captureBrowserPopup,
  capturePageFinalState,
  capturePlaywrightActionEffectObservation,
  clipboardAssertionDetail,
  clipboardExpectedText,
  comparableUrl,
  computedStyleAssertionDetail,
  cookieAssertionDetail,
  evaluateElementInViewport,
  evaluateNoHorizontalOverflow,
  evaluatePageNotBlank,
  expectedOnlineState,
  expectedValue,
  inputValueAssertionDetail,
  readBrowserCookie,
  redactBrowserStepResult,
  stateAssertionDetail,
  tableAssertionDetail,
  textOrderAssertionDetail,
  titleAssertionExpected,
  urlAssertionExpected,
  valuesEqual,
  visualAssertionDetail,
  waitForBrowserDialog,
  waitForBrowserPopup,
  waitForClipboardText,
  waitForComputedStyle,
  waitForElementCount,
  waitForFocusedState,
  waitForOnlineState,
  delay,
  waitForTitleMatch,
  writeClipboardText,
} from "./playwright-provider-part-01";

import {
  browserArtifactBase,
  browserCheckContextOptions,
  browserCheckViewport,
  browserContextEvidenceOptions,
  browserContextLaunchOptions,
  browserDialogLogLine,
  buildPlaywrightCookie,
  clearBrowserCookies,
  clipboardActionDetail,
  cookieActionDetail,
  downloadArtifacts,
  dragActionDetail,
  dragDestinationTarget,
  evaluateElementScreenshotNotBlank,
  finalizePlaywrightBrowserArtifacts,
  grantBrowserContextPermissions,
  grantClipboardPermissions,
  installPlaywrightNetworkSafetyBoundary,
  originOf,
  playwrightNetworkErrorForResponse,
  requestDetailsLine,
  resolvedValueDetail,
  responseDetailsLine,
  responseResourceType,
  savePlaywrightDownload,
  storageActionValue,
  uploadFileActionDetail,
  uploadFilePayload,
  waitForDownloadedFile,
  waitForTableAssertion,
  waitForTextOrder,
  writeBrowserTelemetryLogs,
  writePlaywrightPageSnapshots,
} from "./playwright-provider-part-02";

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

export async function runAction(page: any, project: NormalizedTestAgentProjectTarget, action: BrowserActionSpec, defaultTimeout: number): Promise<BrowserStepResult> {
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

export async function runAssertion(page: any, assertion: BrowserAssertionSpec, signals: BrowserRuntimeSignals, defaultTimeout: number): Promise<BrowserStepResult> {
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

export async function runBrowserCheck(browser: any, context: BrowserProviderContext, project: NormalizedTestAgentProjectTarget, check: BrowserCheckSpec, index: number): Promise<BrowserCheckResult> {
  const { workOrder } = context;
  const startedAt = nowIso();
  const started = Date.now();
  const timeout = Number(check.timeoutMs || check.timeout_ms || workOrder.options.browserTimeoutMs);
  const screenshots: string[] = [];
  const screenshotRefs: Array<{ stepName: string; path: string; kind: "failure" | "capture" }> = [];
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
    const recordUnsafeRequest = (event: { url: string; error: string }) => {
      networkErrors.push(redactBrowserSensitiveText(`blocked_unsafe_url ${event.error}: ${event.url}`, secretBindings));
    };
    await installPlaywrightNetworkSafetyBoundary(browserContext, page, recordUnsafeRequest);
    browserContext.on?.("page", (childPage: any) => {
      if (childPage === page) return;
      void installPlaywrightNetworkSafetyBoundary(browserContext, childPage, recordUnsafeRequest).catch(() => {});
    });
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
      const failureShots = await writePlaywrightFailureScreenshot({
        page,
        artifactDir: workOrder.options.artifactDir,
        projectName: project.name,
        checkName: name,
        index,
        failedStep,
      });
      screenshotRefs.push(...failureShots);
      screenshots.push(...failureShots.map(item => item.path));
    }

    if (normalScreenshotRequested) {
      const screenshotDir = ensureDir(path.join(workOrder.options.artifactDir, "screenshots"));
      const screenshotPath = path.join(screenshotDir, `${safeSegment(project.name)}-${safeSegment(name)}-${index + 1}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      screenshots.push(screenshotPath);
      screenshotRefs.push({
        stepName: failedStep?.name || name,
        path: screenshotPath,
        kind: failedStep ? "failure" : "capture",
      });
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
      const failureShots = await writePlaywrightFailureScreenshot({
        page,
        artifactDir: context.workOrder.options.artifactDir,
        projectName: project.name,
        checkName: name,
        index,
        failedStep: steps.find(step => step.status === "failed"),
      }).catch(() => [] as Array<{ stepName: string; path: string; kind: "failure" | "capture" }>);
      screenshotRefs.push(...failureShots);
      screenshots.push(...failureShots.map(item => item.path));
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
      actionEffects,
      ...telemetryLogs,
      adversarial: check.adversarial === true,
      probeType: check.probeType || check.probe_type,
      context: check.context,
      error: redactBrowserSensitiveText(error.message || String(error), secretBindings),
    };
  }
}
