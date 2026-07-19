"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.has = has;
exports.pick = pick;
exports.extractToolText = extractToolText;
exports.extractUrlFromObservation = extractUrlFromObservation;
exports.evaluateActionResult = evaluateActionResult;
exports.extractTabId = extractTabId;
exports.extractTabCount = extractTabCount;
exports.emptyLike = emptyLike;
exports.targetInput = targetInput;
exports.typedText = typedText;
exports.typedTextDetail = typedTextDetail;
exports.pressKeyText = pressKeyText;
exports.isCookieAction = isCookieAction;
exports.cookieActionDetail = cookieActionDetail;
exports.cookieActionScript = cookieActionScript;
exports.isStorageAction = isStorageAction;
exports.isNetworkStateAction = isNetworkStateAction;
exports.storageActionDetail = storageActionDetail;
exports.storageActionScript = storageActionScript;
exports.step = step;
exports.coordinateInput = coordinateInput;
exports.computerActionDetail = computerActionDetail;
exports.browserAddressShortcut = browserAddressShortcut;
exports.assertWithCurrentUrl = assertWithCurrentUrl;
exports.assertWithLiveUrl = assertWithLiveUrl;
exports.waitForMcpUrl = waitForMcpUrl;
exports.normalizeComputerUseApps = normalizeComputerUseApps;
exports.assertWithText = assertWithText;
const utils_1 = require("../utils");
const network_assertions_1 = require("./network-assertions");
const console_assertions_1 = require("./console-assertions");
const aria_state_assertions_1 = require("./aria-state-assertions");
const semantic_locator_1 = require("./semantic-locator");
function has(tools, pattern) {
    return tools.some(tool => pattern.test(tool));
}
function pick(tools, patterns) {
    return tools.find(tool => patterns.some(pattern => pattern.test(tool)));
}
function stringifyOutput(output) {
    if (output === undefined || output === null)
        return "";
    if (typeof output === "string")
        return output;
    try {
        return JSON.stringify(output);
    }
    catch {
        return String(output);
    }
}
function extractToolText(output) {
    if (typeof output === "string")
        return output;
    if (Array.isArray(output))
        return output.map(extractToolText).filter(Boolean).join("\n");
    if (output && typeof output === "object") {
        const parts = [];
        for (const key of ["text", "content", "markdown", "snapshot", "pageText", "result", "output"]) {
            if (typeof output[key] === "string")
                parts.push(output[key]);
        }
        if (Array.isArray(output.content))
            parts.push(output.content.map(extractToolText).join("\n"));
        return parts.filter(Boolean).join("\n") || stringifyOutput(output);
    }
    return String(output ?? "");
}
function extractUrlFromObservation(text) {
    const raw = String(text || "");
    const quoted = raw.match(/["'](https?:\/\/[^"'\s]+)["']/i);
    if (quoted?.[1])
        return quoted[1];
    const bare = raw.match(/https?:\/\/[^\s"'<>]+/i);
    if (bare?.[0])
        return bare[0].replace(/[),.]+$/, "");
    const pathOnly = raw.match(/["'](\/[^"']*)["']/);
    return pathOnly?.[1] || "";
}
function evaluateActionResult(adapterName, action, toolOutput) {
    const text = extractToolText(toolOutput);
    if (/\b(Error:|TypeError|ReferenceError|SyntaxError|Evaluation failed|Evaluate failed)\b/i.test(text)) {
        return step("action", `${adapterName}:evaluate`, "failed", "", (0, utils_1.compactText)(text, 500) || "Evaluate reported a page-side error.");
    }
    const expected = String(action.expected ?? action.expect ?? "").trim();
    if (expected) {
        const normalized = text.trim();
        const matched = normalized === expected
            || normalized.includes(expected)
            || (/^true$/i.test(expected) && /\btrue\b/i.test(normalized) && !/\bfalse\b/i.test(normalized));
        if (!matched) {
            return step("action", `${adapterName}:evaluate`, "failed", expected, `Evaluate expected "${expected}", got "${(0, utils_1.compactText)(text, 300) || "(empty)"}".`);
        }
    }
    return step("action", `${adapterName}:evaluate`, "passed", expected || (0, utils_1.compactText)(text, 120));
}
function extractTabId(output) {
    if (output === undefined || output === null)
        return undefined;
    if (typeof output === "number" || typeof output === "string")
        return output;
    if (typeof output === "object") {
        for (const key of ["tabId", "tab_id", "id", "activeTabId"]) {
            if (typeof output[key] === "number" || typeof output[key] === "string")
                return output[key];
        }
        if (output.tab && (typeof output.tab.id === "number" || typeof output.tab.id === "string"))
            return output.tab.id;
    }
    return undefined;
}
function extractTabCount(output) {
    if (Array.isArray(output))
        return output.length;
    if (output && typeof output === "object") {
        for (const key of ["tabs", "pages", "openTabs", "open_tabs"]) {
            if (Array.isArray(output[key]))
                return output[key].length;
        }
    }
    const text = extractToolText(output).trim();
    if (!text)
        return undefined;
    try {
        const parsed = JSON.parse(text);
        if (parsed !== output)
            return extractTabCount(parsed);
    }
    catch { }
    const matches = text.match(/\btab(?:Id|_id)?\b/gi);
    return matches?.length || undefined;
}
function emptyLike(text) {
    return /^(\[\]|{}|null|undefined|"")$/i.test(text.trim());
}
function targetInput(action) {
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
function typedText(action) {
    return String(action.value ?? action.text ?? "");
}
function typedTextDetail(action) {
    const input = targetInput(action);
    return `${input.element || "focused control"}; text length=${typedText(action).length}`;
}
function pressKeyText(action, fallback = "Enter") {
    return String(action.key || action.value || action.text || fallback);
}
function isCookieAction(action) {
    return action.type === "setCookie" || action.type === "clearCookies";
}
function cookieActionName(action) {
    return String(action.key || "").trim();
}
function cookieActionNames(action) {
    const names = Array.isArray(action.keys) ? action.keys.map(name => String(name || "").trim()).filter(Boolean) : [];
    const single = cookieActionName(action);
    return names.length ? names : single ? [single] : [];
}
function cookieActionValue(action) {
    return String(action.value ?? action.text ?? action.content ?? "");
}
function cookieActionHasValue(action) {
    return action.value !== undefined || action.text !== undefined || action.content !== undefined;
}
function cookieActionPath(action) {
    return String(action.cookiePath || action.cookie_path || "/").trim() || "/";
}
function cookieActionSameSite(action) {
    const raw = String(action.sameSite || action.same_site || "").trim().toLowerCase();
    if (raw === "strict")
        return "Strict";
    if (raw === "lax")
        return "Lax";
    if (raw === "none")
        return "None";
    return "";
}
function cookieActionBoolean(value) {
    return value === undefined ? undefined : value === true || String(value).toLowerCase() === "true";
}
function cookieActionDetail(action) {
    const names = cookieActionNames(action);
    if (action.type === "clearCookies")
        return names.length ? `cookie count=${names.length}` : "all JS-visible cookies";
    return `cookie=${cookieActionName(action) || "(missing)"}; value length=${cookieActionValue(action).length}`;
}
function cookieActionScript(action) {
    if (cookieActionBoolean(action.httpOnly ?? action.http_only)) {
        throw new Error(`${action.type} with HttpOnly requires the Playwright provider.`);
    }
    const path = cookieActionPath(action);
    if (action.type === "setCookie") {
        const name = cookieActionName(action);
        if (!name)
            throw new Error("setCookie requires key/cookieName/name.");
        if (!cookieActionHasValue(action))
            throw new Error("setCookie requires value/text/content.");
        const value = cookieActionValue(action);
        const sameSite = cookieActionSameSite(action);
        const secure = cookieActionBoolean(action.secure);
        const expires = Number(action.expires);
        return `() => { const parts = [encodeURIComponent(${JSON.stringify(name)}) + "=" + encodeURIComponent(${JSON.stringify(value)}), "Path=" + ${JSON.stringify(path)}];${sameSite ? ` parts.push("SameSite=${sameSite}");` : ""}${secure ? ` parts.push("Secure");` : ""}${Number.isFinite(expires) ? ` parts.push("Expires=" + new Date(${expires} * 1000).toUTCString());` : ""} document.cookie = parts.join("; "); }`;
    }
    const names = cookieActionNames(action);
    return `() => { const names = ${JSON.stringify(names)}.length ? ${JSON.stringify(names)} : document.cookie.split(";").map(part => part.split("=")[0].trim()).filter(Boolean).map(decodeURIComponent); for (const name of names) { document.cookie = encodeURIComponent(name) + "=; Path=" + ${JSON.stringify(path)} + "; Expires=Thu, 01 Jan 1970 00:00:00 GMT"; } }`;
}
function isStorageAction(action) {
    return action.type === "setLocalStorage" || action.type === "setSessionStorage" || action.type === "clearStorage";
}
function isNetworkStateAction(action) {
    return action.type === "setOffline" || action.type === "setOnline";
}
function storageActionValue(action) {
    return String(action.value ?? action.text ?? action.content ?? "");
}
function storageActionHasValue(action) {
    return action.value !== undefined || action.text !== undefined || action.content !== undefined;
}
function storageActionKey(action) {
    return String(action.key || "").trim();
}
function storageActionKeys(action) {
    const keys = Array.isArray(action.keys) ? action.keys.map(key => String(key || "").trim()).filter(Boolean) : [];
    const single = storageActionKey(action);
    return keys.length ? keys : single ? [single] : [];
}
function storageActionArea(action) {
    if (action.type === "setLocalStorage")
        return "localStorage";
    if (action.type === "setSessionStorage")
        return "sessionStorage";
    const raw = String(action.storage || action.storageArea || action.storage_area || "").trim().toLowerCase();
    if (raw === "local" || raw === "localstorage" || raw === "local_storage")
        return "localStorage";
    if (raw === "session" || raw === "sessionstorage" || raw === "session_storage")
        return "sessionStorage";
    return "both";
}
function storageActionDetail(action) {
    const area = storageActionArea(action);
    const keys = storageActionKeys(action);
    if (action.type === "clearStorage")
        return `${area}; ${keys.length ? `key count=${keys.length}` : "clear all"}`;
    return `${area}; key=${storageActionKey(action) || "(missing)"}; value length=${storageActionValue(action).length}`;
}
function storageActionScript(action) {
    const area = storageActionArea(action);
    if (action.type === "setLocalStorage" || action.type === "setSessionStorage") {
        const key = storageActionKey(action);
        if (area === "both")
            throw new Error(`${action.type} requires a single storage area.`);
        if (!key)
            throw new Error(`${action.type} requires key/storageKey.`);
        if (!storageActionHasValue(action))
            throw new Error(`${action.type} requires value/text/content.`);
        const value = storageActionValue(action);
        return `() => { globalThis[${JSON.stringify(area)}].setItem(${JSON.stringify(key)}, ${JSON.stringify(value)}); }`;
    }
    const storageNames = area === "both" ? ["localStorage", "sessionStorage"] : [area];
    const keys = storageActionKeys(action);
    return `() => { for (const storageName of ${JSON.stringify(storageNames)}) { const storage = globalThis[storageName]; if (!storage) continue; if (${JSON.stringify(keys)}.length) { for (const key of ${JSON.stringify(keys)}) storage.removeItem(key); } else { storage.clear(); } } }`;
}
function step(kind, name, status, detail = "", error = "") {
    return { kind, name, status, detail, ...(error ? { error } : {}) };
}
function isCoordinate(value) {
    return Array.isArray(value)
        && value.length === 2
        && value.every(item => Number.isFinite(Number(item)));
}
function coordinateInput(action) {
    return isCoordinate(action.coordinate) ? { coordinate: [Number(action.coordinate[0]), Number(action.coordinate[1])] } : {};
}
function computerActionDetail(action) {
    const coordinate = isCoordinate(action.coordinate) ? `(${action.coordinate[0]},${action.coordinate[1]})` : "";
    return action.selector || action.text || action.value || action.url || coordinate;
}
function browserAddressShortcut() {
    return process.platform === "darwin" ? "command+l" : "ctrl+l";
}
function expectedUrlFragment(action) {
    return String(action.url || action.text || action.value || "").trim();
}
function assertionExpectedUrl(assertion) {
    return String(assertion.url || assertion.urlIncludes || assertion.url_includes || assertion.value || assertion.text || "").trim();
}
function comparableUrl(actualUrl, expected) {
    if (!expected.startsWith("/"))
        return actualUrl;
    try {
        const url = new URL(actualUrl);
        return `${url.pathname}${url.search}${url.hash}`;
    }
    catch {
        return actualUrl;
    }
}
function assertWithCurrentUrl(adapterName, currentUrl, assertion) {
    const expected = assertionExpectedUrl(assertion);
    if (!expected)
        return step("assertion", `${adapterName}:${assertion.type}`, "failed", "", `${assertion.type} requires url/text/value.`);
    const live = String(currentUrl || "").trim();
    if (!live) {
        return step("assertion", `${adapterName}:${assertion.type}`, "failed", expected, `Live URL observation is required for ${assertion.type} on ${adapterName}; cached/intended URL is not trusted.`);
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
async function assertWithLiveUrl(adapterName, assertion, readLiveUrl) {
    if (!readLiveUrl) {
        return assertWithCurrentUrl(adapterName, "", assertion);
    }
    let live = "";
    try {
        live = String(await readLiveUrl() || "").trim();
    }
    catch (error) {
        return step("assertion", `${adapterName}:${assertion.type}`, "failed", assertionExpectedUrl(assertion), `Failed to observe live URL: ${error?.message || String(error)}`);
    }
    return assertWithCurrentUrl(adapterName, live, assertion);
}
async function waitForMcpUrl(adapterName, currentUrl, action, defaultTimeout, readLiveUrl) {
    const expected = expectedUrlFragment(action);
    if (!expected)
        return step("action", `${adapterName}:waitForUrl`, "failed", "", "waitForUrl requires url/text/value.");
    if (!readLiveUrl) {
        return step("action", `${adapterName}:waitForUrl`, "failed", expected, `Live URL observation is required for waitForUrl on ${adapterName}; cached URL "${currentUrl || "(empty)"}" is not trusted. Use Playwright.`);
    }
    const deadline = Date.now() + Math.max(1, Number(action.timeoutMs || action.timeout_ms || defaultTimeout || 1000));
    let lastUrl = "";
    while (Date.now() < deadline) {
        try {
            const live = String(await readLiveUrl() || "").trim();
            if (live)
                lastUrl = live;
            if (live && live.includes(expected))
                return step("action", `${adapterName}:waitForUrl`, "passed", expected);
        }
        catch {
            // keep polling until deadline; fail-closed below
        }
        await new Promise(resolve => setTimeout(resolve, 250));
    }
    return step("action", `${adapterName}:waitForUrl`, "failed", expected, `Expected URL to include "${expected}", got "${lastUrl || "(unobserved)"}".`);
}
function normalizeComputerUseApps(apps) {
    if (!Array.isArray(apps))
        return undefined;
    return apps
        .map(app => ({
        displayName: app.displayName,
        bundle_id: app.bundle_id || app.bundleId,
    }))
        .filter(app => app.displayName || app.bundle_id);
}
function normalizeVisibleText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
}
function textOrderExpectedTexts(assertion) {
    for (const value of [assertion.expectedTexts, assertion.expected_texts, assertion.texts, assertion.values]) {
        if (!Array.isArray(value))
            continue;
        const texts = value.map(item => normalizeVisibleText(String(item ?? ""))).filter(Boolean);
        if (texts.length)
            return texts;
    }
    return [];
}
function assertTextOrderFromPageText(adapterName, assertion, pageText) {
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
async function assertWithText(adapterName, assertion, signals, defaultTimeout = 1000) {
    const expected = String(assertion.text || assertion.value || "");
    if (assertion.type === "consoleNoErrors") {
        const consoleErrors = signals.consoleErrors.length ? signals.consoleErrors : (0, console_assertions_1.filterBrowserConsoleErrorLines)(signals.consoleMessages || []);
        return consoleErrors.length
            ? step("assertion", `${adapterName}:consoleNoErrors`, "failed", "", consoleErrors.slice(0, 3).join(" | "))
            : step("assertion", `${adapterName}:consoleNoErrors`, "passed");
    }
    if (assertion.type === "consoleIncludes" || assertion.type === "consoleNotIncludes" || assertion.type === "consoleNoWarnings") {
        const consoleMessages = (0, console_assertions_1.normalizeBrowserConsoleLines)([...(signals.consoleMessages || []), ...signals.consoleErrors.map(item => `error: ${item}`)]);
        if (!(0, console_assertions_1.browserConsoleAssertionHasExpectation)(assertion)) {
            return step("assertion", `${adapterName}:${assertion.type}`, "failed", "", `${assertion.type} requires text/value/message/messageIncludes.`);
        }
        const detail = (0, console_assertions_1.browserConsoleAssertionDetail)(assertion);
        if ((0, console_assertions_1.browserConsoleAssertionIsNegative)(assertion)) {
            const matched = await (0, console_assertions_1.waitForAbsentBrowserConsoleLine)(consoleMessages, assertion, (0, console_assertions_1.browserConsoleAssertionSettleMs)(assertion, defaultTimeout));
            return matched
                ? step("assertion", `${adapterName}:${assertion.type}`, "failed", detail, `Unexpected console telemetry matched ${detail}: ${matched}`)
                : step("assertion", `${adapterName}:${assertion.type}`, "passed", detail);
        }
        const matched = await (0, console_assertions_1.waitForBrowserConsoleLine)(consoleMessages, assertion, defaultTimeout);
        return matched
            ? step("assertion", `${adapterName}:${assertion.type}`, "passed", detail)
            : step("assertion", `${adapterName}:${assertion.type}`, "failed", detail, `Expected console telemetry to match ${detail}.`);
    }
    if (assertion.type === "networkNoErrors") {
        return signals.networkErrors.length
            ? step("assertion", `${adapterName}:networkNoErrors`, "failed", "", signals.networkErrors.slice(0, 3).join(" | "))
            : step("assertion", `${adapterName}:networkNoErrors`, "passed");
    }
    if (assertion.type === "networkRequestIncludes"
        || assertion.type === "networkResponseIncludes"
        || assertion.type === "networkRequest"
        || assertion.type === "networkResponse"
        || assertion.type === "networkRequestNotIncludes"
        || assertion.type === "networkResponseNotIncludes"
        || assertion.type === "networkRequestNot"
        || assertion.type === "networkResponseNot") {
        if (!(0, network_assertions_1.browserNetworkAssertionHasExpectation)(assertion))
            return step("assertion", `${adapterName}:${assertion.type}`, "failed", "", `${assertion.type} requires text/value or structured network fields.`);
        const requests = signals.networkRequests || [];
        const detail = (0, network_assertions_1.browserNetworkAssertionDetail)(assertion);
        const matched = (0, network_assertions_1.findMatchingBrowserNetworkLine)(requests, assertion);
        if ((0, network_assertions_1.browserNetworkAssertionIsNegative)(assertion)) {
            return matched
                ? step("assertion", `${adapterName}:${assertion.type}`, "failed", detail, `Unexpected network telemetry matched ${detail || assertion.type}: ${matched}`)
                : step("assertion", `${adapterName}:${assertion.type}`, "passed", detail);
        }
        return matched
            ? step("assertion", `${adapterName}:${assertion.type}`, "passed", detail)
            : step("assertion", `${adapterName}:${assertion.type}`, "failed", detail, `Expected network telemetry to match ${detail || assertion.type}.`);
    }
    if (assertion.type === "text" || assertion.type === "elementTextIncludes") {
        if (!expected)
            return step("assertion", `${adapterName}:${assertion.type}`, "failed", "", "Missing expected text.");
        return signals.pageText.includes(expected)
            ? step("assertion", `${adapterName}:${assertion.type}`, "passed", expected)
            : step("assertion", `${adapterName}:${assertion.type}`, "failed", expected, `Expected page text to include "${expected}".`);
    }
    if (assertion.type === "ariaSnapshotIncludes") {
        const snapshotText = String(assertion.snapshotIncludes || assertion.snapshot_includes || assertion.text || assertion.value || "");
        if (!snapshotText)
            return step("assertion", `${adapterName}:ariaSnapshotIncludes`, "failed", "", "ariaSnapshotIncludes requires text/value/snapshotIncludes.");
        return signals.pageText.includes(snapshotText)
            ? step("assertion", `${adapterName}:ariaSnapshotIncludes`, "passed", `expected substring length=${snapshotText.length}`)
            : step("assertion", `${adapterName}:ariaSnapshotIncludes`, "failed", `expected substring length=${snapshotText.length}`, "Expected MCP page snapshot to include requested ARIA text.");
    }
    if (assertion.type === "accessibleNameEquals"
        || assertion.type === "accessibleNameIncludes"
        || assertion.type === "accessibleDescriptionEquals"
        || assertion.type === "accessibleDescriptionIncludes") {
        return step("assertion", `${adapterName}:${assertion.type}`, "failed", "", `MCP ${adapterName} cannot compute precise accessible name/description from TestAgent; use Playwright for this assertion.`);
    }
    if ((0, aria_state_assertions_1.isBrowserAriaStateAssertion)(assertion)) {
        return step("assertion", `${adapterName}:${assertion.type}`, "failed", (0, semantic_locator_1.browserTargetDetail)(assertion), `MCP ${adapterName} cannot verify ARIA DOM state attributes from TestAgent; use Playwright for this assertion.`);
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
        return step("assertion", `${adapterName}:inViewport`, "failed", (0, semantic_locator_1.browserTargetDetail)(assertion), `MCP ${adapterName} cannot verify viewport position without DOM layout metrics; use Playwright for this assertion.`);
    }
    if (assertion.type === "elementScreenshotNotBlank") {
        return step("assertion", `${adapterName}:elementScreenshotNotBlank`, "failed", (0, semantic_locator_1.browserTargetDetail)(assertion), `MCP ${adapterName} cannot verify element-level screenshot pixels from TestAgent; use Playwright for this assertion.`);
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
        if (!expectedVisible)
            return step("assertion", `${adapterName}:visible`, "failed", "", "MCP visible assertion needs selector/text/value.");
        return signals.pageText.includes(expectedVisible)
            ? step("assertion", `${adapterName}:visible`, "passed", expectedVisible)
            : step("assertion", `${adapterName}:visible`, "failed", expectedVisible, `Could not verify visible target "${expectedVisible}" from page text.`);
    }
    if (assertion.type === "notVisible") {
        const expectedHidden = String(assertion.text || assertion.value || assertion.selector || "");
        if (!expectedHidden)
            return step("assertion", `${adapterName}:notVisible`, "failed", "", "MCP notVisible assertion needs selector/text/value.");
        return !signals.pageText.includes(expectedHidden)
            ? step("assertion", `${adapterName}:notVisible`, "passed", expectedHidden)
            : step("assertion", `${adapterName}:notVisible`, "failed", expectedHidden, `Target "${expectedHidden}" is still present in page text.`);
    }
    if (assertion.type === "present" || assertion.type === "notPresent") {
        const expectedText = String(assertion.text || assertion.value || assertion.name || "").trim();
        if (!expectedText) {
            return step("assertion", `${adapterName}:${assertion.type}`, "failed", (0, semantic_locator_1.browserTargetDetail)(assertion), `MCP ${adapterName} cannot verify selector-only DOM presence without DOM access; use Playwright for this assertion.`);
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
    if (assertion.type === "selectedValue"
        || assertion.type === "selectedTextIncludes"
        || assertion.type === "inputValueEquals"
        || assertion.type === "inputValueIncludes"
        || assertion.type === "attributeEquals"
        || assertion.type === "attributeIncludes"
        || assertion.type === "computedStyleEquals"
        || assertion.type === "computedStyleIncludes"
        || assertion.type === "elementCountEquals"
        || assertion.type === "elementCountAtLeast"
        || assertion.type === "elementCountAtMost") {
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
        if (!expected)
            return step("assertion", `${adapterName}:${assertion.type}`, "failed", "", `${assertion.type} requires text/value/title.`);
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
//# sourceMappingURL=mcp-adapters-part-01.js.map