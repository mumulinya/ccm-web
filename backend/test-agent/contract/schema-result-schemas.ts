// Behavior-freeze split from schema.ts (part 2/3).
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

import {
  optionalString,
  stringList,
  timeoutMs,
} from "./schema-input-contracts";

export const agentStatus = z.enum(["passed", "failed", "blocked", "partial"]);
export const resultStatus = z.enum(["passed", "failed", "blocked", "skipped", "timed_out", "started", "already_running"]);

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

export const httpCheckResultSchema = z.object({
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

export const httpConcurrencySummarySchema = z.object({
  checks: z.number().int().nonnegative(),
  requests: z.number().int().nonnegative(),
  completed: z.number().int().nonnegative(),
  passed: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  blocked: z.number().int().nonnegative(),
  maxInFlight: z.number().int().nonnegative(),
  items: z.array(httpConcurrencySummaryItemSchema),
}).passthrough();

export const evidenceSchema = z.object({
  type: z.string().min(1),
  project: optionalString,
  title: z.string().min(1),
  status: z.string().min(1),
  detail: optionalString,
  path: optionalString,
}).passthrough();

export const requiredCheckCoverageSchema = z.object({
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

export const requiredCheckSummarySchema = z.object({
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

export const adversarialEvidenceSummarySchema = z.object({
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

export const acceptanceCoverageSchema = z.object({
  criterion: z.string(),
  status: z.enum(["verified", "not_verified", "unknown"]),
  evidence: stringList,
  matchStrength: z.enum(["direct", "token", "fallback", "none"]).optional(),
  matchScore: z.number().optional(),
  evidenceSource: z.enum(["matched_evidence", "single_criterion_report_status", "none"]).optional(),
}).passthrough();

export const acceptanceEvidenceGateSummarySchema = z.object({
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

export const acceptanceSummarySchema = z.object({
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

export const browserNetworkSummarySchema = z.object({
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

export const browserInteractionSummarySchema = z.object({
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

export const browserFlowSummarySchema = z.object({
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

export const browserMultiSessionSummarySchema = z.object({
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

export const browserStabilitySummarySchema = z.object({
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

export const browserCheckExecutionIdentitySchema = z.object({
  planId: z.string().min(1),
  checkId: z.string().min(1),
  projectIndex: z.number().int().nonnegative(),
  checkIndex: z.number().int().nonnegative(),
  run: z.number().int().positive(),
  expectedRuns: z.number().int().min(1).max(10),
  evidence: z.enum(["provider", "synthetic_missing"]),
}).strict();

const browserCheckExecutionPlanItemSchema = z.object({
  checkId: z.string().min(1),
  project: z.string().min(1),
  projectIndex: z.number().int().nonnegative(),
  checkIndex: z.number().int().nonnegative(),
  name: z.string().min(1),
  url: z.string(),
  expectedRuns: z.number().int().min(1).max(10),
  plannedProvider: z.enum(["playwright", "mcp", "none"]),
  providerRoutingReason: z.string().min(1),
  adversarial: z.boolean(),
  probeType: optionalString,
}).strict();

export const browserCheckExecutionPlanSchema = z.object({
  schema: z.literal("ccm-test-agent-browser-execution-plan-v1"),
  planId: z.string().min(1),
  createdAt: z.string().min(1),
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
  expectedRuns: z.number().int().min(1).max(10),
  observedRuns: z.array(z.number().int().positive()),
  missingRuns: z.array(z.number().int().positive()),
  duplicateRuns: z.array(z.number().int().positive()),
  syntheticBlockedRuns: z.array(z.number().int().positive()),
  status: z.enum(["complete", "incomplete", "invalid"]),
}).strict();

export const browserCheckExecutionCoverageSchema = z.object({
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

const browserEvidenceTemporalIntegrityItemSchema = z.object({
  kind: z.enum(["report", "execution_plan", "browser_result", "browser_tool_call"]),
  id: z.string().min(1),
  checkId: optionalString,
  run: z.number().int().positive().optional(),
  startedAt: z.string().min(1),
  finishedAt: z.string().min(1),
  durationMs: z.number().nonnegative(),
  status: z.enum(["complete", "invalid"]),
  errors: stringList,
}).strict();

export const browserEvidenceTemporalIntegritySchema = z.object({
  status: z.enum(["complete", "invalid"]),
  toleranceMs: z.number().int().nonnegative(),
  reportDurationMs: z.number().nonnegative(),
  browserResultCount: z.number().int().nonnegative(),
  browserToolCallCount: z.number().int().nonnegative(),
  invalidItemCount: z.number().int().nonnegative(),
  invalidTimestampCount: z.number().int().nonnegative(),
  durationMismatchCount: z.number().int().nonnegative(),
  outsideReportWindowCount: z.number().int().nonnegative(),
  outsideResultWindowCount: z.number().int().nonnegative(),
  planMismatchCount: z.number().int().nonnegative(),
  items: z.array(browserEvidenceTemporalIntegrityItemSchema),
}).strict();

export const browserResourceLifecycleEventSchema = z.object({
  id: z.string().min(1),
  planId: z.string().min(1),
  provider: z.enum(["playwright", "mcp"]),
  resourceType: z.enum(["browser", "browser_context", "external_browser_session"]),
  scope: z.string().min(1),
  ownership: z.enum(["owned", "external"]),
  acquiredAt: z.string().min(1),
  releaseAttemptedAt: optionalString,
  releasedAt: optionalString,
  status: z.enum(["open", "released", "retained", "cleanup_failed"]),
  error: optionalString,
}).strict();

export const browserResourceLifecycleSummarySchema = z.object({
  status: z.enum(["complete", "incomplete", "invalid"]),
  eventCount: z.number().int().nonnegative(),
  ownedResourceCount: z.number().int().nonnegative(),
  externalResourceCount: z.number().int().nonnegative(),
  releasedResourceCount: z.number().int().nonnegative(),
  retainedExternalResourceCount: z.number().int().nonnegative(),
  openResourceCount: z.number().int().nonnegative(),
  cleanupFailureCount: z.number().int().nonnegative(),
  planMismatchCount: z.number().int().nonnegative(),
  duplicateResourceCount: z.number().int().nonnegative(),
  invalidOwnershipCount: z.number().int().nonnegative(),
  invalidTimestampCount: z.number().int().nonnegative(),
  outsideReportWindowCount: z.number().int().nonnegative(),
  resourceTypeCounts: z.object({
    browser: z.number().int().nonnegative(),
    browser_context: z.number().int().nonnegative(),
    external_browser_session: z.number().int().nonnegative(),
  }).strict(),
  events: z.array(browserResourceLifecycleEventSchema),
}).strict();

const browserToolEvidenceLineageItemSchema = z.object({
  checkId: z.string().min(1),
  run: z.number().int().positive(),
  project: z.string(),
  name: z.string(),
  resultStatus,
  evidenceRequired: z.boolean(),
  toolCallIds: stringList,
  linkedToolCallCount: z.number().int().nonnegative(),
  failedToolCallCount: z.number().int().nonnegative(),
  missingToolCallIds: stringList,
  foreignToolCallIds: stringList,
  duplicateToolCallIds: stringList,
  status: z.enum(["complete", "incomplete", "invalid"]),
}).strict();

export const browserToolEvidenceLineageSchema = z.object({
  status: z.enum(["complete", "incomplete", "invalid"]),
  mcpResultCount: z.number().int().nonnegative(),
  evidenceRequiredResultCount: z.number().int().nonnegative(),
  linkedResultCount: z.number().int().nonnegative(),
  toolCallCount: z.number().int().nonnegative(),
  scopedToolCallCount: z.number().int().nonnegative(),
  linkedToolCallCount: z.number().int().nonnegative(),
  failedToolCallCount: z.number().int().nonnegative(),
  unlinkedRequiredResultCount: z.number().int().nonnegative(),
  missingToolCallReferenceCount: z.number().int().nonnegative(),
  foreignToolCallReferenceCount: z.number().int().nonnegative(),
  duplicateToolCallReferenceCount: z.number().int().nonnegative(),
  duplicateToolCallRecordCount: z.number().int().nonnegative(),
  orphanScopedToolCallCount: z.number().int().nonnegative(),
  unscopedToolCallCount: z.number().int().nonnegative(),
  statusCounts: z.object({
    complete: z.number().int().nonnegative(),
    incomplete: z.number().int().nonnegative(),
    invalid: z.number().int().nonnegative(),
  }).strict(),
  items: z.array(browserToolEvidenceLineageItemSchema),
}).strict();

const browserToolCallTimeoutSummaryItemSchema = z.object({
  id: z.string().min(1),
  toolName: z.string().min(1),
  checkId: optionalString,
  run: z.number().int().positive().optional(),
  timeoutMs: z.number().int().min(1_000),
  durationMs: z.number().nonnegative(),
  abortRequested: z.boolean(),
}).strict();

export const browserToolCallTimeoutSummarySchema = z.object({
  totalCalls: z.number().int().nonnegative(),
  passedCalls: z.number().int().nonnegative(),
  failedCalls: z.number().int().nonnegative(),
  timedOutCalls: z.number().int().nonnegative(),
  abortRequestedCalls: z.number().int().nonnegative(),
  timedOutByTool: z.record(z.number().int().nonnegative()),
  items: z.array(browserToolCallTimeoutSummaryItemSchema),
}).strict();

export const browserProviderGapSchema = z.object({
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

export const browserProviderSummarySchema = z.object({
  preferred: z.string(),
  status: z.enum(["not_required", "provider_none", "ready", "used", "blocked", "unavailable"]),
  selectedProvider: optionalString,
  selectedProviders: stringList.optional(),
  availableProviders: stringList,
  attemptedProviders: stringList,
  fallbackUsed: z.boolean(),
  items: z.array(browserProviderSummaryItemSchema),
}).passthrough();

export const failureSummarySchema = z.object({
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

export const browserRecoverySummarySchema = z.object({
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

export const browserActionEffectSummarySchema = z.object({
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

export const browserCheckResultSchema = z.object({
  status: resultStatus,
  execution: browserCheckExecutionIdentitySchema.optional(),
  browserToolCallIds: stringList.optional(),
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

export function validateMinimalBrowserToolCalls(value: Record<string, any>, ctx: z.RefinementCtx) {
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
