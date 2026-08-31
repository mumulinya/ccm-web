"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeHttpCheck = normalizeHttpCheck;
exports.normalizeBrowserCheck = normalizeBrowserCheck;
const authentication_1 = require("./browser/authentication");
const existing_session_1 = require("./browser/existing-session");
const multi_session_1 = require("./browser/multi-session");
const stability_summary_1 = require("./browser/stability-summary");
const action_effects_1 = require("./browser/action-effects");
const http_concurrency_1 = require("./http-concurrency");
const utils_1 = require("./utils");
const work_order_aliases_1 = require("./work-order-aliases");
function normalizeBrowserAction(raw, issues, project, checkName, index) {
    if (!raw || typeof raw !== "object") {
        issues.push({ severity: "error", code: "invalid_browser_action", message: `Browser action ${index + 1} in "${checkName}" must be an object.`, project });
        return null;
    }
    const type = (0, work_order_aliases_1.normalizedType)(raw.type || raw.action || raw.kind, work_order_aliases_1.BROWSER_ACTION_ALIASES);
    if (!work_order_aliases_1.BROWSER_ACTION_TYPES.has(type)) {
        issues.push({ severity: "error", code: "invalid_browser_action_type", message: `Browser action ${index + 1} in "${checkName}" has unsupported type "${type || "(missing)"}".`, project });
        return null;
    }
    const valueEnv = (0, work_order_aliases_1.text)(raw.valueEnv || raw.value_env || raw.textEnv || raw.text_env || raw.contentEnv || raw.content_env);
    if (valueEnv && !(0, authentication_1.isValidBrowserEnvironmentName)(valueEnv)) {
        issues.push({
            severity: "error",
            code: "invalid_browser_action_value_env",
            message: `Browser action ${index + 1} in "${checkName}" has invalid environment variable name "${valueEnv}".`,
            project,
        });
    }
    const hasLiteralValue = raw.value !== undefined || raw.text !== undefined || raw.content !== undefined;
    if (valueEnv && hasLiteralValue) {
        issues.push({
            severity: "error",
            code: "browser_action_value_source_conflict",
            message: `Browser action ${index + 1} in "${checkName}" cannot define both a literal value and an environment value binding.`,
            project,
        });
    }
    const configuredEffectSignals = (0, work_order_aliases_1.normalizeStringList)(raw.effectSignals || raw.effect_signals);
    const effectSignals = action_effects_1.BROWSER_ACTION_EFFECT_SIGNALS.filter(signal => configuredEffectSignals.includes(signal));
    const unsupportedEffectSignals = configuredEffectSignals.filter(signal => !action_effects_1.BROWSER_ACTION_EFFECT_SIGNALS.includes(signal));
    if (unsupportedEffectSignals.length) {
        issues.push({
            severity: "error",
            code: "invalid_browser_action_effect_signal",
            message: `Browser action ${index + 1} in "${checkName}" has unsupported effect signal(s): ${unsupportedEffectSignals.join(", ")}.`,
            project,
        });
    }
    const rawEffectTimeoutMs = raw.effectTimeoutMs ?? raw.effect_timeout_ms;
    const effectTimeoutMs = (0, work_order_aliases_1.optionalNumber)(rawEffectTimeoutMs);
    if (rawEffectTimeoutMs !== undefined && (effectTimeoutMs === undefined || effectTimeoutMs <= 0)) {
        issues.push({
            severity: "error",
            code: "invalid_browser_action_effect_timeout",
            message: `Browser action ${index + 1} in "${checkName}" requires a positive effectTimeoutMs.`,
            project,
        });
    }
    const normalized = {
        ...raw,
        type: type,
        selector: (0, work_order_aliases_1.text)(raw.selector || raw.css || raw.locator) || undefined,
        locator: (0, work_order_aliases_1.text)(raw.locator || raw.selector || raw.css) || undefined,
        text: raw.text === undefined ? undefined : String(raw.text),
        value: raw.value === undefined ? undefined : String(raw.value),
        valueEnv: valueEnv || undefined,
        value_env: valueEnv || undefined,
        textEnv: valueEnv || undefined,
        text_env: valueEnv || undefined,
        contentEnv: valueEnv || undefined,
        content_env: valueEnv || undefined,
        storage: (0, work_order_aliases_1.normalizeBrowserStorageArea)(raw, type) || undefined,
        storageArea: (0, work_order_aliases_1.normalizeBrowserStorageArea)(raw, type) || undefined,
        storage_area: (0, work_order_aliases_1.normalizeBrowserStorageArea)(raw, type) || undefined,
        keys: (0, work_order_aliases_1.normalizeStringList)(raw.keys || raw.storageKeys || raw.storage_keys || raw.cookieNames || raw.cookie_names || raw.cookies),
        attribute: (0, work_order_aliases_1.text)(raw.attribute || raw.attr || raw.attributeName || raw.attribute_name || raw.key) || undefined,
        attributeName: (0, work_order_aliases_1.text)(raw.attributeName || raw.attribute_name || raw.attribute || raw.attr || raw.key) || undefined,
        attribute_name: (0, work_order_aliases_1.text)(raw.attribute_name || raw.attributeName || raw.attribute || raw.attr || raw.key) || undefined,
        url: (0, work_order_aliases_1.text)(raw.url || raw.href) || undefined,
        key: (0, work_order_aliases_1.normalizeBrowserActionKey)(raw, type),
        domain: (0, work_order_aliases_1.text)(raw.domain || raw.cookieDomain || raw.cookie_domain) || undefined,
        cookiePath: (0, work_order_aliases_1.text)(raw.cookiePath || raw.cookie_path || raw.cookie_pathname || raw.cookiePathname || (type === "setCookie" || type === "clearCookies" ? raw.path : "")) || undefined,
        cookie_path: (0, work_order_aliases_1.text)(raw.cookie_path || raw.cookiePath || raw.cookie_pathname || raw.cookiePathname || (type === "setCookie" || type === "clearCookies" ? raw.path : "")) || undefined,
        expires: (0, work_order_aliases_1.optionalNumber)(raw.expires ?? raw.expiry ?? raw.expiration),
        httpOnly: (0, work_order_aliases_1.optionalBoolean)(raw.httpOnly ?? raw.http_only),
        http_only: (0, work_order_aliases_1.optionalBoolean)(raw.http_only ?? raw.httpOnly),
        secure: (0, work_order_aliases_1.optionalBoolean)(raw.secure),
        sameSite: (0, work_order_aliases_1.normalizeSameSite)(raw.sameSite || raw.same_site),
        same_site: (0, work_order_aliases_1.normalizeSameSite)(raw.same_site || raw.sameSite),
        filePath: (0, work_order_aliases_1.text)(raw.filePath || raw.file_path || raw.path) || undefined,
        file_path: (0, work_order_aliases_1.text)(raw.file_path || raw.filePath || raw.path) || undefined,
        path: (0, work_order_aliases_1.text)(raw.path || raw.filePath || raw.file_path) || undefined,
        fileName: (0, work_order_aliases_1.text)(raw.fileName || raw.file_name || raw.filename || raw.name) || undefined,
        file_name: (0, work_order_aliases_1.text)(raw.file_name || raw.fileName || raw.filename || raw.name) || undefined,
        filename: (0, work_order_aliases_1.text)(raw.filename || raw.fileName || raw.file_name || raw.name) || undefined,
        fileContent: raw.fileContent === undefined && raw.file_content === undefined && raw.content === undefined ? undefined : String(raw.fileContent ?? raw.file_content ?? raw.content),
        file_content: raw.file_content === undefined && raw.fileContent === undefined && raw.content === undefined ? undefined : String(raw.file_content ?? raw.fileContent ?? raw.content),
        content: raw.content === undefined && raw.fileContent === undefined && raw.file_content === undefined ? undefined : String(raw.content ?? raw.fileContent ?? raw.file_content),
        mediaType: (0, work_order_aliases_1.text)(raw.mediaType || raw.media_type || raw.mimeType || raw.mime_type) || undefined,
        media_type: (0, work_order_aliases_1.text)(raw.media_type || raw.mediaType || raw.mimeType || raw.mime_type) || undefined,
        filePaths: (0, work_order_aliases_1.normalizeStringList)(raw.filePaths || raw.file_paths),
        file_paths: (0, work_order_aliases_1.normalizeStringList)(raw.file_paths || raw.filePaths),
        files: (0, work_order_aliases_1.normalizeBrowserUploadFiles)(raw),
        testId: (0, work_order_aliases_1.text)(raw.testId || raw.test_id || raw.dataTestId || raw.data_testid || raw.dataTestid) || undefined,
        test_id: (0, work_order_aliases_1.text)(raw.test_id || raw.testId || raw.dataTestId || raw.data_testid || raw.dataTestid) || undefined,
        dataTestId: (0, work_order_aliases_1.text)(raw.dataTestId || raw.data_testid || raw.dataTestid || raw.testId || raw.test_id) || undefined,
        data_testid: (0, work_order_aliases_1.text)(raw.data_testid || raw.dataTestId || raw.dataTestid || raw.testId || raw.test_id) || undefined,
        label: (0, work_order_aliases_1.text)(raw.label || raw.ariaLabel || raw.aria_label) || undefined,
        placeholder: (0, work_order_aliases_1.text)(raw.placeholder) || undefined,
        role: (0, work_order_aliases_1.text)(raw.role) || undefined,
        name: (0, work_order_aliases_1.text)(raw.name || raw.accessibleName || raw.accessible_name) || undefined,
        altText: (0, work_order_aliases_1.text)(raw.altText || raw.alt_text || raw.alt) || undefined,
        alt_text: (0, work_order_aliases_1.text)(raw.alt_text || raw.altText || raw.alt) || undefined,
        title: (0, work_order_aliases_1.text)(raw.title) || undefined,
        exact: raw.exact === undefined ? undefined : raw.exact !== false,
        destinationSelector: (0, work_order_aliases_1.text)(raw.destinationSelector || raw.destination_selector || raw.toSelector || raw.to_selector || raw.dropSelector || raw.drop_selector) || undefined,
        destination_selector: (0, work_order_aliases_1.text)(raw.destination_selector || raw.destinationSelector || raw.toSelector || raw.to_selector || raw.dropSelector || raw.drop_selector) || undefined,
        destinationLocator: (0, work_order_aliases_1.text)(raw.destinationLocator || raw.destination_locator || raw.toLocator || raw.to_locator || raw.dropLocator || raw.drop_locator || raw.destinationSelector || raw.destination_selector) || undefined,
        destination_locator: (0, work_order_aliases_1.text)(raw.destination_locator || raw.destinationLocator || raw.toLocator || raw.to_locator || raw.dropLocator || raw.drop_locator || raw.destinationSelector || raw.destination_selector) || undefined,
        destinationTestId: (0, work_order_aliases_1.text)(raw.destinationTestId || raw.destination_test_id || raw.destinationDataTestId || raw.destination_data_testid || raw.toTestId || raw.to_test_id || raw.dropTestId || raw.drop_test_id) || undefined,
        destination_test_id: (0, work_order_aliases_1.text)(raw.destination_test_id || raw.destinationTestId || raw.destinationDataTestId || raw.destination_data_testid || raw.toTestId || raw.to_test_id || raw.dropTestId || raw.drop_test_id) || undefined,
        destinationDataTestId: (0, work_order_aliases_1.text)(raw.destinationDataTestId || raw.destination_data_testid || raw.destinationTestId || raw.destination_test_id || raw.toTestId || raw.to_test_id || raw.dropTestId || raw.drop_test_id) || undefined,
        destination_data_testid: (0, work_order_aliases_1.text)(raw.destination_data_testid || raw.destinationDataTestId || raw.destinationTestId || raw.destination_test_id || raw.toTestId || raw.to_test_id || raw.dropTestId || raw.drop_test_id) || undefined,
        destinationLabel: (0, work_order_aliases_1.text)(raw.destinationLabel || raw.destination_label || raw.toLabel || raw.to_label || raw.dropLabel || raw.drop_label) || undefined,
        destination_label: (0, work_order_aliases_1.text)(raw.destination_label || raw.destinationLabel || raw.toLabel || raw.to_label || raw.dropLabel || raw.drop_label) || undefined,
        destinationPlaceholder: (0, work_order_aliases_1.text)(raw.destinationPlaceholder || raw.destination_placeholder || raw.toPlaceholder || raw.to_placeholder || raw.dropPlaceholder || raw.drop_placeholder) || undefined,
        destination_placeholder: (0, work_order_aliases_1.text)(raw.destination_placeholder || raw.destinationPlaceholder || raw.toPlaceholder || raw.to_placeholder || raw.dropPlaceholder || raw.drop_placeholder) || undefined,
        destinationRole: (0, work_order_aliases_1.text)(raw.destinationRole || raw.destination_role || raw.toRole || raw.to_role || raw.dropRole || raw.drop_role) || undefined,
        destination_role: (0, work_order_aliases_1.text)(raw.destination_role || raw.destinationRole || raw.toRole || raw.to_role || raw.dropRole || raw.drop_role) || undefined,
        destinationName: (0, work_order_aliases_1.text)(raw.destinationName || raw.destination_name || raw.toName || raw.to_name || raw.dropName || raw.drop_name) || undefined,
        destination_name: (0, work_order_aliases_1.text)(raw.destination_name || raw.destinationName || raw.toName || raw.to_name || raw.dropName || raw.drop_name) || undefined,
        destinationText: (0, work_order_aliases_1.text)(raw.destinationText || raw.destination_text || raw.toText || raw.to_text || raw.dropText || raw.drop_text) || undefined,
        destination_text: (0, work_order_aliases_1.text)(raw.destination_text || raw.destinationText || raw.toText || raw.to_text || raw.dropText || raw.drop_text) || undefined,
        destinationAltText: (0, work_order_aliases_1.text)(raw.destinationAltText || raw.destination_alt_text || raw.toAltText || raw.to_alt_text || raw.dropAltText || raw.drop_alt_text) || undefined,
        destination_alt_text: (0, work_order_aliases_1.text)(raw.destination_alt_text || raw.destinationAltText || raw.toAltText || raw.to_alt_text || raw.dropAltText || raw.drop_alt_text) || undefined,
        destinationTitle: (0, work_order_aliases_1.text)(raw.destinationTitle || raw.destination_title || raw.toTitle || raw.to_title || raw.dropTitle || raw.drop_title) || undefined,
        destination_title: (0, work_order_aliases_1.text)(raw.destination_title || raw.destinationTitle || raw.toTitle || raw.to_title || raw.dropTitle || raw.drop_title) || undefined,
        destinationExact: raw.destinationExact === undefined && raw.destination_exact === undefined ? undefined : raw.destinationExact !== false && raw.destination_exact !== false,
        destination_exact: raw.destination_exact === undefined && raw.destinationExact === undefined ? undefined : raw.destination_exact !== false && raw.destinationExact !== false,
        coordinate: (0, work_order_aliases_1.coordinate)(raw.coordinate || raw.coords || raw.point),
        startCoordinate: (0, work_order_aliases_1.coordinate)(raw.startCoordinate || raw.start_coordinate),
        start_coordinate: (0, work_order_aliases_1.coordinate)(raw.start_coordinate || raw.startCoordinate),
        direction: (0, work_order_aliases_1.browserScrollDirection)(raw),
        amount: (0, work_order_aliases_1.optionalNumber)(raw.amount ?? raw.delta ?? raw.pixels ?? raw.value),
        delay: (0, work_order_aliases_1.optionalNumber)(raw.delay ?? raw.delayMs ?? raw.delay_ms),
        delayMs: (0, work_order_aliases_1.optionalNumber)(raw.delayMs ?? raw.delay_ms ?? raw.delay),
        delay_ms: (0, work_order_aliases_1.optionalNumber)(raw.delay_ms ?? raw.delayMs ?? raw.delay),
        duration: (0, work_order_aliases_1.optionalNumber)(raw.duration),
        region: raw.region,
        bundleId: (0, work_order_aliases_1.text)(raw.bundleId || raw.bundle_id) || undefined,
        bundle_id: (0, work_order_aliases_1.text)(raw.bundle_id || raw.bundleId) || undefined,
        apps: (0, work_order_aliases_1.normalizeBrowserApps)(raw.apps),
        timeoutMs: (0, work_order_aliases_1.optionalNumber)(raw.timeoutMs || raw.timeout_ms),
        timeout_ms: (0, work_order_aliases_1.optionalNumber)(raw.timeout_ms || raw.timeoutMs),
        waitUntil: raw.waitUntil || raw.wait_until,
        verifyEffect: (0, work_order_aliases_1.optionalBoolean)(raw.verifyEffect ?? raw.verify_effect ?? raw.expectEffect ?? raw.expect_effect),
        verify_effect: (0, work_order_aliases_1.optionalBoolean)(raw.verify_effect ?? raw.verifyEffect ?? raw.expect_effect ?? raw.expectEffect),
        expectEffect: (0, work_order_aliases_1.optionalBoolean)(raw.expectEffect ?? raw.expect_effect ?? raw.verifyEffect ?? raw.verify_effect),
        expect_effect: (0, work_order_aliases_1.optionalBoolean)(raw.expect_effect ?? raw.expectEffect ?? raw.verify_effect ?? raw.verifyEffect),
        effectTimeoutMs,
        effect_timeout_ms: effectTimeoutMs,
        effectSignals,
        effect_signals: effectSignals,
        effectSession: (0, work_order_aliases_1.text)(raw.effectSession || raw.effect_session) || undefined,
        effect_session: (0, work_order_aliases_1.text)(raw.effect_session || raw.effectSession) || undefined,
    };
    if (valueEnv && !(0, authentication_1.browserActionSupportsEnvironmentValue)(normalized)) {
        issues.push({
            severity: "error",
            code: "unsupported_browser_action_value_env",
            message: `Browser action ${index + 1} in "${checkName}" cannot use an environment value binding with type "${type}".`,
            project,
        });
    }
    return normalized;
}
function normalizeBrowserAssertion(raw, issues, project, checkName, index) {
    if (!raw || typeof raw !== "object") {
        issues.push({ severity: "error", code: "invalid_browser_assertion", message: `Browser assertion ${index + 1} in "${checkName}" must be an object.`, project });
        return null;
    }
    const type = (0, work_order_aliases_1.normalizedType)(raw.type || raw.assertion || raw.kind, work_order_aliases_1.BROWSER_ASSERTION_ALIASES);
    if (!work_order_aliases_1.BROWSER_ASSERTION_TYPES.has(type)) {
        issues.push({ severity: "error", code: "invalid_browser_assertion_type", message: `Browser assertion ${index + 1} in "${checkName}" has unsupported type "${type || "(missing)"}".`, project });
        return null;
    }
    return {
        ...raw,
        type: type,
        selector: (0, work_order_aliases_1.text)(raw.selector || raw.css || raw.locator) || undefined,
        locator: (0, work_order_aliases_1.text)(raw.locator || raw.selector || raw.css) || undefined,
        text: raw.text === undefined ? undefined : String(raw.text),
        value: raw.value === undefined ? undefined : String(raw.value),
        url: (0, work_order_aliases_1.text)(raw.url || raw.href) || undefined,
        urlIncludes: (0, work_order_aliases_1.text)(raw.urlIncludes || raw.url_includes || raw.path) || undefined,
        url_includes: (0, work_order_aliases_1.text)(raw.url_includes || raw.urlIncludes || raw.path) || undefined,
        method: (0, work_order_aliases_1.text)(raw.method || raw.httpMethod || raw.http_method).toUpperCase() || undefined,
        httpMethod: (0, work_order_aliases_1.text)(raw.httpMethod || raw.http_method || raw.method).toUpperCase() || undefined,
        http_method: (0, work_order_aliases_1.text)(raw.http_method || raw.httpMethod || raw.method).toUpperCase() || undefined,
        status: (0, work_order_aliases_1.optionalNumberList)(raw.status ?? raw.statusCode ?? raw.status_code),
        statusCode: (0, work_order_aliases_1.optionalNumberList)(raw.statusCode ?? raw.status_code ?? raw.status),
        status_code: (0, work_order_aliases_1.optionalNumberList)(raw.status_code ?? raw.statusCode ?? raw.status),
        resourceType: (0, work_order_aliases_1.text)(raw.resourceType || raw.resource_type) || undefined,
        resource_type: (0, work_order_aliases_1.text)(raw.resource_type || raw.resourceType) || undefined,
        headerName: (0, work_order_aliases_1.text)(raw.headerName || raw.header_name || raw.header) || undefined,
        header_name: (0, work_order_aliases_1.text)(raw.header_name || raw.headerName || raw.header) || undefined,
        headerIncludes: (0, work_order_aliases_1.text)(raw.headerIncludes || raw.header_includes) || undefined,
        header_includes: (0, work_order_aliases_1.text)(raw.header_includes || raw.headerIncludes) || undefined,
        headerValueIncludes: (0, work_order_aliases_1.text)(raw.headerValueIncludes || raw.header_value_includes || raw.headerValue || raw.header_value) || undefined,
        header_value_includes: (0, work_order_aliases_1.text)(raw.header_value_includes || raw.headerValueIncludes || raw.headerValue || raw.header_value) || undefined,
        bodyIncludes: (0, work_order_aliases_1.text)(raw.bodyIncludes || raw.body_includes || raw.bodyContains || raw.body_contains) || undefined,
        body_includes: (0, work_order_aliases_1.text)(raw.body_includes || raw.bodyIncludes || raw.bodyContains || raw.body_contains) || undefined,
        bodyJsonPath: (0, work_order_aliases_1.text)(raw.bodyJsonPath || raw.body_json_path || raw.jsonPath || raw.json_path) || undefined,
        body_json_path: (0, work_order_aliases_1.text)(raw.body_json_path || raw.bodyJsonPath || raw.jsonPath || raw.json_path) || undefined,
        bodyJsonEquals: raw.bodyJsonEquals ?? raw.body_json_equals ?? raw.bodyJsonValue ?? raw.body_json_value,
        body_json_equals: raw.body_json_equals ?? raw.bodyJsonEquals ?? raw.bodyJsonValue ?? raw.body_json_value,
        bodyJsonIncludes: (0, work_order_aliases_1.text)(raw.bodyJsonIncludes || raw.body_json_includes) || undefined,
        body_json_includes: (0, work_order_aliases_1.text)(raw.body_json_includes || raw.bodyJsonIncludes) || undefined,
        property: (0, work_order_aliases_1.text)(raw.property || raw.styleProperty || raw.style_property || raw.cssProperty || raw.css_property) || undefined,
        styleProperty: (0, work_order_aliases_1.text)(raw.styleProperty || raw.style_property || raw.cssProperty || raw.css_property || raw.property) || undefined,
        style_property: (0, work_order_aliases_1.text)(raw.style_property || raw.styleProperty || raw.cssProperty || raw.css_property || raw.property) || undefined,
        cssProperty: (0, work_order_aliases_1.text)(raw.cssProperty || raw.css_property || raw.styleProperty || raw.style_property || raw.property) || undefined,
        css_property: (0, work_order_aliases_1.text)(raw.css_property || raw.cssProperty || raw.styleProperty || raw.style_property || raw.property) || undefined,
        fileName: (0, work_order_aliases_1.text)(raw.fileName || raw.file_name || raw.filename || raw.downloadName || raw.download_name) || undefined,
        file_name: (0, work_order_aliases_1.text)(raw.file_name || raw.fileName || raw.filename || raw.downloadName || raw.download_name) || undefined,
        filename: (0, work_order_aliases_1.text)(raw.filename || raw.fileName || raw.file_name || raw.downloadName || raw.download_name) || undefined,
        fileNameIncludes: (0, work_order_aliases_1.text)(raw.fileNameIncludes || raw.file_name_includes || raw.filenameIncludes || raw.filename_includes) || undefined,
        file_name_includes: (0, work_order_aliases_1.text)(raw.file_name_includes || raw.fileNameIncludes || raw.filenameIncludes || raw.filename_includes) || undefined,
        filenameIncludes: (0, work_order_aliases_1.text)(raw.filenameIncludes || raw.filename_includes || raw.fileNameIncludes || raw.file_name_includes) || undefined,
        filename_includes: (0, work_order_aliases_1.text)(raw.filename_includes || raw.filenameIncludes || raw.fileNameIncludes || raw.file_name_includes) || undefined,
        contentIncludes: (0, work_order_aliases_1.text)(raw.contentIncludes || raw.content_includes || raw.bodyIncludes || raw.body_includes) || undefined,
        content_includes: (0, work_order_aliases_1.text)(raw.content_includes || raw.contentIncludes || raw.bodyIncludes || raw.body_includes) || undefined,
        minBytes: (0, work_order_aliases_1.optionalNumber)(raw.minBytes || raw.min_bytes || raw.sizeBytes || raw.size_bytes),
        min_bytes: (0, work_order_aliases_1.optionalNumber)(raw.min_bytes || raw.minBytes || raw.sizeBytes || raw.size_bytes),
        count: (0, work_order_aliases_1.optionalNumber)(raw.count ?? raw.expectedCount ?? raw.expected_count),
        expectedCount: (0, work_order_aliases_1.optionalNumber)(raw.expectedCount ?? raw.expected_count ?? raw.count),
        expected_count: (0, work_order_aliases_1.optionalNumber)(raw.expected_count ?? raw.expectedCount ?? raw.count),
        minCount: (0, work_order_aliases_1.optionalNumber)(raw.minCount ?? raw.min_count ?? raw.count),
        min_count: (0, work_order_aliases_1.optionalNumber)(raw.min_count ?? raw.minCount ?? raw.count),
        maxCount: (0, work_order_aliases_1.optionalNumber)(raw.maxCount ?? raw.max_count ?? raw.count),
        max_count: (0, work_order_aliases_1.optionalNumber)(raw.max_count ?? raw.maxCount ?? raw.count),
        minUniqueColors: (0, work_order_aliases_1.optionalNumber)(raw.minUniqueColors ?? raw.min_unique_colors),
        min_unique_colors: (0, work_order_aliases_1.optionalNumber)(raw.min_unique_colors ?? raw.minUniqueColors),
        minNonWhitePixels: (0, work_order_aliases_1.optionalNumber)(raw.minNonWhitePixels ?? raw.min_non_white_pixels),
        min_non_white_pixels: (0, work_order_aliases_1.optionalNumber)(raw.min_non_white_pixels ?? raw.minNonWhitePixels),
        message: raw.message === undefined ? undefined : String(raw.message),
        messageIncludes: (0, work_order_aliases_1.text)(raw.messageIncludes || raw.message_includes || raw.messageContains || raw.message_contains) || undefined,
        message_includes: (0, work_order_aliases_1.text)(raw.message_includes || raw.messageIncludes || raw.messageContains || raw.message_contains) || undefined,
        accessibleName: (0, work_order_aliases_1.text)(raw.accessibleName || raw.accessible_name || raw.ariaName || raw.aria_name) || undefined,
        accessible_name: (0, work_order_aliases_1.text)(raw.accessible_name || raw.accessibleName || raw.ariaName || raw.aria_name) || undefined,
        accessibleDescription: (0, work_order_aliases_1.text)(raw.accessibleDescription || raw.accessible_description || raw.ariaDescription || raw.aria_description) || undefined,
        accessible_description: (0, work_order_aliases_1.text)(raw.accessible_description || raw.accessibleDescription || raw.ariaDescription || raw.aria_description) || undefined,
        description: (0, work_order_aliases_1.text)(raw.description || raw.accessibleDescription || raw.accessible_description || raw.ariaDescription || raw.aria_description) || undefined,
        descriptionIncludes: (0, work_order_aliases_1.text)(raw.descriptionIncludes || raw.description_includes || raw.descriptionContains || raw.description_contains) || undefined,
        description_includes: (0, work_order_aliases_1.text)(raw.description_includes || raw.descriptionIncludes || raw.descriptionContains || raw.description_contains) || undefined,
        snapshotIncludes: (0, work_order_aliases_1.text)(raw.snapshotIncludes || raw.snapshot_includes || raw.ariaSnapshotIncludes || raw.aria_snapshot_includes) || undefined,
        snapshot_includes: (0, work_order_aliases_1.text)(raw.snapshot_includes || raw.snapshotIncludes || raw.ariaSnapshotIncludes || raw.aria_snapshot_includes) || undefined,
        dialogType: (0, work_order_aliases_1.text)(raw.dialogType || raw.dialog_type || raw.expectedDialogType || raw.expected_dialog_type || raw.alertType || raw.alert_type) || undefined,
        dialog_type: (0, work_order_aliases_1.text)(raw.dialog_type || raw.dialogType || raw.expectedDialogType || raw.expected_dialog_type || raw.alertType || raw.alert_type) || undefined,
        tableSelector: (0, work_order_aliases_1.text)(raw.tableSelector || raw.table_selector || raw.table || raw.tableCss || raw.table_css) || undefined,
        table_selector: (0, work_order_aliases_1.text)(raw.table_selector || raw.tableSelector || raw.table || raw.tableCss || raw.table_css) || undefined,
        tableLocator: (0, work_order_aliases_1.text)(raw.tableLocator || raw.table_locator || raw.tableSelector || raw.table_selector || raw.table) || undefined,
        table_locator: (0, work_order_aliases_1.text)(raw.table_locator || raw.tableLocator || raw.tableSelector || raw.table_selector || raw.table) || undefined,
        rowText: (0, work_order_aliases_1.text)(raw.rowText || raw.row_text || raw.row || raw.rowContains || raw.row_contains) || undefined,
        row_text: (0, work_order_aliases_1.text)(raw.row_text || raw.rowText || raw.row || raw.rowContains || raw.row_contains) || undefined,
        rowIndex: (0, work_order_aliases_1.optionalNumber)(raw.rowIndex ?? raw.row_index),
        row_index: (0, work_order_aliases_1.optionalNumber)(raw.row_index ?? raw.rowIndex),
        rowNumber: (0, work_order_aliases_1.optionalNumber)(raw.rowNumber ?? raw.row_number),
        row_number: (0, work_order_aliases_1.optionalNumber)(raw.row_number ?? raw.rowNumber),
        columnName: (0, work_order_aliases_1.text)(raw.columnName || raw.column_name || raw.columnHeader || raw.column_header || raw.header) || undefined,
        column_name: (0, work_order_aliases_1.text)(raw.column_name || raw.columnName || raw.columnHeader || raw.column_header || raw.header) || undefined,
        columnHeader: (0, work_order_aliases_1.text)(raw.columnHeader || raw.column_header || raw.columnName || raw.column_name || raw.header) || undefined,
        column_header: (0, work_order_aliases_1.text)(raw.column_header || raw.columnHeader || raw.columnName || raw.column_name || raw.header) || undefined,
        columnIndex: (0, work_order_aliases_1.optionalNumber)(raw.columnIndex ?? raw.column_index),
        column_index: (0, work_order_aliases_1.optionalNumber)(raw.column_index ?? raw.columnIndex),
        columnNumber: (0, work_order_aliases_1.optionalNumber)(raw.columnNumber ?? raw.column_number),
        column_number: (0, work_order_aliases_1.optionalNumber)(raw.column_number ?? raw.columnNumber),
        texts: (0, work_order_aliases_1.normalizeStringList)(raw.texts || raw.expectedTexts || raw.expected_texts),
        values: (0, work_order_aliases_1.normalizeStringList)(raw.values),
        expectedTexts: (0, work_order_aliases_1.normalizeStringList)(raw.expectedTexts || raw.expected_texts || raw.texts),
        expected_texts: (0, work_order_aliases_1.normalizeStringList)(raw.expected_texts || raw.expectedTexts || raw.texts),
        key: (0, work_order_aliases_1.text)(raw.key || raw.storageKey || raw.storage_key) || undefined,
        expression: (0, work_order_aliases_1.text)(raw.expression || raw.js || raw.javascript) || undefined,
        testId: (0, work_order_aliases_1.text)(raw.testId || raw.test_id || raw.dataTestId || raw.data_testid || raw.dataTestid) || undefined,
        test_id: (0, work_order_aliases_1.text)(raw.test_id || raw.testId || raw.dataTestId || raw.data_testid || raw.dataTestid) || undefined,
        dataTestId: (0, work_order_aliases_1.text)(raw.dataTestId || raw.data_testid || raw.dataTestid || raw.testId || raw.test_id) || undefined,
        data_testid: (0, work_order_aliases_1.text)(raw.data_testid || raw.dataTestId || raw.dataTestid || raw.testId || raw.test_id) || undefined,
        label: (0, work_order_aliases_1.text)(raw.label || raw.ariaLabel || raw.aria_label) || undefined,
        placeholder: (0, work_order_aliases_1.text)(raw.placeholder) || undefined,
        role: (0, work_order_aliases_1.text)(raw.role) || undefined,
        name: (0, work_order_aliases_1.text)(raw.name || raw.accessibleName || raw.accessible_name) || undefined,
        altText: (0, work_order_aliases_1.text)(raw.altText || raw.alt_text || raw.alt) || undefined,
        alt_text: (0, work_order_aliases_1.text)(raw.alt_text || raw.altText || raw.alt) || undefined,
        title: (0, work_order_aliases_1.text)(raw.title) || undefined,
        exact: raw.exact === undefined ? undefined : raw.exact !== false,
        timeoutMs: (0, work_order_aliases_1.optionalNumber)(raw.timeoutMs || raw.timeout_ms),
        timeout_ms: (0, work_order_aliases_1.optionalNumber)(raw.timeout_ms || raw.timeoutMs),
        settleMs: (0, work_order_aliases_1.optionalNumber)(raw.settleMs || raw.settle_ms),
        settle_ms: (0, work_order_aliases_1.optionalNumber)(raw.settle_ms || raw.settleMs),
    };
}
function normalizeBrowserSession(raw, issues, project, checkName, index) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
        issues.push({ severity: "error", code: "invalid_browser_session", message: `Browser session ${index + 1} in "${checkName}" must be an object.`, project });
        return null;
    }
    const name = (0, work_order_aliases_1.text)(raw.name || raw.session || raw.id);
    const setupName = `${checkName} / session ${name || index + 1} setup`;
    const setupActions = (0, utils_1.asArray)(raw.setupActions || raw.setup_actions || raw.actions)
        .map((action, actionIndex) => normalizeBrowserAction(action, issues, project, setupName, actionIndex))
        .filter(Boolean);
    if (["storageState", "storage_state", "authState", "auth_state"].some(key => raw[key] !== undefined)) {
        issues.push({
            severity: "error",
            code: "invalid_browser_storage_state",
            message: `Browser session ${index + 1} in "${checkName}" must reference authentication state with storageStatePath/authStatePath; inline cookies, tokens, and storage values are not accepted.`,
            project,
        });
    }
    const storageStatePath = (0, work_order_aliases_1.text)(raw.storageStatePath || raw.storage_state_path || raw.authStatePath || raw.auth_state_path);
    return {
        name,
        url: (0, work_order_aliases_1.text)(raw.url || raw.targetUrl || raw.target_url) || undefined,
        storageStatePath: storageStatePath || undefined,
        storage_state_path: storageStatePath || undefined,
        authStatePath: storageStatePath || undefined,
        auth_state_path: storageStatePath || undefined,
        setupActions,
        setup_actions: setupActions,
    };
}
function normalizeBrowserSessionLeafStep(raw, issues, project, checkName, label, index) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
        issues.push({ severity: "error", code: "invalid_browser_session_step", message: `${label} in "${checkName}" must be an object.`, project });
        return null;
    }
    const session = (0, work_order_aliases_1.text)(raw.session || raw.sessionName || raw.session_name || raw.actor);
    const rawAction = raw.action || raw.do;
    const rawAssertion = raw.assertion || raw.expect;
    if (Boolean(rawAction) === Boolean(rawAssertion)) {
        issues.push({ severity: "error", code: "invalid_browser_session_step_kind", message: `${label} in "${checkName}" must contain exactly one action or assertion.`, project });
    }
    const stepName = `${checkName} / session ${session || "(missing)"}`;
    const action = rawAction ? normalizeBrowserAction(rawAction, issues, project, stepName, index) || undefined : undefined;
    const assertion = rawAssertion ? normalizeBrowserAssertion(rawAssertion, issues, project, stepName, index) || undefined : undefined;
    if (!action && !assertion)
        return null;
    return { session, action, assertion };
}
function normalizeBrowserSessionComparisonStep(raw, issues, project, checkName, index) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
        issues.push({ severity: "error", code: "invalid_browser_session_comparison", message: `Browser session comparison step ${index + 1} in "${checkName}" must be an object.`, project });
        return null;
    }
    const leftSession = (0, work_order_aliases_1.text)(raw.leftSession || raw.left_session || raw.left || raw.firstSession || raw.first_session || raw.sourceSession || raw.source_session);
    const rightSession = (0, work_order_aliases_1.text)(raw.rightSession || raw.right_session || raw.right || raw.secondSession || raw.second_session || raw.targetSession || raw.target_session);
    const expression = (0, work_order_aliases_1.text)(raw.expression || raw.js || raw.javascript);
    const leftExpression = (0, work_order_aliases_1.text)(raw.leftExpression || raw.left_expression || raw.leftJs || raw.left_js || expression);
    const rightExpression = (0, work_order_aliases_1.text)(raw.rightExpression || raw.right_expression || raw.rightJs || raw.right_js || expression);
    const operatorKey = (0, work_order_aliases_1.text)(raw.operator || raw.relation || raw.mode || "equals").replace(/[\s_-]+/g, "").toLowerCase();
    const operatorAliases = {
        equal: "equals",
        equals: "equals",
        deepequals: "equals",
        notequal: "notEquals",
        notequals: "notEquals",
        differs: "notEquals",
        include: "includes",
        includes: "includes",
        contains: "includes",
    };
    const operator = operatorAliases[operatorKey] || operatorKey;
    const rawTimeoutMs = raw.timeoutMs ?? raw.timeout_ms;
    const rawPollMs = raw.pollMs ?? raw.poll_ms ?? raw.intervalMs ?? raw.interval_ms;
    const timeoutMs = (0, work_order_aliases_1.optionalNumber)(rawTimeoutMs);
    const pollMs = (0, work_order_aliases_1.optionalNumber)(rawPollMs);
    if (rawTimeoutMs !== undefined && (timeoutMs === undefined || timeoutMs <= 0)) {
        issues.push({ severity: "error", code: "invalid_browser_session_comparison_timeout", message: `Browser session comparison step ${index + 1} in "${checkName}" requires a positive timeoutMs.`, project });
    }
    if (rawPollMs !== undefined && (pollMs === undefined || pollMs <= 0)) {
        issues.push({ severity: "error", code: "invalid_browser_session_comparison_poll", message: `Browser session comparison step ${index + 1} in "${checkName}" requires a positive pollMs.`, project });
    }
    return {
        compare: {
            leftSession,
            rightSession,
            ...(expression ? { expression } : {}),
            leftExpression,
            rightExpression,
            operator: operator,
            ...(timeoutMs === undefined ? {} : { timeoutMs }),
            ...(pollMs === undefined ? {} : { pollMs }),
        },
    };
}
function normalizeBrowserSessionStep(raw, issues, project, checkName, index) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
        issues.push({ severity: "error", code: "invalid_browser_session_step", message: `Browser session step ${index + 1} in "${checkName}" must be an object.`, project });
        return null;
    }
    const rawComparison = raw.compare ?? raw.comparison ?? raw.compareSessions ?? raw.compare_sessions ?? raw.convergence;
    if (rawComparison !== undefined) {
        if (raw.parallel !== undefined || raw.parallelSteps !== undefined || raw.parallel_steps !== undefined || raw.action || raw.do || raw.assertion || raw.expect || raw.session || raw.sessionName || raw.session_name || raw.actor) {
            issues.push({
                severity: "error",
                code: "invalid_browser_session_comparison_kind",
                message: `Browser session comparison step ${index + 1} in "${checkName}" cannot also define parallel or session action/assertion fields.`,
                project,
            });
        }
        return normalizeBrowserSessionComparisonStep(rawComparison, issues, project, checkName, index);
    }
    const rawParallel = raw.parallel ?? raw.parallelSteps ?? raw.parallel_steps;
    if (rawParallel !== undefined) {
        if (!Array.isArray(rawParallel)) {
            issues.push({ severity: "error", code: "invalid_browser_parallel_step", message: `Browser parallel session step group ${index + 1} in "${checkName}" must be an array.`, project });
            return null;
        }
        if (raw.action || raw.do || raw.assertion || raw.expect || raw.session || raw.sessionName || raw.session_name || raw.actor) {
            issues.push({ severity: "error", code: "invalid_browser_parallel_step_kind", message: `Browser parallel session step group ${index + 1} in "${checkName}" cannot also define a session action/assertion.`, project });
        }
        const parallel = rawParallel
            .map((step, parallelIndex) => normalizeBrowserSessionLeafStep(step, issues, project, checkName, `Browser parallel session step ${index + 1}.${parallelIndex + 1}`, parallelIndex))
            .filter(Boolean);
        return { parallel };
    }
    return normalizeBrowserSessionLeafStep(raw, issues, project, checkName, `Browser session step ${index + 1}`, index);
}
function normalizeHeaders(raw) {
    const out = {};
    if (!raw || typeof raw !== "object" || Array.isArray(raw))
        return out;
    for (const [key, value] of Object.entries(raw)) {
        if (value !== undefined && value !== null)
            out[key] = String(value);
    }
    return out;
}
function normalizeCheckContext(raw) {
    const context = raw?.context && typeof raw.context === "object" && !Array.isArray(raw.context)
        ? { ...raw.context }
        : {};
    const acceptanceCriteria = (0, utils_1.asArray)(raw?.coversAcceptanceCriteria
        || raw?.covers_acceptance_criteria
        || raw?.acceptanceCriteria
        || raw?.acceptance_criteria
        || context.coversAcceptanceCriteria
        || context.covers_acceptance_criteria
        || context.acceptanceCriteria
        || context.acceptance_criteria).map(String).map(item => item.trim()).filter(Boolean);
    if (acceptanceCriteria.length)
        context.acceptanceCriteria = Array.from(new Set(acceptanceCriteria));
    return Object.keys(context).length ? context : undefined;
}
function normalizeHttpAssertion(raw, issues, project, checkName, index) {
    if (!raw || typeof raw !== "object") {
        issues.push({ severity: "error", code: "invalid_http_assertion", message: `HTTP assertion ${index + 1} in "${checkName}" must be an object.`, project });
        return null;
    }
    const type = (0, work_order_aliases_1.normalizedType)(raw.type || raw.assertion || raw.kind, work_order_aliases_1.HTTP_ASSERTION_ALIASES);
    if (!work_order_aliases_1.HTTP_ASSERTION_TYPES.has(type)) {
        issues.push({ severity: "error", code: "invalid_http_assertion_type", message: `HTTP assertion ${index + 1} in "${checkName}" has unsupported type "${type || "(missing)"}".`, project });
        return null;
    }
    return {
        ...raw,
        type: type,
        status: (0, work_order_aliases_1.optionalNumberList)(raw.status ?? raw.statusCode ?? raw.status_code ?? raw.expectedStatus ?? raw.expected_status),
        statusCode: (0, work_order_aliases_1.optionalNumberList)(raw.statusCode ?? raw.status_code ?? raw.status),
        status_code: (0, work_order_aliases_1.optionalNumberList)(raw.status_code ?? raw.statusCode ?? raw.status),
        text: raw.text === undefined ? undefined : String(raw.text),
        value: raw.value,
        path: (0, work_order_aliases_1.text)(raw.path || raw.jsonPath || raw.json_path) || undefined,
    };
}
function normalizeHttpConcurrencyAssertion(raw, issues, project, checkName, index) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
        issues.push({
            severity: "error",
            code: "invalid_http_concurrency_assertion",
            message: `HTTP concurrency assertion ${index + 1} in "${checkName}" must be an object.`,
            project,
        });
        return null;
    }
    const type = (0, work_order_aliases_1.normalizedType)(raw.type || raw.assertion || raw.kind, work_order_aliases_1.HTTP_CONCURRENCY_ASSERTION_ALIASES);
    if (!work_order_aliases_1.HTTP_CONCURRENCY_ASSERTION_TYPES.has(type)) {
        issues.push({
            severity: "error",
            code: "invalid_http_concurrency_assertion_type",
            message: `HTTP concurrency assertion ${index + 1} in "${checkName}" has unsupported type "${type || "(missing)"}".`,
            project,
        });
        return null;
    }
    const count = (0, work_order_aliases_1.optionalNumber)(raw.count ?? raw.expectedCount ?? raw.expected_count);
    const minCount = (0, work_order_aliases_1.optionalNumber)(raw.minCount ?? raw.min_count);
    const maxCount = (0, work_order_aliases_1.optionalNumber)(raw.maxCount ?? raw.max_count);
    const counts = [count, minCount, maxCount].filter(value => value !== undefined);
    if (counts.some(value => !Number.isInteger(value) || value < 0)) {
        issues.push({
            severity: "error",
            code: "invalid_http_concurrency_assertion_count",
            message: `HTTP concurrency assertion ${index + 1} in "${checkName}" requires non-negative integer count bounds.`,
            project,
        });
    }
    if (type !== "jsonPathAllEqual" && !counts.length) {
        issues.push({
            severity: "error",
            code: "missing_http_concurrency_assertion_count",
            message: `HTTP concurrency assertion ${index + 1} in "${checkName}" requires count, minCount, or maxCount.`,
            project,
        });
    }
    if (minCount !== undefined && maxCount !== undefined && minCount > maxCount) {
        issues.push({
            severity: "error",
            code: "invalid_http_concurrency_assertion_range",
            message: `HTTP concurrency assertion ${index + 1} in "${checkName}" has minCount greater than maxCount.`,
            project,
        });
    }
    const status = (0, work_order_aliases_1.optionalNumber)(raw.status ?? raw.statusCode ?? raw.status_code);
    if (type === "statusCount" && (!Number.isInteger(status) || Number(status) < 100 || Number(status) > 599)) {
        issues.push({
            severity: "error",
            code: "invalid_http_concurrency_status",
            message: `HTTP concurrency statusCount assertion ${index + 1} in "${checkName}" requires an HTTP status from 100 to 599.`,
            project,
        });
    }
    const path = (0, work_order_aliases_1.text)(raw.path || raw.jsonPath || raw.json_path);
    if ((type === "jsonPathUniqueCount" || type === "jsonPathAllEqual") && !path) {
        issues.push({
            severity: "error",
            code: "missing_http_concurrency_json_path",
            message: `HTTP concurrency ${type} assertion ${index + 1} in "${checkName}" requires path/jsonPath.`,
            project,
        });
    }
    return {
        type: type,
        ...(status === undefined ? {} : { status, statusCode: status, status_code: status }),
        ...(path ? { path } : {}),
        ...(count === undefined ? {} : { count, expectedCount: count, expected_count: count }),
        ...(minCount === undefined ? {} : { minCount, min_count: minCount }),
        ...(maxCount === undefined ? {} : { maxCount, max_count: maxCount }),
    };
}
function normalizeHttpConcurrency(raw, issues, project, checkName) {
    const rawConcurrency = raw.concurrency
        ?? raw.concurrentRequests
        ?? raw.concurrent_requests
        ?? raw.parallelRequests
        ?? raw.parallel_requests;
    if (rawConcurrency === undefined || rawConcurrency === null || rawConcurrency === "")
        return undefined;
    const objectConfig = rawConcurrency && typeof rawConcurrency === "object" && !Array.isArray(rawConcurrency)
        ? rawConcurrency
        : {};
    const requests = (0, work_order_aliases_1.optionalNumber)(typeof rawConcurrency === "number" || typeof rawConcurrency === "string"
        ? rawConcurrency
        : objectConfig.requests
            ?? objectConfig.count
            ?? objectConfig.concurrentRequests
            ?? objectConfig.concurrent_requests
            ?? objectConfig.parallelRequests
            ?? objectConfig.parallel_requests);
    if (requests === undefined
        || !Number.isInteger(requests)
        || requests < http_concurrency_1.MIN_HTTP_CONCURRENT_REQUESTS
        || requests > http_concurrency_1.MAX_HTTP_CONCURRENT_REQUESTS) {
        issues.push({
            severity: "error",
            code: "invalid_http_concurrency_requests",
            message: `HTTP check "${checkName}" concurrency must be an integer from ${http_concurrency_1.MIN_HTTP_CONCURRENT_REQUESTS} to ${http_concurrency_1.MAX_HTTP_CONCURRENT_REQUESTS}.`,
            project,
        });
    }
    const rawAssertions = (0, utils_1.asArray)(objectConfig.aggregateAssertions
        || objectConfig.aggregate_assertions
        || objectConfig.assertions
        || raw.concurrencyAssertions
        || raw.concurrency_assertions);
    const aggregateAssertions = rawAssertions
        .map((assertion, index) => normalizeHttpConcurrencyAssertion(assertion, issues, project, checkName, index))
        .filter(Boolean);
    return {
        requests: requests || http_concurrency_1.MIN_HTTP_CONCURRENT_REQUESTS,
        aggregateAssertions,
    };
}
function normalizeHttpCheck(raw, issues, project, index, forceAdversarial = false) {
    if (!raw || typeof raw !== "object") {
        issues.push({ severity: "error", code: "invalid_http_check", message: `HTTP check ${index + 1} must be an object.`, project });
        return null;
    }
    const checkName = (0, work_order_aliases_1.text)(raw.name || raw.title) || `HTTP check ${index + 1}`;
    const url = (0, work_order_aliases_1.text)(raw.url || raw.targetUrl || raw.target_url || raw.path);
    if (!url) {
        issues.push({ severity: "error", code: "invalid_http_check_url", message: `HTTP check "${checkName}" must include url/path.`, project });
        return null;
    }
    const assertions = (0, utils_1.asArray)(raw.assertions || raw.expectations)
        .map((assertion, assertionIndex) => normalizeHttpAssertion(assertion, issues, project, checkName, assertionIndex))
        .filter(Boolean);
    if (!assertions.length && (raw.expectStatus !== undefined || raw.expect_status !== undefined || raw.expectedStatus !== undefined || raw.expected_status !== undefined)) {
        assertions.push({
            type: "status",
            status: raw.expectStatus ?? raw.expect_status ?? raw.expectedStatus ?? raw.expected_status,
        });
    }
    if (!assertions.length && (raw.responseContains !== undefined || raw.response_contains !== undefined)) {
        assertions.push({
            type: "textIncludes",
            text: String(raw.responseContains ?? raw.response_contains),
        });
    }
    const concurrency = normalizeHttpConcurrency(raw, issues, project, checkName);
    const context = normalizeCheckContext(raw);
    return {
        name: checkName,
        url,
        method: (0, work_order_aliases_1.text)(raw.method || raw.httpMethod || raw.http_method || "GET").toUpperCase(),
        headers: normalizeHeaders(raw.headers),
        body: raw.body === undefined ? undefined : typeof raw.body === "string" ? raw.body : JSON.stringify(raw.body),
        json: raw.json,
        assertions,
        adversarial: forceAdversarial || raw.adversarial === true || raw.probe === true,
        probeType: (0, work_order_aliases_1.text)(raw.probeType || raw.probe_type || raw.kind || raw.category) || undefined,
        probe_type: (0, work_order_aliases_1.text)(raw.probe_type || raw.probeType || raw.kind || raw.category) || undefined,
        coversAcceptanceCriteria: (0, utils_1.asArray)(raw.coversAcceptanceCriteria || raw.covers_acceptance_criteria).map(String).filter(Boolean),
        covers_acceptance_criteria: (0, utils_1.asArray)(raw.covers_acceptance_criteria || raw.coversAcceptanceCriteria).map(String).filter(Boolean),
        timeoutMs: (0, work_order_aliases_1.optionalNumber)(raw.timeoutMs || raw.timeout_ms),
        timeout_ms: (0, work_order_aliases_1.optionalNumber)(raw.timeout_ms || raw.timeoutMs),
        context,
        ...(concurrency ? { concurrency } : {}),
    };
}
function normalizeBrowserCheck(raw, issues, project, index, forceAdversarial = false) {
    if (!raw || typeof raw !== "object") {
        issues.push({ severity: "error", code: "invalid_browser_check", message: `Browser check ${index + 1} must be an object.`, project });
        return null;
    }
    const checkName = (0, work_order_aliases_1.text)(raw.name || raw.title) || `browser check ${index + 1}`;
    const actions = (0, utils_1.asArray)(raw.actions || raw.steps)
        .map((action, actionIndex) => normalizeBrowserAction(action, issues, project, checkName, actionIndex))
        .filter(Boolean);
    const assertions = (0, utils_1.asArray)(raw.assertions || raw.expectations)
        .map((assertion, assertionIndex) => normalizeBrowserAssertion(assertion, issues, project, checkName, assertionIndex))
        .filter(Boolean);
    const sessions = (0, utils_1.asArray)(raw.sessions || raw.browserSessions || raw.browser_sessions)
        .map((session, sessionIndex) => normalizeBrowserSession(session, issues, project, checkName, sessionIndex))
        .filter(Boolean);
    const sessionSteps = (0, utils_1.asArray)(raw.sessionSteps || raw.session_steps || raw.scenarioSteps || raw.scenario_steps)
        .map((step, stepIndex) => normalizeBrowserSessionStep(step, issues, project, checkName, stepIndex))
        .filter(Boolean);
    const rawViewport = raw.viewport && typeof raw.viewport === "object" ? raw.viewport : {};
    const viewportWidth = (0, work_order_aliases_1.optionalNumber)(raw.viewportWidth || raw.viewport_width || raw.width || rawViewport.width);
    const viewportHeight = (0, work_order_aliases_1.optionalNumber)(raw.viewportHeight || raw.viewport_height || raw.height || rawViewport.height);
    const deviceScaleFactor = (0, work_order_aliases_1.optionalNumber)(raw.deviceScaleFactor || raw.device_scale_factor || rawViewport.deviceScaleFactor || rawViewport.device_scale_factor);
    const rawContext = raw.context && typeof raw.context === "object" ? raw.context : {};
    if (["storageState", "storage_state", "authState", "auth_state"].some(key => raw[key] !== undefined)
        || ["storageState", "storage_state", "authState", "auth_state"].some(key => rawContext[key] !== undefined)) {
        issues.push({
            severity: "error",
            code: "invalid_browser_storage_state",
            message: `Browser check "${checkName}" must reference authentication state with storageStatePath/authStatePath; inline cookies, tokens, and storage values are not accepted.`,
            project,
        });
    }
    const locale = (0, work_order_aliases_1.text)(raw.locale || raw.browserLocale || raw.browser_locale || rawContext.locale) || undefined;
    const timezoneId = (0, work_order_aliases_1.text)(raw.timezoneId || raw.timezone_id || raw.timeZoneId || raw.time_zone_id || raw.timezone || rawContext.timezoneId || rawContext.timezone_id || rawContext.timezone) || undefined;
    const colorScheme = (0, work_order_aliases_1.text)(raw.colorScheme || raw.color_scheme || raw.theme || rawContext.colorScheme || rawContext.color_scheme) || undefined;
    const reducedMotion = (0, work_order_aliases_1.text)(raw.reducedMotion || raw.reduced_motion || raw.motion || rawContext.reducedMotion || rawContext.reduced_motion) || undefined;
    const permissions = (0, work_order_aliases_1.normalizeStringList)(raw.permissions || raw.browserPermissions || raw.browser_permissions || rawContext.permissions);
    const geolocation = (0, work_order_aliases_1.normalizeBrowserGeolocation)(raw.geolocation || raw.geo || raw.location || rawContext.geolocation || rawContext.geo || rawContext.location);
    const storageStatePath = (0, work_order_aliases_1.text)(raw.storageStatePath
        || raw.storage_state_path
        || raw.authStatePath
        || raw.auth_state_path
        || rawContext.storageStatePath
        || rawContext.storage_state_path
        || rawContext.authStatePath
        || rawContext.auth_state_path);
    const rawStabilityRuns = raw.stabilityRuns ?? raw.stability_runs ?? raw.repeatRuns ?? raw.repeat_runs;
    const parsedStabilityRuns = (0, work_order_aliases_1.optionalNumber)(rawStabilityRuns);
    const stabilityRuns = rawStabilityRuns === undefined
        ? undefined
        : Number.isInteger(parsedStabilityRuns) && Number(parsedStabilityRuns) >= 1 && Number(parsedStabilityRuns) <= stability_summary_1.MAX_BROWSER_STABILITY_RUNS
            ? Number(parsedStabilityRuns)
            : undefined;
    if (rawStabilityRuns !== undefined && stabilityRuns === undefined) {
        issues.push({
            severity: "error",
            code: "invalid_browser_stability_runs",
            message: `Browser check "${checkName}" stabilityRuns must be an integer from 1 to ${stability_summary_1.MAX_BROWSER_STABILITY_RUNS}.`,
            project,
        });
    }
    const normalizedAuthentication = (0, existing_session_1.normalizeBrowserAuthenticationConfig)(raw);
    for (const message of normalizedAuthentication.errors) {
        issues.push({
            severity: "error",
            code: "invalid_browser_authentication",
            message: `Browser check "${checkName}": ${message}`,
            project,
        });
    }
    if (normalizedAuthentication.config?.mode === "existing_session") {
        if (actions.some(action => (0, authentication_1.browserActionValueEnvName)(action))) {
            issues.push({
                severity: "error",
                code: "browser_authentication_mode_conflict",
                message: `Browser check "${checkName}" cannot combine existing_session authentication with credential environment bindings.`,
                project,
            });
        }
        if (storageStatePath) {
            issues.push({
                severity: "error",
                code: "browser_authentication_mode_conflict",
                message: `Browser check "${checkName}" cannot combine existing_session authentication with storageStatePath/authStatePath.`,
                project,
            });
        }
        if (sessions.length) {
            issues.push({
                severity: "error",
                code: "browser_authentication_mode_conflict",
                message: `Browser check "${checkName}" cannot combine existing_session authentication with isolated multi-session browser contexts.`,
                project,
            });
        }
        if (Number(stabilityRuns || 1) > 1) {
            issues.push({
                severity: "error",
                code: "browser_authentication_mode_conflict",
                message: `Browser check "${checkName}" cannot combine existing_session authentication with isolated browser stability runs.`,
                project,
            });
        }
    }
    const check = {
        name: checkName,
        url: (0, work_order_aliases_1.text)(raw.url || raw.targetUrl || raw.target_url) || undefined,
        authentication: normalizedAuthentication.config,
        authenticationMode: normalizedAuthentication.config?.mode,
        authentication_mode: normalizedAuthentication.config?.mode,
        authMode: normalizedAuthentication.config?.mode,
        auth_mode: normalizedAuthentication.config?.mode,
        existingSessionProvider: normalizedAuthentication.config?.provider,
        existing_session_provider: normalizedAuthentication.config?.provider,
        authenticatedBrowserProvider: normalizedAuthentication.config?.provider,
        authenticated_browser_provider: normalizedAuthentication.config?.provider,
        existingSessionEvidencePolicy: normalizedAuthentication.config?.evidencePolicy,
        existing_session_evidence_policy: normalizedAuthentication.config?.evidencePolicy,
        actions,
        assertions,
        sessions,
        sessionSteps,
        session_steps: sessionSteps,
        stabilityRuns,
        stability_runs: stabilityRuns,
        storageStatePath: storageStatePath || undefined,
        storage_state_path: storageStatePath || undefined,
        authStatePath: storageStatePath || undefined,
        auth_state_path: storageStatePath || undefined,
        screenshot: raw.screenshot === undefined ? undefined : raw.screenshot !== false,
        ...(viewportWidth || viewportHeight ? { viewport: { ...(viewportWidth ? { width: viewportWidth } : {}), ...(viewportHeight ? { height: viewportHeight } : {}) } } : {}),
        viewportWidth,
        viewport_width: viewportWidth,
        viewportHeight,
        viewport_height: viewportHeight,
        isMobile: raw.isMobile === undefined && raw.is_mobile === undefined ? undefined : raw.isMobile === true || raw.is_mobile === true,
        is_mobile: raw.is_mobile === undefined && raw.isMobile === undefined ? undefined : raw.is_mobile === true || raw.isMobile === true,
        deviceScaleFactor,
        device_scale_factor: deviceScaleFactor,
        userAgent: (0, work_order_aliases_1.text)(raw.userAgent || raw.user_agent) || undefined,
        user_agent: (0, work_order_aliases_1.text)(raw.user_agent || raw.userAgent) || undefined,
        locale,
        timezoneId,
        timezone_id: timezoneId,
        colorScheme,
        color_scheme: colorScheme,
        reducedMotion,
        reduced_motion: reducedMotion,
        permissions,
        geolocation,
        adversarial: forceAdversarial || raw.adversarial === true || raw.probe === true,
        probeType: (0, work_order_aliases_1.text)(raw.probeType || raw.probe_type || raw.kind || raw.category) || undefined,
        probe_type: (0, work_order_aliases_1.text)(raw.probe_type || raw.probeType || raw.kind || raw.category) || undefined,
        coversAcceptanceCriteria: (0, utils_1.asArray)(raw.coversAcceptanceCriteria || raw.covers_acceptance_criteria).map(String).filter(Boolean),
        covers_acceptance_criteria: (0, utils_1.asArray)(raw.covers_acceptance_criteria || raw.coversAcceptanceCriteria).map(String).filter(Boolean),
        timeoutMs: (0, work_order_aliases_1.optionalNumber)(raw.timeoutMs || raw.timeout_ms),
        timeout_ms: (0, work_order_aliases_1.optionalNumber)(raw.timeout_ms || raw.timeoutMs),
        context: normalizeCheckContext(raw),
    };
    if ((0, multi_session_1.hasMultiSessionBrowserScenario)(check)) {
        for (const message of (0, multi_session_1.validateMultiSessionBrowserScenario)(check)) {
            issues.push({ severity: "error", code: "invalid_browser_multi_session", message: `${checkName}: ${message}`, project });
        }
    }
    else if (actions.some(action => action.effectSession || action.effect_session)) {
        issues.push({
            severity: "error",
            code: "invalid_browser_action_effect_session",
            message: `Browser check "${checkName}" can use effectSession only inside an isolated multi-session scenario.`,
            project,
        });
    }
    return check;
}
//# sourceMappingURL=work-order-normalize-checks.js.map