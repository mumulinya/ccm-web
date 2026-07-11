import { z } from "zod";
import {
  browserRecoveryForbiddenDetailPaths,
  browserRecoveryOperationIsSafe,
} from "../browser/recovery-validation";
import {
  BROWSER_ACTION_EFFECT_SIGNALS,
  browserActionEffectEvidenceErrors,
  browserActionEffectResultErrors,
} from "../browser/action-effects";
import { browserActionEffectSummaryErrors } from "../browser/action-effect-summary";
import { adversarialEvidenceSummaryErrors } from "../adversarial-summary";
import { acceptanceEvidenceGateSummaryErrors } from "../acceptance-gate";
import {
  MAX_HTTP_CONCURRENT_REQUESTS,
  MIN_HTTP_CONCURRENT_REQUESTS,
  httpConcurrencyEvidenceErrors,
  httpConcurrencyResultStatus,
  httpConcurrencySummaryErrors,
} from "../http-concurrency";
import { httpPageResourceEvidenceErrors } from "../http-page-resources";
import { browserCheckExecutionEvidenceErrors } from "../browser/check-execution-coverage";

export const TEST_AGENT_CONTRACT_IDS = {
  handoff: "ccm-test-agent-handoff-v1",
  workOrder: "ccm-test-agent-work-order-v1",
  report: "ccm-test-agent-report-v1",
  verdict: "ccm-test-agent-verdict-v1",
} as const;

const primitiveValue = z.union([z.string(), z.number(), z.boolean(), z.undefined()]);
const optionalString = z.string().optional();
const timeoutMs = z.number().int().positive().optional();
const countValue = z.number().int().nonnegative().optional();
const stringList = z.array(z.string());
const coordinate = z.union([
  z.tuple([z.number(), z.number()]),
  z.object({ x: z.number(), y: z.number() }).passthrough(),
]);
const statusValue = z.union([z.number().int(), z.string()]);
const statusValueOrList = z.union([statusValue, z.array(statusValue)]);

function requireAnyField(fields: string[], message: string) {
  return (value: Record<string, any>, ctx: z.RefinementCtx) => {
    if (!fields.some(field => value[field] !== undefined && value[field] !== null && value[field] !== "")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message,
        path: [fields[0]],
      });
    }
  };
}

function rejectInlineBrowserStorageState(value: Record<string, any>, ctx: z.RefinementCtx) {
  const context = value.context && typeof value.context === "object" && !Array.isArray(value.context)
    ? value.context
    : {};
  for (const key of ["storageState", "storage_state", "authState", "auth_state"]) {
    if (Object.prototype.hasOwnProperty.call(value, key) || Object.prototype.hasOwnProperty.call(context, key)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Inline browser authentication state is not accepted; use storageStatePath/authStatePath.",
        path: [key],
      });
    }
  }
}

export const TestAgentOptionsContractSchema = z.object({
  artifactDir: optionalString,
  commandTimeoutMs: timeoutMs,
  browserTimeoutMs: timeoutMs,
  httpTimeoutMs: timeoutMs,
  startupTimeoutMs: timeoutMs,
  maxOutputChars: z.number().int().positive().optional(),
  maxHttpResourceChecks: z.number().int().nonnegative().optional(),
  failOnConsoleError: z.boolean().optional(),
  failOnHttpResourceError: z.boolean().optional(),
  verificationOnly: z.boolean().optional(),
  browserProvider: z.enum(["auto", "playwright", "mcp", "none"]).optional(),
  autoDiscoverVerificationCommands: z.boolean().optional(),
  collectBrowserArtifacts: z.boolean().optional(),
  collectBrowserVideo: z.boolean().optional(),
  requireAdversarialProbe: z.boolean().optional(),
  require_adversarial_probe: z.boolean().optional(),
  adversarialProbeWaiver: optionalString,
  adversarial_probe_waiver: optionalString,
}).passthrough().superRefine((value, ctx) => {
  const required = value.requireAdversarialProbe ?? value.require_adversarial_probe;
  const waiver = String(value.adversarialProbeWaiver || value.adversarial_probe_waiver || "").trim();
  if (required === false && !waiver) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Disabling requireAdversarialProbe requires a non-empty adversarialProbeWaiver reason.",
      path: ["adversarialProbeWaiver"],
    });
  }
});

export const TestAgentHttpAssertionContractSchema = z.object({
  type: z.string().min(1).optional(),
  assertion: z.string().min(1).optional(),
  kind: z.string().min(1).optional(),
  status: statusValueOrList.optional(),
  statusCode: statusValueOrList.optional(),
  status_code: statusValueOrList.optional(),
  text: optionalString,
  value: z.any().optional(),
  path: optionalString,
  jsonPath: optionalString,
  json_path: optionalString,
}).passthrough().superRefine(requireAnyField(["type", "assertion", "kind"], "HTTP assertion must include type/assertion/kind."));

const httpConcurrencyCount = z.number().int().min(MIN_HTTP_CONCURRENT_REQUESTS).max(MAX_HTTP_CONCURRENT_REQUESTS);

export const TestAgentHttpConcurrencyAssertionContractSchema = z.object({
  type: z.string().min(1).optional(),
  assertion: z.string().min(1).optional(),
  kind: z.string().min(1).optional(),
  status: z.number().int().min(100).max(599).optional(),
  statusCode: z.number().int().min(100).max(599).optional(),
  status_code: z.number().int().min(100).max(599).optional(),
  path: optionalString,
  jsonPath: optionalString,
  json_path: optionalString,
  count: z.number().int().nonnegative().optional(),
  expectedCount: z.number().int().nonnegative().optional(),
  expected_count: z.number().int().nonnegative().optional(),
  minCount: z.number().int().nonnegative().optional(),
  min_count: z.number().int().nonnegative().optional(),
  maxCount: z.number().int().nonnegative().optional(),
  max_count: z.number().int().nonnegative().optional(),
}).passthrough().superRefine(requireAnyField(
  ["type", "assertion", "kind"],
  "HTTP concurrency assertion must include type/assertion/kind.",
));

export const TestAgentHttpConcurrencyContractSchema = z.union([
  httpConcurrencyCount,
  z.object({
    requests: httpConcurrencyCount.optional(),
    count: httpConcurrencyCount.optional(),
    concurrentRequests: httpConcurrencyCount.optional(),
    concurrent_requests: httpConcurrencyCount.optional(),
    parallelRequests: httpConcurrencyCount.optional(),
    parallel_requests: httpConcurrencyCount.optional(),
    aggregateAssertions: z.array(TestAgentHttpConcurrencyAssertionContractSchema).optional(),
    aggregate_assertions: z.array(TestAgentHttpConcurrencyAssertionContractSchema).optional(),
    assertions: z.array(TestAgentHttpConcurrencyAssertionContractSchema).optional(),
  }).passthrough().superRefine(requireAnyField(
    ["requests", "count", "concurrentRequests", "concurrent_requests", "parallelRequests", "parallel_requests"],
    "HTTP concurrency config must include requests/count.",
  )),
]);

export const TestAgentHttpCheckContractSchema = z.object({
  name: optionalString,
  title: optionalString,
  url: optionalString,
  path: optionalString,
  targetUrl: optionalString,
  target_url: optionalString,
  method: optionalString,
  httpMethod: optionalString,
  http_method: optionalString,
  headers: z.record(primitiveValue).optional(),
  body: z.any().optional(),
  json: z.any().optional(),
  assertions: z.array(TestAgentHttpAssertionContractSchema).optional(),
  expectations: z.array(TestAgentHttpAssertionContractSchema).optional(),
  adversarial: z.boolean().optional(),
  probe: z.boolean().optional(),
  probeType: optionalString,
  probe_type: optionalString,
  coversAcceptanceCriteria: stringList.optional(),
  covers_acceptance_criteria: stringList.optional(),
  acceptanceCriteria: stringList.optional(),
  acceptance_criteria: stringList.optional(),
  context: z.record(z.any()).optional(),
  concurrency: TestAgentHttpConcurrencyContractSchema.optional(),
  concurrentRequests: httpConcurrencyCount.optional(),
  concurrent_requests: httpConcurrencyCount.optional(),
  parallelRequests: httpConcurrencyCount.optional(),
  parallel_requests: httpConcurrencyCount.optional(),
  concurrencyAssertions: z.array(TestAgentHttpConcurrencyAssertionContractSchema).optional(),
  concurrency_assertions: z.array(TestAgentHttpConcurrencyAssertionContractSchema).optional(),
  timeoutMs: timeoutMs,
  timeout_ms: timeoutMs,
}).passthrough().superRefine(requireAnyField(["url", "path", "targetUrl", "target_url"], "HTTP check must include url/path."));

export const TestAgentBrowserActionContractSchema = z.object({
  type: z.string().min(1).optional(),
  action: z.string().min(1).optional(),
  kind: z.string().min(1).optional(),
  selector: optionalString,
  css: optionalString,
  locator: optionalString,
  text: z.any().optional(),
  value: z.any().optional(),
  valueEnv: z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/).optional(),
  value_env: z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/).optional(),
  textEnv: z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/).optional(),
  text_env: z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/).optional(),
  contentEnv: z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/).optional(),
  content_env: z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/).optional(),
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
  exact: z.boolean().optional(),
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
  destinationExact: z.boolean().optional(),
  destination_exact: z.boolean().optional(),
  coordinate: coordinate.optional(),
  coords: coordinate.optional(),
  point: coordinate.optional(),
  startCoordinate: coordinate.optional(),
  start_coordinate: coordinate.optional(),
  direction: z.enum(["up", "down", "left", "right"]).optional(),
  amount: z.number().optional(),
  duration: z.number().optional(),
  region: z.tuple([z.number(), z.number(), z.number(), z.number()]).optional(),
  bundleId: optionalString,
  bundle_id: optionalString,
  apps: z.array(z.object({
    displayName: optionalString,
    display_name: optionalString,
    name: optionalString,
    bundleId: optionalString,
    bundle_id: optionalString,
  }).passthrough()).optional(),
  timeoutMs: timeoutMs,
  timeout_ms: timeoutMs,
  waitUntil: z.enum(["load", "domcontentloaded", "networkidle"]).optional(),
  wait_until: z.enum(["load", "domcontentloaded", "networkidle"]).optional(),
  verifyEffect: z.boolean().optional(),
  verify_effect: z.boolean().optional(),
  expectEffect: z.boolean().optional(),
  expect_effect: z.boolean().optional(),
  effectTimeoutMs: timeoutMs,
  effect_timeout_ms: timeoutMs,
  effectSignals: z.array(z.enum(["url", "title", "page_text", "dom", "network", "dialog", "popup", "download"])).optional(),
  effect_signals: z.array(z.enum(["url", "title", "page_text", "dom", "network", "dialog", "popup", "download"])).optional(),
  effectSession: optionalString,
  effect_session: optionalString,
}).passthrough().superRefine(requireAnyField(["type", "action", "kind"], "Browser action must include type/action/kind."));

