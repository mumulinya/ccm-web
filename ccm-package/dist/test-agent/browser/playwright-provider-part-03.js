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
exports.runAction = runAction;
exports.runAssertion = runAssertion;
exports.runBrowserCheck = runBrowserCheck;
// Behavior-freeze split from playwright-provider.ts (part 3/4).
const path = __importStar(require("path"));
const utils_1 = require("../utils");
const semantic_locator_1 = require("./semantic-locator");
const accessibility_snapshot_artifacts_1 = require("./accessibility-snapshot-artifacts");
const failure_screenshots_1 = require("./failure-screenshots");
const authentication_1 = require("./authentication");
const action_effects_1 = require("./action-effects");
const network_assertions_1 = require("./network-assertions");
const console_assertions_1 = require("./console-assertions");
const accessibility_assertions_1 = require("./accessibility-assertions");
const aria_state_assertions_1 = require("./aria-state-assertions");
const playwright_provider_part_01_1 = require("./playwright-provider-part-01");
const playwright_provider_part_02_1 = require("./playwright-provider-part-02");
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
function storageActionDetail(action, resolved) {
    const area = storageActionArea(action);
    const keys = storageActionKeys(action);
    if (action.type === "clearStorage") {
        return `${area}; ${keys.length ? `key count=${keys.length}` : "clear all"}`;
    }
    const valueLength = resolved?.provided ? resolved.value.length : (0, playwright_provider_part_02_1.storageActionValue)(action).length;
    const source = resolved?.source === "environment" ? `; value source=env:${resolved.envName}` : "";
    return `${area}; key=${storageActionKey(action) || "(missing)"}; value length=${valueLength}${source}`;
}
function scrollAmount(action) {
    const amount = Number(action.amount ?? action.value ?? action.text ?? 600);
    return Number.isFinite(amount) && amount !== 0 ? Math.abs(amount) : 600;
}
function scrollDirection(action) {
    return action.direction === "up" || action.direction === "left" || action.direction === "right" ? action.direction : "down";
}
function scrollDelta(action) {
    const amount = scrollAmount(action);
    const direction = scrollDirection(action);
    if (direction === "up")
        return { deltaX: 0, deltaY: -amount };
    if (direction === "left")
        return { deltaX: -amount, deltaY: 0 };
    if (direction === "right")
        return { deltaX: amount, deltaY: 0 };
    return { deltaX: 0, deltaY: amount };
}
function scrollHasExplicitTarget(action) {
    return !!(action.selector
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
        || action.title);
}
function scrollActionDetail(action) {
    const target = scrollHasExplicitTarget(action) ? (0, semantic_locator_1.browserTargetDetail)(action) : "page";
    return `${target}; ${scrollDirection(action)} ${scrollAmount(action)}px`;
}
function typeTextValue(action) {
    return String(action.value ?? action.text ?? "");
}
function typeTextDelay(action) {
    const delay = Number(action.delay ?? action.delayMs ?? action.delay_ms ?? 0);
    return Number.isFinite(delay) && delay > 0 ? delay : 0;
}
function typeTextActionDetail(action, resolved) {
    const target = (0, semantic_locator_1.browserTargetDetail)(action) || "focused element";
    const delay = typeTextDelay(action);
    const valueLength = resolved?.provided ? resolved.value.length : typeTextValue(action).length;
    const source = resolved?.source === "environment" ? `; value source=env:${resolved.envName}` : "";
    return `${target}; text length=${valueLength}${source}${delay ? `; delay=${delay}ms` : ""}`;
}
function browserNetworkStateActionDetail(action) {
    return action.type === "setOffline" ? "browser network offline" : "browser network online";
}
function browserActionDetail(action, resolved) {
    if (action.type === "uploadFile")
        return (0, playwright_provider_part_02_1.uploadFileActionDetail)(action);
    if (action.type === "dragTo")
        return (0, playwright_provider_part_02_1.dragActionDetail)(action);
    if (action.type === "setClipboard")
        return (0, playwright_provider_part_02_1.clipboardActionDetail)(action, resolved);
    if (action.type === "setCookie" || action.type === "clearCookies")
        return (0, playwright_provider_part_02_1.cookieActionDetail)(action, resolved);
    if (action.type === "setLocalStorage" || action.type === "setSessionStorage" || action.type === "clearStorage")
        return storageActionDetail(action, resolved);
    if (action.type === "setOffline" || action.type === "setOnline")
        return browserNetworkStateActionDetail(action);
    if (action.type === "scroll")
        return scrollActionDetail(action);
    if (action.type === "typeText")
        return typeTextActionDetail(action, resolved);
    const target = (0, semantic_locator_1.browserTargetDetail)(action);
    const source = resolved?.source === "environment" ? (0, playwright_provider_part_02_1.resolvedValueDetail)(resolved) : "";
    return [target, source].filter(Boolean).join("; ");
}
async function runAction(page, project, action, defaultTimeout) {
    const timeout = Number(action.timeoutMs || action.timeout_ms || defaultTimeout);
    const name = `action:${action.type}`;
    let resolvedValue;
    try {
        if ((0, authentication_1.browserActionSupportsEnvironmentValue)(action))
            resolvedValue = (0, authentication_1.resolveBrowserActionValue)(project, action);
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
        else if (action.type === "doubleClick") {
            await (0, semantic_locator_1.resolvePlaywrightLocator)(page, action).dblclick({ timeout });
        }
        else if (action.type === "rightClick") {
            await (0, semantic_locator_1.resolvePlaywrightLocator)(page, action).click({ button: "right", timeout });
        }
        else if (action.type === "fill") {
            await (0, semantic_locator_1.resolvePlaywrightLocator)(page, action).fill(resolvedValue?.value ?? String(action.value ?? action.text ?? ""), { timeout });
        }
        else if (action.type === "selectOption") {
            const expected = resolvedValue?.value ?? String(action.value ?? action.text ?? "");
            const locator = (0, semantic_locator_1.resolvePlaywrightLocator)(page, action).first();
            try {
                await locator.waitFor({ state: "attached", timeout });
                const matchesValue = await locator.evaluate((element, candidate) => {
                    return Array.from(element.options || []).some((option) => String(option.value) === candidate);
                }, expected);
                await locator.selectOption(matchesValue ? { value: expected } : { label: expected }, { timeout });
            }
            catch (error) {
                throw new Error(`Could not select option using the configured value (length=${expected.length}): ${error.message || String(error)}`);
            }
        }
        else if (action.type === "check") {
            await (0, semantic_locator_1.resolvePlaywrightLocator)(page, action).check({ timeout });
        }
        else if (action.type === "uncheck") {
            await (0, semantic_locator_1.resolvePlaywrightLocator)(page, action).uncheck({ timeout });
        }
        else if (action.type === "uploadFile") {
            const payload = (0, playwright_provider_part_02_1.uploadFilePayload)(project, action);
            await (0, semantic_locator_1.resolvePlaywrightLocator)(page, action).first().setInputFiles(payload, { timeout });
        }
        else if (action.type === "dragTo") {
            const source = (0, semantic_locator_1.resolvePlaywrightLocator)(page, action).first();
            const destinationTarget = (0, playwright_provider_part_02_1.dragDestinationTarget)(action);
            const destination = (0, semantic_locator_1.resolvePlaywrightLocator)(page, destinationTarget).first();
            await source.waitFor({ state: "visible", timeout });
            await destination.waitFor({ state: "visible", timeout });
            await source.dragTo(destination, { timeout });
        }
        else if (action.type === "setClipboard") {
            await (0, playwright_provider_part_01_1.writeClipboardText)(page, resolvedValue?.value ?? (0, playwright_provider_part_01_1.clipboardExpectedText)(action));
        }
        else if (action.type === "setCookie") {
            await page.context().addCookies([(0, playwright_provider_part_02_1.buildPlaywrightCookie)(page, project, action, resolvedValue)]);
        }
        else if (action.type === "clearCookies") {
            await (0, playwright_provider_part_02_1.clearBrowserCookies)(page, action);
        }
        else if (action.type === "setLocalStorage" || action.type === "setSessionStorage") {
            const storageName = storageActionArea(action);
            const key = storageActionKey(action);
            if (storageName === "both")
                throw new Error(`${action.type} requires a single storage area.`);
            if (!key)
                throw new Error(`${action.type} requires key/storageKey/text.`);
            if (!resolvedValue?.provided && !storageActionHasValue(action))
                throw new Error(`${action.type} requires value/text/content or valueEnv.`);
            await page.evaluate(({ storageName, key, value }) => {
                globalThis[storageName].setItem(key, value);
            }, { storageName, key, value: resolvedValue?.value ?? (0, playwright_provider_part_02_1.storageActionValue)(action) });
        }
        else if (action.type === "clearStorage") {
            const area = storageActionArea(action);
            const keys = storageActionKeys(action);
            const storageNames = area === "both" ? ["localStorage", "sessionStorage"] : [area];
            await page.evaluate(({ storageNames, keys }) => {
                for (const storageName of storageNames) {
                    const storage = globalThis[storageName];
                    if (!storage)
                        continue;
                    if (keys.length) {
                        for (const key of keys)
                            storage.removeItem(key);
                    }
                    else {
                        storage.clear();
                    }
                }
            }, { storageNames, keys });
        }
        else if (action.type === "setOffline" || action.type === "setOnline") {
            await page.context().setOffline(action.type === "setOffline");
        }
        else if (action.type === "hover") {
            await (0, semantic_locator_1.resolvePlaywrightLocator)(page, action).hover({ timeout });
        }
        else if (action.type === "focus") {
            await (0, semantic_locator_1.resolvePlaywrightLocator)(page, action).focus({ timeout });
        }
        else if (action.type === "typeText") {
            const value = resolvedValue?.value ?? typeTextValue(action);
            if (!value)
                throw new Error("typeText requires value/text or valueEnv.");
            const locatorPlan = (0, semantic_locator_1.buildSemanticLocatorPlan)(action);
            if (locatorPlan)
                await (0, semantic_locator_1.resolvePlaywrightLocator)(page, action).focus({ timeout });
            await page.keyboard.type(value, { delay: typeTextDelay(action) });
        }
        else if (action.type === "scroll") {
            const delta = scrollDelta(action);
            if (action.coordinate) {
                await page.mouse.move(Number(action.coordinate[0]), Number(action.coordinate[1]));
            }
            if (scrollHasExplicitTarget(action)) {
                const locator = (0, semantic_locator_1.resolvePlaywrightLocator)(page, action).first();
                await locator.waitFor({ state: "attached", timeout });
                await locator.evaluate((element, current) => {
                    element.scrollBy({ left: current.deltaX, top: current.deltaY, behavior: "instant" });
                }, delta);
            }
            else if (!action.coordinate) {
                await page.evaluate((current) => {
                    globalThis.scrollBy({ left: current.deltaX, top: current.deltaY, behavior: "instant" });
                }, delta);
            }
            else {
                await page.mouse.wheel(delta.deltaX, delta.deltaY);
            }
        }
        else if (action.type === "press") {
            const key = String(action.key || action.value || action.text || "Enter");
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
        else if (action.type === "waitForUrl") {
            const expected = String(action.url || action.text || action.value || "");
            if (!expected)
                throw new Error("waitForUrl requires url/text/value.");
            await page.waitForURL((url) => url.toString().includes(expected), { timeout });
        }
        else if (action.type === "waitForTimeout") {
            await page.waitForTimeout(Math.min(timeout, Number(action.value || action.text || 1000)));
        }
        else if (action.type === "evaluate") {
            await page.evaluate(String(action.text || action.value || "undefined"));
        }
        else {
            throw new Error(`Action ${action.type} is not mapped for Playwright.`);
        }
        return { kind: "action", name, status: "passed", detail: browserActionDetail(action, resolvedValue) };
    }
    catch (error) {
        return {
            kind: "action",
            name,
            status: "failed",
            detail: browserActionDetail(action, resolvedValue),
            error: (0, authentication_1.redactBrowserSensitiveText)(error.message || String(error), resolvedValue?.source === "environment"
                ? [{ envName: resolvedValue.envName || "credential", value: resolvedValue.value }]
                : []),
        };
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
        else if (assertion.type === "present") {
            await (0, semantic_locator_1.resolvePlaywrightLocator)(page, assertion).first().waitFor({ state: "attached", timeout });
        }
        else if (assertion.type === "notPresent") {
            const locator = (0, semantic_locator_1.resolvePlaywrightLocator)(page, assertion);
            const result = await (0, playwright_provider_part_01_1.waitForElementCount)(locator, { ...assertion, type: "elementCountEquals", count: 0 }, timeout);
            if (result.actual !== 0)
                throw new Error(`Expected target to be absent from DOM, got actual count=${result.actual}: ${(0, semantic_locator_1.browserTargetDetail)(assertion)}.`);
        }
        else if (assertion.type === "focused" || assertion.type === "notFocused") {
            const locator = (0, semantic_locator_1.resolvePlaywrightLocator)(page, assertion).first();
            const expectedFocused = assertion.type === "focused";
            const result = await (0, playwright_provider_part_01_1.waitForFocusedState)(locator, expectedFocused, timeout);
            if (result.focused !== expectedFocused) {
                throw new Error(`Expected target to be ${expectedFocused ? "focused" : "not focused"}: ${(0, semantic_locator_1.browserTargetDetail)(assertion)}.`);
            }
        }
        else if (assertion.type === "enabled" || assertion.type === "disabled") {
            const enabled = await (0, semantic_locator_1.resolvePlaywrightLocator)(page, assertion).first().isEnabled({ timeout });
            if (assertion.type === "enabled" && !enabled)
                throw new Error(`Expected target to be enabled: ${(0, semantic_locator_1.browserTargetDetail)(assertion)}`);
            if (assertion.type === "disabled" && enabled)
                throw new Error(`Expected target to be disabled: ${(0, semantic_locator_1.browserTargetDetail)(assertion)}`);
        }
        else if (assertion.type === "checked" || assertion.type === "notChecked") {
            const checked = await (0, semantic_locator_1.resolvePlaywrightLocator)(page, assertion).first().isChecked({ timeout });
            if (assertion.type === "checked" && !checked)
                throw new Error(`Expected target to be checked: ${(0, semantic_locator_1.browserTargetDetail)(assertion)}`);
            if (assertion.type === "notChecked" && checked)
                throw new Error(`Expected target to be unchecked: ${(0, semantic_locator_1.browserTargetDetail)(assertion)}`);
        }
        else if (assertion.type === "selectedValue") {
            const expected = String(assertion.value ?? assertion.text ?? "");
            const actual = await (0, semantic_locator_1.resolvePlaywrightLocator)(page, assertion).first().inputValue({ timeout });
            if (actual !== expected)
                throw new Error(`Expected selected value ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}.`);
        }
        else if (assertion.type === "selectedTextIncludes") {
            const expected = String(assertion.value ?? assertion.text ?? "");
            const actual = await (0, semantic_locator_1.resolvePlaywrightLocator)(page, assertion).first().evaluate((element) => {
                const options = Array.from(element.selectedOptions || []);
                return options.map(option => String(option.textContent || option.label || option.value || "").trim()).join(" | ");
            });
            if (!actual.includes(expected))
                throw new Error(`Expected selected option text to include ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}.`);
        }
        else if (assertion.type === "inputValueEquals" || assertion.type === "inputValueIncludes") {
            const expected = String(assertion.value ?? assertion.text ?? "");
            if (!expected && assertion.type === "inputValueIncludes")
                throw new Error("inputValueIncludes requires value/text as the expected substring.");
            const actual = await (0, semantic_locator_1.resolvePlaywrightLocator)(page, assertion).first().inputValue({ timeout });
            if (assertion.type === "inputValueEquals" && actual !== expected) {
                throw new Error(`Expected input value to equal requested value: ${(0, playwright_provider_part_01_1.inputValueAssertionDetail)(assertion)}; actual length=${String(actual || "").length}.`);
            }
            if (assertion.type === "inputValueIncludes" && !actual.includes(expected)) {
                throw new Error(`Expected input value to include requested substring: ${(0, playwright_provider_part_01_1.inputValueAssertionDetail)(assertion)}; actual length=${String(actual || "").length}.`);
            }
        }
        else if (assertion.type === "attributeEquals" || assertion.type === "attributeIncludes") {
            const attr = (0, playwright_provider_part_01_1.attributeName)(assertion);
            const expected = String(assertion.value ?? assertion.text ?? "");
            if (!attr)
                throw new Error(`${assertion.type} requires attribute/attributeName/attribute_name/key.`);
            if (!expected && assertion.type === "attributeIncludes")
                throw new Error("attributeIncludes requires value/text as the expected substring.");
            const actual = await (0, semantic_locator_1.resolvePlaywrightLocator)(page, assertion).first().getAttribute(attr, { timeout });
            if (actual === null || actual === undefined)
                throw new Error(`Expected attribute to exist: ${(0, playwright_provider_part_01_1.attributeAssertionDetail)(assertion)}.`);
            if (assertion.type === "attributeEquals" && actual !== expected) {
                throw new Error(`Expected attribute to equal requested value: ${(0, playwright_provider_part_01_1.attributeAssertionDetail)(assertion)}; actual length=${String(actual || "").length}.`);
            }
            if (assertion.type === "attributeIncludes" && !actual.includes(expected)) {
                throw new Error(`Expected attribute to include requested substring: ${(0, playwright_provider_part_01_1.attributeAssertionDetail)(assertion)}; actual length=${String(actual || "").length}.`);
            }
        }
        else if (assertion.type === "computedStyleEquals" || assertion.type === "computedStyleIncludes") {
            const result = await (0, playwright_provider_part_01_1.waitForComputedStyle)(page, assertion, timeout);
            if (!result.passed) {
                throw new Error(`Expected computed style to ${assertion.type === "computedStyleEquals" ? "equal" : "include"} requested value: ${(0, playwright_provider_part_01_1.computedStyleAssertionDetail)(assertion)}; actual length=${result.actualLength}.`);
            }
        }
        else if (assertion.type === "elementCountEquals" || assertion.type === "elementCountAtLeast" || assertion.type === "elementCountAtMost") {
            const locator = (0, semantic_locator_1.resolvePlaywrightLocator)(page, assertion);
            const result = await (0, playwright_provider_part_01_1.waitForElementCount)(locator, assertion, timeout);
            if (assertion.type === "elementCountEquals" && result.actual !== result.expected) {
                throw new Error(`Expected element count to equal ${result.expected}, got actual count=${result.actual}: ${(0, semantic_locator_1.browserTargetDetail)(assertion)}.`);
            }
            if (assertion.type === "elementCountAtLeast" && result.actual < result.expected) {
                throw new Error(`Expected element count to be at least ${result.expected}, got actual count=${result.actual}: ${(0, semantic_locator_1.browserTargetDetail)(assertion)}.`);
            }
            if (assertion.type === "elementCountAtMost" && result.actual > result.expected) {
                throw new Error(`Expected element count to be at most ${result.expected}, got actual count=${result.actual}: ${(0, semantic_locator_1.browserTargetDetail)(assertion)}.`);
            }
        }
        else if (assertion.type === "dialogAppeared" || assertion.type === "dialogMessageIncludes" || assertion.type === "dialogTypeEquals") {
            await (0, playwright_provider_part_01_1.waitForBrowserDialog)(signals, assertion, timeout);
        }
        else if (assertion.type === "popupOpened" || assertion.type === "popupUrlIncludes" || assertion.type === "popupTextIncludes" || assertion.type === "popupTitleIncludes") {
            await (0, playwright_provider_part_01_1.waitForBrowserPopup)(signals, assertion, timeout);
        }
        else if (assertion.type === "tableRowIncludes" || assertion.type === "tableCellTextIncludes" || assertion.type === "tableCellTextEquals") {
            const result = await (0, playwright_provider_part_02_1.waitForTableAssertion)(page, assertion, timeout);
            if (!result?.ok) {
                throw new Error(`Expected table assertion to pass: ${(0, playwright_provider_part_01_1.tableAssertionDetail)(assertion)}; ${result?.reason || "condition was not met"}; rows=${result?.rowCount ?? "unknown"}; headers=${result?.headerCount ?? "unknown"}.`);
            }
        }
        else if (assertion.type === "clipboardTextEquals" || assertion.type === "clipboardTextIncludes") {
            const result = await (0, playwright_provider_part_01_1.waitForClipboardText)(page, assertion, timeout);
            if (assertion.type === "clipboardTextEquals" && !result.passed) {
                throw new Error(`Expected clipboard text to equal requested value: ${(0, playwright_provider_part_01_1.clipboardAssertionDetail)(assertion)}; actual length=${result.actualLength}.`);
            }
            if (assertion.type === "clipboardTextIncludes" && !result.passed) {
                throw new Error(`Expected clipboard text to include requested substring: ${(0, playwright_provider_part_01_1.clipboardAssertionDetail)(assertion)}; actual length=${result.actualLength}.`);
            }
        }
        else if (assertion.type === "elementScreenshotNotBlank") {
            const result = await (0, playwright_provider_part_02_1.evaluateElementScreenshotNotBlank)(page, assertion, timeout);
            if (!result.ok) {
                throw new Error(`Expected element screenshot to be visually non-blank: ${(0, playwright_provider_part_01_1.visualAssertionDetail)(assertion)}; size=${result.stats.width}x${result.stats.height}; uniqueColors=${result.stats.uniqueColors}; nonWhitePixels=${result.stats.nonWhitePixels}; nonTransparentPixels=${result.stats.nonTransparentPixels}.`);
            }
        }
        else if (assertion.type === "textOrder") {
            const result = await (0, playwright_provider_part_02_1.waitForTextOrder)(page, assertion, timeout);
            if (!result.ok) {
                throw new Error(`Expected text order to match: ${(0, playwright_provider_part_01_1.textOrderAssertionDetail)(assertion)}; foundCount=${result.foundCount ?? 0}; missingIndex=${result.missingIndex ?? "unknown"}.`);
            }
        }
        else if (assertion.type === "text") {
            await page.getByText(String(assertion.text || assertion.value || "")).first().waitFor({ state: "visible", timeout });
        }
        else if (assertion.type === "urlEquals") {
            const expected = (0, playwright_provider_part_01_1.urlAssertionExpected)(assertion);
            if (!expected)
                throw new Error("urlEquals requires url/text/value.");
            const matches = (rawUrl) => {
                const actual = (0, playwright_provider_part_01_1.comparableUrl)(rawUrl.toString(), expected);
                return actual === expected;
            };
            if (!matches(page.url()))
                await page.waitForURL((url) => matches(url), { timeout }).catch(() => { });
            if (!matches(page.url()))
                throw new Error(`Expected URL to equal "${expected}", got "${(0, playwright_provider_part_01_1.comparableUrl)(page.url(), expected)}".`);
        }
        else if (assertion.type === "urlIncludes") {
            const value = (0, playwright_provider_part_01_1.urlAssertionExpected)(assertion);
            if (!value)
                throw new Error("urlIncludes requires text/value.");
            if (!page.url().includes(value)) {
                await page.waitForURL((url) => url.toString().includes(value), { timeout }).catch(() => { });
            }
            if (!page.url().includes(value))
                throw new Error(`Expected URL to include "${value}", got "${page.url()}".`);
        }
        else if (assertion.type === "urlNotIncludes") {
            const value = (0, playwright_provider_part_01_1.urlAssertionExpected)(assertion);
            if (!value)
                throw new Error("urlNotIncludes requires text/value.");
            if (page.url().includes(value)) {
                await page.waitForURL((url) => !url.toString().includes(value), { timeout }).catch(() => { });
            }
            if (page.url().includes(value))
                throw new Error(`Expected URL not to include "${value}", got "${page.url()}".`);
        }
        else if (assertion.type === "titleEquals") {
            const value = (0, playwright_provider_part_01_1.titleAssertionExpected)(assertion);
            if (!value)
                throw new Error("titleEquals requires text/value/title.");
            const title = await (0, playwright_provider_part_01_1.waitForTitleMatch)(page, current => current === value, timeout);
            if (title !== value)
                throw new Error(`Expected title to equal "${value}", got "${title}".`);
        }
        else if (assertion.type === "titleIncludes") {
            const value = (0, playwright_provider_part_01_1.titleAssertionExpected)(assertion);
            if (!value)
                throw new Error("titleIncludes requires text/value/title.");
            const title = await (0, playwright_provider_part_01_1.waitForTitleMatch)(page, current => current.includes(value), timeout);
            if (!title.includes(value))
                throw new Error(`Expected title to include "${value}", got "${title}".`);
        }
        else if (assertion.type === "titleNotIncludes") {
            const value = (0, playwright_provider_part_01_1.titleAssertionExpected)(assertion);
            if (!value)
                throw new Error("titleNotIncludes requires text/value/title.");
            const title = await (0, playwright_provider_part_01_1.waitForTitleMatch)(page, current => !current.includes(value), timeout);
            if (title.includes(value))
                throw new Error(`Expected title not to include "${value}", got "${title}".`);
        }
        else if (assertion.type === "elementTextIncludes") {
            const value = String(assertion.value || assertion.text || "");
            const actual = await (0, semantic_locator_1.resolvePlaywrightLocator)(page, assertion).first().innerText({ timeout });
            if (!actual.includes(value))
                throw new Error(`Expected element text to include "${value}", got "${actual}".`);
        }
        else if (assertion.type === "accessibleNameEquals"
            || assertion.type === "accessibleNameIncludes"
            || assertion.type === "accessibleDescriptionEquals"
            || assertion.type === "accessibleDescriptionIncludes"
            || assertion.type === "ariaSnapshotIncludes") {
            const locator = (0, semantic_locator_1.resolvePlaywrightLocator)(page, assertion).first();
            const result = await (0, accessibility_assertions_1.waitForBrowserAccessibilityAssertion)(locator, assertion, timeout);
            if (!result.passed) {
                throw new Error(`Expected accessibility assertion to pass: ${(0, accessibility_assertions_1.browserAccessibilityAssertionDetail)(assertion)}; actual length=${result.actualLength}.`);
            }
        }
        else if ((0, aria_state_assertions_1.isBrowserAriaStateAssertion)(assertion)) {
            const locator = (0, semantic_locator_1.resolvePlaywrightLocator)(page, assertion).first();
            const result = await (0, aria_state_assertions_1.waitForBrowserAriaStateAssertion)(locator, assertion, timeout);
            if (!result.passed) {
                throw new Error(`Expected ARIA state assertion to pass: ${(0, aria_state_assertions_1.browserAriaStateAssertionDetail)(assertion)}; actual ${result.attribute}=${result.actual}.`);
            }
        }
        else if (assertion.type === "inViewport") {
            const locator = (0, semantic_locator_1.resolvePlaywrightLocator)(page, assertion).first();
            await locator.waitFor({ state: "visible", timeout });
            const result = await (0, playwright_provider_part_01_1.evaluateElementInViewport)(locator, signals.viewport?.width || 0, signals.viewport?.height || 0);
            if (!result?.ok) {
                throw new Error(`Expected target to be within viewport, got rect=${JSON.stringify(result?.rect)}, viewport=${result?.viewportWidth}x${result?.viewportHeight}, visible=${result?.visible}.`);
            }
        }
        else if (assertion.type === "pageNotBlank") {
            const result = await (0, playwright_provider_part_01_1.evaluatePageNotBlank)(page);
            if (!result?.ok)
                throw new Error(`Expected page to have visible user-facing content, but found ${result?.reason || "no content"}.`);
        }
        else if (assertion.type === "noHorizontalOverflow") {
            const result = await (0, playwright_provider_part_01_1.evaluateNoHorizontalOverflow)(page, signals.viewport?.width || 0);
            if (!result?.ok)
                throw new Error(`Expected no horizontal overflow, got documentWidth=${result?.documentWidth}, viewportWidth=${result?.viewportWidth}, overflowPx=${result?.overflowPx}.`);
        }
        else if (assertion.type === "onlineState" || assertion.type === "browserOnline" || assertion.type === "browserOffline") {
            const expected = (0, playwright_provider_part_01_1.expectedOnlineState)(assertion);
            if (expected === undefined)
                throw new Error("onlineState requires value/text/state of online or offline.");
            const actual = await (0, playwright_provider_part_01_1.waitForOnlineState)(page, expected, timeout);
            if (actual !== expected)
                throw new Error(`Expected browser to be ${expected ? "online" : "offline"}, got ${actual ? "online" : "offline"}.`);
        }
        else if (assertion.type === "cookieExists") {
            const cookie = await (0, playwright_provider_part_01_1.readBrowserCookie)(page, assertion);
            if (!cookie)
                throw new Error(`Expected browser cookie to exist: ${(0, playwright_provider_part_01_1.cookieAssertionDetail)(assertion)}.`);
        }
        else if (assertion.type === "cookieValueEquals" || assertion.type === "cookieValueIncludes") {
            const expected = String(assertion.value ?? assertion.text ?? "");
            if (!expected)
                throw new Error(`${assertion.type} requires value/text as the expected ${assertion.type === "cookieValueEquals" ? "value" : "substring"}.`);
            const cookie = await (0, playwright_provider_part_01_1.readBrowserCookie)(page, assertion);
            if (!cookie)
                throw new Error(`Expected browser cookie to exist: ${(0, playwright_provider_part_01_1.cookieAssertionDetail)(assertion)}.`);
            const actual = String(cookie.value || "");
            const passed = assertion.type === "cookieValueEquals" ? actual === expected : actual.includes(expected);
            if (!passed)
                throw new Error(`Expected browser cookie value to ${assertion.type === "cookieValueEquals" ? "equal requested value" : "include requested substring"}: ${(0, playwright_provider_part_01_1.cookieAssertionDetail)(assertion)}.`);
        }
        else if (assertion.type === "consoleIncludes" || assertion.type === "consoleNotIncludes" || assertion.type === "consoleNoWarnings") {
            if (!(0, console_assertions_1.browserConsoleAssertionHasExpectation)(assertion))
                throw new Error(`${assertion.type} requires text/value/message/messageIncludes.`);
            if ((0, console_assertions_1.browserConsoleAssertionIsNegative)(assertion)) {
                const settleMs = (0, console_assertions_1.browserConsoleAssertionSettleMs)(assertion, timeout);
                const matched = await (0, console_assertions_1.waitForAbsentBrowserConsoleLine)(signals.consoleMessages, assertion, settleMs);
                if (matched)
                    throw new Error(`Unexpected browser console telemetry matched ${(0, console_assertions_1.browserConsoleAssertionDetail)(assertion)}: ${matched}`);
            }
            else {
                const matched = await (0, console_assertions_1.waitForBrowserConsoleLine)(signals.consoleMessages, assertion, timeout);
                if (!matched)
                    throw new Error(`Expected browser console telemetry to match ${(0, console_assertions_1.browserConsoleAssertionDetail)(assertion)}.`);
            }
        }
        else if (assertion.type === "consoleNoErrors") {
            if (signals.consoleErrors.length)
                throw new Error(`Console errors observed: ${signals.consoleErrors.slice(0, 3).join(" | ")}`);
        }
        else if (assertion.type === "networkNoErrors") {
            if (signals.networkErrors.length)
                throw new Error(`Network errors observed: ${signals.networkErrors.slice(0, 3).join(" | ")}`);
        }
        else if (assertion.type === "networkRequestIncludes"
            || assertion.type === "networkResponseIncludes"
            || assertion.type === "networkRequest"
            || assertion.type === "networkResponse"
            || assertion.type === "networkRequestNotIncludes"
            || assertion.type === "networkResponseNotIncludes"
            || assertion.type === "networkRequestNot"
            || assertion.type === "networkResponseNot") {
            if (!(0, network_assertions_1.browserNetworkAssertionHasExpectation)(assertion))
                throw new Error(`${assertion.type} requires text/value or structured network fields.`);
            if ((0, network_assertions_1.browserNetworkAssertionIsNegative)(assertion)) {
                const settleMs = (0, network_assertions_1.browserNetworkAssertionSettleMs)(assertion, timeout);
                const matched = await (0, network_assertions_1.waitForAbsentBrowserNetworkLine)(signals.networkRequests, assertion, settleMs);
                if (matched)
                    throw new Error(`Unexpected browser network telemetry matched ${(0, network_assertions_1.browserNetworkAssertionDetail)(assertion) || assertion.type}: ${matched}`);
            }
            else {
                const matched = await (0, network_assertions_1.waitForBrowserNetworkLine)(signals.networkRequests, assertion, timeout);
                if (!matched)
                    throw new Error(`Expected browser network telemetry to match ${(0, network_assertions_1.browserNetworkAssertionDetail)(assertion) || assertion.type}.`);
            }
        }
        else if (assertion.type === "downloadedFile") {
            await (0, playwright_provider_part_02_1.waitForDownloadedFile)(signals, assertion, timeout);
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
            const expected = (0, playwright_provider_part_01_1.expectedValue)(assertion);
            if (!(0, playwright_provider_part_01_1.valuesEqual)(actual, expected))
                throw new Error(`Expected JS expression to equal ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}.`);
        }
        else if (assertion.type === "localStorageEquals" || assertion.type === "localStorageIncludes" || assertion.type === "sessionStorageEquals" || assertion.type === "sessionStorageIncludes") {
            const key = assertion.key || assertion.text || "";
            if (!key)
                throw new Error(`${assertion.type} requires key/text.`);
            const storageName = assertion.type.startsWith("local") ? "localStorage" : "sessionStorage";
            const actual = await page.evaluate(({ storageName, key }) => globalThis[storageName].getItem(key), { storageName, key });
            const expected = (0, playwright_provider_part_01_1.expectedValue)(assertion);
            const passed = assertion.type.endsWith("Equals")
                ? (0, playwright_provider_part_01_1.valuesEqual)(actual, expected)
                : String(actual ?? "").includes(String(expected ?? ""));
            if (!passed)
                throw new Error(`Expected ${storageName}.${key} to ${assertion.type.endsWith("Equals") ? "equal" : "include"} ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}.`);
        }
        return { kind: "assertion", name, status: "passed", detail: (0, playwright_provider_part_01_1.stateAssertionDetail)(assertion) };
    }
    catch (error) {
        return { kind: "assertion", name, status: "failed", detail: (0, playwright_provider_part_01_1.stateAssertionDetail)(assertion), error: error.message || String(error) };
    }
}
async function runBrowserCheck(browser, context, project, check, index) {
    const { workOrder } = context;
    const startedAt = (0, utils_1.nowIso)();
    const started = Date.now();
    const timeout = Number(check.timeoutMs || check.timeout_ms || workOrder.options.browserTimeoutMs);
    const screenshots = [];
    const screenshotRefs = [];
    const consoleMessages = [];
    const dialogMessages = [];
    const popupMessages = [];
    const consoleErrors = [];
    const pageErrors = [];
    const networkRequests = [];
    const networkErrors = [];
    const downloads = [];
    const downloadPromises = [];
    const dialogs = [];
    const popups = [];
    const popupCapturePromises = [];
    const pageSnapshots = [];
    const browserArtifacts = [];
    const actionEffects = [];
    const steps = [];
    const name = check.name || `Browser check ${index + 1}`;
    const url = (0, utils_1.resolveUrl)(project.targetUrl, check.url || project.targetUrl);
    let page = null;
    let browserContext = null;
    let lifecycleResourceId = "";
    let traceStarted = false;
    const credentialEnvNames = (0, authentication_1.browserCheckAuthenticationEnvNames)(check);
    const authenticationConfigured = credentialEnvNames.length > 0 || (0, authentication_1.browserCheckHasStorageState)(check);
    const sensitiveArtifactsSuppressed = authenticationConfigured
        && (workOrder.options.collectBrowserArtifacts || workOrder.options.collectBrowserVideo);
    const collectBrowserArtifacts = workOrder.options.collectBrowserArtifacts && !authenticationConfigured;
    const collectBrowserVideo = workOrder.options.collectBrowserVideo && !authenticationConfigured;
    const normalScreenshotRequested = check.screenshot !== false || (0, utils_1.hasRequiredCheck)(workOrder.requiredChecks, /screenshot/i);
    const evidenceDir = collectBrowserArtifacts ? (0, utils_1.ensureDir)(path.join(workOrder.options.artifactDir, "browser-artifacts")) : "";
    const downloadDir = (0, utils_1.ensureDir)(path.join(workOrder.options.artifactDir, "browser-artifacts", "downloads"));
    const artifactBase = (0, playwright_provider_part_02_1.browserArtifactBase)(project.name, name, index);
    const viewport = (0, playwright_provider_part_02_1.browserCheckViewport)(check);
    let runtimeContextOptions = (0, playwright_provider_part_02_1.browserCheckContextOptions)(check);
    let contextOptions = (0, playwright_provider_part_02_1.browserContextEvidenceOptions)(runtimeContextOptions);
    let authentication = (0, authentication_1.buildBrowserAuthenticationEvidence)({
        credentialEnvNames,
        sensitiveArtifactsSuppressed,
    });
    let secretBindings = [];
    const tracePath = collectBrowserArtifacts ? path.join(evidenceDir, `${artifactBase}.trace.zip`) : "";
    const harPath = collectBrowserArtifacts ? path.join(evidenceDir, `${artifactBase}.har`) : "";
    const monitoredOrigins = new Set([(0, playwright_provider_part_02_1.originOf)(project.targetUrl), (0, playwright_provider_part_02_1.originOf)(url)].filter(Boolean));
    try {
        secretBindings = (0, authentication_1.resolveBrowserSecretBindings)(project, (0, authentication_1.browserCheckAuthenticationActions)(check));
        const loadedStorageState = (0, authentication_1.loadBrowserStorageState)(project, check);
        if (loadedStorageState) {
            secretBindings = [...secretBindings, ...loadedStorageState.secretBindings];
            runtimeContextOptions = {
                ...runtimeContextOptions,
                storageStatePath: loadedStorageState.path,
                storageState: loadedStorageState.evidence,
            };
            contextOptions = (0, playwright_provider_part_02_1.browserContextEvidenceOptions)(runtimeContextOptions);
        }
        authentication = (0, authentication_1.buildBrowserAuthenticationEvidence)({
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
            ...(collectBrowserVideo ? { recordVideo: { dir: (0, utils_1.ensureDir)(path.join(workOrder.options.artifactDir, "browser-videos")), size: { width: 1366, height: 900 } } } : {}),
        });
        lifecycleResourceId = context.runtime.browserResourceLifecycle?.acquire({
            planId: String(context.workOrder.metadata?.browserCheckExecutionPlan?.planId || ""),
            provider: "playwright",
            resourceType: "browser_context",
            scope: `${project.name}/${name}/${index + 1}`,
        }) || "";
        await (0, playwright_provider_part_02_1.grantClipboardPermissions)(browserContext, monitoredOrigins);
        await (0, playwright_provider_part_02_1.grantBrowserContextPermissions)(browserContext, monitoredOrigins, contextOptions.permissions || []);
        if (collectBrowserArtifacts && browserContext.tracing?.start) {
            try {
                await browserContext.tracing.start({ screenshots: true, snapshots: true, sources: true });
                traceStarted = true;
            }
            catch { }
        }
        page = await browserContext.newPage();
        const recordUnsafeRequest = (event) => {
            networkErrors.push((0, authentication_1.redactBrowserSensitiveText)(`blocked_unsafe_url ${event.error}: ${event.url}`, secretBindings));
        };
        await (0, playwright_provider_part_02_1.installPlaywrightNetworkSafetyBoundary)(browserContext, page, recordUnsafeRequest);
        browserContext.on?.("page", (childPage) => {
            if (childPage === page)
                return;
            void (0, playwright_provider_part_02_1.installPlaywrightNetworkSafetyBoundary)(browserContext, childPage, recordUnsafeRequest).catch(() => { });
        });
        page.on("popup", (popup) => {
            const popupRecordIndex = popups.length;
            const pendingRecord = {
                url: "",
                title: "",
                textPreview: "",
                openedAt: (0, utils_1.nowIso)(),
            };
            popups.push(pendingRecord);
            popupMessages.push((0, playwright_provider_part_01_1.browserPopupLogLine)(pendingRecord));
            const promise = (0, playwright_provider_part_01_1.captureBrowserPopup)(popup, secretBindings)
                .then(record => {
                popups[popupRecordIndex] = record;
                popupMessages[popupRecordIndex] = (0, playwright_provider_part_01_1.browserPopupLogLine)(record);
                return record;
            })
                .catch((error) => {
                pendingRecord.error = (0, authentication_1.redactBrowserSensitiveText)(error.message || String(error), secretBindings);
                popupMessages[popupRecordIndex] = (0, playwright_provider_part_01_1.browserPopupLogLine)(pendingRecord);
                return pendingRecord;
            });
            popupCapturePromises.push(promise);
        });
        page.on("console", (message) => {
            const type = message.type?.() || "console";
            const text = (0, authentication_1.redactBrowserSensitiveText)(message.text?.() || "", secretBindings);
            const line = `${type}: ${text}`;
            consoleMessages.push(line);
            if (type === "error")
                consoleErrors.push(text);
        });
        page.on("pageerror", (error) => pageErrors.push((0, authentication_1.redactBrowserSensitiveText)(error.message || String(error), secretBindings)));
        page.on("dialog", (dialog) => {
            const record = {
                type: String(dialog.type?.() || "dialog"),
                message: (0, authentication_1.redactBrowserSensitiveText)(String(dialog.message?.() || ""), secretBindings),
                defaultValue: dialog.defaultValue ? (0, authentication_1.redactBrowserSensitiveText)(String(dialog.defaultValue()), secretBindings) : undefined,
                accepted: false,
                occurredAt: (0, utils_1.nowIso)(),
            };
            const dialogIndex = dialogs.length;
            dialogs.push(record);
            dialogMessages.push((0, playwright_provider_part_02_1.browserDialogLogLine)(record));
            Promise.resolve(dialog.accept?.())
                .then(() => {
                record.accepted = true;
                dialogMessages[dialogIndex] = (0, playwright_provider_part_02_1.browserDialogLogLine)(record);
            })
                .catch((error) => {
                record.error = (0, authentication_1.redactBrowserSensitiveText)(error.message || String(error), secretBindings);
                dialogMessages[dialogIndex] = (0, playwright_provider_part_02_1.browserDialogLogLine)(record);
            });
        });
        page.on("download", (download) => {
            const downloadIndex = downloadPromises.length;
            const promise = (0, playwright_provider_part_02_1.savePlaywrightDownload)(download, downloadDir, artifactBase, downloadIndex)
                .then(record => {
                downloads.push(record);
                return record;
            });
            downloadPromises.push(promise);
        });
        page.on("request", (request) => {
            networkRequests.push((0, authentication_1.redactBrowserSensitiveText)(`request ${request.method?.() || "GET"} ${request.url?.() || ""}`, secretBindings));
            networkRequests.push((0, playwright_provider_part_02_1.requestDetailsLine)(request, secretBindings));
        });
        page.on("requestfailed", (request) => {
            const line = (0, authentication_1.redactBrowserSensitiveText)(`failed ${request.method?.() || "GET"} ${request.url?.() || ""}: ${request.failure?.()?.errorText || "request failed"}`, secretBindings);
            networkRequests.push(line);
            networkErrors.push(line);
        });
        page.on("response", (response) => {
            const status = Number(response.status?.() || 0);
            const responseUrl = response.url?.() || "";
            const resourceType = (0, playwright_provider_part_02_1.responseResourceType)(response);
            const line = (0, authentication_1.redactBrowserSensitiveText)(`response ${status}${resourceType ? ` ${resourceType}` : ""} ${responseUrl}`, secretBindings);
            networkRequests.push(line);
            (0, playwright_provider_part_02_1.responseDetailsLine)(response, status, resourceType, responseUrl, secretBindings)
                .then(detailLine => networkRequests.push(detailLine))
                .catch(() => { });
            if (resourceType === "document" && status < 400) {
                const origin = (0, playwright_provider_part_02_1.originOf)(responseUrl);
                if (origin)
                    monitoredOrigins.add(origin);
            }
            const networkError = (0, playwright_provider_part_02_1.playwrightNetworkErrorForResponse)({
                status,
                responseUrl,
                resourceType,
                monitoredOrigins,
                failOnHttpResourceError: workOrder.options.failOnHttpResourceError,
            });
            if (networkError)
                networkErrors.push((0, authentication_1.redactBrowserSensitiveText)(networkError, secretBindings));
        });
        const actions = check.actions?.length ? check.actions : [{ type: "goto", url, waitUntil: "domcontentloaded" }];
        for (let actionIndex = 0; actionIndex < actions.length; actionIndex += 1) {
            const action = actions[actionIndex];
            const verifyEffect = (0, action_effects_1.browserActionEffectRequired)(action);
            const beforeObservation = verifyEffect
                ? await (0, playwright_provider_part_01_1.capturePlaywrightActionEffectObservation)(page, { networkRequests, dialogs, popups, downloads }).catch(() => ({}))
                : {};
            const step = (0, playwright_provider_part_01_1.redactBrowserStepResult)(await runAction(page, project, action, timeout), secretBindings);
            steps.push(step);
            if (step.status === "failed")
                break;
            if (verifyEffect) {
                const verified = await (0, action_effects_1.verifyBrowserActionEffect)({
                    provider: "playwright",
                    action,
                    actionIndex,
                    defaultTimeout: timeout,
                    beforeObservation,
                    capture: () => (0, playwright_provider_part_01_1.capturePlaywrightActionEffectObservation)(page, { networkRequests, dialogs, popups, downloads }),
                });
                actionEffects.push(verified.evidence);
                const effectStep = (0, playwright_provider_part_01_1.redactBrowserStepResult)(verified.step, secretBindings);
                steps.push(effectStep);
                if (effectStep.status === "failed")
                    break;
            }
        }
        if (!steps.some(step => step.status === "failed")) {
            for (const assertion of check.assertions || []) {
                const step = (0, playwright_provider_part_01_1.redactBrowserStepResult)(await runAssertion(page, assertion, { consoleMessages, consoleErrors, networkErrors, networkRequests, downloads, downloadPromises, dialogs, popups, viewport }, timeout), secretBindings);
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
            const failureShots = await (0, failure_screenshots_1.writePlaywrightFailureScreenshot)({
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
            const screenshotDir = (0, utils_1.ensureDir)(path.join(workOrder.options.artifactDir, "screenshots"));
            const screenshotPath = path.join(screenshotDir, `${(0, utils_1.safeSegment)(project.name)}-${(0, utils_1.safeSegment)(name)}-${index + 1}.png`);
            await page.screenshot({ path: screenshotPath, fullPage: true });
            screenshots.push(screenshotPath);
            screenshotRefs.push({
                stepName: failedStep?.name || name,
                path: screenshotPath,
                kind: failedStep ? "failure" : "capture",
            });
        }
        if (popupCapturePromises.length)
            await Promise.all(popupCapturePromises);
        pageSnapshots.push(...await (0, playwright_provider_part_02_1.writePlaywrightPageSnapshots)(page, workOrder.options.artifactDir, project.name, name, index, secretBindings));
        browserArtifacts.push(...await (0, accessibility_snapshot_artifacts_1.writePlaywrightAccessibilitySnapshotArtifact)(page, workOrder.options.artifactDir, project.name, name, index, value => (0, authentication_1.redactBrowserSensitiveText)(value, secretBindings)));
        const finalState = await (0, playwright_provider_part_01_1.capturePageFinalState)(page, secretBindings);
        const telemetryLogs = (0, playwright_provider_part_02_1.writeBrowserTelemetryLogs)({
            artifactDir: workOrder.options.artifactDir,
            projectName: project.name,
            checkName: name,
            index,
            consoleMessages,
            dialogMessages,
            popupMessages,
            networkRequests,
        });
        if (downloadPromises.length)
            await Promise.all(downloadPromises);
        browserArtifacts.push(...(0, playwright_provider_part_02_1.downloadArtifacts)(downloads));
        browserArtifacts.push(...await (0, playwright_provider_part_02_1.finalizePlaywrightBrowserArtifacts)({
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
            actionEffects,
            ...telemetryLogs,
            adversarial: check.adversarial === true,
            probeType: check.probeType || check.probe_type,
            context: check.context,
        };
    }
    catch (error) {
        const finalState = await (0, playwright_provider_part_01_1.capturePageFinalState)(page, secretBindings);
        if (popupCapturePromises.length)
            await Promise.all(popupCapturePromises).catch(() => []);
        if (!normalScreenshotRequested) {
            const failureShots = await (0, failure_screenshots_1.writePlaywrightFailureScreenshot)({
                page,
                artifactDir: context.workOrder.options.artifactDir,
                projectName: project.name,
                checkName: name,
                index,
                failedStep: steps.find(step => step.status === "failed"),
            }).catch(() => []);
            screenshotRefs.push(...failureShots);
            screenshots.push(...failureShots.map(item => item.path));
        }
        pageSnapshots.push(...await (0, playwright_provider_part_02_1.writePlaywrightPageSnapshots)(page, context.workOrder.options.artifactDir, project.name, name, index, secretBindings).catch(() => []));
        browserArtifacts.push(...await (0, accessibility_snapshot_artifacts_1.writePlaywrightAccessibilitySnapshotArtifact)(page, context.workOrder.options.artifactDir, project.name, name, index, value => (0, authentication_1.redactBrowserSensitiveText)(value, secretBindings)).catch(() => []));
        const telemetryLogs = (0, playwright_provider_part_02_1.writeBrowserTelemetryLogs)({
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
            if (downloadPromises.length)
                await Promise.all(downloadPromises);
            browserArtifacts.push(...(0, playwright_provider_part_02_1.downloadArtifacts)(downloads));
            browserArtifacts.push(...await (0, playwright_provider_part_02_1.finalizePlaywrightBrowserArtifacts)({
                browserContext,
                page,
                traceStarted,
                tracePath,
                harPath,
                collectVideo: collectBrowserVideo,
                lifecycle: context.runtime.browserResourceLifecycle,
                lifecycleResourceId,
            }));
        }
        else {
            try {
                await page?.context?.().close?.();
                if (lifecycleResourceId)
                    context.runtime.browserResourceLifecycle?.released(lifecycleResourceId);
            }
            catch (closeError) {
                if (lifecycleResourceId)
                    context.runtime.browserResourceLifecycle?.cleanupFailed(lifecycleResourceId, closeError.message || String(closeError));
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
            actionEffects,
            ...telemetryLogs,
            adversarial: check.adversarial === true,
            probeType: check.probeType || check.probe_type,
            context: check.context,
            error: (0, authentication_1.redactBrowserSensitiveText)(error.message || String(error), secretBindings),
        };
    }
}
//# sourceMappingURL=playwright-provider-part-03.js.map