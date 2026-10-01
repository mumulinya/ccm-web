export type StablePrefixBlock = {
    id: string;
    version: string;
    prefixEligible: true;
    checksum: string;
    tokens: number;
    contentStored: false;
};
export declare function orderStablePrefixBlocks(blocks?: any[]): StablePrefixBlock[];
