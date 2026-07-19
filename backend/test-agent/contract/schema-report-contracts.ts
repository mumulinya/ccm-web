// Behavior-freeze split from schema.ts (part 3/3).
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
  TEST_AGENT_CONTRACT_IDS,
  TestAgentHandoffContractSchema,
  TestAgentWorkOrderContractSchema,
  optionalString,
  stringList,
  timeoutMs,
} from "./schema-input-contracts";

import {
  acceptanceCoverageSchema,
  acceptanceEvidenceGateSummarySchema,
  acceptanceSummarySchema,
  adversarialEvidenceSummarySchema,
  agentStatus,
  browserActionEffectSummarySchema,
  browserCheckExecutionCoverageSchema,
  browserCheckExecutionIdentitySchema,
  browserCheckExecutionPlanSchema,
  browserCheckResultSchema,
  browserEvidenceTemporalIntegritySchema,
  browserFlowSummarySchema,
  browserInteractionSummarySchema,
  browserMultiSessionSummarySchema,
  browserNetworkSummarySchema,
  browserProviderGapSchema,
  browserProviderSummarySchema,
  browserRecoverySummarySchema,
  browserResourceLifecycleEventSchema,
  browserResourceLifecycleSummarySchema,
  browserStabilitySummarySchema,
  browserToolCallTimeoutSummarySchema,
  browserToolEvidenceLineageSchema,
  evidenceSchema,
  failureSummarySchema,
  httpCheckResultSchema,
  httpConcurrencySummarySchema,
  requiredCheckCoverageSchema,
  requiredCheckSummarySchema,
  resultStatus,
  validateMinimalBrowserToolCalls,
} from "./schema-result-schemas";

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
  browserToolCalls: z.array(z.object({
    id: z.string().min(1),
    toolName: z.string().min(1),
    input: z.record(z.any()),
    status: z.enum(["passed", "failed"]),
    startedAt: z.string().min(1),
    finishedAt: z.string().min(1),
    durationMs: z.number().nonnegative(),
    browserExecution: browserCheckExecutionIdentitySchema.optional(),
    timeoutMs: z.number().int().min(1_000).optional(),
    timedOut: z.boolean().optional(),
    abortRequested: z.boolean().optional(),
    outputPreview: optionalString,
    error: optionalString,
  }).passthrough()),
  browserResourceLifecycleEvents: z.array(browserResourceLifecycleEventSchema),
  browserNetworkSummary: z.array(browserNetworkSummarySchema).optional(),
  httpConcurrencySummary: httpConcurrencySummarySchema.optional(),
  browserInteractionSummary: z.array(browserInteractionSummarySchema).optional(),
  browserFlowSummary: browserFlowSummarySchema.optional(),
  browserMultiSessionSummary: browserMultiSessionSummarySchema.optional(),
  browserStabilitySummary: browserStabilitySummarySchema.optional(),
  browserCheckExecutionCoverage: browserCheckExecutionCoverageSchema.optional(),
  browserEvidenceTemporalIntegrity: browserEvidenceTemporalIntegritySchema,
  browserResourceLifecycleSummary: browserResourceLifecycleSummarySchema,
  browserToolEvidenceLineage: browserToolEvidenceLineageSchema.optional(),
  browserToolCallTimeoutSummary: browserToolCallTimeoutSummarySchema.optional(),
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
  for (const error of browserEvidenceTemporalIntegrityErrors(value as any)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: error,
      path: ["browserEvidenceTemporalIntegrity"],
    });
  }
  for (const error of browserResourceLifecycleErrors(value as any)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: error,
      path: ["browserResourceLifecycleSummary"],
    });
  }
  const hasBrowserToolLineageSignal = value.browserToolEvidenceLineage
    || (Array.isArray(value.browserResults) ? value.browserResults : []).some((result: any) => Array.isArray(result?.browserToolCallIds) && result.browserToolCallIds.length)
    || (Array.isArray(value.browserToolCalls) ? value.browserToolCalls : []).some((record: any) => record?.browserExecution);
  if (hasBrowserToolLineageSignal) {
    for (const error of browserToolEvidenceLineageErrors({
      browserResults: Array.isArray(value.browserResults) ? value.browserResults : [],
      browserToolCalls: Array.isArray(value.browserToolCalls) ? value.browserToolCalls : [],
      summary: value.browserToolEvidenceLineage,
      reportStatus: value.status,
    })) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: error,
        path: ["browserToolEvidenceLineage"],
      });
    }
  }
  const hasBrowserToolTimeoutSignal = value.browserToolCallTimeoutSummary
    || (Array.isArray(value.browserToolCalls) ? value.browserToolCalls : []).some((record: any) =>
      record?.timeoutMs !== undefined || record?.timedOut !== undefined || record?.abortRequested !== undefined
    );
  if (hasBrowserToolTimeoutSignal) {
    for (const error of browserToolCallTimeoutEvidenceErrors({
      browserResults: Array.isArray(value.browserResults) ? value.browserResults : [],
      browserToolCalls: Array.isArray(value.browserToolCalls) ? value.browserToolCalls : [],
      summary: value.browserToolCallTimeoutSummary,
      reportStatus: value.status,
    })) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: error,
        path: ["browserToolCallTimeoutSummary"],
      });
    }
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
    browserToolLinkedResults: z.number().optional(),
    browserToolUnlinkedResults: z.number().optional(),
    browserToolLinkedCalls: z.number().optional(),
    browserToolOrphanCalls: z.number().optional(),
    browserToolUnscopedCalls: z.number().optional(),
    browserToolInvalidLinks: z.number().optional(),
    browserToolTimedOutCalls: z.number().optional(),
    browserToolAbortRequestedCalls: z.number().optional(),
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
    browserTemporalInvalidItems: z.number().optional(),
    browserTemporalPlanMismatches: z.number().optional(),
    browserTemporalWindowViolations: z.number().optional(),
    browserOwnedResources: z.number().optional(),
    browserReleasedResources: z.number().optional(),
    browserOpenResources: z.number().optional(),
    browserCleanupFailures: z.number().optional(),
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
  browserEvidenceTemporalIntegrity: browserEvidenceTemporalIntegritySchema,
  browserResourceLifecycleSummary: browserResourceLifecycleSummarySchema,
  browserToolEvidenceLineage: browserToolEvidenceLineageSchema.optional(),
  browserToolCallTimeoutSummary: browserToolCallTimeoutSummarySchema.optional(),
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
  if (value.canAccept && value.browserEvidenceTemporalIntegrity?.status !== "complete") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "canAccept requires complete browser evidence temporal integrity.",
      path: ["canAccept"],
    });
  }
  if (value.canAccept && value.browserResourceLifecycleSummary?.status !== "complete") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "canAccept requires complete browser resource lifecycle evidence.",
      path: ["canAccept"],
    });
  }
  if (value.canAccept && value.browserToolEvidenceLineage && value.browserToolEvidenceLineage.status !== "complete") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "canAccept requires complete browser tool evidence lineage.",
      path: ["canAccept"],
    });
  }
  if (value.canAccept && (value.browserToolCallTimeoutSummary?.timedOutCalls || 0) > 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "canAccept requires zero timed-out browser tool calls.",
      path: ["canAccept"],
    });
  }
  if (value.canAccept && (value.evidenceSummary?.browserFlakyStabilityGroups || 0) > 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "canAccept requires zero flaky browser stability groups.",
      path: ["canAccept"],
    });
  }
});

