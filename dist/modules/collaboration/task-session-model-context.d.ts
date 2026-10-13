export declare function validatePrivateTaskGroupMemory(groupId: string, options: any): boolean;
/** Private execution identities read the task's archive, never an active chat fallback. */
export declare function buildPrivateTaskModelContext(scope: "project" | "group" | "global", scopeId: string, exactSessionId: string, taskId: string): any;
