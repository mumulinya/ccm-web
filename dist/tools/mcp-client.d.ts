interface McpTool {
    name: string;
    description?: string;
    inputSchema?: any;
    annotations?: {
        readOnlyHint?: boolean;
        destructiveHint?: boolean;
        idempotentHint?: boolean;
        openWorldHint?: boolean;
        [key: string]: any;
    };
}
interface McpToolResult {
    content: Array<{
        type: string;
        text?: string;
    }>;
    isError?: boolean;
}
export declare function resolveMcpStdioCommand(command: string, args?: string[]): {
    cmd: string;
    args: string[];
};
export declare class McpClient {
    private command;
    private args;
    private env;
    private requestTimeoutMs;
    private process;
    private messageId;
    private pending;
    private buffer;
    private connected;
    private serverName;
    private serverInstructions;
    private tools;
    private stderrBuffer;
    private lastError;
    private elicitationRequired;
    private elicitationMessage;
    private treeShutdown;
    constructor(command: string, args?: string[], env?: Record<string, string>, requestTimeoutMs?: number);
    private safeErrorDetail;
    private parseCommand;
    connect(): Promise<boolean>;
    private processBuffer;
    private handleMessage;
    private handleServerRequest;
    private sendResponseError;
    private sendRequest;
    private sendNotification;
    listTools(): Promise<McpTool[]>;
    callTool(name: string, args: any, timeoutMs?: number): Promise<McpToolResult>;
    isConnected(): boolean;
    getServerName(): string;
    getServerInstructions(): string;
    getDiagnostics(): {
        lastError: string;
        stderr: string;
        elicitationRequired: boolean;
        elicitationMessage: string;
        serverInstructions: string;
    };
    disconnectTree(): Promise<void>;
    disconnect(): void;
}
export {};