const testAgentInvocationIssueSchema = z.object({
  severity: z.enum(["error", "warning"]),
  code: z.string().min(1),
  message: z.string().min(1),
  path: optionalString,
  project: optionalString,
}).strict();

const testAgentInvocationValidationSchema = z.object({
  valid: z.boolean(),
  errors: z.array(testAgentInvocationIssueSchema),
  warnings: z.array(testAgentInvocationIssueSchema),
}).strict();

export const TestAgentInvocationRequestContractSchema = z.object({
  schema: z.literal(TEST_AGENT_CONTRACT_IDS.invocationRequest),
  source: z.enum(["handoff", "work_order"]),
  payload: z.unknown(),
}).strict();

export const TestAgentInvocationResultContractSchema = z.object({
  schema: z.literal(TEST_AGENT_CONTRACT_IDS.invocationResult),
  invocationId: z.string().min(1),
  source: z.enum(["handoff", "work_order", "unknown"]),
  status: z.enum(["completed", "rejected", "runtime_error"]),
  startedAt: z.string().min(1),
  finishedAt: z.string().min(1),
  durationMs: z.number().nonnegative(),
  inputValidation: testAgentInvocationValidationSchema,
  outputValidation: testAgentInvocationValidationSchema.optional(),
  outcome: agentStatus.optional(),
  recommendation: z.enum(["accept", "rework", "need_human"]).optional(),
  canAccept: z.boolean(),
  report: TestAgentReportContractSchema.optional(),
  verdict: TestAgentVerdictContractSchema.optional(),
  artifactVerification: z.object({
    schema: z.literal("ccm-test-agent-artifact-verification-v1"),
    manifestPath: z.string(),
    reportId: z.string(),
    workOrderId: z.string(),
    checkedAt: z.string(),
    status: z.enum(["passed", "failed"]),
    summary: z.object({
      total: z.number().int().nonnegative(),
      passed: z.number().int().nonnegative(),
      failed: z.number().int().nonnegative(),
      skipped: z.number().int().nonnegative(),
    }).strict(),
    items: z.array(z.object({
      type: z.string(),
      title: z.string(),
      path: z.string(),
      status: z.enum(["passed", "failed", "skipped"]),
    }).passthrough()),
  }).passthrough().optional(),
  error: optionalString,
}).strict().superRefine((value, ctx) => {
  if (value.status === "rejected") {
    if (value.inputValidation.valid || !value.inputValidation.errors.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Rejected invocation requires invalid input validation errors.", path: ["inputValidation"] });
    }
    if (value.report || value.verdict || value.artifactVerification || value.canAccept) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Rejected invocation must not contain execution outputs or canAccept=true.", path: ["status"] });
    }
  }
  if (value.status === "completed") {
    if (!value.inputValidation.valid || !value.outputValidation?.valid || !value.report || !value.verdict || !value.artifactVerification) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Completed invocation requires valid input/output, report, verdict, and artifact verification.", path: ["status"] });
    }
    if (value.artifactVerification?.status !== "passed") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Completed invocation requires passed artifact verification.", path: ["artifactVerification"] });
    }
    if (value.outcome !== value.report?.status || value.recommendation !== value.report?.recommendation) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invocation outcome and recommendation must match the report.", path: ["outcome"] });
    }
    if (value.canAccept !== value.verdict?.canAccept) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invocation canAccept must match the verdict.", path: ["canAccept"] });
    }
  }
  if (value.status === "runtime_error" && value.canAccept) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Runtime-error invocation cannot be accepted.", path: ["canAccept"] });
  }
});

export type TestAgentWorkOrderContract = z.infer<typeof TestAgentWorkOrderContractSchema>;
export type TestAgentHandoffContract = z.infer<typeof TestAgentHandoffContractSchema>;
export type TestAgentReportContract = z.infer<typeof TestAgentReportContractSchema>;
export type TestAgentVerdictContract = z.infer<typeof TestAgentVerdictContractSchema>;
export type TestAgentInvocationRequestContract = z.infer<typeof TestAgentInvocationRequestContractSchema>;
export type TestAgentInvocationResultContract = z.infer<typeof TestAgentInvocationResultContractSchema>;
