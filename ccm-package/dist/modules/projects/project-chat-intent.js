"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.classifyProjectChatIntent = classifyProjectChatIntent;
exports.classifyProjectChatIntentWithModel = classifyProjectChatIntentWithModel;
exports.runProjectChatIntentSelfTest = runProjectChatIntentSelfTest;
const workflow_decision_1 = require("../../agents/workflow-decision");
const GREETING_ONLY = /^(你好|您好|hi|hello|hey|在吗|在不在|早上好|下午好|晚上好|谢谢|感谢|ok|好的|嗯|哦|哈喽)[。.!！?？\s]*$/i;
const ORDINARY_QUESTION = /^(你|我|它|这个|那个|模型|系统|项目\s*Agent|agent|Agent).{0,48}(是什么|是谁|是啥|什么意思|叫什么|什么模型|能做什么|怎么样|有问题吗|需要吗)[。.!！?？\s]*$/i;
const PROJECT_ANALYSIS_SIGNAL = /项目|代码|仓库|架构|技术栈|目录|文件|模块|接口|页面|组件|数据库|配置|依赖|怎么运行|如何运行|能运行吗|可以运行吗/i;
const ACTION_SIGNALS = [
    /(?:帮我|给我|请|麻烦|需要|开始|继续).{0,28}(?:实现|新增|添加|修改|修复|删除|优化|重构|接入|配置|部署|测试|检查|创建|开发|完成|生成|编写|补充|对接|支持|运行|执行|跑|改|加|做|写)/i,
    /(?:实现|新增|添加|修改|修复|删除|优化|重构|接入|配置|部署|测试|检查|创建|开发|完成|生成|编写|补充|对接|支持|运行|执行|跑).{0,44}(?:功能|接口|页面|组件|代码|项目|文件|数据库|服务|测试|配置|bug|API)/i,
    /(?:把|将).{1,90}(?:改成|修改为|接入|迁移|重构|删掉|删除|加上|加入|换成|拆成|合并)/i,
    /(?:报错|错误|bug|失败|不能用|崩溃|异常).{0,44}(?:修|修复|看一下|排查|解决|处理)/i,
    /(?:提交|发布|上线|构建|编译|单测|测试|接口|页面|组件|数据库|路由|权限|登录|支付|订单|表单|样式|前端|后端).{0,44}(?:实现|新增|修改|修复|优化|检查|补充|接入|部署|运行)/i,
];
function classifyProjectChatIntent(message, uploadedFiles = [], options = {}) {
    const text = String(message || "").trim();
    const compact = text.replace(/\s+/g, "");
    const hasAttachment = Array.isArray(uploadedFiles) && uploadedFiles.length > 0;
    const executable = options.forceTask === true || hasAttachment || ACTION_SIGNALS.some(pattern => pattern.test(text));
    if (executable) {
        return {
            mode: "task",
            executable: true,
            reason: options.forceTask ? "继续已有项目任务" : hasAttachment ? "包含待处理附件" : "包含明确修改或执行意图",
        };
    }
    if (GREETING_ONLY.test(compact) || ORDINARY_QUESTION.test(compact)) {
        return { mode: "conversation", executable: false, reason: "普通问答，不展示任务链路" };
    }
    if (PROJECT_ANALYSIS_SIGNAL.test(text)) {
        return { mode: "project_analysis", executable: false, reason: "只读项目询问，不展示任务链路" };
    }
    return { mode: "conversation", executable: false, reason: "未发现明确项目执行动作" };
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