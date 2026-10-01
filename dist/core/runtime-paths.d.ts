/**
 * CCM's persistent home.  The explicit environment override remains useful
 * for tests, isolated service instances and packaged deployments.
 */
export declare const LEGACY_CCM_DIR: string;
export declare const DEFAULT_CCM_DIR: string;
export declare const CCM_MIGRATION_SCHEMA: "ccm-runtime-home-migration-v1";
/**
 * Migrate the legacy home exactly once.  This is intentionally synchronous so
 * it can run before modules with eager storage initialization are evaluated.
 * The legacy directory is never modified or deleted.
 */
export declare function ensureCcmRuntimeHomeMigrationSync(): {
    status: "explicit_override";
    target: string;
    copiedEntryCount?: undefined;
} | {
    status: "already_migrated";
    target: string;
    copiedEntryCount?: undefined;
} | {
    status: "legacy_missing";
    target: string;
    copiedEntryCount?: undefined;
} | {
    status: "target_requires_review";
    target: string;
    copiedEntryCount?: undefined;
} | {
    status: "migrated";
    target: string;
    copiedEntryCount: number;
};
/**
 * Normalize only active runtime configuration snapshots. Historical logs and
 * sessions intentionally remain untouched. This is idempotent and safe to
 * run at every startup, which also repairs stores created by older releases.
 */
export declare function ensureActiveRuntimePathsNormalizedSync(): {
    changedFiles: string[];
    skipped: "explicit_override";
    packageRoot?: undefined;
} | {
    changedFiles: string[];
    packageRoot: string;
    skipped?: undefined;
};
export declare const CCM_DIR: string;
