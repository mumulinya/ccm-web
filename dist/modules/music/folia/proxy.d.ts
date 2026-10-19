export declare function proxyFoliaProvider(owner: string, provider: string, endpoint: string, req: any, res: any, body?: any): Promise<void>;
export declare function requestFoliaProvider(owner: string, provider: string, endpoint: string, params: any, options?: {
    signal?: AbortSignal;
    timeoutMs?: number;
}): Promise<any>;
export declare function requestFoliaNavidrome(owner: string, endpoint: string, params: URLSearchParams): Promise<{
    target: import("node:url").URL;
    host: string;
}>;
export declare function requireFoliaNavidromeInstance(owner: string, instanceId: string): void;
export declare function readFoliaNavidrome(owner: string, endpoint: string, params: URLSearchParams): Promise<any>;
