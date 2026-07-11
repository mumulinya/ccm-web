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
  requireAdversarialProbe?: boolean;
  adversarialProbeWaiver?: string;
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
  coversAcceptanceCriteria?: string[];
  covers_acceptance_criteria?: string[];
  acceptanceCriteria?: string[];
  acceptance_criteria?: string[];
  context?: Record<string, any>;
}

export interface BrowserCheckSpec {
  name?: string;
  url?: string;
  authentication?: BrowserAuthenticationConfig;
  authenticationMode?: BrowserAuthenticationMode | string;
  authentication_mode?: BrowserAuthenticationMode | string;
  authMode?: BrowserAuthenticationMode | string;
  auth_mode?: BrowserAuthenticationMode | string;
  existingSessionProvider?: BrowserExistingSessionProvider | string;
  existing_session_provider?: BrowserExistingSessionProvider | string;
  authenticatedBrowserProvider?: BrowserExistingSessionProvider | string;
  authenticated_browser_provider?: BrowserExistingSessionProvider | string;
  existingSessionEvidencePolicy?: BrowserExistingSessionEvidencePolicy | string;
  existing_session_evidence_policy?: BrowserExistingSessionEvidencePolicy | string;
  actions?: BrowserActionSpec[];
  assertions?: BrowserAssertionSpec[];
  sessions?: BrowserSessionSpec[];
  sessionSteps?: BrowserSessionStepSpec[];
  session_steps?: BrowserSessionStepSpec[];
  stabilityRuns?: number;
  stability_runs?: number;
  storageStatePath?: string;
  storage_state_path?: string;
  authStatePath?: string;
  auth_state_path?: string;
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
  coversAcceptanceCriteria?: string[];
  covers_acceptance_criteria?: string[];
  acceptanceCriteria?: string[];
  acceptance_criteria?: string[];
  timeoutMs?: number;
  timeout_ms?: number;
  context?: Record<string, any>;
}

export interface BrowserSessionSpec {
  name: string;
  url?: string;
  storageStatePath?: string;
  storage_state_path?: string;
  authStatePath?: string;
  auth_state_path?: string;
  setupActions?: BrowserActionSpec[];
  setup_actions?: BrowserActionSpec[];
}

export interface BrowserSessionLeafStepSpec {
  session: string;
  action?: BrowserActionSpec;
  assertion?: BrowserAssertionSpec;
}

export interface BrowserSessionParallelStepSpec {
  parallel: BrowserSessionLeafStepSpec[];
}

export type BrowserSessionComparisonOperator = "equals" | "notEquals" | "includes";

export interface BrowserSessionComparisonSpec {
  leftSession: string;
  rightSession: string;
  expression?: string;
  leftExpression: string;
  rightExpression: string;
  operator: BrowserSessionComparisonOperator;
  timeoutMs?: number;
  pollMs?: number;
}

export interface BrowserSessionComparisonStepSpec {
  compare: BrowserSessionComparisonSpec;
}

export type BrowserSessionExecutableStepSpec = BrowserSessionLeafStepSpec | BrowserSessionComparisonStepSpec;
export type BrowserSessionStepSpec = BrowserSessionExecutableStepSpec | BrowserSessionParallelStepSpec;

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
  coversAcceptanceCriteria?: string[];
  covers_acceptance_criteria?: string[];
  acceptanceCriteria?: string[];
  acceptance_criteria?: string[];
  timeoutMs?: number;
  timeout_ms?: number;
  context?: Record<string, any>;
  concurrency?: number | HttpConcurrencySpec;
  concurrentRequests?: number;
  concurrent_requests?: number;
  parallelRequests?: number;
  parallel_requests?: number;
  concurrencyAssertions?: HttpConcurrencyAssertionSpec[];
  concurrency_assertions?: HttpConcurrencyAssertionSpec[];
}

export type HttpConcurrencyAssertionType =
  | "responseCount"
  | "statusCount"
  | "jsonPathUniqueCount"
  | "jsonPathAllEqual";

