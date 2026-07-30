type RemoteTransport = "streamable_http" | "sse";
export declare class McpRemoteClient {
    private url;
    private headers;
    private preferredTransport;
    private client;
    private transport;
    private connected;
    private tools;
    private lastError;
    private actualTransport;
    constructor(url: string, headers?: Record<string, string>, preferredTransport?: RemoteTransport);
    private safeError;
    private transportOptions;
    private connectWith;
    connect(): Promise<boolean>;
    listTools(): Promise<any[]>;
    callTool(name: string, args: any): Promise<any>;
    isConnected(): boolean;
    getServerName(): string;
    getServerInstructions(): string;
    getActualTransport(): RemoteTransport;
    getDiagnostics(): {
        lastError: string;
        stderr: string;
        elicitationRequired: boolean;
        elicitationMessage: string;
        serverInstructions: string;
        transport: RemoteTransport;
    };
    disconnect(): Promise<void>;
}
export {};
