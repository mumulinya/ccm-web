"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isBrowserAriaStateAssertion = isBrowserAriaStateAssertion;
exports.browserAriaStateAssertionDetail = browserAriaStateAssertionDetail;
exports.waitForBrowserAriaStateAssertion = waitForBrowserAriaStateAssertion;
const semantic_locator_1 = require("./semantic-locator");
const ARIA_STATE_EXPECTATIONS = {
    ariaExpanded: { attribute: "aria-expanded", expected: "true" },
    ariaCollapsed: { attribute: "aria-expanded", expected: "false" },
    ariaPressed: { attribute: "aria-pressed", expected: "true" },
    ariaNotPressed: { attribute: "aria-pressed", expected: "false" },
    ariaSelected: { attribute: "aria-selected", expected: "true" },
    ariaNotSelected: { attribute: "aria-selected", expected: "false" },
    ariaInvalid: { attribute: "aria-invalid", expected: "true" },
    ariaValid: { attribute: "aria-invalid", expected: "false", missingMatches: true },
    ariaRequired: { attribute: "aria-required", expected: "true" },
    ariaNotRequired: { attribute: "aria-required", expected: "false", missingMatches: true },
};
function isBrowserAriaStateAssertion(assertion) {
    return Object.prototype.hasOwnProperty.call(ARIA_STATE_EXPECTATIONS, assertion.type);
}
function expectedStateValue(assertion, fallback) {
    const explicit = String(assertion.value ?? assertion.text ?? "").trim();
    return explicit ? explicit.toLowerCase() : fallback;
}
function matchesState(actual, expected, missingMatches) {
    if (actual === null || actual === undefined || actual === "")
        return Boolean(missingMatches && expected === "false");
    return String(actual).trim().toLowerCase() === expected;
}
function browserAriaStateAssertionDetail(assertion) {
    const expectation = ARIA_STATE_EXPECTATIONS[assertion.type];
    if (!expectation)
        return (0, semantic_locator_1.browserTargetDetail)(assertion);
    const expected = expectedStateValue(assertion, expectation.expected);
    const target = (0, semantic_locator_1.browserTargetDetail)(assertion);
    return `${target}${target ? "; " : ""}${expectation.attribute}=${expected}`;
}
async function readAriaState(locator, attribute, timeout) {
    await locator.waitFor({ state: "attached", timeout });
    const value = await locator.evaluate((element, attr) => element.getAttribute(attr), attribute);
    return value === undefined || value === null ? null : String(value);
}
async function waitForBrowserAriaStateAssertion(locator, assertion, timeout) {
    const expectation = ARIA_STATE_EXPECTATIONS[assertion.type];
    if (!expectation)
        throw new Error(`Unsupported ARIA state assertion: ${assertion.type}`);
    const expected = expectedStateValue(assertion, expectation.expected);
    const deadline = Date.now() + Math.max(1, timeout);
    let actual = null;
    while (Date.now() <= deadline) {
        actual = await readAriaState(locator, expectation.attribute, timeout).catch(() => actual);
        if (matchesState(actual, expected, expectation.missingMatches)) {
            return { passed: true, actual: actual ?? "(missing)", expected, attribute: expectation.attribute };
        }
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    return { passed: false, actual: actual ?? "(missing)", expected, attribute: expectation.attribute };
}
//# sourceMappingURL=aria-state-assertions.js.map