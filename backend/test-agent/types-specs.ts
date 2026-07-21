// Behavior-freeze split from types.ts (part 1/3).

import type {
  BrowserActionEffectSignal,
  BrowserAuthenticationConfig,
  BrowserAuthenticationMode,
  BrowserCheckExecutionIdentity,
  BrowserExistingSessionEvidencePolicy,
  BrowserExistingSessionProvider,
  BrowserResourceLifecycleRecorder,
} from "./types-results";

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
  agenticPlanning?: boolean;
}

export interface TestAgentBrowserToolExecutor {
  listTools?: (options?: { signal?: AbortSignal; timeoutMs?: number }) => Promise<string[]> | string[];
  callTool: (
    toolName: string,
    input: Record<string, any>,
    options?: { signal?: AbortSignal; timeoutMs?: number },
  ) => Promise<any>;
}

export interface BrowserToolCallRecord {
  id: string;
  toolName: string;
  input: Record<string, any>;
  status: "passed" | "failed";
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  browserExecution?: BrowserCheckExecutionIdentity;
  timeoutMs?: number;
  timedOut?: boolean;
  abortRequested?: boolean;
  outputPreview?: string;
  error?: string;
}

export interface TestAgentRuntimeOptions extends Partial<TestAgentOptions> {
  runtimeProjectEnvironments?: Record<string, Record<string, string>>;
  browserToolExecutor?: TestAgentBrowserToolExecutor;
  browserToolCallScope?: <T>(execution: BrowserCheckExecutionIdentity, task: () => Promise<T>) => Promise<T>;
  browserToolCallIdsForExecution?: (execution: BrowserCheckExecutionIdentity) => string[];
  browserResourceLifecycle?: BrowserResourceLifecycleRecorder;
  agenticPlanner?: (input: import("./agentic-planner").AgenticTestPlanningInput) => Promise<import("./agentic-planner").AgenticTestPlan>;
  agenticFollowupPlanner?: (input: import("./agentic-planner").AgenticTestFollowupInput) => Promise<import("./agentic-planner").AgenticTestFollowupPlan>;
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
