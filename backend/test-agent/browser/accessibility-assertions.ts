import { BrowserAssertionSpec } from "../types";
import { browserTargetDetail } from "./semantic-locator";

function text(value: any) {
  return String(value ?? "").trim();
}

function expectedName(assertion: BrowserAssertionSpec) {
  return text(
    assertion.value
    ?? assertion.text
    ?? (assertion as any).accessibleName
    ?? (assertion as any).accessible_name
    ?? assertion.name,
  );
}

function expectedDescription(assertion: BrowserAssertionSpec) {
  return text(
    assertion.value
    ?? assertion.text
    ?? (assertion as any).description
    ?? (assertion as any).accessibleDescription
    ?? (assertion as any).accessible_description
    ?? (assertion as any).descriptionIncludes
    ?? (assertion as any).description_includes,
  );
}

function expectedSnapshot(assertion: BrowserAssertionSpec) {
  return text(assertion.value ?? assertion.text ?? (assertion as any).snapshotIncludes ?? (assertion as any).snapshot_includes);
}

export function browserAccessibilityAssertionExpected(assertion: BrowserAssertionSpec) {
  if (assertion.type === "accessibleDescriptionEquals" || assertion.type === "accessibleDescriptionIncludes") return expectedDescription(assertion);
  if (assertion.type === "ariaSnapshotIncludes") return expectedSnapshot(assertion);
  return expectedName(assertion);
}

export function browserAccessibilityAssertionDetail(assertion: BrowserAssertionSpec) {
  const expected = browserAccessibilityAssertionExpected(assertion);
  const target = browserTargetDetail(assertion);
  const subject = assertion.type === "ariaSnapshotIncludes"
    ? "aria snapshot"
    : assertion.type === "accessibleDescriptionEquals" || assertion.type === "accessibleDescriptionIncludes"
      ? "accessible description"
      : "accessible name";
  const comparison = assertion.type.endsWith("Includes") ? "expected substring length" : "expected length";
  return `${target}${target ? "; " : ""}${subject}; ${comparison}=${expected ? expected.length : "(missing)"}`;
}

function compareActual(assertion: BrowserAssertionSpec, actual: string, expected: string) {
  if (assertion.type.endsWith("Includes")) return actual.includes(expected);
  return actual === expected;
}

async function readAccessibilityInfo(locator: any, timeout: number) {
  await locator.waitFor({ state: "attached", timeout });
  return await locator.evaluate((element: any) => {
    const normalize = (value: any) => String(value ?? "").replace(/\s+/g, " ").trim();
    const doc = element.ownerDocument || (globalThis as any).document;
    const byIdText = (ids: string) => normalize(ids.split(/\s+/).map(id => doc.getElementById(id)?.textContent || "").join(" "));
    const attr = (name: string) => element.getAttribute(name) || "";
    const escapeCss = (value: string) => {
      const css = (globalThis as any).CSS;
      if (css && typeof css.escape === "function") return css.escape(value);
      return String(value).replace(/["\\]/g, "\\$&");
    };
    const labelsText = () => {
      const anyElement = element as any;
      if (anyElement.labels && anyElement.labels.length) {
        return normalize(Array.from(anyElement.labels).map((label: any) => label.textContent || "").join(" "));
      }
      const id = attr("id");
      if (!id) return "";
      return normalize(Array.from(doc.querySelectorAll(`label[for="${escapeCss(id)}"]`)).map((label: any) => label.textContent || "").join(" "));
    };
    const explicitRole = attr("role");
    const tag = element.tagName.toLowerCase();
    const inputType = tag === "input" ? String((element as any).type || "text").toLowerCase() : "";
    const implicitRole = () => {
      if (tag === "button") return "button";
      if (tag === "a" && attr("href")) return "link";
      if (tag === "textarea") return "textbox";
      if (tag === "select") return "combobox";
      if (tag === "img") return "img";
      if (/^h[1-6]$/.test(tag)) return "heading";
      if (tag === "ul" || tag === "ol") return "list";
      if (tag === "li") return "listitem";
      if (tag === "table") return "table";
      if (tag === "tr") return "row";
      if (tag === "td") return "cell";
      if (tag === "th") return "columnheader";
      if (tag === "input" && inputType === "checkbox") return "checkbox";
      if (tag === "input" && inputType === "radio") return "radio";
      if (tag === "input" && ["button", "submit", "reset"].includes(inputType)) return "button";
      if (tag === "input") return "textbox";
      return "";
    };
    const name = () => {
      const labelledBy = attr("aria-labelledby");
      if (labelledBy) return byIdText(labelledBy);
      const ariaLabel = attr("aria-label");
      if (ariaLabel) return normalize(ariaLabel);
      const labelText = labelsText();
      if (labelText) return labelText;
      if (tag === "img" || inputType === "image") {
        const alt = attr("alt");
        if (alt) return normalize(alt);
      }
      if (inputType === "button" || inputType === "submit" || inputType === "reset") {
        const value = (element as any).value;
        if (value) return normalize(value);
      }
      const textContent = normalize((element as any).innerText || element.textContent || "");
      if (textContent) return textContent;
      return normalize(attr("title") || attr("placeholder"));
    };
    const description = () => {
      const describedBy = attr("aria-describedby");
      if (describedBy) return byIdText(describedBy);
      const ariaDescription = attr("aria-description");
      if (ariaDescription) return normalize(ariaDescription);
      return "";
    };
    return {
      role: explicitRole || implicitRole(),
      name: name(),
      description: description(),
    };
  });
}

async function readAriaSnapshot(locator: any, timeout: number) {
  await locator.waitFor({ state: "attached", timeout });
  if (typeof locator.ariaSnapshot === "function") {
    return String(await locator.ariaSnapshot({ timeout }) || "");
  }
  const info = await readAccessibilityInfo(locator, timeout);
  return `${info.role || "element"} "${info.name || ""}"${info.description ? ` description="${info.description}"` : ""}`;
}

export async function waitForBrowserAccessibilityAssertion(locator: any, assertion: BrowserAssertionSpec, timeout: number) {
  const expected = browserAccessibilityAssertionExpected(assertion);
  if (!expected) throw new Error(`${assertion.type} requires text/value/accessibleName/description/snapshotIncludes.`);
  const deadline = Date.now() + Math.max(1, timeout);
  let actual = "";
  while (Date.now() <= deadline) {
    if (assertion.type === "ariaSnapshotIncludes") {
      actual = await readAriaSnapshot(locator, timeout).catch(() => actual);
      if (actual.includes(expected)) return { passed: true, actualLength: actual.length, expectedLength: expected.length };
    } else {
      const info = await readAccessibilityInfo(locator, timeout).catch(() => null);
      actual = assertion.type === "accessibleDescriptionEquals" || assertion.type === "accessibleDescriptionIncludes"
        ? String(info?.description || "")
        : String(info?.name || "");
      if (compareActual(assertion, actual, expected)) return { passed: true, actualLength: actual.length, expectedLength: expected.length };
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  return { passed: false, actualLength: actual.length, expectedLength: expected.length };
}
