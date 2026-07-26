export type ProjectTestAuthMode = "none" | "credentials" | "storage_state" | "existing_session";
export declare function getProjectTestAuthProfile(projectInput: string): {
    schema: string;
    project: string;
    enabled: boolean;
    mode: ProjectTestAuthMode;
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
export declare function saveProjectTestAuthProfile(projectInput: string, input: any): {
    schema: string;
    project: string;
    enabled: boolean;
    mode: ProjectTestAuthMode;
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
export declare function resolveProjectTestAuthProfile(projectInput: string): {
    fields: {
        id: string;
        label: string;
        envName: string;
        inputLabel: string;
        valueRef: string;
    }[];
    env: {
        [x: string]: string;
    };
    schema: string;
    project: string;
    enabled: boolean;
    mode: ProjectTestAuthMode;
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
export declare function runProjectTestAuthContractSelfTest(): {
    success: boolean;
    checks: {
        normalizedBaseUrl: boolean;
        credentialsReportedWithoutValues: boolean;
    };
};
