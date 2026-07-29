import { type KnowledgeDocumentMetadata } from "./knowledge-files";
export type AgentKnowledgeRole = "global-agent" | "group-main-agent" | "project-agent" | "project-child-agent" | "test-agent";
export type AgentKnowledgeAccessContext = {
    role: AgentKnowledgeRole;
    project?: string;
    groupId?: string;
    taskAgentSessionId?: string;
    projects?: Array<{
        name?: string;
        project?: string;
    }>;
};
export type AgentKnowledgeSearchOptions = {
    limit?: number;
    filename?: string;
    maxChunkChars?: number;
    maxContextChars?: number;
    maxContextTokens?: number;
};
export declare function isKnowledgeDocumentAllowed(metadata: KnowledgeDocumentMetadata | undefined, context: AgentKnowledgeAccessContext): boolean;
export declare function searchAgentKnowledge(query: string, context: AgentKnowledgeAccessContext, options?: AgentKnowledgeSearchOptions): Promise<{
    results: any[];
    citations: any[];
    context: string;
    embeddingMode: string;
    embeddingError: string;
    fallback: boolean;
    fallbackReason?: undefined;
    indexGeneration?: undefined;
    staleServed?: undefined;
    scopeChecksum?: undefined;
    tokenBudget?: undefined;
} | {
    results: {
        citation: string;
        filename: any;
        heading: any;
        text: string;
        score: number;
        lexicalScore: number;
        semanticScore: number;
        retrievalMode: any;
        tokenCount: number;
        scope: any;
        visibility: "shared" | "restricted";
        source: Record<string, any>;
    }[];
    citations: string[];
    context: string;
    embeddingMode: string;
    embeddingError: string;
    fallback: boolean;
    fallbackReason: string;
    indexGeneration: string;
    staleServed: boolean;
    scopeChecksum: string;
    tokenBudget: {
        used: number;
        max: number;
    };
}>;
