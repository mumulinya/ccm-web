"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ACCEPTANCE_RESPONSIVE_PROBE_TYPE = void 0;
exports.buildAcceptanceResponsiveBrowserChecks = buildAcceptanceResponsiveBrowserChecks;
const utils_1 = require("../utils");
const acceptance_derived_checks_1 = require("./acceptance-derived-checks");
exports.ACCEPTANCE_RESPONSIVE_PROBE_TYPE = "acceptance_responsive_viewport";
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
function responsiveIntent(text) {
    return /\b(?:mobile|responsive|phone|iphone|android|handset|small\s+screen|narrow\s+screen|viewport|no\s+horizontal\s+overflow|horizontal\s+scroll)\b/i.test(text)
        || /(?:移动端|手机|响应式|自适应|小屏|横向滚动|横向溢出)/.test(text);
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
function addUniqueAssertion(items, seen, assertion) {
    const key = browserAssertionKey(assertion);
    if (seen.has(key))
        return;
    seen.add(key);
    items.push(assertion);
}
function checkName(project, url) {
    try {
        const parsed = new URL(url);
        return `Responsive mobile smoke: ${project.name} ${parsed.pathname || "/"}`;
    }
    catch {
        return `Responsive mobile smoke: ${project.name}`;
    }
}
function buildResponsiveCheck(project, url, assertions, criteria) {
    const seenAssertions = new Set();
    const scopedAssertions = [];
    addUniqueAssertion(scopedAssertions, seenAssertions, { type: "pageNotBlank" });
    addUniqueAssertion(scopedAssertions, seenAssertions, { type: "noHorizontalOverflow" });
    for (const assertion of assertions)
        addUniqueAssertion(scopedAssertions, seenAssertions, assertion);
    addUniqueAssertion(scopedAssertions, seenAssertions, { type: "consoleNoErrors" });
    addUniqueAssertion(scopedAssertions, seenAssertions, { type: "networkNoErrors" });
    return {
        name: checkName(project, url),
        url,
        probeType: exports.ACCEPTANCE_RESPONSIVE_PROBE_TYPE,
        context: {
            source: "acceptance_criteria",
            generatedBy: exports.ACCEPTANCE_RESPONSIVE_PROBE_TYPE,
            acceptanceCriteria: criteria,
            viewport: "mobile",
        },
        viewportWidth: 390,
        viewport_width: 390,
        viewportHeight: 844,
        viewport_height: 844,
        isMobile: true,
        is_mobile: true,
        actions: [
            { type: "goto", url, waitUntil: "domcontentloaded" },
            { type: "waitForTimeout", value: "250" },
        ],
        assertions: scopedAssertions,
        screenshot: true,
    };
}
function buildAcceptanceResponsiveBrowserChecks(project, acceptanceCriteria = []) {
    if (!project.targetUrl)
        return [];
    const grouped = (0, acceptance_derived_checks_1.buildAcceptanceDerivedBrowserAssertionsByCriterion)(acceptanceCriteria);
    const byUrl = new Map();
    for (const group of grouped) {
        if (!responsiveIntent(group.criterion))
            continue;
        const scopedAssertions = group.assertions
            .filter(item => item.reason !== "explicit_url_path")
            .map(item => item.assertion);
        const pathAssertions = group.assertions.filter(item => item.reason === "explicit_url_path");
        const urls = pathAssertions.length
            ? pathAssertions.map(item => (0, utils_1.resolveUrl)(project.targetUrl, String(item.assertion.text || item.assertion.value || ""))).filter(Boolean)
            : [project.targetUrl];
        for (const url of urls) {
            const key = normalizedUrlKey(url);
            let entry = byUrl.get(key);
            if (!entry) {
                entry = { url, assertions: [], seenAssertions: new Set(), criteria: [] };
                byUrl.set(key, entry);
            }
            if (!entry.criteria.includes(group.criterion))
                entry.criteria.push(group.criterion);
            for (const assertion of scopedAssertions)
                addUniqueAssertion(entry.assertions, entry.seenAssertions, assertion);
            for (const pathAssertion of pathAssertions)
                addUniqueAssertion(entry.assertions, entry.seenAssertions, pathAssertion.assertion);
        }
    }
    return Array.from(byUrl.values()).map(entry => buildResponsiveCheck(project, entry.url, entry.assertions, entry.criteria));
}
//# sourceMappingURL=acceptance-responsive-checks.js.map