"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildSemanticLocatorPlan = buildSemanticLocatorPlan;
exports.browserTargetDetail = browserTargetDetail;
exports.resolvePlaywrightLocator = resolvePlaywrightLocator;
function text(value) {
    return String(value || "").trim();
}
function bool(value) {
    return value === undefined ? undefined : value !== false;
}
function attrEscape(value) {
    return String(value).replace(/\\/g, "\\\\").replace(/"/g, "\\\"");
}
function buildSemanticLocatorPlan(target) {
    const selector = text(target.selector || target.locator);
    if (selector)
        return { kind: "selector", value: selector };
    const testId = text(target.testId || target.test_id || target.dataTestId || target.data_testid);
    if (testId)
        return { kind: "testId", value: testId };
    const label = text(target.label);
    if (label)
        return { kind: "label", value: label, exact: bool(target.exact) };
    const placeholder = text(target.placeholder);
    if (placeholder)
        return { kind: "placeholder", value: placeholder, exact: bool(target.exact) };
    const role = text(target.role);
    if (role)
        return { kind: "role", value: role, name: text(target.name || target.text || target.value) || undefined, exact: bool(target.exact) };
    const altText = text(target.altText || target.alt_text);
    if (altText)
        return { kind: "altText", value: altText, exact: bool(target.exact) };
    const title = text(target.title);
    if (title)
        return { kind: "title", value: title, exact: bool(target.exact) };
    const visibleText = text(target.text);
    if (visibleText)
        return { kind: "text", value: visibleText, exact: bool(target.exact) };
    return null;
}
function browserTargetDetail(target) {
    const plan = buildSemanticLocatorPlan(target);
    if (!plan)
        return text(target.url || target.value || target.key);
    if (plan.kind === "role" && plan.name)
        return `${plan.kind}=${plan.value}; name=${plan.name}`;
    return `${plan.kind}=${plan.value}`;
}
function resolvePlaywrightLocator(page, target) {
    const plan = buildSemanticLocatorPlan(target);
    if (!plan)
        throw new Error("Browser target requires selector, locator, testId, label, placeholder, role, text, altText, or title.");
    if (plan.kind === "selector")
        return page.locator(plan.value);
    if (plan.kind === "testId") {
        if (typeof page.getByTestId === "function")
            return page.getByTestId(plan.value);
        const escaped = attrEscape(plan.value);
        return page.locator(`[data-testid="${escaped}"], [data-test-id="${escaped}"], [data-test="${escaped}"]`);
    }
    if (plan.kind === "label")
        return page.getByLabel(plan.value, { exact: plan.exact });
    if (plan.kind === "placeholder")
        return page.getByPlaceholder(plan.value, { exact: plan.exact });
    if (plan.kind === "role") {
        const options = plan.name ? { name: plan.name, exact: plan.exact } : undefined;
        return page.getByRole(plan.value, options);
    }
    if (plan.kind === "text")
        return page.getByText(plan.value, { exact: plan.exact });
    if (plan.kind === "altText")
        return page.getByAltText(plan.value, { exact: plan.exact });
    if (plan.kind === "title")
        return page.getByTitle(plan.value, { exact: plan.exact });
    throw new Error(`Unsupported locator kind: ${plan.kind}`);
}
//# sourceMappingURL=semantic-locator.js.map