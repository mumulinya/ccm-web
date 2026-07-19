// Behavior-freeze split from work-order.ts (part 2/3).
import * as path from "path";
import { buildAdversarialBrowserProbeChecks } from "./browser-probe-templates";
import {
  browserActionValueEnvName,
  browserActionSupportsEnvironmentValue,
  isValidBrowserEnvironmentName,
} from "./browser/authentication";
import { normalizeBrowserAuthenticationConfig } from "./browser/existing-session";
import { hasMultiSessionBrowserScenario, validateMultiSessionBrowserScenario } from "./browser/multi-session";
import { MAX_BROWSER_STABILITY_RUNS } from "./browser/stability-summary";
import { BROWSER_ACTION_EFFECT_SIGNALS } from "./browser/action-effects";
import {
  BrowserActionSpec,
  BrowserAssertionSpec,
  BrowserCheckSpec,
  BrowserSessionComparisonStepSpec,
  BrowserSessionLeafStepSpec,
  BrowserSessionSpec,
  BrowserSessionStepSpec,
  HttpAssertionSpec,
  HttpCheckSpec,
  HttpConcurrencyAssertionSpec,
  HttpConcurrencySpec,
  NormalizedTestAgentProjectTarget,
  NormalizedTestAgentWorkOrder,
  TestAgentOptions,
  TestAgentProjectTarget,
  TestAgentWorkOrder,
  WorkOrderIssue,
} from "./types";
import {
  MAX_HTTP_CONCURRENT_REQUESTS,
  MIN_HTTP_CONCURRENT_REQUESTS,
} from "./http-concurrency";
import { asArray, defaultArtifactDir, isLikelyProductionTestAgentUrl, makeRunId, resolveUrl, resolveWorkDir, stringifyEnv, validateTestAgentUrl, validateTestAgentWorkDir } from "./utils";

import {
  BROWSER_ACTION_ALIASES,
  BROWSER_ACTION_TYPES,
  BROWSER_ASSERTION_ALIASES,
  BROWSER_ASSERTION_TYPES,
  HTTP_ASSERTION_ALIASES,
  HTTP_ASSERTION_TYPES,
  HTTP_CONCURRENCY_ASSERTION_ALIASES,
  HTTP_CONCURRENCY_ASSERTION_TYPES,
  browserScrollDirection,
  coordinate,
  normalizeBrowserActionKey,
  normalizeBrowserApps,
  normalizeBrowserGeolocation,
  normalizeBrowserStorageArea,
  normalizeBrowserUploadFiles,
  normalizeSameSite,
  normalizeStringList,
  normalizedType,
  optionalBoolean,
  optionalNumber,
  optionalNumberList,
  text,
} from "./work-order-aliases";

