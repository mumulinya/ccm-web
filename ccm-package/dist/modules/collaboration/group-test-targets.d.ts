export type GroupTestTargetKind = "web" | "h5" | "api" | "hybrid_app" | "native_app" | "other";
export type GroupTestTargetAuthMode = "none" | "credentials" | "storage_state" | "existing_session";
export type StoredGroupTestTarget = {
    id: string;
    project: string;
    name: string;
    kind: GroupTestTargetKind;
    environment: string;
    enabled: boolean;
    required: boolean;
    baseUrl: string;
    startupCommand: string;
    verificationCommands: string[];
    notes: string;
    auth: {
        mode: GroupTestTargetAuthMode;
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
export type ResolvedGroupTestTarget = StoredGroupTestTarget & {
    checksum: string;
    env: Record<string, string>;
};
export declare function listGroupTestTargets(groupId: string): {
    schema: string;
    groupId: string;
    projects: string[];
    targets: any;
};
export declare function publicGroupWithoutTestTargetSecrets(group: any): any;
export declare function saveGroupTestTarget(groupId: string, input: any): {
    projectAvailable: boolean;
    checksum: string;
    auth: {
        fields: {
            hasValue: boolean;
            credentialProtected: boolean;
            id: string;
            label: string;
            envName: string;
            inputLabel: string;
        }[];
        mode: GroupTestTargetAuthMode;
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
    kind: GroupTestTargetKind;
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
export declare function deleteGroupTestTarget(groupId: string, targetId: string): {
    success: boolean;
    deletedId: string;
};
export declare function resolveGroupTestTargets(groupId: string, projectNames?: string[], targetIds?: string[]): ResolvedGroupTestTarget[];
export declare function resolveTargetStorageStatePath(workDir: string, configuredPath: string): string;
