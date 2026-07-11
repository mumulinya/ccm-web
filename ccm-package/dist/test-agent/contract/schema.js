"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestAgentVerdictContractSchema = exports.TestAgentReportContractSchema = exports.TestAgentWorkOrderContractSchema = exports.TestAgentHandoffContractSchema = exports.TestAgentHandoffProjectContractSchema = exports.TestAgentProjectTargetContractSchema = exports.TestAgentBrowserProbeTemplateContractSchema = exports.TestAgentBrowserCheckContractSchema = exports.TestAgentBrowserAssertionContractSchema = exports.TestAgentBrowserActionContractSchema = exports.TestAgentHttpCheckContractSchema = exports.TestAgentHttpConcurrencyContractSchema = exports.TestAgentHttpConcurrencyAssertionContractSchema = exports.TestAgentHttpAssertionContractSchema = exports.TestAgentOptionsContractSchema = exports.TEST_AGENT_CONTRACT_IDS = void 0;
const zod_1 = require("zod");
const recovery_validation_1 = require("../browser/recovery-validation");
const action_effects_1 = require("../browser/action-effects");
const action_effect_summary_1 = require("../browser/action-effect-summary");
const adversarial_summary_1 = require("../adversarial-summary");
const acceptance_gate_1 = require("../acceptance-gate");
const http_concurrency_1 = require("../http-concurrency");
const http_page_resources_1 = require("../http-page-resources");
exports.TEST_AGENT_CONTRACT_IDS = {
    handoff: "ccm-test-agent-handoff-v1",
    workOrder: "ccm-test-agent-work-order-v1",
    report: "ccm-test-agent-report-v1",
    verdict: "ccm-test-agent-verdict-v1",
};
const primitiveValue = zod_1.z.union([zod_1.z.string(), zod_1.z.number(), zod_1.z.boolean(), zod_1.z.undefined()]);
const optionalString = zod_1.z.string().optional();
const timeoutMs = zod_1.z.number().int().positive().optional();
const countValue = zod_1.z.number().int().nonnegative().optional();
const stringList = zod_1.z.array(zod_1.z.string());
const coordinate = zod_1.z.union([
    zod_1.z.tuple([zod_1.z.number(), zod_1.z.number()]),
    zod_1.z.object({ x: zod_1.z.number(), y: zod_1.z.number() }).passthrough(),
]);
const statusValue = zod_1.z.union([zod_1.z.number().int(), zod_1.z.string()]);
const statusValueOrList = zod_1.z.union([statusValue, zod_1.z.array(statusValue)]);
function requireAnyField(fields, message) {
    return (value, ctx) => {
        if (!fields.some(field => value[field] !== undefined && value[field] !== null && value[field] !== "")) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                message,
                path: [fields[0]],
            });
        }
    };
}
function rejectInlineBrowserStorageState(value, ctx) {
    const context = value.context && typeof value.context === "object" && !Array.isArray(value.context)
        ? value.context
        : {};
    for (const key of ["storageState", "storage_state", "authState", "auth_state"]) {
        if (Object.prototype.hasOwnProperty.call(value, key) || Object.prototype.hasOwnProperty.call(context, key)) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                message: "Inline browser authentication state is not accepted; use storageStatePath/authStatePath.",
                path: [key],
            });
        }
    }
}
exports.TestAgentOptionsContractSchema = zod_1.z.object({
    artifactDir: optionalString,
    commandTimeoutMs: timeoutMs,
    browserTimeoutMs: timeoutMs,
    httpTimeoutMs: timeoutMs,
    startupTimeoutMs: timeoutMs,
    maxOutputChars: zod_1.z.number().int().positive().optional(),
    maxHttpResourceChecks: zod_1.z.number().int().nonnegative().optional(),
    failOnConsoleError: zod_1.z.boolean().optional(),
    failOnHttpResourceError: zod_1.z.boolean().optional(),
    verificationOnly: zod_1.z.boolean().optional(),
    browserProvider: zod_1.z.enum(["auto", "playwright", "mcp", "none"]).optional(),
    autoDiscoverVerificationCommands: zod_1.z.boolean().optional(),
    collectBrowserArtifacts: zod_1.z.boolean().optional(),
    collectBrowserVideo: zod_1.z.boolean().optional(),
    requireAdversarialProbe: zod_1.z.boolean().optional(),
    require_adversarial_probe: zod_1.z.boolean().optional(),
    adversarialProbeWaiver: optionalString,
    adversarial_probe_waiver: optionalString,
}).passthrough().superRefine((value, ctx) => {
    const required = value.requireAdversarialProbe ?? value.require_adversarial_probe;
    const waiver = String(value.adversarialProbeWaiver || value.adversarial_probe_waiver || "").trim();
    if (required === false && !waiver) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: "Disabling requireAdversarialProbe requires a non-empty adversarialProbeWaiver reason.",
            path: ["adversarialProbeWaiver"],
        });
    }
});
exports.TestAgentHttpAssertionContractSchema = zod_1.z.object({
    type: zod_1.z.string().min(1).optional(),
    assertion: zod_1.z.string().min(1).optional(),
    kind: zod_1.z.string().min(1).optional(),
    status: statusValueOrList.optional(),
    statusCode: statusValueOrList.optional(),
    status_code: statusValueOrList.optional(),
    text: optionalString,
    value: zod_1.z.any().optional(),
    path: optionalString,
    jsonPath: optionalString,
    json_path: optionalString,
}).passthrough().superRefine(requireAnyField(["type", "assertion", "kind"], "HTTP assertion must include type/assertion/kind."));
const httpConcurrencyCount = zod_1.z.number().int().min(http_concurrency_1.MIN_HTTP_CONCURRENT_REQUESTS).max(http_concurrency_1.MAX_HTTP_CONCURRENT_REQUESTS);
exports.TestAgentHttpConcurrencyAssertionContractSchema = zod_1.z.object({
    type: zod_1.z.string().min(1).optional(),
    assertion: zod_1.z.string().min(1).optional(),
    kind: zod_1.z.string().min(1).optional(),
    status: zod_1.z.number().int().min(100).max(599).optional(),
    statusCode: zod_1.z.number().int().min(100).max(599).optional(),
    status_code: zod_1.z.number().int().min(100).max(599).optional(),
    path: optionalString,
    jsonPath: optionalString,
    json_path: optionalString,
    count: zod_1.z.number().int().nonnegative().optional(),
    expectedCount: zod_1.z.number().int().nonnegative().optional(),
    expected_count: zod_1.z.number().int().nonnegative().optional(),
    minCount: zod_1.z.number().int().nonnegative().optional(),
    min_count: zod_1.z.number().int().nonnegative().optional(),
    maxCount: zod_1.z.number().int().nonnegative().optional(),
    max_count: zod_1.z.number().int().nonnegative().optional(),
}).passthrough().superRefine(requireAnyField(["type", "assertion", "kind"], "HTTP concurrency assertion must include type/assertion/kind."));
exports.TestAgentHttpConcurrencyContractSchema = zod_1.z.union([
    httpConcurrencyCount,
    zod_1.z.object({
        requests: httpConcurrencyCount.optional(),
        count: httpConcurrencyCount.optional(),
        concurrentRequests: httpConcurrencyCount.optional(),
        concurrent_requests: httpConcurrencyCount.optional(),
        parallelRequests: httpConcurrencyCount.optional(),
        parallel_requests: httpConcurrencyCount.optional(),
        aggregateAssertions: zod_1.z.array(exports.TestAgentHttpConcurrencyAssertionContractSchema).optional(),
        aggregate_assertions: zod_1.z.array(exports.TestAgentHttpConcurrencyAssertionContractSchema).optional(),
        assertions: zod_1.z.array(exports.TestAgentHttpConcurrencyAssertionContractSchema).optional(),
    }).passthrough().superRefine(requireAnyField(["requests", "count", "concurrentRequests", "concurrent_requests", "parallelRequests", "parallel_requests"], "HTTP concurrency config must include requests/count.")),
]);
exports.TestAgentHttpCheckContractSchema = zod_1.z.object({
    name: optionalString,
    title: optionalString,
    url: optionalString,
    path: optionalString,
    targetUrl: optionalString,
    target_url: optionalString,
    method: optionalString,
    httpMethod: optionalString,
    http_method: optionalString,
    headers: zod_1.z.record(primitiveValue).optional(),
    body: zod_1.z.any().optional(),
    json: zod_1.z.any().optional(),
    assertions: zod_1.z.array(exports.TestAgentHttpAssertionContractSchema).optional(),
    expectations: zod_1.z.array(exports.TestAgentHttpAssertionContractSchema).optional(),
    adversarial: zod_1.z.boolean().optional(),
    probe: zod_1.z.boolean().optional(),
    probeType: optionalString,
    probe_type: optionalString,
    coversAcceptanceCriteria: stringList.optional(),
    covers_acceptance_criteria: stringList.optional(),
    acceptanceCriteria: stringList.optional(),
    acceptance_criteria: stringList.optional(),
    context: zod_1.z.record(zod_1.z.any()).optional(),
    concurrency: exports.TestAgentHttpConcurrencyContractSchema.optional(),
    concurrentRequests: httpConcurrencyCount.optional(),
    concurrent_requests: httpConcurrencyCount.optional(),
    parallelRequests: httpConcurrencyCount.optional(),
    parallel_requests: httpConcurrencyCount.optional(),
    concurrencyAssertions: zod_1.z.array(exports.TestAgentHttpConcurrencyAssertionContractSchema).optional(),
    concurrency_assertions: zod_1.z.array(exports.TestAgentHttpConcurrencyAssertionContractSchema).optional(),
    timeoutMs: timeoutMs,
    timeout_ms: timeoutMs,
}).passthrough().superRefine(requireAnyField(["url", "path", "targetUrl", "target_url"], "HTTP check must include url/path."));
exports.TestAgentBrowserActionContractSchema = zod_1.z.object({
    type: zod_1.z.string().min(1).optional(),
    action: zod_1.z.string().min(1).optional(),
    kind: zod_1.z.string().min(1).optional(),
    selector: optionalString,
    css: optionalString,
    locator: optionalString,
    text: zod_1.z.any().optional(),
    value: zod_1.z.any().optional(),
    valueEnv: zod_1.z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/).optional(),
    value_env: zod_1.z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/).optional(),
    textEnv: zod_1.z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/).optional(),
    text_env: zod_1.z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/).optional(),
    contentEnv: zod_1.z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/).optional(),
    content_env: zod_1.z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/).optional(),
    attribute: optionalString,
    attr: optionalString,
    attributeName: optionalString,
    attribute_name: optionalString,
    url: optionalString,
    href: optionalString,
    key: optionalString,
    keyText: optionalString,
    key_text: optionalString,
    testId: optionalString,
    test_id: optionalString,
    dataTestId: optionalString,
    data_testid: optionalString,
    label: optionalString,
    ariaLabel: optionalString,
    aria_label: optionalString,
    placeholder: optionalString,
    role: optionalString,
    name: optionalString,
    exact: zod_1.z.boolean().optional(),
    destinationSelector: optionalString,
    destination_selector: optionalString,
    toSelector: optionalString,
    to_selector: optionalString,
    dropSelector: optionalString,
    drop_selector: optionalString,
    destinationLocator: optionalString,
    destination_locator: optionalString,
    toLocator: optionalString,
    to_locator: optionalString,
    dropLocator: optionalString,
    drop_locator: optionalString,
    destinationTestId: optionalString,
    destination_test_id: optionalString,
    destinationDataTestId: optionalString,
    destination_data_testid: optionalString,
    toTestId: optionalString,
    to_test_id: optionalString,
    dropTestId: optionalString,
    drop_test_id: optionalString,
    destinationLabel: optionalString,
    destination_label: optionalString,
    toLabel: optionalString,
    to_label: optionalString,
    dropLabel: optionalString,
    drop_label: optionalString,
    destinationPlaceholder: optionalString,
    destination_placeholder: optionalString,
    toPlaceholder: optionalString,
    to_placeholder: optionalString,
    dropPlaceholder: optionalString,
    drop_placeholder: optionalString,
    destinationRole: optionalString,
    destination_role: optionalString,
    toRole: optionalString,
    to_role: optionalString,
    dropRole: optionalString,
    drop_role: optionalString,
    destinationName: optionalString,
    destination_name: optionalString,
    toName: optionalString,
    to_name: optionalString,
    dropName: optionalString,
    drop_name: optionalString,
    destinationText: optionalString,
    destination_text: optionalString,
    toText: optionalString,
    to_text: optionalString,
    dropText: optionalString,
    drop_text: optionalString,
    destinationAltText: optionalString,
    destination_alt_text: optionalString,
    toAltText: optionalString,
    to_alt_text: optionalString,
    dropAltText: optionalString,
    drop_alt_text: optionalString,
    destinationTitle: optionalString,
    destination_title: optionalString,
    toTitle: optionalString,
    to_title: optionalString,
    dropTitle: optionalString,
    drop_title: optionalString,
    destinationExact: zod_1.z.boolean().optional(),
    destination_exact: zod_1.z.boolean().optional(),
    coordinate: coordinate.optional(),
    coords: coordinate.optional(),
    point: coordinate.optional(),
    startCoordinate: coordinate.optional(),
    start_coordinate: coordinate.optional(),
    direction: zod_1.z.enum(["up", "down", "left", "right"]).optional(),
    amount: zod_1.z.number().optional(),
    duration: zod_1.z.number().optional(),
    region: zod_1.z.tuple([zod_1.z.number(), zod_1.z.number(), zod_1.z.number(), zod_1.z.number()]).optional(),
    bundleId: optionalString,
    bundle_id: optionalString,
    apps: zod_1.z.array(zod_1.z.object({
        displayName: optionalString,
        display_name: optionalString,
        name: optionalString,
        bundleId: optionalString,
        bundle_id: optionalString,
    }).passthrough()).optional(),
    timeoutMs: timeoutMs,
    timeout_ms: timeoutMs,
    waitUntil: zod_1.z.enum(["load", "domcontentloaded", "networkidle"]).optional(),
    wait_until: zod_1.z.enum(["load", "domcontentloaded", "networkidle"]).optional(),
    verifyEffect: zod_1.z.boolean().optional(),
    verify_effect: zod_1.z.boolean().optional(),
    expectEffect: zod_1.z.boolean().optional(),
    expect_effect: zod_1.z.boolean().optional(),
    effectTimeoutMs: timeoutMs,
    effect_timeout_ms: timeoutMs,
    effectSignals: zod_1.z.array(zod_1.z.enum(["url", "title", "page_text", "dom", "network", "dialog", "popup", "download"])).optional(),
    effect_signals: zod_1.z.array(zod_1.z.enum(["url", "title", "page_text", "dom", "network", "dialog", "popup", "download"])).optional(),
    effectSession: optionalString,
    effect_session: optionalString,
}).passthrough().superRefine(requireAnyField(["type", "action", "kind"], "Browser action must include type/action/kind."));
exports.TestAgentBrowserAssertionContractSchema = zod_1.z.object({
    type: zod_1.z.string().min(1).optional(),
    assertion: zod_1.z.string().min(1).optional(),
    kind: zod_1.z.string().min(1).optional(),
    selector: optionalString,
    css: optionalString,
    locator: optionalString,
    text: zod_1.z.any().optional(),
    value: zod_1.z.any().optional(),
    url: optionalString,
    urlIncludes: optionalString,
    url_includes: optionalString,
    path: optionalString,
    method: optionalString,
    httpMethod: optionalString,
    http_method: optionalString,
    status: statusValueOrList.optional(),
    statusCode: statusValueOrList.optional(),
    status_code: statusValueOrList.optional(),
    resourceType: optionalString,
    resource_type: optionalString,
    headerName: optionalString,
    header_name: optionalString,
    header: optionalString,
    headerIncludes: optionalString,
    header_includes: optionalString,
    headerValue: optionalString,
    header_value: optionalString,
    headerValueIncludes: optionalString,
    header_value_includes: optionalString,
    bodyIncludes: optionalString,
    body_includes: optionalString,
    bodyContains: optionalString,
    body_contains: optionalString,
    bodyJsonPath: optionalString,
    body_json_path: optionalString,
    jsonPath: optionalString,
    json_path: optionalString,
    bodyJsonEquals: zod_1.z.any().optional(),
    body_json_equals: zod_1.z.any().optional(),
    bodyJsonValue: zod_1.z.any().optional(),
    body_json_value: zod_1.z.any().optional(),
    bodyJsonIncludes: optionalString,
    body_json_includes: optionalString,
    property: optionalString,
    styleProperty: optionalString,
    style_property: optionalString,
    cssProperty: optionalString,
    css_property: optionalString,
    count: countValue,
    expectedCount: countValue,
    expected_count: countValue,
    minCount: countValue,
    min_count: countValue,
    maxCount: countValue,
    max_count: countValue,
    minUniqueColors: countValue,
    min_unique_colors: countValue,
    minNonWhitePixels: countValue,
    min_non_white_pixels: countValue,
    message: optionalString,
    messageIncludes: optionalString,
    message_includes: optionalString,
    messageContains: optionalString,
    message_contains: optionalString,
    accessibleName: optionalString,
    accessible_name: optionalString,
    ariaName: optionalString,
    aria_name: optionalString,
    accessibleDescription: optionalString,
    accessible_description: optionalString,
    ariaDescription: optionalString,
    aria_description: optionalString,
    description: optionalString,
    descriptionIncludes: optionalString,
    description_includes: optionalString,
    descriptionContains: optionalString,
    description_contains: optionalString,
    snapshotIncludes: optionalString,
    snapshot_includes: optionalString,
    ariaSnapshotIncludes: optionalString,
    aria_snapshot_includes: optionalString,
    dialogType: optionalString,
    dialog_type: optionalString,
    expectedDialogType: optionalString,
    expected_dialog_type: optionalString,
    alertType: optionalString,
    alert_type: optionalString,
    popupIndex: countValue,
    popup_index: countValue,
    tableSelector: optionalString,
    table_selector: optionalString,
    tableLocator: optionalString,
    table_locator: optionalString,
    table: optionalString,
    tableCss: optionalString,
    table_css: optionalString,
    rowText: optionalString,
    row_text: optionalString,
    row: optionalString,
    rowContains: optionalString,
    row_contains: optionalString,
    rowIndex: countValue,
    row_index: countValue,
    rowNumber: countValue,
    row_number: countValue,
    columnName: optionalString,
    column_name: optionalString,
    columnHeader: optionalString,
    column_header: optionalString,
    columnIndex: countValue,
    column_index: countValue,
    columnNumber: countValue,
    column_number: countValue,
    texts: zod_1.z.array(zod_1.z.any()).optional(),
    values: zod_1.z.array(zod_1.z.any()).optional(),
    expectedTexts: zod_1.z.array(zod_1.z.any()).optional(),
    expected_texts: zod_1.z.array(zod_1.z.any()).optional(),
    key: optionalString,
    storageKey: optionalString,
    storage_key: optionalString,
    expression: optionalString,
    js: optionalString,
    javascript: optionalString,
    testId: optionalString,
    test_id: optionalString,
    dataTestId: optionalString,
    data_testid: optionalString,
    label: optionalString,
    ariaLabel: optionalString,
    aria_label: optionalString,
    placeholder: optionalString,
    role: optionalString,
    name: optionalString,
    altText: optionalString,
    alt_text: optionalString,
    title: optionalString,
    exact: zod_1.z.boolean().optional(),
    timeoutMs: timeoutMs,
    timeout_ms: timeoutMs,
    settleMs: timeoutMs,
    settle_ms: timeoutMs,
}).passthrough().superRefine(requireAnyField(["type", "assertion", "kind"], "Browser assertion must include type/assertion/kind."));
const TestAgentBrowserSessionContractSchema = zod_1.z.object({
    name: optionalString,
    session: optionalString,
    id: optionalString,
    url: optionalString,
    targetUrl: optionalString,
    target_url: optionalString,
    storageStatePath: optionalString,
    storage_state_path: optionalString,
    authStatePath: optionalString,
    auth_state_path: optionalString,
    setupActions: zod_1.z.array(exports.TestAgentBrowserActionContractSchema).optional(),
    setup_actions: zod_1.z.array(exports.TestAgentBrowserActionContractSchema).optional(),
    actions: zod_1.z.array(exports.TestAgentBrowserActionContractSchema).optional(),
}).passthrough().superRefine((value, ctx) => {
    requireAnyField(["name", "session", "id"], "Browser session must include name/session/id.")(value, ctx);
    rejectInlineBrowserStorageState(value, ctx);
});
const TestAgentBrowserSessionLeafStepContractSchema = zod_1.z.object({
    session: optionalString,
    sessionName: optionalString,
    session_name: optionalString,
    actor: optionalString,
    action: exports.TestAgentBrowserActionContractSchema.optional(),
    do: exports.TestAgentBrowserActionContractSchema.optional(),
    assertion: exports.TestAgentBrowserAssertionContractSchema.optional(),
    expect: exports.TestAgentBrowserAssertionContractSchema.optional(),
}).passthrough().superRefine((value, ctx) => {
    if (![value.session, value.sessionName, value.session_name, value.actor].some(item => typeof item === "string" && item.trim())) {
        ctx.addIssue({ code: zod_1.z.ZodIssueCode.custom, message: "Browser session step must include session/sessionName/actor.", path: ["session"] });
    }
    const actionCount = Number(Boolean(value.action || value.do));
    const assertionCount = Number(Boolean(value.assertion || value.expect));
    if (actionCount + assertionCount !== 1) {
        ctx.addIssue({ code: zod_1.z.ZodIssueCode.custom, message: "Browser session step must contain exactly one action or assertion.", path: ["action"] });
    }
});
const TestAgentBrowserSessionComparisonContractSchema = zod_1.z.object({
    leftSession: optionalString,
    left_session: optionalString,
    left: optionalString,
    firstSession: optionalString,
    first_session: optionalString,
    sourceSession: optionalString,
    source_session: optionalString,
    rightSession: optionalString,
    right_session: optionalString,
    right: optionalString,
    secondSession: optionalString,
    second_session: optionalString,
    targetSession: optionalString,
    target_session: optionalString,
    expression: optionalString,
    js: optionalString,
    javascript: optionalString,
    leftExpression: optionalString,
    left_expression: optionalString,
    leftJs: optionalString,
    left_js: optionalString,
    rightExpression: optionalString,
    right_expression: optionalString,
    rightJs: optionalString,
    right_js: optionalString,
    operator: optionalString,
    relation: optionalString,
    mode: optionalString,
    timeoutMs,
    timeout_ms: timeoutMs,
    pollMs: timeoutMs,
    poll_ms: timeoutMs,
    intervalMs: timeoutMs,
    interval_ms: timeoutMs,
}).passthrough().superRefine((value, ctx) => {
    const left = [value.leftSession, value.left_session, value.left, value.firstSession, value.first_session, value.sourceSession, value.source_session].find(item => typeof item === "string" && item.trim());
    const right = [value.rightSession, value.right_session, value.right, value.secondSession, value.second_session, value.targetSession, value.target_session].find(item => typeof item === "string" && item.trim());
    if (!left)
        ctx.addIssue({ code: zod_1.z.ZodIssueCode.custom, message: "Browser session comparison must include leftSession.", path: ["leftSession"] });
    if (!right)
        ctx.addIssue({ code: zod_1.z.ZodIssueCode.custom, message: "Browser session comparison must include rightSession.", path: ["rightSession"] });
    if (left && right && String(left).trim().toLowerCase() === String(right).trim().toLowerCase()) {
        ctx.addIssue({ code: zod_1.z.ZodIssueCode.custom, message: "Browser session comparison must reference two distinct sessions.", path: ["rightSession"] });
    }
    const sharedExpression = [value.expression, value.js, value.javascript].some(item => typeof item === "string" && item.trim());
    const leftExpression = [value.leftExpression, value.left_expression, value.leftJs, value.left_js].some(item => typeof item === "string" && item.trim());
    const rightExpression = [value.rightExpression, value.right_expression, value.rightJs, value.right_js].some(item => typeof item === "string" && item.trim());
    if (!sharedExpression && !(leftExpression && rightExpression)) {
        ctx.addIssue({ code: zod_1.z.ZodIssueCode.custom, message: "Browser session comparison requires expression or both leftExpression and rightExpression.", path: ["expression"] });
    }
    const operator = String(value.operator || value.relation || value.mode || "equals").replace(/[\s_-]+/g, "").toLowerCase();
    if (!["equal", "equals", "deepequals", "notequal", "notequals", "differs", "include", "includes", "contains"].includes(operator)) {
        ctx.addIssue({ code: zod_1.z.ZodIssueCode.custom, message: "Browser session comparison operator must be equals, notEquals, or includes.", path: ["operator"] });
    }
});
const TestAgentBrowserSessionParallelStepContractSchema = zod_1.z.object({
    parallel: zod_1.z.array(TestAgentBrowserSessionLeafStepContractSchema).min(2).optional(),
    parallelSteps: zod_1.z.array(TestAgentBrowserSessionLeafStepContractSchema).min(2).optional(),
    parallel_steps: zod_1.z.array(TestAgentBrowserSessionLeafStepContractSchema).min(2).optional(),
}).passthrough().superRefine((value, ctx) => {
    if (![value.parallel, value.parallelSteps, value.parallel_steps].some(Array.isArray)) {
        ctx.addIssue({ code: zod_1.z.ZodIssueCode.custom, message: "Browser parallel session step must include parallel/parallelSteps.", path: ["parallel"] });
    }
    if (value.session || value.sessionName || value.session_name || value.actor || value.action || value.do || value.assertion || value.expect) {
        ctx.addIssue({ code: zod_1.z.ZodIssueCode.custom, message: "Browser parallel session step cannot also define a session action/assertion.", path: ["parallel"] });
    }
});
const TestAgentBrowserSessionComparisonStepContractSchema = zod_1.z.object({
    compare: TestAgentBrowserSessionComparisonContractSchema.optional(),
    comparison: TestAgentBrowserSessionComparisonContractSchema.optional(),
    compareSessions: TestAgentBrowserSessionComparisonContractSchema.optional(),
    compare_sessions: TestAgentBrowserSessionComparisonContractSchema.optional(),
    convergence: TestAgentBrowserSessionComparisonContractSchema.optional(),
}).passthrough().superRefine((value, ctx) => {
    if (![value.compare, value.comparison, value.compareSessions, value.compare_sessions, value.convergence].some(item => item && typeof item === "object" && !Array.isArray(item))) {
        ctx.addIssue({ code: zod_1.z.ZodIssueCode.custom, message: "Browser session comparison step must include compare/comparison.", path: ["compare"] });
    }
    if (value.parallel || value.parallelSteps || value.parallel_steps || value.session || value.sessionName || value.session_name || value.actor || value.action || value.do || value.assertion || value.expect) {
        ctx.addIssue({ code: zod_1.z.ZodIssueCode.custom, message: "Browser session comparison step cannot also define parallel or session action/assertion fields.", path: ["compare"] });
    }
});
const TestAgentBrowserSessionStepContractSchema = zod_1.z.union([
    TestAgentBrowserSessionLeafStepContractSchema,
    TestAgentBrowserSessionParallelStepContractSchema,
    TestAgentBrowserSessionComparisonStepContractSchema,
]);
const TestAgentBrowserAuthenticationConfigContractSchema = zod_1.z.object({
    mode: zod_1.z.string().min(1),
    provider: optionalString,
    browserProvider: optionalString,
    browser_provider: optionalString,
    evidencePolicy: optionalString,
    evidence_policy: optionalString,
    artifactPolicy: optionalString,
    artifact_policy: optionalString,
}).passthrough().superRefine((value, ctx) => {
    for (const key of ["credentials", "username", "email", "password", "token", "cookies", "origins", "storageState", "storage_state"]) {
        if (Object.prototype.hasOwnProperty.call(value, key)) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                message: "Existing-session authentication config must not contain raw credentials or browser state.",
                path: [key],
            });
        }
    }
});
exports.TestAgentBrowserCheckContractSchema = zod_1.z.object({
    name: optionalString,
    title: optionalString,
    url: optionalString,
    targetUrl: optionalString,
    target_url: optionalString,
    authentication: TestAgentBrowserAuthenticationConfigContractSchema.optional(),
    auth: TestAgentBrowserAuthenticationConfigContractSchema.optional(),
    authenticationMode: optionalString,
    authentication_mode: optionalString,
    authMode: optionalString,
    auth_mode: optionalString,
    existingSessionProvider: optionalString,
    existing_session_provider: optionalString,
    authenticatedBrowserProvider: optionalString,
    authenticated_browser_provider: optionalString,
    existingSessionEvidencePolicy: optionalString,
    existing_session_evidence_policy: optionalString,
    actions: zod_1.z.array(exports.TestAgentBrowserActionContractSchema).optional(),
    steps: zod_1.z.array(exports.TestAgentBrowserActionContractSchema).optional(),
    assertions: zod_1.z.array(exports.TestAgentBrowserAssertionContractSchema).optional(),
    expectations: zod_1.z.array(exports.TestAgentBrowserAssertionContractSchema).optional(),
    sessions: zod_1.z.array(TestAgentBrowserSessionContractSchema).optional(),
    browserSessions: zod_1.z.array(TestAgentBrowserSessionContractSchema).optional(),
    browser_sessions: zod_1.z.array(TestAgentBrowserSessionContractSchema).optional(),
    sessionSteps: zod_1.z.array(TestAgentBrowserSessionStepContractSchema).optional(),
    session_steps: zod_1.z.array(TestAgentBrowserSessionStepContractSchema).optional(),
    scenarioSteps: zod_1.z.array(TestAgentBrowserSessionStepContractSchema).optional(),
    scenario_steps: zod_1.z.array(TestAgentBrowserSessionStepContractSchema).optional(),
    stabilityRuns: zod_1.z.number().int().min(1).max(10).optional(),
    stability_runs: zod_1.z.number().int().min(1).max(10).optional(),
    repeatRuns: zod_1.z.number().int().min(1).max(10).optional(),
    repeat_runs: zod_1.z.number().int().min(1).max(10).optional(),
    storageStatePath: optionalString,
    storage_state_path: optionalString,
    authStatePath: optionalString,
    auth_state_path: optionalString,
    screenshot: zod_1.z.boolean().optional(),
    viewport: zod_1.z.object({
        width: zod_1.z.number().int().positive().optional(),
        height: zod_1.z.number().int().positive().optional(),
    }).optional(),
    viewportWidth: zod_1.z.number().int().positive().optional(),
    viewport_width: zod_1.z.number().int().positive().optional(),
    viewportHeight: zod_1.z.number().int().positive().optional(),
    viewport_height: zod_1.z.number().int().positive().optional(),
    isMobile: zod_1.z.boolean().optional(),
    is_mobile: zod_1.z.boolean().optional(),
    deviceScaleFactor: zod_1.z.number().positive().optional(),
    device_scale_factor: zod_1.z.number().positive().optional(),
    userAgent: optionalString,
    user_agent: optionalString,
    adversarial: zod_1.z.boolean().optional(),
    probe: zod_1.z.boolean().optional(),
    probeType: optionalString,
    probe_type: optionalString,
    coversAcceptanceCriteria: stringList.optional(),
    covers_acceptance_criteria: stringList.optional(),
    acceptanceCriteria: stringList.optional(),
    acceptance_criteria: stringList.optional(),
    context: zod_1.z.record(zod_1.z.any()).optional(),
    timeoutMs: timeoutMs,
    timeout_ms: timeoutMs,
}).passthrough().superRefine(rejectInlineBrowserStorageState);
const TestAgentBrowserProbeTemplateFieldContractSchema = zod_1.z.object({
    selector: optionalString,
    locator: optionalString,
    testId: optionalString,
    test_id: optionalString,
    dataTestId: optionalString,
    data_testid: optionalString,
    label: optionalString,
    placeholder: optionalString,
    role: optionalString,
    name: optionalString,
    text: zod_1.z.any().optional(),
    value: zod_1.z.any().optional(),
    exact: zod_1.z.boolean().optional(),
}).passthrough();
exports.TestAgentBrowserProbeTemplateContractSchema = zod_1.z.object({
    kind: optionalString,
    type: optionalString,
    template: optionalString,
    name: optionalString,
    title: optionalString,
    url: optionalString,
    targetUrl: optionalString,
    target_url: optionalString,
    probeType: optionalString,
    probe_type: optionalString,
    screenshot: zod_1.z.boolean().optional(),
    fields: zod_1.z.array(TestAgentBrowserProbeTemplateFieldContractSchema).optional(),
    submit: zod_1.z.record(zod_1.z.any()).optional(),
    target: zod_1.z.record(zod_1.z.any()).optional(),
    repeat: zod_1.z.number().int().positive().optional(),
    expectedText: optionalString,
    expected_text: optionalString,
    expectedUrlIncludes: optionalString,
    expected_url_includes: optionalString,
    setupActions: zod_1.z.array(exports.TestAgentBrowserActionContractSchema).optional(),
    setup_actions: zod_1.z.array(exports.TestAgentBrowserActionContractSchema).optional(),
    actions: zod_1.z.array(exports.TestAgentBrowserActionContractSchema).optional(),
    assertions: zod_1.z.array(exports.TestAgentBrowserAssertionContractSchema).optional(),
    expectations: zod_1.z.array(exports.TestAgentBrowserAssertionContractSchema).optional(),
    stateAssertions: zod_1.z.array(exports.TestAgentBrowserAssertionContractSchema).optional(),
    state_assertions: zod_1.z.array(exports.TestAgentBrowserAssertionContractSchema).optional(),
    coversAcceptanceCriteria: stringList.optional(),
    covers_acceptance_criteria: stringList.optional(),
    acceptanceCriteria: stringList.optional(),
    acceptance_criteria: stringList.optional(),
    context: zod_1.z.record(zod_1.z.any()).optional(),
}).passthrough().superRefine(requireAnyField(["kind", "type", "template"], "Browser probe template must include kind/type/template."));
exports.TestAgentProjectTargetContractSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    workDir: optionalString,
    work_dir: optionalString,
    runCommand: optionalString,
    run_command: optionalString,
    devServerCommand: optionalString,
    dev_server_command: optionalString,
    targetUrl: optionalString,
    target_url: optionalString,
    startupUrl: optionalString,
    startup_url: optionalString,
    startupTimeoutMs: timeoutMs,
    startup_timeout_ms: timeoutMs,
    env: zod_1.z.record(primitiveValue).optional(),
    changedFiles: stringList.optional(),
    changed_files: stringList.optional(),
    verificationCommands: stringList.optional(),
    verification_commands: stringList.optional(),
    httpChecks: zod_1.z.array(exports.TestAgentHttpCheckContractSchema).optional(),
    http_checks: zod_1.z.array(exports.TestAgentHttpCheckContractSchema).optional(),
    apiChecks: zod_1.z.array(exports.TestAgentHttpCheckContractSchema).optional(),
    api_checks: zod_1.z.array(exports.TestAgentHttpCheckContractSchema).optional(),
    adversarialHttpChecks: zod_1.z.array(exports.TestAgentHttpCheckContractSchema).optional(),
    adversarial_http_checks: zod_1.z.array(exports.TestAgentHttpCheckContractSchema).optional(),
    adversarialApiChecks: zod_1.z.array(exports.TestAgentHttpCheckContractSchema).optional(),
    adversarial_api_checks: zod_1.z.array(exports.TestAgentHttpCheckContractSchema).optional(),
    adversarialBrowserChecks: zod_1.z.array(exports.TestAgentBrowserCheckContractSchema).optional(),
    adversarial_browser_checks: zod_1.z.array(exports.TestAgentBrowserCheckContractSchema).optional(),
    adversarialBrowserProbeTemplates: zod_1.z.array(exports.TestAgentBrowserProbeTemplateContractSchema).optional(),
    adversarial_browser_probe_templates: zod_1.z.array(exports.TestAgentBrowserProbeTemplateContractSchema).optional(),
    browserChecks: zod_1.z.array(exports.TestAgentBrowserCheckContractSchema).optional(),
    browser_checks: zod_1.z.array(exports.TestAgentBrowserCheckContractSchema).optional(),
    agentSummary: optionalString,
    agent_summary: optionalString,
    risks: stringList.optional(),
}).passthrough();
exports.TestAgentHandoffProjectContractSchema = zod_1.z.object({
    name: optionalString,
    workDir: optionalString,
    work_dir: optionalString,
    runCommand: optionalString,
    run_command: optionalString,
    devServerCommand: optionalString,
    dev_server_command: optionalString,
    targetUrl: optionalString,
    target_url: optionalString,
    startupUrl: optionalString,
    startup_url: optionalString,
    startupTimeoutMs: timeoutMs,
    startup_timeout_ms: timeoutMs,
    env: zod_1.z.record(primitiveValue).optional(),
    changedFiles: stringList.optional(),
    changed_files: stringList.optional(),
    completedTasks: stringList.optional(),
    completed_tasks: stringList.optional(),
    acceptanceCriteria: stringList.optional(),
    acceptance_criteria: stringList.optional(),
    requiredChecks: stringList.optional(),
    required_checks: stringList.optional(),
    verificationCommands: stringList.optional(),
    verification_commands: stringList.optional(),
    httpChecks: zod_1.z.array(exports.TestAgentHttpCheckContractSchema).optional(),
    http_checks: zod_1.z.array(exports.TestAgentHttpCheckContractSchema).optional(),
    apiChecks: zod_1.z.array(exports.TestAgentHttpCheckContractSchema).optional(),
    api_checks: zod_1.z.array(exports.TestAgentHttpCheckContractSchema).optional(),
    adversarialHttpChecks: zod_1.z.array(exports.TestAgentHttpCheckContractSchema).optional(),
    adversarial_http_checks: zod_1.z.array(exports.TestAgentHttpCheckContractSchema).optional(),
    adversarialApiChecks: zod_1.z.array(exports.TestAgentHttpCheckContractSchema).optional(),
    adversarial_api_checks: zod_1.z.array(exports.TestAgentHttpCheckContractSchema).optional(),
    adversarialBrowserChecks: zod_1.z.array(exports.TestAgentBrowserCheckContractSchema).optional(),
    adversarial_browser_checks: zod_1.z.array(exports.TestAgentBrowserCheckContractSchema).optional(),
    adversarialBrowserProbeTemplates: zod_1.z.array(exports.TestAgentBrowserProbeTemplateContractSchema).optional(),
    adversarial_browser_probe_templates: zod_1.z.array(exports.TestAgentBrowserProbeTemplateContractSchema).optional(),
    browserChecks: zod_1.z.array(exports.TestAgentBrowserCheckContractSchema).optional(),
    browser_checks: zod_1.z.array(exports.TestAgentBrowserCheckContractSchema).optional(),
    agentSummary: optionalString,
    agent_summary: optionalString,
    risks: stringList.optional(),
}).passthrough();
exports.TestAgentHandoffContractSchema = zod_1.z.object({
    schema: zod_1.z.literal(exports.TEST_AGENT_CONTRACT_IDS.handoff).optional(),
    id: optionalString,
    taskId: optionalString,
    task_id: optionalString,
    groupId: optionalString,
    group_id: optionalString,
    issuedBy: optionalString,
    issued_by: optionalString,
    originalUserGoal: optionalString,
    original_user_goal: optionalString,
    acceptanceCriteria: stringList.optional(),
    acceptance_criteria: stringList.optional(),
    completedTasks: stringList.optional(),
    completed_tasks: stringList.optional(),
    requiredChecks: stringList.optional(),
    required_checks: stringList.optional(),
    projects: zod_1.z.array(exports.TestAgentHandoffProjectContractSchema).optional(),
    project: exports.TestAgentHandoffProjectContractSchema.optional(),
    options: exports.TestAgentOptionsContractSchema.optional(),
    metadata: zod_1.z.record(zod_1.z.any()).optional(),
    completedByProjectAgents: stringList.optional(),
    completed_by_project_agents: stringList.optional(),
}).passthrough().superRefine((value, ctx) => {
    const projects = Array.isArray(value.projects) ? value.projects : [];
    if (!projects.length && !value.project) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: "Handoff must include projects array or project object.",
            path: ["projects"],
        });
    }
});
exports.TestAgentWorkOrderContractSchema = zod_1.z.object({
    schema: zod_1.z.literal(exports.TEST_AGENT_CONTRACT_IDS.workOrder).optional(),
    id: optionalString,
    taskId: optionalString,
    task_id: optionalString,
    groupId: optionalString,
    group_id: optionalString,
    issuedBy: optionalString,
    issued_by: optionalString,
    originalUserGoal: optionalString,
    original_user_goal: optionalString,
    acceptanceCriteria: stringList.optional(),
    acceptance_criteria: stringList.optional(),
    requiredChecks: stringList.optional(),
    required_checks: stringList.optional(),
    projects: zod_1.z.array(exports.TestAgentProjectTargetContractSchema).min(1, "Work order must include at least one project target."),
    options: exports.TestAgentOptionsContractSchema.optional(),
    metadata: zod_1.z.record(zod_1.z.any()).optional(),
}).passthrough();
const agentStatus = zod_1.z.enum(["passed", "failed", "blocked", "partial"]);
const resultStatus = zod_1.z.enum(["passed", "failed", "blocked", "skipped", "timed_out", "started", "already_running"]);
const httpAssertionResultSchema = zod_1.z.object({
    name: zod_1.z.string(),
    status: zod_1.z.enum(["passed", "failed", "skipped"]),
    detail: optionalString,
    error: optionalString,
}).passthrough();
const httpConcurrencyAssertionSpecSchema = zod_1.z.object({
    type: zod_1.z.enum(["responseCount", "statusCount", "jsonPathUniqueCount", "jsonPathAllEqual"]),
    status: zod_1.z.number().int().min(100).max(599).optional(),
    statusCode: zod_1.z.number().int().min(100).max(599).optional(),
    status_code: zod_1.z.number().int().min(100).max(599).optional(),
    path: optionalString,
    count: zod_1.z.number().int().nonnegative().optional(),
    expectedCount: zod_1.z.number().int().nonnegative().optional(),
    expected_count: zod_1.z.number().int().nonnegative().optional(),
    minCount: zod_1.z.number().int().nonnegative().optional(),
    min_count: zod_1.z.number().int().nonnegative().optional(),
    maxCount: zod_1.z.number().int().nonnegative().optional(),
    max_count: zod_1.z.number().int().nonnegative().optional(),
}).passthrough();
const httpConcurrencyValueEvidenceSchema = zod_1.z.object({
    path: zod_1.z.string().min(1),
    present: zod_1.z.boolean(),
    sha256: zod_1.z.string().regex(/^[a-f0-9]{64}$/i).optional(),
    serializedBytes: zod_1.z.number().int().nonnegative().optional(),
}).passthrough();
const httpConcurrentRequestResultSchema = zod_1.z.object({
    requestIndex: zod_1.z.number().int().nonnegative(),
    requestNumber: zod_1.z.number().int().positive(),
    url: zod_1.z.string(),
    method: zod_1.z.string(),
    status: zod_1.z.enum(["passed", "failed", "blocked"]),
    statusCode: zod_1.z.number().int().nullable(),
    contentType: zod_1.z.string(),
    startedAt: zod_1.z.string(),
    finishedAt: zod_1.z.string(),
    durationMs: zod_1.z.number().nonnegative(),
    assertions: zod_1.z.array(httpAssertionResultSchema),
    aggregateValues: zod_1.z.array(httpConcurrencyValueEvidenceSchema),
    responsePreview: optionalString,
    error: optionalString,
}).passthrough();
const httpConcurrencyEvidenceSchema = zod_1.z.object({
    requested: zod_1.z.number().int().min(http_concurrency_1.MIN_HTTP_CONCURRENT_REQUESTS).max(http_concurrency_1.MAX_HTTP_CONCURRENT_REQUESTS),
    completed: zod_1.z.number().int().nonnegative(),
    passed: zod_1.z.number().int().nonnegative(),
    failed: zod_1.z.number().int().nonnegative(),
    blocked: zod_1.z.number().int().nonnegative(),
    launchSpreadMs: zod_1.z.number().nonnegative(),
    maxInFlight: zod_1.z.number().int().nonnegative(),
    overlapObserved: zod_1.z.boolean(),
    assertionSpecs: zod_1.z.array(httpConcurrencyAssertionSpecSchema),
    aggregateAssertions: zod_1.z.array(httpAssertionResultSchema),
    requests: zod_1.z.array(httpConcurrentRequestResultSchema),
}).passthrough();
const httpCheckResultSchema = zod_1.z.object({
    project: zod_1.z.string(),
    name: optionalString,
    url: zod_1.z.string(),
    method: optionalString,
    status: zod_1.z.enum(["passed", "failed", "blocked", "skipped"]),
    statusCode: zod_1.z.number().int().nullable(),
    contentType: zod_1.z.string(),
    startedAt: zod_1.z.string(),
    finishedAt: zod_1.z.string(),
    durationMs: zod_1.z.number().nonnegative(),
    resourceChecks: zod_1.z.array(zod_1.z.object({
        url: zod_1.z.string(),
        status: zod_1.z.enum(["passed", "failed", "blocked", "skipped"]),
        statusCode: zod_1.z.number().int().nullable(),
        contentType: zod_1.z.string(),
        kind: zod_1.z.enum(["script", "stylesheet", "image", "font", "media", "document", "manifest", "other"]).optional(),
        source: optionalString,
        discoveredFrom: optionalString,
        finalUrl: optionalString,
        redirectCount: zod_1.z.number().int().nonnegative().optional(),
        expectedContentTypes: stringList.optional(),
        contentTypeMatched: zod_1.z.boolean().optional(),
        error: optionalString,
    }).passthrough()),
    assertions: zod_1.z.array(httpAssertionResultSchema).optional(),
    responsePreview: optionalString,
    adversarial: zod_1.z.boolean().optional(),
    probeType: optionalString,
    context: zod_1.z.record(zod_1.z.any()).optional(),
    concurrency: httpConcurrencyEvidenceSchema.optional(),
    error: optionalString,
}).passthrough();
const httpConcurrencySummaryItemSchema = zod_1.z.object({
    project: zod_1.z.string(),
    name: zod_1.z.string(),
    status: zod_1.z.enum(["passed", "failed", "blocked", "skipped"]),
    probeType: optionalString,
    requested: zod_1.z.number().int().nonnegative(),
    completed: zod_1.z.number().int().nonnegative(),
    passed: zod_1.z.number().int().nonnegative(),
    failed: zod_1.z.number().int().nonnegative(),
    blocked: zod_1.z.number().int().nonnegative(),
    launchSpreadMs: zod_1.z.number().nonnegative(),
    maxInFlight: zod_1.z.number().int().nonnegative(),
    overlapObserved: zod_1.z.boolean(),
    aggregatePassed: zod_1.z.number().int().nonnegative(),
    aggregateFailed: zod_1.z.number().int().nonnegative(),
    aggregateSkipped: zod_1.z.number().int().nonnegative(),
}).passthrough();
const httpConcurrencySummarySchema = zod_1.z.object({
    checks: zod_1.z.number().int().nonnegative(),
    requests: zod_1.z.number().int().nonnegative(),
    completed: zod_1.z.number().int().nonnegative(),
    passed: zod_1.z.number().int().nonnegative(),
    failed: zod_1.z.number().int().nonnegative(),
    blocked: zod_1.z.number().int().nonnegative(),
    maxInFlight: zod_1.z.number().int().nonnegative(),
    items: zod_1.z.array(httpConcurrencySummaryItemSchema),
}).passthrough();
const evidenceSchema = zod_1.z.object({
    type: zod_1.z.string().min(1),
    project: optionalString,
    title: zod_1.z.string().min(1),
    status: zod_1.z.string().min(1),
    detail: optionalString,
    path: optionalString,
}).passthrough();
const requiredCheckCoverageSchema = zod_1.z.object({
    check: zod_1.z.string(),
    status: zod_1.z.enum(["verified", "not_verified", "unknown"]),
    evidence: stringList,
    missingReason: optionalString,
}).passthrough();
const requiredCheckSummaryItemSchema = zod_1.z.object({
    check: zod_1.z.string(),
    status: zod_1.z.enum(["verified", "not_verified", "unknown"]),
    evidence: stringList,
    missingReason: optionalString,
}).passthrough();
const requiredCheckSummarySchema = zod_1.z.object({
    total: zod_1.z.number().int().nonnegative(),
    statusCounts: zod_1.z.object({
        verified: zod_1.z.number().int().nonnegative(),
        not_verified: zod_1.z.number().int().nonnegative(),
        unknown: zod_1.z.number().int().nonnegative(),
    }).passthrough(),
    verified: zod_1.z.array(requiredCheckSummaryItemSchema),
    notVerified: zod_1.z.array(requiredCheckSummaryItemSchema),
    unknown: zod_1.z.array(requiredCheckSummaryItemSchema),
}).passthrough();
const adversarialEvidenceSummaryItemSchema = zod_1.z.object({
    project: zod_1.z.string(),
    surface: zod_1.z.enum(["http", "browser"]),
    name: zod_1.z.string(),
    target: zod_1.z.string(),
    status: zod_1.z.enum(["passed", "failed", "blocked", "skipped"]),
    probeType: optionalString,
    provider: zod_1.z.enum(["playwright", "mcp", "none"]).optional(),
    relevance: zod_1.z.enum(["explicit", "inferred", "none"]),
    linkedCriteria: stringList,
    goalLinked: zod_1.z.boolean(),
    matchScore: zod_1.z.number().min(0).max(1),
}).passthrough();
const adversarialEvidenceSummarySchema = zod_1.z.object({
    required: zod_1.z.boolean(),
    waived: zod_1.z.boolean(),
    waiverReason: optionalString,
    status: zod_1.z.enum(["verified", "failed", "blocked", "missing", "unlinked", "waived"]),
    total: zod_1.z.number().int().nonnegative(),
    passed: zod_1.z.number().int().nonnegative(),
    failed: zod_1.z.number().int().nonnegative(),
    blocked: zod_1.z.number().int().nonnegative(),
    skipped: zod_1.z.number().int().nonnegative(),
    http: zod_1.z.number().int().nonnegative(),
    browser: zod_1.z.number().int().nonnegative(),
    relevant: zod_1.z.number().int().nonnegative(),
    unlinked: zod_1.z.number().int().nonnegative(),
    passedRelevant: zod_1.z.number().int().nonnegative(),
    goalLinked: zod_1.z.number().int().nonnegative(),
    criteriaCovered: stringList,
    probeTypes: stringList,
    items: zod_1.z.array(adversarialEvidenceSummaryItemSchema),
}).passthrough();
const acceptanceCoverageSchema = zod_1.z.object({
    criterion: zod_1.z.string(),
    status: zod_1.z.enum(["verified", "not_verified", "unknown"]),
    evidence: stringList,
    matchStrength: zod_1.z.enum(["direct", "token", "fallback", "none"]).optional(),
    matchScore: zod_1.z.number().optional(),
    evidenceSource: zod_1.z.enum(["matched_evidence", "single_criterion_report_status", "none"]).optional(),
}).passthrough();
const acceptanceEvidenceGateSummarySchema = zod_1.z.object({
    status: zod_1.z.enum(["verified", "failed", "incomplete", "weak", "not_applicable"]),
    canAccept: zod_1.z.boolean(),
    total: zod_1.z.number().int().nonnegative(),
    verified: zod_1.z.number().int().nonnegative(),
    notVerified: zod_1.z.number().int().nonnegative(),
    unknown: zod_1.z.number().int().nonnegative(),
    matchedEvidence: zod_1.z.number().int().nonnegative(),
    fallbackEvidence: zod_1.z.number().int().nonnegative(),
    missingEvidence: zod_1.z.number().int().nonnegative(),
    direct: zod_1.z.number().int().nonnegative(),
    token: zod_1.z.number().int().nonnegative(),
    fallback: zod_1.z.number().int().nonnegative(),
    none: zod_1.z.number().int().nonnegative(),
    failedCriteria: stringList,
    incompleteCriteria: stringList,
    weakCriteria: stringList,
}).passthrough();
const acceptanceSummaryItemSchema = zod_1.z.object({
    criterion: zod_1.z.string(),
    status: zod_1.z.enum(["verified", "not_verified", "unknown"]),
    evidence: stringList,
    matchStrength: zod_1.z.enum(["direct", "token", "fallback", "none"]).optional(),
    matchScore: zod_1.z.number().optional(),
    evidenceSource: zod_1.z.enum(["matched_evidence", "single_criterion_report_status", "none"]).optional(),
}).passthrough();
const acceptanceSummarySchema = zod_1.z.object({
    total: zod_1.z.number().int().nonnegative(),
    statusCounts: zod_1.z.object({
        verified: zod_1.z.number().int().nonnegative(),
        not_verified: zod_1.z.number().int().nonnegative(),
        unknown: zod_1.z.number().int().nonnegative(),
    }).passthrough(),
    matchStrengthCounts: zod_1.z.object({
        direct: zod_1.z.number().int().nonnegative(),
        token: zod_1.z.number().int().nonnegative(),
        fallback: zod_1.z.number().int().nonnegative(),
        none: zod_1.z.number().int().nonnegative(),
    }).passthrough(),
    evidenceSourceCounts: zod_1.z.object({
        matched_evidence: zod_1.z.number().int().nonnegative(),
        single_criterion_report_status: zod_1.z.number().int().nonnegative(),
        none: zod_1.z.number().int().nonnegative(),
    }).passthrough(),
    verified: zod_1.z.array(acceptanceSummaryItemSchema),
    notVerified: zod_1.z.array(acceptanceSummaryItemSchema),
    unknown: zod_1.z.array(acceptanceSummaryItemSchema),
}).passthrough();
const browserNetworkSummarySchema = zod_1.z.object({
    project: zod_1.z.string(),
    name: zod_1.z.string(),
    provider: optionalString,
    status: zod_1.z.string(),
    url: zod_1.z.string(),
    finalUrl: optionalString,
    requestCount: zod_1.z.number(),
    responseCount: zod_1.z.number(),
    failedRequestCount: zod_1.z.number(),
    failedResponseCount: zod_1.z.number(),
    errorCount: zod_1.z.number(),
    statusCodes: zod_1.z.record(zod_1.z.number()),
    resourceTypes: zod_1.z.record(zod_1.z.number()),
    failureKinds: zod_1.z.record(zod_1.z.number()),
    failedUrls: stringList,
    errors: stringList,
    networkLogPath: optionalString,
}).passthrough();
const browserInteractionSummaryStepSchema = zod_1.z.object({
    kind: zod_1.z.enum(["action", "assertion"]),
    name: zod_1.z.string(),
    status: zod_1.z.enum(["passed", "failed", "skipped"]),
    detail: optionalString,
    error: optionalString,
}).passthrough();
const browserInteractionSummarySchema = zod_1.z.object({
    project: zod_1.z.string(),
    name: zod_1.z.string(),
    provider: optionalString,
    status: zod_1.z.string(),
    url: zod_1.z.string(),
    finalUrl: optionalString,
    probeType: optionalString,
    actionCount: zod_1.z.number(),
    assertionCount: zod_1.z.number(),
    passedActions: zod_1.z.number(),
    failedActions: zod_1.z.number(),
    passedAssertions: zod_1.z.number(),
    failedAssertions: zod_1.z.number(),
    actionTypes: zod_1.z.record(zod_1.z.number()),
    assertionTypes: zod_1.z.record(zod_1.z.number()),
    actionSteps: zod_1.z.array(browserInteractionSummaryStepSchema),
    failedSteps: zod_1.z.array(browserInteractionSummaryStepSchema),
}).passthrough();
const browserFlowSummaryFailureSchema = zod_1.z.object({
    project: zod_1.z.string(),
    name: zod_1.z.string(),
    status: zod_1.z.enum(["passed", "failed", "blocked", "skipped"]),
    error: optionalString,
    failedSteps: stringList,
}).passthrough();
const browserFlowStatusCountsSchema = zod_1.z.object({
    passed: zod_1.z.number().int().nonnegative(),
    failed: zod_1.z.number().int().nonnegative(),
    blocked: zod_1.z.number().int().nonnegative(),
    skipped: zod_1.z.number().int().nonnegative(),
});
const browserFlowSummaryItemSchema = zod_1.z.object({
    flowType: zod_1.z.string(),
    total: zod_1.z.number().int().nonnegative(),
    statusCounts: browserFlowStatusCountsSchema,
    criteriaCount: zod_1.z.number().int().nonnegative(),
    criteria: stringList,
    projects: stringList,
    providers: stringList,
    actionCount: zod_1.z.number().int().nonnegative(),
    assertionCount: zod_1.z.number().int().nonnegative(),
    failedStepCount: zod_1.z.number().int().nonnegative(),
    failures: zod_1.z.array(browserFlowSummaryFailureSchema),
}).passthrough();
const browserFlowSummarySchema = zod_1.z.object({
    total: zod_1.z.number().int().nonnegative(),
    statusCounts: browserFlowStatusCountsSchema,
    flowTypeCount: zod_1.z.number().int().nonnegative(),
    criteriaCount: zod_1.z.number().int().nonnegative(),
    actionCount: zod_1.z.number().int().nonnegative(),
    assertionCount: zod_1.z.number().int().nonnegative(),
    failedStepCount: zod_1.z.number().int().nonnegative(),
    items: zod_1.z.array(browserFlowSummaryItemSchema),
}).passthrough();
const browserMultiSessionSummarySessionSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    url: zod_1.z.string(),
    finalUrl: optionalString,
    screenshotCount: zod_1.z.number().int().nonnegative(),
    consoleErrorCount: zod_1.z.number().int().nonnegative(),
    pageErrorCount: zod_1.z.number().int().nonnegative(),
    networkErrorCount: zod_1.z.number().int().nonnegative(),
}).passthrough();
const browserMultiSessionSummaryItemSchema = zod_1.z.object({
    project: zod_1.z.string(),
    name: zod_1.z.string(),
    provider: optionalString,
    status: resultStatus,
    probeType: optionalString,
    sessionCount: zod_1.z.number().int().nonnegative(),
    sessionNames: stringList,
    sessions: zod_1.z.array(browserMultiSessionSummarySessionSchema),
    parallelGroupCount: zod_1.z.number().int().nonnegative(),
    comparisonCount: zod_1.z.number().int().nonnegative(),
    failedComparisonCount: zod_1.z.number().int().nonnegative(),
    actionCount: zod_1.z.number().int().nonnegative(),
    assertionCount: zod_1.z.number().int().nonnegative(),
    failedStepCount: zod_1.z.number().int().nonnegative(),
    screenshotCount: zod_1.z.number().int().nonnegative(),
    consoleErrorCount: zod_1.z.number().int().nonnegative(),
    pageErrorCount: zod_1.z.number().int().nonnegative(),
    networkErrorCount: zod_1.z.number().int().nonnegative(),
    failedSessionNames: stringList,
    failedSteps: stringList,
}).passthrough();
const browserMultiSessionSummarySchema = zod_1.z.object({
    total: zod_1.z.number().int().nonnegative(),
    statusCounts: browserFlowStatusCountsSchema,
    sessionCount: zod_1.z.number().int().nonnegative(),
    uniqueSessionCount: zod_1.z.number().int().nonnegative(),
    sessionNames: stringList,
    parallelGroupCount: zod_1.z.number().int().nonnegative(),
    comparisonCount: zod_1.z.number().int().nonnegative(),
    failedComparisonCount: zod_1.z.number().int().nonnegative(),
    actionCount: zod_1.z.number().int().nonnegative(),
    assertionCount: zod_1.z.number().int().nonnegative(),
    failedStepCount: zod_1.z.number().int().nonnegative(),
    screenshotCount: zod_1.z.number().int().nonnegative(),
    consoleErrorCount: zod_1.z.number().int().nonnegative(),
    pageErrorCount: zod_1.z.number().int().nonnegative(),
    networkErrorCount: zod_1.z.number().int().nonnegative(),
    items: zod_1.z.array(browserMultiSessionSummaryItemSchema),
}).passthrough();
const browserStabilityStatusCountsSchema = zod_1.z.object({
    stable_pass: zod_1.z.number().int().nonnegative(),
    stable_fail: zod_1.z.number().int().nonnegative(),
    flaky: zod_1.z.number().int().nonnegative(),
    blocked: zod_1.z.number().int().nonnegative(),
});
const browserStabilitySummaryItemSchema = zod_1.z.object({
    groupId: zod_1.z.string().min(1),
    project: zod_1.z.string(),
    name: zod_1.z.string(),
    provider: optionalString,
    probeType: optionalString,
    expectedRuns: zod_1.z.number().int().min(2).max(10),
    runCount: zod_1.z.number().int().nonnegative(),
    status: zod_1.z.enum(["stable_pass", "stable_fail", "flaky", "blocked"]),
    statusCounts: browserFlowStatusCountsSchema,
    failedRuns: zod_1.z.array(zod_1.z.number().int().positive()),
    blockedRuns: zod_1.z.array(zod_1.z.number().int().positive()),
    skippedRuns: zod_1.z.array(zod_1.z.number().int().positive()),
    durationMs: zod_1.z.number().nonnegative(),
    screenshotCount: zod_1.z.number().int().nonnegative(),
    firstFailure: optionalString,
}).passthrough();
const browserStabilitySummarySchema = zod_1.z.object({
    total: zod_1.z.number().int().nonnegative(),
    statusCounts: browserStabilityStatusCountsSchema,
    expectedRunCount: zod_1.z.number().int().nonnegative(),
    runCount: zod_1.z.number().int().nonnegative(),
    passedRunCount: zod_1.z.number().int().nonnegative(),
    failedRunCount: zod_1.z.number().int().nonnegative(),
    blockedRunCount: zod_1.z.number().int().nonnegative(),
    skippedRunCount: zod_1.z.number().int().nonnegative(),
    screenshotCount: zod_1.z.number().int().nonnegative(),
    items: zod_1.z.array(browserStabilitySummaryItemSchema),
}).passthrough();
const browserProviderGapSchema = zod_1.z.object({
    provider: zod_1.z.string(),
    project: optionalString,
    check: zod_1.z.string(),
    kind: zod_1.z.enum(["action", "assertion", "provider"]),
    step: optionalString,
    category: zod_1.z.enum(["unsupported_action", "unsupported_assertion", "missing_tool", "provider_unavailable", "provider_capability_gap"]),
    reason: zod_1.z.string(),
    recommendation: zod_1.z.string(),
}).passthrough();
const browserProviderSummaryItemSchema = zod_1.z.object({
    provider: zod_1.z.string(),
    label: optionalString,
    preferred: zod_1.z.boolean(),
    available: zod_1.z.boolean(),
    selected: zod_1.z.boolean(),
    attempted: zod_1.z.boolean(),
    resultCount: zod_1.z.number().int().nonnegative(),
    passed: zod_1.z.number().int().nonnegative(),
    failed: zod_1.z.number().int().nonnegative(),
    blocked: zod_1.z.number().int().nonnegative(),
    skipped: zod_1.z.number().int().nonnegative(),
    reason: optionalString,
    tools: stringList.optional(),
    diagnostics: zod_1.z.record(zod_1.z.any()).optional(),
}).passthrough();
const browserProviderSummarySchema = zod_1.z.object({
    preferred: zod_1.z.string(),
    status: zod_1.z.enum(["not_required", "provider_none", "ready", "used", "blocked", "unavailable"]),
    selectedProvider: optionalString,
    selectedProviders: stringList.optional(),
    availableProviders: stringList,
    attemptedProviders: stringList,
    fallbackUsed: zod_1.z.boolean(),
    items: zod_1.z.array(browserProviderSummaryItemSchema),
}).passthrough();
const failureSummarySchema = zod_1.z.object({
    type: zod_1.z.enum(["issue", "server", "command", "http", "browser", "required_check", "acceptance"]),
    project: optionalString,
    title: zod_1.z.string(),
    status: zod_1.z.enum(["failed", "blocked", "not_verified", "unknown"]),
    reason: zod_1.z.string(),
    evidence: stringList.optional(),
    nextAction: optionalString,
    diagnostics: stringList.optional(),
}).passthrough();
const browserStorageStateEvidenceSchema = zod_1.z.object({
    source: zod_1.z.literal("file"),
    fileName: zod_1.z.string().min(1).refine(value => !/[\\/]/.test(value), "Storage-state fileName must be a base file name."),
    sizeBytes: zod_1.z.number().int().nonnegative(),
    sha256: zod_1.z.string().regex(/^[a-f0-9]{64}$/i),
    cookieCount: zod_1.z.number().int().nonnegative(),
    originCount: zod_1.z.number().int().nonnegative(),
}).passthrough().superRefine((value, ctx) => {
    for (const key of ["path", "cookies", "origins", "value", "values", "token", "password", "username"]) {
        if (Object.prototype.hasOwnProperty.call(value, key)) {
            ctx.addIssue({ code: zod_1.z.ZodIssueCode.custom, message: "Browser storage-state evidence must not contain raw authentication state.", path: [key] });
        }
    }
});
const browserAuthenticationEvidenceSchema = zod_1.z.object({
    credentialEnvNames: zod_1.z.array(zod_1.z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/)),
    mode: zod_1.z.enum(["managed", "existing_session"]).optional(),
    storageState: browserStorageStateEvidenceSchema.optional(),
    existingSession: zod_1.z.object({
        provider: zod_1.z.enum(["claude-in-chrome", "chrome-devtools"]),
        evidencePolicy: zod_1.z.enum(["minimal", "full"]),
        tabContextChecked: zod_1.z.boolean(),
        tabCount: zod_1.z.number().int().nonnegative().optional(),
        createdNewTab: zod_1.z.boolean(),
        pageTextObserved: zod_1.z.boolean(),
        consoleMessageCount: zod_1.z.number().int().nonnegative(),
        networkRequestCount: zod_1.z.number().int().nonnegative(),
        screenshotSuppressed: zod_1.z.boolean().optional(),
        transcriptDetailsSuppressed: zod_1.z.boolean().optional(),
    }).passthrough().superRefine((value, ctx) => {
        for (const key of ["tabId", "tab_id", "url", "urls", "title", "titles", "pageText", "page_text", "consoleMessages", "networkRequests"]) {
            if (Object.prototype.hasOwnProperty.call(value, key)) {
                ctx.addIssue({
                    code: zod_1.z.ZodIssueCode.custom,
                    message: "Existing-session evidence must not contain raw tab or page data.",
                    path: [key],
                });
            }
        }
    }).optional(),
    sensitiveArtifactsSuppressed: zod_1.z.boolean().optional(),
}).passthrough().superRefine((value, ctx) => {
    const names = Array.isArray(value.credentialEnvNames) ? value.credentialEnvNames : [];
    if (new Set(names).size !== names.length) {
        ctx.addIssue({ code: zod_1.z.ZodIssueCode.custom, message: "Browser authentication credentialEnvNames must not contain duplicates.", path: ["credentialEnvNames"] });
    }
    for (const key of ["path", "cookies", "origins", "value", "values", "token", "password", "username"]) {
        if (Object.prototype.hasOwnProperty.call(value, key)) {
            ctx.addIssue({ code: zod_1.z.ZodIssueCode.custom, message: "Browser authentication evidence must not contain raw credentials or authentication state.", path: [key] });
        }
    }
    if (value.mode === "existing_session") {
        if (!value.existingSession)
            ctx.addIssue({ code: zod_1.z.ZodIssueCode.custom, message: "Existing-session authentication evidence requires existingSession metadata.", path: ["existingSession"] });
        if (value.storageState)
            ctx.addIssue({ code: zod_1.z.ZodIssueCode.custom, message: "Existing-session authentication evidence cannot contain storageState metadata.", path: ["storageState"] });
        if (Array.isArray(value.credentialEnvNames) && value.credentialEnvNames.length) {
            ctx.addIssue({ code: zod_1.z.ZodIssueCode.custom, message: "Existing-session authentication evidence cannot contain credential environment names.", path: ["credentialEnvNames"] });
        }
    }
    if (value.mode === "managed" && value.existingSession) {
        ctx.addIssue({ code: zod_1.z.ZodIssueCode.custom, message: "Managed authentication evidence cannot contain existingSession metadata.", path: ["existingSession"] });
    }
});
const browserSessionResultSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    url: zod_1.z.string(),
    finalUrl: optionalString,
    title: optionalString,
    pageTextPreview: optionalString,
    screenshots: stringList,
    pageSnapshots: stringList.optional(),
    browserArtifacts: zod_1.z.array(zod_1.z.object({
        type: zod_1.z.string().min(1),
        title: zod_1.z.string().min(1),
        path: zod_1.z.string(),
    }).passthrough()).optional(),
    consoleErrors: stringList,
    pageErrors: stringList,
    networkErrors: stringList,
    consoleLogPath: optionalString,
    networkLogPath: optionalString,
    authentication: browserAuthenticationEvidenceSchema.optional(),
}).passthrough();
const browserSessionComparisonValueSummarySchema = zod_1.z.object({
    type: zod_1.z.string(),
    length: zod_1.z.number().int().nonnegative().optional(),
    serializedBytes: zod_1.z.number().int().nonnegative(),
    sha256: zod_1.z.string().regex(/^[a-f0-9]{64}$/i),
}).passthrough().superRefine((value, ctx) => {
    for (const key of ["value", "values", "rawValue", "raw_value", "rawValues", "raw_values", "actual", "expected"]) {
        if (Object.prototype.hasOwnProperty.call(value, key)) {
            ctx.addIssue({ code: zod_1.z.ZodIssueCode.custom, message: "Browser session comparison summaries must not contain raw compared values.", path: [key] });
        }
    }
});
const browserSessionComparisonResultSchema = zod_1.z.object({
    leftSession: zod_1.z.string().min(1),
    rightSession: zod_1.z.string().min(1),
    operator: zod_1.z.enum(["equals", "notEquals", "includes"]),
    status: zod_1.z.enum(["passed", "failed"]),
    attempts: zod_1.z.number().int().positive(),
    durationMs: zod_1.z.number().nonnegative(),
    timeoutMs: zod_1.z.number().positive(),
    pollMs: zod_1.z.number().positive(),
    left: browserSessionComparisonValueSummarySchema.optional(),
    right: browserSessionComparisonValueSummarySchema.optional(),
    evaluationErrors: zod_1.z.object({
        left: optionalString,
        right: optionalString,
    }).passthrough().optional(),
    error: optionalString,
}).passthrough().superRefine((value, ctx) => {
    for (const key of ["value", "values", "rawValue", "raw_value", "rawValues", "raw_values", "leftValue", "left_value", "rightValue", "right_value", "actual", "expected"]) {
        if (Object.prototype.hasOwnProperty.call(value, key)) {
            ctx.addIssue({ code: zod_1.z.ZodIssueCode.custom, message: "Browser session comparison results must not contain raw compared values.", path: [key] });
        }
    }
});
const browserRecoveryEventSchema = zod_1.z.object({
    provider: zod_1.z.enum(["claude-in-chrome", "chrome-devtools"]),
    operation: zod_1.z.string().regex(/^[A-Za-z0-9:_-]+$/),
    trigger: zod_1.z.enum(["stale_tab", "navigation_context_lost", "transport_disconnected"]),
    retrySafe: zod_1.z.boolean(),
    status: zod_1.z.enum(["recovered", "not_retried", "failed"]),
    contextRefreshed: zod_1.z.boolean(),
    createdNewTab: zod_1.z.boolean(),
    attempt: zod_1.z.number().int().positive(),
}).passthrough().superRefine((value, ctx) => {
    for (const key of ["error", "message", "reason", "tabId", "tab_id", "pageId", "page_id", "url", "title", "rawError", "raw_error"]) {
        if (Object.prototype.hasOwnProperty.call(value, key)) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                message: "Browser recovery events must not contain raw provider, tab, page, or URL detail.",
                path: [key],
            });
        }
    }
    const forbiddenPaths = (0, recovery_validation_1.browserRecoveryForbiddenDetailPaths)(value);
    if (forbiddenPaths.length) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: `Browser recovery events contain forbidden raw browser detail at ${forbiddenPaths.join(", ")}.`,
            path: ["operation"],
        });
    }
    const retrySafe = (0, recovery_validation_1.browserRecoveryOperationIsSafe)(String(value.operation || ""));
    if (value.retrySafe !== retrySafe) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: "Browser recovery retrySafe must match the operation replay policy.",
            path: ["retrySafe"],
        });
    }
    if ((value.status === "recovered" || value.status === "failed") && !retrySafe) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: "Only safe browser operations may be recovered or fail after a recovery retry.",
            path: ["status"],
        });
    }
    if (value.status === "recovered" && (!value.retrySafe || !value.contextRefreshed || !value.createdNewTab)) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: "Recovered browser operations must be safe to retry and prove context refresh plus new-tab creation.",
            path: ["status"],
        });
    }
    if (value.status === "not_retried" && value.retrySafe) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: "A not-retried browser operation must be marked unsafe to retry.",
            path: ["retrySafe"],
        });
    }
});
const browserRecoveryEvidenceSchema = zod_1.z.object({
    maxAttempts: zod_1.z.number().int().min(1).max(3),
    attempted: zod_1.z.number().int().nonnegative(),
    recovered: zod_1.z.number().int().nonnegative(),
    failed: zod_1.z.number().int().nonnegative(),
    notRetried: zod_1.z.number().int().nonnegative(),
    events: zod_1.z.array(browserRecoveryEventSchema),
}).passthrough().superRefine((value, ctx) => {
    const events = Array.isArray(value.events) ? value.events : [];
    const counts = {
        recovered: events.filter(event => event.status === "recovered").length,
        failed: events.filter(event => event.status === "failed").length,
        notRetried: events.filter(event => event.status === "not_retried").length,
    };
    if (value.attempted !== events.length) {
        ctx.addIssue({ code: zod_1.z.ZodIssueCode.custom, message: "Browser recovery attempted count must match events.", path: ["attempted"] });
    }
    for (const key of ["recovered", "failed", "notRetried"]) {
        if (value[key] !== counts[key]) {
            ctx.addIssue({ code: zod_1.z.ZodIssueCode.custom, message: `Browser recovery ${key} count must match events.`, path: [key] });
        }
    }
    if (events.some(event => Number(event.attempt || 0) > Number(value.maxAttempts || 0))) {
        ctx.addIssue({ code: zod_1.z.ZodIssueCode.custom, message: "Browser recovery event attempt exceeds maxAttempts.", path: ["events"] });
    }
    const forbiddenPaths = (0, recovery_validation_1.browserRecoveryForbiddenDetailPaths)({
        ...value,
        events: undefined,
    });
    if (forbiddenPaths.length) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: `Browser recovery evidence contains forbidden raw browser detail at ${forbiddenPaths.join(", ")}.`,
            path: ["events"],
        });
    }
});
const browserRecoverySummarySchema = zod_1.z.object({
    checks: zod_1.z.number().int().nonnegative(),
    attempted: zod_1.z.number().int().nonnegative(),
    recovered: zod_1.z.number().int().nonnegative(),
    failed: zod_1.z.number().int().nonnegative(),
    notRetried: zod_1.z.number().int().nonnegative(),
    items: zod_1.z.array(zod_1.z.object({
        project: zod_1.z.string(),
        name: zod_1.z.string(),
        provider: zod_1.z.enum(["playwright", "mcp", "none"]).optional(),
        status: resultStatus,
        attempted: zod_1.z.number().int().nonnegative(),
        recovered: zod_1.z.number().int().nonnegative(),
        failed: zod_1.z.number().int().nonnegative(),
        notRetried: zod_1.z.number().int().nonnegative(),
        events: zod_1.z.array(browserRecoveryEventSchema),
    }).passthrough()),
}).passthrough().superRefine((value, ctx) => {
    const items = Array.isArray(value.items) ? value.items : [];
    const totals = {
        attempted: items.reduce((sum, item) => sum + Number(item?.attempted || 0), 0),
        recovered: items.reduce((sum, item) => sum + Number(item?.recovered || 0), 0),
        failed: items.reduce((sum, item) => sum + Number(item?.failed || 0), 0),
        notRetried: items.reduce((sum, item) => sum + Number(item?.notRetried || 0), 0),
    };
    if (value.checks !== items.length) {
        ctx.addIssue({ code: zod_1.z.ZodIssueCode.custom, message: "Browser recovery summary checks must match items.", path: ["checks"] });
    }
    for (const key of ["attempted", "recovered", "failed", "notRetried"]) {
        if (value[key] !== totals[key]) {
            ctx.addIssue({ code: zod_1.z.ZodIssueCode.custom, message: `Browser recovery summary ${key} must match items.`, path: [key] });
        }
    }
    for (const [index, item] of items.entries()) {
        const events = Array.isArray(item?.events) ? item.events : [];
        const statusCounts = {
            recovered: events.filter(event => event?.status === "recovered").length,
            failed: events.filter(event => event?.status === "failed").length,
            notRetried: events.filter(event => event?.status === "not_retried").length,
        };
        if (Number(item?.attempted) !== events.length) {
            ctx.addIssue({ code: zod_1.z.ZodIssueCode.custom, message: "Browser recovery summary item attempted must match events.", path: ["items", index, "attempted"] });
        }
        for (const key of ["recovered", "failed", "notRetried"]) {
            if (Number(item?.[key]) !== statusCounts[key]) {
                ctx.addIssue({ code: zod_1.z.ZodIssueCode.custom, message: `Browser recovery summary item ${key} must match events.`, path: ["items", index, key] });
            }
        }
    }
    const forbiddenPaths = (0, recovery_validation_1.browserRecoveryForbiddenDetailPaths)(value);
    if (forbiddenPaths.length) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: `Browser recovery summary contains forbidden raw browser detail at ${forbiddenPaths.join(", ")}.`,
            path: ["items"],
        });
    }
});
const browserActionEffectSignalSchema = zod_1.z.enum([
    "url",
    "title",
    "page_text",
    "dom",
    "network",
    "dialog",
    "popup",
    "download",
]);
const browserActionEffectSnapshotSchema = zod_1.z.object({
    urlSha256: zod_1.z.string().regex(/^[a-f0-9]{64}$/i).optional(),
    titleSha256: zod_1.z.string().regex(/^[a-f0-9]{64}$/i).optional(),
    pageTextSha256: zod_1.z.string().regex(/^[a-f0-9]{64}$/i).optional(),
    domSha256: zod_1.z.string().regex(/^[a-f0-9]{64}$/i).optional(),
    networkCount: zod_1.z.number().int().nonnegative().optional(),
    dialogCount: zod_1.z.number().int().nonnegative().optional(),
    popupCount: zod_1.z.number().int().nonnegative().optional(),
    downloadCount: zod_1.z.number().int().nonnegative().optional(),
}).strict();
const browserActionEffectEvidenceSchema = zod_1.z.object({
    provider: zod_1.z.enum(["playwright", "mcp"]),
    actionIndex: zod_1.z.number().int().nonnegative(),
    session: zod_1.z.string().min(1).optional(),
    effectSession: zod_1.z.string().min(1).optional(),
    actionType: zod_1.z.string().min(1),
    status: zod_1.z.enum(["changed", "unchanged", "unavailable"]),
    timeoutMs: zod_1.z.number().int().min(100).max(10_000),
    startedAt: zod_1.z.string(),
    finishedAt: zod_1.z.string(),
    durationMs: zod_1.z.number().nonnegative(),
    requestedSignals: zod_1.z.array(browserActionEffectSignalSchema),
    observedSignals: zod_1.z.array(browserActionEffectSignalSchema),
    changedSignals: zod_1.z.array(browserActionEffectSignalSchema),
    before: browserActionEffectSnapshotSchema,
    after: browserActionEffectSnapshotSchema,
    detailSuppressed: zod_1.z.boolean().optional(),
}).passthrough().superRefine((value, ctx) => {
    for (const error of (0, action_effects_1.browserActionEffectEvidenceErrors)(value)) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: error,
            path: ["status"],
        });
    }
});
const browserActionEffectSummaryItemSchema = zod_1.z.object({
    project: zod_1.z.string(),
    name: zod_1.z.string(),
    provider: zod_1.z.enum(["playwright", "mcp", "none"]).optional(),
    status: resultStatus,
    actions: zod_1.z.number().int().nonnegative(),
    changed: zod_1.z.number().int().nonnegative(),
    unchanged: zod_1.z.number().int().nonnegative(),
    unavailable: zod_1.z.number().int().nonnegative(),
    failed: zod_1.z.number().int().nonnegative(),
    detailSuppressed: zod_1.z.number().int().nonnegative(),
    crossSession: zod_1.z.number().int().nonnegative(),
    actionTypes: zod_1.z.record(zod_1.z.number().int().nonnegative()),
    changedSignals: zod_1.z.record(zod_1.z.number().int().nonnegative()),
}).passthrough();
const browserActionEffectSummarySchema = zod_1.z.object({
    checks: zod_1.z.number().int().nonnegative(),
    actions: zod_1.z.number().int().nonnegative(),
    changed: zod_1.z.number().int().nonnegative(),
    unchanged: zod_1.z.number().int().nonnegative(),
    unavailable: zod_1.z.number().int().nonnegative(),
    failed: zod_1.z.number().int().nonnegative(),
    detailSuppressed: zod_1.z.number().int().nonnegative(),
    crossSession: zod_1.z.number().int().nonnegative(),
    actionTypes: zod_1.z.record(zod_1.z.number().int().nonnegative()),
    changedSignals: zod_1.z.record(zod_1.z.number().int().nonnegative()),
    items: zod_1.z.array(browserActionEffectSummaryItemSchema),
}).passthrough().superRefine((value, ctx) => {
    for (const error of (0, action_effect_summary_1.browserActionEffectSummaryErrors)(value)) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: error,
            path: ["items"],
        });
    }
    for (const signal of Object.keys(value.changedSignals || {})) {
        if (!action_effects_1.BROWSER_ACTION_EFFECT_SIGNALS.includes(signal)) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                message: `Unsupported browser action-effect signal ${signal}.`,
                path: ["changedSignals", signal],
            });
        }
    }
});
const browserCheckResultSchema = zod_1.z.object({
    status: resultStatus,
    browserSessions: zod_1.z.array(browserSessionResultSchema).optional(),
    browserSessionComparisons: zod_1.z.array(browserSessionComparisonResultSchema).optional(),
    authentication: browserAuthenticationEvidenceSchema.optional(),
    recovery: browserRecoveryEvidenceSchema.optional(),
    actionEffects: zod_1.z.array(browserActionEffectEvidenceSchema).optional(),
    contextOptions: zod_1.z.object({
        storageState: browserStorageStateEvidenceSchema.optional(),
    }).passthrough().optional(),
}).passthrough().superRefine((value, ctx) => {
    for (const error of (0, action_effects_1.browserActionEffectResultErrors)(value)) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: error,
            path: ["actionEffects"],
        });
    }
    const effectIndexes = (Array.isArray(value.actionEffects) ? value.actionEffects : [])
        .map((effect) => effect.actionIndex);
    if (new Set(effectIndexes).size !== effectIndexes.length) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: "Browser actionEffects must not contain duplicate actionIndex values.",
            path: ["actionEffects"],
        });
    }
    const existing = value.authentication?.existingSession;
    if (value.authentication?.mode !== "existing_session" || existing?.evidencePolicy !== "minimal")
        return;
    for (const [index, effect] of (Array.isArray(value.actionEffects) ? value.actionEffects : []).entries()) {
        if (!effect?.detailSuppressed || Object.keys(effect.before || {}).length || Object.keys(effect.after || {}).length) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                message: "Minimal existing-session action effects must suppress before/after digest and count detail.",
                path: ["actionEffects", index],
            });
        }
    }
    const forbiddenScalarFields = [
        "finalUrl",
        "title",
        "pageTextPreview",
        "consoleLogPath",
        "dialogLogPath",
        "popupLogPath",
        "networkLogPath",
    ];
    for (const key of forbiddenScalarFields) {
        if (value[key] !== undefined && value[key] !== "") {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                message: "Minimal existing-session results must not contain raw page or telemetry detail.",
                path: [key],
            });
        }
    }
    for (const key of ["screenshots", "pageSnapshots", "browserArtifacts", "consoleMessages", "dialogMessages", "popupMessages", "networkRequests"]) {
        if (Array.isArray(value[key]) && value[key].length) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                message: "Minimal existing-session results must not contain detailed browser artifacts or telemetry.",
                path: [key],
            });
        }
    }
    for (const [index, step] of (Array.isArray(value.steps) ? value.steps : []).entries()) {
        if (step?.detail && step.detail !== "authenticated browser step executed; raw detail suppressed") {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                message: "Minimal existing-session step detail was not suppressed.",
                path: ["steps", index, "detail"],
            });
        }
        if (step?.error && step.error !== "Authenticated browser step failed; raw provider detail suppressed.") {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                message: "Minimal existing-session step error was not suppressed.",
                path: ["steps", index, "error"],
            });
        }
    }
    if (value.status === "passed" && (!existing.tabContextChecked || !existing.createdNewTab)) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: "Passed existing-session verification must check tab context and create a new tab.",
            path: ["authentication", "existingSession"],
        });
    }
});
function validateMinimalBrowserToolCalls(value, ctx) {
    const minimal = (Array.isArray(value.browserResults) ? value.browserResults : []).some((result) => result?.authentication?.mode === "existing_session"
        && result?.authentication?.existingSession?.evidencePolicy === "minimal");
    if (!minimal)
        return;
    for (const [index, record] of (Array.isArray(value.browserToolCalls) ? value.browserToolCalls : []).entries()) {
        const input = record?.input;
        const keys = input && typeof input === "object" && !Array.isArray(input) ? Object.keys(input) : [];
        if (!input || keys.some(key => key !== "inputKeys" && key !== "action") || !Array.isArray(input.inputKeys)) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                message: "Minimal existing-session browser tool inputs must contain metadata only.",
                path: ["browserToolCalls", index, "input"],
            });
        }
        if (record?.outputPreview && record.outputPreview !== "[suppressed for existing authenticated browser session]") {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                message: "Minimal existing-session browser tool output must be suppressed.",
                path: ["browserToolCalls", index, "outputPreview"],
            });
        }
        if (record?.error && record.error !== "Browser tool call failed; raw provider error suppressed.") {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                message: "Minimal existing-session browser tool errors must be suppressed.",
                path: ["browserToolCalls", index, "error"],
            });
        }
    }
}
exports.TestAgentReportContractSchema = zod_1.z.object({
    schema: zod_1.z.literal(exports.TEST_AGENT_CONTRACT_IDS.report),
    agent: zod_1.z.literal("test-agent"),
    id: zod_1.z.string().min(1),
    workOrderId: zod_1.z.string().min(1),
    taskId: zod_1.z.string(),
    groupId: zod_1.z.string(),
    originalUserGoal: zod_1.z.string(),
    acceptanceCriteria: stringList,
    status: agentStatus,
    recommendation: zod_1.z.enum(["accept", "rework", "need_human"]),
    summary: zod_1.z.string(),
    startedAt: zod_1.z.string(),
    finishedAt: zod_1.z.string(),
    durationMs: zod_1.z.number(),
    artifactDir: zod_1.z.string(),
    requiredChecks: stringList,
    commandResults: zod_1.z.array(zod_1.z.object({ status: resultStatus }).passthrough()),
    devServerResults: zod_1.z.array(zod_1.z.object({ status: resultStatus }).passthrough()),
    httpResults: zod_1.z.array(httpCheckResultSchema),
    browserResults: zod_1.z.array(browserCheckResultSchema),
    browserToolCalls: zod_1.z.array(zod_1.z.object({ status: zod_1.z.enum(["passed", "failed"]) }).passthrough()),
    browserNetworkSummary: zod_1.z.array(browserNetworkSummarySchema).optional(),
    httpConcurrencySummary: httpConcurrencySummarySchema.optional(),
    browserInteractionSummary: zod_1.z.array(browserInteractionSummarySchema).optional(),
    browserFlowSummary: browserFlowSummarySchema.optional(),
    browserMultiSessionSummary: browserMultiSessionSummarySchema.optional(),
    browserStabilitySummary: browserStabilitySummarySchema.optional(),
    browserRecoverySummary: browserRecoverySummarySchema.optional(),
    browserActionEffectSummary: browserActionEffectSummarySchema.optional(),
    adversarialEvidenceSummary: adversarialEvidenceSummarySchema,
    browserProviderSummary: browserProviderSummarySchema.optional(),
    browserProviderGaps: zod_1.z.array(browserProviderGapSchema).optional(),
    failureSummary: zod_1.z.array(failureSummarySchema).optional(),
    requiredCheckCoverage: zod_1.z.array(requiredCheckCoverageSchema),
    acceptanceCoverage: zod_1.z.array(acceptanceCoverageSchema),
    acceptanceEvidenceGateSummary: acceptanceEvidenceGateSummarySchema,
    evidence: zod_1.z.array(evidenceSchema),
    risks: stringList,
    blockedReasons: stringList,
    issues: zod_1.z.array(zod_1.z.object({
        severity: zod_1.z.enum(["error", "warning"]),
        code: zod_1.z.string(),
        message: zod_1.z.string(),
        project: optionalString,
    }).passthrough()),
    metadata: zod_1.z.record(zod_1.z.any()),
}).passthrough().superRefine((value, ctx) => {
    validateMinimalBrowserToolCalls(value, ctx);
    const hasEffects = (Array.isArray(value.browserResults) ? value.browserResults : [])
        .some((result) => Array.isArray(result?.actionEffects) && result.actionEffects.length);
    if (hasEffects && !value.browserActionEffectSummary) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: "Reports with browser action effects require browserActionEffectSummary.",
            path: ["browserActionEffectSummary"],
        });
    }
    const httpResults = Array.isArray(value.httpResults) ? value.httpResults : [];
    for (const [index, result] of httpResults.entries()) {
        for (const error of (0, http_page_resources_1.httpPageResourceEvidenceErrors)(result, `httpResults[${index}]`)) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                message: error,
                path: ["httpResults", index, "resourceChecks"],
            });
        }
    }
    const concurrentHttpResults = httpResults
        .map((result, index) => ({ result, index }))
        .filter((item) => item.result?.concurrency);
    if (concurrentHttpResults.length && !value.httpConcurrencySummary) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: "Reports with concurrent HTTP evidence require httpConcurrencySummary.",
            path: ["httpConcurrencySummary"],
        });
    }
    for (const { index, result } of concurrentHttpResults) {
        for (const error of (0, http_concurrency_1.httpConcurrencyEvidenceErrors)(result.concurrency, `httpResults[${index}].concurrency`)) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                message: error,
                path: ["httpResults", index, "concurrency"],
            });
        }
        const expectedStatus = (0, http_concurrency_1.httpConcurrencyResultStatus)(result.concurrency);
        if (result.status !== expectedStatus) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                message: `httpResults[${index}].status must be ${expectedStatus} for its concurrent HTTP evidence.`,
                path: ["httpResults", index, "status"],
            });
        }
    }
    if (value.httpConcurrencySummary) {
        for (const error of (0, http_concurrency_1.httpConcurrencySummaryErrors)(value.httpConcurrencySummary, value.httpResults || [])) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                message: error,
                path: ["httpConcurrencySummary"],
            });
        }
    }
    if (value.browserActionEffectSummary) {
        for (const error of (0, action_effect_summary_1.browserActionEffectSummaryErrors)(value.browserActionEffectSummary, value.browserResults || [])) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                message: error,
                path: ["browserActionEffectSummary"],
            });
        }
    }
    for (const error of (0, adversarial_summary_1.adversarialEvidenceSummaryErrors)(value.adversarialEvidenceSummary, value.httpResults || [], value.browserResults || [], value.originalUserGoal || "", value.acceptanceCriteria || [])) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: error,
            path: ["adversarialEvidenceSummary"],
        });
    }
    for (const error of (0, acceptance_gate_1.acceptanceEvidenceGateSummaryErrors)(value.acceptanceEvidenceGateSummary, value.acceptanceCoverage || [])) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: error,
            path: ["acceptanceEvidenceGateSummary"],
        });
    }
    if (value.status === "passed"
        && !["verified", "waived"].includes(String(value.adversarialEvidenceSummary?.status || ""))) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: "A passed report requires verified adversarial evidence or an explicit waiver.",
            path: ["status"],
        });
    }
    if (value.status === "passed" && value.acceptanceEvidenceGateSummary?.canAccept !== true) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: "A passed report requires criterion-linked acceptance evidence or no acceptance criteria.",
            path: ["status"],
        });
    }
    const requiresAdversarial = (value.requiredChecks || [])
        .some((check) => /adversarial|boundary|orphan|idempot|concurr|race/i.test(String(check || "")));
    if (requiresAdversarial && value.adversarialEvidenceSummary?.required !== true) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: "Adversarial required checks require adversarialEvidenceSummary.required=true.",
            path: ["adversarialEvidenceSummary", "required"],
        });
    }
});
exports.TestAgentVerdictContractSchema = zod_1.z.object({
    schema: zod_1.z.literal(exports.TEST_AGENT_CONTRACT_IDS.verdict),
    agent: zod_1.z.literal("test-agent"),
    reportId: zod_1.z.string().min(1),
    workOrderId: zod_1.z.string().min(1),
    taskId: zod_1.z.string(),
    groupId: zod_1.z.string(),
    status: agentStatus,
    recommendation: zod_1.z.enum(["accept", "rework", "need_human"]),
    canAccept: zod_1.z.boolean(),
    needsRework: zod_1.z.boolean(),
    needsHuman: zod_1.z.boolean(),
    summary: zod_1.z.string(),
    failedRequiredChecks: zod_1.z.array(requiredCheckCoverageSchema),
    unknownRequiredChecks: zod_1.z.array(requiredCheckCoverageSchema),
    failedAcceptanceCriteria: zod_1.z.array(acceptanceCoverageSchema),
    unknownAcceptanceCriteria: zod_1.z.array(acceptanceCoverageSchema),
    requiredCheckSummary: requiredCheckSummarySchema,
    acceptanceSummary: acceptanceSummarySchema,
    blockedReasons: stringList,
    risks: stringList,
    nextActions: stringList,
    evidenceSummary: zod_1.z.object({
        commands: zod_1.z.record(zod_1.z.number()),
        devServers: zod_1.z.record(zod_1.z.number()),
        httpChecks: zod_1.z.record(zod_1.z.number()),
        httpConcurrencyChecks: zod_1.z.number().optional(),
        httpConcurrentRequests: zod_1.z.number().optional(),
        httpConcurrentFailed: zod_1.z.number().optional(),
        httpConcurrentBlocked: zod_1.z.number().optional(),
        browserChecks: zod_1.z.record(zod_1.z.number()),
        browserToolCalls: zod_1.z.record(zod_1.z.number()),
        browserNetworkErrors: zod_1.z.number().optional(),
        browserActions: zod_1.z.number().optional(),
        browserFailedActions: zod_1.z.number().optional(),
        browserAssertions: zod_1.z.number().optional(),
        browserFailedAssertions: zod_1.z.number().optional(),
        browserAcceptanceFlows: zod_1.z.number().optional(),
        browserFailedAcceptanceFlows: zod_1.z.number().optional(),
        browserMultiSessionScenarios: zod_1.z.number().optional(),
        browserMultiSessionSessions: zod_1.z.number().optional(),
        browserMultiSessionParallelGroups: zod_1.z.number().optional(),
        browserMultiSessionComparisons: zod_1.z.number().optional(),
        browserFailedSessionComparisons: zod_1.z.number().optional(),
        browserFailedMultiSessionScenarios: zod_1.z.number().optional(),
        browserStabilityGroups: zod_1.z.number().optional(),
        browserFlakyStabilityGroups: zod_1.z.number().optional(),
        browserStabilityRuns: zod_1.z.number().optional(),
        browserFailedStabilityRuns: zod_1.z.number().optional(),
        browserRecoveryAttempts: zod_1.z.number().optional(),
        browserRecoveredOperations: zod_1.z.number().optional(),
        browserFailedRecoveries: zod_1.z.number().optional(),
        browserUnsafeRetriesPrevented: zod_1.z.number().optional(),
        browserActionEffectChecks: zod_1.z.number().optional(),
        browserActionEffects: zod_1.z.number().optional(),
        browserFailedActionEffects: zod_1.z.number().optional(),
        browserCrossSessionActionEffects: zod_1.z.number().optional(),
        adversarialProbes: zod_1.z.number().optional(),
        adversarialPassed: zod_1.z.number().optional(),
        adversarialFailed: zod_1.z.number().optional(),
        adversarialBlocked: zod_1.z.number().optional(),
        adversarialRelevant: zod_1.z.number().optional(),
        adversarialUnlinked: zod_1.z.number().optional(),
        adversarialPassedRelevant: zod_1.z.number().optional(),
        acceptanceMatchedEvidence: zod_1.z.number(),
        acceptanceFallbackEvidence: zod_1.z.number(),
        acceptanceMissingEvidence: zod_1.z.number(),
        browserProviderGaps: zod_1.z.number().optional(),
        artifacts: zod_1.z.number(),
    }).passthrough(),
    browserNetworkSummary: zod_1.z.array(browserNetworkSummarySchema).optional(),
    httpConcurrencySummary: httpConcurrencySummarySchema.optional(),
    browserInteractionSummary: zod_1.z.array(browserInteractionSummarySchema).optional(),
    browserFlowSummary: browserFlowSummarySchema.optional(),
    browserMultiSessionSummary: browserMultiSessionSummarySchema.optional(),
    browserStabilitySummary: browserStabilitySummarySchema.optional(),
    browserRecoverySummary: browserRecoverySummarySchema.optional(),
    browserActionEffectSummary: browserActionEffectSummarySchema.optional(),
    adversarialEvidenceSummary: adversarialEvidenceSummarySchema,
    acceptanceEvidenceGateSummary: acceptanceEvidenceGateSummarySchema,
    browserProviderSummary: browserProviderSummarySchema.optional(),
    browserProviderGaps: zod_1.z.array(browserProviderGapSchema).optional(),
    failureSummary: zod_1.z.array(failureSummarySchema).optional(),
    keyEvidence: zod_1.z.array(evidenceSchema),
    artifacts: zod_1.z.object({
        artifactDir: zod_1.z.string(),
        reportJsonPath: optionalString,
        reportMarkdownPath: optionalString,
        verdictJsonPath: optionalString,
        manifestPath: optionalString,
    }).passthrough(),
    metadata: zod_1.z.record(zod_1.z.any()),
}).passthrough().superRefine((value, ctx) => {
    for (const error of (0, acceptance_gate_1.acceptanceEvidenceGateSummaryErrors)(value.acceptanceEvidenceGateSummary)) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: error,
            path: ["acceptanceEvidenceGateSummary"],
        });
    }
    if (value.canAccept
        && !["verified", "waived"].includes(String(value.adversarialEvidenceSummary?.status || ""))) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: "canAccept requires verified adversarial evidence or an explicit waiver.",
            path: ["canAccept"],
        });
    }
    if (value.canAccept && value.acceptanceEvidenceGateSummary?.canAccept !== true) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: "canAccept requires criterion-linked acceptance evidence or no acceptance criteria.",
            path: ["canAccept"],
        });
    }
});
//# sourceMappingURL=schema.js.map