export type ProjectSourceManifestEntry = {
    path: string;
    size: number;
    mtimeMs: number;
    extension: string;
};
export type ProjectSourceEvidence = {
    schema: "ccm-project-main-source-evidence-v1";
    project: string;
    workDir: string;
    manifestChecksum: string;
    manifestFiles: number;
    selectedPaths: string[];
    rejectedPaths: Array<{
        path: string;
        reason: string;
    }>;
    files: Array<{
        path: string;
        checksum: string;
        chars: number;
        content: string;
        startLine?: number;
        endLine?: number;
        truncated?: boolean;
    }>;
    totalChars: number;
    truncated: boolean;
};
export declare function normalizeRelativePath(value: string): string;
export declare function isSensitivePath(relativePath: string): boolean;
export declare function safeResolvedFile(root: string, relativePath: string): string;
export declare function redactSensitiveValues(content: string): string;
export declare function buildProjectSourceManifest(project: string, workDir: string, options?: {
    excludedRootDirectories?: string[];
    excludedDirectories?: string[];
}): {
    schema: "ccm-project-main-source-manifest-v1";
    project: string;
    workDir: string;
    files: ProjectSourceManifestEntry[];
    scannedFiles: number;
    truncated: boolean;
    truncationReasons: string[];
    checksum: string;
};
export declare function readProjectSourceEvidence(input: {
    project: string;
    workDir: string;
    manifest: ReturnType<typeof buildProjectSourceManifest>;
    selectedPaths: string[];
}): {
    schema: "ccm-project-main-source-evidence-v1";
    project: string;
    workDir: string;
    manifestChecksum: string;
    manifestFiles: number;
    selectedPaths: string[];
    rejectedPaths: {
        path: string;
        reason: string;
    }[];
    files: {
        path: string;
        checksum: string;
        chars: number;
        content: string;
        startLine?: number;
        endLine?: number;
        truncated?: boolean;
    }[];
    totalChars: number;
    truncated: boolean;
};
export declare function projectSourceEvidencePrompt(evidence: ProjectSourceEvidence): string;
export declare function runProjectMainSourceContractSelfTest(): {
    success: boolean;
    limits: {
        maxManifestFiles: number;
        maxSelectedFiles: number;
        maxFileChars: number;
        maxTotalChars: number;
    };
};
