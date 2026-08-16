import { conversationPlanModeSupported } from "../../system/slash-command-session-state";
import { runConversationPlanModeGateSelfTest } from "../../system/conversation-plan-mode-gate";

export function runGlobalAgentPlanModeSelfTest() {
  const shared = runConversationPlanModeGateSelfTest();
  const checks = {
    ...shared.checks,
    globalHasNoConversationPlanMode: conversationPlanModeSupported("global") === false,
    groupKeepsConversationPlanMode: conversationPlanModeSupported("group") === true,
    projectKeepsConversationPlanMode: conversationPlanModeSupported("project") === true,
  };
  return { pass: Object.values(checks).every(Boolean), checks };
}
