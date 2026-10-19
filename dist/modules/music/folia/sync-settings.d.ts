export declare function readFoliaSyncConfig(owner: string): {
    provider: string;
    enabled: boolean;
    workerBaseUrl: any;
    authToken: string;
    hasToken: boolean;
    sessionRef: any;
    revision: number;
};
export declare function saveFoliaSyncConfig(owner: string, input: any): {
    provider: string;
    enabled: boolean;
    workerBaseUrl: any;
    authToken: string;
    hasToken: boolean;
    sessionRef: any;
    revision: number;
};
export declare function requestFoliaSync(owner: string, input: any, request?: typeof fetch, test?: boolean): Promise<{
    data: any;
}>;
