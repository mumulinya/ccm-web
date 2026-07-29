import {
  decideWorkflowWithModel,
  explicitWorkflowDecision,
  normalizeWorkflowDecision,
  type WorkflowDecision,
} from "../../agents/workflow-decision";

export type ProjectChatMode = "conversation" | "project_analysis" | "task";

export type ProjectChatIntent = {
  mode: ProjectChatMode;
  executable: boolean;
  reason: string;
  workflowDecision?: WorkflowDecision;
};

export function classifyProjectChatIntent(message: string, uploadedFiles: any[] = [], options: { forceTask?: boolean } = {}): ProjectChatIntent {
  void message;
  void uploadedFiles;
  void options;
  throw new Error("同步关键词项目意图分类已停用；请调用 classifyProjectChatIntentWithModel");
}

/**
 * 健康自动入口唯一使用的项目聊天语义决策。
 * 本地 classifyProjectChatIntent 仅保留给诊断/旧数据展示，不得在模型失败时创建任务。
 */
export async function classifyProjectChatIntentWithModel(
  message: string,
  uploadedFiles: any[] = [],
  options: { forceTask?: boolean; project?: string; sessionId?: string } = {},
): Promise<ProjectChatIntent> {
  const workflowDecision = options.forceTask
    ? explicitWorkflowDecision("execute_direct", "用户显式继续已有项目任务")
    : await decideWorkflowWithModel({
        message,
        scope: "project",
        sourceCount: Array.isArray(uploadedFiles) ? uploadedFiles.length : 0,
        context: {
          project: String(options.project || ""),
          project_session_id: String(options.sessionId || ""),
          attachments: (uploadedFiles || []).map((file: any) => ({
            name: String(file?.filename || file?.name || ""),
            type: String(file?.type || ""),
            size: Number(file?.size || 0),
          })),
        },
      });
  const mode: ProjectChatMode = workflowDecision.mode === "answer"
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

export function runProjectChatIntentSelfTest() {
  const cases = [
    ["你好", "answer", "conversation"],
    ["你是什么模型", "answer", "conversation"],
    ["这个项目是什么架构？", "project_analysis", "project_analysis"],
    ["修改登录接口并运行测试", "execute_direct", "task"],
    ["先规划认证重构再实施", "plan_task", "task"],
  ] as const;
  const checks = cases.map(([message, modelMode, expected]) => {
    const workflowDecision = normalizeWorkflowDecision({ mode: modelMode, reason: "脚本化模型决策" });
    const actual: ProjectChatMode = workflowDecision.mode === "answer"
      ? "conversation"
      : workflowDecision.mode === "project_analysis"
        ? "project_analysis"
        : "task";
    return { message, expected, actual, workflowDecision };
  });
  return { success: checks.every(item => item.actual === item.expected), checks };
}
