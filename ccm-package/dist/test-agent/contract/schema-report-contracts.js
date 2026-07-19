"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestAgentInvocationResultContractSchema = exports.TestAgentInvocationRequestContractSchema = exports.TestAgentVerdictContractSchema = exports.TestAgentReportContractSchema = void 0;
// Behavior-freeze split from schema.ts (part 3/3).
const zod_1 = require("zod");
const action_effect_summary_1 = require("../browser/action-effect-summary");
const adversarial_summary_1 = require("../adversarial-summary");
const acceptance_gate_1 = require("../acceptance-gate");
const http_concurrency_1 = require("../http-concurrency");
const http_page_resources_1 = require("../http-page-resources");
const check_execution_coverage_1 = require("../browser/check-execution-coverage");
const tool_evidence_lineage_1 = require("../browser/tool-evidence-lineage");
const tool_call_timeout_1 = require("../browser/tool-call-timeout");
const evidence_temporal_integrity_1 = require("../browser/evidence-temporal-integrity");
const resource_lifecycle_1 = require("../browser/resource-lifecycle");
const schema_input_contracts_1 = require("./schema-input-contracts");
const schema_result_schemas_1 = require("./schema-result-schemas");
exports.TestAgentReportContractSchema = zod_1.z.object({
    schema: zod_1.z.literal(schema_input_contracts_1.TEST_AGENT_CONTRACT_IDS.report),
    agent: zod_1.z.literal("test-agent"),
    id: zod_1.z.string().min(1),
    workOrderId: zod_1.z.string().min(1),
    taskId: zod_1.z.string(),
    groupId: zod_1.z.string(),
    originalUserGoal: zod_1.z.string(),
    acceptanceCriteria: schema_input_contracts_1.stringList,
    status: schema_result_schemas_1.agentStatus,
    recommendation: zod_1.z.enum(["accept", "rework", "need_human"]),
    summary: zod_1.z.string(),
    startedAt: zod_1.z.string(),
    finishedAt: zod_1.z.string(),
    durationMs: zod_1.z.number(),
    artifactDir: zod_1.z.string(),
    requiredChecks: schema_input_contracts_1.stringList,
    commandResults: zod_1.z.array(zod_1.z.object({ status: schema_result_schemas_1.resultStatus }).passthrough()),
    devServerResults: zod_1.z.array(zod_1.z.object({ status: schema_result_schemas_1.resultStatus }).passthrough()),
    httpResults: zod_1.z.array(schema_result_schemas_1.httpCheckResultSchema),
    browserResults: zod_1.z.array(schema_result_schemas_1.browserCheckResultSchema),
    browserToolCalls: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string().min(1),
        toolName: zod_1.z.string().min(1),
        input: zod_1.z.record(zod_1.z.any()),
        status: zod_1.z.enum(["passed", "failed"]),
        startedAt: zod_1.z.string().min(1),
        finishedAt: zod_1.z.string().min(1),
        durationMs: zod_1.z.number().nonnegative(),
        browserExecution: schema_result_schemas_1.browserCheckExecutionIdentitySchema.optional(),
        timeoutMs: zod_1.z.number().int().min(1_000).optional(),
        timedOut: zod_1.z.boolean().optional(),
        abortRequested: zod_1.z.boolean().optional(),
        outputPreview: schema_input_contracts_1.optionalString,
        error: schema_input_contracts_1.optionalString,
    }).passthrough()),
    browserResourceLifecycleEvents: zod_1.z.array(schema_result_schemas_1.browserResourceLifecycleEventSchema),
    browserNetworkSummary: zod_1.z.array(schema_result_schemas_1.browserNetworkSummarySchema).optional(),
    httpConcurrencySummary: schema_result_schemas_1.httpConcurrencySummarySchema.optional(),
    browserInteractionSummary: zod_1.z.array(schema_result_schemas_1.browserInteractionSummarySchema).optional(),
    browserFlowSummary: schema_result_schemas_1.browserFlowSummarySchema.optional(),
    browserMultiSessionSummary: schema_result_schemas_1.browserMultiSessionSummarySchema.optional(),
    browserStabilitySummary: schema_result_schemas_1.browserStabilitySummarySchema.optional(),
    browserCheckExecutionCoverage: schema_result_schemas_1.browserCheckExecutionCoverageSchema.optional(),
    browserEvidenceTemporalIntegrity: schema_result_schemas_1.browserEvidenceTemporalIntegritySchema,
    browserResourceLifecycleSummary: schema_result_schemas_1.browserResourceLifecycleSummarySchema,
    browserToolEvidenceLineage: schema_result_schemas_1.browserToolEvidenceLineageSchema.optional(),
    browserToolCallTimeoutSummary: schema_result_schemas_1.browserToolCallTimeoutSummarySchema.optional(),
    browserRecoverySummary: schema_result_schemas_1.browserRecoverySummarySchema.optional(),
    browserActionEffectSummary: schema_result_schemas_1.browserActionEffectSummarySchema.optional(),
    adversarialEvidenceSummary: schema_result_schemas_1.adversarialEvidenceSummarySchema,
    browserProviderSummary: schema_result_schemas_1.browserProviderSummarySchema.optional(),
    browserProviderGaps: zod_1.z.array(schema_result_schemas_1.browserProviderGapSchema).optional(),
    failureSummary: zod_1.z.array(schema_result_schemas_1.failureSummarySchema).optional(),
    requiredCheckCoverage: zod_1.z.array(schema_result_schemas_1.requiredCheckCoverageSchema),
    acceptanceCoverage: zod_1.z.array(schema_result_schemas_1.acceptanceCoverageSchema),
    acceptanceEvidenceGateSummary: schema_result_schemas_1.acceptanceEvidenceGateSummarySchema,
    evidence: zod_1.z.array(schema_result_schemas_1.evidenceSchema),
    risks: schema_input_contracts_1.stringList,
    blockedReasons: schema_input_contracts_1.stringList,
    issues: zod_1.z.array(zod_1.z.object({
        severity: zod_1.z.enum(["error", "warning"]),
        code: zod_1.z.string(),
        message: zod_1.z.string(),
        project: schema_input_contracts_1.optionalString,
    }).passthrough()),
    metadata: zod_1.z.record(zod_1.z.any()),
}).passthrough().superRefine((value, ctx) => {
    (0, schema_result_schemas_1.validateMinimalBrowserToolCalls)(value, ctx);
    const browserExecutionPlanValue = value.metadata?.browserCheckExecutionPlan;
    if (browserExecutionPlanValue !== undefined) {
        const parsedPlan = schema_result_schemas_1.browserCheckExecutionPlanSchema.safeParse(browserExecutionPlanValue);
        if (!parsedPlan.success) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                message: "metadata.browserCheckExecutionPlan is invalid.",
                path: ["metadata", "browserCheckExecutionPlan"],
            });
        }
        else {
            for (const error of (0, check_execution_coverage_1.browserCheckExecutionEvidenceErrors)({
                plan: parsedPlan.data,
                results: Array.isArray(value.browserResults) ? value.browserResults : [],
                summary: value.browserCheckExecutionCoverage,
                reportStatus: value.status,
            })) {
                ctx.addIssue({
                    code: zod_1.z.ZodIssueCode.custom,
                    message: error,
                    path: ["browserCheckExecutionCoverage"],
                });
            }
        }
    }
    else if ((Array.isArray(value.browserResults) ? value.browserResults : []).some((result) => result?.execution)) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: "Browser execution identities require metadata.browserCheckExecutionPlan.",
            path: ["metadata", "browserCheckExecutionPlan"],
        });
    }
    for (const error of (0, evidence_temporal_integrity_1.browserEvidenceTemporalIntegrityErrors)(value)) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: error,
            path: ["browserEvidenceTemporalIntegrity"],
        });
    }
    for (const error of (0, resource_lifecycle_1.browserResourceLifecycleErrors)(value)) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: error,
            path: ["browserResourceLifecycleSummary"],
        });
    }
    const hasBrowserToolLineageSignal = value.browserToolEvidenceLineage
        || (Array.isArray(value.browserResults) ? value.browserResults : []).some((result) => Array.isArray(result?.browserToolCallIds) && result.browserToolCallIds.length)
        || (Array.isArray(value.browserToolCalls) ? value.browserToolCalls : []).some((record) => record?.browserExecution);
    if (hasBrowserToolLineageSignal) {
        for (const error of (0, tool_evidence_lineage_1.browserToolEvidenceLineageErrors)({
            browserResults: Array.isArray(value.browserResults) ? value.browserResults : [],
            browserToolCalls: Array.isArray(value.browserToolCalls) ? value.browserToolCalls : [],
            summary: value.browserToolEvidenceLineage,
            reportStatus: value.status,
        })) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                message: error,
                path: ["browserToolEvidenceLineage"],
            });
        }
    }
    const hasBrowserToolTimeoutSignal = value.browserToolCallTimeoutSummary
        || (Array.isArray(value.browserToolCalls) ? value.browserToolCalls : []).some((record) => record?.timeoutMs !== undefined || record?.timedOut !== undefined || record?.abortRequested !== undefined);
    if (hasBrowserToolTimeoutSignal) {
        for (const error of (0, tool_call_timeout_1.browserToolCallTimeoutEvidenceErrors)({
            browserResults: Array.isArray(value.browserResults) ? value.browserResults : [],
            browserToolCalls: Array.isArray(value.browserToolCalls) ? value.browserToolCalls : [],
            summary: value.browserToolCallTimeoutSummary,
            reportStatus: value.status,
        })) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                message: error,
                path: ["browserToolCallTimeoutSummary"],
            });
        }
    }
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
    schema: zod_1.z.literal(schema_input_contracts_1.TEST_AGENT_CONTRACT_IDS.verdict),
    agent: zod_1.z.literal("test-agent"),
    reportId: zod_1.z.string().min(1),
    workOrderId: zod_1.z.string().min(1),
    taskId: zod_1.z.string(),
    groupId: zod_1.z.string(),
    status: schema_result_schemas_1.agentStatus,
    recommendation: zod_1.z.enum(["accept", "rework", "need_human"]),
    canAccept: zod_1.z.boolean(),
    needsRework: zod_1.z.boolean(),
    needsHuman: zod_1.z.boolean(),
    summary: zod_1.z.string(),
    failedRequiredChecks: zod_1.z.array(schema_result_schemas_1.requiredCheckCoverageSchema),
    unknownRequiredChecks: zod_1.z.array(schema_result_schemas_1.requiredCheckCoverageSchema),
    failedAcceptanceCriteria: zod_1.z.array(schema_result_schemas_1.acceptanceCoverageSchema),
    unknownAcceptanceCriteria: zod_1.z.array(schema_result_schemas_1.acceptanceCoverageSchema),
    requiredCheckSummary: schema_result_schemas_1.requiredCheckSummarySchema,
    acceptanceSummary: schema_result_schemas_1.acceptanceSummarySchema,
    blockedReasons: schema_input_contracts_1.stringList,
    risks: schema_input_contracts_1.stringList,
    nextActions: schema_input_contracts_1.stringList,
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
        browserToolLinkedResults: zod_1.z.number().optional(),
        browserToolUnlinkedResults: zod_1.z.number().optional(),
        browserToolLinkedCalls: zod_1.z.number().optional(),
        browserToolOrphanCalls: zod_1.z.number().optional(),
        browserToolUnscopedCalls: zod_1.z.number().optional(),
        browserToolInvalidLinks: zod_1.z.number().optional(),
        browserToolTimedOutCalls: zod_1.z.number().optional(),
        browserToolAbortRequestedCalls: zod_1.z.number().optional(),
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
        browserPlannedChecks: zod_1.z.number().optional(),
        browserExpectedRuns: zod_1.z.number().optional(),
        browserCoveredRuns: zod_1.z.number().optional(),
        browserMissingRuns: zod_1.z.number().optional(),
        browserDuplicateResults: zod_1.z.number().optional(),
        browserInvalidResults: zod_1.z.number().optional(),
        browserTemporalInvalidItems: zod_1.z.number().optional(),
        browserTemporalPlanMismatches: zod_1.z.number().optional(),
        browserTemporalWindowViolations: zod_1.z.number().optional(),
        browserOwnedResources: zod_1.z.number().optional(),
        browserReleasedResources: zod_1.z.number().optional(),
        browserOpenResources: zod_1.z.number().optional(),
        browserCleanupFailures: zod_1.z.number().optional(),
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
    browserNetworkSummary: zod_1.z.array(schema_result_schemas_1.browserNetworkSummarySchema).optional(),
    httpConcurrencySummary: schema_result_schemas_1.httpConcurrencySummarySchema.optional(),
    browserInteractionSummary: zod_1.z.array(schema_result_schemas_1.browserInteractionSummarySchema).optional(),
    browserFlowSummary: schema_result_schemas_1.browserFlowSummarySchema.optional(),
    browserMultiSessionSummary: schema_result_schemas_1.browserMultiSessionSummarySchema.optional(),
    browserStabilitySummary: schema_result_schemas_1.browserStabilitySummarySchema.optional(),
    browserCheckExecutionCoverage: schema_result_schemas_1.browserCheckExecutionCoverageSchema.optional(),
    browserEvidenceTemporalIntegrity: schema_result_schemas_1.browserEvidenceTemporalIntegritySchema,
    browserResourceLifecycleSummary: schema_result_schemas_1.browserResourceLifecycleSummarySchema,
    browserToolEvidenceLineage: schema_result_schemas_1.browserToolEvidenceLineageSchema.optional(),
    browserToolCallTimeoutSummary: schema_result_schemas_1.browserToolCallTimeoutSummarySchema.optional(),
    browserRecoverySummary: schema_result_schemas_1.browserRecoverySummarySchema.optional(),
    browserActionEffectSummary: schema_result_schemas_1.browserActionEffectSummarySchema.optional(),
    adversarialEvidenceSummary: schema_result_schemas_1.adversarialEvidenceSummarySchema,
    acceptanceEvidenceGateSummary: schema_result_schemas_1.acceptanceEvidenceGateSummarySchema,
    browserProviderSummary: schema_result_schemas_1.browserProviderSummarySchema.optional(),
    browserProviderGaps: zod_1.z.array(schema_result_schemas_1.browserProviderGapSchema).optional(),
    failureSummary: zod_1.z.array(schema_result_schemas_1.failureSummarySchema).optional(),
    keyEvidence: zod_1.z.array(schema_result_schemas_1.evidenceSchema),
    artifacts: zod_1.z.object({
        artifactDir: zod_1.z.string(),
        reportJsonPath: schema_input_contracts_1.optionalString,
        reportMarkdownPath: schema_input_contracts_1.optionalString,
        verdictJsonPath: schema_input_contracts_1.optionalString,
        manifestPath: schema_input_contracts_1.optionalString,
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
    if (value.canAccept && value.browserCheckExecutionCoverage && value.browserCheckExecutionCoverage.status !== "complete") {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: "canAccept requires complete browser check execution coverage.",
            path: ["canAccept"],
        });
    }
    if (value.canAccept && value.browserEvidenceTemporalIntegrity?.status !== "complete") {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: "canAccept requires complete browser evidence temporal integrity.",
            path: ["canAccept"],
        });
    }
    if (value.canAccept && value.browserResourceLifecycleSummary?.status !== "complete") {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: "canAccept requires complete browser resource lifecycle evidence.",
            path: ["canAccept"],
        });
    }
    if (value.canAccept && value.browserToolEvidenceLineage && value.browserToolEvidenceLineage.status !== "complete") {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: "canAccept requires complete browser tool evidence lineage.",
            path: ["canAccept"],
        });
    }
    if (value.canAccept && (value.browserToolCallTimeoutSummary?.timedOutCalls || 0) > 0) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: "canAccept requires zero timed-out browser tool calls.",
            path: ["canAccept"],
        });
    }
    if (value.canAccept && (value.evidenceSummary?.browserFlakyStabilityGroups || 0) > 0) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: "canAccept requires zero flaky browser stability groups.",
            path: ["canAccept"],
        });
    }
});
const testAgentInvocationIssueSchema = zod_1.z.object({
    severity: zod_1.z.enum(["error", "warning"]),
    code: zod_1.z.string().min(1),
    message: zod_1.z.string().min(1),
    path: schema_input_contracts_1.optionalString,
    project: schema_input_contracts_1.optionalString,
}).strict();
const testAgentInvocationValidationSchema = zod_1.z.object({
    valid: zod_1.z.boolean(),
    errors: zod_1.z.array(testAgentInvocationIssueSchema),
    warnings: zod_1.z.array(testAgentInvocationIssueSchema),
}).strict();
exports.TestAgentInvocationRequestContractSchema = zod_1.z.object({
    schema: zod_1.z.literal(schema_input_contracts_1.TEST_AGENT_CONTRACT_IDS.invocationRequest),
    source: zod_1.z.enum(["handoff", "work_order"]),
    payload: zod_1.z.unknown(),
}).strict();
exports.TestAgentInvocationResultContractSchema = zod_1.z.object({
    schema: zod_1.z.literal(schema_input_contracts_1.TEST_AGENT_CONTRACT_IDS.invocationResult),
    invocationId: zod_1.z.string().min(1),
    source: zod_1.z.enum(["handoff", "work_order", "unknown"]),
    status: zod_1.z.enum(["completed", "rejected", "runtime_error"]),
    startedAt: zod_1.z.string().min(1),
    finishedAt: zod_1.z.string().min(1),
    durationMs: zod_1.z.number().nonnegative(),
    inputValidation: testAgentInvocationValidationSchema,
    outputValidation: testAgentInvocationValidationSchema.optional(),
    outcome: schema_result_schemas_1.agentStatus.optional(),
    recommendation: zod_1.z.enum(["accept", "rework", "need_human"]).optional(),
    canAccept: zod_1.z.boolean(),
    report: exports.TestAgentReportContractSchema.optional(),
    verdict: exports.TestAgentVerdictContractSchema.optional(),
    artifactVerification: zod_1.z.object({
        schema: zod_1.z.literal("ccm-test-agent-artifact-verification-v1"),
        manifestPath: zod_1.z.string(),
        reportId: zod_1.z.string(),
        workOrderId: zod_1.z.string(),
        checkedAt: zod_1.z.string(),
        status: zod_1.z.enum(["passed", "failed"]),
        summary: zod_1.z.object({
            total: zod_1.z.number().int().nonnegative(),
            passed: zod_1.z.number().int().nonnegative(),
            failed: zod_1.z.number().int().nonnegative(),
            skipped: zod_1.z.number().int().nonnegative(),
        }).strict(),
        items: zod_1.z.array(zod_1.z.object({
            type: zod_1.z.string(),
            title: zod_1.z.string(),
            path: zod_1.z.string(),
            status: zod_1.z.enum(["passed", "failed", "skipped"]),
        }).passthrough()),
    }).passthrough().optional(),
    error: schema_input_contracts_1.optionalString,
}).strict().superRefine((value, ctx) => {
    if (value.status === "rejected") {
        if (value.inputValidation.valid || !value.inputValidation.errors.length) {
            ctx.addIssue({ code: zod_1.z.ZodIssueCode.custom, message: "Rejected invocation requires invalid input validation errors.", path: ["inputValidation"] });
        }
        if (value.report || value.verdict || value.artifactVerification || value.canAccept) {
            ctx.addIssue({ code: zod_1.z.ZodIssueCode.custom, message: "Rejected invocation must not contain execution outputs or canAccept=true.", path: ["status"] });
        }
    }
    if (value.status === "completed") {
        if (!value.inputValidation.valid || !value.outputValidation?.valid || !value.report || !value.verdict || !value.artifactVerification) {
            ctx.addIssue({ code: zod_1.z.ZodIssueCode.custom, message: "Completed invocation requires valid input/output, report, verdict, and artifact verification.", path: ["status"] });
        }
        if (value.artifactVerification?.status !== "passed") {
            ctx.addIssue({ code: zod_1.z.ZodIssueCode.custom, message: "Completed invocation requires passed artifact verification.", path: ["artifactVerification"] });
        }
        if (value.outcome !== value.report?.status || value.recommendation !== value.report?.recommendation) {
            ctx.addIssue({ code: zod_1.z.ZodIssueCode.custom, message: "Invocation outcome and recommendation must match the report.", path: ["outcome"] });
        }
        if (value.canAccept !== value.verdict?.canAccept) {
            ctx.addIssue({ code: zod_1.z.ZodIssueCode.custom, message: "Invocation canAccept must match the verdict.", path: ["canAccept"] });
        }
    }
    if (value.status === "runtime_error" && value.canAccept) {
        ctx.addIssue({ code: zod_1.z.ZodIssueCode.custom, message: "Runtime-error invocation cannot be accepted.", path: ["canAccept"] });
    }
});
//# sourceMappingURL=schema-report-contracts.js.map