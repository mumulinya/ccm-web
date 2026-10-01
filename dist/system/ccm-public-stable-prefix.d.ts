export declare const CCM_PUBLIC_STABLE_PREFIX_VERSION = "ccm-public-stable-prefix-v3";
export declare const CCM_PUBLIC_STABLE_PREFIX_TEXT: string;
export type PublicStablePrefix = {
    version: string;
    checksum: string;
    tokens: number;
    contentStored: false;
};
export declare function getCcmPublicStablePrefix(): PublicStablePrefix;
export declare function buildCcmPublicStablePrefixMessage(): {
    id: string;
    role: string;
    kind: string;
    prefixEligible: boolean;
    publicPrefixEligible: boolean;
    content: string;
    contentStored: boolean;
};
export declare function detectPublicPrefixDynamicLeak(): boolean;
