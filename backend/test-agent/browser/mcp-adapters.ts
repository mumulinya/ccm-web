import {
  BrowserActionSpec,
  BrowserAssertionSpec,
  BrowserExistingSessionProvider,
  BrowserRecoveryEvidence,
  BrowserStepResult,
  NormalizedTestAgentProjectTarget,
} from "../types";
import { compactText, resolveUrl } from "../utils";
import {
  browserNetworkAssertionDetail,
  browserNetworkAssertionHasExpectation,
  browserNetworkAssertionIsNegative,
  findMatchingBrowserNetworkLine,
} from "./network-assertions";
import {
  browserConsoleAssertionDetail,
  browserConsoleAssertionHasExpectation,
  browserConsoleAssertionIsNegative,
  browserConsoleAssertionSettleMs,
  filterBrowserConsoleErrorLines,
  normalizeBrowserConsoleLines,
  waitForAbsentBrowserConsoleLine,
  waitForBrowserConsoleLine,
} from "./console-assertions";
import { isBrowserAriaStateAssertion } from "./aria-state-assertions";
import { browserTargetDetail } from "./semantic-locator";
import {
  browserRecoveryFailureMessage,
  browserRecoveryTrigger,
  BrowserRecoveryTracker,
} from "./recovery";

export type McpBrowserAdapterId = "playwright-mcp" | "claude-in-chrome" | "chrome-devtools" | "computer-use";

export interface McpBrowserAdapter {
  id: McpBrowserAdapterId;
  label: string;
  tools: string[];
  currentUrl: string;
  runAction: (project: NormalizedTestAgentProjectTarget, action: BrowserActionSpec, defaultTimeout: number) => Promise<BrowserStepResult>;
  runAssertion: (assertion: BrowserAssertionSpec, signals: McpBrowserSignals, defaultTimeout: number) => Promise<BrowserStepResult>;
  readConsoleMessages?: () => Promise<string[]>;
  readConsoleErrors: () => Promise<string[]>;
  readNetworkRequests: () => Promise<string[]>;
  readNetworkErrors: () => Promise<string[]>;
  captureScreenshot: (name: string) => Promise<string[]>;
  prepareExistingSession?: (url?: string) => Promise<void>;
  existingSessionContextEvidence?: () => {
    provider: Exclude<BrowserExistingSessionProvider, "auto">;
    tabContextChecked: boolean;
    tabCount?: number;
    createdNewTab: boolean;
  };
  browserRecoveryEvidence?: () => BrowserRecoveryEvidence | undefined;
  pageText?: () => Promise<string>;
}

export interface McpBrowserSignals {
  pageText: string;
  consoleMessages?: string[];
  consoleErrors: string[];
  networkRequests?: string[];
  networkErrors: string[];
}

type Caller = (toolName: string, input: Record<string, any>) => Promise<any>;
type ComputerCoordinate = [number, number];

function has(tools: string[], pattern: RegExp) {
  return tools.some(tool => pattern.test(tool));
}

function pick(tools: string[], patterns: RegExp[]) {
  return tools.find(tool => patterns.some(pattern => pattern.test(tool)));
}

function stringifyOutput(output: any) {
  if (output === undefined || output === null) return "";
  if (typeof output === "string") return output;
  try { return JSON.stringify(output); } catch { return String(output); }
}

function extractToolText(output: any) {
  if (typeof output === "string") return output;
  if (Array.isArray(output)) return output.map(extractToolText).filter(Boolean).join("\n");
  if (output && typeof output === "object") {
    const parts: string[] = [];
    for (const key of ["text", "content", "markdown", "snapshot", "pageText", "result", "output"]) {
      if (typeof output[key] === "string") parts.push(output[key]);
    }
    if (Array.isArray(output.content)) parts.push(output.content.map(extractToolText).join("\n"));
    return parts.filter(Boolean).join("\n") || stringifyOutput(output);
  }
  return String(output ?? "");
}

function extractTabId(output: any): number | string | undefined {
  if (output === undefined || output === null) return undefined;
  if (typeof output === "number" || typeof output === "string") return output;
  if (typeof output === "object") {
    for (const key of ["tabId", "tab_id", "id", "activeTabId"]) {
      if (typeof output[key] === "number" || typeof output[key] === "string") return output[key];
    }
    if (output.tab && (typeof output.tab.id === "number" || typeof output.tab.id === "string")) return output.tab.id;
  }
  return undefined;
}

function extractTabCount(output: any): number | undefined {
  if (Array.isArray(output)) return output.length;
  if (output && typeof output === "object") {
    for (const key of ["tabs", "pages", "openTabs", "open_tabs"]) {
      if (Array.isArray(output[key])) return output[key].length;
    }
  }
  const text = extractToolText(output).trim();
  if (!text) return undefined;
  try {
    const parsed = JSON.parse(text);
    if (parsed !== output) return extractTabCount(parsed);
  } catch {}
  const matches = text.match(/\btab(?:Id|_id)?\b/gi);
  return matches?.length || undefined;
}

function emptyLike(text: string) {
  return /^(\[\]|{}|null|undefined|"")$/i.test(text.trim());
}

function targetInput(action: BrowserActionSpec) {
  const label = String(action.selector || action.text || action.value || "target");
  return {
    selector: action.selector,
    locator: action.locator || action.selector,
    testId: action.testId || action.test_id || action.dataTestId || action.data_testid,
    label: action.label,
    placeholder: action.placeholder,
    role: action.role,
    name: action.name,
    altText: action.altText || action.alt_text,
    title: action.title,
    element: label,
    ref: action.selector || label,
    text: String(action.value ?? action.text ?? ""),
    value: String(action.value ?? action.text ?? ""),
  };
}

function typedText(action: BrowserActionSpec) {
  return String(action.value ?? action.text ?? "");
}

function typedTextDetail(action: BrowserActionSpec) {
  const input = targetInput(action);
  return `${input.element || "focused control"}; text length=${typedText(action).length}`;
}

function pressKeyText(action: BrowserActionSpec, fallback = "Enter") {
  return String(action.key || action.value || action.text || fallback);
}

function isCookieAction(action: BrowserActionSpec) {
  return action.type === "setCookie" || action.type === "clearCookies";
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
  return "";
}

function cookieActionBoolean(value: any) {
  return value === undefined ? undefined : value === true || String(value).toLowerCase() === "true";
}

function cookieActionDetail(action: BrowserActionSpec) {
  const names = cookieActionNames(action);
  if (action.type === "clearCookies") return names.length ? `cookie count=${names.length}` : "all JS-visible cookies";
  return `cookie=${cookieActionName(action) || "(missing)"}; value length=${cookieActionValue(action).length}`;
}

function cookieActionScript(action: BrowserActionSpec) {
  if (cookieActionBoolean(action.httpOnly ?? action.http_only)) {
    throw new Error(`${action.type} with HttpOnly requires the Playwright provider.`);
  }
  const path = cookieActionPath(action);
  if (action.type === "setCookie") {
    const name = cookieActionName(action);
    if (!name) throw new Error("setCookie requires key/cookieName/name.");
    if (!cookieActionHasValue(action)) throw new Error("setCookie requires value/text/content.");
    const value = cookieActionValue(action);
    const sameSite = cookieActionSameSite(action);
    const secure = cookieActionBoolean(action.secure);
    const expires = Number(action.expires);
    return `() => { const parts = [encodeURIComponent(${JSON.stringify(name)}) + "=" + encodeURIComponent(${JSON.stringify(value)}), "Path=" + ${JSON.stringify(path)}];${sameSite ? ` parts.push("SameSite=${sameSite}");` : ""}${secure ? ` parts.push("Secure");` : ""}${Number.isFinite(expires) ? ` parts.push("Expires=" + new Date(${expires} * 1000).toUTCString());` : ""} document.cookie = parts.join("; "); }`;
  }
  const names = cookieActionNames(action);
  return `() => { const names = ${JSON.stringify(names)}.length ? ${JSON.stringify(names)} : document.cookie.split(";").map(part => part.split("=")[0].trim()).filter(Boolean).map(decodeURIComponent); for (const name of names) { document.cookie = encodeURIComponent(name) + "=; Path=" + ${JSON.stringify(path)} + "; Expires=Thu, 01 Jan 1970 00:00:00 GMT"; } }`;
}

function isStorageAction(action: BrowserActionSpec) {
  return action.type === "setLocalStorage" || action.type === "setSessionStorage" || action.type === "clearStorage";
}

