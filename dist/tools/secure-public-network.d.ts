export declare function normalizeIpAddress(address: string): string;
export declare function isBlockedNetworkAddress(input: string): boolean;
export declare function assertUrlHasNoCredentials(url: URL): void;
export declare function resolveSafePublicHttpsUrl(value: string): Promise<{
    url: URL;
    addresses: {
        address: string;
        family: number;
    }[];
}>;
export interface SecureFetchOptions {
    maxBytes?: number;
    timeoutMs?: number;
    redirects?: number;
}
export declare function securePublicFetch(input: string | URL | Request, init?: RequestInit, options?: SecureFetchOptions): Promise<Response>;
export declare function securePublicBuffer(value: string, maxBytes: number, headers?: Record<string, string>): Promise<{
    body: Buffer<ArrayBuffer>;
    contentType: string;
    finalUrl: string;
}>;
