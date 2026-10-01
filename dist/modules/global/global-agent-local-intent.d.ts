export type LocalIntentResult = {
    reply: string;
    action: any;
    intent?: Record<string, any>;
};
export declare const RANDOM_MUSIC_KEYWORD = "__random__";
export declare function normalizeText(value: string): string;
export declare function stripActionWords(value: string): string;
export declare function parseMusicKeyword(message: string): string;
export declare function findProjectName(message: string, projects: string[]): string;
export declare function findAllProjectNames(message: string, projects: string[]): string[];
export declare function findGroup(message: string, groups: any[]): any;
export declare function findAllGroups(message: string, groups: any[]): any[];
export declare function resolveImplicitCurrentProject(_message: string, _projects: string[]): string;
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
export declare function hasExplicitDevelopmentExecutionIntent(_message: string): boolean;
export declare function hasExplicitGlobalWriteAuthorization(_message: string): boolean;
export declare function inferLocalConversationFallback(_message: string): LocalIntentResult | null;
export declare function inferLocalGlobalAction(_message: string, _projects: string[], _groups: any[], _resources?: any): LocalIntentResult | null;
export declare function chineseNumberToInt(value: string): number;
export declare function normalizeCronHour(raw: string, _text: string): number;
export declare function guessCronSchedule(message: string): string;
export declare function createActionBlockSafeStreamer(emit: (text: string) => void): {
    push(text: string): void;
    finish(): void;
};
