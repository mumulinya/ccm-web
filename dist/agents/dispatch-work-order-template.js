"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderLightDispatchWorkOrder = renderLightDispatchWorkOrder;
const dispatch_receipt_template_1 = require("./dispatch-receipt-template");
const dispatch_profile_1 = require("./dispatch-profile");
function renderLightDispatchWorkOrder(handoff, task) {
    const scope = (0, dispatch_profile_1.resolveDispatchScope)(task || {});
    return [
        "轻量工作单：目标、工作区、安全边界和最小真实回执。",
        `目标：${handoff.user_goal || handoff.task || task?.business_goal || task?.description || task?.title || ""}`,
        `工作区：${handoff.work_dir || ""}`,
        `建议优先修改：${scope.recommendedPaths.join("、") || "任务相关的安全文件"}`,
        `保护范围：${scope.protectedPaths.join("、") || "沿用项目权限边界"}`,
        `禁止范围：${[...scope.forbiddenPaths, ...(handoff.scope?.forbidden || [])].join("；")}`,
        ...(handoff.references?.constraints || []).map((constraint) => `明确约束：${constraint}`),
        ...(handoff.verification?.acceptance || []).map((criterion) => `验收：${criterion}`),
        "保护路径需要通过 ccm__task_runtime.request_scope_expansion 申请；返回 approved 前禁止执行所申请动作。禁止路径不能申请。当前合同 revision 通过 get_task_context 查询。",
        handoff.communication_envelope?.messageId ? `通信身份：${JSON.stringify(handoff.communication_envelope)}；提交结果并保留心跳，不要求完整 ACK。` : "",
        (0, dispatch_receipt_template_1.renderDispatchReceiptTemplate)("light", ""),
    ].filter(Boolean).join("\n");
}
//# sourceMappingURL=dispatch-work-order-template.js.map