export const TestAgentBrowserAssertionContractSchema = z.object({
  type: z.string().min(1).optional(),
  assertion: z.string().min(1).optional(),
  kind: z.string().min(1).optional(),
  selector: optionalString,
  css: optionalString,
  locator: optionalString,
  text: z.any().optional(),
  value: z.any().optional(),
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
  bodyJsonEquals: z.any().optional(),
  body_json_equals: z.any().optional(),
  bodyJsonValue: z.any().optional(),
  body_json_value: z.any().optional(),
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
  texts: z.array(z.any()).optional(),
  values: z.array(z.any()).optional(),
  expectedTexts: z.array(z.any()).optional(),
  expected_texts: z.array(z.any()).optional(),
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
  exact: z.boolean().optional(),
  timeoutMs: timeoutMs,
  timeout_ms: timeoutMs,
  settleMs: timeoutMs,
  settle_ms: timeoutMs,
}).passthrough().superRefine(requireAnyField(["type", "assertion", "kind"], "Browser assertion must include type/assertion/kind."));

const TestAgentBrowserSessionContractSchema = z.object({
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
  setupActions: z.array(TestAgentBrowserActionContractSchema).optional(),
  setup_actions: z.array(TestAgentBrowserActionContractSchema).optional(),
  actions: z.array(TestAgentBrowserActionContractSchema).optional(),
}).passthrough().superRefine((value: Record<string, any>, ctx: z.RefinementCtx) => {
  requireAnyField(["name", "session", "id"], "Browser session must include name/session/id.")(value, ctx);
  rejectInlineBrowserStorageState(value, ctx);
});

const TestAgentBrowserSessionLeafStepContractSchema = z.object({
  session: optionalString,
  sessionName: optionalString,
  session_name: optionalString,
  actor: optionalString,
  action: TestAgentBrowserActionContractSchema.optional(),
  do: TestAgentBrowserActionContractSchema.optional(),
  assertion: TestAgentBrowserAssertionContractSchema.optional(),
  expect: TestAgentBrowserAssertionContractSchema.optional(),
}).passthrough().superRefine((value: Record<string, any>, ctx: z.RefinementCtx) => {
  if (![value.session, value.sessionName, value.session_name, value.actor].some(item => typeof item === "string" && item.trim())) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Browser session step must include session/sessionName/actor.", path: ["session"] });
  }
  const actionCount = Number(Boolean(value.action || value.do));
  const assertionCount = Number(Boolean(value.assertion || value.expect));
  if (actionCount + assertionCount !== 1) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Browser session step must contain exactly one action or assertion.", path: ["action"] });
  }
});

const TestAgentBrowserSessionComparisonContractSchema = z.object({
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
}).passthrough().superRefine((value: Record<string, any>, ctx: z.RefinementCtx) => {
  const left = [value.leftSession, value.left_session, value.left, value.firstSession, value.first_session, value.sourceSession, value.source_session].find(item => typeof item === "string" && item.trim());
  const right = [value.rightSession, value.right_session, value.right, value.secondSession, value.second_session, value.targetSession, value.target_session].find(item => typeof item === "string" && item.trim());
  if (!left) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Browser session comparison must include leftSession.", path: ["leftSession"] });
  if (!right) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Browser session comparison must include rightSession.", path: ["rightSession"] });
  if (left && right && String(left).trim().toLowerCase() === String(right).trim().toLowerCase()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Browser session comparison must reference two distinct sessions.", path: ["rightSession"] });
  }
  const sharedExpression = [value.expression, value.js, value.javascript].some(item => typeof item === "string" && item.trim());
  const leftExpression = [value.leftExpression, value.left_expression, value.leftJs, value.left_js].some(item => typeof item === "string" && item.trim());
  const rightExpression = [value.rightExpression, value.right_expression, value.rightJs, value.right_js].some(item => typeof item === "string" && item.trim());
  if (!sharedExpression && !(leftExpression && rightExpression)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Browser session comparison requires expression or both leftExpression and rightExpression.", path: ["expression"] });
  }
  const operator = String(value.operator || value.relation || value.mode || "equals").replace(/[\s_-]+/g, "").toLowerCase();
  if (!["equal", "equals", "deepequals", "notequal", "notequals", "differs", "include", "includes", "contains"].includes(operator)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Browser session comparison operator must be equals, notEquals, or includes.", path: ["operator"] });
  }
});

const TestAgentBrowserSessionParallelStepContractSchema = z.object({
  parallel: z.array(TestAgentBrowserSessionLeafStepContractSchema).min(2).optional(),
  parallelSteps: z.array(TestAgentBrowserSessionLeafStepContractSchema).min(2).optional(),
  parallel_steps: z.array(TestAgentBrowserSessionLeafStepContractSchema).min(2).optional(),
}).passthrough().superRefine((value: Record<string, any>, ctx: z.RefinementCtx) => {
  if (![value.parallel, value.parallelSteps, value.parallel_steps].some(Array.isArray)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Browser parallel session step must include parallel/parallelSteps.", path: ["parallel"] });
  }
  if (value.session || value.sessionName || value.session_name || value.actor || value.action || value.do || value.assertion || value.expect) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Browser parallel session step cannot also define a session action/assertion.", path: ["parallel"] });
  }
});

const TestAgentBrowserSessionComparisonStepContractSchema = z.object({
  compare: TestAgentBrowserSessionComparisonContractSchema.optional(),
  comparison: TestAgentBrowserSessionComparisonContractSchema.optional(),
  compareSessions: TestAgentBrowserSessionComparisonContractSchema.optional(),
  compare_sessions: TestAgentBrowserSessionComparisonContractSchema.optional(),
  convergence: TestAgentBrowserSessionComparisonContractSchema.optional(),
}).passthrough().superRefine((value: Record<string, any>, ctx: z.RefinementCtx) => {
  if (![value.compare, value.comparison, value.compareSessions, value.compare_sessions, value.convergence].some(item => item && typeof item === "object" && !Array.isArray(item))) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Browser session comparison step must include compare/comparison.", path: ["compare"] });
  }
  if (value.parallel || value.parallelSteps || value.parallel_steps || value.session || value.sessionName || value.session_name || value.actor || value.action || value.do || value.assertion || value.expect) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Browser session comparison step cannot also define parallel or session action/assertion fields.", path: ["compare"] });
  }
});

const TestAgentBrowserSessionStepContractSchema = z.union([
  TestAgentBrowserSessionLeafStepContractSchema,
  TestAgentBrowserSessionParallelStepContractSchema,
  TestAgentBrowserSessionComparisonStepContractSchema,
]);

const TestAgentBrowserAuthenticationConfigContractSchema = z.object({
  mode: z.string().min(1),
  provider: optionalString,
  browserProvider: optionalString,
  browser_provider: optionalString,
  evidencePolicy: optionalString,
  evidence_policy: optionalString,
  artifactPolicy: optionalString,
  artifact_policy: optionalString,
}).passthrough().superRefine((value: Record<string, any>, ctx: z.RefinementCtx) => {
  for (const key of ["credentials", "username", "email", "password", "token", "cookies", "origins", "storageState", "storage_state"]) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Existing-session authentication config must not contain raw credentials or browser state.",
        path: [key],
      });
    }
  }
});

export const TestAgentBrowserCheckContractSchema: z.ZodType<Record<string, any>> = z.object({
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
  actions: z.array(TestAgentBrowserActionContractSchema).optional(),
  steps: z.array(TestAgentBrowserActionContractSchema).optional(),
  assertions: z.array(TestAgentBrowserAssertionContractSchema).optional(),
  expectations: z.array(TestAgentBrowserAssertionContractSchema).optional(),
  sessions: z.array(TestAgentBrowserSessionContractSchema).optional(),
  browserSessions: z.array(TestAgentBrowserSessionContractSchema).optional(),
  browser_sessions: z.array(TestAgentBrowserSessionContractSchema).optional(),
  sessionSteps: z.array(TestAgentBrowserSessionStepContractSchema).optional(),
  session_steps: z.array(TestAgentBrowserSessionStepContractSchema).optional(),
  scenarioSteps: z.array(TestAgentBrowserSessionStepContractSchema).optional(),
  scenario_steps: z.array(TestAgentBrowserSessionStepContractSchema).optional(),
  stabilityRuns: z.number().int().min(1).max(10).optional(),
  stability_runs: z.number().int().min(1).max(10).optional(),
  repeatRuns: z.number().int().min(1).max(10).optional(),
  repeat_runs: z.number().int().min(1).max(10).optional(),
  storageStatePath: optionalString,
  storage_state_path: optionalString,
  authStatePath: optionalString,
  auth_state_path: optionalString,
  screenshot: z.boolean().optional(),
  viewport: z.object({
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional(),
  }).optional(),
  viewportWidth: z.number().int().positive().optional(),
  viewport_width: z.number().int().positive().optional(),
  viewportHeight: z.number().int().positive().optional(),
  viewport_height: z.number().int().positive().optional(),
  isMobile: z.boolean().optional(),
  is_mobile: z.boolean().optional(),
  deviceScaleFactor: z.number().positive().optional(),
  device_scale_factor: z.number().positive().optional(),
  userAgent: optionalString,
  user_agent: optionalString,
  adversarial: z.boolean().optional(),
  probe: z.boolean().optional(),
  probeType: optionalString,
  probe_type: optionalString,
  coversAcceptanceCriteria: stringList.optional(),
  covers_acceptance_criteria: stringList.optional(),
  acceptanceCriteria: stringList.optional(),
  acceptance_criteria: stringList.optional(),
  context: z.record(z.any()).optional(),
  timeoutMs: timeoutMs,
  timeout_ms: timeoutMs,
}).passthrough().superRefine(rejectInlineBrowserStorageState);

