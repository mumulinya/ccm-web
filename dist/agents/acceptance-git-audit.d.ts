/** Read-only Git audit. Content fingerprints remain separate so disposable copies can be verified. */
export declare function captureAcceptanceGitAudit(root: string, cleanupPaths: string[]): {
    available: boolean;
    fingerprint: string;
};
