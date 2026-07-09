export type TestAgentStatus = "passed" | "failed" | "blocked" | "partial";
export type TestAgentRecommendation = "accept" | "rework" | "need_human";

export type TestAgentRequiredCheck =
  | "commands"
  | "build"
  | "unit_tests"
  | "browser_e2e"
  | "console_errors"
  | "screenshots"
  | string;

export interface TestAgentWorkOrder {
  schema?: "ccm-test-agent-work-order-v1";
  id?: string;
  taskId?: string;
  task_id?: string;
  groupId?: string;
  group_id?: string;
  issuedBy?: string;
  issued_by?: string;
  originalUserGoal?: string;
  original_user_goal?: string;
  acceptanceCriteria?: string[];
  acceptance_criteria?: string[];
  requiredChecks?: TestAgentRequiredCheck[];
  required_checks?: TestAgentRequiredCheck[];
  projects?: TestAgentProjectTarget[];
  options?: TestAgentOptions;
  metadata?: Record<string, any>;
}

export interface TestAgentOptions {
  artifactDir?: string;
  commandTimeoutMs?: number;
  browserTimeoutMs?: number;
  httpTimeoutMs?: number;
  startupTimeoutMs?: number;
  maxOutputChars?: number;
  maxHttpResourceChecks?: number;
  failOnConsoleError?: boolean;
  failOnHttpResourceError?: boolean;
  verificationOnly?: boolean;
  browserProvider?: "auto" | "playwright" | "mcp" | "none";
  autoDiscoverVerificationCommands?: boolean;
  collectBrowserArtifacts?: boolean;
  collectBrowserVideo?: boolean;
}

export interface TestAgentBrowserToolExecutor {
  listTools?: () => Promise<string[]> | string[];
  callTool: (toolName: string, input: Record<string, any>) => Promise<any>;
}

export interface BrowserToolCallRecord {
  id: string;
  toolName: string;
  input: Record<string, any>;
  status: "passed" | "failed";
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  outputPreview?: string;
  error?: string;
}

export interface TestAgentRuntimeOptions extends Partial<TestAgentOptions> {
  browserToolExecutor?: TestAgentBrowserToolExecutor;
}

export interface TestAgentProjectTarget {
  name: string;
  workDir?: string;
  work_dir?: string;
  runCommand?: string;
  run_command?: string;
  devServerCommand?: string;
  dev_server_command?: string;
  targetUrl?: string;
  target_url?: string;
  startupUrl?: string;
  startup_url?: string;
  startupTimeoutMs?: number;
  startup_timeout_ms?: number;
  env?: Record<string, string | number | boolean | undefined>;
  changedFiles?: string[];
  changed_files?: string[];
  verificationCommands?: string[];
  verification_commands?: string[];
  httpChecks?: HttpCheckSpec[];
  http_checks?: HttpCheckSpec[];
  adversarialHttpChecks?: HttpCheckSpec[];
  adversarial_http_checks?: HttpCheckSpec[];
  adversarialApiChecks?: HttpCheckSpec[];
  adversarial_api_checks?: HttpCheckSpec[];
  adversarialBrowserChecks?: BrowserCheckSpec[];
  adversarial_browser_checks?: BrowserCheckSpec[];
  adversarialBrowserProbeTemplates?: BrowserProbeTemplateSpec[];
  adversarial_browser_probe_templates?: BrowserProbeTemplateSpec[];
  browserChecks?: BrowserCheckSpec[];
  browser_checks?: BrowserCheckSpec[];
  agentSummary?: string;
  agent_summary?: string;
  risks?: string[];
}

export interface BrowserProbeTemplateFieldSpec {
  selector?: string;
  locator?: string;
  testId?: string;
  test_id?: string;
  dataTestId?: string;
  data_testid?: string;
  label?: string;
  placeholder?: string;
  role?: string;
  name?: string;
  text?: string;
  value?: string;
  exact?: boolean;
}

