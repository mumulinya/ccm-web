export type ProjectTestTargetKind = "web" | "h5" | "api" | "hybrid_app" | "native_app" | "other";
export type ProjectTestTargetAuthMode = "none" | "credentials" | "storage_state" | "existing_session";
export type StoredProjectTestTarget = {
    id: string;
    project: string;
    name: string;
    kind: ProjectTestTargetKind;
    environment: string;
    enabled: boolean;
    required: boolean;
    baseUrl: string;
    startupCommand: string;
    verificationCommands: string[];
    notes: string;
    auth: {
        mode: ProjectTestTargetAuthMode;
        loginPath: string;
        submitLabel: string;
        successText: string;
        successUrlIncludes: string;
        storageStatePath: string;
        existingSessionProvider: "auto" | "claude-in-chrome" | "chrome-devtools";
        fields: Array<{
            id: string;
            label: string;
            envName: string;
            inputLabel: string;
            valueRef: string;
        }>;
    };
    createdAt: string;
    updatedAt: string;
};
export type ResolvedProjectTestTarget = StoredProjectTestTarget & {
    checksum: string;
    env: Record<string, string>;
};
export declare function listProjectTestTargets(projectInput: string): {
    schema: string;
    project: string;
    projects: string[];
    projectAuth: {
        schema: string;
        project: string;
        enabled: boolean;
        mode: import("./project-test-auth").ProjectTestAuthMode;
        baseUrl: string;
        loginPath: string;
        usernameLabel: string;
        passwordLabel: string;
        submitLabel: string;
        successText: string;
        successUrlIncludes: string;
        storageStatePath: string;
        existingSessionProvider: "auto" | "claude-in-chrome" | "chrome-devtools";
        usernameConfigured: boolean;
        passwordConfigured: boolean;
        credentialProtected: boolean;
        checksum: string;
        updatedAt: string;
    };
    targets: any;
};
export declare function saveProjectTestTarget(projectInput: string, input: any): {
    checksum: string;
    projectAvailable: boolean;
    auth: {
        fields: {
            hasValue: boolean;
            credentialProtected: boolean;
            id: string;
            label: string;
            envName: string;
            inputLabel: string;
        }[];
        mode: ProjectTestTargetAuthMode;
        loginPath: string;
        submitLabel: string;
        successText: string;
        successUrlIncludes: string;
        storageStatePath: string;
        existingSessionProvider: "auto" | "claude-in-chrome" | "chrome-devtools";
    };
    id: string;
    project: string;
    name: string;
    kind: ProjectTestTargetKind;
    environment: string;
    enabled: boolean;
    required: boolean;
    baseUrl: string;
    startupCommand: string;
    verificationCommands: string[];
    notes: string;
    createdAt: string;
    updatedAt: string;
};
export declare function deleteProjectTestTarget(projectInput: string, targetIdInput: string): {
    success: boolean;
    deletedId: string;
};
export declare function resolveProjectTestTargets(projectInput: string, targetIds?: string[]): ResolvedProjectTestTarget[];
export declare function resolveProjectTargetStorageStatePath(workDir: string, configuredPath: string): string;
export declare function runProjectTestTargetsSelfTest(): {
    success: boolean;
    checks: {
        exactProject: boolean;
        normalizedUrl: boolean;
    };
};
