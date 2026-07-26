"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.classifyProjectChatIntent = classifyProjectChatIntent;
exports.classifyProjectChatIntentWithModel = classifyProjectChatIntentWithModel;
exports.runProjectChatIntentSelfTest = runProjectChatIntentSelfTest;
const workflow_decision_1 = require("../../agents/workflow-decision");
function classifyProjectChatIntent(message, uploadedFiles = [], options = {}) {
    void message;
    void uploadedFiles;
    void options;
    throw new Error("同步关键词项目意图分类已停用；请调用 classifyProjectChatIntentWithModel");
}
/**
 * 健康自动入口唯一使用的项目聊天语义决策。
 * 本地 classifyProjectChatIntent 仅保留给诊断/旧数据展示，不得在模型失败时创建任务。
 */
async function classifyProjectChatIntentWithModel(message, uploadedFiles = [], options = {}) {
    const workflowDecision = options.forceTask
        ? (0, workflow_decision_1.explicitWorkflowDecision)("execute_direct", "用户显式继续已有项目任务")
        : await (0, workflow_decision_1.decideWorkflowWithModel)({
            message,
            scope: "project",
            sourceCount: Array.isArray(uploadedFiles) ? uploadedFiles.length : 0,
            context: {
                project: String(options.project || ""),
                attachments: (uploadedFiles || []).map((file) => ({
                    name: String(file?.filename || file?.name || ""),
                    type: String(file?.type || ""),
                    size: Number(file?.size || 0),
                })),
            },
        });
    const mode = workflowDecision.mode === "answer"
        ? "conversation"
        : workflowDecision.mode === "project_analysis"
            ? "project_analysis"
            : "task";
    return {
        mode,
        executable: workflowDecision.actionRequired,
        reason: workflowDecision.reason,
        workflowDecision,
    };
}
function runProjectChatIntentSelfTest() {
    const cases = [
        ["你好", "answer", "conversation"],
        ["你是什么模型", "answer", "conversation"],
        ["这个项目是什么架构？", "project_analysis", "project_analysis"],
        ["修改登录接口并运行测试", "execute_direct", "task"],
        ["先规划认证重构再实施", "plan_task", "task"],
    ];
    const checks = cases.map(([message, modelMode, expected]) => {
        const workflowDecision = (0, workflow_decision_1.normalizeWorkflowDecision)({ mode: modelMode, reason: "脚本化模型决策" });
        const actual = workflowDecision.mode === "answer"
            ? "conversation"
            : workflowDecision.mode === "project_analysis"
                ? "project_analysis"
                : "task";
        return { message, expected, actual, workflowDecision };
    });
    return { success: checks.every(item => item.actual === item.expected), checks };
}
//# sourceMappingURL=project-chat-intent.js.map