const TestAgentBrowserProbeTemplateFieldContractSchema = z.object({
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
  text: z.any().optional(),
  value: z.any().optional(),
  exact: z.boolean().optional(),
}).passthrough();

export const TestAgentBrowserProbeTemplateContractSchema: z.ZodTypeAny = z.object({
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
  screenshot: z.boolean().optional(),
  fields: z.array(TestAgentBrowserProbeTemplateFieldContractSchema).optional(),
  submit: z.record(z.any()).optional(),
  target: z.record(z.any()).optional(),
  repeat: z.number().int().positive().optional(),
  expectedText: optionalString,
  expected_text: optionalString,
  expectedUrlIncludes: optionalString,
  expected_url_includes: optionalString,
  setupActions: z.array(TestAgentBrowserActionContractSchema).optional(),
  setup_actions: z.array(TestAgentBrowserActionContractSchema).optional(),
  actions: z.array(TestAgentBrowserActionContractSchema).optional(),
  assertions: z.array(TestAgentBrowserAssertionContractSchema).optional(),
  expectations: z.array(TestAgentBrowserAssertionContractSchema).optional(),
  stateAssertions: z.array(TestAgentBrowserAssertionContractSchema).optional(),
  state_assertions: z.array(TestAgentBrowserAssertionContractSchema).optional(),
  coversAcceptanceCriteria: stringList.optional(),
  covers_acceptance_criteria: stringList.optional(),
  acceptanceCriteria: stringList.optional(),
  acceptance_criteria: stringList.optional(),
  context: z.record(z.any()).optional(),
}).passthrough().superRefine(requireAnyField(["kind", "type", "template"], "Browser probe template must include kind/type/template."));

export const TestAgentProjectTargetContractSchema: z.ZodTypeAny = z.object({
  name: z.string().min(1),
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
  env: z.record(primitiveValue).optional(),
  changedFiles: stringList.optional(),
  changed_files: stringList.optional(),
  verificationCommands: stringList.optional(),
  verification_commands: stringList.optional(),
  httpChecks: z.array(TestAgentHttpCheckContractSchema).optional(),
  http_checks: z.array(TestAgentHttpCheckContractSchema).optional(),
  apiChecks: z.array(TestAgentHttpCheckContractSchema).optional(),
  api_checks: z.array(TestAgentHttpCheckContractSchema).optional(),
  adversarialHttpChecks: z.array(TestAgentHttpCheckContractSchema).optional(),
  adversarial_http_checks: z.array(TestAgentHttpCheckContractSchema).optional(),
  adversarialApiChecks: z.array(TestAgentHttpCheckContractSchema).optional(),
  adversarial_api_checks: z.array(TestAgentHttpCheckContractSchema).optional(),
  adversarialBrowserChecks: z.array(TestAgentBrowserCheckContractSchema).optional(),
  adversarial_browser_checks: z.array(TestAgentBrowserCheckContractSchema).optional(),
  adversarialBrowserProbeTemplates: z.array(TestAgentBrowserProbeTemplateContractSchema).optional(),
  adversarial_browser_probe_templates: z.array(TestAgentBrowserProbeTemplateContractSchema).optional(),
  browserChecks: z.array(TestAgentBrowserCheckContractSchema).optional(),
  browser_checks: z.array(TestAgentBrowserCheckContractSchema).optional(),
  agentSummary: optionalString,
  agent_summary: optionalString,
  risks: stringList.optional(),
}).passthrough();

export const TestAgentHandoffProjectContractSchema: z.ZodTypeAny = z.object({
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
  env: z.record(primitiveValue).optional(),
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
  httpChecks: z.array(TestAgentHttpCheckContractSchema).optional(),
  http_checks: z.array(TestAgentHttpCheckContractSchema).optional(),
  apiChecks: z.array(TestAgentHttpCheckContractSchema).optional(),
  api_checks: z.array(TestAgentHttpCheckContractSchema).optional(),
  adversarialHttpChecks: z.array(TestAgentHttpCheckContractSchema).optional(),
  adversarial_http_checks: z.array(TestAgentHttpCheckContractSchema).optional(),
  adversarialApiChecks: z.array(TestAgentHttpCheckContractSchema).optional(),
  adversarial_api_checks: z.array(TestAgentHttpCheckContractSchema).optional(),
  adversarialBrowserChecks: z.array(TestAgentBrowserCheckContractSchema).optional(),
  adversarial_browser_checks: z.array(TestAgentBrowserCheckContractSchema).optional(),
  adversarialBrowserProbeTemplates: z.array(TestAgentBrowserProbeTemplateContractSchema).optional(),
  adversarial_browser_probe_templates: z.array(TestAgentBrowserProbeTemplateContractSchema).optional(),
  browserChecks: z.array(TestAgentBrowserCheckContractSchema).optional(),
  browser_checks: z.array(TestAgentBrowserCheckContractSchema).optional(),
  agentSummary: optionalString,
  agent_summary: optionalString,
  risks: stringList.optional(),
}).passthrough();

export const TestAgentHandoffContractSchema: z.ZodTypeAny = z.object({
  schema: z.literal(TEST_AGENT_CONTRACT_IDS.handoff).optional(),
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
  projects: z.array(TestAgentHandoffProjectContractSchema).optional(),
  project: TestAgentHandoffProjectContractSchema.optional(),
  options: TestAgentOptionsContractSchema.optional(),
  metadata: z.record(z.any()).optional(),
  completedByProjectAgents: stringList.optional(),
  completed_by_project_agents: stringList.optional(),
}).passthrough().superRefine((value: Record<string, any>, ctx: z.RefinementCtx) => {
  const projects = Array.isArray(value.projects) ? value.projects : [];
  if (!projects.length && !value.project) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Handoff must include projects array or project object.",
      path: ["projects"],
    });
  }
});

export const TestAgentWorkOrderContractSchema: z.ZodTypeAny = z.object({
  schema: z.literal(TEST_AGENT_CONTRACT_IDS.workOrder).optional(),
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
  projects: z.array(TestAgentProjectTargetContractSchema).min(1, "Work order must include at least one project target."),
  options: TestAgentOptionsContractSchema.optional(),
  metadata: z.record(z.any()).optional(),
}).passthrough();

const agentStatus = z.enum(["passed", "failed", "blocked", "partial"]);
const resultStatus = z.enum(["passed", "failed", "blocked", "skipped", "timed_out", "started", "already_running"]);

const httpAssertionResultSchema = z.object({
  name: z.string(),
  status: z.enum(["passed", "failed", "skipped"]),
  detail: optionalString,
  error: optionalString,
}).passthrough();

const httpConcurrencyAssertionSpecSchema = z.object({
  type: z.enum(["responseCount", "statusCount", "jsonPathUniqueCount", "jsonPathAllEqual"]),
  status: z.number().int().min(100).max(599).optional(),
  statusCode: z.number().int().min(100).max(599).optional(),
  status_code: z.number().int().min(100).max(599).optional(),
  path: optionalString,
  count: z.number().int().nonnegative().optional(),
  expectedCount: z.number().int().nonnegative().optional(),
  expected_count: z.number().int().nonnegative().optional(),
  minCount: z.number().int().nonnegative().optional(),
  min_count: z.number().int().nonnegative().optional(),
  maxCount: z.number().int().nonnegative().optional(),
  max_count: z.number().int().nonnegative().optional(),
}).passthrough();

const httpConcurrencyValueEvidenceSchema = z.object({
  path: z.string().min(1),
  present: z.boolean(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/i).optional(),
  serializedBytes: z.number().int().nonnegative().optional(),
}).passthrough();

const httpConcurrentRequestResultSchema = z.object({
  requestIndex: z.number().int().nonnegative(),
  requestNumber: z.number().int().positive(),
  url: z.string(),
  method: z.string(),
  status: z.enum(["passed", "failed", "blocked"]),
  statusCode: z.number().int().nullable(),
  contentType: z.string(),
  startedAt: z.string(),
  finishedAt: z.string(),
  durationMs: z.number().nonnegative(),
  assertions: z.array(httpAssertionResultSchema),
  aggregateValues: z.array(httpConcurrencyValueEvidenceSchema),
  responsePreview: optionalString,
  error: optionalString,
}).passthrough();

const httpConcurrencyEvidenceSchema = z.object({
  requested: z.number().int().min(MIN_HTTP_CONCURRENT_REQUESTS).max(MAX_HTTP_CONCURRENT_REQUESTS),
  completed: z.number().int().nonnegative(),
  passed: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  blocked: z.number().int().nonnegative(),
  launchSpreadMs: z.number().nonnegative(),
  maxInFlight: z.number().int().nonnegative(),
  overlapObserved: z.boolean(),
  assertionSpecs: z.array(httpConcurrencyAssertionSpecSchema),
  aggregateAssertions: z.array(httpAssertionResultSchema),
  requests: z.array(httpConcurrentRequestResultSchema),
}).passthrough();

