export type DevelopmentAgentProvider = "codex" | "cursor" | "gemini" | "opencode" | "claudecode";
type CliAgentProviderSettings = {
    enabled: boolean;
    authMode: "cli_login";
    model: string;
};
type StoredAgentProviderSettings = {
    version: 4;
    codex: CliAgentProviderSettings;
    cursor: CliAgentProviderSettings;
    gemini: CliAgentProviderSettings;
    opencode: CliAgentProviderSettings;
    claudecode: {
        enabled: boolean;
        authMode: "api";
        apiUrl: string;
        apiKey: string;
        credentialType: "api_key" | "auth_token";
        model: string;
        syncExternal: boolean;
    };
    updatedAt: string;
};
type InstallState = {
    status: "idle" | "running" | "succeeded" | "failed";
    startedAt?: string;
    completedAt?: string;
    output?: string;
    error?: string;
    pid?: number;
};
type LoginSessionStatus = "starting" | "awaiting_browser" | "awaiting_code" | "exchanging" | "succeeded" | "failed";
export declare function loadStoredAgentProviderSettings(): StoredAgentProviderSettings;
export declare function loadAgentProviderSettings(): {
    claudecode: {
        apiKey: string;
        enabled: boolean;
        authMode: "api";
        apiUrl: string;
        credentialType: "api_key" | "auth_token";
        model: string;
        syncExternal: boolean;
    };
    version: 4;
    codex: CliAgentProviderSettings;
    cursor: CliAgentProviderSettings;
    gemini: CliAgentProviderSettings;
    opencode: CliAgentProviderSettings;
    updatedAt: string;
};
export declare function resolveEffectiveClaudeProviderSettings(settings?: {
    claudecode: {
        apiKey: string;
        enabled: boolean;
        authMode: "api";
        apiUrl: string;
        credentialType: "api_key" | "auth_token";
        model: string;
        syncExternal: boolean;
    };
    version: 4;
    codex: CliAgentProviderSettings;
    cursor: CliAgentProviderSettings;
    gemini: CliAgentProviderSettings;
    opencode: CliAgentProviderSettings;
    updatedAt: string;
}): {
    source: "ccm";
    providerName: string;
    externalManaged: boolean;
    apiKey: string;
    enabled: boolean;
    authMode: "api";
    apiUrl: string;
    credentialType: "api_key" | "auth_token";
    model: string;
    syncExternal: boolean;
} | {
    enabled: boolean;
    apiUrl: string;
    apiKey: string;
    credentialType: "api_key" | "auth_token";
    model: string;
    source: "cc-switch" | "external-file";
    providerName: string;
    externalManaged: boolean;
    authMode: "api";
    syncExternal: boolean;
};
export declare function saveAgentProviderSettings(updates: any): {
    claudecode: {
        apiKey: string;
        enabled: boolean;
        authMode: "api";
        apiUrl: string;
        credentialType: "api_key" | "auth_token";
        model: string;
        syncExternal: boolean;
    };
    version: 4;
    codex: CliAgentProviderSettings;
    cursor: CliAgentProviderSettings;
    gemini: CliAgentProviderSettings;
    opencode: CliAgentProviderSettings;
    updatedAt: string;
};
export declare function publicAgentProviderSettings(settings?: {
    claudecode: {
        apiKey: string;
        enabled: boolean;
        authMode: "api";
        apiUrl: string;
        credentialType: "api_key" | "auth_token";
        model: string;
        syncExternal: boolean;
    };
    version: 4;
    codex: CliAgentProviderSettings;
    cursor: CliAgentProviderSettings;
    gemini: CliAgentProviderSettings;
    opencode: CliAgentProviderSettings;
    updatedAt: string;
}): {
    version: 4;
    codex: CliAgentProviderSettings;
    cursor: CliAgentProviderSettings;
    gemini: CliAgentProviderSettings;
    opencode: CliAgentProviderSettings;
    claudecode: {
        manualEnabled: boolean;
        hasKey: boolean;
        credentialProtected: boolean;
        source: "ccm";
        providerName: string;
        externalManaged: boolean;
        enabled: boolean;
        authMode: "api";
        apiUrl: string;
        credentialType: "api_key" | "auth_token";
        model: string;
        syncExternal: boolean;
    } | {
        manualEnabled: boolean;
        hasKey: boolean;
        credentialProtected: boolean;
        enabled: boolean;
        apiUrl: string;
        credentialType: "api_key" | "auth_token";
        model: string;
        source: "cc-switch" | "external-file";
        providerName: string;
        externalManaged: boolean;
        authMode: "api";
        syncExternal: boolean;
    };
    updatedAt: string;
};
export declare function resolveCursorAgentCommand(): string;
export declare function getAgentProviderAccountIdentity(providerValue: string): string;
export declare function parseCursorAuthStatus(rawOutput: string, exitCode: number | null): {
    loggedIn: boolean;
    account: string;
    detail: string;
};
export declare function refreshAgentProviderStatusesAsync(): Promise<any>;
export declare function getAgentProviderStatuses(force?: boolean): any;
export declare function startAgentProviderInstall(providerValue: string): {
    provider: DevelopmentAgentProvider;
    launched: boolean;
    install: InstallState;
};
export declare function buildAgentProviderTestSpec(providerValue: string, modelValue?: string, promptFile?: string): {
    command: string;
    args: string[];
    env: Record<string, string>;
};
export declare function parseAgentProviderTestOutput(rawOutput: string, selectedModel?: string): {
    usable: boolean;
    model: string;
};
export declare function testAgentProvider(providerValue: string, modelValue?: string): Promise<any>;
export declare function getAgentProviderModels(providerValue: string): Promise<{
    provider: "codex";
    selected: string;
    models: {
        id: string;
        label: string;
    }[];
    allowsCustom: boolean;
    source: string;
    error: string;
} | {
    provider: "cursor";
    selected: string;
    models: any[];
    allowsCustom: boolean;
    error: string;
    source?: undefined;
} | {
    provider: "cursor";
    selected: string;
    models: {
        id: string;
        label: string;
    }[];
    allowsCustom: boolean;
    source: string;
    error: string;
} | {
    provider: "claudecode";
    selected: string;
    models: any;
    allowsCustom: boolean;
    source: string;
    error: string;
} | {
    provider: "gemini";
    selected: string;
    models: any[];
    allowsCustom: boolean;
    source: string;
    error: string;
} | {
    provider: "opencode";
    selected: string;
    models: {
        id: string;
        label: string;
    }[];
    allowsCustom: boolean;
    source: string;
    error: string;
}>;
export declare function parseAgentProviderLoginProgress(providerValue: string, rawOutput: string): {
    authUrl: any;
    userCode: string;
    awaitingCode: boolean;
    succeeded: boolean;
    failed: boolean;
};
export declare function startAgentProviderLogin(providerValue: string): {
    sessionId: string;
    provider: DevelopmentAgentProvider;
    status: LoginSessionStatus;
    startedAt: string;
    expiresAt: string;
    authUrl: string;
    userCode: string;
    requiresCode: boolean;
    detail: string;
    error: string;
    command: string;
    launched: boolean;
    browser: boolean;
};
export declare function getAgentProviderLoginSession(providerValue: string, sessionIdValue: string): {
    sessionId: string;
    provider: DevelopmentAgentProvider;
    status: LoginSessionStatus;
    startedAt: string;
    expiresAt: string;
    authUrl: string;
    userCode: string;
    requiresCode: boolean;
    detail: string;
    error: string;
    command: string;
};
export declare function submitAgentProviderLoginCode(providerValue: string, sessionIdValue: string, codeValue: string): {
    sessionId: string;
    provider: DevelopmentAgentProvider;
    status: LoginSessionStatus;
    startedAt: string;
    expiresAt: string;
    authUrl: string;
    userCode: string;
    requiresCode: boolean;
    detail: string;
    error: string;
    command: string;
};
export declare function logoutAgentProvider(providerValue: string): {
    provider: "gemini";
    loggedOut: boolean;
    interactive?: undefined;
    manual?: undefined;
    command?: undefined;
} | {
    provider: "opencode";
    loggedOut: boolean;
    interactive: boolean;
    manual: boolean;
    command: string;
} | {
    provider: "opencode";
    loggedOut: boolean;
    interactive: boolean;
    manual?: undefined;
    command?: undefined;
} | {
    provider: "claudecode" | "codex" | "cursor";
    loggedOut: boolean;
    interactive?: undefined;
    manual?: undefined;
    command?: undefined;
};
export declare function getConfiguredDevelopmentAgentEnv(agentType: string): Record<string, string>;
export declare function getConfiguredDevelopmentAgentModel(agentType: string): string;
export declare function usesCodexCliLogin(): boolean;
export declare function isDevelopmentAgentEnabled(agentType: string): boolean;
export declare function isDevelopmentAgentReady(agentType: string): boolean;
export declare function agentProviderSettingsFile(): string;
export {};
