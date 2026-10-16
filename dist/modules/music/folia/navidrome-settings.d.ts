export declare function configureFoliaNavidrome(owner: string, input: any): Promise<{
    success: boolean;
    instanceId: string;
    baseUrl: string;
    username: string;
}>;
export declare function clearFoliaNavidrome(owner: string): {
    success: boolean;
};
export declare function foliaNavidromePublicConfig(owner: string): {
    baseUrl: any;
    username: any;
    instanceId: any;
};