const httpCheckResultSchema = z.object({
  project: z.string(),
  name: optionalString,
  url: z.string(),
  method: optionalString,
  status: z.enum(["passed", "failed", "blocked", "skipped"]),
  statusCode: z.number().int().nullable(),
  contentType: z.string(),
  startedAt: z.string(),
  finishedAt: z.string(),
  durationMs: z.number().nonnegative(),
  resourceChecks: z.array(z.object({
    url: z.string(),
    status: z.enum(["passed", "failed", "blocked", "skipped"]),
    statusCode: z.number().int().nullable(),
    contentType: z.string(),
    kind: z.enum(["script", "stylesheet", "image", "font", "media", "document", "manifest", "other"]).optional(),
    source: optionalString,
    discoveredFrom: optionalString,
    finalUrl: optionalString,
    redirectCount: z.number().int().nonnegative().optional(),
    expectedContentTypes: stringList.optional(),
    contentTypeMatched: z.boolean().optional(),
    error: optionalString,
  }).passthrough()),
  assertions: z.array(httpAssertionResultSchema).optional(),
  responsePreview: optionalString,
  adversarial: z.boolean().optional(),
  probeType: optionalString,
  context: z.record(z.any()).optional(),
  concurrency: httpConcurrencyEvidenceSchema.optional(),
  error: optionalString,
}).passthrough();

const httpConcurrencySummaryItemSchema = z.object({
  project: z.string(),
  name: z.string(),
  status: z.enum(["passed", "failed", "blocked", "skipped"]),
  probeType: optionalString,
  requested: z.number().int().nonnegative(),
  completed: z.number().int().nonnegative(),
  passed: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  blocked: z.number().int().nonnegative(),
  launchSpreadMs: z.number().nonnegative(),
  maxInFlight: z.number().int().nonnegative(),
  overlapObserved: z.boolean(),
  aggregatePassed: z.number().int().nonnegative(),
  aggregateFailed: z.number().int().nonnegative(),
  aggregateSkipped: z.number().int().nonnegative(),
}).passthrough();

const httpConcurrencySummarySchema = z.object({
  checks: z.number().int().nonnegative(),
  requests: z.number().int().nonnegative(),
  completed: z.number().int().nonnegative(),
  passed: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  blocked: z.number().int().nonnegative(),
  maxInFlight: z.number().int().nonnegative(),
  items: z.array(httpConcurrencySummaryItemSchema),
}).passthrough();

const evidenceSchema = z.object({
  type: z.string().min(1),
  project: optionalString,
  title: z.string().min(1),
  status: z.string().min(1),
  detail: optionalString,
  path: optionalString,
}).passthrough();

const requiredCheckCoverageSchema = z.object({
  check: z.string(),
  status: z.enum(["verified", "not_verified", "unknown"]),
  evidence: stringList,
  missingReason: optionalString,
}).passthrough();

const requiredCheckSummaryItemSchema = z.object({
  check: z.string(),
  status: z.enum(["verified", "not_verified", "unknown"]),
  evidence: stringList,
  missingReason: optionalString,
}).passthrough();

const requiredCheckSummarySchema = z.object({
  total: z.number().int().nonnegative(),
  statusCounts: z.object({
    verified: z.number().int().nonnegative(),
    not_verified: z.number().int().nonnegative(),
    unknown: z.number().int().nonnegative(),
  }).passthrough(),
  verified: z.array(requiredCheckSummaryItemSchema),
  notVerified: z.array(requiredCheckSummaryItemSchema),
  unknown: z.array(requiredCheckSummaryItemSchema),
}).passthrough();

const adversarialEvidenceSummaryItemSchema = z.object({
  project: z.string(),
  surface: z.enum(["http", "browser"]),
  name: z.string(),
  target: z.string(),
  status: z.enum(["passed", "failed", "blocked", "skipped"]),
  probeType: optionalString,
  provider: z.enum(["playwright", "mcp", "none"]).optional(),
  relevance: z.enum(["explicit", "inferred", "none"]),
  linkedCriteria: stringList,
  goalLinked: z.boolean(),
  matchScore: z.number().min(0).max(1),
}).passthrough();

const adversarialEvidenceSummarySchema = z.object({
  required: z.boolean(),
  waived: z.boolean(),
  waiverReason: optionalString,
  status: z.enum(["verified", "failed", "blocked", "missing", "unlinked", "waived"]),
  total: z.number().int().nonnegative(),
  passed: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  blocked: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
  http: z.number().int().nonnegative(),
  browser: z.number().int().nonnegative(),
  relevant: z.number().int().nonnegative(),
  unlinked: z.number().int().nonnegative(),
  passedRelevant: z.number().int().nonnegative(),
  goalLinked: z.number().int().nonnegative(),
  criteriaCovered: stringList,
  probeTypes: stringList,
  items: z.array(adversarialEvidenceSummaryItemSchema),
}).passthrough();

const acceptanceCoverageSchema = z.object({
  criterion: z.string(),
  status: z.enum(["verified", "not_verified", "unknown"]),
  evidence: stringList,
  matchStrength: z.enum(["direct", "token", "fallback", "none"]).optional(),
  matchScore: z.number().optional(),
  evidenceSource: z.enum(["matched_evidence", "single_criterion_report_status", "none"]).optional(),
}).passthrough();

const acceptanceEvidenceGateSummarySchema = z.object({
  status: z.enum(["verified", "failed", "incomplete", "weak", "not_applicable"]),
  canAccept: z.boolean(),
  total: z.number().int().nonnegative(),
  verified: z.number().int().nonnegative(),
  notVerified: z.number().int().nonnegative(),
  unknown: z.number().int().nonnegative(),
  matchedEvidence: z.number().int().nonnegative(),
  fallbackEvidence: z.number().int().nonnegative(),
  missingEvidence: z.number().int().nonnegative(),
  direct: z.number().int().nonnegative(),
  token: z.number().int().nonnegative(),
  fallback: z.number().int().nonnegative(),
  none: z.number().int().nonnegative(),
  failedCriteria: stringList,
  incompleteCriteria: stringList,
  weakCriteria: stringList,
}).passthrough();

const acceptanceSummaryItemSchema = z.object({
  criterion: z.string(),
  status: z.enum(["verified", "not_verified", "unknown"]),
  evidence: stringList,
  matchStrength: z.enum(["direct", "token", "fallback", "none"]).optional(),
  matchScore: z.number().optional(),
  evidenceSource: z.enum(["matched_evidence", "single_criterion_report_status", "none"]).optional(),
}).passthrough();

const acceptanceSummarySchema = z.object({
  total: z.number().int().nonnegative(),
  statusCounts: z.object({
    verified: z.number().int().nonnegative(),
    not_verified: z.number().int().nonnegative(),
    unknown: z.number().int().nonnegative(),
  }).passthrough(),
  matchStrengthCounts: z.object({
    direct: z.number().int().nonnegative(),
    token: z.number().int().nonnegative(),
    fallback: z.number().int().nonnegative(),
    none: z.number().int().nonnegative(),
  }).passthrough(),
  evidenceSourceCounts: z.object({
    matched_evidence: z.number().int().nonnegative(),
    single_criterion_report_status: z.number().int().nonnegative(),
    none: z.number().int().nonnegative(),
  }).passthrough(),
  verified: z.array(acceptanceSummaryItemSchema),
  notVerified: z.array(acceptanceSummaryItemSchema),
  unknown: z.array(acceptanceSummaryItemSchema),
}).passthrough();

const browserNetworkSummarySchema = z.object({
  project: z.string(),
  name: z.string(),
  provider: optionalString,
  status: z.string(),
  url: z.string(),
  finalUrl: optionalString,
  requestCount: z.number(),
  responseCount: z.number(),
  failedRequestCount: z.number(),
  failedResponseCount: z.number(),
  errorCount: z.number(),
  statusCodes: z.record(z.number()),
  resourceTypes: z.record(z.number()),
  failureKinds: z.record(z.number()),
  failedUrls: stringList,
  errors: stringList,
  networkLogPath: optionalString,
}).passthrough();

const browserInteractionSummaryStepSchema = z.object({
  kind: z.enum(["action", "assertion"]),
  name: z.string(),
  status: z.enum(["passed", "failed", "skipped"]),
  detail: optionalString,
  error: optionalString,
}).passthrough();

const browserInteractionSummarySchema = z.object({
  project: z.string(),
  name: z.string(),
  provider: optionalString,
  status: z.string(),
  url: z.string(),
  finalUrl: optionalString,
  probeType: optionalString,
  actionCount: z.number(),
  assertionCount: z.number(),
  passedActions: z.number(),
  failedActions: z.number(),
  passedAssertions: z.number(),
  failedAssertions: z.number(),
  actionTypes: z.record(z.number()),
  assertionTypes: z.record(z.number()),
  actionSteps: z.array(browserInteractionSummaryStepSchema),
  failedSteps: z.array(browserInteractionSummaryStepSchema),
}).passthrough();

const browserFlowSummaryFailureSchema = z.object({
  project: z.string(),
  name: z.string(),
  status: z.enum(["passed", "failed", "blocked", "skipped"]),
  error: optionalString,
  failedSteps: stringList,
}).passthrough();

const browserFlowStatusCountsSchema = z.object({
  passed: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  blocked: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
});

const browserFlowSummaryItemSchema = z.object({
  flowType: z.string(),
  total: z.number().int().nonnegative(),
  statusCounts: browserFlowStatusCountsSchema,
  criteriaCount: z.number().int().nonnegative(),
  criteria: stringList,
  projects: stringList,
  providers: stringList,
  actionCount: z.number().int().nonnegative(),
  assertionCount: z.number().int().nonnegative(),
  failedStepCount: z.number().int().nonnegative(),
  failures: z.array(browserFlowSummaryFailureSchema),
}).passthrough();

const browserFlowSummarySchema = z.object({
  total: z.number().int().nonnegative(),
  statusCounts: browserFlowStatusCountsSchema,
  flowTypeCount: z.number().int().nonnegative(),
  criteriaCount: z.number().int().nonnegative(),
  actionCount: z.number().int().nonnegative(),
  assertionCount: z.number().int().nonnegative(),
  failedStepCount: z.number().int().nonnegative(),
  items: z.array(browserFlowSummaryItemSchema),
}).passthrough();

