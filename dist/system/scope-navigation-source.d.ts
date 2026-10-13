/** 仅认知生成排除 CCM 本地验收产物、发布输出和运行队列；通用源码工具保持原合同。 */
export declare function buildScopeNavigationSourceManifest(project: string, workDir: string): {
    schema: "ccm-project-main-source-manifest-v1";
    project: string;
    workDir: string;
    files: import("../modules/projects/project-main-agent-source").ProjectSourceManifestEntry[];
    scannedFiles: number;
    truncated: boolean;
    truncationReasons: string[];
    checksum: string;
};
