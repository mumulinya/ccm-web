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
};
export declare function isKnowledgeDocumentAllowed(metadata: KnowledgeDocumentMetadata | undefined, context: AgentKnowledgeAccessContext): boolean;
export declare function searchAgentKnowledge(query: string, context: AgentKnowledgeAccessContext, options?: AgentKnowledgeSearchOptions): Promise<{
    results: {
        citation: string;
        filename: string;
        heading: string;
        text: string;
        score: number;
        scope: import("./knowledge-files").KnowledgeScope;
        visibility: "shared" | "restricted";
        source: Record<string, any>;
    }[];
    citations: string[];
    context: string;
    embeddingMode: string;
    embeddingError: string;
    fallback: boolean;
}>;
