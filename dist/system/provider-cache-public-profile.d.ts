export declare const PROVIDER_CACHE_PUBLIC_PROFILE_VERSION = "ccm-public-profile-v3";
/**
 * The public tool profile is a schema fingerprint only. It deliberately does
 * not retain descriptions, permissions, paths, arguments, results, or any
 * session data. The fingerprint lets the Provider route equivalent tool
 * catalogs together without making private tool content part of the cache
 * namespace.
 */
export declare function buildProviderCachePublicToolProfile(input?: {
    toolSchemaChecksum?: string;
    toolSchemaVersion?: string;
    toolSchemaTokens?: number;
    publicToolSchemaChecksum?: string;
    publicToolSchemaVersion?: string;
    publicToolSchemaTokens?: number;
}): {
    version: string;
    checksum: string;
    tokens: number;
    schemaChecksum: string;
    schemaVersion: string;
    contentStored: false;
};
export declare function buildProviderCachePublicProfile(input?: {
    publicPrefixChecksum?: string;
    toolSchemaChecksum?: string;
    toolSchemaVersion?: string;
    toolSchemaTokens?: number;
    publicToolSchemaChecksum?: string;
    publicToolSchemaVersion?: string;
    publicToolSchemaTokens?: number;
    publicInstructionChecksum?: string;
    publicInstructionTokens?: number;
    publicInstructionBlockCount?: number;
    wireLayoutVersion: string;
}): {
    profileVersion: string;
    publicPrefixChecksum: string;
    publicToolProfileChecksum: string;
    publicPrefixTokens: number;
    publicToolProfileTokens: number;
    publicToolSchemaChecksum: string;
    publicToolSchemaVersion: string;
    publicInstructionChecksum: string;
    publicInstructionTokens: number;
    publicInstructionBlockCount: number;
    wireLayoutVersion: string;
    contentStored: false;
};
