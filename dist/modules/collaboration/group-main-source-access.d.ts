export declare function resolveGroupMainSourceAccess(input: {
    groupId: string;
    exactSessionId: string;
    routableProjects: string[];
    authorizedProjects?: string[];
    generation?: number;
}): {
    allowedProjects: string[];
    generation: number;
    lifecycleChecksum: string;
    checksum: string;
    contentStored: false;
};
export declare function runGroupMainSourceAccessSelfTest(): {
    intersectsMembershipAndAuthorization: boolean;
    bindsGeneration: boolean;
    safeReceiptOnly: boolean;
};
