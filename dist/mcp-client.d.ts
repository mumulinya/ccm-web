interface McpTool {
    name: string;
    description?: string;
    inputSchema?: any;
}
interface McpToolResult {
    content: Array<{
        type: string;
        text?: string;
    }>;
    isError?: boolean;
}
export declare class McpClient {
    private command;
    private env;
    private process;
    private messageId;
    private pending;
    private buffer;
    private connected;
    private serverName;
    private tools;
    constructor(command: string, env?: Record<string, string>);
    connect(): Promise<boolean>;
    private processBuffer;
    private handleMessage;
    private sendRequest;
    private sendNotification;
    listTools(): Promise<McpTool[]>;
    callTool(name: string, args: any): Promise<McpToolResult>;
    isConnected(): boolean;
    getServerName(): string;
    disconnect(): void;
}
export {};
