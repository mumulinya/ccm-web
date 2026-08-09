import { EventEmitter } from "events";
export type LspServerConfig = {
    id: string;
    command: string;
    args?: string[];
    cwd: string;
    languages: string[];
    initializationOptions?: any;
    timeoutMs?: number;
};
export declare class StdioLspClient extends EventEmitter {
    readonly config: LspServerConfig;
    private process;
    private buffer;
    private sequence;
    private pending;
    private stopping;
    readonly diagnostics: Map<string, any[]>;
    constructor(config: LspServerConfig);
    start(): Promise<void>;
    private consume;
    private handle;
    private write;
    request(method: string, params: any, timeoutMs?: number): Promise<any>;
    notify(method: string, params: any): void;
    private failAll;
    stop(): Promise<void>;
    identity(): string;
}
export declare class LanguageServerManager {
    private clients;
    start(config: LspServerConfig): Promise<StdioLspClient>;
    get(id: string): StdioLspClient;
    stop(id: string): Promise<void>;
    stopAll(): Promise<void>;
    status(): {
        id: string;
        state: string;
        identity: string;
        diagnostics: number;
    }[];
}
export declare const languageServerManager: LanguageServerManager;
