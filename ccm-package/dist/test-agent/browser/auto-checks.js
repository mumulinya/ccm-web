"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AUTO_BROWSER_SMOKE_PROBE_TYPE = void 0;
exports.autoPageContentAssertion = autoPageContentAssertion;
exports.buildAutoBrowserSmokeCheck = buildAutoBrowserSmokeCheck;
exports.buildAcceptancePathBrowserSmokeChecks = buildAcceptancePathBrowserSmokeChecks;
exports.buildBrowserChecksForProject = buildBrowserChecksForProject;
const utils_1 = require("../utils");
const acceptance_derived_checks_1 = require("./acceptance-derived-checks");
const acceptance_clipboard_flows_1 = require("./acceptance-clipboard-flows");
const acceptance_click_flows_1 = require("./acceptance-click-flows");
const acceptance_dialog_flows_1 = require("./acceptance-dialog-flows");
const acceptance_drag_flows_1 = require("./acceptance-drag-flows");
const acceptance_download_flows_1 = require("./acceptance-download-flows");
const acceptance_form_flows_1 = require("./acceptance-form-flows");
const acceptance_history_flows_1 = require("./acceptance-history-flows");
const acceptance_hover_flows_1 = require("./acceptance-hover-flows");
const acceptance_keyboard_flows_1 = require("./acceptance-keyboard-flows");
const acceptance_network_state_flows_1 = require("./acceptance-network-state-flows");
const acceptance_popup_flows_1 = require("./acceptance-popup-flows");
const acceptance_repeated_click_checks_1 = require("./acceptance-repeated-click-checks");
const acceptance_responsive_checks_1 = require("./acceptance-responsive-checks");
const acceptance_scroll_flows_1 = require("./acceptance-scroll-flows");
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
    const acceptanceAssertions = (0, acceptance_derived_checks_1.buildAcceptanceDerivedBrowserAssertions)(acceptanceCriteria).map(item => item.assertion);
    return buildAutoBrowserSmokeCheckForUrl(project, project.targetUrl, acceptanceAssertions, acceptanceCriteria);
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
    const formFlowChecks = (0, acceptance_form_flows_1.buildAcceptanceFormFlowBrowserChecks)(project, acceptanceCriteria);
    const clipboardFlowChecks = (0, acceptance_clipboard_flows_1.buildAcceptanceClipboardFlowBrowserChecks)(project, acceptanceCriteria);
    const dialogFlowChecks = (0, acceptance_dialog_flows_1.buildAcceptanceDialogFlowBrowserChecks)(project, acceptanceCriteria);
    const dragFlowChecks = (0, acceptance_drag_flows_1.buildAcceptanceDragFlowBrowserChecks)(project, acceptanceCriteria);
    const popupFlowChecks = (0, acceptance_popup_flows_1.buildAcceptancePopupFlowBrowserChecks)(project, acceptanceCriteria);
    const downloadFlowChecks = (0, acceptance_download_flows_1.buildAcceptanceDownloadFlowBrowserChecks)(project, acceptanceCriteria);
    const uploadFlowChecks = (0, acceptance_upload_flows_1.buildAcceptanceUploadFlowBrowserChecks)(project, acceptanceCriteria);
    const repeatedClickChecks = (0, acceptance_repeated_click_checks_1.buildAcceptanceRepeatedClickBrowserChecks)(project, acceptanceCriteria);
    const keyboardFlowChecks = (0, acceptance_keyboard_flows_1.buildAcceptanceKeyboardFlowBrowserChecks)(project, acceptanceCriteria);
    const networkStateFlowChecks = (0, acceptance_network_state_flows_1.buildAcceptanceNetworkStateFlowBrowserChecks)(project, acceptanceCriteria);
    const historyFlowChecks = (0, acceptance_history_flows_1.buildAcceptanceHistoryFlowBrowserChecks)(project, acceptanceCriteria);
    const clickFlowChecks = (0, acceptance_click_flows_1.buildAcceptanceClickFlowBrowserChecks)(project, acceptanceCriteria.filter(criterion => !(0, acceptance_repeated_click_checks_1.acceptanceRepeatedClickIntent)(criterion) && !(0, acceptance_keyboard_flows_1.acceptanceKeyboardIntent)(criterion) && !(0, acceptance_clipboard_flows_1.acceptanceClipboardIntent)(criterion) && !(0, acceptance_dialog_flows_1.acceptanceDialogIntent)(criterion) && !(0, acceptance_popup_flows_1.acceptancePopupIntent)(criterion) && !(0, acceptance_history_flows_1.acceptanceHistoryIntent)(criterion)));
    const hoverFlowChecks = (0, acceptance_hover_flows_1.buildAcceptanceHoverFlowBrowserChecks)(project, acceptanceCriteria);
    const scrollFlowChecks = (0, acceptance_scroll_flows_1.buildAcceptanceScrollFlowBrowserChecks)(project, acceptanceCriteria);
    const responsiveChecks = (0, acceptance_responsive_checks_1.buildAcceptanceResponsiveBrowserChecks)(project, acceptanceCriteria);
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
    for (const check of clipboardFlowChecks) {
        generatedFlowUrls.add(normalizedUrlKey(check.url || ""));
        for (const assertion of check.assertions || []) {
            if (assertion.type !== "urlIncludes")
                continue;
            const urlPath = String(assertion.text || assertion.value || "");
            if (urlPath)
                generatedFlowUrls.add(normalizedUrlKey((0, utils_1.resolveUrl)(project.targetUrl, urlPath)));
        }
    }
    for (const check of dialogFlowChecks) {
        generatedFlowUrls.add(normalizedUrlKey(check.url || ""));
        for (const assertion of check.assertions || []) {
            if (assertion.type !== "urlIncludes")
                continue;
            const urlPath = String(assertion.text || assertion.value || "");
            if (urlPath)
                generatedFlowUrls.add(normalizedUrlKey((0, utils_1.resolveUrl)(project.targetUrl, urlPath)));
        }
    }
    for (const check of dragFlowChecks) {
        generatedFlowUrls.add(normalizedUrlKey(check.url || ""));
        for (const assertion of check.assertions || []) {
            if (assertion.type !== "urlIncludes")
                continue;
            const urlPath = String(assertion.text || assertion.value || "");
            if (urlPath)
                generatedFlowUrls.add(normalizedUrlKey((0, utils_1.resolveUrl)(project.targetUrl, urlPath)));
        }
    }
    for (const check of popupFlowChecks) {
        generatedFlowUrls.add(normalizedUrlKey(check.url || ""));
        for (const assertion of check.assertions || []) {
            if (assertion.type !== "urlIncludes" && assertion.type !== "popupUrlIncludes")
                continue;
            const urlPath = String(assertion.text || assertion.value || assertion.url || assertion.urlIncludes || assertion.url_includes || "");
            if (urlPath)
                generatedFlowUrls.add(normalizedUrlKey((0, utils_1.resolveUrl)(project.targetUrl, urlPath)));
        }
    }
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
    for (const check of repeatedClickChecks) {
        generatedFlowUrls.add(normalizedUrlKey(check.url || ""));
        for (const assertion of check.assertions || []) {
            if (assertion.type !== "urlIncludes")
                continue;
            const urlPath = String(assertion.text || assertion.value || "");
            if (urlPath)
                generatedFlowUrls.add(normalizedUrlKey((0, utils_1.resolveUrl)(project.targetUrl, urlPath)));
        }
    }
    for (const check of keyboardFlowChecks) {
        generatedFlowUrls.add(normalizedUrlKey(check.url || ""));
        for (const assertion of check.assertions || []) {
            if (assertion.type !== "urlIncludes")
                continue;
            const urlPath = String(assertion.text || assertion.value || "");
            if (urlPath)
                generatedFlowUrls.add(normalizedUrlKey((0, utils_1.resolveUrl)(project.targetUrl, urlPath)));
        }
    }
    for (const check of networkStateFlowChecks) {
        generatedFlowUrls.add(normalizedUrlKey(check.url || ""));
        for (const assertion of check.assertions || []) {
            if (assertion.type !== "urlIncludes")
                continue;
            const urlPath = String(assertion.text || assertion.value || "");
            if (urlPath)
                generatedFlowUrls.add(normalizedUrlKey((0, utils_1.resolveUrl)(project.targetUrl, urlPath)));
        }
    }
    for (const check of historyFlowChecks) {
        generatedFlowUrls.add(normalizedUrlKey(check.url || ""));
        for (const action of check.actions || []) {
            if (action.type !== "waitForUrl")
                continue;
            const urlPath = String(action.text || action.value || action.url || "");
            if (urlPath)
                generatedFlowUrls.add(normalizedUrlKey((0, utils_1.resolveUrl)(project.targetUrl, urlPath)));
        }
    }
    for (const check of clickFlowChecks) {
        generatedFlowUrls.add(normalizedUrlKey(check.url || ""));
        for (const assertion of check.assertions || []) {
            if (assertion.type !== "urlIncludes")
                continue;
            const urlPath = String(assertion.text || assertion.value || "");
            if (urlPath)
                generatedFlowUrls.add(normalizedUrlKey((0, utils_1.resolveUrl)(project.targetUrl, urlPath)));
        }
    }
    for (const check of hoverFlowChecks) {
        generatedFlowUrls.add(normalizedUrlKey(check.url || ""));
        for (const assertion of check.assertions || []) {
            if (assertion.type !== "urlIncludes")
                continue;
            const urlPath = String(assertion.text || assertion.value || "");
            if (urlPath)
                generatedFlowUrls.add(normalizedUrlKey((0, utils_1.resolveUrl)(project.targetUrl, urlPath)));
        }
    }
    for (const check of scrollFlowChecks) {
        generatedFlowUrls.add(normalizedUrlKey(check.url || ""));
        for (const assertion of check.assertions || []) {
            if (assertion.type !== "urlIncludes")
                continue;
            const urlPath = String(assertion.text || assertion.value || "");
            if (urlPath)
                generatedFlowUrls.add(normalizedUrlKey((0, utils_1.resolveUrl)(project.targetUrl, urlPath)));
        }
    }
    for (const check of responsiveChecks)
        generatedFlowUrls.add(normalizedUrlKey(check.url || ""));
    const pathChecks = buildAcceptancePathBrowserSmokeChecks(project, acceptanceCriteria);
    const remainingPathChecks = pathChecks.filter(check => !generatedFlowUrls.has(normalizedUrlKey(check.url || "")));
    if (formFlowChecks.length || clipboardFlowChecks.length || dialogFlowChecks.length || dragFlowChecks.length || popupFlowChecks.length || downloadFlowChecks.length || uploadFlowChecks.length || repeatedClickChecks.length || keyboardFlowChecks.length || networkStateFlowChecks.length || historyFlowChecks.length || clickFlowChecks.length || hoverFlowChecks.length || scrollFlowChecks.length || responsiveChecks.length || remainingPathChecks.length) {
        return [...formFlowChecks, ...clipboardFlowChecks, ...dialogFlowChecks, ...dragFlowChecks, ...popupFlowChecks, ...downloadFlowChecks, ...uploadFlowChecks, ...repeatedClickChecks, ...keyboardFlowChecks, ...networkStateFlowChecks, ...historyFlowChecks, ...clickFlowChecks, ...hoverFlowChecks, ...scrollFlowChecks, ...responsiveChecks, ...remainingPathChecks];
    }
    const auto = buildAutoBrowserSmokeCheck(project, acceptanceCriteria);
    return auto ? [auto] : [];
}
//# sourceMappingURL=auto-checks.js.map