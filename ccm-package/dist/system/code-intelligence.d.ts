import { type RepoStateIdentity } from "./unified-evidence-registry";
export declare const CODE_INTELLIGENCE_RESULT_SCHEMA: "ccm-code-intelligence-result-v1";
export type CodeLocation = {
    path: string;
    range: {
        startLine: number;
        startCharacter: number;
        endLine: number;
        endCharacter: number;
    };
    symbol: string;
    kind: string;
    container?: string;
    language?: string;
    serverId?: string;
};
export type CodeIntelligenceResult = {
    schema: typeof CODE_INTELLIGENCE_RESULT_SCHEMA;
    project: string;
    indexGeneration: number;
    languageServer: string;
    repoStateIdentity: RepoStateIdentity;
    locations: CodeLocation[];
    total: number;
    nextCursor: string;
    truncated: boolean;
    freshness: "current" | "stale" | "unavailable";
    staleReason?: string;
    resultChecksum: string;
    contentStored: false;
};
export type LanguageServerDescriptor = {
    id: string;
    languages: string[];
    command: string;
    bundled: boolean;
    installed: boolean;
    discoveredPath: string;
    status: "available" | "missing" | "stopped";
    version: string;
    source: string;
    checksum: string;
};
export type CodeIntelligenceToolName = "workspace_symbols" | "document_symbols" | "find_definition" | "find_references" | "find_implementations" | "find_type_definition" | "find_incoming_calls" | "find_outgoing_calls" | "read_code_diagnostics";
export declare function executeCodeIntelligenceTool(project: string, tool: CodeIntelligenceToolName, args: any): Promise<CodeIntelligenceResult & {
    diagnostics?: any[];
}>;
export declare function listLanguageServers(): LanguageServerDescriptor[];
export declare function configureLanguageServer(id: string, input: any): LanguageServerDescriptor;
export declare function previewLanguageServerInstall(id: string): {
    installRequired: boolean;
    descriptor: LanguageServerDescriptor;
    contentStored: boolean;
    executed?: undefined;
    reason?: undefined;
    source?: undefined;
    command?: undefined;
    manifestChecksum?: undefined;
} | {
    installRequired: boolean;
    executed: boolean;
    reason: string;
    source: any;
    command: any;
    manifestChecksum: string;
    contentStored: boolean;
    descriptor?: undefined;
};
export declare function listCodeIntelligenceProjects(): any[];
export declare function getCodeIntelligenceProjectStatus(project: string): any;
export declare function startCodeIntelligenceProject(project: string, force?: boolean): any;
export declare function startCodeIntelligenceIndexRun(project: string, mode: "start" | "reindex" | "repair", reason?: string): {
    schema: string;
    runId: string;
    project: string;
    mode: "start" | "reindex" | "repair";
    state: string;
    reason: string;
    totalFiles: number;
    processedFiles: number;
    changedFiles: number;
    removedFiles: number;
    failedFiles: number;
    startedAt: string;
    completedAt: string;
    errorSummary: string;
    generation: number;
    contentStored: boolean;
};
export declare function getCodeIntelligenceIndexRun(runId: string): any;
export declare function listCodeIntelligenceIndexRuns(project: string, limit?: number): {
    schema: string;
    runId: any;
    project: string;
    mode: any;
    state: any;
    reason: any;
    totalFiles: number;
    processedFiles: number;
    changedFiles: number;
    removedFiles: number;
    failedFiles: number;
    startedAt: any;
    completedAt: any;
    errorSummary: any;
    generation: number;
    contentStored: boolean;
}[];
export declare function listCodeIntelligenceFiles(project: string, input?: {
    cursor?: string;
    limit?: number;
    language?: string;
    query?: string;
}): {
    files: {
        path: any;
        language: any;
        serverId: any;
        size: number;
        indexedAt: any;
    }[];
    total: number;
    nextCursor: string;
    truncated: boolean;
    contentStored: boolean;
};
export declare function readCodeIntelligenceSource(project: string, requestedPath: string, line?: number, context?: number): {
    schema: string;
    project: string;
    path: string;
    targetLine: number;
    startLine: number;
    endLine: number;
    totalLines: number;
    lines: {
        line: number;
        text: string;
    }[];
    revision: string;
    repoStateIdentity: RepoStateIdentity;
    contentStored: boolean;
};
export declare function stopCodeIntelligence(): void;
export declare function runTypeScriptLanguageServiceFixtureSelfTest(): {
    success: boolean;
    definitions: number;
    references: number;
    diagnostics: number;
};
