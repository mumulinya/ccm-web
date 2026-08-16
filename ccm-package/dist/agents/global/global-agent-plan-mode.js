"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalPlanModeWouldCauseSideEffect = globalPlanModeWouldCauseSideEffect;
exports.runGlobalAgentPlanModeSelfTest = runGlobalAgentPlanModeSelfTest;
const conversation_plan_mode_gate_1 = require("../../system/conversation-plan-mode-gate");
function globalPlanModeWouldCauseSideEffect(input) {
    if (!input.tool) {
        return (0, conversation_plan_mode_gate_1.conversationPlanModeWouldCauseSideEffect)({ workflowActionRequired: input.workflowActionRequired === true });
    }
    const spec = input.toolSpecs.find(item => item.name === String(input.tool?.name || ""));
    if (!spec)
        return (0, conversation_plan_mode_gate_1.conversationPlanModeWouldCauseSideEffect)({ toolName: String(input.tool.name || ""), knownTool: false });
    const risk = typeof spec.risk === "function" ? spec.risk(input.tool.arguments || {}) : spec.risk;
    return (0, conversation_plan_mode_gate_1.conversationPlanModeWouldCauseSideEffect)({
        toolName: String(input.tool.name || ""),
        knownTool: true,
        isReadOnly: risk === "read",
    });
}
function runGlobalAgentPlanModeSelfTest() {
    const toolSpecs = [
        { name: "inspect_system", risk: "read" },
        { name: "send_project_cmd", risk: "write" },
    ];
    const shared = (0, conversation_plan_mode_gate_1.runConversationPlanModeGateSelfTest)();
    const checks = {
        ...shared.checks,
        readToolAllowed: globalPlanModeWouldCauseSideEffect({ tool: { name: "inspect_system" }, workflowActionRequired: true, toolSpecs }) === false,
        writeToolBlocked: globalPlanModeWouldCauseSideEffect({ tool: { name: "send_project_cmd" }, toolSpecs }) === true,
        unknownToolClosed: globalPlanModeWouldCauseSideEffect({ tool: { name: "unknown" }, toolSpecs }) === true,
        directActionBlocked: globalPlanModeWouldCauseSideEffect({ workflowActionRequired: true, toolSpecs }) === true,
    };
    return { pass: Object.values(checks).every(Boolean), checks };
}
//# sourceMappingURL=global-agent-plan-mode.js.map