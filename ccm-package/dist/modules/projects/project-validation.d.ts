export declare const PROJECT_AGENT_TYPES: ("claudecode" | "codex" | "cursor" | "gemini" | "opencode" | "qoder")[];
export declare const PROJECT_PLATFORMS: readonly ["feishu", "lark", "weixin", "telegram", "slack", "discord"];
export declare function validateProjectName(value: unknown): string;
export declare function validateSessionId(value: unknown): string;
export declare function validateSharedFileName(value: unknown): string;
export declare function validateAgentType(value: unknown, fallback?: string): string;
export declare function validateProjectPlatform(value: unknown, fallback?: string): string;
export declare function validateWorkDirectory(value: unknown): string;
export declare function resolveContainedPath(root: string, ...parts: string[]): string;