export interface BrowserProbeTemplateSpec {
  kind?: "invalid_form_input" | "repeated_click" | "refresh_persistence" | string;
  type?: string;
  template?: string;
  name?: string;
  title?: string;
  url?: string;
  targetUrl?: string;
  target_url?: string;
  probeType?: string;
  probe_type?: string;
  screenshot?: boolean;
  fields?: BrowserProbeTemplateFieldSpec[];
  submit?: Partial<BrowserActionSpec>;
  target?: Partial<BrowserActionSpec>;
  repeat?: number;
  expectedText?: string;
  expected_text?: string;
  expectedUrlIncludes?: string;
  expected_url_includes?: string;
  setupActions?: BrowserActionSpec[];
  setup_actions?: BrowserActionSpec[];
  actions?: BrowserActionSpec[];
  assertions?: BrowserAssertionSpec[];
  expectations?: BrowserAssertionSpec[];
  stateAssertions?: BrowserAssertionSpec[];
  state_assertions?: BrowserAssertionSpec[];
}

export interface BrowserCheckSpec {
  name?: string;
  url?: string;
  actions?: BrowserActionSpec[];
  assertions?: BrowserAssertionSpec[];
  screenshot?: boolean;
  viewport?: {
    width?: number;
    height?: number;
  };
  viewportWidth?: number;
  viewport_width?: number;
  viewportHeight?: number;
  viewport_height?: number;
  isMobile?: boolean;
  is_mobile?: boolean;
  deviceScaleFactor?: number;
  device_scale_factor?: number;
  userAgent?: string;
  user_agent?: string;
  locale?: string;
  timezoneId?: string;
  timezone_id?: string;
  colorScheme?: "light" | "dark" | "no-preference" | string;
  color_scheme?: "light" | "dark" | "no-preference" | string;
  reducedMotion?: "reduce" | "no-preference" | string;
  reduced_motion?: "reduce" | "no-preference" | string;
  permissions?: string[];
  geolocation?: {
    latitude?: number;
    longitude?: number;
    accuracy?: number;
  };
  adversarial?: boolean;
  probeType?: string;
  probe_type?: string;
  timeoutMs?: number;
  timeout_ms?: number;
  context?: Record<string, any>;
}

export interface HttpCheckSpec {
  name?: string;
  url: string;
  method?: string;
  headers?: Record<string, string | number | boolean | undefined>;
  body?: string;
  json?: any;
  assertions?: HttpAssertionSpec[];
  adversarial?: boolean;
  probeType?: string;
  probe_type?: string;
  timeoutMs?: number;
  timeout_ms?: number;
  context?: Record<string, any>;
}

export interface HttpAssertionSpec {
  type:
    | "status"
    | "contentTypeIncludes"
    | "textIncludes"
    | "textNotIncludes"
    | "jsonPathEquals"
    | "jsonPathIncludes";
  status?: number | number[];
  statusCode?: number | number[];
  status_code?: number | number[];
  text?: string;
  value?: any;
  path?: string;
}

