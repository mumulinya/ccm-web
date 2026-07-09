import { BrowserAssertionSpec } from "../types";
import { browserTargetDetail } from "./semantic-locator";

const ARIA_STATE_EXPECTATIONS: Record<string, { attribute: string; expected: string; missingMatches?: boolean }> = {
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

export function isBrowserAriaStateAssertion(assertion: BrowserAssertionSpec) {
  return Object.prototype.hasOwnProperty.call(ARIA_STATE_EXPECTATIONS, assertion.type);
}

function expectedStateValue(assertion: BrowserAssertionSpec, fallback: string) {
  const explicit = String(assertion.value ?? assertion.text ?? "").trim();
  return explicit ? explicit.toLowerCase() : fallback;
}

function matchesState(actual: string | null, expected: string, missingMatches?: boolean) {
  if (actual === null || actual === undefined || actual === "") return Boolean(missingMatches && expected === "false");
  return String(actual).trim().toLowerCase() === expected;
}

export function browserAriaStateAssertionDetail(assertion: BrowserAssertionSpec) {
  const expectation = ARIA_STATE_EXPECTATIONS[assertion.type];
  if (!expectation) return browserTargetDetail(assertion);
  const expected = expectedStateValue(assertion, expectation.expected);
  const target = browserTargetDetail(assertion);
  return `${target}${target ? "; " : ""}${expectation.attribute}=${expected}`;
}

async function readAriaState(locator: any, attribute: string, timeout: number) {
  await locator.waitFor({ state: "attached", timeout });
  const value = await locator.evaluate((element: any, attr: string) => element.getAttribute(attr), attribute);
  return value === undefined || value === null ? null : String(value);
}

export async function waitForBrowserAriaStateAssertion(locator: any, assertion: BrowserAssertionSpec, timeout: number) {
  const expectation = ARIA_STATE_EXPECTATIONS[assertion.type];
  if (!expectation) throw new Error(`Unsupported ARIA state assertion: ${assertion.type}`);
  const expected = expectedStateValue(assertion, expectation.expected);
  const deadline = Date.now() + Math.max(1, timeout);
  let actual: string | null = null;
  while (Date.now() <= deadline) {
    actual = await readAriaState(locator, expectation.attribute, timeout).catch(() => actual);
    if (matchesState(actual, expected, expectation.missingMatches)) {
      return { passed: true, actual: actual ?? "(missing)", expected, attribute: expectation.attribute };
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  return { passed: false, actual: actual ?? "(missing)", expected, attribute: expectation.attribute };
}
