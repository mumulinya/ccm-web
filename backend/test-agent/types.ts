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
  adversarial?: boolean;
  probeType?: string;
  probe_type?: string;
  timeoutMs?: number;
  timeout_ms?: number;
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
    | "fill"
    | "selectOption"
    | "check"
    | "uncheck"
    | "hover"
    | "press"
    | "scroll"
    | "openApplication"
    | "requestAccess"
    | "reload"
    | "goBack"
    | "goForward"
    | "waitForSelector"
    | "waitForText"
    | "waitForTimeout"
    | "evaluate";
  selector?: string;
  locator?: string;
  text?: string;
  value?: string;
  url?: string;
  key?: string;
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
  coordinate?: [number, number];
  startCoordinate?: [number, number];
  start_coordinate?: [number, number];
  direction?: "up" | "down" | "left" | "right";
  amount?: number;
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
    | "text"
    | "urlIncludes"
    | "titleIncludes"
    | "elementTextIncludes"
    | "networkNoErrors"
    | "consoleNoErrors"
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
  status: "passed" | "failed" | "blocked" | "skipped";
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  steps: BrowserStepResult[];
  screenshots: string[];
  consoleMessages?: string[];
  consoleErrors: string[];
  pageErrors: string[];
  networkRequests?: string[];
  networkErrors?: string[];
  consoleLogPath?: string;
  networkLogPath?: string;
  browserArtifacts?: BrowserEvidenceArtifact[];
  adversarial?: boolean;
  probeType?: string;
  error?: string;
}

export interface BrowserEvidenceArtifact {
  type: "trace" | "har" | "video" | "download" | "metadata" | "other";
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

export interface AcceptanceCoverageItem {
  criterion: string;
  status: "verified" | "not_verified" | "unknown";
  evidence: string[];
}

export interface RequiredCheckCoverageItem {
  check: string;
  status: "verified" | "not_verified" | "unknown";
  evidence: string[];
  missingReason?: string;
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
    | "artifact_manifest"
    | "screenshot"
    | "browser_snapshot"
    | "browser_console_log"
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
    browserConsoleLogs: number;
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
  requiredCheckCoverage: RequiredCheckCoverageItem[];
  acceptanceCoverage: AcceptanceCoverageItem[];
  evidence: EvidenceItem[];
  risks: string[];
  blockedReasons: string[];
  issues: WorkOrderIssue[];
  metadata: Record<string, any>;
}