function isNetworkStateAction(action: BrowserActionSpec) {
  return action.type === "setOffline" || action.type === "setOnline";
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

function storageActionDetail(action: BrowserActionSpec) {
  const area = storageActionArea(action);
  const keys = storageActionKeys(action);
  if (action.type === "clearStorage") return `${area}; ${keys.length ? `key count=${keys.length}` : "clear all"}`;
  return `${area}; key=${storageActionKey(action) || "(missing)"}; value length=${storageActionValue(action).length}`;
}

function storageActionScript(action: BrowserActionSpec) {
  const area = storageActionArea(action);
  if (action.type === "setLocalStorage" || action.type === "setSessionStorage") {
    const key = storageActionKey(action);
    if (area === "both") throw new Error(`${action.type} requires a single storage area.`);
    if (!key) throw new Error(`${action.type} requires key/storageKey.`);
    if (!storageActionHasValue(action)) throw new Error(`${action.type} requires value/text/content.`);
    const value = storageActionValue(action);
    return `() => { globalThis[${JSON.stringify(area)}].setItem(${JSON.stringify(key)}, ${JSON.stringify(value)}); }`;
  }
  const storageNames = area === "both" ? ["localStorage", "sessionStorage"] : [area];
  const keys = storageActionKeys(action);
  return `() => { for (const storageName of ${JSON.stringify(storageNames)}) { const storage = globalThis[storageName]; if (!storage) continue; if (${JSON.stringify(keys)}.length) { for (const key of ${JSON.stringify(keys)}) storage.removeItem(key); } else { storage.clear(); } } }`;
}

function step(kind: "action" | "assertion", name: string, status: BrowserStepResult["status"], detail = "", error = ""): BrowserStepResult {
  return { kind, name, status, detail, ...(error ? { error } : {}) };
}

function isCoordinate(value: unknown): value is ComputerCoordinate {
  return Array.isArray(value)
    && value.length === 2
    && value.every(item => Number.isFinite(Number(item)));
}

function coordinateInput(action: BrowserActionSpec) {
  return isCoordinate(action.coordinate) ? { coordinate: [Number(action.coordinate[0]), Number(action.coordinate[1])] as ComputerCoordinate } : {};
}

function computerActionDetail(action: BrowserActionSpec) {
  const coordinate = isCoordinate(action.coordinate) ? `(${action.coordinate[0]},${action.coordinate[1]})` : "";
  return action.selector || action.text || action.value || action.url || coordinate;
}

function browserAddressShortcut() {
  return process.platform === "darwin" ? "command+l" : "ctrl+l";
}

function expectedUrlFragment(action: BrowserActionSpec) {
  return String(action.url || action.text || action.value || "").trim();
}

function assertionExpectedUrl(assertion: BrowserAssertionSpec) {
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

function assertWithCurrentUrl(adapterName: string, currentUrl: string, assertion: BrowserAssertionSpec) {
  const expected = assertionExpectedUrl(assertion);
  if (!expected) return step("assertion", `${adapterName}:${assertion.type}`, "failed", "", `${assertion.type} requires url/text/value.`);
  const actual = comparableUrl(currentUrl || "", expected);
  if (assertion.type === "urlEquals") {
    return actual === expected
      ? step("assertion", `${adapterName}:urlEquals`, "passed", expected)
      : step("assertion", `${adapterName}:urlEquals`, "failed", expected, `Expected URL to equal "${expected}", got "${actual || "unknown"}".`);
  }
  if (assertion.type === "urlNotIncludes") {
    return !String(currentUrl || "").includes(expected)
      ? step("assertion", `${adapterName}:urlNotIncludes`, "passed", expected)
      : step("assertion", `${adapterName}:urlNotIncludes`, "failed", expected, `Expected URL not to include "${expected}", got "${currentUrl || "unknown"}".`);
  }
  return String(currentUrl || "").includes(expected)
    ? step("assertion", `${adapterName}:urlIncludes`, "passed", expected)
    : step("assertion", `${adapterName}:urlIncludes`, "failed", expected, `Expected URL to include "${expected}", got "${currentUrl || "unknown"}".`);
}

async function waitForMcpUrl(adapterName: string, currentUrl: string, action: BrowserActionSpec, defaultTimeout: number) {
  const expected = expectedUrlFragment(action);
  if (!expected) return step("action", `${adapterName}:waitForUrl`, "failed", "", "waitForUrl requires url/text/value.");
  const deadline = Date.now() + Math.max(1, Number(action.timeoutMs || action.timeout_ms || defaultTimeout || 1000));
  while (Date.now() < deadline) {
    if (currentUrl.includes(expected)) return step("action", `${adapterName}:waitForUrl`, "passed", expected);
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  return step("action", `${adapterName}:waitForUrl`, "failed", expected, `Expected URL to include "${expected}", got "${currentUrl || "(unknown)"}".`);
}

function normalizeComputerUseApps(apps: BrowserActionSpec["apps"]) {
  if (!Array.isArray(apps)) return undefined;
  return apps
    .map(app => ({
      displayName: app.displayName,
      bundle_id: app.bundle_id || app.bundleId,
    }))
    .filter(app => app.displayName || app.bundle_id);
}

function normalizeVisibleText(value: string) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function textOrderExpectedTexts(assertion: BrowserAssertionSpec) {
  for (const value of [assertion.expectedTexts, assertion.expected_texts, assertion.texts, assertion.values]) {
    if (!Array.isArray(value)) continue;
    const texts = value.map(item => normalizeVisibleText(String(item ?? ""))).filter(Boolean);
    if (texts.length) return texts;
  }
  return [];
}

function assertTextOrderFromPageText(adapterName: string, assertion: BrowserAssertionSpec, pageText: string): BrowserStepResult {
  const expected = textOrderExpectedTexts(assertion);
  if (expected.length < 2) {
    return step("assertion", `${adapterName}:textOrder`, "failed", "", "textOrder requires at least two values in texts/values/expectedTexts.");
  }
  const normalized = normalizeVisibleText(pageText);
  let cursor = 0;
  let foundCount = 0;
  for (let i = 0; i < expected.length; i += 1) {
    const index = normalized.indexOf(expected[i], cursor);
    if (index < 0) {
      return step("assertion", `${adapterName}:textOrder`, "failed", `expected text count=${expected.length}`, `Expected page text order to match; foundCount=${foundCount}; missingIndex=${i}.`);
    }
    foundCount += 1;
    cursor = index + expected[i].length;
  }
  return step("assertion", `${adapterName}:textOrder`, "passed", `expected text count=${expected.length}`);
}

async function assertWithText(adapterName: string, assertion: BrowserAssertionSpec, signals: McpBrowserSignals, defaultTimeout = 1000): Promise<BrowserStepResult> {
  const expected = String(assertion.text || assertion.value || "");
  if (assertion.type === "consoleNoErrors") {
    const consoleErrors = signals.consoleErrors.length ? signals.consoleErrors : filterBrowserConsoleErrorLines(signals.consoleMessages || []);
    return consoleErrors.length
      ? step("assertion", `${adapterName}:consoleNoErrors`, "failed", "", consoleErrors.slice(0, 3).join(" | "))
      : step("assertion", `${adapterName}:consoleNoErrors`, "passed");
  }
  if (assertion.type === "consoleIncludes" || assertion.type === "consoleNotIncludes" || assertion.type === "consoleNoWarnings") {
    const consoleMessages = normalizeBrowserConsoleLines([...(signals.consoleMessages || []), ...signals.consoleErrors.map(item => `error: ${item}`)]);
    if (!browserConsoleAssertionHasExpectation(assertion)) {
      return step("assertion", `${adapterName}:${assertion.type}`, "failed", "", `${assertion.type} requires text/value/message/messageIncludes.`);
    }
    const detail = browserConsoleAssertionDetail(assertion);
    if (browserConsoleAssertionIsNegative(assertion)) {
      const matched = await waitForAbsentBrowserConsoleLine(consoleMessages, assertion, browserConsoleAssertionSettleMs(assertion, defaultTimeout));
      return matched
        ? step("assertion", `${adapterName}:${assertion.type}`, "failed", detail, `Unexpected console telemetry matched ${detail}: ${matched}`)
        : step("assertion", `${adapterName}:${assertion.type}`, "passed", detail);
    }
    const matched = await waitForBrowserConsoleLine(consoleMessages, assertion, defaultTimeout);
    return matched
      ? step("assertion", `${adapterName}:${assertion.type}`, "passed", detail)
      : step("assertion", `${adapterName}:${assertion.type}`, "failed", detail, `Expected console telemetry to match ${detail}.`);
  }
  if (assertion.type === "networkNoErrors") {
    return signals.networkErrors.length
      ? step("assertion", `${adapterName}:networkNoErrors`, "failed", "", signals.networkErrors.slice(0, 3).join(" | "))
      : step("assertion", `${adapterName}:networkNoErrors`, "passed");
  }
  if (
    assertion.type === "networkRequestIncludes"
    || assertion.type === "networkResponseIncludes"
    || assertion.type === "networkRequest"
    || assertion.type === "networkResponse"
    || assertion.type === "networkRequestNotIncludes"
    || assertion.type === "networkResponseNotIncludes"
    || assertion.type === "networkRequestNot"
    || assertion.type === "networkResponseNot"
  ) {
    if (!browserNetworkAssertionHasExpectation(assertion)) return step("assertion", `${adapterName}:${assertion.type}`, "failed", "", `${assertion.type} requires text/value or structured network fields.`);
    const requests = signals.networkRequests || [];
    const detail = browserNetworkAssertionDetail(assertion);
    const matched = findMatchingBrowserNetworkLine(requests, assertion);
    if (browserNetworkAssertionIsNegative(assertion)) {
      return matched
        ? step("assertion", `${adapterName}:${assertion.type}`, "failed", detail, `Unexpected network telemetry matched ${detail || assertion.type}: ${matched}`)
        : step("assertion", `${adapterName}:${assertion.type}`, "passed", detail);
    }
    return matched
      ? step("assertion", `${adapterName}:${assertion.type}`, "passed", detail)
      : step("assertion", `${adapterName}:${assertion.type}`, "failed", detail, `Expected network telemetry to match ${detail || assertion.type}.`);
  }
  if (assertion.type === "text" || assertion.type === "elementTextIncludes") {
    if (!expected) return step("assertion", `${adapterName}:${assertion.type}`, "failed", "", "Missing expected text.");
    return signals.pageText.includes(expected)
      ? step("assertion", `${adapterName}:${assertion.type}`, "passed", expected)
      : step("assertion", `${adapterName}:${assertion.type}`, "failed", expected, `Expected page text to include "${expected}".`);
  }
  if (assertion.type === "ariaSnapshotIncludes") {
    const snapshotText = String((assertion as any).snapshotIncludes || (assertion as any).snapshot_includes || assertion.text || assertion.value || "");
    if (!snapshotText) return step("assertion", `${adapterName}:ariaSnapshotIncludes`, "failed", "", "ariaSnapshotIncludes requires text/value/snapshotIncludes.");
    return signals.pageText.includes(snapshotText)
      ? step("assertion", `${adapterName}:ariaSnapshotIncludes`, "passed", `expected substring length=${snapshotText.length}`)
      : step("assertion", `${adapterName}:ariaSnapshotIncludes`, "failed", `expected substring length=${snapshotText.length}`, "Expected MCP page snapshot to include requested ARIA text.");
  }
  if (
    assertion.type === "accessibleNameEquals"
    || assertion.type === "accessibleNameIncludes"
    || assertion.type === "accessibleDescriptionEquals"
    || assertion.type === "accessibleDescriptionIncludes"
  ) {
    return step("assertion", `${adapterName}:${assertion.type}`, "failed", "", `MCP ${adapterName} cannot compute precise accessible name/description from TestAgent; use Playwright for this assertion.`);
  }
  if (isBrowserAriaStateAssertion(assertion)) {
    return step("assertion", `${adapterName}:${assertion.type}`, "failed", browserTargetDetail(assertion), `MCP ${adapterName} cannot verify ARIA DOM state attributes from TestAgent; use Playwright for this assertion.`);
  }
  if (assertion.type === "textOrder") {
    return assertTextOrderFromPageText(adapterName, assertion, signals.pageText);
  }
  if (assertion.type === "pageNotBlank") {
    const text = signals.pageText.trim();
    return text && !emptyLike(text)
      ? step("assertion", `${adapterName}:pageNotBlank`, "passed", `page text length=${text.length}`)
      : step("assertion", `${adapterName}:pageNotBlank`, "failed", "visible user-facing page content", "Expected page snapshot/text to be non-empty.");
  }
  if (assertion.type === "inViewport") {
    return step("assertion", `${adapterName}:inViewport`, "failed", browserTargetDetail(assertion), `MCP ${adapterName} cannot verify viewport position without DOM layout metrics; use Playwright for this assertion.`);
  }
  if (assertion.type === "elementScreenshotNotBlank") {
    return step("assertion", `${adapterName}:elementScreenshotNotBlank`, "failed", browserTargetDetail(assertion), `MCP ${adapterName} cannot verify element-level screenshot pixels from TestAgent; use Playwright for this assertion.`);
  }
  if (assertion.type === "noHorizontalOverflow") {
    return step("assertion", `${adapterName}:noHorizontalOverflow`, "failed", "", `MCP ${adapterName} cannot verify layout overflow without DOM layout metrics; use Playwright for this assertion.`);
  }
  if (assertion.type === "onlineState" || assertion.type === "browserOnline" || assertion.type === "browserOffline") {
    return step("assertion", `${adapterName}:${assertion.type}`, "failed", "", `MCP ${adapterName} cannot verify browser offline/online network emulation state from TestAgent; use Playwright for this assertion.`);
  }
  if (assertion.type === "cookieExists" || assertion.type === "cookieValueEquals" || assertion.type === "cookieValueIncludes") {
    return step("assertion", `${adapterName}:${assertion.type}`, "failed", "", `MCP ${adapterName} cannot verify browser cookies from TestAgent; use Playwright for this assertion.`);
  }
  if (assertion.type === "clipboardTextEquals" || assertion.type === "clipboardTextIncludes") {
    return step("assertion", `${adapterName}:${assertion.type}`, "failed", "", `MCP ${adapterName} cannot verify browser clipboard contents from TestAgent; use Playwright for this assertion.`);
  }
  if (assertion.type === "localStorageEquals" || assertion.type === "localStorageIncludes" || assertion.type === "sessionStorageEquals" || assertion.type === "sessionStorageIncludes") {
    return step("assertion", `${adapterName}:${assertion.type}`, "failed", "", `MCP ${adapterName} cannot verify Web Storage contents from TestAgent; use Playwright for this assertion.`);
  }
  if (assertion.type === "visible") {
    const expectedVisible = String(assertion.text || assertion.value || assertion.selector || "");
    if (!expectedVisible) return step("assertion", `${adapterName}:visible`, "failed", "", "MCP visible assertion needs selector/text/value.");
    return signals.pageText.includes(expectedVisible)
      ? step("assertion", `${adapterName}:visible`, "passed", expectedVisible)
      : step("assertion", `${adapterName}:visible`, "failed", expectedVisible, `Could not verify visible target "${expectedVisible}" from page text.`);
  }
  if (assertion.type === "notVisible") {
    const expectedHidden = String(assertion.text || assertion.value || assertion.selector || "");
    if (!expectedHidden) return step("assertion", `${adapterName}:notVisible`, "failed", "", "MCP notVisible assertion needs selector/text/value.");
    return !signals.pageText.includes(expectedHidden)
      ? step("assertion", `${adapterName}:notVisible`, "passed", expectedHidden)
      : step("assertion", `${adapterName}:notVisible`, "failed", expectedHidden, `Target "${expectedHidden}" is still present in page text.`);
  }
  if (assertion.type === "present" || assertion.type === "notPresent") {
    const expectedText = String(assertion.text || assertion.value || assertion.name || "").trim();
    if (!expectedText) {
      return step("assertion", `${adapterName}:${assertion.type}`, "failed", browserTargetDetail(assertion), `MCP ${adapterName} cannot verify selector-only DOM presence without DOM access; use Playwright for this assertion.`);
    }
    const found = signals.pageText.includes(expectedText);
    if (assertion.type === "present") {
      return found
        ? step("assertion", `${adapterName}:present`, "passed", expectedText)
        : step("assertion", `${adapterName}:present`, "failed", expectedText, `Expected page snapshot/text to include "${expectedText}".`);
    }
    return !found
      ? step("assertion", `${adapterName}:notPresent`, "passed", expectedText)
      : step("assertion", `${adapterName}:notPresent`, "failed", expectedText, `Expected page snapshot/text not to include "${expectedText}".`);
  }
  if (assertion.type === "focused" || assertion.type === "notFocused") {
    return step("assertion", `${adapterName}:${assertion.type}`, "failed", "", `MCP ${adapterName} cannot verify focus state without DOM activeElement access; use Playwright for this assertion.`);
  }
  if (assertion.type === "enabled" || assertion.type === "disabled") {
    return step("assertion", `${adapterName}:${assertion.type}`, "failed", "", `MCP ${adapterName} cannot verify enabled/disabled state without DOM property access; use Playwright for this assertion.`);
  }
  if (assertion.type === "checked" || assertion.type === "notChecked") {
    return step("assertion", `${adapterName}:${assertion.type}`, "failed", "", `MCP ${adapterName} cannot verify checked state without DOM property access; use Playwright for this assertion.`);
  }
  if (
    assertion.type === "selectedValue"
    || assertion.type === "selectedTextIncludes"
    || assertion.type === "inputValueEquals"
    || assertion.type === "inputValueIncludes"
    || assertion.type === "attributeEquals"
    || assertion.type === "attributeIncludes"
    || assertion.type === "computedStyleEquals"
    || assertion.type === "computedStyleIncludes"
    || assertion.type === "elementCountEquals"
    || assertion.type === "elementCountAtLeast"
    || assertion.type === "elementCountAtMost"
  ) {
    return step("assertion", `${adapterName}:${assertion.type}`, "failed", "", `MCP ${adapterName} cannot verify DOM attribute/control/style/count state without DOM property access; use Playwright for this assertion.`);
  }
  if (assertion.type === "dialogAppeared" || assertion.type === "dialogMessageIncludes" || assertion.type === "dialogTypeEquals") {
    return step("assertion", `${adapterName}:${assertion.type}`, "failed", "", `MCP ${adapterName} cannot verify native browser dialog telemetry from TestAgent; use Playwright for this assertion.`);
  }
  if (assertion.type === "popupOpened" || assertion.type === "popupUrlIncludes" || assertion.type === "popupTextIncludes" || assertion.type === "popupTitleIncludes") {
    return step("assertion", `${adapterName}:${assertion.type}`, "failed", "", `MCP ${adapterName} cannot verify new browser page/popup telemetry from TestAgent; use Playwright for this assertion.`);
  }
  if (assertion.type === "tableRowIncludes" || assertion.type === "tableCellTextIncludes" || assertion.type === "tableCellTextEquals") {
    return step("assertion", `${adapterName}:${assertion.type}`, "failed", "", `MCP ${adapterName} cannot verify table row/cell structure without DOM table semantics; use Playwright for this assertion.`);
  }
  if (assertion.type === "downloadedFile") {
    return step("assertion", `${adapterName}:downloadedFile`, "failed", "", `MCP ${adapterName} cannot verify local downloaded files; use Playwright for this assertion.`);
  }
  if (assertion.type === "titleEquals" || assertion.type === "titleIncludes" || assertion.type === "titleNotIncludes") {
    if (!expected) return step("assertion", `${adapterName}:${assertion.type}`, "failed", "", `${assertion.type} requires text/value/title.`);
    if (assertion.type === "titleEquals") {
      return signals.pageText.trim() === expected
        ? step("assertion", `${adapterName}:titleEquals`, "passed", expected)
        : step("assertion", `${adapterName}:titleEquals`, "failed", expected, "MCP title assertion fell back to page text and did not match exactly.");
    }
    if (assertion.type === "titleNotIncludes") {
      return !signals.pageText.includes(expected)
        ? step("assertion", `${adapterName}:titleNotIncludes`, "passed", expected)
        : step("assertion", `${adapterName}:titleNotIncludes`, "failed", expected, "MCP title negative assertion fell back to page text and still matched.");
    }
    return signals.pageText.includes(expected)
      ? step("assertion", `${adapterName}:titleIncludes`, "passed", expected)
      : step("assertion", `${adapterName}:titleIncludes`, "failed", expected, "MCP title assertion fell back to page text and did not match.");
  }
  if (assertion.type === "jsTruthy") {
    const expression = String(assertion.expression || assertion.text || assertion.value || "");
    const text = signals.pageText.trim();
    const supportsPageContentFallback = !expression || /document\.body|innerText|textContent|children|pageText/i.test(expression);
    if (!supportsPageContentFallback) {
      return step("assertion", `${adapterName}:jsTruthy`, "failed", expression, `MCP ${adapterName} cannot evaluate this JavaScript expression; use Playwright/Chrome DevTools or a text assertion.`);
    }
    return text && !emptyLike(text)
      ? step("assertion", `${adapterName}:jsTruthy`, "passed", `page text length=${text.length}`)
      : step("assertion", `${adapterName}:jsTruthy`, "failed", expression || "page content", "Expected page snapshot/text to be non-empty.");
  }
  return step("assertion", `${adapterName}:${assertion.type}`, "failed", "", `Assertion ${assertion.type} is not supported by ${adapterName}.`);
}

class PlaywrightMcpAdapter implements McpBrowserAdapter {
  id: McpBrowserAdapterId = "playwright-mcp";
  label = "Playwright MCP";
  currentUrl = "";
  constructor(public tools: string[], private call: Caller) {}

  async runAction(project: NormalizedTestAgentProjectTarget, action: BrowserActionSpec, defaultTimeout: number) {
    try {
      if (action.type === "uploadFile") {
        return step("action", "playwright:uploadFile", "failed", "", "Playwright MCP cannot verify local file uploads from TestAgent; use the Playwright provider for this action.");
      }
      if (action.type === "dragTo") {
        return step("action", "playwright:dragTo", "failed", "", "Playwright MCP drag/drop is not mapped for TestAgent; use the Playwright provider for this action.");
      }
      if (action.type === "doubleClick" || action.type === "rightClick") {
        return step("action", `playwright:${action.type}`, "failed", "", `Playwright MCP ${action.type} is not mapped for TestAgent; use the Playwright provider for this action.`);
      }
      if (action.type === "focus") {
        return step("action", "playwright:focus", "failed", "", "Playwright MCP focus is not mapped for TestAgent; use the Playwright provider for deterministic DOM focus.");
      }
      if (action.type === "setClipboard") {
        return step("action", "playwright:setClipboard", "failed", "", "Playwright MCP clipboard write is not mapped for TestAgent; use the Playwright provider for this action.");
      }
      if (isCookieAction(action)) {
        const tool = pick(this.tools, [/__browser_evaluate$/]);
        if (!tool) throw new Error("Missing browser_evaluate.");
        await this.call(tool, { function: cookieActionScript(action) });
        return step("action", `playwright:${action.type}`, "passed", cookieActionDetail(action));
      }
      if (isStorageAction(action)) {
        const tool = pick(this.tools, [/__browser_evaluate$/]);
        if (!tool) throw new Error("Missing browser_evaluate.");
        await this.call(tool, { function: storageActionScript(action) });
        return step("action", `playwright:${action.type}`, "passed", storageActionDetail(action));
      }
      if (isNetworkStateAction(action)) {
        return step("action", `playwright:${action.type}`, "failed", "", "Playwright MCP does not expose browser context offline/online emulation to TestAgent; use the Playwright provider for this action.");
      }
      if (action.type === "goto") {
        const tool = pick(this.tools, [/__browser_navigate$/]);
        if (!tool) throw new Error("Missing browser_navigate.");
        const url = resolveUrl(project.targetUrl, action.url || "");
        await this.call(tool, { url });
        this.currentUrl = url;
        return step("action", "playwright:goto", "passed", url);
      }
      if (action.type === "reload") {
        const tool = pick(this.tools, [/__browser_navigate$/]);
        const url = resolveUrl(project.targetUrl, action.url || this.currentUrl || project.targetUrl);
        if (!tool) throw new Error("Missing browser_navigate.");
        if (!url) throw new Error("Cannot reload without a current URL or project targetUrl.");
        await this.call(tool, { url });
        this.currentUrl = url;
        return step("action", "playwright:reload", "passed", url);
      }
      if (action.type === "click") {
        const tool = pick(this.tools, [/__browser_click$/]);
        if (!tool) throw new Error("Missing browser_click.");
        await this.call(tool, targetInput(action));
        return step("action", "playwright:click", "passed", action.selector || action.text || "");
      }
      if (action.type === "fill") {
        const tool = pick(this.tools, [/__browser_type$/]);
        if (!tool) throw new Error("Missing browser_type.");
        await this.call(tool, targetInput(action));
        return step("action", "playwright:fill", "passed", action.selector || action.text || "");
      }
      if (action.type === "typeText") {
        const tool = pick(this.tools, [/__browser_type$/]);
        if (!tool) throw new Error("Missing browser_type.");
        await this.call(tool, targetInput(action));
        return step("action", "playwright:typeText", "passed", typedTextDetail(action));
      }
      if (action.type === "press") {
        const tool = pick(this.tools, [/__browser_press_key$/]);
        if (!tool) throw new Error("Missing browser_press_key.");
        const key = pressKeyText(action);
        await this.call(tool, { key });
        return step("action", "playwright:press", "passed", key);
      }
      if (action.type === "waitForTimeout") {
        const tool = pick(this.tools, [/__browser_wait_for$/]);
        const ms = Math.min(Number(action.value || action.text || defaultTimeout || 1000), defaultTimeout);
        if (tool) await this.call(tool, { time: Math.max(1, Math.ceil(ms / 1000)) });
        else await new Promise(resolve => setTimeout(resolve, ms));
        return step("action", "playwright:waitForTimeout", "passed", `${ms}ms`);
      }
      if (action.type === "waitForUrl") {
        return await waitForMcpUrl("playwright", this.currentUrl, action, defaultTimeout);
      }
      if (action.type === "evaluate") {
        const tool = pick(this.tools, [/__browser_evaluate$/]);
        if (!tool) throw new Error("Missing browser_evaluate.");
        await this.call(tool, { function: String(action.text || action.value || "() => undefined") });
        return step("action", "playwright:evaluate", "passed");
      }
      return step("action", `playwright:${action.type}`, "failed", "", `Action ${action.type} is not mapped for Playwright MCP.`);
    } catch (error: any) {
      return step("action", `playwright:${action.type}`, "failed", action.selector || action.text || action.url || "", error.message || String(error));
    }
  }

  async runAssertion(assertion: BrowserAssertionSpec, signals: McpBrowserSignals, defaultTimeout: number) {
    if (assertion.type === "urlEquals" || assertion.type === "urlIncludes" || assertion.type === "urlNotIncludes") {
      return assertWithCurrentUrl("playwright", this.currentUrl, assertion);
    }
    return assertWithText("playwright", assertion, signals, defaultTimeout);
  }

  async readConsoleMessages() {
    const tool = pick(this.tools, [/__browser_console_messages$/, /__read_console_messages$/]);
    if (!tool) return [];
    const text = extractToolText(await this.call(tool, {}));
    return text && !emptyLike(text) ? normalizeBrowserConsoleLines(compactText(text, 4000).split(/\r?\n/)) : [];
  }

  async readConsoleErrors() {
    return filterBrowserConsoleErrorLines(await this.readConsoleMessages());
  }

  async readNetworkErrors() {
    const tool = pick(this.tools, [/__browser_network_requests$/, /__read_network_requests$/]);
    if (!tool) return [];
    const text = extractToolText(await this.call(tool, {}));
    return text && /\b(4\d\d|5\d\d|failed|error)\b/i.test(text) ? [compactText(text, 1000)] : [];
  }

  async readNetworkRequests() {
    const tool = pick(this.tools, [/__browser_network_requests$/, /__read_network_requests$/]);
    if (!tool) return [];
    const text = extractToolText(await this.call(tool, {}));
    return text && !emptyLike(text) ? compactText(text, 4000).split(/\r?\n/).filter(Boolean) : [];
  }

  async captureScreenshot(name: string) {
    const tool = pick(this.tools, [/__browser_take_screenshot$/]);
    if (!tool) return [];
    return [await this.call(tool, { filename: name, fullPage: true })];
  }

  async pageText() {
    const tool = pick(this.tools, [/__browser_snapshot$/]);
    if (!tool) return "";
    return extractToolText(await this.call(tool, {}));
  }
}

class ClaudeChromeAdapter implements McpBrowserAdapter {
  id: McpBrowserAdapterId = "claude-in-chrome";
  label = "Claude in Chrome";
  currentUrl = "";
  private tabId: number | string | undefined;
  private tabReady = false;
  private tabContextChecked = false;
  private tabCount: number | undefined;
  private createdNewTab = false;
  private recoveryTracker = new BrowserRecoveryTracker("claude-in-chrome");
  constructor(public tools: string[], private call: Caller) {}

  private async readTabContext(required: boolean, force = false) {
    if (this.tabContextChecked && !force) return;
    const contextTool = pick(this.tools, [/__tabs_context_mcp$/]);
    if (!contextTool) {
      if (required) throw new Error("Existing authenticated Chrome verification requires tabs_context_mcp.");
      return;
    }
    const output = await this.call(contextTool, {});
    this.tabContextChecked = true;
    this.tabCount = extractTabCount(output);
  }

  async prepareExistingSession(url?: string) {
    await this.readTabContext(true);
    if (!pick(this.tools, [/__tabs_create_mcp$/])) {
      throw new Error("Existing authenticated Chrome verification requires tabs_create_mcp so TestAgent can avoid reusing the user's current tab.");
    }
    await this.ensureTab(url);
  }

  existingSessionContextEvidence() {
    return {
      provider: "claude-in-chrome" as const,
      tabContextChecked: this.tabContextChecked,
      ...(this.tabCount !== undefined ? { tabCount: this.tabCount } : {}),
      createdNewTab: this.createdNewTab,
    };
  }

  browserRecoveryEvidence() {
    return this.recoveryTracker.evidence();
  }

  private async ensureTab(url?: string) {
    if (this.tabReady) return this.tabId;
    await this.readTabContext(false);
    const createTool = pick(this.tools, [/__tabs_create_mcp$/]);
    if (createTool) {
      const output = await this.call(createTool, url ? { url } : {});
      this.tabId = extractTabId(output);
      this.tabReady = true;
      this.createdNewTab = true;
    }
    return this.tabId;
  }

  private withTab(input: Record<string, any>) {
    return this.tabId !== undefined ? { ...input, tabId: this.tabId } : input;
  }

  private async recoverTab(
    url?: string,
    onProgress?: (state: { contextRefreshed: boolean; createdNewTab: boolean }) => void,
  ) {
    this.tabId = undefined;
    this.tabReady = false;
    await this.readTabContext(true, true);
    onProgress?.({ contextRefreshed: true, createdNewTab: false });
    await this.ensureTab(url || this.currentUrl);
    if (!this.tabReady) throw new Error("Browser recovery could not create a new tab.");
    onProgress?.({ contextRefreshed: true, createdNewTab: true });
    return { contextRefreshed: true, createdNewTab: true };
  }

  private async callTabTool(
    tool: string,
    input: Record<string, any>,
    operation: string,
    retrySafe: boolean,
    recoveryUrl?: string,
  ) {
    try {
      return await this.call(tool, this.withTab(input));
    } catch (error: any) {
      const trigger = browserRecoveryTrigger(error);
      if (!trigger) throw error;
      if (!retrySafe) {
        this.recoveryTracker.record({
          operation,
          trigger,
          retrySafe: false,
          status: "not_retried",
          contextRefreshed: false,
          createdNewTab: false,
        });
        throw new Error(browserRecoveryFailureMessage(trigger, "not_retried"));
      }
      let contextRefreshed = false;
      let createdNewTab = false;
      try {
        await this.recoverTab(recoveryUrl, recovery => {
          contextRefreshed = recovery.contextRefreshed;
          createdNewTab = recovery.createdNewTab;
        });
        const output = await this.call(tool, this.withTab(input));
        this.recoveryTracker.record({
          operation,
          trigger,
          retrySafe: true,
          status: "recovered",
          contextRefreshed,
          createdNewTab,
        });
        return output;
      } catch {
        this.recoveryTracker.record({
          operation,
          trigger,
          retrySafe: true,
          status: "failed",
          contextRefreshed,
          createdNewTab,
        });
        throw new Error(browserRecoveryFailureMessage(trigger, "failed"));
      }
    }
  }

  async runAction(project: NormalizedTestAgentProjectTarget, action: BrowserActionSpec, defaultTimeout: number) {
    try {
      if (action.type === "uploadFile") {
        return step("action", "claude-in-chrome:uploadFile", "failed", "", "Claude in Chrome MCP cannot verify local file uploads from TestAgent; use the Playwright provider for this action.");
      }
      if (action.type === "dragTo") {
        return step("action", "claude-in-chrome:dragTo", "failed", "", "Claude in Chrome MCP drag/drop is not mapped for TestAgent; use the Playwright provider for this action.");
      }
      if (action.type === "doubleClick" || action.type === "rightClick") {
        return step("action", `claude-in-chrome:${action.type}`, "failed", "", `Claude in Chrome MCP ${action.type} is not mapped for TestAgent; use the Playwright provider for this action.`);
      }
      if (action.type === "focus") {
        return step("action", "claude-in-chrome:focus", "failed", "", "Claude in Chrome MCP focus is not mapped for TestAgent; use the Playwright provider for deterministic DOM focus.");
      }
      if (action.type === "setClipboard") {
        return step("action", "claude-in-chrome:setClipboard", "failed", "", "Claude in Chrome MCP clipboard write is not mapped for TestAgent; use the Playwright provider for this action.");
      }
      if (isCookieAction(action)) {
        const tool = pick(this.tools, [/__javascript_tool$/]);
        if (!tool) throw new Error("Missing javascript_tool.");
        await this.callTabTool(tool, { text: cookieActionScript(action) }, `action:${action.type}`, false);
        return step("action", `claude-in-chrome:${action.type}`, "passed", cookieActionDetail(action));
      }
      if (isStorageAction(action)) {
        const tool = pick(this.tools, [/__javascript_tool$/]);
        if (!tool) throw new Error("Missing javascript_tool.");
        await this.callTabTool(tool, { text: storageActionScript(action) }, `action:${action.type}`, false);
        return step("action", `claude-in-chrome:${action.type}`, "passed", storageActionDetail(action));
      }
      if (isNetworkStateAction(action)) {
        return step("action", `claude-in-chrome:${action.type}`, "failed", "", "Claude in Chrome MCP does not expose browser context offline/online emulation to TestAgent; use the Playwright provider for this action.");
      }
      if (action.type === "goto") {
        const url = resolveUrl(project.targetUrl, action.url || "");
        await this.ensureTab(url);
        const tool = pick(this.tools, [/__navigate$/]);
        if (tool) await this.callTabTool(tool, { url }, "action:goto", true, url);
        this.currentUrl = url;
        return step("action", "claude-in-chrome:goto", "passed", url);
      }
      if (action.type === "reload") {
        const url = resolveUrl(project.targetUrl, action.url || this.currentUrl || project.targetUrl);
        await this.ensureTab(url);
        const tool = pick(this.tools, [/__navigate$/]);
        if (!tool) throw new Error("Missing navigate tool.");
        if (!url) throw new Error("Cannot reload without a current URL or project targetUrl.");
        await this.callTabTool(tool, { url }, "action:reload", false, url);
        this.currentUrl = url;
        return step("action", "claude-in-chrome:reload", "passed", url);
      }
      if (action.type === "click") {
        const tool = pick(this.tools, [/__computer$/]);
        if (!tool) throw new Error("Missing computer tool.");
        await this.callTabTool(tool, { action: "left_click", ref: action.selector || action.text || action.value }, "action:click", false);
        return step("action", "claude-in-chrome:click", "passed", action.selector || action.text || "");
      }
      if (action.type === "fill") {
        const tool = pick(this.tools, [/__form_input$/, /__computer$/]);
        if (!tool) throw new Error("Missing input tool.");
        const payload = tool.endsWith("__computer")
          ? { action: "type", text: String(action.value ?? action.text ?? "") }
          : targetInput(action);
        await this.callTabTool(tool, payload, "action:fill", false);
        return step("action", "claude-in-chrome:fill", "passed", action.selector || action.text || "");
      }
      if (action.type === "typeText") {
        const tool = pick(this.tools, [/__form_input$/, /__computer$/]);
        if (!tool) throw new Error("Missing input tool.");
        const payload = tool.endsWith("__computer")
          ? { action: "type", text: typedText(action) }
          : targetInput(action);
        await this.callTabTool(tool, payload, "action:typeText", false);
        return step("action", "claude-in-chrome:typeText", "passed", typedTextDetail(action));
      }
      if (action.type === "waitForTimeout") {
        await new Promise(resolve => setTimeout(resolve, Math.min(Number(action.value || action.text || 1000), defaultTimeout)));
        return step("action", "claude-in-chrome:waitForTimeout", "passed");
      }
      if (action.type === "waitForUrl") {
        return await waitForMcpUrl("claude-in-chrome", this.currentUrl, action, defaultTimeout);
      }
      if (action.type === "evaluate") {
        const tool = pick(this.tools, [/__javascript_tool$/]);
        if (!tool) throw new Error("Missing javascript_tool.");
        await this.callTabTool(tool, { text: String(action.text || action.value || "undefined") }, "action:evaluate", false);
        return step("action", "claude-in-chrome:evaluate", "passed");
      }
      return step("action", `claude-in-chrome:${action.type}`, "failed", "", `Action ${action.type} is not mapped for Claude in Chrome.`);
    } catch (error: any) {
      return step("action", `claude-in-chrome:${action.type}`, "failed", action.selector || action.text || action.url || "", error.message || String(error));
    }
  }

  async runAssertion(assertion: BrowserAssertionSpec, signals: McpBrowserSignals, defaultTimeout: number) {
    if (assertion.type === "urlEquals" || assertion.type === "urlIncludes" || assertion.type === "urlNotIncludes") {
      return assertWithCurrentUrl("claude-in-chrome", this.currentUrl, assertion);
    }
    return assertWithText("claude-in-chrome", assertion, signals, defaultTimeout);
  }

  async readConsoleMessages() {
    const tool = pick(this.tools, [/__read_console_messages$/]);
    if (!tool) return [];
    const text = extractToolText(await this.callTabTool(tool, {}, "telemetry:console", true));
    return text && !emptyLike(text) ? normalizeBrowserConsoleLines(compactText(text, 4000).split(/\r?\n/)) : [];
  }

  async readConsoleErrors() {
    return filterBrowserConsoleErrorLines(await this.readConsoleMessages());
  }

  async readNetworkErrors() {
    const tool = pick(this.tools, [/__read_network_requests$/]);
    if (!tool) return [];
    const text = extractToolText(await this.callTabTool(tool, {}, "telemetry:network", true));
    return text && /\b(4\d\d|5\d\d|failed|error)\b/i.test(text) ? [compactText(text, 1000)] : [];
  }

  async readNetworkRequests() {
    const tool = pick(this.tools, [/__read_network_requests$/]);
    if (!tool) return [];
    const text = extractToolText(await this.callTabTool(tool, {}, "telemetry:network", true));
    return text && !emptyLike(text) ? compactText(text, 4000).split(/\r?\n/).filter(Boolean) : [];
  }

  async captureScreenshot(name: string) {
    const tool = pick(this.tools, [/__gif_creator$/]);
    if (!tool) return [];
    return [await this.callTabTool(tool, { action: "capture_frame", name }, "evidence:screenshot", true)];
  }

  async pageText() {
    const tool = pick(this.tools, [/__get_page_text$/, /__read_page$/]);
    if (!tool) return "";
    return extractToolText(await this.callTabTool(tool, {}, "observation:page_text", true));
  }
}

class ChromeDevtoolsAdapter implements McpBrowserAdapter {
  id: McpBrowserAdapterId = "chrome-devtools";
  label = "Chrome DevTools MCP";
  currentUrl = "";
  private tabContextChecked = false;
  private tabCount: number | undefined;
  private createdNewTab = false;
  private recoveryTracker = new BrowserRecoveryTracker("chrome-devtools");
  constructor(public tools: string[], private call: Caller) {}

  private async readPageContext() {
    const listTool = pick(this.tools, [/__list_pages$/]);
    if (!listTool) throw new Error("Existing authenticated Chrome DevTools verification requires list_pages.");
    const output = await this.call(listTool, {});
    this.tabContextChecked = true;
    this.tabCount = extractTabCount(output);
  }

  private async createPage(url?: string) {
    if (!pick(this.tools, [/__new_page$/])) {
      throw new Error("Existing authenticated Chrome DevTools verification requires new_page so TestAgent can avoid reusing the user's current page.");
    }
    await this.call(pick(this.tools, [/__new_page$/])!, url ? { url } : {});
    this.createdNewTab = true;
    this.currentUrl = url || "";
  }

  async prepareExistingSession(url?: string) {
    await this.readPageContext();
    await this.createPage(url);
  }

  existingSessionContextEvidence() {
    return {
      provider: "chrome-devtools" as const,
      tabContextChecked: this.tabContextChecked,
      ...(this.tabCount !== undefined ? { tabCount: this.tabCount } : {}),
      createdNewTab: this.createdNewTab,
    };
  }

  browserRecoveryEvidence() {
    return this.recoveryTracker.evidence();
  }

  private async recoverPage(
    url?: string,
    onProgress?: (state: { contextRefreshed: boolean; createdNewTab: boolean }) => void,
  ) {
    await this.readPageContext();
    onProgress?.({ contextRefreshed: true, createdNewTab: false });
    await this.createPage(url || this.currentUrl);
    onProgress?.({ contextRefreshed: true, createdNewTab: true });
    return { contextRefreshed: true, createdNewTab: true };
  }

  private async callPageTool(
    tool: string,
    input: Record<string, any>,
    operation: string,
    retrySafe: boolean,
    recoveryUrl?: string,
  ) {
    try {
      return await this.call(tool, input);
    } catch (error: any) {
      const trigger = browserRecoveryTrigger(error);
      if (!trigger) throw error;
      if (!retrySafe) {
        this.recoveryTracker.record({
          operation,
          trigger,
          retrySafe: false,
          status: "not_retried",
          contextRefreshed: false,
          createdNewTab: false,
        });
        throw new Error(browserRecoveryFailureMessage(trigger, "not_retried"));
      }
      let contextRefreshed = false;
      let createdNewTab = false;
      try {
        await this.recoverPage(recoveryUrl, recovery => {
          contextRefreshed = recovery.contextRefreshed;
          createdNewTab = recovery.createdNewTab;
        });
        const output = await this.call(tool, input);
        this.recoveryTracker.record({
          operation,
          trigger,
          retrySafe: true,
          status: "recovered",
          contextRefreshed,
          createdNewTab,
        });
        return output;
      } catch {
        this.recoveryTracker.record({
          operation,
          trigger,
          retrySafe: true,
          status: "failed",
          contextRefreshed,
          createdNewTab,
        });
        throw new Error(browserRecoveryFailureMessage(trigger, "failed"));
      }
    }
  }

  async runAction(project: NormalizedTestAgentProjectTarget, action: BrowserActionSpec, defaultTimeout: number) {
    try {
      if (action.type === "uploadFile") {
        return step("action", "chrome-devtools:uploadFile", "failed", "", "Chrome DevTools MCP cannot verify local file uploads from TestAgent; use the Playwright provider for this action.");
      }
      if (action.type === "dragTo") {
        return step("action", "chrome-devtools:dragTo", "failed", "", "Chrome DevTools MCP drag/drop is not mapped for TestAgent; use the Playwright provider for this action.");
      }
      if (action.type === "doubleClick" || action.type === "rightClick") {
        return step("action", `chrome-devtools:${action.type}`, "failed", "", `Chrome DevTools MCP ${action.type} is not mapped for TestAgent; use the Playwright provider for this action.`);
      }
      if (action.type === "focus") {
        return step("action", "chrome-devtools:focus", "failed", "", "Chrome DevTools MCP focus is not mapped for TestAgent; use the Playwright provider for deterministic DOM focus.");
      }
      if (action.type === "setClipboard") {
        return step("action", "chrome-devtools:setClipboard", "failed", "", "Chrome DevTools MCP clipboard write is not mapped for TestAgent; use the Playwright provider for this action.");
      }
      if (isCookieAction(action)) {
        const tool = pick(this.tools, [/__evaluate_script$/]);
        if (!tool) throw new Error("Missing evaluate_script.");
        await this.callPageTool(tool, { function: cookieActionScript(action) }, `action:${action.type}`, false);
        return step("action", `chrome-devtools:${action.type}`, "passed", cookieActionDetail(action));
      }
      if (isStorageAction(action)) {
        const tool = pick(this.tools, [/__evaluate_script$/]);
        if (!tool) throw new Error("Missing evaluate_script.");
        await this.callPageTool(tool, { function: storageActionScript(action) }, `action:${action.type}`, false);
        return step("action", `chrome-devtools:${action.type}`, "passed", storageActionDetail(action));
      }
      if (isNetworkStateAction(action)) {
        return step("action", `chrome-devtools:${action.type}`, "failed", "", "Chrome DevTools MCP offline/online emulation is not mapped for TestAgent; use the Playwright provider for this action.");
      }
      if (action.type === "goto") {
        const url = resolveUrl(project.targetUrl, action.url || "");
        const createTool = pick(this.tools, [/__new_page$/]);
        const navTool = pick(this.tools, [/__navigate_page$/]);
        if (!this.createdNewTab && createTool) {
          await this.call(createTool, { url });
          this.createdNewTab = true;
        }
        else if (navTool && this.currentUrl !== url) await this.callPageTool(navTool, { url }, "action:goto", true, url);
        else if (this.currentUrl !== url) throw new Error("Missing navigate_page.");
        this.currentUrl = url;
        return step("action", "chrome-devtools:goto", "passed", url);
      }
      if (action.type === "reload") {
        const url = resolveUrl(project.targetUrl, action.url || this.currentUrl || project.targetUrl);
        const navTool = pick(this.tools, [/__navigate_page$/]);
        if (!navTool) throw new Error("Missing navigate_page.");
        if (!url) throw new Error("Cannot reload without a current URL or project targetUrl.");
        await this.callPageTool(navTool, { url }, "action:reload", false, url);
        this.currentUrl = url;
        return step("action", "chrome-devtools:reload", "passed", url);
      }
      if (action.type === "click") {
        const tool = pick(this.tools, [/__click$/]);
        if (!tool) throw new Error("Missing click tool.");
        await this.callPageTool(tool, targetInput(action), "action:click", false);
        return step("action", "chrome-devtools:click", "passed", action.selector || action.text || "");
      }
      if (action.type === "fill") {
        const tool = pick(this.tools, [/__fill$/, /__type$/]);
        if (!tool) throw new Error("Missing fill/type tool.");
        await this.callPageTool(tool, targetInput(action), "action:fill", false);
        return step("action", "chrome-devtools:fill", "passed", action.selector || action.text || "");
      }
      if (action.type === "typeText") {
        const tool = pick(this.tools, [/__type$/]);
        if (!tool) throw new Error("Missing type tool.");
        await this.callPageTool(tool, targetInput(action), "action:typeText", false);
        return step("action", "chrome-devtools:typeText", "passed", typedTextDetail(action));
      }
      if (action.type === "evaluate") {
        const tool = pick(this.tools, [/__evaluate_script$/]);
        if (!tool) throw new Error("Missing evaluate_script.");
        await this.callPageTool(tool, { function: String(action.text || action.value || "() => undefined") }, "action:evaluate", false);
        return step("action", "chrome-devtools:evaluate", "passed");
      }
      if (action.type === "waitForTimeout") {
        await new Promise(resolve => setTimeout(resolve, Math.min(Number(action.value || action.text || 1000), defaultTimeout)));
        return step("action", "chrome-devtools:waitForTimeout", "passed");
      }
      if (action.type === "waitForUrl") {
        return await waitForMcpUrl("chrome-devtools", this.currentUrl, action, defaultTimeout);
      }
      return step("action", `chrome-devtools:${action.type}`, "failed", "", `Action ${action.type} is not mapped for Chrome DevTools MCP.`);
    } catch (error: any) {
      return step("action", `chrome-devtools:${action.type}`, "failed", action.selector || action.text || action.url || "", error.message || String(error));
    }
  }

  async runAssertion(assertion: BrowserAssertionSpec, signals: McpBrowserSignals, defaultTimeout: number) {
    if (assertion.type === "urlEquals" || assertion.type === "urlIncludes" || assertion.type === "urlNotIncludes") {
      return assertWithCurrentUrl("chrome-devtools", this.currentUrl, assertion);
    }
    return assertWithText("chrome-devtools", assertion, signals, defaultTimeout);
  }

  async readConsoleMessages() {
    const tool = pick(this.tools, [/__list_console_messages$/]);
    if (!tool) return [];
    const text = extractToolText(await this.callPageTool(tool, {}, "telemetry:console", true));
    return text && !emptyLike(text) ? normalizeBrowserConsoleLines(compactText(text, 4000).split(/\r?\n/)) : [];
  }

  async readConsoleErrors() {
    return filterBrowserConsoleErrorLines(await this.readConsoleMessages());
  }

  async readNetworkErrors() {
    const tool = pick(this.tools, [/__list_network_requests$/]);
    if (!tool) return [];
    const text = extractToolText(await this.callPageTool(tool, {}, "telemetry:network", true));
    return text && /\b(4\d\d|5\d\d|failed|error)\b/i.test(text) ? [compactText(text, 1000)] : [];
  }

  async readNetworkRequests() {
    const tool = pick(this.tools, [/__list_network_requests$/]);
    if (!tool) return [];
    const text = extractToolText(await this.callPageTool(tool, {}, "telemetry:network", true));
    return text && !emptyLike(text) ? compactText(text, 4000).split(/\r?\n/).filter(Boolean) : [];
  }

  async captureScreenshot(name: string) {
    const tool = pick(this.tools, [/__take_screenshot$/]);
    if (!tool) return [];
    return [await this.callPageTool(tool, { filePath: name }, "evidence:screenshot", true)];
  }

  async pageText() {
    const tool = pick(this.tools, [/__take_snapshot$/]);
    if (!tool) return "";
    return extractToolText(await this.callPageTool(tool, {}, "observation:page_text", true));
  }
}

class ComputerUseAdapter implements McpBrowserAdapter {
  id: McpBrowserAdapterId = "computer-use";
  label = "Computer Use MCP";
  currentUrl = "";
  constructor(public tools: string[], private call: Caller) {}

  private unsupported(kind: "action" | "assertion", type: string, reason: string): BrowserStepResult {
    return step(kind, `computer-use:${type}`, "failed", "", reason);
  }

  async runAction(project: NormalizedTestAgentProjectTarget, action: BrowserActionSpec, defaultTimeout: number) {
    try {
      if (action.type === "uploadFile") {
        return this.unsupported("action", "uploadFile", "Computer Use MCP cannot verify local file uploads from TestAgent; use the Playwright provider for this action.");
      }
      if (action.type === "dragTo") {
        return this.unsupported("action", "dragTo", "Computer Use MCP drag/drop is not mapped for TestAgent; use the Playwright provider for this action.");
      }
      if (action.type === "doubleClick" || action.type === "rightClick") {
        return this.unsupported("action", action.type, `Computer Use MCP ${action.type} is not mapped for TestAgent; use the Playwright provider for this action.`);
      }
      if (action.type === "focus") {
        const tool = pick(this.tools, [/__left_click$/]);
        if (!tool) throw new Error("Missing left_click tool.");
        const input = coordinateInput(action);
        if (!input.coordinate) throw new Error("Computer Use focus requires action.coordinate [x,y]; selectors/text cannot be resolved without DOM access.");
        await this.call(tool, input);
        return step("action", "computer-use:focus", "passed", computerActionDetail(action));
      }
      if (action.type === "setClipboard") {
        return this.unsupported("action", "setClipboard", "Computer Use MCP cannot write browser clipboard contents for TestAgent; use the Playwright provider for this action.");
      }
      if (isCookieAction(action)) {
        return this.unsupported("action", action.type, "Computer Use MCP cannot modify browser cookies from TestAgent; use Playwright or a JavaScript-capable browser provider.");
      }
      if (isStorageAction(action)) {
        return this.unsupported("action", action.type, "Computer Use MCP cannot modify Web Storage from TestAgent; use Playwright or a JavaScript-capable browser provider.");
      }
      if (isNetworkStateAction(action)) {
        return this.unsupported("action", action.type, "Computer Use MCP cannot emulate browser offline/online network state from TestAgent; use Playwright for this action.");
      }
      if (action.type === "requestAccess") {
        const tool = pick(this.tools, [/__request_access$/]);
        if (!tool) throw new Error("Missing request_access tool.");
        const apps = normalizeComputerUseApps(action.apps);
        await this.call(tool, apps ? { apps } : {});
        return step("action", "computer-use:requestAccess", "passed", apps ? `${apps.length} apps` : "session access requested");
      }
      if (action.type === "openApplication") {
        const tool = pick(this.tools, [/__open_application$/]);
        if (!tool) throw new Error("Missing open_application tool.");
        const bundleId = String(action.bundle_id || action.bundleId || action.value || action.text || "").trim();
        if (!bundleId) throw new Error("openApplication requires bundleId/bundle_id.");
        await this.call(tool, { bundle_id: bundleId });
        return step("action", "computer-use:openApplication", "passed", bundleId);
      }
      if (action.type === "goto") {
        const keyTool = pick(this.tools, [/__key$/]);
        const typeTool = pick(this.tools, [/__type$/]);
        if (!keyTool || !typeTool) throw new Error("Computer Use goto needs key and type tools, with a browser already focused.");
        const url = resolveUrl(project.targetUrl, action.url || project.targetUrl);
        await this.call(keyTool, { text: browserAddressShortcut() });
        await this.call(typeTool, { text: url });
        await this.call(keyTool, { text: "enter" });
        this.currentUrl = url;
        return step("action", "computer-use:goto", "passed", `${url} typed into the active browser`);
      }
      if (action.type === "reload") {
        const keyTool = pick(this.tools, [/__key$/]);
        if (!keyTool) throw new Error("Missing key tool.");
        await this.call(keyTool, { text: "ctrl+r" });
        return step("action", "computer-use:reload", "passed", "browser refresh shortcut sent");
      }
      if (action.type === "click" || action.type === "check" || action.type === "uncheck") {
        const tool = pick(this.tools, [/__left_click$/]);
        if (!tool) throw new Error("Missing left_click tool.");
        const input = coordinateInput(action);
        if (!input.coordinate) throw new Error("Computer Use click requires action.coordinate [x,y]; selectors/text cannot be resolved without DOM access.");
        await this.call(tool, input);
        return step("action", `computer-use:${action.type}`, "passed", computerActionDetail(action));
      }
      if (action.type === "hover") {
        const tool = pick(this.tools, [/__mouse_move$/]);
        if (!tool) throw new Error("Missing mouse_move tool.");
        const input = coordinateInput(action);
        if (!input.coordinate) throw new Error("Computer Use hover requires action.coordinate [x,y].");
        await this.call(tool, input);
        return step("action", "computer-use:hover", "passed", computerActionDetail(action));
      }
      if (action.type === "fill") {
        const typeTool = pick(this.tools, [/__type$/]);
        if (!typeTool) throw new Error("Missing type tool.");
        const text = String(action.value ?? action.text ?? "");
        if (!text) throw new Error("fill requires value/text.");
        const input = coordinateInput(action);
        if (input.coordinate) {
          const clickTool = pick(this.tools, [/__left_click$/]);
          if (clickTool) await this.call(clickTool, input);
        } else if (action.selector) {
          throw new Error("Computer Use fill cannot resolve selectors; click a coordinate first or provide action.coordinate.");
        }
        await this.call(typeTool, { text });
        return step("action", "computer-use:fill", "passed", input.coordinate ? `${computerActionDetail(action)} then typed` : "typed into focused control");
      }
      if (action.type === "typeText") {
        const typeTool = pick(this.tools, [/__type$/]);
        if (!typeTool) throw new Error("Missing type tool.");
        const text = typedText(action);
        if (!text) throw new Error("typeText requires value/text.");
        const input = coordinateInput(action);
        if (input.coordinate) {
          const clickTool = pick(this.tools, [/__left_click$/]);
          if (clickTool) await this.call(clickTool, input);
        } else if (action.selector) {
          throw new Error("Computer Use typeText cannot resolve selectors; click a coordinate first or provide action.coordinate.");
        }
        await this.call(typeTool, { text });
        return step("action", "computer-use:typeText", "passed", input.coordinate ? `${computerActionDetail(action)} then typed ${text.length} chars` : `typed ${text.length} chars into focused control`);
      }
      if (action.type === "press") {
        const tool = pick(this.tools, [/__key$/]);
        if (!tool) throw new Error("Missing key tool.");
        const text = pressKeyText(action, "enter");
        await this.call(tool, { text });
        return step("action", "computer-use:press", "passed", text);
      }
      if (action.type === "scroll") {
        const tool = pick(this.tools, [/__scroll$/]);
        if (!tool) throw new Error("Missing scroll tool.");
        const amount = Math.max(1, Number(action.amount || action.value || 1));
        const input = {
          direction: action.direction || "down",
          amount,
          ...coordinateInput(action),
        };
        await this.call(tool, input);
        return step("action", "computer-use:scroll", "passed", `${input.direction} x${amount}`);
      }
      if (action.type === "waitForTimeout") {
        const ms = Math.min(Number(action.duration || action.value || action.text || defaultTimeout || 1000), defaultTimeout);
        const seconds = Math.max(1, Math.ceil(ms / 1000));
        const tool = pick(this.tools, [/__wait$/]);
        if (tool) await this.call(tool, { duration: seconds });
        else await new Promise(resolve => setTimeout(resolve, seconds * 1000));
        return step("action", "computer-use:waitForTimeout", "passed", `${seconds}s`);
      }
      if (action.type === "waitForSelector" || action.type === "waitForText") {
        return this.unsupported("action", action.type, "Computer Use cannot wait on DOM selectors or page text. Use a browser-native MCP provider for DOM assertions.");
      }
      if (action.type === "waitForUrl") {
        return await waitForMcpUrl("computer-use", this.currentUrl, action, defaultTimeout);
      }
      if (action.type === "evaluate") {
        return this.unsupported("action", "evaluate", "Computer Use cannot evaluate JavaScript in the page. Use Playwright, Claude in Chrome, or Chrome DevTools MCP.");
      }
      if (action.type === "selectOption") {
        return this.unsupported("action", "selectOption", "Computer Use cannot resolve select elements by selector; model it as coordinate click/type/key actions.");
      }
      return this.unsupported("action", action.type, `Action ${action.type} is not mapped for Computer Use MCP.`);
    } catch (error: any) {
      return step("action", `computer-use:${action.type}`, "failed", computerActionDetail(action), error.message || String(error));
    }
  }

  async runAssertion(assertion: BrowserAssertionSpec) {
    if (assertion.type === "urlEquals" || assertion.type === "urlIncludes" || assertion.type === "urlNotIncludes") {
      return assertWithCurrentUrl("computer-use", this.currentUrl, assertion);
    }
    if (
      assertion.type === "consoleNoErrors"
      || assertion.type === "consoleIncludes"
      || assertion.type === "consoleNotIncludes"
      || assertion.type === "consoleNoWarnings"
      || assertion.type === "onlineState"
      || assertion.type === "browserOnline"
      || assertion.type === "browserOffline"
      || assertion.type === "accessibleNameEquals"
      || assertion.type === "accessibleNameIncludes"
      || assertion.type === "accessibleDescriptionEquals"
      || assertion.type === "accessibleDescriptionIncludes"
      || assertion.type === "ariaSnapshotIncludes"
      || isBrowserAriaStateAssertion(assertion)
      || assertion.type === "networkNoErrors"
      || assertion.type === "networkRequest"
      || assertion.type === "networkResponse"
      || assertion.type === "networkRequestIncludes"
      || assertion.type === "networkResponseIncludes"
      || assertion.type === "networkRequestNot"
      || assertion.type === "networkResponseNot"
      || assertion.type === "networkRequestNotIncludes"
      || assertion.type === "networkResponseNotIncludes"
      || assertion.type === "popupOpened"
      || assertion.type === "popupUrlIncludes"
      || assertion.type === "popupTextIncludes"
      || assertion.type === "popupTitleIncludes"
    ) {
      return this.unsupported("assertion", assertion.type, "Computer Use MCP does not expose console, network, offline/online emulation, accessibility/ARIA DOM state, or popup page telemetry.");
    }
    return this.unsupported("assertion", assertion.type, "Computer Use MCP cannot read DOM/page text; use screenshot evidence or a browser-native provider for this assertion.");
  }

  async readConsoleErrors() {
    return [];
  }

  async readNetworkErrors() {
    return [];
  }

  async readNetworkRequests() {
    return [];
  }

  async captureScreenshot(name: string) {
    const tool = pick(this.tools, [/__screenshot$/]);
    if (!tool) return [];
    return [await this.call(tool, { name })];
  }

  async pageText() {
    return "";
  }
}

export function createMcpBrowserAdapter(
  tools: string[],
  call: Caller,
  options: {
    existingSession?: boolean;
    preferredAdapter?: BrowserExistingSessionProvider;
  } = {},
): McpBrowserAdapter | null {
  const browserTools = tools.filter(tool => /mcp__(playwright|claude-in-chrome|chrome|chrome-devtools|chromedevtools|computer-use)__/.test(tool));
  if (!browserTools.length) return null;
  if (options.existingSession) {
    const preferred = options.preferredAdapter || "auto";
    if (
      (preferred === "auto" || preferred === "claude-in-chrome")
      && has(browserTools, /mcp__claude-in-chrome__/)
    ) {
      return new ClaudeChromeAdapter(browserTools, call);
    }
    if (
      (preferred === "auto" || preferred === "chrome-devtools")
      && has(browserTools, /mcp__(chrome-devtools|chromedevtools|chrome)__(new_page|navigate_page|take_snapshot|click|fill|evaluate_script|list_pages)/)
    ) {
      return new ChromeDevtoolsAdapter(browserTools, call);
    }
    return null;
  }
  if (has(browserTools, /mcp__playwright__browser_/)) return new PlaywrightMcpAdapter(browserTools, call);
  if (has(browserTools, /mcp__claude-in-chrome__/)) return new ClaudeChromeAdapter(browserTools, call);
  if (has(browserTools, /mcp__(chrome-devtools|chromedevtools|chrome)__(new_page|navigate_page|take_snapshot|click|fill|evaluate_script)/)) return new ChromeDevtoolsAdapter(browserTools, call);
  if (has(browserTools, /mcp__computer-use__/)) return new ComputerUseAdapter(browserTools, call);
  return null;
}
