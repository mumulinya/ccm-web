export declare function loadGlobalAgentBridgeStore(): any;
export declare function saveGlobalAgentBridgeStore(store: any): void;
export declare function createGlobalAgentBridgeRequest(text: string, sessionId: string): {
    id: string;
    status: string;
    text: string;
    session_id: string;
    created_at: string;
    updated_at: string;
};
export declare function waitForGlobalAgentBridgeResult(id: string, timeoutMs?: number): Promise<any>;
export declare function getRequestBaseUrl(req: any): string;
export declare function callLocalApi(baseUrl: string, pathname: string, options?: any): Promise<any>;
export declare function postLocalApi(baseUrl: string, pathname: string, body: any): Promise<any>;
export declare function parseSseApiEvents(text: string): any[];
export declare function parseSseApiEventBlock(block: string): any;
export declare function postLocalSseOrJsonApi(baseUrl: string, pathname: string, body: any, options?: {
    onEvent?: (event: any) => void;
}): Promise<any>;
