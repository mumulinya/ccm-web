export type ProjectChatMode = "conversation" | "project_analysis" | "task";
export type ProjectChatIntent = {
    mode: ProjectChatMode;
    executable: boolean;
    reason: string;
};
export declare function classifyProjectChatIntent(message: string, uploadedFiles?: any[], options?: {
    forceTask?: boolean;
}): ProjectChatIntent;
export declare function runProjectChatIntentSelfTest(): {
    success: boolean;
    checks: {
        message: "你好" | "你是什么模型" | "这个项目是什么架构？" | "修改登录接口并运行测试" | "帮我修复登录 bug 并跑测试";
        expected: "task" | "conversation" | "project_analysis";
        actual: ProjectChatMode;
    }[];
};
