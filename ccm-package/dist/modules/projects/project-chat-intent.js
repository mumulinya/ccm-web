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
        ? (0, workflow_decision_1.explicitWorkflowDecision)("用户显式继续已有项目任务", { actionRequired: true, requiresCodeChanges: true })
        : await (0, workflow_decision_1.decideWorkflowWithModel)({
            message,
            scope: "project",
            sourceCount: Array.isArray(uploadedFiles) ? uploadedFiles.length : 0,
            context: {
                project: String(options.project || ""),
                project_session_id: String(options.sessionId || ""),
                attachments: (uploadedFiles || []).map((file) => ({
                    name: String(file?.filename || file?.name || ""),
                    type: String(file?.type || ""),
                    size: Number(file?.size || 0),
                })),
            },
        });
    return {
        executable: (0, workflow_decision_1.isDevelopmentTaskWorkflowDecision)(workflowDecision),
        reason: workflowDecision.reason,
        workflowDecision,
    };
}
function runProjectChatIntentSelfTest() {
    const cases = [
        ["你好", false, false],
        ["你是什么模型", false, false],
        ["这个项目是什么架构？", false, false],
        ["修改登录接口并运行测试", true, true],
        ["先规划认证重构再实施", true, true],
    ];
    const checks = cases.map(([message, actionRequired, expected]) => {
        const workflowDecision = (0, workflow_decision_1.normalizeWorkflowDecision)({
            reason: "脚本化模型决策",
            actionRequired,
            requiresCodeChanges: actionRequired,
        });
        const actual = (0, workflow_decision_1.isDevelopmentTaskWorkflowDecision)(workflowDecision);
        return { message, expected, actual, workflowDecision };
    });
    return { success: checks.every(item => item.actual === item.expected), checks };
}
//# sourceMappingURL=project-chat-intent.js.map