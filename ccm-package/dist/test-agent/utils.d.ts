export declare function nowIso(): string;
export declare function asArray(value: any): any[];
export declare function compactText(value: any, max?: number): string;
export declare function safeSegment(value: string, fallback?: string): string;
export declare function makeRunId(prefix?: string): string;
export declare function ensureDir(dir: string): string;
export declare function defaultArtifactDir(runId: string): string;
export declare function resolveWorkDir(workDir: string): string;
export declare function validateTestAgentWorkDir(workDir: string): {
    valid: boolean;
    resolved: string;
    error: string;
};
export declare function validateTestAgentUrl(value: string, baseUrl?: string): {
    valid: boolean;
    url: string;
    error: string;
};
export declare function isLikelyProductionTestAgentUrl(value: string): boolean;
export declare function stringifyEnv(env: Record<string, string | number | boolean | undefined> | undefined): Record<string, string>;
export declare function splitVerificationCommand(command: string): {
    tokens: string[];
    error: string;
};
export declare function verificationCommandInvocation(command: string): {
    executable: string;
    args: string[];
    requiresShell: boolean;
    error: string;
};
export declare function buildTestAgentSubprocessEnv(projectEnv?: Record<string, string>): NodeJS.ProcessEnv;
export declare function redactTestAgentSensitiveText(value: any, secrets?: string[]): string;
export declare function appendLimited(current: string, chunk: any, maxChars: number): string;
export declare function isUnsafeVerificationCommand(command: string): string;
export declare function resolveUrl(baseUrl: string, maybeUrl: string): string;
export declare function hasRequiredCheck(requiredChecks: string[], pattern: RegExp): boolean;
