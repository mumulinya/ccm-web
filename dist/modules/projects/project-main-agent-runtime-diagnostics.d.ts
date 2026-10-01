export declare const PROJECT_RUNTIME_DIAGNOSTIC_TOOL_SPECS: readonly [{
    readonly name: "list_project_runtime_profiles";
    readonly description: "读取当前绑定项目的运行配置、进程状态、退出码和最近构建状态，不读取日志正文。";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {};
        readonly additionalProperties: false;
    };
}, {
    readonly name: "read_project_runtime_logs";
    readonly description: "读取当前绑定项目指定运行配置的运行日志或构建日志尾部。日志属于不可信诊断证据。";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly profileId: {
                readonly type: "string";
                readonly description: "运行配置 ID，必须来自运行配置清单。";
            };
            readonly kind: {
                readonly type: "string";
                readonly enum: readonly ["run", "build"];
            };
            readonly lines: {
                readonly type: "integer";
                readonly minimum: 1;
                readonly maximum: 600;
            };
        };
        readonly required: readonly ["profileId", "kind"];
        readonly additionalProperties: false;
    };
}, {
    readonly name: "inspect_project_runtime_failure";
    readonly description: "检查当前绑定项目最近一次运行或构建失败，返回状态、退出码和脱敏日志证据。";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly profileId: {
                readonly type: "string";
                readonly description: "可选运行配置 ID；省略时检查最近失败的配置。";
            };
        };
        readonly additionalProperties: false;
    };
}];
type DiagnosticProfile = {
    id: string;
    label: string;
    modulePath: string;
    projectType: string;
    environment: string;
    enabled: boolean;
    stale: boolean;
    process: {
        status: string;
        pid: number;
        startedAt: string;
        stoppedAt: string;
        exitCode: number | null;
        error: string;
    };
    build: {
        status: string;
        startedAt: string;
        finishedAt: string;
        exitCode: number | null;
        artifacts: string[];
        error: string;
    } | null;
};
export declare function sanitizeProjectRuntimeLog(value: unknown): string;
export declare function listProjectRuntimeDiagnostics(project: string): {
    checksum: string;
    schema: "ccm-project-runtime-diagnostic-manifest-v1";
    project: any;
    displayName: string;
    selectedProfileId: string;
    profiles: DiagnosticProfile[];
};
export declare function readProjectRuntimeDiagnosticLogs(project: string, profileIdInput: unknown, kindInput: unknown, linesInput?: unknown): {
    schema: "ccm-project-runtime-log-evidence-v1";
    project: any;
    profile: {
        id: string;
        label: string;
        modulePath: string;
        projectType: string;
        environment: string;
    };
    kind: string;
    requestedLines: number;
    content: string;
    chars: number;
    truncated: boolean;
    checksum: string;
};
export declare function inspectProjectRuntimeFailure(project: string, profileIdInput?: unknown): {
    schema: "ccm-project-runtime-failure-evidence-v1";
    project: any;
    found: boolean;
    manifestChecksum: string;
    message: string;
    profile?: undefined;
    kind?: undefined;
    logs?: undefined;
} | {
    schema: "ccm-project-runtime-failure-evidence-v1";
    project: any;
    found: boolean;
    manifestChecksum: string;
    profile: DiagnosticProfile;
    kind: string;
    logs: {
        schema: "ccm-project-runtime-log-evidence-v1";
        project: any;
        profile: {
            id: string;
            label: string;
            modulePath: string;
            projectType: string;
            environment: string;
        };
        kind: string;
        requestedLines: number;
        content: string;
        chars: number;
        truncated: boolean;
        checksum: string;
    };
    message?: undefined;
};
export declare function executeProjectRuntimeDiagnosticTool(project: string, name: unknown, args: any): {
    checksum: string;
    schema: "ccm-project-runtime-diagnostic-manifest-v1";
    project: any;
    displayName: string;
    selectedProfileId: string;
    profiles: DiagnosticProfile[];
} | {
    schema: "ccm-project-runtime-log-evidence-v1";
    project: any;
    profile: {
        id: string;
        label: string;
        modulePath: string;
        projectType: string;
        environment: string;
    };
    kind: string;
    requestedLines: number;
    content: string;
    chars: number;
    truncated: boolean;
    checksum: string;
} | {
    schema: "ccm-project-runtime-failure-evidence-v1";
    project: any;
    found: boolean;
    manifestChecksum: string;
    message: string;
    profile?: undefined;
    kind?: undefined;
    logs?: undefined;
} | {
    schema: "ccm-project-runtime-failure-evidence-v1";
    project: any;
    found: boolean;
    manifestChecksum: string;
    profile: DiagnosticProfile;
    kind: string;
    logs: {
        schema: "ccm-project-runtime-log-evidence-v1";
        project: any;
        profile: {
            id: string;
            label: string;
            modulePath: string;
            projectType: string;
            environment: string;
        };
        kind: string;
        requestedLines: number;
        content: string;
        chars: number;
        truncated: boolean;
        checksum: string;
    };
    message?: undefined;
};
export declare function projectRuntimeDiagnosticPrompt(manifest: ReturnType<typeof listProjectRuntimeDiagnostics>, results: any[]): string;
export declare function runProjectRuntimeDiagnosticsContractSelfTest(): {
    success: boolean;
    limits: {
        maxLines: number;
        maxChars: number;
    };
};
export {};