const browserMultiSessionSummarySessionSchema = z.object({
  name: z.string().min(1),
  url: z.string(),
  finalUrl: optionalString,
  screenshotCount: z.number().int().nonnegative(),
  consoleErrorCount: z.number().int().nonnegative(),
  pageErrorCount: z.number().int().nonnegative(),
  networkErrorCount: z.number().int().nonnegative(),
}).passthrough();

const browserMultiSessionSummaryItemSchema = z.object({
  project: z.string(),
  name: z.string(),
  provider: optionalString,
  status: resultStatus,
  probeType: optionalString,
  sessionCount: z.number().int().nonnegative(),
  sessionNames: stringList,
  sessions: z.array(browserMultiSessionSummarySessionSchema),
  parallelGroupCount: z.number().int().nonnegative(),
  comparisonCount: z.number().int().nonnegative(),
  failedComparisonCount: z.number().int().nonnegative(),
  actionCount: z.number().int().nonnegative(),
  assertionCount: z.number().int().nonnegative(),
  failedStepCount: z.number().int().nonnegative(),
  screenshotCount: z.number().int().nonnegative(),
  consoleErrorCount: z.number().int().nonnegative(),
  pageErrorCount: z.number().int().nonnegative(),
  networkErrorCount: z.number().int().nonnegative(),
  failedSessionNames: stringList,
  failedSteps: stringList,
}).passthrough();

const browserMultiSessionSummarySchema = z.object({
  total: z.number().int().nonnegative(),
  statusCounts: browserFlowStatusCountsSchema,
  sessionCount: z.number().int().nonnegative(),
  uniqueSessionCount: z.number().int().nonnegative(),
  sessionNames: stringList,
  parallelGroupCount: z.number().int().nonnegative(),
  comparisonCount: z.number().int().nonnegative(),
  failedComparisonCount: z.number().int().nonnegative(),
  actionCount: z.number().int().nonnegative(),
  assertionCount: z.number().int().nonnegative(),
  failedStepCount: z.number().int().nonnegative(),
  screenshotCount: z.number().int().nonnegative(),
  consoleErrorCount: z.number().int().nonnegative(),
  pageErrorCount: z.number().int().nonnegative(),
  networkErrorCount: z.number().int().nonnegative(),
  items: z.array(browserMultiSessionSummaryItemSchema),
}).passthrough();

const browserStabilityStatusCountsSchema = z.object({
  stable_pass: z.number().int().nonnegative(),
  stable_fail: z.number().int().nonnegative(),
  flaky: z.number().int().nonnegative(),
  blocked: z.number().int().nonnegative(),
});

const browserStabilitySummaryItemSchema = z.object({
  groupId: z.string().min(1),
  project: z.string(),
  name: z.string(),
  provider: optionalString,
  probeType: optionalString,
  expectedRuns: z.number().int().min(2).max(10),
  runCount: z.number().int().nonnegative(),
  status: z.enum(["stable_pass", "stable_fail", "flaky", "blocked"]),
  statusCounts: browserFlowStatusCountsSchema,
  failedRuns: z.array(z.number().int().positive()),
  blockedRuns: z.array(z.number().int().positive()),
  skippedRuns: z.array(z.number().int().positive()),
  durationMs: z.number().nonnegative(),
  screenshotCount: z.number().int().nonnegative(),
  firstFailure: optionalString,
}).passthrough();

const browserStabilitySummarySchema = z.object({
  total: z.number().int().nonnegative(),
  statusCounts: browserStabilityStatusCountsSchema,
  expectedRunCount: z.number().int().nonnegative(),
  runCount: z.number().int().nonnegative(),
  passedRunCount: z.number().int().nonnegative(),
  failedRunCount: z.number().int().nonnegative(),
  blockedRunCount: z.number().int().nonnegative(),
  skippedRunCount: z.number().int().nonnegative(),
  screenshotCount: z.number().int().nonnegative(),
  items: z.array(browserStabilitySummaryItemSchema),
}).passthrough();

const browserCheckExecutionIdentitySchema = z.object({
  checkId: z.string().min(1),
  projectIndex: z.number().int().nonnegative(),
  checkIndex: z.number().int().nonnegative(),
  run: z.number().int().positive(),
  expectedRuns: z.number().int().positive(),
  evidence: z.enum(["provider", "synthetic_missing"]),
}).strict();

const browserCheckExecutionPlanItemSchema = z.object({
  checkId: z.string().min(1),
  project: z.string().min(1),
  projectIndex: z.number().int().nonnegative(),
  checkIndex: z.number().int().nonnegative(),
  name: z.string().min(1),
  url: z.string(),
  expectedRuns: z.number().int().positive(),
  plannedProvider: z.enum(["playwright", "mcp", "none"]),
  providerRoutingReason: z.string().min(1),
  adversarial: z.boolean(),
  probeType: optionalString,
}).strict();

const browserCheckExecutionPlanSchema = z.object({
  schema: z.literal("ccm-test-agent-browser-execution-plan-v1"),
  preferredProvider: z.string().min(1),
  plannedCheckCount: z.number().int().nonnegative(),
  expectedRunCount: z.number().int().nonnegative(),
  items: z.array(browserCheckExecutionPlanItemSchema),
}).strict();

const browserCheckExecutionCoverageItemSchema = z.object({
  checkId: z.string().min(1),
  project: z.string(),
  name: z.string(),
  plannedProvider: z.enum(["playwright", "mcp", "none"]),
  expectedRuns: z.number().int().positive(),
  observedRuns: z.array(z.number().int().positive()),
  missingRuns: z.array(z.number().int().positive()),
  duplicateRuns: z.array(z.number().int().positive()),
  syntheticBlockedRuns: z.array(z.number().int().positive()),
  status: z.enum(["complete", "incomplete", "invalid"]),
}).strict();

const browserCheckExecutionCoverageSchema = z.object({
  status: z.enum(["complete", "incomplete", "invalid"]),
  plannedCheckCount: z.number().int().nonnegative(),
  expectedRunCount: z.number().int().nonnegative(),
  coveredRunCount: z.number().int().nonnegative(),
  missingRunCount: z.number().int().nonnegative(),
  providerResultCount: z.number().int().nonnegative(),
  duplicateResultCount: z.number().int().nonnegative(),
  invalidResultCount: z.number().int().nonnegative(),
  diagnosticResultCount: z.number().int().nonnegative(),
  syntheticBlockedCount: z.number().int().nonnegative(),
  statusCounts: z.object({
    complete: z.number().int().nonnegative(),
    incomplete: z.number().int().nonnegative(),
    invalid: z.number().int().nonnegative(),
  }).strict(),
  items: z.array(browserCheckExecutionCoverageItemSchema),
}).strict();

const browserProviderGapSchema = z.object({
  provider: z.string(),
  project: optionalString,
  check: z.string(),
  kind: z.enum(["action", "assertion", "provider"]),
  step: optionalString,
  category: z.enum(["unsupported_action", "unsupported_assertion", "missing_tool", "provider_unavailable", "provider_capability_gap"]),
  reason: z.string(),
  recommendation: z.string(),
}).passthrough();

const browserProviderSummaryItemSchema = z.object({
  provider: z.string(),
  label: optionalString,
  preferred: z.boolean(),
  available: z.boolean(),
  selected: z.boolean(),
  attempted: z.boolean(),
  resultCount: z.number().int().nonnegative(),
  passed: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  blocked: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
  reason: optionalString,
  tools: stringList.optional(),
  diagnostics: z.record(z.any()).optional(),
}).passthrough();

const browserProviderSummarySchema = z.object({
  preferred: z.string(),
  status: z.enum(["not_required", "provider_none", "ready", "used", "blocked", "unavailable"]),
  selectedProvider: optionalString,
  selectedProviders: stringList.optional(),
  availableProviders: stringList,
  attemptedProviders: stringList,
  fallbackUsed: z.boolean(),
  items: z.array(browserProviderSummaryItemSchema),
}).passthrough();

const failureSummarySchema = z.object({
  type: z.enum(["issue", "server", "command", "http", "browser", "required_check", "acceptance"]),
  project: optionalString,
  title: z.string(),
  status: z.enum(["failed", "blocked", "not_verified", "unknown"]),
  reason: z.string(),
  evidence: stringList.optional(),
  nextAction: optionalString,
  diagnostics: stringList.optional(),
}).passthrough();

const browserStorageStateEvidenceSchema = z.object({
  source: z.literal("file"),
  fileName: z.string().min(1).refine(value => !/[\\/]/.test(value), "Storage-state fileName must be a base file name."),
  sizeBytes: z.number().int().nonnegative(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/i),
  cookieCount: z.number().int().nonnegative(),
  originCount: z.number().int().nonnegative(),
}).passthrough().superRefine((value: Record<string, any>, ctx: z.RefinementCtx) => {
  for (const key of ["path", "cookies", "origins", "value", "values", "token", "password", "username"]) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Browser storage-state evidence must not contain raw authentication state.", path: [key] });
    }
  }
});

