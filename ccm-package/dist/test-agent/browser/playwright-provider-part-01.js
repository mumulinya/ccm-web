"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.delay = delay;
exports.redactBrowserStepResult = redactBrowserStepResult;
exports.capturePlaywrightActionEffectObservation = capturePlaywrightActionEffectObservation;
exports.launchChromiumWithFallback = launchChromiumWithFallback;
exports.checkPlaywrightAvailability = checkPlaywrightAvailability;
exports.expectedValue = expectedValue;
exports.valuesEqual = valuesEqual;
exports.cookieName = cookieName;
exports.cookieAssertionDetail = cookieAssertionDetail;
exports.inputValueAssertionDetail = inputValueAssertionDetail;
exports.attributeName = attributeName;
exports.attributeAssertionDetail = attributeAssertionDetail;
exports.computedStyleAssertionDetail = computedStyleAssertionDetail;
exports.clipboardExpectedText = clipboardExpectedText;
exports.clipboardAssertionDetail = clipboardAssertionDetail;
exports.optionalTableIndex = optionalTableIndex;
exports.tableExpectedTexts = tableExpectedTexts;
exports.textOrderExpectedTexts = textOrderExpectedTexts;
exports.tableRowText = tableRowText;
exports.tableColumnName = tableColumnName;
exports.tableAssertionDetail = tableAssertionDetail;
exports.optionalVisualNumber = optionalVisualNumber;
exports.visualAssertionDetail = visualAssertionDetail;
exports.textOrderAssertionDetail = textOrderAssertionDetail;
exports.urlAssertionExpected = urlAssertionExpected;
exports.comparableUrl = comparableUrl;
exports.titleAssertionExpected = titleAssertionExpected;
exports.expectedOnlineState = expectedOnlineState;
exports.waitForTitleMatch = waitForTitleMatch;
exports.waitForOnlineState = waitForOnlineState;
exports.stateAssertionDetail = stateAssertionDetail;
exports.capturePageFinalState = capturePageFinalState;
exports.evaluatePageNotBlank = evaluatePageNotBlank;
exports.evaluateNoHorizontalOverflow = evaluateNoHorizontalOverflow;
exports.evaluateElementInViewport = evaluateElementInViewport;
exports.readBrowserCookie = readBrowserCookie;
exports.waitForComputedStyle = waitForComputedStyle;
exports.waitForFocusedState = waitForFocusedState;
exports.waitForElementCount = waitForElementCount;
exports.waitForBrowserDialog = waitForBrowserDialog;
exports.browserPopupLogLine = browserPopupLogLine;
exports.captureBrowserPopup = captureBrowserPopup;
exports.waitForBrowserPopup = waitForBrowserPopup;
exports.writeClipboardText = writeClipboardText;
exports.waitForClipboardText = waitForClipboardText;
exports.pngChannelCount = pngChannelCount;
exports.pngPaeth = pngPaeth;
const utils_1 = require("../utils");
const semantic_locator_1 = require("./semantic-locator");
const authentication_1 = require("./authentication");
const network_assertions_1 = require("./network-assertions");
const console_assertions_1 = require("./console-assertions");
const accessibility_assertions_1 = require("./accessibility-assertions");
const aria_state_assertions_1 = require("./aria-state-assertions");
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
function downloadedFileDetail(assertion) {
    return require("./playwright-provider-part-02").downloadedFileDetail(assertion);
}
function redactBrowserStepResult(step, secretBindings) {
    if (!secretBindings.length)
        return step;
    return {
        ...step,
        ...(step.detail ? { detail: (0, authentication_1.redactBrowserSensitiveText)(step.detail, secretBindings) } : {}),
        ...(step.error ? { error: (0, authentication_1.redactBrowserSensitiveText)(step.error, secretBindings) } : {}),
    };
}
async function capturePlaywrightActionEffectObservation(page, signals) {
    const documentState = await page.evaluate(() => {
        const documentRef = globalThis.document;
        const controls = Array.from(documentRef.querySelectorAll("input, textarea, select")).map((element) => ({
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
function cookieName(assertion) {
    return String(assertion.key || assertion.name || assertion.text || assertion.value || "").trim();
}
function cookieAssertionDetail(assertion) {
    const name = cookieName(assertion);
    const expected = assertion.type === "cookieValueIncludes" || assertion.type === "cookieValueEquals" ? String(assertion.value ?? assertion.text ?? "") : "";
    const expectation = assertion.type === "cookieValueEquals" ? "expected length" : "expected substring length";
    return `cookie=${name || "(missing)"}${expected ? `; ${expectation}=${expected.length}` : ""}`;
}
function inputValueAssertionDetail(assertion) {
    const expected = String(assertion.value ?? assertion.text ?? "");
    const expectation = assertion.type === "inputValueIncludes" ? "expected substring length" : "expected length";
    return `${(0, semantic_locator_1.browserTargetDetail)(assertion)}${expected ? `; ${expectation}=${expected.length}` : ""}`;
}
function attributeName(assertion) {
    return String(assertion.attribute || assertion.attributeName || assertion.attribute_name || assertion.key || "").trim();
}
function attributeAssertionDetail(assertion) {
    const expected = String(assertion.value ?? assertion.text ?? "");
    const expectation = assertion.type === "attributeIncludes" ? "expected substring length" : "expected length";
    const name = attributeName(assertion);
    return `${(0, semantic_locator_1.browserTargetDetail)(assertion)}; attribute=${name || "(missing)"}${expected ? `; ${expectation}=${expected.length}` : ""}`;
}
function computedStylePropertyName(assertion) {
    const raw = String(assertion.property || assertion.cssProperty || assertion.css_property || assertion.styleProperty || assertion.style_property || assertion.attribute || assertion.key || "").trim();
    if (!raw || raw.startsWith("--"))
        return raw;
    return raw.replace(/[A-Z]/g, match => `-${match.toLowerCase()}`).replace(/^ms-/, "-ms-").toLowerCase();
}
function computedStyleExpected(assertion) {
    const hasExpected = assertion.value !== undefined || assertion.text !== undefined;
    return {
        hasExpected,
        value: String(assertion.value ?? assertion.text ?? ""),
    };
}
function computedStyleAssertionDetail(assertion) {
    const expected = computedStyleExpected(assertion);
    const expectation = assertion.type === "computedStyleIncludes" ? "expected substring length" : "expected length";
    return `${(0, semantic_locator_1.browserTargetDetail)(assertion)}; property=${computedStylePropertyName(assertion) || "(missing)"}${expected.hasExpected ? `; ${expectation}=${expected.value.length}` : ""}`;
}
function optionalCountValue(value) {
    if (value === undefined || value === null || value === "")
        return undefined;
    const count = Number(value);
    return Number.isFinite(count) ? count : undefined;
}
function elementCountExpected(assertion) {
    if (assertion.type === "elementCountAtLeast") {
        return optionalCountValue(assertion.minCount ?? assertion.min_count ?? assertion.count ?? assertion.value ?? assertion.text);
    }
    if (assertion.type === "elementCountAtMost") {
        return optionalCountValue(assertion.maxCount ?? assertion.max_count ?? assertion.count ?? assertion.value ?? assertion.text);
    }
    return optionalCountValue(assertion.count ?? assertion.expectedCount ?? assertion.expected_count ?? assertion.value ?? assertion.text);
}
function elementCountAssertionDetail(assertion) {
    const expected = elementCountExpected(assertion);
    const comparator = assertion.type === "elementCountAtLeast"
        ? "min count"
        : assertion.type === "elementCountAtMost"
            ? "max count"
            : "expected count";
    return `${(0, semantic_locator_1.browserTargetDetail)(assertion)}; ${comparator}=${expected === undefined ? "(missing)" : expected}`;
}
function dialogExpectedType(assertion) {
    const raw = assertion.dialogType || assertion.dialog_type || (assertion.type === "dialogTypeEquals" ? assertion.value ?? assertion.text : "");
    return String(raw || "").trim().toLowerCase();
}
function dialogExpectedMessage(assertion) {
    const raw = assertion.type === "dialogTypeEquals"
        ? assertion.messageIncludes || assertion.message_includes || assertion.message || ""
        : assertion.messageIncludes || assertion.message_includes || assertion.message || assertion.value || assertion.text || "";
    return String(raw || "").trim();
}
function dialogAssertionDetail(assertion) {
    const expectedType = dialogExpectedType(assertion);
    const expectedMessage = dialogExpectedMessage(assertion);
    const parts = [
        expectedType ? `dialogType=${expectedType}` : "",
        expectedMessage ? `message substring length=${expectedMessage.length}` : "",
    ].filter(Boolean);
    return parts.join("; ") || "any browser dialog";
}
function popupExpectedUrl(assertion) {
    return String(assertion.urlIncludes || assertion.url_includes || assertion.url || assertion.value || assertion.text || "").trim();
}
function popupExpectedText(assertion) {
    return String(assertion.value || assertion.text || "").trim();
}
function popupExpectedTitle(assertion) {
    return String(assertion.title || assertion.value || assertion.text || "").trim();
}
function popupIndex(assertion) {
    const value = assertion.popupIndex ?? assertion.popup_index;
    if (value === undefined || value === null)
        return undefined;
    if (String(value).trim() === "")
        return undefined;
    const index = Number(value);
    return Number.isInteger(index) && index >= 0 ? index : undefined;
}
function popupAssertionDetail(assertion) {
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
function clipboardExpectedText(assertion) {
    return String(assertion.value ?? assertion.text ?? "");
}
function clipboardAssertionDetail(assertion) {
    const expected = clipboardExpectedText(assertion);
    const expectation = assertion.type === "clipboardTextIncludes" ? "expected substring length" : "expected length";
    return expected ? `${expectation}=${expected.length}` : "clipboard text";
}
function firstNonEmptyStringList(...values) {
    for (const value of values) {
        if (Array.isArray(value)) {
            const list = value.map(item => String(item ?? "").trim()).filter(Boolean);
            if (list.length)
                return list;
            continue;
        }
        const text = String(value ?? "").trim();
        if (text)
            return [text];
    }
    return [];
}
function optionalTableIndex(...values) {
    for (const value of values) {
        if (value === undefined || value === null || value === "")
            continue;
        const index = Number(value);
        if (Number.isInteger(index) && index >= 0)
            return index;
    }
    return undefined;
}
function tableExpectedTexts(assertion) {
    return firstNonEmptyStringList(assertion.expectedTexts, assertion.expected_texts, assertion.texts, assertion.values, assertion.value, assertion.text);
}
function textOrderExpectedTexts(assertion) {
    return firstNonEmptyStringList(assertion.expectedTexts, assertion.expected_texts, assertion.texts, assertion.values);
}
function tableRowText(assertion) {
    return String(assertion.rowText || assertion.row_text || "").trim();
}
function tableColumnName(assertion) {
    return String(assertion.columnName || assertion.column_name || assertion.columnHeader || assertion.column_header || "").trim();
}
function tableAssertionDetail(assertion) {
    const expectedTexts = tableExpectedTexts(assertion);
    const rowText = tableRowText(assertion);
    const rowIndex = optionalTableIndex(assertion.rowIndex, assertion.row_index);
    const rowNumber = optionalTableIndex(assertion.rowNumber, assertion.row_number);
    const columnName = tableColumnName(assertion);
    const columnIndex = optionalTableIndex(assertion.columnIndex, assertion.column_index);
    const columnNumber = optionalTableIndex(assertion.columnNumber, assertion.column_number);
    const target = String(assertion.tableSelector
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
        || "first table").trim();
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
function optionalVisualNumber(value) {
    if (value === undefined || value === null || value === "")
        return undefined;
    const number = Number(value);
    return Number.isFinite(number) ? number : undefined;
}
function visualAssertionDetail(assertion) {
    const minUniqueColors = optionalVisualNumber(assertion.minUniqueColors ?? assertion.min_unique_colors);
    const minNonWhitePixels = optionalVisualNumber(assertion.minNonWhitePixels ?? assertion.min_non_white_pixels) ?? 1;
    return `${(0, semantic_locator_1.browserTargetDetail)(assertion)}; minNonWhitePixels=${minNonWhitePixels}${minUniqueColors ? `; minUniqueColors=${minUniqueColors}` : ""}`;
}
function textOrderAssertionDetail(assertion) {
    const expected = textOrderExpectedTexts(assertion);
    const target = String(assertion.selector
        || assertion.locator
        || assertion.testId
        || assertion.test_id
        || assertion.dataTestId
        || assertion.data_testid
        || (assertion.role ? `role=${assertion.role}${assertion.name ? `; name=${assertion.name}` : ""}` : "")
        || "body").trim();
    return `${target}; expected text count=${expected.length}`;
}
function urlAssertionExpected(assertion) {
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
function titleAssertionExpected(assertion) {
    return String(assertion.value || assertion.text || assertion.title || "").trim();
}
function urlTitleAssertionDetail(assertion) {
    if (assertion.type.startsWith("url"))
        return `expected=${urlAssertionExpected(assertion) || "(missing)"}`;
    return `expected=${titleAssertionExpected(assertion) || "(missing)"}`;
}
function expectedOnlineState(assertion) {
    if (assertion.type === "browserOnline")
        return true;
    if (assertion.type === "browserOffline")
        return false;
    const raw = String(assertion.value
        ?? assertion.text
        ?? assertion.state
        ?? assertion.status
        ?? "").trim().toLowerCase();
    if (["online", "true", "connected", "up"].includes(raw))
        return true;
    if (["offline", "false", "disconnected", "down"].includes(raw))
        return false;
    return undefined;
}
function onlineStateAssertionDetail(assertion) {
    const expected = expectedOnlineState(assertion);
    return expected === undefined ? "navigator.onLine expected state=(missing)" : `navigator.onLine expected=${expected ? "online" : "offline"}`;
}
async function waitForTitleMatch(page, predicate, timeout) {
    const deadline = Date.now() + Math.max(1, timeout);
    let title = "";
    while (Date.now() <= deadline) {
        title = await page.title();
        if (predicate(title))
            return title;
        await delay(100);
    }
    return await page.title().catch(() => title);
}
async function waitForOnlineState(page, expected, timeout) {
    const deadline = Date.now() + Math.max(1, timeout);
    let actual = true;
    while (Date.now() <= deadline) {
        actual = await page.evaluate("navigator.onLine === true").catch(() => true);
        if (actual === expected)
            return actual;
        await delay(100);
    }
    return await page.evaluate("navigator.onLine === true").catch(() => actual);
}
function stateAssertionDetail(assertion) {
    if (assertion.type === "pageNotBlank")
        return "visible user-facing page content";
    if (assertion.type === "noHorizontalOverflow")
        return "document has no horizontal overflow";
    if (assertion.type === "inViewport")
        return `${(0, semantic_locator_1.browserTargetDetail)(assertion)} within viewport`;
    if (assertion.type === "present" || assertion.type === "notPresent")
        return `${(0, semantic_locator_1.browserTargetDetail)(assertion)} DOM ${assertion.type === "present" ? "present" : "absent"}`;
    if (assertion.type === "urlEquals" || assertion.type === "urlIncludes" || assertion.type === "urlNotIncludes" || assertion.type === "titleEquals" || assertion.type === "titleIncludes" || assertion.type === "titleNotIncludes")
        return urlTitleAssertionDetail(assertion);
    if (assertion.type === "onlineState" || assertion.type === "browserOnline" || assertion.type === "browserOffline")
        return onlineStateAssertionDetail(assertion);
    if (assertion.type === "accessibleNameEquals"
        || assertion.type === "accessibleNameIncludes"
        || assertion.type === "accessibleDescriptionEquals"
        || assertion.type === "accessibleDescriptionIncludes"
        || assertion.type === "ariaSnapshotIncludes")
        return (0, accessibility_assertions_1.browserAccessibilityAssertionDetail)(assertion);
    if ((0, aria_state_assertions_1.isBrowserAriaStateAssertion)(assertion))
        return (0, aria_state_assertions_1.browserAriaStateAssertionDetail)(assertion);
    if (assertion.type === "focused" || assertion.type === "notFocused")
        return (0, semantic_locator_1.browserTargetDetail)(assertion);
    if (assertion.type === "enabled" || assertion.type === "disabled")
        return (0, semantic_locator_1.browserTargetDetail)(assertion);
    if (assertion.type === "cookieExists" || assertion.type === "cookieValueIncludes")
        return cookieAssertionDetail(assertion);
    if (assertion.type === "inputValueEquals" || assertion.type === "inputValueIncludes")
        return inputValueAssertionDetail(assertion);
    if (assertion.type === "attributeEquals" || assertion.type === "attributeIncludes")
        return attributeAssertionDetail(assertion);
    if (assertion.type === "computedStyleEquals" || assertion.type === "computedStyleIncludes")
        return computedStyleAssertionDetail(assertion);
    if (assertion.type === "elementCountEquals" || assertion.type === "elementCountAtLeast" || assertion.type === "elementCountAtMost")
        return elementCountAssertionDetail(assertion);
    if (assertion.type === "dialogAppeared" || assertion.type === "dialogMessageIncludes" || assertion.type === "dialogTypeEquals")
        return dialogAssertionDetail(assertion);
    if (assertion.type === "popupOpened" || assertion.type === "popupUrlIncludes" || assertion.type === "popupTextIncludes" || assertion.type === "popupTitleIncludes")
        return popupAssertionDetail(assertion);
    if (assertion.type === "tableRowIncludes" || assertion.type === "tableCellTextIncludes" || assertion.type === "tableCellTextEquals")
        return tableAssertionDetail(assertion);
    if (assertion.type === "clipboardTextEquals" || assertion.type === "clipboardTextIncludes")
        return clipboardAssertionDetail(assertion);
    if (assertion.type === "elementScreenshotNotBlank")
        return visualAssertionDetail(assertion);
    if (assertion.type === "textOrder")
        return textOrderAssertionDetail(assertion);
    if (assertion.type === "downloadedFile")
        return downloadedFileDetail(assertion);
    if (assertion.type === "consoleIncludes" || assertion.type === "consoleNotIncludes" || assertion.type === "consoleNoWarnings")
        return (0, console_assertions_1.browserConsoleAssertionDetail)(assertion);
    if (assertion.type === "selectedValue" || assertion.type === "selectedTextIncludes") {
        const target = (0, semantic_locator_1.browserTargetDetail)(assertion);
        const expected = String(assertion.value ?? assertion.text ?? "");
        return `${target}${target ? "; " : ""}expected=${expected}`;
    }
    if (assertion.type === "networkRequest"
        || assertion.type === "networkResponse"
        || assertion.type === "networkRequestNot"
        || assertion.type === "networkResponseNot")
        return (0, network_assertions_1.browserNetworkAssertionDetail)(assertion);
    if (assertion.expression)
        return `expression=${assertion.expression}`;
    if (assertion.key)
        return `key=${assertion.key}`;
    return (0, semantic_locator_1.browserTargetDetail)(assertion) || assertion.value || assertion.text || "";
}
async function capturePageFinalState(page, secretBindings = []) {
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
        ...(title ? { title: (0, utils_1.compactText)((0, authentication_1.redactBrowserSensitiveText)(title, secretBindings), 500) } : {}),
        ...(pageText ? { pageTextPreview: (0, utils_1.compactText)((0, authentication_1.redactBrowserSensitiveText)(pageText, secretBindings), 2000) } : {}),
    };
}
async function evaluatePageNotBlank(page) {
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
async function evaluateNoHorizontalOverflow(page, expectedViewportWidth = 0) {
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
async function evaluateElementInViewport(locator, expectedViewportWidth = 0, expectedViewportHeight = 0) {
    return await locator.evaluate((element, expected) => {
        const win = globalThis;
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
async function readBrowserCookie(page, assertion) {
    const name = cookieName(assertion);
    if (!name)
        throw new Error(`${assertion.type} requires key/name/text/value as the cookie name.`);
    const cookies = await page.context().cookies(page.url());
    return cookies.find((cookie) => cookie && cookie.name === name);
}
async function waitForComputedStyle(page, assertion, timeout) {
    const property = computedStylePropertyName(assertion);
    const expected = computedStyleExpected(assertion);
    if (!property)
        throw new Error(`${assertion.type} requires property/cssProperty/styleProperty/key.`);
    if (!expected.hasExpected)
        throw new Error(`${assertion.type} requires value/text.`);
    if (assertion.type === "computedStyleIncludes" && !expected.value)
        throw new Error("computedStyleIncludes requires value/text as the expected substring.");
    const locator = (0, semantic_locator_1.resolvePlaywrightLocator)(page, assertion).first();
    await locator.waitFor({ state: "attached", timeout });
    const deadline = Date.now() + Math.max(1, timeout);
    let actual = "";
    while (Date.now() <= deadline) {
        actual = await locator.evaluate((element, cssProperty) => {
            return String(globalThis.getComputedStyle(element).getPropertyValue(cssProperty) || "").trim();
        }, property);
        const passed = assertion.type === "computedStyleEquals" ? actual === expected.value : actual.includes(expected.value);
        if (passed)
            return { passed: true, actualLength: actual.length, expectedLength: expected.value.length };
        await delay(100);
    }
    return { passed: false, actualLength: actual.length, expectedLength: expected.value.length };
}
async function waitForFocusedState(locator, expectedFocused, timeout) {
    const deadline = Date.now() + Math.max(1, timeout);
    let lastFocused = false;
    await locator.waitFor({ state: "attached", timeout });
    while (Date.now() <= deadline) {
        lastFocused = await locator.evaluate((element) => {
            return element === globalThis.document?.activeElement;
        }).catch(() => false);
        if (lastFocused === expectedFocused)
            return { focused: lastFocused };
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    return { focused: lastFocused };
}
async function waitForElementCount(locator, assertion, timeout) {
    const expected = elementCountExpected(assertion);
    if (expected === undefined)
        throw new Error(`${assertion.type} requires count/expectedCount/minCount/value/text.`);
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
function browserDialogMatch(record, assertion) {
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
async function waitForBrowserDialog(signals, assertion, timeout) {
    const deadline = Date.now() + Math.max(1, timeout);
    let lastReasons = [];
    while (Date.now() <= deadline) {
        lastReasons = signals.dialogs.map(record => `${record.type || "(dialog)"}: ${browserDialogMatch(record, assertion).reason || "matched"}`);
        const matched = signals.dialogs.find(record => browserDialogMatch(record, assertion).ok);
        if (matched)
            return matched;
        await delay(100);
    }
    const observed = lastReasons.length ? ` Observed dialogs: ${lastReasons.join(" | ")}.` : " No browser dialogs observed.";
    throw new Error(`Expected browser dialog matching ${dialogAssertionDetail(assertion)}.${observed}`);
}
function browserPopupLogLine(record) {
    const parts = [
        `popup url=${record.url || "(unknown)"}`,
        record.title ? `title=${record.title}` : "",
        record.textPreview ? `text=${record.textPreview}` : "",
        record.error ? `error=${record.error}` : "",
    ].filter(Boolean);
    return parts.join("; ");
}
async function captureBrowserPopup(popup, secretBindings = []) {
    const record = {
        url: "",
        title: "",
        textPreview: "",
        openedAt: (0, utils_1.nowIso)(),
    };
    try {
        await popup.waitForLoadState?.("domcontentloaded", { timeout: 5_000 });
    }
    catch { }
    try {
        record.url = String(popup.url?.() || "");
    }
    catch { }
    try {
        record.title = (0, utils_1.compactText)((0, authentication_1.redactBrowserSensitiveText)(String(await popup.title?.() || ""), secretBindings), 500);
    }
    catch { }
    try {
        const body = popup.locator?.("body");
        record.textPreview = body ? (0, utils_1.compactText)((0, authentication_1.redactBrowserSensitiveText)(String(await body.innerText({ timeout: 1_000 }) || ""), secretBindings), 2000) : "";
    }
    catch (error) {
        record.error = (0, authentication_1.redactBrowserSensitiveText)(error.message || String(error), secretBindings);
    }
    return record;
}
function browserPopupMatch(record, assertion) {
    if (assertion.type === "popupOpened")
        return true;
    if (assertion.type === "popupUrlIncludes") {
        const expected = popupExpectedUrl(assertion);
        if (!expected)
            throw new Error("popupUrlIncludes requires url/urlIncludes/text/value.");
        return record.url.includes(expected);
    }
    if (assertion.type === "popupTextIncludes") {
        const expected = popupExpectedText(assertion);
        if (!expected)
            throw new Error("popupTextIncludes requires text/value.");
        return record.textPreview.includes(expected);
    }
    if (assertion.type === "popupTitleIncludes") {
        const expected = popupExpectedTitle(assertion);
        if (!expected)
            throw new Error("popupTitleIncludes requires title/text/value.");
        return record.title.includes(expected);
    }
    return false;
}
async function waitForBrowserPopup(signals, assertion, timeout) {
    const deadline = Date.now() + Math.max(1, timeout);
    const index = popupIndex(assertion);
    while (Date.now() <= deadline) {
        const candidates = index === undefined ? signals.popups : signals.popups[index] ? [signals.popups[index]] : [];
        for (const popup of candidates) {
            if (browserPopupMatch(popup, assertion))
                return popup;
        }
        await delay(100);
    }
    throw new Error(`Expected browser popup matching ${popupAssertionDetail(assertion)}. Observed popups: ${signals.popups.length}.`);
}
async function readClipboardText(page) {
    return await page.evaluate(async () => {
        const clipboard = globalThis.navigator?.clipboard;
        if (!clipboard?.readText)
            throw new Error("navigator.clipboard.readText is unavailable.");
        return String(await clipboard.readText());
    });
}
async function writeClipboardText(page, value) {
    await page.evaluate(async (text) => {
        const clipboard = globalThis.navigator?.clipboard;
        if (!clipboard?.writeText)
            throw new Error("navigator.clipboard.writeText is unavailable.");
        await clipboard.writeText(text);
    }, value);
}
async function waitForClipboardText(page, assertion, timeout) {
    const expected = clipboardExpectedText(assertion);
    if (!expected && assertion.type === "clipboardTextIncludes")
        throw new Error("clipboardTextIncludes requires value/text as the expected substring.");
    if (assertion.type === "clipboardTextEquals" && assertion.value === undefined && assertion.text === undefined)
        throw new Error("clipboardTextEquals requires value/text.");
    const deadline = Date.now() + Math.max(1, timeout);
    let actual = "";
    while (Date.now() <= deadline) {
        actual = await readClipboardText(page);
        const passed = assertion.type === "clipboardTextEquals" ? actual === expected : actual.includes(expected);
        if (passed)
            return { passed: true, actualLength: actual.length, expectedLength: expected.length };
        await delay(100);
    }
    actual = await readClipboardText(page).catch(() => actual);
    return { passed: false, actualLength: String(actual || "").length, expectedLength: expected.length };
}
function pngChannelCount(colorType) {
    if (colorType === 0)
        return 1;
    if (colorType === 2)
        return 3;
    if (colorType === 4)
        return 2;
    if (colorType === 6)
        return 4;
    return 0;
}
function pngPaeth(left, up, upperLeft) {
    const p = left + up - upperLeft;
    const pa = Math.abs(p - left);
    const pb = Math.abs(p - up);
    const pc = Math.abs(p - upperLeft);
    if (pa <= pb && pa <= pc)
        return left;
    if (pb <= pc)
        return up;
    return upperLeft;
}
//# sourceMappingURL=playwright-provider-part-01.js.map