// Behavior-freeze split from types.ts (part 2/3).

import type {
  BrowserActionSpec,
  BrowserCheckSpec,
  BrowserSessionComparisonOperator,
  HttpCheckSpec,
  HttpConcurrencyAssertionSpec,
  TestAgentOptions,
  TestAgentRequiredCheck,
  TestAgentStatus,
} from "./types-specs";

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
  status: "passed" | "failed" | "blocked" | "skipped";
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
  planId: string;
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
  screenshotRefs?: Array<{
    stepName: string;
    path: string;
    kind: "failure" | "capture";
  }>;
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
  browserToolCallIds?: string[];
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

export type BrowserResourceType = "browser" | "browser_context" | "external_browser_session";
export type BrowserResourceLifecycleStatus = "open" | "released" | "retained" | "cleanup_failed";

export interface BrowserResourceLifecycleEvent {
  id: string;
  planId: string;
  provider: "playwright" | "mcp";
  resourceType: BrowserResourceType;
  scope: string;
  ownership: "owned" | "external";
  acquiredAt: string;
  releaseAttemptedAt?: string;
  releasedAt?: string;
  status: BrowserResourceLifecycleStatus;
  error?: string;
}

export interface BrowserResourceLifecycleRecorder {
  acquire: (input: Omit<BrowserResourceLifecycleEvent, "id" | "acquiredAt" | "status" | "ownership">) => string;
  retainExternal: (input: Omit<BrowserResourceLifecycleEvent, "id" | "acquiredAt" | "status" | "ownership">) => string;
  released: (id: string) => void;
  cleanupFailed: (id: string, error: string) => void;
  getEvents: () => BrowserResourceLifecycleEvent[];
}

export type BrowserResourceLifecycleSummaryStatus = "complete" | "incomplete" | "invalid";

export interface BrowserResourceLifecycleSummary {
  status: BrowserResourceLifecycleSummaryStatus;
  eventCount: number;
  ownedResourceCount: number;
  externalResourceCount: number;
  releasedResourceCount: number;
  retainedExternalResourceCount: number;
  openResourceCount: number;
  cleanupFailureCount: number;
  planMismatchCount: number;
  duplicateResourceCount: number;
  invalidOwnershipCount: number;
  invalidTimestampCount: number;
  outsideReportWindowCount: number;
  resourceTypeCounts: Record<BrowserResourceType, number>;
  events: BrowserResourceLifecycleEvent[];
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
  planId: string;
  createdAt: string;
  preferredProvider: string;
  plannedCheckCount: number;
  expectedRunCount: number;
  items: BrowserCheckExecutionPlanItem[];
}

export type BrowserEvidenceTemporalIntegrityStatus = "complete" | "invalid";

export interface BrowserEvidenceTemporalIntegrityItem {
  kind: "report" | "execution_plan" | "browser_result" | "browser_tool_call";
  id: string;
  checkId?: string;
  run?: number;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  status: BrowserEvidenceTemporalIntegrityStatus;
  errors: string[];
}

export interface BrowserEvidenceTemporalIntegritySummary {
  status: BrowserEvidenceTemporalIntegrityStatus;
  toleranceMs: number;
  reportDurationMs: number;
  browserResultCount: number;
  browserToolCallCount: number;
  invalidItemCount: number;
  invalidTimestampCount: number;
  durationMismatchCount: number;
  outsideReportWindowCount: number;
  outsideResultWindowCount: number;
  planMismatchCount: number;
  items: BrowserEvidenceTemporalIntegrityItem[];
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

export type BrowserToolEvidenceLineageStatus = "complete" | "incomplete" | "invalid";

export interface BrowserToolEvidenceLineageItem {
  checkId: string;
  run: number;
  project: string;
  name: string;
  resultStatus: BrowserCheckResult["status"];
  evidenceRequired: boolean;
  toolCallIds: string[];
  linkedToolCallCount: number;
  failedToolCallCount: number;
  missingToolCallIds: string[];
  foreignToolCallIds: string[];
  duplicateToolCallIds: string[];
  status: BrowserToolEvidenceLineageStatus;
}

export interface BrowserToolEvidenceLineageSummary {
  status: BrowserToolEvidenceLineageStatus;
  mcpResultCount: number;
  evidenceRequiredResultCount: number;
  linkedResultCount: number;
  toolCallCount: number;
  scopedToolCallCount: number;
  linkedToolCallCount: number;
  failedToolCallCount: number;
  unlinkedRequiredResultCount: number;
  missingToolCallReferenceCount: number;
  foreignToolCallReferenceCount: number;
  duplicateToolCallReferenceCount: number;
  duplicateToolCallRecordCount: number;
  orphanScopedToolCallCount: number;
  unscopedToolCallCount: number;
  statusCounts: Record<BrowserToolEvidenceLineageStatus, number>;
  items: BrowserToolEvidenceLineageItem[];
}

export interface BrowserToolCallTimeoutSummaryItem {
  id: string;
  toolName: string;
  checkId?: string;
  run?: number;
  timeoutMs: number;
  durationMs: number;
  abortRequested: boolean;
}

export interface BrowserToolCallTimeoutSummary {
  totalCalls: number;
  passedCalls: number;
  failedCalls: number;
  timedOutCalls: number;
  abortRequestedCalls: number;
  timedOutByTool: Record<string, number>;
  items: BrowserToolCallTimeoutSummaryItem[];
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