function normalizeBrowserAction(raw: any, issues: WorkOrderIssue[], project: string, checkName: string, index: number): BrowserActionSpec | null {
  if (!raw || typeof raw !== "object") {
    issues.push({ severity: "error", code: "invalid_browser_action", message: `Browser action ${index + 1} in "${checkName}" must be an object.`, project });
    return null;
  }
  const type = normalizedType(raw.type || raw.action || raw.kind, BROWSER_ACTION_ALIASES);
  if (!BROWSER_ACTION_TYPES.has(type)) {
    issues.push({ severity: "error", code: "invalid_browser_action_type", message: `Browser action ${index + 1} in "${checkName}" has unsupported type "${type || "(missing)"}".`, project });
    return null;
  }
  const valueEnv = text(raw.valueEnv || raw.value_env || raw.textEnv || raw.text_env || raw.contentEnv || raw.content_env);
  if (valueEnv && !isValidBrowserEnvironmentName(valueEnv)) {
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
  const configuredEffectSignals = normalizeStringList(raw.effectSignals || raw.effect_signals);
  const effectSignals = BROWSER_ACTION_EFFECT_SIGNALS.filter(signal => configuredEffectSignals.includes(signal));
  const unsupportedEffectSignals = configuredEffectSignals.filter(signal =>
    !BROWSER_ACTION_EFFECT_SIGNALS.includes(signal as any)
  );
  if (unsupportedEffectSignals.length) {
    issues.push({
      severity: "error",
      code: "invalid_browser_action_effect_signal",
      message: `Browser action ${index + 1} in "${checkName}" has unsupported effect signal(s): ${unsupportedEffectSignals.join(", ")}.`,
      project,
    });
  }
  const rawEffectTimeoutMs = raw.effectTimeoutMs ?? raw.effect_timeout_ms;
  const effectTimeoutMs = optionalNumber(rawEffectTimeoutMs);
  if (rawEffectTimeoutMs !== undefined && (effectTimeoutMs === undefined || effectTimeoutMs <= 0)) {
    issues.push({
      severity: "error",
      code: "invalid_browser_action_effect_timeout",
      message: `Browser action ${index + 1} in "${checkName}" requires a positive effectTimeoutMs.`,
      project,
    });
  }
  const normalized: BrowserActionSpec = {
    ...raw,
    type: type as BrowserActionSpec["type"],
    selector: text(raw.selector || raw.css || raw.locator) || undefined,
    locator: text(raw.locator || raw.selector || raw.css) || undefined,
    text: raw.text === undefined ? undefined : String(raw.text),
    value: raw.value === undefined ? undefined : String(raw.value),
    valueEnv: valueEnv || undefined,
    value_env: valueEnv || undefined,
    textEnv: valueEnv || undefined,
    text_env: valueEnv || undefined,
    contentEnv: valueEnv || undefined,
    content_env: valueEnv || undefined,
    storage: normalizeBrowserStorageArea(raw, type) || undefined,
    storageArea: normalizeBrowserStorageArea(raw, type) || undefined,
    storage_area: normalizeBrowserStorageArea(raw, type) || undefined,
    keys: normalizeStringList(raw.keys || raw.storageKeys || raw.storage_keys || raw.cookieNames || raw.cookie_names || raw.cookies),
    attribute: text(raw.attribute || raw.attr || raw.attributeName || raw.attribute_name || raw.key) || undefined,
    attributeName: text(raw.attributeName || raw.attribute_name || raw.attribute || raw.attr || raw.key) || undefined,
    attribute_name: text(raw.attribute_name || raw.attributeName || raw.attribute || raw.attr || raw.key) || undefined,
    url: text(raw.url || raw.href) || undefined,
    key: normalizeBrowserActionKey(raw, type),
    domain: text(raw.domain || raw.cookieDomain || raw.cookie_domain) || undefined,
    cookiePath: text(raw.cookiePath || raw.cookie_path || raw.cookie_pathname || raw.cookiePathname || (type === "setCookie" || type === "clearCookies" ? raw.path : "")) || undefined,
    cookie_path: text(raw.cookie_path || raw.cookiePath || raw.cookie_pathname || raw.cookiePathname || (type === "setCookie" || type === "clearCookies" ? raw.path : "")) || undefined,
    expires: optionalNumber(raw.expires ?? raw.expiry ?? raw.expiration),
    httpOnly: optionalBoolean(raw.httpOnly ?? raw.http_only),
    http_only: optionalBoolean(raw.http_only ?? raw.httpOnly),
    secure: optionalBoolean(raw.secure),
    sameSite: normalizeSameSite(raw.sameSite || raw.same_site),
    same_site: normalizeSameSite(raw.same_site || raw.sameSite),
    filePath: text(raw.filePath || raw.file_path || raw.path) || undefined,
    file_path: text(raw.file_path || raw.filePath || raw.path) || undefined,
    path: text(raw.path || raw.filePath || raw.file_path) || undefined,
    fileName: text(raw.fileName || raw.file_name || raw.filename || raw.name) || undefined,
    file_name: text(raw.file_name || raw.fileName || raw.filename || raw.name) || undefined,
    filename: text(raw.filename || raw.fileName || raw.file_name || raw.name) || undefined,
    fileContent: raw.fileContent === undefined && raw.file_content === undefined && raw.content === undefined ? undefined : String(raw.fileContent ?? raw.file_content ?? raw.content),
    file_content: raw.file_content === undefined && raw.fileContent === undefined && raw.content === undefined ? undefined : String(raw.file_content ?? raw.fileContent ?? raw.content),
    content: raw.content === undefined && raw.fileContent === undefined && raw.file_content === undefined ? undefined : String(raw.content ?? raw.fileContent ?? raw.file_content),
    mediaType: text(raw.mediaType || raw.media_type || raw.mimeType || raw.mime_type) || undefined,
    media_type: text(raw.media_type || raw.mediaType || raw.mimeType || raw.mime_type) || undefined,
    filePaths: normalizeStringList(raw.filePaths || raw.file_paths),
    file_paths: normalizeStringList(raw.file_paths || raw.filePaths),
    files: normalizeBrowserUploadFiles(raw),
    testId: text(raw.testId || raw.test_id || raw.dataTestId || raw.data_testid || raw.dataTestid) || undefined,
    test_id: text(raw.test_id || raw.testId || raw.dataTestId || raw.data_testid || raw.dataTestid) || undefined,
    dataTestId: text(raw.dataTestId || raw.data_testid || raw.dataTestid || raw.testId || raw.test_id) || undefined,
    data_testid: text(raw.data_testid || raw.dataTestId || raw.dataTestid || raw.testId || raw.test_id) || undefined,
    label: text(raw.label || raw.ariaLabel || raw.aria_label) || undefined,
    placeholder: text(raw.placeholder) || undefined,
    role: text(raw.role) || undefined,
    name: text(raw.name || raw.accessibleName || raw.accessible_name) || undefined,
    altText: text(raw.altText || raw.alt_text || raw.alt) || undefined,
    alt_text: text(raw.alt_text || raw.altText || raw.alt) || undefined,
    title: text(raw.title) || undefined,
    exact: raw.exact === undefined ? undefined : raw.exact !== false,
    destinationSelector: text(raw.destinationSelector || raw.destination_selector || raw.toSelector || raw.to_selector || raw.dropSelector || raw.drop_selector) || undefined,
    destination_selector: text(raw.destination_selector || raw.destinationSelector || raw.toSelector || raw.to_selector || raw.dropSelector || raw.drop_selector) || undefined,
    destinationLocator: text(raw.destinationLocator || raw.destination_locator || raw.toLocator || raw.to_locator || raw.dropLocator || raw.drop_locator || raw.destinationSelector || raw.destination_selector) || undefined,
    destination_locator: text(raw.destination_locator || raw.destinationLocator || raw.toLocator || raw.to_locator || raw.dropLocator || raw.drop_locator || raw.destinationSelector || raw.destination_selector) || undefined,
    destinationTestId: text(raw.destinationTestId || raw.destination_test_id || raw.destinationDataTestId || raw.destination_data_testid || raw.toTestId || raw.to_test_id || raw.dropTestId || raw.drop_test_id) || undefined,
    destination_test_id: text(raw.destination_test_id || raw.destinationTestId || raw.destinationDataTestId || raw.destination_data_testid || raw.toTestId || raw.to_test_id || raw.dropTestId || raw.drop_test_id) || undefined,
    destinationDataTestId: text(raw.destinationDataTestId || raw.destination_data_testid || raw.destinationTestId || raw.destination_test_id || raw.toTestId || raw.to_test_id || raw.dropTestId || raw.drop_test_id) || undefined,
    destination_data_testid: text(raw.destination_data_testid || raw.destinationDataTestId || raw.destinationTestId || raw.destination_test_id || raw.toTestId || raw.to_test_id || raw.dropTestId || raw.drop_test_id) || undefined,
    destinationLabel: text(raw.destinationLabel || raw.destination_label || raw.toLabel || raw.to_label || raw.dropLabel || raw.drop_label) || undefined,
    destination_label: text(raw.destination_label || raw.destinationLabel || raw.toLabel || raw.to_label || raw.dropLabel || raw.drop_label) || undefined,
    destinationPlaceholder: text(raw.destinationPlaceholder || raw.destination_placeholder || raw.toPlaceholder || raw.to_placeholder || raw.dropPlaceholder || raw.drop_placeholder) || undefined,
    destination_placeholder: text(raw.destination_placeholder || raw.destinationPlaceholder || raw.toPlaceholder || raw.to_placeholder || raw.dropPlaceholder || raw.drop_placeholder) || undefined,
    destinationRole: text(raw.destinationRole || raw.destination_role || raw.toRole || raw.to_role || raw.dropRole || raw.drop_role) || undefined,
    destination_role: text(raw.destination_role || raw.destinationRole || raw.toRole || raw.to_role || raw.dropRole || raw.drop_role) || undefined,
    destinationName: text(raw.destinationName || raw.destination_name || raw.toName || raw.to_name || raw.dropName || raw.drop_name) || undefined,
    destination_name: text(raw.destination_name || raw.destinationName || raw.toName || raw.to_name || raw.dropName || raw.drop_name) || undefined,
    destinationText: text(raw.destinationText || raw.destination_text || raw.toText || raw.to_text || raw.dropText || raw.drop_text) || undefined,
    destination_text: text(raw.destination_text || raw.destinationText || raw.toText || raw.to_text || raw.dropText || raw.drop_text) || undefined,
    destinationAltText: text(raw.destinationAltText || raw.destination_alt_text || raw.toAltText || raw.to_alt_text || raw.dropAltText || raw.drop_alt_text) || undefined,
    destination_alt_text: text(raw.destination_alt_text || raw.destinationAltText || raw.toAltText || raw.to_alt_text || raw.dropAltText || raw.drop_alt_text) || undefined,
    destinationTitle: text(raw.destinationTitle || raw.destination_title || raw.toTitle || raw.to_title || raw.dropTitle || raw.drop_title) || undefined,
    destination_title: text(raw.destination_title || raw.destinationTitle || raw.toTitle || raw.to_title || raw.dropTitle || raw.drop_title) || undefined,
    destinationExact: raw.destinationExact === undefined && raw.destination_exact === undefined ? undefined : raw.destinationExact !== false && raw.destination_exact !== false,
    destination_exact: raw.destination_exact === undefined && raw.destinationExact === undefined ? undefined : raw.destination_exact !== false && raw.destinationExact !== false,
    coordinate: coordinate(raw.coordinate || raw.coords || raw.point),
    startCoordinate: coordinate(raw.startCoordinate || raw.start_coordinate),
    start_coordinate: coordinate(raw.start_coordinate || raw.startCoordinate),
    direction: browserScrollDirection(raw) as BrowserActionSpec["direction"],
    amount: optionalNumber(raw.amount ?? raw.delta ?? raw.pixels ?? raw.value),
    delay: optionalNumber(raw.delay ?? raw.delayMs ?? raw.delay_ms),
    delayMs: optionalNumber(raw.delayMs ?? raw.delay_ms ?? raw.delay),
    delay_ms: optionalNumber(raw.delay_ms ?? raw.delayMs ?? raw.delay),
    duration: optionalNumber(raw.duration),
    region: raw.region,
    bundleId: text(raw.bundleId || raw.bundle_id) || undefined,
    bundle_id: text(raw.bundle_id || raw.bundleId) || undefined,
    apps: normalizeBrowserApps(raw.apps),
    timeoutMs: optionalNumber(raw.timeoutMs || raw.timeout_ms),
    timeout_ms: optionalNumber(raw.timeout_ms || raw.timeoutMs),
    waitUntil: raw.waitUntil || raw.wait_until,
    verifyEffect: optionalBoolean(raw.verifyEffect ?? raw.verify_effect ?? raw.expectEffect ?? raw.expect_effect),
    verify_effect: optionalBoolean(raw.verify_effect ?? raw.verifyEffect ?? raw.expect_effect ?? raw.expectEffect),
    expectEffect: optionalBoolean(raw.expectEffect ?? raw.expect_effect ?? raw.verifyEffect ?? raw.verify_effect),
    expect_effect: optionalBoolean(raw.expect_effect ?? raw.expectEffect ?? raw.verify_effect ?? raw.verifyEffect),
    effectTimeoutMs,
    effect_timeout_ms: effectTimeoutMs,
    effectSignals,
    effect_signals: effectSignals,
    effectSession: text(raw.effectSession || raw.effect_session) || undefined,
    effect_session: text(raw.effect_session || raw.effectSession) || undefined,
  };
  if (valueEnv && !browserActionSupportsEnvironmentValue(normalized)) {
    issues.push({
      severity: "error",
      code: "unsupported_browser_action_value_env",
      message: `Browser action ${index + 1} in "${checkName}" cannot use an environment value binding with type "${type}".`,
      project,
    });
  }
  return normalized;
}

function normalizeBrowserAssertion(raw: any, issues: WorkOrderIssue[], project: string, checkName: string, index: number): BrowserAssertionSpec | null {
  if (!raw || typeof raw !== "object") {
    issues.push({ severity: "error", code: "invalid_browser_assertion", message: `Browser assertion ${index + 1} in "${checkName}" must be an object.`, project });
    return null;
  }
  const type = normalizedType(raw.type || raw.assertion || raw.kind, BROWSER_ASSERTION_ALIASES);
  if (!BROWSER_ASSERTION_TYPES.has(type)) {
    issues.push({ severity: "error", code: "invalid_browser_assertion_type", message: `Browser assertion ${index + 1} in "${checkName}" has unsupported type "${type || "(missing)"}".`, project });
    return null;
  }
  return {
    ...raw,
    type: type as BrowserAssertionSpec["type"],
    selector: text(raw.selector || raw.css || raw.locator) || undefined,
    locator: text(raw.locator || raw.selector || raw.css) || undefined,
    text: raw.text === undefined ? undefined : String(raw.text),
    value: raw.value === undefined ? undefined : String(raw.value),
    url: text(raw.url || raw.href) || undefined,
    urlIncludes: text(raw.urlIncludes || raw.url_includes || raw.path) || undefined,
    url_includes: text(raw.url_includes || raw.urlIncludes || raw.path) || undefined,
    method: text(raw.method || raw.httpMethod || raw.http_method).toUpperCase() || undefined,
    httpMethod: text(raw.httpMethod || raw.http_method || raw.method).toUpperCase() || undefined,
    http_method: text(raw.http_method || raw.httpMethod || raw.method).toUpperCase() || undefined,
    status: optionalNumberList(raw.status ?? raw.statusCode ?? raw.status_code),
    statusCode: optionalNumberList(raw.statusCode ?? raw.status_code ?? raw.status),
    status_code: optionalNumberList(raw.status_code ?? raw.statusCode ?? raw.status),
    resourceType: text(raw.resourceType || raw.resource_type) || undefined,
    resource_type: text(raw.resource_type || raw.resourceType) || undefined,
    headerName: text(raw.headerName || raw.header_name || raw.header) || undefined,
    header_name: text(raw.header_name || raw.headerName || raw.header) || undefined,
    headerIncludes: text(raw.headerIncludes || raw.header_includes) || undefined,
    header_includes: text(raw.header_includes || raw.headerIncludes) || undefined,
    headerValueIncludes: text(raw.headerValueIncludes || raw.header_value_includes || raw.headerValue || raw.header_value) || undefined,
    header_value_includes: text(raw.header_value_includes || raw.headerValueIncludes || raw.headerValue || raw.header_value) || undefined,
    bodyIncludes: text(raw.bodyIncludes || raw.body_includes || raw.bodyContains || raw.body_contains) || undefined,
    body_includes: text(raw.body_includes || raw.bodyIncludes || raw.bodyContains || raw.body_contains) || undefined,
    bodyJsonPath: text(raw.bodyJsonPath || raw.body_json_path || raw.jsonPath || raw.json_path) || undefined,
    body_json_path: text(raw.body_json_path || raw.bodyJsonPath || raw.jsonPath || raw.json_path) || undefined,
    bodyJsonEquals: raw.bodyJsonEquals ?? raw.body_json_equals ?? raw.bodyJsonValue ?? raw.body_json_value,
    body_json_equals: raw.body_json_equals ?? raw.bodyJsonEquals ?? raw.bodyJsonValue ?? raw.body_json_value,
    bodyJsonIncludes: text(raw.bodyJsonIncludes || raw.body_json_includes) || undefined,
    body_json_includes: text(raw.body_json_includes || raw.bodyJsonIncludes) || undefined,
    property: text(raw.property || raw.styleProperty || raw.style_property || raw.cssProperty || raw.css_property) || undefined,
    styleProperty: text(raw.styleProperty || raw.style_property || raw.cssProperty || raw.css_property || raw.property) || undefined,
    style_property: text(raw.style_property || raw.styleProperty || raw.cssProperty || raw.css_property || raw.property) || undefined,
    cssProperty: text(raw.cssProperty || raw.css_property || raw.styleProperty || raw.style_property || raw.property) || undefined,
    css_property: text(raw.css_property || raw.cssProperty || raw.styleProperty || raw.style_property || raw.property) || undefined,
    fileName: text(raw.fileName || raw.file_name || raw.filename || raw.downloadName || raw.download_name) || undefined,
    file_name: text(raw.file_name || raw.fileName || raw.filename || raw.downloadName || raw.download_name) || undefined,
    filename: text(raw.filename || raw.fileName || raw.file_name || raw.downloadName || raw.download_name) || undefined,
    fileNameIncludes: text(raw.fileNameIncludes || raw.file_name_includes || raw.filenameIncludes || raw.filename_includes) || undefined,
    file_name_includes: text(raw.file_name_includes || raw.fileNameIncludes || raw.filenameIncludes || raw.filename_includes) || undefined,
    filenameIncludes: text(raw.filenameIncludes || raw.filename_includes || raw.fileNameIncludes || raw.file_name_includes) || undefined,
    filename_includes: text(raw.filename_includes || raw.filenameIncludes || raw.fileNameIncludes || raw.file_name_includes) || undefined,
    contentIncludes: text(raw.contentIncludes || raw.content_includes || raw.bodyIncludes || raw.body_includes) || undefined,
    content_includes: text(raw.content_includes || raw.contentIncludes || raw.bodyIncludes || raw.body_includes) || undefined,
    minBytes: optionalNumber(raw.minBytes || raw.min_bytes || raw.sizeBytes || raw.size_bytes),
    min_bytes: optionalNumber(raw.min_bytes || raw.minBytes || raw.sizeBytes || raw.size_bytes),
    count: optionalNumber(raw.count ?? raw.expectedCount ?? raw.expected_count),
    expectedCount: optionalNumber(raw.expectedCount ?? raw.expected_count ?? raw.count),
    expected_count: optionalNumber(raw.expected_count ?? raw.expectedCount ?? raw.count),
    minCount: optionalNumber(raw.minCount ?? raw.min_count ?? raw.count),
    min_count: optionalNumber(raw.min_count ?? raw.minCount ?? raw.count),
    maxCount: optionalNumber(raw.maxCount ?? raw.max_count ?? raw.count),
    max_count: optionalNumber(raw.max_count ?? raw.maxCount ?? raw.count),
    minUniqueColors: optionalNumber(raw.minUniqueColors ?? raw.min_unique_colors),
    min_unique_colors: optionalNumber(raw.min_unique_colors ?? raw.minUniqueColors),
    minNonWhitePixels: optionalNumber(raw.minNonWhitePixels ?? raw.min_non_white_pixels),
    min_non_white_pixels: optionalNumber(raw.min_non_white_pixels ?? raw.minNonWhitePixels),
    message: raw.message === undefined ? undefined : String(raw.message),
    messageIncludes: text(raw.messageIncludes || raw.message_includes || raw.messageContains || raw.message_contains) || undefined,
    message_includes: text(raw.message_includes || raw.messageIncludes || raw.messageContains || raw.message_contains) || undefined,
    accessibleName: text(raw.accessibleName || raw.accessible_name || raw.ariaName || raw.aria_name) || undefined,
    accessible_name: text(raw.accessible_name || raw.accessibleName || raw.ariaName || raw.aria_name) || undefined,
    accessibleDescription: text(raw.accessibleDescription || raw.accessible_description || raw.ariaDescription || raw.aria_description) || undefined,
    accessible_description: text(raw.accessible_description || raw.accessibleDescription || raw.ariaDescription || raw.aria_description) || undefined,
    description: text(raw.description || raw.accessibleDescription || raw.accessible_description || raw.ariaDescription || raw.aria_description) || undefined,
    descriptionIncludes: text(raw.descriptionIncludes || raw.description_includes || raw.descriptionContains || raw.description_contains) || undefined,
    description_includes: text(raw.description_includes || raw.descriptionIncludes || raw.descriptionContains || raw.description_contains) || undefined,
    snapshotIncludes: text(raw.snapshotIncludes || raw.snapshot_includes || raw.ariaSnapshotIncludes || raw.aria_snapshot_includes) || undefined,
    snapshot_includes: text(raw.snapshot_includes || raw.snapshotIncludes || raw.ariaSnapshotIncludes || raw.aria_snapshot_includes) || undefined,
    dialogType: text(raw.dialogType || raw.dialog_type || raw.expectedDialogType || raw.expected_dialog_type || raw.alertType || raw.alert_type) || undefined,
    dialog_type: text(raw.dialog_type || raw.dialogType || raw.expectedDialogType || raw.expected_dialog_type || raw.alertType || raw.alert_type) || undefined,
    tableSelector: text(raw.tableSelector || raw.table_selector || raw.table || raw.tableCss || raw.table_css) || undefined,
    table_selector: text(raw.table_selector || raw.tableSelector || raw.table || raw.tableCss || raw.table_css) || undefined,
    tableLocator: text(raw.tableLocator || raw.table_locator || raw.tableSelector || raw.table_selector || raw.table) || undefined,
    table_locator: text(raw.table_locator || raw.tableLocator || raw.tableSelector || raw.table_selector || raw.table) || undefined,
    rowText: text(raw.rowText || raw.row_text || raw.row || raw.rowContains || raw.row_contains) || undefined,
    row_text: text(raw.row_text || raw.rowText || raw.row || raw.rowContains || raw.row_contains) || undefined,
    rowIndex: optionalNumber(raw.rowIndex ?? raw.row_index),
    row_index: optionalNumber(raw.row_index ?? raw.rowIndex),
    rowNumber: optionalNumber(raw.rowNumber ?? raw.row_number),
    row_number: optionalNumber(raw.row_number ?? raw.rowNumber),
    columnName: text(raw.columnName || raw.column_name || raw.columnHeader || raw.column_header || raw.header) || undefined,
    column_name: text(raw.column_name || raw.columnName || raw.columnHeader || raw.column_header || raw.header) || undefined,
    columnHeader: text(raw.columnHeader || raw.column_header || raw.columnName || raw.column_name || raw.header) || undefined,
    column_header: text(raw.column_header || raw.columnHeader || raw.columnName || raw.column_name || raw.header) || undefined,
    columnIndex: optionalNumber(raw.columnIndex ?? raw.column_index),
    column_index: optionalNumber(raw.column_index ?? raw.columnIndex),
    columnNumber: optionalNumber(raw.columnNumber ?? raw.column_number),
    column_number: optionalNumber(raw.column_number ?? raw.columnNumber),
    texts: normalizeStringList(raw.texts || raw.expectedTexts || raw.expected_texts),
    values: normalizeStringList(raw.values),
    expectedTexts: normalizeStringList(raw.expectedTexts || raw.expected_texts || raw.texts),
    expected_texts: normalizeStringList(raw.expected_texts || raw.expectedTexts || raw.texts),
    key: text(raw.key || raw.storageKey || raw.storage_key) || undefined,
    expression: text(raw.expression || raw.js || raw.javascript) || undefined,
    testId: text(raw.testId || raw.test_id || raw.dataTestId || raw.data_testid || raw.dataTestid) || undefined,
    test_id: text(raw.test_id || raw.testId || raw.dataTestId || raw.data_testid || raw.dataTestid) || undefined,
    dataTestId: text(raw.dataTestId || raw.data_testid || raw.dataTestid || raw.testId || raw.test_id) || undefined,
    data_testid: text(raw.data_testid || raw.dataTestId || raw.dataTestid || raw.testId || raw.test_id) || undefined,
    label: text(raw.label || raw.ariaLabel || raw.aria_label) || undefined,
    placeholder: text(raw.placeholder) || undefined,
    role: text(raw.role) || undefined,
    name: text(raw.name || raw.accessibleName || raw.accessible_name) || undefined,
    altText: text(raw.altText || raw.alt_text || raw.alt) || undefined,
    alt_text: text(raw.alt_text || raw.altText || raw.alt) || undefined,
    title: text(raw.title) || undefined,
    exact: raw.exact === undefined ? undefined : raw.exact !== false,
    timeoutMs: optionalNumber(raw.timeoutMs || raw.timeout_ms),
    timeout_ms: optionalNumber(raw.timeout_ms || raw.timeoutMs),
    settleMs: optionalNumber(raw.settleMs || raw.settle_ms),
    settle_ms: optionalNumber(raw.settle_ms || raw.settleMs),
  };
}

function normalizeBrowserSession(raw: any, issues: WorkOrderIssue[], project: string, checkName: string, index: number): BrowserSessionSpec | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    issues.push({ severity: "error", code: "invalid_browser_session", message: `Browser session ${index + 1} in "${checkName}" must be an object.`, project });
    return null;
  }
  const name = text(raw.name || raw.session || raw.id);
  const setupName = `${checkName} / session ${name || index + 1} setup`;
  const setupActions = asArray(raw.setupActions || raw.setup_actions || raw.actions)
    .map((action, actionIndex) => normalizeBrowserAction(action, issues, project, setupName, actionIndex))
    .filter(Boolean) as BrowserActionSpec[];
  if (["storageState", "storage_state", "authState", "auth_state"].some(key => raw[key] !== undefined)) {
    issues.push({
      severity: "error",
      code: "invalid_browser_storage_state",
      message: `Browser session ${index + 1} in "${checkName}" must reference authentication state with storageStatePath/authStatePath; inline cookies, tokens, and storage values are not accepted.`,
      project,
    });
  }
  const storageStatePath = text(raw.storageStatePath || raw.storage_state_path || raw.authStatePath || raw.auth_state_path);
  return {
    name,
    url: text(raw.url || raw.targetUrl || raw.target_url) || undefined,
    storageStatePath: storageStatePath || undefined,
    storage_state_path: storageStatePath || undefined,
    authStatePath: storageStatePath || undefined,
    auth_state_path: storageStatePath || undefined,
    setupActions,
    setup_actions: setupActions,
  };
}

