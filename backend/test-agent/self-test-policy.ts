import { runTestAgent as runTestAgentCore } from "./agent";
import { TestAgentRuntimeOptions, TestAgentWorkOrder } from "./types";
import { normalizeTestAgentWorkOrder as normalizeTestAgentWorkOrderCore } from "./work-order";

export const TEST_AGENT_SELF_TEST_ADVERSARIAL_WAIVER =
  "This legacy self-test isolates a different TestAgent capability; the adversarial gate has dedicated strict-mode coverage.";

function withSelfTestWaiver(input: TestAgentWorkOrder): TestAgentWorkOrder {
  return {
    ...input,
    options: {
      ...(input.options || {}),
      requireAdversarialProbe: false,
      adversarialProbeWaiver: TEST_AGENT_SELF_TEST_ADVERSARIAL_WAIVER,
    },
  };
}

export function normalizeTestAgentWorkOrderForSelfTest(
  input: TestAgentWorkOrder,
  overrides: TestAgentRuntimeOptions = {},
) {
  return normalizeTestAgentWorkOrderCore(withSelfTestWaiver(input), {
    ...overrides,
    requireAdversarialProbe: false,
    adversarialProbeWaiver: TEST_AGENT_SELF_TEST_ADVERSARIAL_WAIVER,
  });
}

export function runTestAgentForSelfTest(
  input: TestAgentWorkOrder,
  options: TestAgentRuntimeOptions = {},
) {
  return runTestAgentCore(withSelfTestWaiver(input), {
    ...options,
    requireAdversarialProbe: false,
    adversarialProbeWaiver: TEST_AGENT_SELF_TEST_ADVERSARIAL_WAIVER,
  });
}
