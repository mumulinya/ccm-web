// Behavior-freeze split from schema.ts (part 1/3).
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
import { browserToolEvidenceLineageErrors } from "../browser/tool-evidence-lineage";
import { browserToolCallTimeoutEvidenceErrors } from "../browser/tool-call-timeout";
import { browserEvidenceTemporalIntegrityErrors } from "../browser/evidence-temporal-integrity";
import { browserResourceLifecycleErrors } from "../browser/resource-lifecycle";

export const TEST_AGENT_CONTRACT_IDS = {
  handoff: "ccm-test-agent-handoff-v1",
  workOrder: "ccm-test-agent-work-order-v1",
  report: "ccm-test-agent-report-v1",
  verdict: "ccm-test-agent-verdict-v1",
  invocationRequest: "ccm-test-agent-invocation-request-v1",
  invocationResult: "ccm-test-agent-invocation-result-v1",
} as const;

const primitiveValue = z.union([z.string(), z.number(), z.boolean(), z.undefined()]);
export const optionalString = z.string().optional();
export const timeoutMs = z.number().int().positive().optional();
const countValue = z.number().int().nonnegative().optional();
export const stringList = z.array(z.string());
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
  agenticPlanning: z.boolean().optional(),
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
