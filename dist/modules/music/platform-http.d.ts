import { Dispatcher } from "undici";
export type MusicPlatformStatus = "success" | "unavailable" | "timeout" | "rate_limited" | "rejected" | "login_required" | "risk_controlled" | "capability_unavailable";
export declare class MusicPlatformHttpError extends Error {
    readonly status: MusicPlatformStatus;
    readonly httpStatus: number;
    constructor(message: string, status: MusicPlatformStatus, httpStatus?: number);
}
export declare function musicPlatformRequest(input: {
    url: string;
    method?: Dispatcher.HttpMethod;
    headers?: Record<string, string>;
    body?: string | Buffer;
    timeoutMs?: number;
    maxBytes?: number;
    retries?: number;
    allowedHosts?: string[];
}): Promise<{
    status: "success";
    statusCode: number;
    headers: import("undici/types/header").IncomingHttpHeaders;
    buffer: Buffer<ArrayBuffer>;
    text: string;
    finalUrl: string;
}>;
export declare function musicPlatformJson<T = any>(input: Parameters<typeof musicPlatformRequest>[0]): Promise<T>;
export declare function musicPlatformText(input: Parameters<typeof musicPlatformRequest>[0]): Promise<string>;
export declare function publicMusicPlatformError(error: any): {
    status: MusicPlatformStatus;
    error: string;
    retryable: boolean;
};
