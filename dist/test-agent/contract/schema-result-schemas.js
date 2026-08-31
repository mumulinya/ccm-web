"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.browserCheckResultSchema = exports.browserActionEffectSummarySchema = exports.browserRecoverySummarySchema = exports.failureSummarySchema = exports.browserProviderSummarySchema = exports.browserProviderGapSchema = exports.browserToolCallTimeoutSummarySchema = exports.browserToolEvidenceLineageSchema = exports.browserResourceLifecycleSummarySchema = exports.browserResourceLifecycleEventSchema = exports.browserEvidenceTemporalIntegritySchema = exports.browserCheckExecutionCoverageSchema = exports.browserCheckExecutionPlanSchema = exports.browserCheckExecutionIdentitySchema = exports.browserStabilitySummarySchema = exports.browserMultiSessionSummarySchema = exports.browserFlowSummarySchema = exports.browserInteractionSummarySchema = exports.browserNetworkSummarySchema = exports.acceptanceSummarySchema = exports.acceptanceEvidenceGateSummarySchema = exports.acceptanceCoverageSchema = exports.adversarialEvidenceSummarySchema = exports.requiredCheckSummarySchema = exports.requiredCheckCoverageSchema = exports.evidenceSchema = exports.httpConcurrencySummarySchema = exports.httpCheckResultSchema = exports.resultStatus = exports.agentStatus = void 0;
exports.validateMinimalBrowserToolCalls = validateMinimalBrowserToolCalls;
// Behavior-freeze split from schema.ts (part 2/3).
const zod_1 = require("zod");
const recovery_validation_1 = require("../browser/recovery-validation");
const action_effects_1 = require("../browser/action-effects");
const action_effect_summary_1 = require("../browser/action-effect-summary");
const http_concurrency_1 = require("../http-concurrency");
const schema_input_contracts_1 = require("./schema-input-contracts");
exports.agentStatus = zod_1.z.enum(["passed", "failed", "blocked", "partial"]);
exports.resultStatus = zod_1.z.enum(["passed", "failed", "blocked", "skipped", "timed_out", "started", "already_running"]);
const httpAssertionResultSchema = zod_1.z.object({
    name: zod_1.z.string(),
    status: zod_1.z.enum(["passed", "failed", "skipped"]),
    detail: schema_input_contracts_1.optionalString,
    error: schema_input_contracts_1.optionalString,
}).passthrough();
const httpConcurrencyAssertionSpecSchema = zod_1.z.object({
    type: zod_1.z.enum(["responseCount", "statusCount", "jsonPathUniqueCount", "jsonPathAllEqual"]),
    status: zod_1.z.number().int().min(100).max(599).optional(),
    statusCode: zod_1.z.number().int().min(100).max(599).optional(),
    status_code: zod_1.z.number().int().min(100).max(599).optional(),
    path: schema_input_contracts_1.optionalString,
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
    responsePreview: schema_input_contracts_1.optionalString,
    error: schema_input_contracts_1.optionalString,
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
exports.httpCheckResultSchema = zod_1.z.object({
    project: zod_1.z.string(),
    name: schema_input_contracts_1.optionalString,
    url: zod_1.z.string(),
    method: schema_input_contracts_1.optionalString,
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
        source: schema_input_contracts_1.optionalString,
        discoveredFrom: schema_input_contracts_1.optionalString,
        finalUrl: schema_input_contracts_1.optionalString,
        redirectCount: zod_1.z.number().int().nonnegative().optional(),
        expectedContentTypes: schema_input_contracts_1.stringList.optional(),
        contentTypeMatched: zod_1.z.boolean().optional(),
        error: schema_input_contracts_1.optionalString,
    }).passthrough()),
    assertions: zod_1.z.array(httpAssertionResultSchema).optional(),
    responsePreview: schema_input_contracts_1.optionalString,
    adversarial: zod_1.z.boolean().optional(),
    probeType: schema_input_contracts_1.optionalString,
    context: zod_1.z.record(zod_1.z.any()).optional(),
    concurrency: httpConcurrencyEvidenceSchema.optional(),
    error: schema_input_contracts_1.optionalString,
}).passthrough();
const httpConcurrencySummaryItemSchema = zod_1.z.object({
    project: zod_1.z.string(),
    name: zod_1.z.string(),
    status: zod_1.z.enum(["passed", "failed", "blocked", "skipped"]),
    probeType: schema_input_contracts_1.optionalString,
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
exports.httpConcurrencySummarySchema = zod_1.z.object({
    checks: zod_1.z.number().int().nonnegative(),
    requests: zod_1.z.number().int().nonnegative(),
    completed: zod_1.z.number().int().nonnegative(),
    passed: zod_1.z.number().int().nonnegative(),
    failed: zod_1.z.number().int().nonnegative(),
    blocked: zod_1.z.number().int().nonnegative(),
    maxInFlight: zod_1.z.number().int().nonnegative(),
    items: zod_1.z.array(httpConcurrencySummaryItemSchema),
}).passthrough();
exports.evidenceSchema = zod_1.z.object({
    type: zod_1.z.string().min(1),
    project: schema_input_contracts_1.optionalString,
    title: zod_1.z.string().min(1),
    status: zod_1.z.string().min(1),
    detail: schema_input_contracts_1.optionalString,
    path: schema_input_contracts_1.optionalString,
}).passthrough();
exports.requiredCheckCoverageSchema = zod_1.z.object({
    check: zod_1.z.string(),
    status: zod_1.z.enum(["verified", "not_verified", "unknown"]),
    evidence: schema_input_contracts_1.stringList,
    missingReason: schema_input_contracts_1.optionalString,
}).passthrough();
const requiredCheckSummaryItemSchema = zod_1.z.object({
    check: zod_1.z.string(),
    status: zod_1.z.enum(["verified", "not_verified", "unknown"]),
    evidence: schema_input_contracts_1.stringList,
    missingReason: schema_input_contracts_1.optionalString,
}).passthrough();
exports.requiredCheckSummarySchema = zod_1.z.object({
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
    probeType: schema_input_contracts_1.optionalString,
    provider: zod_1.z.enum(["playwright", "mcp", "none"]).optional(),
    relevance: zod_1.z.enum(["explicit", "inferred", "none"]),
    linkedCriteria: schema_input_contracts_1.stringList,
    goalLinked: zod_1.z.boolean(),
    matchScore: zod_1.z.number().min(0).max(1),
}).passthrough();
exports.adversarialEvidenceSummarySchema = zod_1.z.object({
    required: zod_1.z.boolean(),
    waived: zod_1.z.boolean(),
    waiverReason: schema_input_contracts_1.optionalString,
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
    criteriaCovered: schema_input_contracts_1.stringList,
    probeTypes: schema_input_contracts_1.stringList,
    items: zod_1.z.array(adversarialEvidenceSummaryItemSchema),
}).passthrough();
exports.acceptanceCoverageSchema = zod_1.z.object({
    criterion: zod_1.z.string(),
    status: zod_1.z.enum(["verified", "not_verified", "unknown"]),
    evidence: schema_input_contracts_1.stringList,
    matchStrength: zod_1.z.enum(["direct", "token", "fallback", "none"]).optional(),
    matchScore: zod_1.z.number().optional(),
    evidenceSource: zod_1.z.enum(["matched_evidence", "single_criterion_report_status", "none"]).optional(),
}).passthrough();
exports.acceptanceEvidenceGateSummarySchema = zod_1.z.object({
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
    failedCriteria: schema_input_contracts_1.stringList,
    incompleteCriteria: schema_input_contracts_1.stringList,
    weakCriteria: schema_input_contracts_1.stringList,
}).passthrough();
const acceptanceSummaryItemSchema = zod_1.z.object({
    criterion: zod_1.z.string(),
    status: zod_1.z.enum(["verified", "not_verified", "unknown"]),
    evidence: schema_input_contracts_1.stringList,
    matchStrength: zod_1.z.enum(["direct", "token", "fallback", "none"]).optional(),
    matchScore: zod_1.z.number().optional(),
    evidenceSource: zod_1.z.enum(["matched_evidence", "single_criterion_report_status", "none"]).optional(),
}).passthrough();
exports.acceptanceSummarySchema = zod_1.z.object({
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
exports.browserNetworkSummarySchema = zod_1.z.object({
    project: zod_1.z.string(),
    name: zod_1.z.string(),
    provider: schema_input_contracts_1.optionalString,
    status: zod_1.z.string(),
    url: zod_1.z.string(),
    finalUrl: schema_input_contracts_1.optionalString,
    requestCount: zod_1.z.number(),
    responseCount: zod_1.z.number(),
    failedRequestCount: zod_1.z.number(),
    failedResponseCount: zod_1.z.number(),
    errorCount: zod_1.z.number(),
    statusCodes: zod_1.z.record(zod_1.z.number()),
    resourceTypes: zod_1.z.record(zod_1.z.number()),
    failureKinds: zod_1.z.record(zod_1.z.number()),
    failedUrls: schema_input_contracts_1.stringList,
    errors: schema_input_contracts_1.stringList,
    networkLogPath: schema_input_contracts_1.optionalString,
}).passthrough();
const browserInteractionSummaryStepSchema = zod_1.z.object({
    kind: zod_1.z.enum(["action", "assertion"]),
    name: zod_1.z.string(),
    status: zod_1.z.enum(["passed", "failed", "skipped"]),
    detail: schema_input_contracts_1.optionalString,
    error: schema_input_contracts_1.optionalString,
}).passthrough();
exports.browserInteractionSummarySchema = zod_1.z.object({
    project: zod_1.z.string(),
    name: zod_1.z.string(),
    provider: schema_input_contracts_1.optionalString,
    status: zod_1.z.string(),
    url: zod_1.z.string(),
    finalUrl: schema_input_contracts_1.optionalString,
    probeType: schema_input_contracts_1.optionalString,
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
    error: schema_input_contracts_1.optionalString,
    failedSteps: schema_input_contracts_1.stringList,
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
    criteria: schema_input_contracts_1.stringList,
    projects: schema_input_contracts_1.stringList,
    providers: schema_input_contracts_1.stringList,
    actionCount: zod_1.z.number().int().nonnegative(),
    assertionCount: zod_1.z.number().int().nonnegative(),
    failedStepCount: zod_1.z.number().int().nonnegative(),
    failures: zod_1.z.array(browserFlowSummaryFailureSchema),
}).passthrough();
exports.browserFlowSummarySchema = zod_1.z.object({
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
    finalUrl: schema_input_contracts_1.optionalString,
    screenshotCount: zod_1.z.number().int().nonnegative(),
    consoleErrorCount: zod_1.z.number().int().nonnegative(),
    pageErrorCount: zod_1.z.number().int().nonnegative(),
    networkErrorCount: zod_1.z.number().int().nonnegative(),
}).passthrough();
const browserMultiSessionSummaryItemSchema = zod_1.z.object({
    project: zod_1.z.string(),
    name: zod_1.z.string(),
    provider: schema_input_contracts_1.optionalString,
    status: exports.resultStatus,
    probeType: schema_input_contracts_1.optionalString,
    sessionCount: zod_1.z.number().int().nonnegative(),
    sessionNames: schema_input_contracts_1.stringList,
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
    failedSessionNames: schema_input_contracts_1.stringList,
    failedSteps: schema_input_contracts_1.stringList,
}).passthrough();
exports.browserMultiSessionSummarySchema = zod_1.z.object({
    total: zod_1.z.number().int().nonnegative(),
    statusCounts: browserFlowStatusCountsSchema,
    sessionCount: zod_1.z.number().int().nonnegative(),
    uniqueSessionCount: zod_1.z.number().int().nonnegative(),
    sessionNames: schema_input_contracts_1.stringList,
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
    provider: schema_input_contracts_1.optionalString,
    probeType: schema_input_contracts_1.optionalString,
    expectedRuns: zod_1.z.number().int().min(2).max(10),
    runCount: zod_1.z.number().int().nonnegative(),
    status: zod_1.z.enum(["stable_pass", "stable_fail", "flaky", "blocked"]),
    statusCounts: browserFlowStatusCountsSchema,
    failedRuns: zod_1.z.array(zod_1.z.number().int().positive()),
    blockedRuns: zod_1.z.array(zod_1.z.number().int().positive()),
    skippedRuns: zod_1.z.array(zod_1.z.number().int().positive()),
    durationMs: zod_1.z.number().nonnegative(),
    screenshotCount: zod_1.z.number().int().nonnegative(),
    firstFailure: schema_input_contracts_1.optionalString,
}).passthrough();
exports.browserStabilitySummarySchema = zod_1.z.object({
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
exports.browserCheckExecutionIdentitySchema = zod_1.z.object({
    planId: zod_1.z.string().min(1),
    checkId: zod_1.z.string().min(1),
    projectIndex: zod_1.z.number().int().nonnegative(),
    checkIndex: zod_1.z.number().int().nonnegative(),
    run: zod_1.z.number().int().positive(),
    expectedRuns: zod_1.z.number().int().min(1).max(10),
    evidence: zod_1.z.enum(["provider", "synthetic_missing"]),
}).strict();
const browserCheckExecutionPlanItemSchema = zod_1.z.object({
    checkId: zod_1.z.string().min(1),
    project: zod_1.z.string().min(1),
    projectIndex: zod_1.z.number().int().nonnegative(),
    checkIndex: zod_1.z.number().int().nonnegative(),
    name: zod_1.z.string().min(1),
    url: zod_1.z.string(),
    expectedRuns: zod_1.z.number().int().min(1).max(10),
    plannedProvider: zod_1.z.enum(["playwright", "mcp", "none"]),
    providerRoutingReason: zod_1.z.string().min(1),
    adversarial: zod_1.z.boolean(),
    probeType: schema_input_contracts_1.optionalString,
}).strict();
exports.browserCheckExecutionPlanSchema = zod_1.z.object({
    schema: zod_1.z.literal("ccm-test-agent-browser-execution-plan-v1"),
    planId: zod_1.z.string().min(1),
    createdAt: zod_1.z.string().min(1),
    preferredProvider: zod_1.z.string().min(1),
    plannedCheckCount: zod_1.z.number().int().nonnegative(),
    expectedRunCount: zod_1.z.number().int().nonnegative(),
    items: zod_1.z.array(browserCheckExecutionPlanItemSchema),
}).strict();
const browserCheckExecutionCoverageItemSchema = zod_1.z.object({
    checkId: zod_1.z.string().min(1),
    project: zod_1.z.string(),
    name: zod_1.z.string(),
    plannedProvider: zod_1.z.enum(["playwright", "mcp", "none"]),
    expectedRuns: zod_1.z.number().int().min(1).max(10),
    observedRuns: zod_1.z.array(zod_1.z.number().int().positive()),
    missingRuns: zod_1.z.array(zod_1.z.number().int().positive()),
    duplicateRuns: zod_1.z.array(zod_1.z.number().int().positive()),
    syntheticBlockedRuns: zod_1.z.array(zod_1.z.number().int().positive()),
    status: zod_1.z.enum(["complete", "incomplete", "invalid"]),
}).strict();
exports.browserCheckExecutionCoverageSchema = zod_1.z.object({
    status: zod_1.z.enum(["complete", "incomplete", "invalid"]),
    plannedCheckCount: zod_1.z.number().int().nonnegative(),
    expectedRunCount: zod_1.z.number().int().nonnegative(),
    coveredRunCount: zod_1.z.number().int().nonnegative(),
    missingRunCount: zod_1.z.number().int().nonnegative(),
    providerResultCount: zod_1.z.number().int().nonnegative(),
    duplicateResultCount: zod_1.z.number().int().nonnegative(),
    invalidResultCount: zod_1.z.number().int().nonnegative(),
    diagnosticResultCount: zod_1.z.number().int().nonnegative(),
    syntheticBlockedCount: zod_1.z.number().int().nonnegative(),
    statusCounts: zod_1.z.object({
        complete: zod_1.z.number().int().nonnegative(),
        incomplete: zod_1.z.number().int().nonnegative(),
        invalid: zod_1.z.number().int().nonnegative(),
    }).strict(),
    items: zod_1.z.array(browserCheckExecutionCoverageItemSchema),
}).strict();
const browserEvidenceTemporalIntegrityItemSchema = zod_1.z.object({
    kind: zod_1.z.enum(["report", "execution_plan", "browser_result", "browser_tool_call"]),
    id: zod_1.z.string().min(1),
    checkId: schema_input_contracts_1.optionalString,
    run: zod_1.z.number().int().positive().optional(),
    startedAt: zod_1.z.string().min(1),
    finishedAt: zod_1.z.string().min(1),
    durationMs: zod_1.z.number().nonnegative(),
    status: zod_1.z.enum(["complete", "invalid"]),
    errors: schema_input_contracts_1.stringList,
}).strict();
exports.browserEvidenceTemporalIntegritySchema = zod_1.z.object({
    status: zod_1.z.enum(["complete", "invalid"]),
    toleranceMs: zod_1.z.number().int().nonnegative(),
    reportDurationMs: zod_1.z.number().nonnegative(),
    browserResultCount: zod_1.z.number().int().nonnegative(),
    browserToolCallCount: zod_1.z.number().int().nonnegative(),
    invalidItemCount: zod_1.z.number().int().nonnegative(),
    invalidTimestampCount: zod_1.z.number().int().nonnegative(),
    durationMismatchCount: zod_1.z.number().int().nonnegative(),
    outsideReportWindowCount: zod_1.z.number().int().nonnegative(),
    outsideResultWindowCount: zod_1.z.number().int().nonnegative(),
    planMismatchCount: zod_1.z.number().int().nonnegative(),
    items: zod_1.z.array(browserEvidenceTemporalIntegrityItemSchema),
}).strict();
exports.browserResourceLifecycleEventSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    planId: zod_1.z.string().min(1),
    provider: zod_1.z.enum(["playwright", "mcp"]),
    resourceType: zod_1.z.enum(["browser", "browser_context", "external_browser_session"]),
    scope: zod_1.z.string().min(1),
    ownership: zod_1.z.enum(["owned", "external"]),
    acquiredAt: zod_1.z.string().min(1),
    releaseAttemptedAt: schema_input_contracts_1.optionalString,
    releasedAt: schema_input_contracts_1.optionalString,
    status: zod_1.z.enum(["open", "released", "retained", "cleanup_failed"]),
    error: schema_input_contracts_1.optionalString,
}).strict();
exports.browserResourceLifecycleSummarySchema = zod_1.z.object({
    status: zod_1.z.enum(["complete", "incomplete", "invalid"]),
    eventCount: zod_1.z.number().int().nonnegative(),
    ownedResourceCount: zod_1.z.number().int().nonnegative(),
    externalResourceCount: zod_1.z.number().int().nonnegative(),
    releasedResourceCount: zod_1.z.number().int().nonnegative(),
    retainedExternalResourceCount: zod_1.z.number().int().nonnegative(),
    openResourceCount: zod_1.z.number().int().nonnegative(),
    cleanupFailureCount: zod_1.z.number().int().nonnegative(),
    planMismatchCount: zod_1.z.number().int().nonnegative(),
    duplicateResourceCount: zod_1.z.number().int().nonnegative(),
    invalidOwnershipCount: zod_1.z.number().int().nonnegative(),
    invalidTimestampCount: zod_1.z.number().int().nonnegative(),
    outsideReportWindowCount: zod_1.z.number().int().nonnegative(),
    resourceTypeCounts: zod_1.z.object({
        browser: zod_1.z.number().int().nonnegative(),
        browser_context: zod_1.z.number().int().nonnegative(),
        external_browser_session: zod_1.z.number().int().nonnegative(),
    }).strict(),
    events: zod_1.z.array(exports.browserResourceLifecycleEventSchema),
}).strict();
const browserToolEvidenceLineageItemSchema = zod_1.z.object({
    checkId: zod_1.z.string().min(1),
    run: zod_1.z.number().int().positive(),
    project: zod_1.z.string(),
    name: zod_1.z.string(),
    resultStatus: exports.resultStatus,
    evidenceRequired: zod_1.z.boolean(),
    toolCallIds: schema_input_contracts_1.stringList,
    linkedToolCallCount: zod_1.z.number().int().nonnegative(),
    failedToolCallCount: zod_1.z.number().int().nonnegative(),
    missingToolCallIds: schema_input_contracts_1.stringList,
    foreignToolCallIds: schema_input_contracts_1.stringList,
    duplicateToolCallIds: schema_input_contracts_1.stringList,
    status: zod_1.z.enum(["complete", "incomplete", "invalid"]),
}).strict();
exports.browserToolEvidenceLineageSchema = zod_1.z.object({
    status: zod_1.z.enum(["complete", "incomplete", "invalid"]),
    mcpResultCount: zod_1.z.number().int().nonnegative(),
    evidenceRequiredResultCount: zod_1.z.number().int().nonnegative(),
    linkedResultCount: zod_1.z.number().int().nonnegative(),
    toolCallCount: zod_1.z.number().int().nonnegative(),
    scopedToolCallCount: zod_1.z.number().int().nonnegative(),
    linkedToolCallCount: zod_1.z.number().int().nonnegative(),
    failedToolCallCount: zod_1.z.number().int().nonnegative(),
    unlinkedRequiredResultCount: zod_1.z.number().int().nonnegative(),
    missingToolCallReferenceCount: zod_1.z.number().int().nonnegative(),
    foreignToolCallReferenceCount: zod_1.z.number().int().nonnegative(),
    duplicateToolCallReferenceCount: zod_1.z.number().int().nonnegative(),
    duplicateToolCallRecordCount: zod_1.z.number().int().nonnegative(),
    orphanScopedToolCallCount: zod_1.z.number().int().nonnegative(),
    unscopedToolCallCount: zod_1.z.number().int().nonnegative(),
    statusCounts: zod_1.z.object({
        complete: zod_1.z.number().int().nonnegative(),
        incomplete: zod_1.z.number().int().nonnegative(),
        invalid: zod_1.z.number().int().nonnegative(),
    }).strict(),
    items: zod_1.z.array(browserToolEvidenceLineageItemSchema),
}).strict();
const browserToolCallTimeoutSummaryItemSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    toolName: zod_1.z.string().min(1),
    checkId: schema_input_contracts_1.optionalString,
    run: zod_1.z.number().int().positive().optional(),
    timeoutMs: zod_1.z.number().int().min(1_000),
    durationMs: zod_1.z.number().nonnegative(),
    abortRequested: zod_1.z.boolean(),
}).strict();
exports.browserToolCallTimeoutSummarySchema = zod_1.z.object({
    totalCalls: zod_1.z.number().int().nonnegative(),
    passedCalls: zod_1.z.number().int().nonnegative(),
    failedCalls: zod_1.z.number().int().nonnegative(),
    timedOutCalls: zod_1.z.number().int().nonnegative(),
    abortRequestedCalls: zod_1.z.number().int().nonnegative(),
    timedOutByTool: zod_1.z.record(zod_1.z.number().int().nonnegative()),
    items: zod_1.z.array(browserToolCallTimeoutSummaryItemSchema),
}).strict();
exports.browserProviderGapSchema = zod_1.z.object({
    provider: zod_1.z.string(),
    project: schema_input_contracts_1.optionalString,
    check: zod_1.z.string(),
    kind: zod_1.z.enum(["action", "assertion", "provider"]),
    step: schema_input_contracts_1.optionalString,
    category: zod_1.z.enum(["unsupported_action", "unsupported_assertion", "missing_tool", "provider_unavailable", "provider_capability_gap"]),
    reason: zod_1.z.string(),
    recommendation: zod_1.z.string(),
}).passthrough();
const browserProviderSummaryItemSchema = zod_1.z.object({
    provider: zod_1.z.string(),
    label: schema_input_contracts_1.optionalString,
    preferred: zod_1.z.boolean(),
    available: zod_1.z.boolean(),
    selected: zod_1.z.boolean(),
    attempted: zod_1.z.boolean(),
    resultCount: zod_1.z.number().int().nonnegative(),
    passed: zod_1.z.number().int().nonnegative(),
    failed: zod_1.z.number().int().nonnegative(),
    blocked: zod_1.z.number().int().nonnegative(),
    skipped: zod_1.z.number().int().nonnegative(),
    reason: schema_input_contracts_1.optionalString,
    tools: schema_input_contracts_1.stringList.optional(),
    diagnostics: zod_1.z.record(zod_1.z.any()).optional(),
}).passthrough();
exports.browserProviderSummarySchema = zod_1.z.object({
    preferred: zod_1.z.string(),
    status: zod_1.z.enum(["not_required", "provider_none", "ready", "used", "blocked", "unavailable"]),
    selectedProvider: schema_input_contracts_1.optionalString,
    selectedProviders: schema_input_contracts_1.stringList.optional(),
    availableProviders: schema_input_contracts_1.stringList,
    attemptedProviders: schema_input_contracts_1.stringList,
    fallbackUsed: zod_1.z.boolean(),
    items: zod_1.z.array(browserProviderSummaryItemSchema),
}).passthrough();
exports.failureSummarySchema = zod_1.z.object({
    type: zod_1.z.enum(["issue", "server", "command", "http", "browser", "required_check", "acceptance"]),
    project: schema_input_contracts_1.optionalString,
    title: zod_1.z.string(),
    status: zod_1.z.enum(["failed", "blocked", "not_verified", "unknown"]),
    reason: zod_1.z.string(),
    evidence: schema_input_contracts_1.stringList.optional(),
    nextAction: schema_input_contracts_1.optionalString,
    diagnostics: schema_input_contracts_1.stringList.optional(),
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
    finalUrl: schema_input_contracts_1.optionalString,
    title: schema_input_contracts_1.optionalString,
    pageTextPreview: schema_input_contracts_1.optionalString,
    screenshots: schema_input_contracts_1.stringList,
    pageSnapshots: schema_input_contracts_1.stringList.optional(),
    browserArtifacts: zod_1.z.array(zod_1.z.object({
        type: zod_1.z.string().min(1),
        title: zod_1.z.string().min(1),
        path: zod_1.z.string(),
    }).passthrough()).optional(),
    consoleErrors: schema_input_contracts_1.stringList,
    pageErrors: schema_input_contracts_1.stringList,
    networkErrors: schema_input_contracts_1.stringList,
    consoleLogPath: schema_input_contracts_1.optionalString,
    networkLogPath: schema_input_contracts_1.optionalString,
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
        left: schema_input_contracts_1.optionalString,
        right: schema_input_contracts_1.optionalString,
    }).passthrough().optional(),
    error: schema_input_contracts_1.optionalString,
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
exports.browserRecoverySummarySchema = zod_1.z.object({
    checks: zod_1.z.number().int().nonnegative(),
    attempted: zod_1.z.number().int().nonnegative(),
    recovered: zod_1.z.number().int().nonnegative(),
    failed: zod_1.z.number().int().nonnegative(),
    notRetried: zod_1.z.number().int().nonnegative(),
    items: zod_1.z.array(zod_1.z.object({
        project: zod_1.z.string(),
        name: zod_1.z.string(),
        provider: zod_1.z.enum(["playwright", "mcp", "none"]).optional(),
        status: exports.resultStatus,
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
    status: exports.resultStatus,
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
exports.browserActionEffectSummarySchema = zod_1.z.object({
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
exports.browserCheckResultSchema = zod_1.z.object({
    status: exports.resultStatus,
    execution: exports.browserCheckExecutionIdentitySchema.optional(),
    browserToolCallIds: schema_input_contracts_1.stringList.optional(),
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
//# sourceMappingURL=schema-result-schemas.js.map