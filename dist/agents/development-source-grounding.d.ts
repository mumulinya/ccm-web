export type DevelopmentSourceGroundingProject = {
    project: string;
    manifestChecksum?: string;
    manifestFiles?: number;
    selectedPaths?: string[];
    files?: Array<{
        path?: string;
        checksum?: string;
        evidenceId?: string;
    }>;
    status?: string;
};
export type DevelopmentSourceGroundingInput = {
    requiresCodeChanges: boolean;
    targetProjects: string[];
    sourceManifestChecksum?: string;
    projects: DevelopmentSourceGroundingProject[];
    allowEmptyProjects?: boolean;
};
export type DevelopmentSourceGroundingResult = {
    ready: boolean;
    issues: string[];
    groundedProjects: string[];
    contentStored: false;
};
/**
 * Validates existing source-evidence receipts. This is deliberately not a new
 * evidence format: callers keep using their current evidence manifests and
 * pass only the fields required by the common dispatch gate.
 */
export declare function validateDevelopmentSourceGrounding(input: DevelopmentSourceGroundingInput): DevelopmentSourceGroundingResult;
