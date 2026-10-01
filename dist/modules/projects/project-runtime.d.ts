import { ManagedProcessStopReceiptV2 } from "../../system/managed-process-tree";
export type ProjectRuntimeProfileV1 = {
    id: string;
    label: string;
    projectId: string;
    modulePath: string;
    projectType: "node" | "maven" | "gradle" | "go" | "rust" | "dotnet" | "python" | "php" | "ruby" | "elixir" | "dart" | "deno" | "swift" | "docker" | "make" | "cmake" | "jvm" | "custom";
    environment: string;
    runCommand: string;
    prepareCommand?: string;
    buildCommand: string;
    artifactPatterns: string[];
    source: "detected" | "manual";
    enabled: boolean;
    detectedChecksum: string;
    stale?: boolean;
};
export type ProjectJavaToolchainV1 = {
    schema: "ccm-project-java-toolchain-v1";
    jdkMode: "inherit" | "custom";
    jdkHome: string;
    mavenMode: "auto" | "wrapper" | "system" | "custom";
    mavenHome: string;
    settingsPath: string;
    localRepository: string;
    offline: boolean;
};
type RuntimeProcessState = {
    project: string;
    profileId: string;
    status: "starting" | "running" | "stopping" | "stopped" | "failed" | "unknown";
    pid: number;
    managerPid?: number;
    commandChecksum: string;
    workDir: string;
    startedAt: string;
    stoppedAt?: string;
    stopReason?: "user" | "exited" | "missing";
    exitCode?: number | null;
    error?: string;
    stopReceipt?: ManagedProcessStopReceiptV2;
};
type RuntimeBuildState = {
    project: string;
    profileId: string;
    status: "building" | "cancelling" | "succeeded" | "failed";
    pid: number;
    managerPid?: number;
    startedAt: string;
    finishedAt?: string;
    exitCode?: number | null;
    artifacts?: string[];
    error?: string;
};
type RuntimeLogEvent = {
    type: "reset" | "chunk";
    content: string;
};
export declare function resolveProjectIdentifier(project: unknown): any;
export declare function projectDisplayName(project: string): string;
export declare function saveProjectDisplayName(project: string, displayName: unknown): string;
export declare function detectProjectRuntimeProfilesAt(project: string, workDir: string): ProjectRuntimeProfileV1[];
export declare function detectProjectRuntimeProfiles(project: string): ProjectRuntimeProfileV1[];
export declare function getProjectRuntimeConfig(project: string): any;
export declare function rescanProjectRuntimeProfiles(project: string): any;
export declare function saveProjectRuntimeConfig(project: string, input: any): any;
export declare function detectProjectJavaToolchainCandidates(project: string): {
    schema: "ccm-project-java-toolchain-candidates-v1";
    project: string;
    jdk: {
        valid: boolean;
        home: string;
        source: string;
    }[];
    maven: {
        valid: boolean;
        home: string;
        source: string;
    }[];
    wrapper: {
        available: boolean;
        path: string;
    };
};
export declare function resolveProjectJavaToolchainExecution(project: string, override?: any): {
    configured: ProjectJavaToolchainV1;
    env: Record<string, string>;
    javaExecutable: string;
    mavenExecutable: string;
    mavenArgs: string[];
    checksum: string;
};
export declare function testProjectJavaToolchain(project: string, input?: any): {
    success: boolean;
    project: string;
    toolchain: ProjectJavaToolchainV1;
    java: {
        success: boolean;
        exitCode: number;
        output: string;
        error: string;
    };
    maven: {
        success: boolean;
        exitCode: number;
        output: string;
        error: string;
    };
};
export declare function stopManagedProjectRuntimesForShutdown(): Promise<{
    stoppedProcesses: number;
    stoppedBuilds: number;
    failures: ManagedProcessStopReceiptV2[];
}>;
export declare function startProjectRuntime(project: string, profileId?: unknown): {
    success: boolean;
    profile: any;
    state: RuntimeProcessState;
};
export declare function stopProjectRuntime(project: string, profileId?: unknown): Promise<{
    success: boolean;
    alreadyStopped: boolean;
    profile: any;
    state: RuntimeProcessState;
    transition_receipt?: undefined;
} | {
    success: boolean;
    profile: any;
    state: RuntimeProcessState;
    transition_receipt: ManagedProcessStopReceiptV2;
    alreadyStopped?: undefined;
}>;
export declare function stopAllProjectRuntimes(project: string): Promise<{
    success: boolean;
    project: string;
    stoppedProcesses: number;
    stoppedBuilds: number;
    failures: {
        profileId: string;
        kind: "run" | "build";
        error: string;
    }[];
}>;
export declare function restartProjectRuntime(project: string, profileId?: unknown): Promise<{
    success: boolean;
    profile: any;
    state: RuntimeProcessState;
}>;
export declare function buildProjectRuntime(project: string, profileId?: unknown): {
    success: boolean;
    profile: any;
    build: RuntimeBuildState;
};
export declare function getProjectRuntimeLogs(project: string, profileId: unknown, kind: unknown, lines?: number): {
    project: string;
    profileId: string;
    kind: "run" | "build";
    logs: string;
    logWriteError: string;
    truncated?: undefined;
} | {
    project: string;
    profileId: string;
    kind: "run" | "build";
    logs: string;
    truncated: boolean;
    logWriteError: string;
};
export declare function getProjectRuntimeLogsAsync(project: string, profileId: unknown, kind: unknown, lines?: number): Promise<{
    project: string;
    profileId: string;
    kind: "run" | "build";
    logs: string;
    truncated: boolean;
    logWriteError: string;
}>;
export declare function subscribeProjectRuntimeLogs(project: string, profileId: unknown, kind: unknown, listener: (event: RuntimeLogEvent) => void): () => void;
export declare function getProjectRuntimeSnapshot(project: string): any;
export declare function getProjectRuntimeSummary(project: string): {
    profile_count: any;
    running_count: any;
    unknown_count: any;
    building_count: any;
    selected_profile_id: any;
};
export declare function getProjectRuntimeSummaryReadOnly(project: string): {
    profile_count: any;
    running_count: any;
    unknown_count: any;
    building_count: any;
    selected_profile_id: any;
    profiles: any;
    processes: any;
};
export declare function executeProjectRuntimeAction(project: string, profileId: unknown, action: unknown): Promise<{
    operation_id: string;
    success: boolean;
    profile: any;
    state: RuntimeProcessState;
} | {
    operation_id: string;
    success: boolean;
    profile: any;
    build: RuntimeBuildState;
}>;
export {};