const browserAuthenticationEvidenceSchema = z.object({
  credentialEnvNames: z.array(z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/)),
  mode: z.enum(["managed", "existing_session"]).optional(),
  storageState: browserStorageStateEvidenceSchema.optional(),
  existingSession: z.object({
    provider: z.enum(["claude-in-chrome", "chrome-devtools"]),
    evidencePolicy: z.enum(["minimal", "full"]),
    tabContextChecked: z.boolean(),
    tabCount: z.number().int().nonnegative().optional(),
    createdNewTab: z.boolean(),
    pageTextObserved: z.boolean(),
    consoleMessageCount: z.number().int().nonnegative(),
    networkRequestCount: z.number().int().nonnegative(),
    screenshotSuppressed: z.boolean().optional(),
    transcriptDetailsSuppressed: z.boolean().optional(),
  }).passthrough().superRefine((value: Record<string, any>, ctx: z.RefinementCtx) => {
    for (const key of ["tabId", "tab_id", "url", "urls", "title", "titles", "pageText", "page_text", "consoleMessages", "networkRequests"]) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Existing-session evidence must not contain raw tab or page data.",
          path: [key],
        });
      }
    }
  }).optional(),
  sensitiveArtifactsSuppressed: z.boolean().optional(),
}).passthrough().superRefine((value: Record<string, any>, ctx: z.RefinementCtx) => {
  const names = Array.isArray(value.credentialEnvNames) ? value.credentialEnvNames : [];
  if (new Set(names).size !== names.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Browser authentication credentialEnvNames must not contain duplicates.", path: ["credentialEnvNames"] });
  }
  for (const key of ["path", "cookies", "origins", "value", "values", "token", "password", "username"]) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Browser authentication evidence must not contain raw credentials or authentication state.", path: [key] });
    }
  }
  if (value.mode === "existing_session") {
    if (!value.existingSession) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Existing-session authentication evidence requires existingSession metadata.", path: ["existingSession"] });
    if (value.storageState) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Existing-session authentication evidence cannot contain storageState metadata.", path: ["storageState"] });
    if (Array.isArray(value.credentialEnvNames) && value.credentialEnvNames.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Existing-session authentication evidence cannot contain credential environment names.", path: ["credentialEnvNames"] });
    }
  }
  if (value.mode === "managed" && value.existingSession) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Managed authentication evidence cannot contain existingSession metadata.", path: ["existingSession"] });
  }
});

const browserSessionResultSchema = z.object({
  name: z.string().min(1),
  url: z.string(),
  finalUrl: optionalString,
  title: optionalString,
  pageTextPreview: optionalString,
  screenshots: stringList,
  pageSnapshots: stringList.optional(),
  browserArtifacts: z.array(z.object({
    type: z.string().min(1),
    title: z.string().min(1),
    path: z.string(),
  }).passthrough()).optional(),
  consoleErrors: stringList,
  pageErrors: stringList,
  networkErrors: stringList,
  consoleLogPath: optionalString,
  networkLogPath: optionalString,
  authentication: browserAuthenticationEvidenceSchema.optional(),
}).passthrough();

const browserSessionComparisonValueSummarySchema = z.object({
  type: z.string(),
  length: z.number().int().nonnegative().optional(),
  serializedBytes: z.number().int().nonnegative(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/i),
}).passthrough().superRefine((value: Record<string, any>, ctx: z.RefinementCtx) => {
  for (const key of ["value", "values", "rawValue", "raw_value", "rawValues", "raw_values", "actual", "expected"]) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Browser session comparison summaries must not contain raw compared values.", path: [key] });
    }
  }
});

const browserSessionComparisonResultSchema = z.object({
  leftSession: z.string().min(1),
  rightSession: z.string().min(1),
  operator: z.enum(["equals", "notEquals", "includes"]),
  status: z.enum(["passed", "failed"]),
  attempts: z.number().int().positive(),
  durationMs: z.number().nonnegative(),
  timeoutMs: z.number().positive(),
  pollMs: z.number().positive(),
  left: browserSessionComparisonValueSummarySchema.optional(),
  right: browserSessionComparisonValueSummarySchema.optional(),
  evaluationErrors: z.object({
    left: optionalString,
    right: optionalString,
  }).passthrough().optional(),
  error: optionalString,
}).passthrough().superRefine((value: Record<string, any>, ctx: z.RefinementCtx) => {
  for (const key of ["value", "values", "rawValue", "raw_value", "rawValues", "raw_values", "leftValue", "left_value", "rightValue", "right_value", "actual", "expected"]) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Browser session comparison results must not contain raw compared values.", path: [key] });
    }
  }
});

const browserRecoveryEventSchema = z.object({
  provider: z.enum(["claude-in-chrome", "chrome-devtools"]),
  operation: z.string().regex(/^[A-Za-z0-9:_-]+$/),
  trigger: z.enum(["stale_tab", "navigation_context_lost", "transport_disconnected"]),
  retrySafe: z.boolean(),
  status: z.enum(["recovered", "not_retried", "failed"]),
  contextRefreshed: z.boolean(),
  createdNewTab: z.boolean(),
  attempt: z.number().int().positive(),
}).passthrough().superRefine((value: Record<string, any>, ctx: z.RefinementCtx) => {
  for (const key of ["error", "message", "reason", "tabId", "tab_id", "pageId", "page_id", "url", "title", "rawError", "raw_error"]) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Browser recovery events must not contain raw provider, tab, page, or URL detail.",
        path: [key],
      });
    }
  }
  const forbiddenPaths = browserRecoveryForbiddenDetailPaths(value);
  if (forbiddenPaths.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Browser recovery events contain forbidden raw browser detail at ${forbiddenPaths.join(", ")}.`,
      path: ["operation"],
    });
  }
  const retrySafe = browserRecoveryOperationIsSafe(String(value.operation || ""));
  if (value.retrySafe !== retrySafe) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Browser recovery retrySafe must match the operation replay policy.",
      path: ["retrySafe"],
    });
  }
  if ((value.status === "recovered" || value.status === "failed") && !retrySafe) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Only safe browser operations may be recovered or fail after a recovery retry.",
      path: ["status"],
    });
  }
  if (value.status === "recovered" && (!value.retrySafe || !value.contextRefreshed || !value.createdNewTab)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Recovered browser operations must be safe to retry and prove context refresh plus new-tab creation.",
      path: ["status"],
    });
  }
  if (value.status === "not_retried" && value.retrySafe) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "A not-retried browser operation must be marked unsafe to retry.",
      path: ["retrySafe"],
    });
  }
});

const browserRecoveryEvidenceSchema = z.object({
  maxAttempts: z.number().int().min(1).max(3),
  attempted: z.number().int().nonnegative(),
  recovered: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  notRetried: z.number().int().nonnegative(),
  events: z.array(browserRecoveryEventSchema),
}).passthrough().superRefine((value: Record<string, any>, ctx: z.RefinementCtx) => {
  const events = Array.isArray(value.events) ? value.events : [];
  const counts = {
    recovered: events.filter(event => event.status === "recovered").length,
    failed: events.filter(event => event.status === "failed").length,
    notRetried: events.filter(event => event.status === "not_retried").length,
  };
  if (value.attempted !== events.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Browser recovery attempted count must match events.", path: ["attempted"] });
  }
  for (const key of ["recovered", "failed", "notRetried"] as const) {
    if (value[key] !== counts[key]) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Browser recovery ${key} count must match events.`, path: [key] });
    }
  }
  if (events.some(event => Number(event.attempt || 0) > Number(value.maxAttempts || 0))) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Browser recovery event attempt exceeds maxAttempts.", path: ["events"] });
  }
  const forbiddenPaths = browserRecoveryForbiddenDetailPaths({
    ...value,
    events: undefined,
  });
  if (forbiddenPaths.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Browser recovery evidence contains forbidden raw browser detail at ${forbiddenPaths.join(", ")}.`,
      path: ["events"],
    });
  }
});

const browserRecoverySummarySchema = z.object({
  checks: z.number().int().nonnegative(),
  attempted: z.number().int().nonnegative(),
  recovered: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  notRetried: z.number().int().nonnegative(),
  items: z.array(z.object({
    project: z.string(),
    name: z.string(),
    provider: z.enum(["playwright", "mcp", "none"]).optional(),
    status: resultStatus,
    attempted: z.number().int().nonnegative(),
    recovered: z.number().int().nonnegative(),
    failed: z.number().int().nonnegative(),
    notRetried: z.number().int().nonnegative(),
    events: z.array(browserRecoveryEventSchema),
  }).passthrough()),
}).passthrough().superRefine((value: Record<string, any>, ctx: z.RefinementCtx) => {
  const items = Array.isArray(value.items) ? value.items : [];
  const totals = {
    attempted: items.reduce((sum, item) => sum + Number(item?.attempted || 0), 0),
    recovered: items.reduce((sum, item) => sum + Number(item?.recovered || 0), 0),
    failed: items.reduce((sum, item) => sum + Number(item?.failed || 0), 0),
    notRetried: items.reduce((sum, item) => sum + Number(item?.notRetried || 0), 0),
  };
  if (value.checks !== items.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Browser recovery summary checks must match items.", path: ["checks"] });
  }
  for (const key of ["attempted", "recovered", "failed", "notRetried"] as const) {
    if (value[key] !== totals[key]) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Browser recovery summary ${key} must match items.`, path: [key] });
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
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Browser recovery summary item attempted must match events.", path: ["items", index, "attempted"] });
    }
    for (const key of ["recovered", "failed", "notRetried"] as const) {
      if (Number(item?.[key]) !== statusCounts[key]) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Browser recovery summary item ${key} must match events.`, path: ["items", index, key] });
      }
    }
  }
  const forbiddenPaths = browserRecoveryForbiddenDetailPaths(value);
  if (forbiddenPaths.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Browser recovery summary contains forbidden raw browser detail at ${forbiddenPaths.join(", ")}.`,
      path: ["items"],
    });
  }
});

const browserActionEffectSignalSchema = z.enum([
  "url",
  "title",
  "page_text",
  "dom",
  "network",
  "dialog",
  "popup",
  "download",
]);

const browserActionEffectSnapshotSchema = z.object({
  urlSha256: z.string().regex(/^[a-f0-9]{64}$/i).optional(),
  titleSha256: z.string().regex(/^[a-f0-9]{64}$/i).optional(),
  pageTextSha256: z.string().regex(/^[a-f0-9]{64}$/i).optional(),
  domSha256: z.string().regex(/^[a-f0-9]{64}$/i).optional(),
  networkCount: z.number().int().nonnegative().optional(),
  dialogCount: z.number().int().nonnegative().optional(),
  popupCount: z.number().int().nonnegative().optional(),
  downloadCount: z.number().int().nonnegative().optional(),
}).strict();