function normalizeBrowserSessionLeafStep(raw: any, issues: WorkOrderIssue[], project: string, checkName: string, label: string, index: number): BrowserSessionLeafStepSpec | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    issues.push({ severity: "error", code: "invalid_browser_session_step", message: `${label} in "${checkName}" must be an object.`, project });
    return null;
  }
  const session = text(raw.session || raw.sessionName || raw.session_name || raw.actor);
  const rawAction = raw.action || raw.do;
  const rawAssertion = raw.assertion || raw.expect;
  if (Boolean(rawAction) === Boolean(rawAssertion)) {
    issues.push({ severity: "error", code: "invalid_browser_session_step_kind", message: `${label} in "${checkName}" must contain exactly one action or assertion.`, project });
  }
  const stepName = `${checkName} / session ${session || "(missing)"}`;
  const action = rawAction ? normalizeBrowserAction(rawAction, issues, project, stepName, index) || undefined : undefined;
  const assertion = rawAssertion ? normalizeBrowserAssertion(rawAssertion, issues, project, stepName, index) || undefined : undefined;
  if (!action && !assertion) return null;
  return { session, action, assertion };
}

function normalizeBrowserSessionComparisonStep(raw: any, issues: WorkOrderIssue[], project: string, checkName: string, index: number): BrowserSessionComparisonStepSpec | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    issues.push({ severity: "error", code: "invalid_browser_session_comparison", message: `Browser session comparison step ${index + 1} in "${checkName}" must be an object.`, project });
    return null;
  }
  const leftSession = text(raw.leftSession || raw.left_session || raw.left || raw.firstSession || raw.first_session || raw.sourceSession || raw.source_session);
  const rightSession = text(raw.rightSession || raw.right_session || raw.right || raw.secondSession || raw.second_session || raw.targetSession || raw.target_session);
  const expression = text(raw.expression || raw.js || raw.javascript);
  const leftExpression = text(raw.leftExpression || raw.left_expression || raw.leftJs || raw.left_js || expression);
  const rightExpression = text(raw.rightExpression || raw.right_expression || raw.rightJs || raw.right_js || expression);
  const operatorKey = text(raw.operator || raw.relation || raw.mode || "equals").replace(/[\s_-]+/g, "").toLowerCase();
  const operatorAliases: Record<string, "equals" | "notEquals" | "includes"> = {
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
  const timeoutMs = optionalNumber(rawTimeoutMs);
  const pollMs = optionalNumber(rawPollMs);
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
      operator: operator as "equals" | "notEquals" | "includes",
      ...(timeoutMs === undefined ? {} : { timeoutMs }),
      ...(pollMs === undefined ? {} : { pollMs }),
    },
  };
}

