export declare const MANAGED_LANGUAGE_SERVER_MANIFEST_SCHEMA: "ccm-managed-language-server-manifest-v1";
export type ManagedLanguageServerPreview = {
    schema: typeof MANAGED_LANGUAGE_SERVER_MANIFEST_SCHEMA;
    serverId: string;
    version: string;
    languages: string[];
    platform: string;
    architecture: string;
    source: string;
    artifactChecksum: string;
    manifestChecksum: string;
    revision: number;
    installState: "missing" | "previewed" | "installing" | "available" | "failed";
    installSupported: boolean;
    expiresAt: string;
    contentStored: false;
};
type ManagedInstallRecord = ManagedLanguageServerPreview & {
    installerKind?: "npm" | "go_toolchain" | "artifact_archive" | "jdtls_bundle" | "kotlin_bundle" | "dotnet_tool" | "ruby_bundle";
    packageName?: string;
    commandName?: string;
    executablePath?: string;
    launchArgs?: string[];
    launchEnvironment?: Record<string, string>;
    artifactUrl?: string;
    artifactChecksumAlgorithm?: "sha256" | "sha512";
    artifactRoot?: string;
    toolchainVersion?: string;
    toolchainUrl?: string;
    toolchainChecksum?: string;
    toolchainChecksumAlgorithm?: "sha256" | "sha512";
    packageUrl?: string;
    packageChecksum?: string;
    extractorPackage?: string;
    extractorVersion?: string;
    extractorIntegrity?: string;
    errorSummary?: string;
    updatedAt: string;
};
export declare function managedLanguageServerInstallSupported(serverId: string): boolean;
export declare function getManagedLanguageServerRecord(serverId: string): ManagedInstallRecord;
export declare function listManagedLanguageServerInstallations(): ManagedLanguageServerPreview[];
export declare function resolveManagedLanguageServerCommand(serverId: string): string;
export declare function resolveManagedLanguageServerLaunch(serverId: string, workspaceRoot: string): {
    command: string;
    args: string[];
    env: {
        [k: string]: string;
    };
};
export declare function previewManagedLanguageServerInstall(serverId: string): Promise<ManagedLanguageServerPreview>;
export declare function startManagedLanguageServerInstall(serverId: string, input: {
    manifestChecksum?: string;
    revision?: number;
}): ManagedLanguageServerPreview;
export declare function managedLanguageServerError(serverId: string): string;
export {};
