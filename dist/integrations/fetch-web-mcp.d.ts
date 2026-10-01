import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
export declare const FETCH_WEB_MCP_SERVER_NAME = "fetch-web-mcp";
export declare function fetchPublicWebText(input: {
    url: string;
    maxLength?: number;
    startIndex?: number;
}): Promise<{
    url: string;
    contentType: string;
    startIndex: number;
    returnedChars: number;
    totalChars: number;
    truncated: boolean;
    text: string;
}>;
export declare function createFetchWebMcpServer(): McpServer;
export declare function runFetchWebMcpServer(): Promise<void>;
