import { type WorkflowDecision } from "../../agents/workflow-decision";
export type ProjectChatMode = "conversation" | "project_analysis" | "task";
export type ProjectChatIntent = {
    mode: ProjectChatMode;
    executable: boolean;
    reason: string;
    workflowDecision?: WorkflowDecision;
};
export declare function classifyProjectChatIntent(message: string, uploadedFiles?: any[], options?: {
    forceTask?: boolean;
}): ProjectChatIntent;
/**
 * 健康自动入口唯一使用的项目聊天语义决策。
 * 本地 classifyProjectChatIntent 仅保留给诊断/旧数据展示，不得在模型失败时创建任务。
 */
export declare function classifyProjectChatIntentWithModel(message: string, uploadedFiles?: any[], options?: {
    forceTask?: boolean;
    project?: string;
}): Promise<ProjectChatIntent>;
export declare function runProjectChatIntentSelfTest(): {
    success: boolean;
    checks: {
        message: "你好" | "你是什么模型" | "这个项目是什么架构？" | "修改登录接口并运行测试" | "先规划认证重构再实施";
        expected: "task" | "project_analysis" | "conversation";
        actual: ProjectChatMode;
        workflowDecision: WorkflowDecision;
    }[];
};