function normalizeBrowserSessionStep(raw: any, issues: WorkOrderIssue[], project: string, checkName: string, index: number): BrowserSessionStepSpec | null {
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
      .filter(Boolean) as BrowserSessionLeafStepSpec[];
    return { parallel };
  }
  return normalizeBrowserSessionLeafStep(raw, issues, project, checkName, `Browser session step ${index + 1}`, index);
}

function normalizeHeaders(raw: any) {
  const out: Record<string, string> = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  for (const [key, value] of Object.entries(raw)) {
    if (value !== undefined && value !== null) out[key] = String(value);
  }
  return out;
}

function normalizeCheckContext(raw: any) {
  const context = raw?.context && typeof raw.context === "object" && !Array.isArray(raw.context)
    ? { ...raw.context }
    : {};
  const acceptanceCriteria = asArray(
    raw?.coversAcceptanceCriteria
    || raw?.covers_acceptance_criteria
    || raw?.acceptanceCriteria
    || raw?.acceptance_criteria
    || context.coversAcceptanceCriteria
    || context.covers_acceptance_criteria
    || context.acceptanceCriteria
    || context.acceptance_criteria,
  ).map(String).map(item => item.trim()).filter(Boolean);
  if (acceptanceCriteria.length) context.acceptanceCriteria = Array.from(new Set(acceptanceCriteria));
  return Object.keys(context).length ? context : undefined;
}