export interface BrowserActionSpec {
  type:
    | "goto"
    | "click"
    | "doubleClick"
    | "rightClick"
    | "fill"
    | "selectOption"
    | "check"
    | "uncheck"
    | "uploadFile"
    | "dragTo"
    | "setClipboard"
    | "setCookie"
    | "clearCookies"
    | "setLocalStorage"
    | "setSessionStorage"
    | "clearStorage"
    | "setOffline"
    | "setOnline"
    | "hover"
    | "focus"
    | "typeText"
    | "press"
    | "scroll"
    | "openApplication"
    | "requestAccess"
    | "reload"
    | "goBack"
    | "goForward"
    | "waitForSelector"
    | "waitForText"
    | "waitForUrl"
    | "waitForTimeout"
    | "evaluate";
  selector?: string;
  locator?: string;
  text?: string;
  value?: string;
  storage?: string;
  storageArea?: string;
  storage_area?: string;
  keys?: string[];
  url?: string;
  key?: string;
  domain?: string;
  cookiePath?: string;
  cookie_path?: string;
  expires?: number;
  httpOnly?: boolean;
  http_only?: boolean;
  secure?: boolean;
  sameSite?: "Strict" | "Lax" | "None" | string;
  same_site?: "Strict" | "Lax" | "None" | string;
  filePath?: string;
  file_path?: string;
  path?: string;
  fileName?: string;
  file_name?: string;
  filename?: string;
  fileContent?: string;
  file_content?: string;
  content?: string;
  mediaType?: string;
  media_type?: string;
  filePaths?: string[];
  file_paths?: string[];
  files?: Array<{
    filePath?: string;
    file_path?: string;
    path?: string;
    fileName?: string;
    file_name?: string;
    filename?: string;
    fileContent?: string;
    file_content?: string;
    content?: string;
    mediaType?: string;
    media_type?: string;
  }>;
  testId?: string;
  test_id?: string;
  dataTestId?: string;
  data_testid?: string;
  label?: string;
  placeholder?: string;
  role?: string;
  name?: string;
  altText?: string;
  alt_text?: string;
  title?: string;
  exact?: boolean;
  destinationSelector?: string;
  destination_selector?: string;
  destinationLocator?: string;
  destination_locator?: string;
  destinationTestId?: string;
  destination_test_id?: string;
  destinationDataTestId?: string;
  destination_data_testid?: string;
  destinationLabel?: string;
  destination_label?: string;
  destinationPlaceholder?: string;
  destination_placeholder?: string;
  destinationRole?: string;
  destination_role?: string;
  destinationName?: string;
  destination_name?: string;
  destinationText?: string;
  destination_text?: string;
  destinationAltText?: string;
  destination_alt_text?: string;
  destinationTitle?: string;
  destination_title?: string;
  destinationExact?: boolean;
  destination_exact?: boolean;
  coordinate?: [number, number];
  startCoordinate?: [number, number];
  start_coordinate?: [number, number];
  direction?: "up" | "down" | "left" | "right";
  amount?: number;
  delay?: number;
  delayMs?: number;
  delay_ms?: number;
  duration?: number;
  region?: [number, number, number, number];
  bundleId?: string;
  bundle_id?: string;
  apps?: Array<{
    displayName?: string;
    bundleId?: string;
    bundle_id?: string;
  }>;
  timeoutMs?: number;
  timeout_ms?: number;
  waitUntil?: "load" | "domcontentloaded" | "networkidle";
}

