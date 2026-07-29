import { type KnowledgeScope } from "./knowledge-files";
import { KnowledgeVectorResult } from "./knowledge-embedding";
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
    semantic?: Omit<KnowledgeVectorResult, "vector">;
    charStart: number;
    charEnd: number;
};
export type KnowledgeSearchOptions = {
    limit?: number;
    filename?: string;
    filenames?: string[];
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
    semanticPending: number;
    localVectors: number;
    remoteVectors: number;
    lexicalChunks: number;
    activeGeneration: string;
    lastGoodGeneration: string;
    staleServed: boolean;
    fallbackReason: string;
    buildLease: any;
    localModel: any;
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
export declare function loadActiveKnowledgeIndex(): boolean;
export declare function rebuildKnowledgeIndex(reason?: string): Promise<KnowledgeIndexStatus>;
export declare function waitForKnowledgeIndex(reason?: string): Promise<KnowledgeIndexStatus>;
export declare function getKnowledgeIndexStatus(): KnowledgeIndexStatus;
export declare function pruneKnowledgeIndexGenerations(): {
    removed: number;
    retained: string[];
    activeGeneration: string;
};
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
    results: any[];
    embeddingMode: string;
    embeddingError: string;
    fallbackReason: string;
    indexGeneration: string;
    staleServed: boolean;
    scopeChecksum: string;
    candidateCounts: {
        eligible: number;
        lexical: number;
        semantic: number;
        merged: number;
    };
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