const browserActionEffectEvidenceSchema = z.object({
  provider: z.enum(["playwright", "mcp"]),
  actionIndex: z.number().int().nonnegative(),
  session: z.string().min(1).optional(),
  effectSession: z.string().min(1).optional(),
  actionType: z.string().min(1),
  status: z.enum(["changed", "unchanged", "unavailable"]),
  timeoutMs: z.number().int().min(100).max(10_000),
  startedAt: z.string(),
  finishedAt: z.string(),
  durationMs: z.number().nonnegative(),
  requestedSignals: z.array(browserActionEffectSignalSchema),
  observedSignals: z.array(browserActionEffectSignalSchema),
  changedSignals: z.array(browserActionEffectSignalSchema),
  before: browserActionEffectSnapshotSchema,
  after: browserActionEffectSnapshotSchema,
  detailSuppressed: z.boolean().optional(),
}).passthrough().superRefine((value: Record<string, any>, ctx: z.RefinementCtx) => {
  for (const error of browserActionEffectEvidenceErrors(value)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: error,
      path: ["status"],
    });
  }
});

const browserActionEffectSummaryItemSchema = z.object({
  project: z.string(),
  name: z.string(),
  provider: z.enum(["playwright", "mcp", "none"]).optional(),
  status: resultStatus,
  actions: z.number().int().nonnegative(),
  changed: z.number().int().nonnegative(),
  unchanged: z.number().int().nonnegative(),
  unavailable: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  detailSuppressed: z.number().int().nonnegative(),
  crossSession: z.number().int().nonnegative(),
  actionTypes: z.record(z.number().int().nonnegative()),
  changedSignals: z.record(z.number().int().nonnegative()),
}).passthrough();

