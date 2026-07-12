import { runTestAgent } from "./agent";
import { TestAgentArtifactVerification, verifyTestAgentArtifactManifestFile } from "./artifact-verifier";
import {
  TEST_AGENT_CONTRACT_IDS,
  TestAgentContractIssue,
  validateTestAgentHandoffContract,
  validateTestAgentInvocationRequestContract,
  validateTestAgentReportContract,
  validateTestAgentVerdictContract,
  validateTestAgentWorkOrderContract,
} from "./contract";
import { TestAgentReport, TestAgentRuntimeOptions, TestAgentStatus, TestAgentVerdict, TestAgentWorkOrder } from "./types";
import { makeRunId, nowIso } from "./utils";
import { buildTestAgentVerdict } from "./verdict";
import { TestAgentHandoff } from "./work-order-builder";

export interface TestAgentInvocationRequest {
  schema: "ccm-test-agent-invocation-request-v1";
  source: "handoff" | "work_order";
  payload: TestAgentHandoff | TestAgentWorkOrder | unknown;
}

export interface TestAgentInvocationValidation {
  valid: boolean;
  errors: TestAgentContractIssue[];
  warnings: TestAgentContractIssue[];
}

export interface TestAgentInvocationResult {
  schema: "ccm-test-agent-invocation-result-v1";
  invocationId: string;
  source: "handoff" | "work_order" | "unknown";
  status: "completed" | "rejected" | "runtime_error";
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  inputValidation: TestAgentInvocationValidation;
  outputValidation?: TestAgentInvocationValidation;
  outcome?: TestAgentStatus;
  recommendation?: TestAgentReport["recommendation"];
  canAccept: boolean;
  report?: TestAgentReport;
  verdict?: TestAgentVerdict;
  artifactVerification?: TestAgentArtifactVerification;
  error?: string;
}

function sourceFor(request: unknown): TestAgentInvocationResult["source"] {
  const source = String((request as any)?.source || "");
  return source === "handoff" || source === "work_order" ? source : "unknown";
}

function validationSnapshot(input: {
  valid: boolean;
  errors: TestAgentContractIssue[];
  warnings: TestAgentContractIssue[];
}): TestAgentInvocationValidation {
  return {
    valid: input.valid,
    errors: input.errors.map(issue => ({ ...issue })),
    warnings: input.warnings.map(issue => ({ ...issue })),
  };
}

function finishedResult(
  base: Omit<TestAgentInvocationResult, "finishedAt" | "durationMs">,
): TestAgentInvocationResult {
  const finishedAt = nowIso();
  return {
    ...base,
    finishedAt,
    durationMs: Date.parse(finishedAt) - Date.parse(base.startedAt),
  };
}

function runtimeIssue(message: string): TestAgentContractIssue {
  return {
    severity: "error",
    code: "test_agent_invocation_output_error",
    message,
  };
}

export async function invokeTestAgent(
  request: unknown,
  runtime: TestAgentRuntimeOptions = {},
): Promise<TestAgentInvocationResult> {
  const startedAt = nowIso();
  const invocationId = makeRunId("test-agent-invocation");
  const source = sourceFor(request);
  const envelopeValidation = validateTestAgentInvocationRequestContract(request);
  if (!envelopeValidation.valid) {
    return finishedResult({
      schema: TEST_AGENT_CONTRACT_IDS.invocationResult,
      invocationId,
      source,
      status: "rejected",
      startedAt,
      inputValidation: validationSnapshot(envelopeValidation),
      canAccept: false,
    });
  }

  const typedRequest = request as TestAgentInvocationRequest;
  const payloadValidation = typedRequest.source === "handoff"
    ? validateTestAgentHandoffContract(typedRequest.payload, runtime)
    : validateTestAgentWorkOrderContract(typedRequest.payload, runtime);
  const inputValidation = validationSnapshot(payloadValidation);
  if (!payloadValidation.valid) {
    return finishedResult({
      schema: TEST_AGENT_CONTRACT_IDS.invocationResult,
      invocationId,
      source: typedRequest.source,
      status: "rejected",
      startedAt,
      inputValidation,
      canAccept: false,
    });
  }

  const workOrder = typedRequest.source === "handoff"
    ? (payloadValidation as ReturnType<typeof validateTestAgentHandoffContract>).workOrder!
    : typedRequest.payload as TestAgentWorkOrder;
  try {
    const report = await runTestAgent(workOrder, runtime);
    const verdict = buildTestAgentVerdict(report);
    const reportValidation = validateTestAgentReportContract(report);
    const verdictValidation = validateTestAgentVerdictContract(verdict);
    let artifactVerification: TestAgentArtifactVerification | undefined;
    const outputErrors = [...reportValidation.errors, ...verdictValidation.errors];
    const outputWarnings = [...reportValidation.warnings, ...verdictValidation.warnings];
    const manifestPath = String(report.metadata?.artifactFiles?.manifestPath || "");
    if (!manifestPath) {
      outputErrors.push(runtimeIssue("TestAgent report did not expose an artifact manifest path."));
    } else {
      try {
        artifactVerification = verifyTestAgentArtifactManifestFile(manifestPath);
        if (artifactVerification.status !== "passed") {
          outputErrors.push(runtimeIssue(`Artifact verification failed for ${manifestPath}.`));
        }
      } catch (error: any) {
        outputErrors.push(runtimeIssue(`Artifact verification could not run: ${error.message || String(error)}`));
      }
    }
    const outputValidation: TestAgentInvocationValidation = {
      valid: outputErrors.length === 0,
      errors: outputErrors,
      warnings: outputWarnings,
    };
    if (!outputValidation.valid || !artifactVerification) {
      return finishedResult({
        schema: TEST_AGENT_CONTRACT_IDS.invocationResult,
        invocationId,
        source: typedRequest.source,
        status: "runtime_error",
        startedAt,
        inputValidation,
        outputValidation,
        outcome: report.status,
        recommendation: report.recommendation,
        canAccept: false,
        ...(reportValidation.valid ? { report } : {}),
        ...(verdictValidation.valid ? { verdict } : {}),
        ...(artifactVerification ? { artifactVerification } : {}),
        error: outputErrors.map(issue => issue.message).join(" ") || "TestAgent output validation failed.",
      });
    }
    return finishedResult({
      schema: TEST_AGENT_CONTRACT_IDS.invocationResult,
      invocationId,
      source: typedRequest.source,
      status: "completed",
      startedAt,
      inputValidation,
      outputValidation,
      outcome: report.status,
      recommendation: report.recommendation,
      canAccept: verdict.canAccept,
      report,
      verdict,
      artifactVerification,
    });
  } catch (error: any) {
    return finishedResult({
      schema: TEST_AGENT_CONTRACT_IDS.invocationResult,
      invocationId,
      source: typedRequest.source,
      status: "runtime_error",
      startedAt,
      inputValidation,
      canAccept: false,
      error: error.message || String(error),
    });
  }
}

export function invokeTestAgentHandoff(handoff: TestAgentHandoff, runtime: TestAgentRuntimeOptions = {}) {
  return invokeTestAgent({
    schema: TEST_AGENT_CONTRACT_IDS.invocationRequest,
    source: "handoff",
    payload: handoff,
  }, runtime);
}

export function invokeTestAgentWorkOrder(workOrder: TestAgentWorkOrder, runtime: TestAgentRuntimeOptions = {}) {
  return invokeTestAgent({
    schema: TEST_AGENT_CONTRACT_IDS.invocationRequest,
    source: "work_order",
    payload: workOrder,
  }, runtime);
}
