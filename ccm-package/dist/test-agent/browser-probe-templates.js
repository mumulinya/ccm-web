"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildAdversarialBrowserProbeChecks = buildAdversarialBrowserProbeChecks;
const utils_1 = require("./utils");
function text(value) {
    return String(value || "").trim();
}
function kindOf(template) {
    return text(template.kind || template.type || template.template || template.probeType || template.probe_type).toLowerCase().replace(/[\s:-]+/g, "_");
}
function templateName(template, fallback) {
    return text(template.name || template.title) || fallback;
}
function templateUrl(template) {
    return text(template.url || template.targetUrl || template.target_url);
}
function probeType(template, fallback) {
    return text(template.probeType || template.probe_type || template.kind || template.type || template.template) || fallback;
}
function setupActions(template) {
    return (0, utils_1.asArray)(template.setupActions || template.setup_actions || template.actions).filter(item => item && typeof item === "object");
}
function explicitAssertions(template) {
    return (0, utils_1.asArray)(template.assertions || template.expectations).filter(item => item && typeof item === "object");
}
function gotoAction(url) {
    return url ? [{ type: "goto", url, waitUntil: "domcontentloaded" }] : [];
}
function fillAction(field) {
    return {
        ...field,
        type: "fill",
        value: String(field.value ?? field.text ?? ""),
    };
}
function clickAction(action) {
    if (!action || typeof action !== "object")
        return null;
    return {
        ...action,
        type: action.type || "click",
    };
}
function defaultAssertions(template) {
    const assertions = [];
    const expectedUrlIncludes = text(template.expectedUrlIncludes || template.expected_url_includes);
    const expectedText = text(template.expectedText || template.expected_text);
    if (expectedUrlIncludes)
        assertions.push({ type: "urlIncludes", text: expectedUrlIncludes });
    if (expectedText)
        assertions.push({ type: "visible", text: expectedText });
    return assertions;
}
function withConsoleAssertion(assertions) {
    if (assertions.some(item => item.type === "consoleNoErrors" || item.assertion === "console_no_errors"))
        return assertions;
    return [...assertions, { type: "consoleNoErrors" }];
}
function boundedRepeat(value) {
    const repeat = Number(value || 2);
    if (!Number.isFinite(repeat))
        return 2;
    return Math.max(2, Math.min(10, Math.floor(repeat)));
}
function invalidFormInput(template) {
    const url = templateUrl(template);
    const fields = (0, utils_1.asArray)(template.fields).filter(item => item && typeof item === "object");
    const submit = clickAction(template.submit);
    const actions = [
        ...gotoAction(url),
        ...setupActions(template),
        ...fields.map(fillAction),
        ...(submit ? [submit] : []),
    ];
    return {
        name: templateName(template, "Invalid form input"),
        url,
        actions,
        assertions: withConsoleAssertion([
            ...defaultAssertions(template),
            ...explicitAssertions(template),
        ]),
        screenshot: template.screenshot !== false,
        adversarial: true,
        probeType: probeType(template, "invalid_form_input"),
        probe_type: probeType(template, "invalid_form_input"),
    };
}
function repeatedClick(template) {
    const url = templateUrl(template);
    const target = clickAction(template.target);
    const repeat = boundedRepeat(template.repeat);
    const actions = [
        ...gotoAction(url),
        ...setupActions(template),
        ...(target ? Array.from({ length: repeat }, () => ({ ...target })) : []),
    ];
    return {
        name: templateName(template, "Repeated click is safe"),
        url,
        actions,
        assertions: withConsoleAssertion([
            ...defaultAssertions(template),
            ...explicitAssertions(template),
        ]),
        screenshot: template.screenshot !== false,
        adversarial: true,
        probeType: probeType(template, "repeated_click"),
        probe_type: probeType(template, "repeated_click"),
    };
}
function refreshPersistence(template) {
    const url = templateUrl(template);
    const stateAssertions = (0, utils_1.asArray)(template.stateAssertions || template.state_assertions).filter(item => item && typeof item === "object");
    return {
        name: templateName(template, "State persists after refresh"),
        url,
        actions: [
            ...gotoAction(url),
            ...setupActions(template),
            { type: "reload", waitUntil: "domcontentloaded" },
        ],
        assertions: withConsoleAssertion([
            ...stateAssertions,
            ...defaultAssertions(template),
            ...explicitAssertions(template),
        ]),
        screenshot: template.screenshot !== false,
        adversarial: true,
        probeType: probeType(template, "refresh_persistence"),
        probe_type: probeType(template, "refresh_persistence"),
    };
}
function buildAdversarialBrowserProbeChecks(input) {
    const checks = [];
    for (let index = 0; index < input.templates.length; index += 1) {
        const template = input.templates[index];
        const kind = kindOf(template);
        if (kind === "invalid_form_input" || kind === "invalid_form" || kind === "invalid_input") {
            checks.push(invalidFormInput(template));
        }
        else if (kind === "repeated_click" || kind === "double_click" || kind === "idempotent_click") {
            checks.push(repeatedClick(template));
        }
        else if (kind === "refresh_persistence" || kind === "reload_persistence" || kind === "state_persistence") {
            checks.push(refreshPersistence(template));
        }
        else {
            input.issues?.push({
                severity: "warning",
                code: "unsupported_browser_probe_template",
                message: `Browser probe template ${index + 1} has unsupported kind "${kind || "(missing)"}".`,
                project: input.project,
            });
        }
    }
    return checks;
}
//# sourceMappingURL=browser-probe-templates.js.map