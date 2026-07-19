// Behavior-freeze split from mcp-adapters.ts (part 1/3).
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

export type Caller = (toolName: string, input: Record<string, any>) => Promise<any>;
type ComputerCoordinate = [number, number];

export function has(tools: string[], pattern: RegExp) {
  return tools.some(tool => pattern.test(tool));
}

export function pick(tools: string[], patterns: RegExp[]) {
  return tools.find(tool => patterns.some(pattern => pattern.test(tool)));
}

function stringifyOutput(output: any) {
  if (output === undefined || output === null) return "";
  if (typeof output === "string") return output;
  try { return JSON.stringify(output); } catch { return String(output); }
}

export function extractToolText(output: any) {
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

export function extractUrlFromObservation(text: string) {
  const raw = String(text || "");
  const quoted = raw.match(/["'](https?:\/\/[^"'\s]+)["']/i);
  if (quoted?.[1]) return quoted[1];
  const bare = raw.match(/https?:\/\/[^\s"'<>]+/i);
  if (bare?.[0]) return bare[0].replace(/[),.]+$/, "");
  const pathOnly = raw.match(/["'](\/[^"']*)["']/);
  return pathOnly?.[1] || "";
}

export function evaluateActionResult(adapterName: string, action: BrowserActionSpec, toolOutput: any): BrowserStepResult {
  const text = extractToolText(toolOutput);
  if (/\b(Error:|TypeError|ReferenceError|SyntaxError|Evaluation failed|Evaluate failed)\b/i.test(text)) {
    return step(
      "action",
      `${adapterName}:evaluate`,
      "failed",
      "",
      compactText(text, 500) || "Evaluate reported a page-side error.",
    );
  }
  const expected = String((action as any).expected ?? (action as any).expect ?? "").trim();
  if (expected) {
    const normalized = text.trim();
    const matched = normalized === expected
      || normalized.includes(expected)
      || (/^true$/i.test(expected) && /\btrue\b/i.test(normalized) && !/\bfalse\b/i.test(normalized));
    if (!matched) {
      return step(
        "action",
        `${adapterName}:evaluate`,
        "failed",
        expected,
        `Evaluate expected "${expected}", got "${compactText(text, 300) || "(empty)"}".`,
      );
    }
  }
  return step("action", `${adapterName}:evaluate`, "passed", expected || compactText(text, 120));
}

export function extractTabId(output: any): number | string | undefined {
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

export function extractTabCount(output: any): number | undefined {
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

export function emptyLike(text: string) {
  return /^(\[\]|{}|null|undefined|"")$/i.test(text.trim());
}

export function targetInput(action: BrowserActionSpec) {
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

export function typedText(action: BrowserActionSpec) {
  return String(action.value ?? action.text ?? "");
}

export function typedTextDetail(action: BrowserActionSpec) {
  const input = targetInput(action);
  return `${input.element || "focused control"}; text length=${typedText(action).length}`;
}

export function pressKeyText(action: BrowserActionSpec, fallback = "Enter") {
  return String(action.key || action.value || action.text || fallback);
}

export function isCookieAction(action: BrowserActionSpec) {
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

export function cookieActionDetail(action: BrowserActionSpec) {
  const names = cookieActionNames(action);
  if (action.type === "clearCookies") return names.length ? `cookie count=${names.length}` : "all JS-visible cookies";
  return `cookie=${cookieActionName(action) || "(missing)"}; value length=${cookieActionValue(action).length}`;
}

export function cookieActionScript(action: BrowserActionSpec) {
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

export function isStorageAction(action: BrowserActionSpec) {
  return action.type === "setLocalStorage" || action.type === "setSessionStorage" || action.type === "clearStorage";
}

export function isNetworkStateAction(action: BrowserActionSpec) {
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

export function storageActionDetail(action: BrowserActionSpec) {
  const area = storageActionArea(action);
  const keys = storageActionKeys(action);
  if (action.type === "clearStorage") return `${area}; ${keys.length ? `key count=${keys.length}` : "clear all"}`;
  return `${area}; key=${storageActionKey(action) || "(missing)"}; value length=${storageActionValue(action).length}`;
}

export function storageActionScript(action: BrowserActionSpec) {
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

export function step(kind: "action" | "assertion", name: string, status: BrowserStepResult["status"], detail = "", error = ""): BrowserStepResult {
  return { kind, name, status, detail, ...(error ? { error } : {}) };
}

function isCoordinate(value: unknown): value is ComputerCoordinate {
  return Array.isArray(value)
    && value.length === 2
    && value.every(item => Number.isFinite(Number(item)));
}

export function coordinateInput(action: BrowserActionSpec) {
  return isCoordinate(action.coordinate) ? { coordinate: [Number(action.coordinate[0]), Number(action.coordinate[1])] as ComputerCoordinate } : {};
}

export function computerActionDetail(action: BrowserActionSpec) {
  const coordinate = isCoordinate(action.coordinate) ? `(${action.coordinate[0]},${action.coordinate[1]})` : "";
  return action.selector || action.text || action.value || action.url || coordinate;
}

export function browserAddressShortcut() {
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

export function assertWithCurrentUrl(adapterName: string, currentUrl: string, assertion: BrowserAssertionSpec) {
  const expected = assertionExpectedUrl(assertion);
  if (!expected) return step("assertion", `${adapterName}:${assertion.type}`, "failed", "", `${assertion.type} requires url/text/value.`);
  const live = String(currentUrl || "").trim();
  if (!live) {
    return step(
      "assertion",
      `${adapterName}:${assertion.type}`,
      "failed",
      expected,
      `Live URL observation is required for ${assertion.type} on ${adapterName}; cached/intended URL is not trusted.`,
    );
  }
  const actual = comparableUrl(live, expected);
  if (assertion.type === "urlEquals") {
    return actual === expected
      ? step("assertion", `${adapterName}:urlEquals`, "passed", expected)
      : step("assertion", `${adapterName}:urlEquals`, "failed", expected, `Expected URL to equal "${expected}", got "${actual || "unknown"}".`);
  }
  if (assertion.type === "urlNotIncludes") {
    return !live.includes(expected)
      ? step("assertion", `${adapterName}:urlNotIncludes`, "passed", expected)
      : step("assertion", `${adapterName}:urlNotIncludes`, "failed", expected, `Expected URL not to include "${expected}", got "${live}".`);
  }
  return live.includes(expected)
    ? step("assertion", `${adapterName}:urlIncludes`, "passed", expected)
    : step("assertion", `${adapterName}:urlIncludes`, "failed", expected, `Expected URL to include "${expected}", got "${live}".`);
}

export async function assertWithLiveUrl(
  adapterName: string,
  assertion: BrowserAssertionSpec,
  readLiveUrl?: () => Promise<string | null | undefined>,
) {
  if (!readLiveUrl) {
    return assertWithCurrentUrl(adapterName, "", assertion);
  }
  let live = "";
  try {
    live = String(await readLiveUrl() || "").trim();
  } catch (error: any) {
    return step(
      "assertion",
      `${adapterName}:${assertion.type}`,
      "failed",
      assertionExpectedUrl(assertion),
      `Failed to observe live URL: ${error?.message || String(error)}`,
    );
  }
  return assertWithCurrentUrl(adapterName, live, assertion);
}

export async function waitForMcpUrl(
  adapterName: string,
  currentUrl: string,
  action: BrowserActionSpec,
  defaultTimeout: number,
  readLiveUrl?: () => Promise<string | null | undefined>,
) {
  const expected = expectedUrlFragment(action);
  if (!expected) return step("action", `${adapterName}:waitForUrl`, "failed", "", "waitForUrl requires url/text/value.");
  if (!readLiveUrl) {
    return step(
      "action",
      `${adapterName}:waitForUrl`,
      "failed",
      expected,
      `Live URL observation is required for waitForUrl on ${adapterName}; cached URL "${currentUrl || "(empty)"}" is not trusted. Use Playwright.`,
    );
  }
  const deadline = Date.now() + Math.max(1, Number(action.timeoutMs || action.timeout_ms || defaultTimeout || 1000));
  let lastUrl = "";
  while (Date.now() < deadline) {
    try {
      const live = String(await readLiveUrl() || "").trim();
      if (live) lastUrl = live;
      if (live && live.includes(expected)) return step("action", `${adapterName}:waitForUrl`, "passed", expected);
    } catch {
      // keep polling until deadline; fail-closed below
    }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  return step(
    "action",
    `${adapterName}:waitForUrl`,
    "failed",
    expected,
    `Expected URL to include "${expected}", got "${lastUrl || "(unobserved)"}".`,
  );
}

export function normalizeComputerUseApps(apps: BrowserActionSpec["apps"]) {
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

export async function assertWithText(adapterName: string, assertion: BrowserAssertionSpec, signals: McpBrowserSignals, defaultTimeout = 1000): Promise<BrowserStepResult> {
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
