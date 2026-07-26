"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AUTO_BROWSER_SMOKE_PROBE_TYPE = void 0;
exports.autoPageContentAssertion = autoPageContentAssertion;
exports.buildAutoBrowserSmokeCheck = buildAutoBrowserSmokeCheck;
exports.buildAcceptancePathBrowserSmokeChecks = buildAcceptancePathBrowserSmokeChecks;
exports.buildBrowserChecksForProject = buildBrowserChecksForProject;
const utils_1 = require("../utils");
const acceptance_derived_checks_1 = require("./acceptance-derived-checks");
exports.AUTO_BROWSER_SMOKE_PROBE_TYPE = "auto_target_url_smoke";
function autoPageContentAssertion() {
    return { type: "pageNotBlank" };
}
function normalizedUrlKey(url) {
    try {
        const parsed = new URL(url);
        parsed.hash = "";
        return parsed.toString().replace(/\/$/, "");
    }
    catch {
        return String(url || "").replace(/\/$/, "");
    }
}
function autoSmokeName(project, url) {
    const baseKey = normalizedUrlKey(project.targetUrl);
    const urlKey = normalizedUrlKey(url);
    if (!baseKey || baseKey === urlKey)
        return `Auto browser smoke: ${project.name}`;
    try {
        const parsed = new URL(url);
        return `Auto browser smoke: ${project.name} ${parsed.pathname || "/"}`;
    }
    catch {
        return `Auto browser smoke: ${project.name} ${url}`;
    }
}
function buildAutoBrowserSmokeCheckForUrl(project, url, acceptanceAssertions, acceptanceCriteria = [], generatedBy = exports.AUTO_BROWSER_SMOKE_PROBE_TYPE) {
    return {
        name: autoSmokeName(project, url),
        url,
        probeType: exports.AUTO_BROWSER_SMOKE_PROBE_TYPE,
        context: {
            source: "acceptance_criteria",
            generatedBy,
            acceptanceCriteria,
        },
        actions: [
            { type: "goto", url, waitUntil: "domcontentloaded" },
            { type: "waitForTimeout", value: "250" },
        ],
        assertions: [
            autoPageContentAssertion(),
            ...acceptanceAssertions,
            { type: "consoleNoErrors" },
            { type: "networkNoErrors" },
        ],
        screenshot: true,
    };
}
function browserAssertionKey(assertion) {
    return [
        assertion.type,
        assertion.selector,
        assertion.locator,
        assertion.label,
        assertion.role,
        assertion.name,
        assertion.text,
        assertion.value,
        assertion.expression,
        assertion.key,
        assertion.method,
        assertion.urlIncludes,
        assertion.url_includes,
        assertion.url,
        Array.isArray(assertion.status) ? assertion.status.join("|") : assertion.status,
        Array.isArray(assertion.statusCode) ? assertion.statusCode.join("|") : assertion.statusCode,
        Array.isArray(assertion.status_code) ? assertion.status_code.join("|") : assertion.status_code,
        assertion.resourceType,
        assertion.resource_type,
    ].map(value => String(value || "").toLowerCase()).join(":");
}
function addUniqueBrowserAssertion(items, seen, assertion) {
    const key = browserAssertionKey(assertion);
    if (seen.has(key))
        return;
    seen.add(key);
    items.push(assertion);
}
function buildAutoBrowserSmokeCheck(project, acceptanceCriteria = []) {
    if (!project.targetUrl)
        return null;
    return buildAutoBrowserSmokeCheckForUrl(project, project.targetUrl, [], acceptanceCriteria, "structured_target_url_smoke");
}
function buildAcceptancePathBrowserSmokeChecks(project, acceptanceCriteria = []) {
    if (!project.targetUrl)
        return [];
    const grouped = (0, acceptance_derived_checks_1.buildAcceptanceDerivedBrowserAssertionsByCriterion)(acceptanceCriteria);
    const seen = new Set([normalizedUrlKey(project.targetUrl)]);
    const checksByUrl = new Map();
    for (const group of grouped) {
        const scopedAssertions = group.assertions
            .filter(item => item.reason !== "explicit_url_path")
            .map(item => item.assertion);
        const pathAssertions = group.assertions.filter(item => item.reason === "explicit_url_path");
        for (const pathItem of pathAssertions) {
            const path = String(pathItem.assertion.text || pathItem.assertion.value || "");
            const url = (0, utils_1.resolveUrl)(project.targetUrl, path);
            const key = normalizedUrlKey(url);
            if (!url || seen.has(key))
                continue;
            let entry = checksByUrl.get(key);
            if (!entry) {
                entry = { url, assertions: [], seenAssertions: new Set(), criteria: [] };
                checksByUrl.set(key, entry);
            }
            if (!entry.criteria.includes(group.criterion))
                entry.criteria.push(group.criterion);
            for (const assertion of scopedAssertions) {
                addUniqueBrowserAssertion(entry.assertions, entry.seenAssertions, assertion);
            }
            addUniqueBrowserAssertion(entry.assertions, entry.seenAssertions, pathItem.assertion);
        }
    }
    return Array.from(checksByUrl.values()).map(entry => buildAutoBrowserSmokeCheckForUrl(project, entry.url, entry.assertions, entry.criteria, "acceptance_path_smoke"));
}
function buildBrowserChecksForProject(project, acceptanceCriteria = []) {
    const explicit = [...project.browserChecks, ...project.adversarialBrowserChecks];
    if (explicit.length)
        return explicit;
    const auto = buildAutoBrowserSmokeCheck(project, acceptanceCriteria);
    return auto ? [auto] : [];
}
//# sourceMappingURL=auto-checks.js.map