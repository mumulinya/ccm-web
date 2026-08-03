export declare function validatePetAssetManifest(root: string, expectedVersion: string): any;
export declare function resolvePetAssetNpmInvocation(platform?: NodeJS.Platform): {
    command: string;
    prefixArgs: string[];
};
export declare function getPetAssetPackStatus(): {
    schema: string;
    package: string;
    version: string;
    state: any;
    active_root: string;
    available_skins: any;
    error: any;
    updated_at: any;
};
export declare function prepareOfficialPetAssets(skin: unknown): Promise<any>;
export declare function resolveDownloadedPetAsset(relativePath: string): string;
