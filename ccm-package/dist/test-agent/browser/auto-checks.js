"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AUTO_BROWSER_SMOKE_PROBE_TYPE = void 0;
exports.autoPageContentAssertion = autoPageContentAssertion;
exports.buildAutoBrowserSmokeCheck = buildAutoBrowserSmokeCheck;
exports.buildAcceptancePathBrowserSmokeChecks = buildAcceptancePathBrowserSmokeChecks;
exports.buildBrowserChecksForProject = buildBrowserChecksForProject;
const utils_1 = require("../utils");
const acceptance_derived_checks_1 = require("./acceptance-derived-checks");
const acceptance_download_flows_1 = require("./acceptance-download-flows");
const acceptance_form_flows_1 = require("./acceptance-form-flows");
const acceptance_upload_flows_1 = require("./acceptance-upload-flows");
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
function buildAutoBrowserSmokeCheckForUrl(project, url, acceptanceAssertions) {
    return {
        name: autoSmokeName(project, url),
        url,
        probeType: exports.AUTO_BROWSER_SMOKE_PROBE_TYPE,
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
    return `${assertion.type}:${String(assertion.text || assertion.value || assertion.expression || "").toLowerCase()}`;
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
    const acceptanceAssertions = (0, acceptance_derived_checks_1.buildAcceptanceDerivedBrowserAssertions)(acceptanceCriteria).map(item => item.assertion);
    return buildAutoBrowserSmokeCheckForUrl(project, project.targetUrl, acceptanceAssertions);
}
function buildAcceptancePathBrowserSmokeChecks(project, acceptanceCriteria = []) {
    if (!project.targetUrl)
        return [];
    const grouped = (0, acceptance_derived_checks_1.buildAcceptanceDerivedBrowserAssertionsByCriterion)(acceptanceCriteria);
    const seen = new Set([normalizedUrlKey(project.targetUrl)]);
    const checksByUrl = new Map();
    for (const group of grouped) {
        const textAssertions = group.assertions
            .filter(item => item.reason === "quoted_text")
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
                entry = { url, assertions: [], seenAssertions: new Set() };
                checksByUrl.set(key, entry);
            }
            for (const assertion of textAssertions) {
                addUniqueBrowserAssertion(entry.assertions, entry.seenAssertions, assertion);
            }
            addUniqueBrowserAssertion(entry.assertions, entry.seenAssertions, pathItem.assertion);
        }
    }
    return Array.from(checksByUrl.values()).map(entry => buildAutoBrowserSmokeCheckForUrl(project, entry.url, entry.assertions));
}
function buildBrowserChecksForProject(project, acceptanceCriteria = []) {
    const explicit = [...project.browserChecks, ...project.adversarialBrowserChecks];
    if (explicit.length)
        return explicit;
    const formFlowChecks = (0, acceptance_form_flows_1.buildAcceptanceFormFlowBrowserChecks)(project, acceptanceCriteria);
    const downloadFlowChecks = (0, acceptance_download_flows_1.buildAcceptanceDownloadFlowBrowserChecks)(project, acceptanceCriteria);
    const uploadFlowChecks = (0, acceptance_upload_flows_1.buildAcceptanceUploadFlowBrowserChecks)(project, acceptanceCriteria);
    const formFlowUrls = new Set();
    for (const check of formFlowChecks) {
        formFlowUrls.add(normalizedUrlKey(check.url || ""));
        for (const assertion of check.assertions || []) {
            if (assertion.type !== "urlIncludes")
                continue;
            const urlPath = String(assertion.text || assertion.value || "");
            if (urlPath)
                formFlowUrls.add(normalizedUrlKey((0, utils_1.resolveUrl)(project.targetUrl, urlPath)));
        }
    }
    const generatedFlowUrls = new Set(formFlowUrls);
    for (const check of downloadFlowChecks) {
        generatedFlowUrls.add(normalizedUrlKey(check.url || ""));
        for (const assertion of check.assertions || []) {
            if (assertion.type !== "urlIncludes")
                continue;
            const urlPath = String(assertion.text || assertion.value || "");
            if (urlPath)
                generatedFlowUrls.add(normalizedUrlKey((0, utils_1.resolveUrl)(project.targetUrl, urlPath)));
        }
    }
    for (const check of uploadFlowChecks) {
        generatedFlowUrls.add(normalizedUrlKey(check.url || ""));
        for (const assertion of check.assertions || []) {
            if (assertion.type !== "urlIncludes")
                continue;
            const urlPath = String(assertion.text || assertion.value || "");
            if (urlPath)
                generatedFlowUrls.add(normalizedUrlKey((0, utils_1.resolveUrl)(project.targetUrl, urlPath)));
        }
    }
    const pathChecks = buildAcceptancePathBrowserSmokeChecks(project, acceptanceCriteria);
    const remainingPathChecks = pathChecks.filter(check => !generatedFlowUrls.has(normalizedUrlKey(check.url || "")));
    if (formFlowChecks.length || downloadFlowChecks.length || uploadFlowChecks.length || remainingPathChecks.length)
        return [...formFlowChecks, ...downloadFlowChecks, ...uploadFlowChecks, ...remainingPathChecks];
    const auto = buildAutoBrowserSmokeCheck(project, acceptanceCriteria);
    return auto ? [auto] : [];
}
//# sourceMappingURL=auto-checks.js.map