function normalizeHttpAssertion(raw: any, issues: WorkOrderIssue[], project: string, checkName: string, index: number): HttpAssertionSpec | null {
  if (!raw || typeof raw !== "object") {
    issues.push({ severity: "error", code: "invalid_http_assertion", message: `HTTP assertion ${index + 1} in "${checkName}" must be an object.`, project });
    return null;
  }
  const type = normalizedType(raw.type || raw.assertion || raw.kind, HTTP_ASSERTION_ALIASES);
  if (!HTTP_ASSERTION_TYPES.has(type)) {
    issues.push({ severity: "error", code: "invalid_http_assertion_type", message: `HTTP assertion ${index + 1} in "${checkName}" has unsupported type "${type || "(missing)"}".`, project });
    return null;
  }
  return {
    ...raw,
    type: type as HttpAssertionSpec["type"],
    status: optionalNumberList(raw.status ?? raw.statusCode ?? raw.status_code ?? raw.expectedStatus ?? raw.expected_status),
    statusCode: optionalNumberList(raw.statusCode ?? raw.status_code ?? raw.status),
    status_code: optionalNumberList(raw.status_code ?? raw.statusCode ?? raw.status),
    text: raw.text === undefined ? undefined : String(raw.text),
    value: raw.value,
    path: text(raw.path || raw.jsonPath || raw.json_path) || undefined,
  };
}

