export declare function recordToolSearchSuccess(toolName: string): void;
export declare function searchTools(input: {
    query: string;
    intent?: string;
    tools: any[];
    maxResults?: number;
}): {
    tool: any;
    score: number;
    exact: boolean;
    reasons: string[];
    schemaChecksum: string;
}[];
