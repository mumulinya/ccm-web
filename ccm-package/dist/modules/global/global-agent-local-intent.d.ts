export type LocalIntentResult = {
    reply: string;
    action: any;
    intent?: {
        category: "conversation" | "question" | "analysis" | "execution" | "high_risk" | "ambiguous";
        goal: string;
        action_required: boolean;
        confidence: number;
        authorization_basis: "none" | "current_message" | "confirmation";
        reason: string;
    };
};
export declare function normalizeText(value: string): string;
export declare function stripActionWords(value: string): string;
export declare const RANDOM_MUSIC_KEYWORD = "__random__";
export declare function parseMusicKeyword(message: string): string;
export declare function findProjectName(message: string, projects: string[]): string;
export declare function findGroup(message: string, groups: any[]): any;
export declare function findAllProjectNames(message: string, projects: string[]): string[];
export declare function resolveImplicitCurrentProject(message: string, projects: string[]): string;
export declare function findAllGroups(message: string, groups: any[]): any[];
export declare function buildLocalDevelopmentTargets(message: string, projects: string[], groups: any[]): ({
    type: string;
    group_id: any;
    reason: string;
    task: string;
} | {
    type: string;
    project: string;
    reason: string;
    task: string;
})[];
/**
 * 仅用于大模型不可用时的保底判断。正常聊天路径由大模型决定是否产生 action，
 * 这里不能因为出现“知识库 / 实现 / 优化”等主题词就自动创建项目任务。
 */
export declare function hasExplicitDevelopmentExecutionIntent(message: string): boolean;
export declare function chineseNumberToInt(value: string): number;
export declare function normalizeCronHour(raw: string, text: string): number;
export declare function guessCronSchedule(message: string): string;
export declare function inferLocalConversationFallback(message: string): LocalIntentResult | null;
export declare function hasExplicitGlobalWriteAuthorization(message: string): boolean;
export declare function inferLocalGlobalAction(message: string, projects: string[], groups: any[], resources?: any): LocalIntentResult | null;
export declare function createActionBlockSafeStreamer(emit: (text: string) => void): {
    push(text: string): void;
    finish(): void;
};
