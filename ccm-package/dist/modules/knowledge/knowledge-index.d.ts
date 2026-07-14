import { type KnowledgeScope } from "./knowledge-files";
export type KnowledgeChunk = {
    id: string;
    filename: string;
    index: number;
    domain: string;
    scope: KnowledgeScope;
    heading: string;
    text: string;
    tokens: Set<string>;
    tf: Record<string, number>;
    embedding: number[];
    semanticEmbedding?: number[];
    charStart: number;
    charEnd: number;
};
export type KnowledgeSearchOptions = {
    limit?: number;
    filename?: string;
    tags?: string[];
    domain?: string;
    scopeType?: string;
    scopeId?: string;
    includeGlobal?: boolean;
};
export type KnowledgeIndexStatus = {
    state: "idle" | "building" | "ready" | "failed";
    reason: string;
    startedAt: string;
    completedAt: string;
    lastSuccessfulAt: string;
    error: string;
    processedDocuments: number;
    totalDocuments: number;
    documents: number;
    chunks: number;
    cacheHits: number;
    semanticReady: number;
    semanticFailed: number;
    parseFailures: Array<{
        filename: string;
        error: string;
    }>;
    queued: boolean;
};
export declare function tokenizeKnowledgeText(text: string): string[];
export declare function formatAwareChunkText(content: string, extension?: string): {
    text: string;
    heading: string;
    charStart: number;
    charEnd: number;
}[];
export declare function rebuildKnowledgeIndex(reason?: string): Promise<KnowledgeIndexStatus>;
export declare function getKnowledgeIndexStatus(): KnowledgeIndexStatus;
export declare function getKnowledgeDocumentChunks(filename: string): {
    id: string;
    index: number;
    heading: string;
    text: string;
    tokenCount: number;
    charStart: number;
    charEnd: number;
    citation: string;
}[];
export declare function getParsedKnowledgeDocument(filename: string): {
    content: string;
    parser: string;
    status: string;
    error: string;
};
export declare function searchKnowledgeBase(query: string, options?: KnowledgeSearchOptions): Promise<{
    results: {
        vectorScore: number;
        score: number;
        embeddingMode: string;
        chunk: KnowledgeChunk;
        keywordScore: number;
        coverage: number;
    }[];
    embeddingMode: string;
    embeddingError: string;
}>;
export declare function queryKnowledgeBase(query: string, limit?: number, filterTags?: string[]): string;
export declare function queryKnowledgeBaseScoped(query: string, options?: KnowledgeSearchOptions): string;
export declare function runKnowledgeIndexSelfTest(): {
    pass: boolean;
    chunks: {
        text: string;
        heading: string;
        charStart: number;
        charEnd: number;
    }[];
};