export interface BrowserAssertionSpec {
  type:
    | "visible"
    | "notVisible"
    | "present"
    | "notPresent"
    | "focused"
    | "notFocused"
    | "enabled"
    | "disabled"
    | "checked"
    | "notChecked"
    | "selectedValue"
    | "selectedTextIncludes"
    | "inputValueEquals"
    | "inputValueIncludes"
    | "attributeEquals"
    | "attributeIncludes"
    | "computedStyleEquals"
    | "computedStyleIncludes"
    | "elementCountEquals"
    | "elementCountAtLeast"
    | "elementCountAtMost"
    | "dialogAppeared"
    | "dialogMessageIncludes"
    | "dialogTypeEquals"
    | "popupOpened"
    | "popupUrlIncludes"
    | "popupTextIncludes"
    | "popupTitleIncludes"
    | "tableRowIncludes"
    | "tableCellTextIncludes"
    | "tableCellTextEquals"
    | "clipboardTextEquals"
    | "clipboardTextIncludes"
    | "elementScreenshotNotBlank"
    | "textOrder"
    | "text"
    | "urlEquals"
    | "urlIncludes"
    | "urlNotIncludes"
    | "titleEquals"
    | "titleIncludes"
    | "titleNotIncludes"
    | "elementTextIncludes"
    | "accessibleNameEquals"
    | "accessibleNameIncludes"
    | "accessibleDescriptionEquals"
    | "accessibleDescriptionIncludes"
    | "ariaSnapshotIncludes"
    | "ariaExpanded"
    | "ariaCollapsed"
    | "ariaPressed"
    | "ariaNotPressed"
    | "ariaSelected"
    | "ariaNotSelected"
    | "ariaInvalid"
    | "ariaValid"
    | "ariaRequired"
    | "ariaNotRequired"
    | "inViewport"
    | "pageNotBlank"
    | "noHorizontalOverflow"
    | "onlineState"
    | "browserOnline"
    | "browserOffline"
    | "cookieExists"
    | "cookieValueEquals"
    | "cookieValueIncludes"
    | "networkNoErrors"
    | "networkRequest"
    | "networkRequestIncludes"
    | "networkRequestNot"
    | "networkRequestNotIncludes"
    | "networkResponse"
    | "networkResponseIncludes"
    | "networkResponseNot"
    | "networkResponseNotIncludes"
    | "downloadedFile"
    | "consoleIncludes"
    | "consoleNotIncludes"
    | "consoleNoErrors"
    | "consoleNoWarnings"
    | "jsTruthy"
    | "jsEquals"
    | "localStorageEquals"
    | "localStorageIncludes"
    | "sessionStorageEquals"
    | "sessionStorageIncludes";
  selector?: string;
  locator?: string;
  text?: string;
  value?: string;
  attribute?: string;
  attributeName?: string;
  attribute_name?: string;
  property?: string;
  styleProperty?: string;
  style_property?: string;
  cssProperty?: string;
  css_property?: string;
  url?: string;
  urlIncludes?: string;
  url_includes?: string;
  method?: string;
  httpMethod?: string;
  http_method?: string;
  status?: number | number[];
  statusCode?: number | number[];
  status_code?: number | number[];
  resourceType?: string;
  resource_type?: string;
  headerName?: string;
  header_name?: string;
  headerIncludes?: string;
  header_includes?: string;
  headerValueIncludes?: string;
  header_value_includes?: string;
  bodyIncludes?: string;
  body_includes?: string;
  bodyJsonPath?: string;
  body_json_path?: string;
  bodyJsonEquals?: any;
  body_json_equals?: any;
  bodyJsonIncludes?: string;
  body_json_includes?: string;
  fileName?: string;
  file_name?: string;
  filename?: string;
  fileNameIncludes?: string;
  file_name_includes?: string;
  filenameIncludes?: string;
  filename_includes?: string;
  contentIncludes?: string;
  content_includes?: string;
  minBytes?: number;
  min_bytes?: number;
  count?: number;
  expectedCount?: number;
  expected_count?: number;
  minCount?: number;
  min_count?: number;
  maxCount?: number;
  max_count?: number;
  minUniqueColors?: number;
  min_unique_colors?: number;
  minNonWhitePixels?: number;
  min_non_white_pixels?: number;
  message?: string;
  messageIncludes?: string;
  message_includes?: string;
  accessibleName?: string;
  accessible_name?: string;
  accessibleDescription?: string;
  accessible_description?: string;
  description?: string;
  descriptionIncludes?: string;
  description_includes?: string;
  snapshotIncludes?: string;
  snapshot_includes?: string;
  dialogType?: "alert" | "beforeunload" | "confirm" | "prompt" | string;
  dialog_type?: "alert" | "beforeunload" | "confirm" | "prompt" | string;
  popupIndex?: number;
  popup_index?: number;
  tableSelector?: string;
  table_selector?: string;
  tableLocator?: string;
  table_locator?: string;
  rowText?: string;
  row_text?: string;
  rowIndex?: number;
  row_index?: number;
  rowNumber?: number;
  row_number?: number;
  columnName?: string;
  column_name?: string;
  columnHeader?: string;
  column_header?: string;
  columnIndex?: number;
  column_index?: number;
  columnNumber?: number;
  column_number?: number;
  texts?: string[];
  values?: string[];
  expectedTexts?: string[];
  expected_texts?: string[];
  key?: string;
  expression?: string;
  testId?: string;
  test_id?: string;
  dataTestId?: string;
  data_testid?: string;
  label?: string;
  placeholder?: string;
  role?: string;
  name?: string;
  altText?: string;
  alt_text?: string;
  title?: string;
  exact?: boolean;
  timeoutMs?: number;
  timeout_ms?: number;
  settleMs?: number;
  settle_ms?: number;
}

export interface NormalizedTestAgentWorkOrder {
  schema: "ccm-test-agent-work-order-v1";
  id: string;
  taskId: string;
  groupId: string;
  issuedBy: string;
  originalUserGoal: string;
  acceptanceCriteria: string[];
  requiredChecks: TestAgentRequiredCheck[];
  projects: NormalizedTestAgentProjectTarget[];
  options: Required<TestAgentOptions>;
  metadata: Record<string, any>;
}

export interface NormalizedTestAgentProjectTarget {
  name: string;
  workDir: string;
  runCommand: string;
  devServerCommand: string;
  targetUrl: string;
  startupUrl: string;
  startupTimeoutMs: number;
  env: Record<string, string>;
  changedFiles: string[];
  verificationCommands: string[];
  httpChecks: HttpCheckSpec[];
  adversarialHttpChecks: HttpCheckSpec[];
  adversarialBrowserChecks: BrowserCheckSpec[];
  browserChecks: BrowserCheckSpec[];
  agentSummary: string;
  risks: string[];
}