const browserActionEffectSummarySchema = z.object({
  checks: z.number().int().nonnegative(),
  actions: z.number().int().nonnegative(),
  changed: z.number().int().nonnegative(),
  unchanged: z.number().int().nonnegative(),
  unavailable: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  detailSuppressed: z.number().int().nonnegative(),
  crossSession: z.number().int().nonnegative(),
  actionTypes: z.record(z.number().int().nonnegative()),
  changedSignals: z.record(z.number().int().nonnegative()),
  items: z.array(browserActionEffectSummaryItemSchema),
}).passthrough().superRefine((value: Record<string, any>, ctx: z.RefinementCtx) => {
  for (const error of browserActionEffectSummaryErrors(value)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: error,
      path: ["items"],
    });
  }
  for (const signal of Object.keys(value.changedSignals || {})) {
    if (!BROWSER_ACTION_EFFECT_SIGNALS.includes(signal as any)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Unsupported browser action-effect signal ${signal}.`,
        path: ["changedSignals", signal],
      });
    }
  }
});

const browserCheckResultSchema = z.object({
  status: resultStatus,
  execution: browserCheckExecutionIdentitySchema.optional(),
  browserSessions: z.array(browserSessionResultSchema).optional(),
  browserSessionComparisons: z.array(browserSessionComparisonResultSchema).optional(),
  authentication: browserAuthenticationEvidenceSchema.optional(),
  recovery: browserRecoveryEvidenceSchema.optional(),
  actionEffects: z.array(browserActionEffectEvidenceSchema).optional(),
  contextOptions: z.object({
    storageState: browserStorageStateEvidenceSchema.optional(),
  }).passthrough().optional(),
}).passthrough().superRefine((value: Record<string, any>, ctx: z.RefinementCtx) => {
  for (const error of browserActionEffectResultErrors(value)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: error,
      path: ["actionEffects"],
    });
  }
  const effectIndexes = (Array.isArray(value.actionEffects) ? value.actionEffects : [])
    .map((effect: any) => effect.actionIndex);
  if (new Set(effectIndexes).size !== effectIndexes.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Browser actionEffects must not contain duplicate actionIndex values.",
      path: ["actionEffects"],
    });
  }
  const existing = value.authentication?.existingSession;
  if (value.authentication?.mode !== "existing_session" || existing?.evidencePolicy !== "minimal") return;
  for (const [index, effect] of (Array.isArray(value.actionEffects) ? value.actionEffects : []).entries()) {
    if (!effect?.detailSuppressed || Object.keys(effect.before || {}).length || Object.keys(effect.after || {}).length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
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
        code: z.ZodIssueCode.custom,
        message: "Minimal existing-session results must not contain raw page or telemetry detail.",
        path: [key],
      });
    }
  }
  for (const key of ["screenshots", "pageSnapshots", "browserArtifacts", "consoleMessages", "dialogMessages", "popupMessages", "networkRequests"]) {
    if (Array.isArray(value[key]) && value[key].length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Minimal existing-session results must not contain detailed browser artifacts or telemetry.",
        path: [key],
      });
    }
  }
  for (const [index, step] of (Array.isArray(value.steps) ? value.steps : []).entries()) {
    if (step?.detail && step.detail !== "authenticated browser step executed; raw detail suppressed") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Minimal existing-session step detail was not suppressed.",
        path: ["steps", index, "detail"],
      });
    }
    if (step?.error && step.error !== "Authenticated browser step failed; raw provider detail suppressed.") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Minimal existing-session step error was not suppressed.",
        path: ["steps", index, "error"],
      });
    }
  }
  if (value.status === "passed" && (!existing.tabContextChecked || !existing.createdNewTab)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Passed existing-session verification must check tab context and create a new tab.",
      path: ["authentication", "existingSession"],
    });
  }
});

function validateMinimalBrowserToolCalls(value: Record<string, any>, ctx: z.RefinementCtx) {
  const minimal = (Array.isArray(value.browserResults) ? value.browserResults : []).some((result: any) =>
    result?.authentication?.mode === "existing_session"
    && result?.authentication?.existingSession?.evidencePolicy === "minimal"
  );
  if (!minimal) return;
  for (const [index, record] of (Array.isArray(value.browserToolCalls) ? value.browserToolCalls : []).entries()) {
    const input = record?.input;
    const keys = input && typeof input === "object" && !Array.isArray(input) ? Object.keys(input) : [];
    if (!input || keys.some(key => key !== "inputKeys" && key !== "action") || !Array.isArray(input.inputKeys)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Minimal existing-session browser tool inputs must contain metadata only.",
        path: ["browserToolCalls", index, "input"],
      });
    }
    if (record?.outputPreview && record.outputPreview !== "[suppressed for existing authenticated browser session]") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Minimal existing-session browser tool output must be suppressed.",
        path: ["browserToolCalls", index, "outputPreview"],
      });
    }
    if (record?.error && record.error !== "Browser tool call failed; raw provider error suppressed.") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Minimal existing-session browser tool errors must be suppressed.",
        path: ["browserToolCalls", index, "error"],
      });
    }
  }
}

export const TestAgentReportContractSchema: z.ZodType<Record<string, any>> = z.object({
  schema: z.literal(TEST_AGENT_CONTRACT_IDS.report),
  agent: z.literal("test-agent"),
  id: z.string().min(1),
  workOrderId: z.string().min(1),
  taskId: z.string(),
  groupId: z.string(),
  originalUserGoal: z.string(),
  acceptanceCriteria: stringList,
  status: agentStatus,
  recommendation: z.enum(["accept", "rework", "need_human"]),
  summary: z.string(),
  startedAt: z.string(),
  finishedAt: z.string(),
  durationMs: z.number(),
  artifactDir: z.string(),
  requiredChecks: stringList,
  commandResults: z.array(z.object({ status: resultStatus }).passthrough()),
  devServerResults: z.array(z.object({ status: resultStatus }).passthrough()),
  httpResults: z.array(httpCheckResultSchema),
  browserResults: z.array(browserCheckResultSchema),
  browserToolCalls: z.array(z.object({ status: z.enum(["passed", "failed"]) }).passthrough()),
  browserNetworkSummary: z.array(browserNetworkSummarySchema).optional(),
  httpConcurrencySummary: httpConcurrencySummarySchema.optional(),
  browserInteractionSummary: z.array(browserInteractionSummarySchema).optional(),
  browserFlowSummary: browserFlowSummarySchema.optional(),
  browserMultiSessionSummary: browserMultiSessionSummarySchema.optional(),
  browserStabilitySummary: browserStabilitySummarySchema.optional(),
  browserCheckExecutionCoverage: browserCheckExecutionCoverageSchema.optional(),
  browserRecoverySummary: browserRecoverySummarySchema.optional(),
  browserActionEffectSummary: browserActionEffectSummarySchema.optional(),
  adversarialEvidenceSummary: adversarialEvidenceSummarySchema,
  browserProviderSummary: browserProviderSummarySchema.optional(),
  browserProviderGaps: z.array(browserProviderGapSchema).optional(),
  failureSummary: z.array(failureSummarySchema).optional(),
  requiredCheckCoverage: z.array(requiredCheckCoverageSchema),
  acceptanceCoverage: z.array(acceptanceCoverageSchema),
  acceptanceEvidenceGateSummary: acceptanceEvidenceGateSummarySchema,
  evidence: z.array(evidenceSchema),
  risks: stringList,
  blockedReasons: stringList,
  issues: z.array(z.object({
    severity: z.enum(["error", "warning"]),
    code: z.string(),
    message: z.string(),
    project: optionalString,
  }).passthrough()),
  metadata: z.record(z.any()),
}).passthrough().superRefine((value: Record<string, any>, ctx: z.RefinementCtx) => {
  validateMinimalBrowserToolCalls(value, ctx);
  const browserExecutionPlanValue = value.metadata?.browserCheckExecutionPlan;
  if (browserExecutionPlanValue !== undefined) {
    const parsedPlan = browserCheckExecutionPlanSchema.safeParse(browserExecutionPlanValue);
    if (!parsedPlan.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "metadata.browserCheckExecutionPlan is invalid.",
        path: ["metadata", "browserCheckExecutionPlan"],
      });
    } else {
      for (const error of browserCheckExecutionEvidenceErrors({
        plan: parsedPlan.data as any,
        results: Array.isArray(value.browserResults) ? value.browserResults : [],
        summary: value.browserCheckExecutionCoverage,
        reportStatus: value.status,
      })) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: error,
          path: ["browserCheckExecutionCoverage"],
        });
      }
    }
  } else if ((Array.isArray(value.browserResults) ? value.browserResults : []).some((result: any) => result?.execution)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Browser execution identities require metadata.browserCheckExecutionPlan.",
      path: ["metadata", "browserCheckExecutionPlan"],
    });
  }
  const hasEffects = (Array.isArray(value.browserResults) ? value.browserResults : [])
    .some((result: any) => Array.isArray(result?.actionEffects) && result.actionEffects.length);
  if (hasEffects && !value.browserActionEffectSummary) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Reports with browser action effects require browserActionEffectSummary.",
      path: ["browserActionEffectSummary"],
    });
  }
  const httpResults = Array.isArray(value.httpResults) ? value.httpResults : [];
  for (const [index, result] of httpResults.entries()) {
    for (const error of httpPageResourceEvidenceErrors(result, `httpResults[${index}]`)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: error,
        path: ["httpResults", index, "resourceChecks"],
      });
    }
  }
  const concurrentHttpResults = httpResults
    .map((result: any, index: number) => ({ result, index }))
    .filter((item: any) => item.result?.concurrency);
  if (concurrentHttpResults.length && !value.httpConcurrencySummary) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Reports with concurrent HTTP evidence require httpConcurrencySummary.",
      path: ["httpConcurrencySummary"],
    });
  }
  for (const { index, result } of concurrentHttpResults) {
    for (const error of httpConcurrencyEvidenceErrors(
      result.concurrency,
      `httpResults[${index}].concurrency`,
    )) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: error,
        path: ["httpResults", index, "concurrency"],
      });
    }
    const expectedStatus = httpConcurrencyResultStatus(result.concurrency);
    if (result.status !== expectedStatus) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `httpResults[${index}].status must be ${expectedStatus} for its concurrent HTTP evidence.`,
        path: ["httpResults", index, "status"],
      });
    }
  }
  if (value.httpConcurrencySummary) {
    for (const error of httpConcurrencySummaryErrors(
      value.httpConcurrencySummary,
      value.httpResults || [],
    )) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: error,
        path: ["httpConcurrencySummary"],
      });
    }
  }
  if (value.browserActionEffectSummary) {
    for (const error of browserActionEffectSummaryErrors(value.browserActionEffectSummary, value.browserResults || [])) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: error,
        path: ["browserActionEffectSummary"],
      });
    }
  }
  for (const error of adversarialEvidenceSummaryErrors(
    value.adversarialEvidenceSummary,
    value.httpResults || [],
    value.browserResults || [],
    value.originalUserGoal || "",
    value.acceptanceCriteria || [],
  )) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: error,
      path: ["adversarialEvidenceSummary"],
    });
  }
  for (const error of acceptanceEvidenceGateSummaryErrors(
    value.acceptanceEvidenceGateSummary,
    value.acceptanceCoverage || [],
  )) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: error,
      path: ["acceptanceEvidenceGateSummary"],
    });
  }
  if (
    value.status === "passed"
    && !["verified", "waived"].includes(String(value.adversarialEvidenceSummary?.status || ""))
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "A passed report requires verified adversarial evidence or an explicit waiver.",
      path: ["status"],
    });
  }
  if (value.status === "passed" && value.acceptanceEvidenceGateSummary?.canAccept !== true) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "A passed report requires criterion-linked acceptance evidence or no acceptance criteria.",
      path: ["status"],
    });
  }
  const requiresAdversarial = (value.requiredChecks || [])
    .some((check: string) => /adversarial|boundary|orphan|idempot|concurr|race/i.test(String(check || "")));
  if (requiresAdversarial && value.adversarialEvidenceSummary?.required !== true) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Adversarial required checks require adversarialEvidenceSummary.required=true.",
      path: ["adversarialEvidenceSummary", "required"],
    });
  }
});

export const TestAgentVerdictContractSchema = z.object({
  schema: z.literal(TEST_AGENT_CONTRACT_IDS.verdict),
  agent: z.literal("test-agent"),
  reportId: z.string().min(1),
  workOrderId: z.string().min(1),
  taskId: z.string(),
  groupId: z.string(),
  status: agentStatus,
  recommendation: z.enum(["accept", "rework", "need_human"]),
  canAccept: z.boolean(),
  needsRework: z.boolean(),
  needsHuman: z.boolean(),
  summary: z.string(),
  failedRequiredChecks: z.array(requiredCheckCoverageSchema),
  unknownRequiredChecks: z.array(requiredCheckCoverageSchema),
  failedAcceptanceCriteria: z.array(acceptanceCoverageSchema),
  unknownAcceptanceCriteria: z.array(acceptanceCoverageSchema),
  requiredCheckSummary: requiredCheckSummarySchema,
  acceptanceSummary: acceptanceSummarySchema,
  blockedReasons: stringList,
  risks: stringList,
  nextActions: stringList,
  evidenceSummary: z.object({
    commands: z.record(z.number()),
    devServers: z.record(z.number()),
    httpChecks: z.record(z.number()),
    httpConcurrencyChecks: z.number().optional(),
    httpConcurrentRequests: z.number().optional(),
    httpConcurrentFailed: z.number().optional(),
    httpConcurrentBlocked: z.number().optional(),
    browserChecks: z.record(z.number()),
    browserToolCalls: z.record(z.number()),
    browserNetworkErrors: z.number().optional(),
    browserActions: z.number().optional(),
    browserFailedActions: z.number().optional(),
    browserAssertions: z.number().optional(),
    browserFailedAssertions: z.number().optional(),
    browserAcceptanceFlows: z.number().optional(),
    browserFailedAcceptanceFlows: z.number().optional(),
    browserMultiSessionScenarios: z.number().optional(),
    browserMultiSessionSessions: z.number().optional(),
    browserMultiSessionParallelGroups: z.number().optional(),
    browserMultiSessionComparisons: z.number().optional(),
    browserFailedSessionComparisons: z.number().optional(),
    browserFailedMultiSessionScenarios: z.number().optional(),
    browserStabilityGroups: z.number().optional(),
    browserFlakyStabilityGroups: z.number().optional(),
    browserStabilityRuns: z.number().optional(),
    browserFailedStabilityRuns: z.number().optional(),
    browserPlannedChecks: z.number().optional(),
    browserExpectedRuns: z.number().optional(),
    browserCoveredRuns: z.number().optional(),
    browserMissingRuns: z.number().optional(),
    browserDuplicateResults: z.number().optional(),
    browserInvalidResults: z.number().optional(),
    browserRecoveryAttempts: z.number().optional(),
    browserRecoveredOperations: z.number().optional(),
    browserFailedRecoveries: z.number().optional(),
    browserUnsafeRetriesPrevented: z.number().optional(),
    browserActionEffectChecks: z.number().optional(),
    browserActionEffects: z.number().optional(),
    browserFailedActionEffects: z.number().optional(),
    browserCrossSessionActionEffects: z.number().optional(),
    adversarialProbes: z.number().optional(),
    adversarialPassed: z.number().optional(),
    adversarialFailed: z.number().optional(),
    adversarialBlocked: z.number().optional(),
    adversarialRelevant: z.number().optional(),
    adversarialUnlinked: z.number().optional(),
    adversarialPassedRelevant: z.number().optional(),
    acceptanceMatchedEvidence: z.number(),
    acceptanceFallbackEvidence: z.number(),
    acceptanceMissingEvidence: z.number(),
    browserProviderGaps: z.number().optional(),
    artifacts: z.number(),
  }).passthrough(),
  browserNetworkSummary: z.array(browserNetworkSummarySchema).optional(),
  httpConcurrencySummary: httpConcurrencySummarySchema.optional(),
  browserInteractionSummary: z.array(browserInteractionSummarySchema).optional(),
  browserFlowSummary: browserFlowSummarySchema.optional(),
  browserMultiSessionSummary: browserMultiSessionSummarySchema.optional(),
  browserStabilitySummary: browserStabilitySummarySchema.optional(),
  browserCheckExecutionCoverage: browserCheckExecutionCoverageSchema.optional(),
  browserRecoverySummary: browserRecoverySummarySchema.optional(),
  browserActionEffectSummary: browserActionEffectSummarySchema.optional(),
  adversarialEvidenceSummary: adversarialEvidenceSummarySchema,
  acceptanceEvidenceGateSummary: acceptanceEvidenceGateSummarySchema,
  browserProviderSummary: browserProviderSummarySchema.optional(),
  browserProviderGaps: z.array(browserProviderGapSchema).optional(),
  failureSummary: z.array(failureSummarySchema).optional(),
  keyEvidence: z.array(evidenceSchema),
  artifacts: z.object({
    artifactDir: z.string(),
    reportJsonPath: optionalString,
    reportMarkdownPath: optionalString,
    verdictJsonPath: optionalString,
    manifestPath: optionalString,
  }).passthrough(),
  metadata: z.record(z.any()),
}).passthrough().superRefine((value, ctx) => {
  for (const error of acceptanceEvidenceGateSummaryErrors(value.acceptanceEvidenceGateSummary)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: error,
      path: ["acceptanceEvidenceGateSummary"],
    });
  }
  if (
    value.canAccept
    && !["verified", "waived"].includes(String(value.adversarialEvidenceSummary?.status || ""))
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "canAccept requires verified adversarial evidence or an explicit waiver.",
      path: ["canAccept"],
    });
  }
  if (value.canAccept && value.acceptanceEvidenceGateSummary?.canAccept !== true) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "canAccept requires criterion-linked acceptance evidence or no acceptance criteria.",
      path: ["canAccept"],
    });
  }
  if (value.canAccept && value.browserCheckExecutionCoverage && value.browserCheckExecutionCoverage.status !== "complete") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "canAccept requires complete browser check execution coverage.",
      path: ["canAccept"],
    });
  }
});

export type TestAgentWorkOrderContract = z.infer<typeof TestAgentWorkOrderContractSchema>;
export type TestAgentHandoffContract = z.infer<typeof TestAgentHandoffContractSchema>;
export type TestAgentReportContract = z.infer<typeof TestAgentReportContractSchema>;
export type TestAgentVerdictContract = z.infer<typeof TestAgentVerdictContractSchema>;