function normalizeHttpConcurrencyAssertion(
  raw: any,
  issues: WorkOrderIssue[],
  project: string,
  checkName: string,
  index: number,
): HttpConcurrencyAssertionSpec | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    issues.push({
      severity: "error",
      code: "invalid_http_concurrency_assertion",
      message: `HTTP concurrency assertion ${index + 1} in "${checkName}" must be an object.`,
      project,
    });
    return null;
  }
  const type = normalizedType(
    raw.type || raw.assertion || raw.kind,
    HTTP_CONCURRENCY_ASSERTION_ALIASES,
  );
  if (!HTTP_CONCURRENCY_ASSERTION_TYPES.has(type)) {
    issues.push({
      severity: "error",
      code: "invalid_http_concurrency_assertion_type",
      message: `HTTP concurrency assertion ${index + 1} in "${checkName}" has unsupported type "${type || "(missing)"}".`,
      project,
    });
    return null;
  }
  const count = optionalNumber(raw.count ?? raw.expectedCount ?? raw.expected_count);
  const minCount = optionalNumber(raw.minCount ?? raw.min_count);
  const maxCount = optionalNumber(raw.maxCount ?? raw.max_count);
  const counts = [count, minCount, maxCount].filter(value => value !== undefined) as number[];
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
  const status = optionalNumber(raw.status ?? raw.statusCode ?? raw.status_code);
  if (type === "statusCount" && (!Number.isInteger(status) || Number(status) < 100 || Number(status) > 599)) {
    issues.push({
      severity: "error",
      code: "invalid_http_concurrency_status",
      message: `HTTP concurrency statusCount assertion ${index + 1} in "${checkName}" requires an HTTP status from 100 to 599.`,
      project,
    });
  }
  const path = text(raw.path || raw.jsonPath || raw.json_path);
  if ((type === "jsonPathUniqueCount" || type === "jsonPathAllEqual") && !path) {
    issues.push({
      severity: "error",
      code: "missing_http_concurrency_json_path",
      message: `HTTP concurrency ${type} assertion ${index + 1} in "${checkName}" requires path/jsonPath.`,
      project,
    });
  }
  return {
    type: type as HttpConcurrencyAssertionSpec["type"],
    ...(status === undefined ? {} : { status, statusCode: status, status_code: status }),
    ...(path ? { path } : {}),
    ...(count === undefined ? {} : { count, expectedCount: count, expected_count: count }),
    ...(minCount === undefined ? {} : { minCount, min_count: minCount }),
    ...(maxCount === undefined ? {} : { maxCount, max_count: maxCount }),
  };
}