export interface WorkOrderIssue {
  severity: "error" | "warning";
  code: string;
  message: string;
  project?: string;
}

export interface CommandRunResult {
  project: string;
  command: string;
  cwd: string;
  status: "passed" | "failed" | "blocked" | "skipped" | "timed_out";
  exitCode: number | null;
  signal?: NodeJS.Signals | null;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  stdout: string;
  stderr: string;
  output: string;
  error?: string;
}

export interface DevServerResult {
  project: string;
  command: string;
  cwd: string;
  url: string;
  status: "started" | "already_running" | "failed" | "skipped";
  startedAt: string;
  readyAt?: string;
  error?: string;
  output?: string;
}

export interface BrowserStepResult {
  kind: "action" | "assertion";
  name: string;
  status: "passed" | "failed" | "skipped";
  detail?: string;
  error?: string;
}

export interface BrowserCheckResult {
  provider?: "playwright" | "mcp" | "none";
  project: string;
  name: string;
  url: string;
  finalUrl?: string;
  title?: string;
  pageTextPreview?: string;
  pageSnapshots?: string[];
  viewport?: {
    width: number;
    height: number;
    isMobile?: boolean;
    deviceScaleFactor?: number;
  };
  contextOptions?: {
    userAgent?: string;
    locale?: string;
    timezoneId?: string;
    colorScheme?: string;
    reducedMotion?: string;
    permissions?: string[];
    geolocation?: {
      latitude: number;
      longitude: number;
      accuracy?: number;
    };
  };
  status: "passed" | "failed" | "blocked" | "skipped";
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  steps: BrowserStepResult[];
  screenshots: string[];
  consoleMessages?: string[];
  dialogMessages?: string[];
  popupMessages?: string[];
  consoleErrors: string[];
  pageErrors: string[];
  networkRequests?: string[];
  networkErrors?: string[];
  consoleLogPath?: string;
  dialogLogPath?: string;
  popupLogPath?: string;
  networkLogPath?: string;
  browserArtifacts?: BrowserEvidenceArtifact[];
  adversarial?: boolean;
  probeType?: string;
  context?: Record<string, any>;
  error?: string;
}

export interface BrowserNetworkSummaryItem {
  project: string;
  name: string;
  provider?: "playwright" | "mcp" | "none";
  status: BrowserCheckResult["status"];
  url: string;
  finalUrl?: string;
  requestCount: number;
  responseCount: number;
  failedRequestCount: number;
  failedResponseCount: number;
  errorCount: number;
  statusCodes: Record<string, number>;
  resourceTypes: Record<string, number>;
  failureKinds: Record<string, number>;
  failedUrls: string[];
  errors: string[];
  networkLogPath?: string;
}

export interface BrowserInteractionSummaryStep {
  kind: "action" | "assertion";
  name: string;
  status: BrowserStepResult["status"];
  detail?: string;
  error?: string;
}

export interface BrowserInteractionSummaryItem {
  project: string;
  name: string;
  provider?: "playwright" | "mcp" | "none";
  status: BrowserCheckResult["status"];
  url: string;
  finalUrl?: string;
  probeType?: string;
  actionCount: number;
  assertionCount: number;
  passedActions: number;
  failedActions: number;
  passedAssertions: number;
  failedAssertions: number;
  actionTypes: Record<string, number>;
  assertionTypes: Record<string, number>;
  actionSteps: BrowserInteractionSummaryStep[];
  failedSteps: BrowserInteractionSummaryStep[];
}

export interface BrowserProviderGapItem {
  provider: string;
  project?: string;
  check: string;
  kind: BrowserStepResult["kind"] | "provider";
  step?: string;
  category: "unsupported_action" | "unsupported_assertion" | "missing_tool" | "provider_unavailable" | "provider_capability_gap";
  reason: string;
  recommendation: string;
}

export interface BrowserProviderSummaryItem {
  provider: string;
  label?: string;
  preferred: boolean;
  available: boolean;
  selected: boolean;
  attempted: boolean;
  resultCount: number;
  passed: number;
  failed: number;
  blocked: number;
  skipped: number;
  reason?: string;
  tools?: string[];
  diagnostics?: Record<string, any>;
}

