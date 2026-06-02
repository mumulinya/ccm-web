interface SkillDef {
    name: string;
    description: string;
    prompt?: string;
    enabled: boolean;
}
export declare class ToolManager {
    private clients;
    private tools;
    private skills;
    private initialized;
    loadTools(): Promise<void>;
    buildToolPrompt(): string;
    parseToolCalls(text: string): Array<{
        name: string;
        arguments: any;
    }>;
    executeToolCall(toolName: string, args: any): Promise<string>;
    getToolList(): {
        mcp: {
            name: string;
            description: string;
            server: string;
            schema: any;
        }[];
        skills: SkillDef[];
        servers: {
            name: string;
            connected: boolean;
            toolsCount: number;
        }[];
    };
    testConnection(command: string, env: string, args?: any): Promise<{
        success: boolean;
        tools: string[];
        error?: string;
    }>;
    disconnect(): void;
    private loadMcpConfigs;
    private loadSkillConfigs;
    private parseEnv;
    private parseArgs;
}
export declare const toolManager: ToolManager;
export {};
