export type DevelopmentAgentProvider = "codex" | "cursor" | "gemini" | "opencode" | "claudecode";
type CliAgentProviderSettings = {
    enabled: boolean;
    authMode: "cli_login";
    model: string;
};
type StoredAgentProviderSettings = {
    version: 3;
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
export declare function loadStoredAgentProviderSettings(): StoredAgentProviderSettings;
export declare function loadAgentProviderSettings(): {
    claudecode: {
        apiKey: string;
        enabled: boolean;
        authMode: "api";
        apiUrl: string;
        credentialType: "api_key" | "auth_token";
        model: string;
    };
    version: 3;
    codex: CliAgentProviderSettings;
    cursor: CliAgentProviderSettings;
    gemini: CliAgentProviderSettings;
    opencode: CliAgentProviderSettings;
    updatedAt: string;
};
export declare function saveAgentProviderSettings(updates: any): {
    claudecode: {
        apiKey: string;
        enabled: boolean;
        authMode: "api";
        apiUrl: string;
        credentialType: "api_key" | "auth_token";
        model: string;
    };
    version: 3;
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
    };
    version: 3;
    codex: CliAgentProviderSettings;
    cursor: CliAgentProviderSettings;
    gemini: CliAgentProviderSettings;
    opencode: CliAgentProviderSettings;
    updatedAt: string;
}): {
    version: 3;
    codex: CliAgentProviderSettings;
    cursor: CliAgentProviderSettings;
    gemini: CliAgentProviderSettings;
    opencode: CliAgentProviderSettings;
    claudecode: {
        hasKey: boolean;
        credentialProtected: boolean;
        enabled: boolean;
        authMode: "api";
        apiUrl: string;
        credentialType: "api_key" | "auth_token";
        model: string;
    };
    updatedAt: string;
};
export declare function resolveCursorAgentCommand(): string;
export declare function getAgentProviderStatuses(force?: boolean): any;
export declare function startAgentProviderInstall(providerValue: string): {
    provider: DevelopmentAgentProvider;
    launched: boolean;
    install: InstallState;
};
export declare function getAgentProviderModels(providerValue: string): {
    provider: "codex";
    selected: string;
    models: {
        id: string;
        label: string;
    }[];
    allowsCustom: boolean;
    error?: undefined;
} | {
    provider: "cursor";
    selected: string;
    models: {
        id: string;
        label: string;
    }[];
    allowsCustom: boolean;
    error: string;
} | {
    provider: "claudecode";
    selected: string;
    models: {
        id: string;
        label: string;
    }[];
    allowsCustom: boolean;
    error?: undefined;
} | {
    provider: "gemini";
    selected: string;
    models: {
        id: string;
        label: string;
    }[];
    allowsCustom: boolean;
    error?: undefined;
} | {
    provider: "opencode";
    selected: string;
    models: {
        id: string;
        label: string;
    }[];
    allowsCustom: boolean;
    error: string;
};
export declare function startAgentProviderLogin(providerValue: string): {
    provider: DevelopmentAgentProvider;
    launched: boolean;
};
export declare function logoutAgentProvider(providerValue: string): {
    provider: "gemini";
    loggedOut: boolean;
    interactive?: undefined;
} | {
    provider: "opencode";
    loggedOut: boolean;
    interactive: boolean;
} | {
    provider: "claudecode" | "codex" | "cursor";
    loggedOut: boolean;
    interactive?: undefined;
};
export declare function getConfiguredDevelopmentAgentEnv(agentType: string): Record<string, string>;
export declare function getConfiguredDevelopmentAgentModel(agentType: string): string;
export declare function usesCodexCliLogin(): boolean;
export declare function isDevelopmentAgentEnabled(agentType: string): boolean;
export declare function isDevelopmentAgentReady(agentType: string): boolean;
export declare function agentProviderSettingsFile(): string;
export {};