export interface BrowserProviderSummary {
  preferred: string;
  status: "not_required" | "provider_none" | "ready" | "used" | "blocked" | "unavailable";
  selectedProvider?: string;
  availableProviders: string[];
  attemptedProviders: string[];
  fallbackUsed: boolean;
  items: BrowserProviderSummaryItem[];
}

export interface BrowserEvidenceArtifact {
  type: "trace" | "har" | "video" | "download" | "accessibility_snapshot" | "metadata" | "other";
  title: string;
  path: string;
  source?: string;
  mediaType?: string;
}

export interface HttpResourceCheckResult {
  url: string;
  status: "passed" | "failed" | "blocked" | "skipped";
  statusCode: number | null;
  contentType: string;
  error?: string;
}

export interface HttpAssertionResult {
  name: string;
  status: "passed" | "failed" | "skipped";
  detail?: string;
  error?: string;
}

export interface HttpCheckResult {
  project: string;
  name?: string;
  url: string;
  method?: string;
  status: "passed" | "failed" | "blocked" | "skipped";
  statusCode: number | null;
  contentType: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  resourceChecks: HttpResourceCheckResult[];
  assertions?: HttpAssertionResult[];
  responsePreview?: string;
  adversarial?: boolean;
  probeType?: string;
  error?: string;
}

export type AcceptanceEvidenceMatchStrength = "direct" | "token" | "fallback" | "none";
export type AcceptanceEvidenceSource = "matched_evidence" | "single_criterion_report_status" | "none";

export interface AcceptanceCoverageItem {
  criterion: string;
  status: "verified" | "not_verified" | "unknown";
  evidence: string[];
  matchStrength?: AcceptanceEvidenceMatchStrength;
  matchScore?: number;
  evidenceSource?: AcceptanceEvidenceSource;
}

export interface TestAgentAcceptanceSummaryItem {
  criterion: string;
  status: AcceptanceCoverageItem["status"];
  evidence: string[];
  matchStrength?: AcceptanceEvidenceMatchStrength;
  matchScore?: number;
  evidenceSource?: AcceptanceEvidenceSource;
}

export interface TestAgentAcceptanceSummary {
  total: number;
  statusCounts: Record<AcceptanceCoverageItem["status"], number>;
  matchStrengthCounts: Record<AcceptanceEvidenceMatchStrength, number>;
  evidenceSourceCounts: Record<AcceptanceEvidenceSource, number>;
  verified: TestAgentAcceptanceSummaryItem[];
  notVerified: TestAgentAcceptanceSummaryItem[];
  unknown: TestAgentAcceptanceSummaryItem[];
}

export interface RequiredCheckCoverageItem {
  check: string;
  status: "verified" | "not_verified" | "unknown";
  evidence: string[];
  missingReason?: string;
}

export interface TestAgentRequiredCheckSummaryItem {
  check: string;
  status: RequiredCheckCoverageItem["status"];
  evidence: string[];
  missingReason?: string;
}

export interface TestAgentRequiredCheckSummary {
  total: number;
  statusCounts: Record<RequiredCheckCoverageItem["status"], number>;
  verified: TestAgentRequiredCheckSummaryItem[];
  notVerified: TestAgentRequiredCheckSummaryItem[];
  unknown: TestAgentRequiredCheckSummaryItem[];
}

export interface TestAgentFailureSummaryItem {
  type: "issue" | "server" | "command" | "http" | "browser" | "required_check" | "acceptance";
  project?: string;
  title: string;
  status: "failed" | "blocked" | "not_verified" | "unknown";
  reason: string;
  evidence?: string[];
  nextAction?: string;
  diagnostics?: string[];
}

export interface EvidenceItem {
  type: "command" | "browser" | "server" | "http" | "artifact" | "work_order";
  project?: string;
  title: string;
  status: TestAgentStatus | "skipped";
  detail?: string;
  path?: string;
}

export interface TestAgentArtifactManifestItem {
  type:
    | "report_json"
    | "report_markdown"
    | "verdict_json"
    | "artifact_manifest"
    | "screenshot"
    | "browser_snapshot"
    | "browser_accessibility_snapshot"
    | "browser_console_log"
    | "browser_dialog_log"
    | "browser_popup_log"
    | "browser_network_log"
    | "browser_tool_transcript"
    | "browser_trace"
    | "browser_har"
    | "browser_video"
    | "browser_artifact"
    | "evidence_artifact";
  title: string;
  path: string;
  project?: string;
  status?: TestAgentStatus | "skipped" | string;
  source?: string;
  integrity?: {
    exists: boolean;
    sizeBytes?: number;
    sha256?: string;
    error?: string;
  };
}

