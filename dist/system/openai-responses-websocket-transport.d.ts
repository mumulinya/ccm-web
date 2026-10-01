type WsResponse = {
    ok: boolean;
    status: number;
    headers: {
        get(name: string): string;
    };
    body: AsyncIterable<Uint8Array>;
    close?: () => void;
};
export declare function responsesWebSocketUrl(endpoint: string, configured?: string): string;
export declare function responsesWebSocketUrlFingerprint(value: string): string;
export declare function requestResponsesWebSocket(endpoint: string, init?: any): Promise<WsResponse>;
/** Low-level names kept intentionally thin so HTTP and WebSocket callers share one request body. */
export declare function openResponsesWebSocket(endpoint: string, init?: any): Promise<WsResponse>;
export declare function sendResponsesCreate(connection: any, body: any): void;
export declare function closeResponsesWebSocket(connection: any): void;
export declare function isResponsesWebSocketSupported(config?: any): boolean;
export declare function probeResponsesWebSocket(config: any, options?: {
    timeoutMs?: number;
}): Promise<{
    handshake: boolean;
    responseCreate: boolean;
    usageReported: boolean;
    responseIdPresent: boolean;
    eventTypes: string[];
    urlFingerprint: string;
}>;
export declare function runResponsesWebSocketSelfTest(): {
    pass: boolean;
    https: string;
};
export {};