function normalizeHttpConcurrency(
  raw: any,
  issues: WorkOrderIssue[],
  project: string,
  checkName: string,
): HttpConcurrencySpec | undefined {
  const rawConcurrency = raw.concurrency
    ?? raw.concurrentRequests
    ?? raw.concurrent_requests
    ?? raw.parallelRequests
    ?? raw.parallel_requests;
  if (rawConcurrency === undefined || rawConcurrency === null || rawConcurrency === "") return undefined;
  const objectConfig = rawConcurrency && typeof rawConcurrency === "object" && !Array.isArray(rawConcurrency)
    ? rawConcurrency
    : {};
  const requests = optionalNumber(
    typeof rawConcurrency === "number" || typeof rawConcurrency === "string"
      ? rawConcurrency
      : objectConfig.requests
        ?? objectConfig.count
        ?? objectConfig.concurrentRequests
        ?? objectConfig.concurrent_requests
        ?? objectConfig.parallelRequests
        ?? objectConfig.parallel_requests,
  );
  if (
    requests === undefined
    || !Number.isInteger(requests)
    || requests < MIN_HTTP_CONCURRENT_REQUESTS
    || requests > MAX_HTTP_CONCURRENT_REQUESTS
  ) {
    issues.push({
      severity: "error",
      code: "invalid_http_concurrency_requests",
      message: `HTTP check "${checkName}" concurrency must be an integer from ${MIN_HTTP_CONCURRENT_REQUESTS} to ${MAX_HTTP_CONCURRENT_REQUESTS}.`,
      project,
    });
  }
  const rawAssertions = asArray(
    objectConfig.aggregateAssertions
    || objectConfig.aggregate_assertions
    || objectConfig.assertions
    || raw.concurrencyAssertions
    || raw.concurrency_assertions,
  );
  const aggregateAssertions = rawAssertions
    .map((assertion, index) => normalizeHttpConcurrencyAssertion(assertion, issues, project, checkName, index))
    .filter(Boolean) as HttpConcurrencyAssertionSpec[];
  return {
    requests: requests || MIN_HTTP_CONCURRENT_REQUESTS,
    aggregateAssertions,
  };
}

export function normalizeHttpCheck(raw: any, issues: WorkOrderIssue[], project: string, index: number, forceAdversarial = false): HttpCheckSpec | null {
  if (!raw || typeof raw !== "object") {
    issues.push({ severity: "error", code: "invalid_http_check", message: `HTTP check ${index + 1} must be an object.`, project });
    return null;
  }
  const checkName = text(raw.name || raw.title) || `HTTP check ${index + 1}`;
  const url = text(raw.url || raw.targetUrl || raw.target_url || raw.path);
  if (!url) {
    issues.push({ severity: "error", code: "invalid_http_check_url", message: `HTTP check "${checkName}" must include url/path.`, project });
    return null;
  }
  const assertions = asArray(raw.assertions || raw.expectations)
    .map((assertion, assertionIndex) => normalizeHttpAssertion(assertion, issues, project, checkName, assertionIndex))
    .filter(Boolean) as HttpAssertionSpec[];
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
    method: text(raw.method || raw.httpMethod || raw.http_method || "GET").toUpperCase(),
    headers: normalizeHeaders(raw.headers),
    body: raw.body === undefined ? undefined : typeof raw.body === "string" ? raw.body : JSON.stringify(raw.body),
    json: raw.json,
    assertions,
    adversarial: forceAdversarial || raw.adversarial === true || raw.probe === true,
    probeType: text(raw.probeType || raw.probe_type || raw.kind || raw.category) || undefined,
    probe_type: text(raw.probe_type || raw.probeType || raw.kind || raw.category) || undefined,
    coversAcceptanceCriteria: asArray(raw.coversAcceptanceCriteria || raw.covers_acceptance_criteria).map(String).filter(Boolean),
    covers_acceptance_criteria: asArray(raw.covers_acceptance_criteria || raw.coversAcceptanceCriteria).map(String).filter(Boolean),
    timeoutMs: optionalNumber(raw.timeoutMs || raw.timeout_ms),
    timeout_ms: optionalNumber(raw.timeout_ms || raw.timeoutMs),
    context,
    ...(concurrency ? { concurrency } : {}),
  };
}