export interface TestAgentArtifactManifest {
  schema: "ccm-test-agent-artifact-manifest-v1";
  reportId: string;
  workOrderId: string;
  taskId: string;
  groupId: string;
  status: TestAgentStatus;
  artifactDir: string;
  generatedAt: string;
  summary: {
    reports: number;
    screenshots: number;
    browserSnapshots: number;
    browserAccessibilitySnapshots: number;
    browserConsoleLogs: number;
    browserPopupLogs: number;
    browserNetworkLogs: number;
    browserToolTranscripts: number;
    browserTraces: number;
    browserHars: number;
    browserVideos: number;
    browserArtifacts: number;
    evidenceArtifacts: number;
    integrityVerified: number;
    integrityMissing: number;
  };
  files: TestAgentArtifactManifestItem[];
}

export interface TestAgentVerdict {
  schema: "ccm-test-agent-verdict-v1";
  agent: "test-agent";
  reportId: string;
  workOrderId: string;
  taskId: string;
  groupId: string;
  status: TestAgentStatus;
  recommendation: TestAgentRecommendation;
  canAccept: boolean;
  needsRework: boolean;
  needsHuman: boolean;
  summary: string;
  failedRequiredChecks: RequiredCheckCoverageItem[];
  unknownRequiredChecks: RequiredCheckCoverageItem[];
  failedAcceptanceCriteria: AcceptanceCoverageItem[];
  unknownAcceptanceCriteria: AcceptanceCoverageItem[];
  requiredCheckSummary: TestAgentRequiredCheckSummary;
  acceptanceSummary: TestAgentAcceptanceSummary;
  blockedReasons: string[];
  risks: string[];
  nextActions: string[];
  evidenceSummary: {
    commands: Record<string, number>;
    devServers: Record<string, number>;
    httpChecks: Record<string, number>;
    browserChecks: Record<string, number>;
    browserToolCalls: Record<string, number>;
    browserNetworkErrors?: number;
    browserActions?: number;
    browserFailedActions?: number;
    browserAssertions?: number;
    browserFailedAssertions?: number;
    browserProviderGaps?: number;
    artifacts: number;
  };
  browserNetworkSummary?: BrowserNetworkSummaryItem[];
  browserInteractionSummary?: BrowserInteractionSummaryItem[];
  browserProviderSummary?: BrowserProviderSummary;
  browserProviderGaps?: BrowserProviderGapItem[];
  failureSummary?: TestAgentFailureSummaryItem[];
  keyEvidence: EvidenceItem[];
  artifacts: {
    artifactDir: string;
    reportJsonPath?: string;
    reportMarkdownPath?: string;
    verdictJsonPath?: string;
    manifestPath?: string;
  };
  metadata: Record<string, any>;
}

export interface TestAgentReport {
  schema: "ccm-test-agent-report-v1";
  agent: "test-agent";
  id: string;
  workOrderId: string;
  taskId: string;
  groupId: string;
  status: TestAgentStatus;
  recommendation: TestAgentRecommendation;
  summary: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  artifactDir: string;
  requiredChecks: TestAgentRequiredCheck[];
  commandResults: CommandRunResult[];
  devServerResults: DevServerResult[];
  httpResults: HttpCheckResult[];
  browserResults: BrowserCheckResult[];
  browserToolCalls: BrowserToolCallRecord[];
  browserNetworkSummary: BrowserNetworkSummaryItem[];
  browserInteractionSummary: BrowserInteractionSummaryItem[];
  browserProviderSummary: BrowserProviderSummary;
  browserProviderGaps: BrowserProviderGapItem[];
  failureSummary: TestAgentFailureSummaryItem[];
  requiredCheckCoverage: RequiredCheckCoverageItem[];
  acceptanceCoverage: AcceptanceCoverageItem[];
  evidence: EvidenceItem[];
  risks: string[];
  blockedReasons: string[];
  issues: WorkOrderIssue[];
  metadata: Record<string, any>;
}