export interface HttpConcurrencyAssertionSpec {
  type: HttpConcurrencyAssertionType;
  status?: number;
  statusCode?: number;
  status_code?: number;
  path?: string;
  count?: number;
  expectedCount?: number;
  expected_count?: number;
  minCount?: number;
  min_count?: number;
  maxCount?: number;
  max_count?: number;
}

export interface HttpConcurrencySpec {
  requests: number;
  aggregateAssertions: HttpConcurrencyAssertionSpec[];
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
  valueEnv?: string;
  value_env?: string;
  textEnv?: string;
  text_env?: string;
  contentEnv?: string;
  content_env?: string;
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
  verifyEffect?: boolean;
  verify_effect?: boolean;
  expectEffect?: boolean;
  expect_effect?: boolean;
  effectTimeoutMs?: number;
  effect_timeout_ms?: number;
  effectSignals?: BrowserActionEffectSignal[];
  effect_signals?: BrowserActionEffectSignal[];
  effectSession?: string;
  effect_session?: string;
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

export interface BrowserSessionComparisonValueSummary {
  type: string;
  length?: number;
  serializedBytes: number;
  sha256: string;
}

export interface BrowserSessionComparisonResult {
  leftSession: string;
  rightSession: string;
  operator: BrowserSessionComparisonOperator;
  status: "passed" | "failed";
  attempts: number;
  durationMs: number;
  timeoutMs: number;
  pollMs: number;
  left?: BrowserSessionComparisonValueSummary;
  right?: BrowserSessionComparisonValueSummary;
  evaluationErrors?: {
    left?: string;
    right?: string;
  };
  error?: string;
}

export interface BrowserSessionResult {
  name: string;
  url: string;
  finalUrl?: string;
  title?: string;
  pageTextPreview?: string;
  screenshots: string[];
  pageSnapshots?: string[];
  browserArtifacts?: BrowserEvidenceArtifact[];
  consoleErrors: string[];
  pageErrors: string[];
  networkErrors: string[];
  consoleLogPath?: string;
  networkLogPath?: string;
  authentication?: BrowserAuthenticationEvidence;
}

export type BrowserActionEffectSignal =
  | "url"
  | "title"
  | "page_text"
  | "dom"
  | "network"
  | "dialog"
  | "popup"
  | "download";

export interface BrowserActionEffectSnapshot {
  urlSha256?: string;
  titleSha256?: string;
  pageTextSha256?: string;
  domSha256?: string;
  networkCount?: number;
  dialogCount?: number;
  popupCount?: number;
  downloadCount?: number;
}

export interface BrowserActionEffectEvidence {
  provider: "playwright" | "mcp";
  actionIndex: number;
  session?: string;
  effectSession?: string;
  actionType: BrowserActionSpec["type"];
  status: "changed" | "unchanged" | "unavailable";
  timeoutMs: number;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  requestedSignals: BrowserActionEffectSignal[];
  observedSignals: BrowserActionEffectSignal[];
  changedSignals: BrowserActionEffectSignal[];
  before: BrowserActionEffectSnapshot;
  after: BrowserActionEffectSnapshot;
  detailSuppressed?: boolean;
}

export interface BrowserStorageStateEvidence {
  source: "file";
  fileName: string;
  sizeBytes: number;
  sha256: string;
  cookieCount: number;
  originCount: number;
}

export type BrowserAuthenticationMode = "existing_session";
export type BrowserExistingSessionProvider = "auto" | "claude-in-chrome" | "chrome-devtools";
export type BrowserExistingSessionEvidencePolicy = "minimal" | "full";

export interface BrowserAuthenticationConfig {
  mode: BrowserAuthenticationMode;
  provider?: BrowserExistingSessionProvider;
  evidencePolicy?: BrowserExistingSessionEvidencePolicy;
}

export interface BrowserExistingSessionEvidence {
  provider: Exclude<BrowserExistingSessionProvider, "auto">;
  evidencePolicy: BrowserExistingSessionEvidencePolicy;
  tabContextChecked: boolean;
  tabCount?: number;
  createdNewTab: boolean;
  pageTextObserved: boolean;
  consoleMessageCount: number;
  networkRequestCount: number;
  screenshotSuppressed?: boolean;
  transcriptDetailsSuppressed?: boolean;
}

export type BrowserRecoveryTrigger =
  | "stale_tab"
  | "navigation_context_lost"
  | "transport_disconnected";

export type BrowserRecoveryStatus = "recovered" | "not_retried" | "failed";

export interface BrowserRecoveryEvent {
  provider: "claude-in-chrome" | "chrome-devtools";
  operation: string;
  trigger: BrowserRecoveryTrigger;
  retrySafe: boolean;
  status: BrowserRecoveryStatus;
  contextRefreshed: boolean;
  createdNewTab: boolean;
  attempt: number;
}

export interface BrowserRecoveryEvidence {
  maxAttempts: number;
  attempted: number;
  recovered: number;
  failed: number;
  notRetried: number;
  events: BrowserRecoveryEvent[];
}

export interface BrowserAuthenticationEvidence {
  credentialEnvNames: string[];
  mode?: "managed" | "existing_session";
  storageState?: BrowserStorageStateEvidence;
  existingSession?: BrowserExistingSessionEvidence;
  sensitiveArtifactsSuppressed?: boolean;
}

export interface BrowserCheckExecutionIdentity {
  checkId: string;
  projectIndex: number;
  checkIndex: number;
  run: number;
  expectedRuns: number;
  evidence: "provider" | "synthetic_missing";
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
    storageState?: BrowserStorageStateEvidence;
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
  browserSessions?: BrowserSessionResult[];
  browserSessionComparisons?: BrowserSessionComparisonResult[];
  authentication?: BrowserAuthenticationEvidence;
  recovery?: BrowserRecoveryEvidence;
  actionEffects?: BrowserActionEffectEvidence[];
  execution?: BrowserCheckExecutionIdentity;
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

export interface BrowserFlowSummaryFailureItem {
  project: string;
  name: string;
  status: BrowserCheckResult["status"];
  error?: string;
  failedSteps: string[];
}

export interface BrowserFlowSummaryItem {
  flowType: string;
  total: number;
  statusCounts: Record<BrowserCheckResult["status"], number>;
  criteriaCount: number;
  criteria: string[];
  projects: string[];
  providers: string[];
  actionCount: number;
  assertionCount: number;
  failedStepCount: number;
  failures: BrowserFlowSummaryFailureItem[];
}

export interface BrowserFlowSummary {
  total: number;
  statusCounts: Record<BrowserCheckResult["status"], number>;
  flowTypeCount: number;
  criteriaCount: number;
  actionCount: number;
  assertionCount: number;
  failedStepCount: number;
  items: BrowserFlowSummaryItem[];
}

export interface BrowserMultiSessionSummarySession {
  name: string;
  url: string;
  finalUrl?: string;
  screenshotCount: number;
  consoleErrorCount: number;
  pageErrorCount: number;
  networkErrorCount: number;
}

export interface BrowserMultiSessionSummaryItem {
  project: string;
  name: string;
  provider?: "playwright" | "mcp" | "none";
  status: BrowserCheckResult["status"];
  probeType?: string;
  sessionCount: number;
  sessionNames: string[];
  sessions: BrowserMultiSessionSummarySession[];
  parallelGroupCount: number;
  comparisonCount: number;
  failedComparisonCount: number;
  actionCount: number;
  assertionCount: number;
  failedStepCount: number;
  screenshotCount: number;
  consoleErrorCount: number;
  pageErrorCount: number;
  networkErrorCount: number;
  failedSessionNames: string[];
  failedSteps: string[];
}

export interface BrowserMultiSessionSummary {
  total: number;
  statusCounts: Record<BrowserCheckResult["status"], number>;
  sessionCount: number;
  uniqueSessionCount: number;
  sessionNames: string[];
  parallelGroupCount: number;
  comparisonCount: number;
  failedComparisonCount: number;
  actionCount: number;
  assertionCount: number;
  failedStepCount: number;
  screenshotCount: number;
  consoleErrorCount: number;
  pageErrorCount: number;
  networkErrorCount: number;
  items: BrowserMultiSessionSummaryItem[];
}

export type BrowserStabilityStatus = "stable_pass" | "stable_fail" | "flaky" | "blocked";

export interface BrowserStabilitySummaryItem {
  groupId: string;
  project: string;
  name: string;
  provider?: "playwright" | "mcp" | "none";
  probeType?: string;
  expectedRuns: number;
  runCount: number;
  status: BrowserStabilityStatus;
  statusCounts: Record<BrowserCheckResult["status"], number>;
  failedRuns: number[];
  blockedRuns: number[];
  skippedRuns: number[];
  durationMs: number;
  screenshotCount: number;
  firstFailure?: string;
}

export interface BrowserStabilitySummary {
  total: number;
  statusCounts: Record<BrowserStabilityStatus, number>;
  expectedRunCount: number;
  runCount: number;
  passedRunCount: number;
  failedRunCount: number;
  blockedRunCount: number;
  skippedRunCount: number;
  screenshotCount: number;
  items: BrowserStabilitySummaryItem[];
}

export interface BrowserRecoverySummaryItem {
  project: string;
  name: string;
  provider?: "playwright" | "mcp" | "none";
  status: BrowserCheckResult["status"];
  attempted: number;
  recovered: number;
  failed: number;
  notRetried: number;
  events: BrowserRecoveryEvent[];
}

export interface BrowserRecoverySummary {
  checks: number;
  attempted: number;
  recovered: number;
  failed: number;
  notRetried: number;
  items: BrowserRecoverySummaryItem[];
}

export interface BrowserActionEffectSummaryItem {
  project: string;
  name: string;
  provider?: "playwright" | "mcp" | "none";
  status: BrowserCheckResult["status"];
  actions: number;
  changed: number;
  unchanged: number;
  unavailable: number;
  failed: number;
  detailSuppressed: number;
  crossSession: number;
  actionTypes: Record<string, number>;
  changedSignals: Record<BrowserActionEffectSignal, number>;
}

export interface BrowserActionEffectSummary {
  checks: number;
  actions: number;
  changed: number;
  unchanged: number;
  unavailable: number;
  failed: number;
  detailSuppressed: number;
  crossSession: number;
  actionTypes: Record<string, number>;
  changedSignals: Record<BrowserActionEffectSignal, number>;
  items: BrowserActionEffectSummaryItem[];
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
  selectedProviders?: string[];
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
  kind?: HttpPageResourceKind;
  source?: string;
  discoveredFrom?: string;
  finalUrl?: string;
  redirectCount?: number;
  expectedContentTypes?: string[];
  contentTypeMatched?: boolean;
  error?: string;
}

export interface BrowserCheckExecutionPlanItem {
  checkId: string;
  project: string;
  projectIndex: number;
  checkIndex: number;
  name: string;
  url: string;
  expectedRuns: number;
  plannedProvider: "playwright" | "mcp" | "none";
  providerRoutingReason: string;
  adversarial: boolean;
  probeType?: string;
}

export interface BrowserCheckExecutionPlan {
  schema: "ccm-test-agent-browser-execution-plan-v1";
  preferredProvider: string;
  plannedCheckCount: number;
  expectedRunCount: number;
  items: BrowserCheckExecutionPlanItem[];
}

export type BrowserCheckExecutionCoverageStatus = "complete" | "incomplete" | "invalid";

export interface BrowserCheckExecutionCoverageItem {
  checkId: string;
  project: string;
  name: string;
  plannedProvider: "playwright" | "mcp" | "none";
  expectedRuns: number;
  observedRuns: number[];
  missingRuns: number[];
  duplicateRuns: number[];
  syntheticBlockedRuns: number[];
  status: BrowserCheckExecutionCoverageStatus;
}

export interface BrowserCheckExecutionCoverageSummary {
  status: BrowserCheckExecutionCoverageStatus;
  plannedCheckCount: number;
  expectedRunCount: number;
  coveredRunCount: number;
  missingRunCount: number;
  providerResultCount: number;
  duplicateResultCount: number;
  invalidResultCount: number;
  diagnosticResultCount: number;
  syntheticBlockedCount: number;
  statusCounts: Record<BrowserCheckExecutionCoverageStatus, number>;
  items: BrowserCheckExecutionCoverageItem[];
}

export type HttpPageResourceKind =
  | "script"
  | "stylesheet"
  | "image"
  | "font"
  | "media"
  | "document"
  | "manifest"
  | "other";

export interface HttpAssertionResult {
  name: string;
  status: "passed" | "failed" | "skipped";
  detail?: string;
  error?: string;
}

export interface HttpConcurrencyValueEvidence {
  path: string;
  present: boolean;
  sha256?: string;
  serializedBytes?: number;
}

export interface HttpConcurrentRequestResult {
  requestIndex: number;
  requestNumber: number;
  url: string;
  method: string;
  status: "passed" | "failed" | "blocked";
  statusCode: number | null;
  contentType: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  assertions: HttpAssertionResult[];
  aggregateValues: HttpConcurrencyValueEvidence[];
  responsePreview?: string;
  error?: string;
}

export interface HttpConcurrencyEvidence {
  requested: number;
  completed: number;
  passed: number;
  failed: number;
  blocked: number;
  launchSpreadMs: number;
  maxInFlight: number;
  overlapObserved: boolean;
  assertionSpecs: HttpConcurrencyAssertionSpec[];
  aggregateAssertions: HttpAssertionResult[];
  requests: HttpConcurrentRequestResult[];
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
  context?: Record<string, any>;
  concurrency?: HttpConcurrencyEvidence;
  error?: string;
}

export interface HttpConcurrencySummaryItem {
  project: string;
  name: string;
  status: HttpCheckResult["status"];
  probeType?: string;
  requested: number;
  completed: number;
  passed: number;
  failed: number;
  blocked: number;
  launchSpreadMs: number;
  maxInFlight: number;
  overlapObserved: boolean;
  aggregatePassed: number;
  aggregateFailed: number;
  aggregateSkipped: number;
}

export interface HttpConcurrencySummary {
  checks: number;
  requests: number;
  completed: number;
  passed: number;
  failed: number;
  blocked: number;
  maxInFlight: number;
  items: HttpConcurrencySummaryItem[];
}

export type AdversarialEvidenceStatus = "verified" | "failed" | "blocked" | "missing" | "unlinked" | "waived";
export type AdversarialEvidenceRelevance = "explicit" | "inferred" | "none";

export interface AdversarialEvidenceSummaryItem {
  project: string;
  surface: "http" | "browser";
  name: string;
  target: string;
  status: HttpCheckResult["status"] | BrowserCheckResult["status"];
  probeType?: string;
  provider?: BrowserCheckResult["provider"];
  relevance: AdversarialEvidenceRelevance;
  linkedCriteria: string[];
  goalLinked: boolean;
  matchScore: number;
}

export interface AdversarialEvidenceSummary {
  required: boolean;
  waived: boolean;
  waiverReason?: string;
  status: AdversarialEvidenceStatus;
  total: number;
  passed: number;
  failed: number;
  blocked: number;
  skipped: number;
  http: number;
  browser: number;
  relevant: number;
  unlinked: number;
  passedRelevant: number;
  goalLinked: number;
  criteriaCovered: string[];
  probeTypes: string[];
  items: AdversarialEvidenceSummaryItem[];
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

export type AcceptanceEvidenceGateStatus =
  | "verified"
  | "failed"
  | "incomplete"
  | "weak"
  | "not_applicable";

export interface AcceptanceEvidenceGateSummary {
  status: AcceptanceEvidenceGateStatus;
  canAccept: boolean;
  total: number;
  verified: number;
  notVerified: number;
  unknown: number;
  matchedEvidence: number;
  fallbackEvidence: number;
  missingEvidence: number;
  direct: number;
  token: number;
  fallback: number;
  none: number;
  failedCriteria: string[];
  incompleteCriteria: string[];
  weakCriteria: string[];
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
  originalUserGoal: string;
  acceptanceCriteria: string[];
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
    httpConcurrencyChecks?: number;
    httpConcurrentRequests?: number;
    httpConcurrentFailed?: number;
    httpConcurrentBlocked?: number;
    browserChecks: Record<string, number>;
    browserToolCalls: Record<string, number>;
    browserNetworkErrors?: number;
    browserActions?: number;
    browserFailedActions?: number;
    browserAssertions?: number;
    browserFailedAssertions?: number;
    browserAcceptanceFlows?: number;
    browserFailedAcceptanceFlows?: number;
    browserMultiSessionScenarios?: number;
    browserMultiSessionSessions?: number;
    browserMultiSessionParallelGroups?: number;
    browserMultiSessionComparisons?: number;
    browserFailedSessionComparisons?: number;
    browserFailedMultiSessionScenarios?: number;
    browserStabilityGroups?: number;
    browserFlakyStabilityGroups?: number;
    browserStabilityRuns?: number;
    browserFailedStabilityRuns?: number;
    browserPlannedChecks?: number;
    browserExpectedRuns?: number;
    browserCoveredRuns?: number;
    browserMissingRuns?: number;
    browserDuplicateResults?: number;
    browserInvalidResults?: number;
    browserRecoveryAttempts?: number;
    browserRecoveredOperations?: number;
    browserFailedRecoveries?: number;
    browserUnsafeRetriesPrevented?: number;
    browserActionEffectChecks?: number;
    browserActionEffects?: number;
    browserFailedActionEffects?: number;
    browserCrossSessionActionEffects?: number;
    adversarialProbes?: number;
    adversarialPassed?: number;
    adversarialFailed?: number;
    adversarialBlocked?: number;
    adversarialRelevant?: number;
    adversarialUnlinked?: number;
    adversarialPassedRelevant?: number;
    acceptanceMatchedEvidence?: number;
    acceptanceFallbackEvidence?: number;
    acceptanceMissingEvidence?: number;
    browserProviderGaps?: number;
    artifacts: number;
  };
  browserNetworkSummary?: BrowserNetworkSummaryItem[];
  httpConcurrencySummary?: HttpConcurrencySummary;
  browserInteractionSummary?: BrowserInteractionSummaryItem[];
  browserFlowSummary?: BrowserFlowSummary;
  browserMultiSessionSummary?: BrowserMultiSessionSummary;
  browserStabilitySummary?: BrowserStabilitySummary;
  browserCheckExecutionCoverage?: BrowserCheckExecutionCoverageSummary;
  browserRecoverySummary?: BrowserRecoverySummary;
  browserActionEffectSummary?: BrowserActionEffectSummary;
  adversarialEvidenceSummary: AdversarialEvidenceSummary;
  acceptanceEvidenceGateSummary: AcceptanceEvidenceGateSummary;
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
  originalUserGoal: string;
  acceptanceCriteria: string[];
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
  httpConcurrencySummary?: HttpConcurrencySummary;
  browserInteractionSummary: BrowserInteractionSummaryItem[];
  browserFlowSummary?: BrowserFlowSummary;
  browserMultiSessionSummary?: BrowserMultiSessionSummary;
  browserStabilitySummary?: BrowserStabilitySummary;
  browserCheckExecutionCoverage?: BrowserCheckExecutionCoverageSummary;
  browserRecoverySummary?: BrowserRecoverySummary;
  browserActionEffectSummary?: BrowserActionEffectSummary;
  adversarialEvidenceSummary: AdversarialEvidenceSummary;
  acceptanceEvidenceGateSummary: AcceptanceEvidenceGateSummary;
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