export function normalizeBrowserCheck(raw: any, issues: WorkOrderIssue[], project: string, index: number, forceAdversarial = false): BrowserCheckSpec | null {
  if (!raw || typeof raw !== "object") {
    issues.push({ severity: "error", code: "invalid_browser_check", message: `Browser check ${index + 1} must be an object.`, project });
    return null;
  }
  const checkName = text(raw.name || raw.title) || `browser check ${index + 1}`;
  const actions = asArray(raw.actions || raw.steps)
    .map((action, actionIndex) => normalizeBrowserAction(action, issues, project, checkName, actionIndex))
    .filter(Boolean) as BrowserActionSpec[];
  const assertions = asArray(raw.assertions || raw.expectations)
    .map((assertion, assertionIndex) => normalizeBrowserAssertion(assertion, issues, project, checkName, assertionIndex))
    .filter(Boolean) as BrowserAssertionSpec[];
  const sessions = asArray(raw.sessions || raw.browserSessions || raw.browser_sessions)
    .map((session, sessionIndex) => normalizeBrowserSession(session, issues, project, checkName, sessionIndex))
    .filter(Boolean) as BrowserSessionSpec[];
  const sessionSteps = asArray(raw.sessionSteps || raw.session_steps || raw.scenarioSteps || raw.scenario_steps)
    .map((step, stepIndex) => normalizeBrowserSessionStep(step, issues, project, checkName, stepIndex))
    .filter(Boolean) as BrowserSessionStepSpec[];
  const rawViewport = raw.viewport && typeof raw.viewport === "object" ? raw.viewport : {};
  const viewportWidth = optionalNumber(raw.viewportWidth || raw.viewport_width || raw.width || rawViewport.width);
  const viewportHeight = optionalNumber(raw.viewportHeight || raw.viewport_height || raw.height || rawViewport.height);
  const deviceScaleFactor = optionalNumber(raw.deviceScaleFactor || raw.device_scale_factor || rawViewport.deviceScaleFactor || rawViewport.device_scale_factor);
  const rawContext = raw.context && typeof raw.context === "object" ? raw.context : {};
  if (
    ["storageState", "storage_state", "authState", "auth_state"].some(key => raw[key] !== undefined)
    || ["storageState", "storage_state", "authState", "auth_state"].some(key => rawContext[key] !== undefined)
  ) {
    issues.push({
      severity: "error",
      code: "invalid_browser_storage_state",
      message: `Browser check "${checkName}" must reference authentication state with storageStatePath/authStatePath; inline cookies, tokens, and storage values are not accepted.`,
      project,
    });
  }
  const locale = text(raw.locale || raw.browserLocale || raw.browser_locale || rawContext.locale) || undefined;
  const timezoneId = text(raw.timezoneId || raw.timezone_id || raw.timeZoneId || raw.time_zone_id || raw.timezone || rawContext.timezoneId || rawContext.timezone_id || rawContext.timezone) || undefined;
  const colorScheme = text(raw.colorScheme || raw.color_scheme || raw.theme || rawContext.colorScheme || rawContext.color_scheme) || undefined;
  const reducedMotion = text(raw.reducedMotion || raw.reduced_motion || raw.motion || rawContext.reducedMotion || rawContext.reduced_motion) || undefined;
  const permissions = normalizeStringList(raw.permissions || raw.browserPermissions || raw.browser_permissions || rawContext.permissions);
  const geolocation = normalizeBrowserGeolocation(raw.geolocation || raw.geo || raw.location || rawContext.geolocation || rawContext.geo || rawContext.location);
  const storageStatePath = text(
    raw.storageStatePath
    || raw.storage_state_path
    || raw.authStatePath
    || raw.auth_state_path
    || rawContext.storageStatePath
    || rawContext.storage_state_path
    || rawContext.authStatePath
    || rawContext.auth_state_path,
  );
  const rawStabilityRuns = raw.stabilityRuns ?? raw.stability_runs ?? raw.repeatRuns ?? raw.repeat_runs;
  const parsedStabilityRuns = optionalNumber(rawStabilityRuns);
  const stabilityRuns = rawStabilityRuns === undefined
    ? undefined
    : Number.isInteger(parsedStabilityRuns) && Number(parsedStabilityRuns) >= 1 && Number(parsedStabilityRuns) <= MAX_BROWSER_STABILITY_RUNS
      ? Number(parsedStabilityRuns)
      : undefined;
  if (rawStabilityRuns !== undefined && stabilityRuns === undefined) {
    issues.push({
      severity: "error",
      code: "invalid_browser_stability_runs",
      message: `Browser check "${checkName}" stabilityRuns must be an integer from 1 to ${MAX_BROWSER_STABILITY_RUNS}.`,
      project,
    });
  }
  const normalizedAuthentication = normalizeBrowserAuthenticationConfig(raw);
  for (const message of normalizedAuthentication.errors) {
    issues.push({
      severity: "error",
      code: "invalid_browser_authentication",
      message: `Browser check "${checkName}": ${message}`,
      project,
    });
  }
  if (normalizedAuthentication.config?.mode === "existing_session") {
    if (actions.some(action => browserActionValueEnvName(action))) {
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
  const check: BrowserCheckSpec = {
    name: checkName,
    url: text(raw.url || raw.targetUrl || raw.target_url) || undefined,
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
    userAgent: text(raw.userAgent || raw.user_agent) || undefined,
    user_agent: text(raw.user_agent || raw.userAgent) || undefined,
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
    probeType: text(raw.probeType || raw.probe_type || raw.kind || raw.category) || undefined,
    probe_type: text(raw.probe_type || raw.probeType || raw.kind || raw.category) || undefined,
    coversAcceptanceCriteria: asArray(raw.coversAcceptanceCriteria || raw.covers_acceptance_criteria).map(String).filter(Boolean),
    covers_acceptance_criteria: asArray(raw.covers_acceptance_criteria || raw.coversAcceptanceCriteria).map(String).filter(Boolean),
    timeoutMs: optionalNumber(raw.timeoutMs || raw.timeout_ms),
    timeout_ms: optionalNumber(raw.timeout_ms || raw.timeoutMs),
    context: normalizeCheckContext(raw),
  };
  if (hasMultiSessionBrowserScenario(check)) {
    for (const message of validateMultiSessionBrowserScenario(check)) {
      issues.push({ severity: "error", code: "invalid_browser_multi_session", message: `${checkName}: ${message}`, project });
    }
  } else if (actions.some(action => action.effectSession || action.effect_session)) {
    issues.push({
      severity: "error",
      code: "invalid_browser_action_effect_session",
      message: `Browser check "${checkName}" can use effectSession only inside an isolated multi-session scenario.`,
      project,
    });
  }
  return check;
}
