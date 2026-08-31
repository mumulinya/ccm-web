"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runGlobalAgentPlanModeSelfTest = runGlobalAgentPlanModeSelfTest;
const slash_command_session_state_1 = require("../../system/slash-command-session-state");
const conversation_plan_mode_gate_1 = require("../../system/conversation-plan-mode-gate");
function runGlobalAgentPlanModeSelfTest() {
    const shared = (0, conversation_plan_mode_gate_1.runConversationPlanModeGateSelfTest)();
    const checks = {
        ...shared.checks,
        globalHasNoConversationPlanMode: (0, slash_command_session_state_1.conversationPlanModeSupported)("global") === false,
        groupKeepsConversationPlanMode: (0, slash_command_session_state_1.conversationPlanModeSupported)("group") === true,
        projectKeepsConversationPlanMode: (0, slash_command_session_state_1.conversationPlanModeSupported)("project") === true,
    };
    return { pass: Object.values(checks).every(Boolean), checks };
}
//# sourceMappingURL=global-agent-plan-mode.js.map