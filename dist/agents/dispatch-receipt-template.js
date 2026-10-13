"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderDispatchReceiptTemplate = renderDispatchReceiptTemplate;
exports.dispatchRequiresAck = dispatchRequiresAck;
exports.dispatchRequiresMemoryReceipt = dispatchRequiresMemoryReceipt;
exports.lightDispatchMemoryReceiptStatus = lightDispatchMemoryReceiptStatus;
function renderDispatchReceiptTemplate(profile, fullTemplate) {
    if (profile !== "light")
        return fullTemplate;
    return '完成后追加最小 CCM_AGENT_RECEIPT JSON：\n```json\n{"ccm_receipt":true,"status":"done | partial | blocked | failed | needs_info","summary":"实际完成内容","actions":[],"filesChanged":[],"verification":[],"blockers":[]}\n```\n只记录真实运行的检查。验证文本不能替代平台采集的命令、文件或产出证据。';
}
function dispatchRequiresAck(task) {
    const profile = task?.dispatch_profile_snapshot || task?.task_spec?.dispatch_profile_snapshot;
    return profile?.profile !== "light";
}
function dispatchRequiresMemoryReceipt(task) {
    const profile = task?.dispatch_profile_snapshot || task?.task_spec?.dispatch_profile_snapshot;
    return profile?.profile !== "light";
}
/** Exempt a declaration requirement; do not invent memory delivery evidence. */
function lightDispatchMemoryReceiptStatus() {
    return {
        schema: "ccm-task-agent-memory-context-consumption-validation-v4",
        required: false, pass: true, profile_exempt: true,
        matched_gate_ids: [], snapshot_ids: [], matched_snapshot_ids: [], missing_snapshot_ids: [],
        task_agent_session_ids: [], rows: [],
        system_delivery_required: false, system_delivery_passed: false,
        agent_declaration_required: false, agent_declaration_passed: false,
    };
}
//# sourceMappingURL=dispatch-receipt-template.js.map