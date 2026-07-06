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
    private args;
    private env;
    private process;
    private messageId;
    private pending;
    private buffer;
    private connected;
    private serverName;
    private tools;
    private stderrBuffer;
    private lastError;
    private elicitationRequired;
    private elicitationMessage;
    constructor(command: string, args?: string[], env?: Record<string, string>);
    private parseCommand;
    connect(): Promise<boolean>;
    private processBuffer;
    private handleMessage;
    private handleServerRequest;
    private sendResponseError;
    private sendRequest;
    private sendNotification;
    listTools(): Promise<McpTool[]>;
    callTool(name: string, args: any): Promise<McpToolResult>;
    isConnected(): boolean;
    getServerName(): string;
    getDiagnostics(): {
        lastError: string;
        stderr: string;
        elicitationRequired: boolean;
        elicitationMessage: string;
    };
    disconnect(): void;
}
export {};
