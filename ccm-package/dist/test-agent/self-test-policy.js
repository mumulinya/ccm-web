"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TEST_AGENT_SELF_TEST_ADVERSARIAL_WAIVER = void 0;
exports.normalizeTestAgentWorkOrderForSelfTest = normalizeTestAgentWorkOrderForSelfTest;
exports.runTestAgentForSelfTest = runTestAgentForSelfTest;
const agent_1 = require("./agent");
const work_order_1 = require("./work-order");
exports.TEST_AGENT_SELF_TEST_ADVERSARIAL_WAIVER = "This legacy self-test isolates a different TestAgent capability; the adversarial gate has dedicated strict-mode coverage.";
function withSelfTestWaiver(input) {
    return {
        ...input,
        options: {
            ...(input.options || {}),
            requireAdversarialProbe: false,
            adversarialProbeWaiver: exports.TEST_AGENT_SELF_TEST_ADVERSARIAL_WAIVER,
        },
    };
}
function normalizeTestAgentWorkOrderForSelfTest(input, overrides = {}) {
    return (0, work_order_1.normalizeTestAgentWorkOrder)(withSelfTestWaiver(input), {
        ...overrides,
        requireAdversarialProbe: false,
        adversarialProbeWaiver: exports.TEST_AGENT_SELF_TEST_ADVERSARIAL_WAIVER,
    });
}
function runTestAgentForSelfTest(input, options = {}) {
    return (0, agent_1.runTestAgent)(withSelfTestWaiver(input), {
        ...options,
        requireAdversarialProbe: false,
        adversarialProbeWaiver: exports.TEST_AGENT_SELF_TEST_ADVERSARIAL_WAIVER,
    });
}
//# sourceMappingURL=self-test-policy.js.map