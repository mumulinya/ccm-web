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
};
export type CodeIntelligenceResult = {
    schema: typeof CODE_INTELLIGENCE_RESULT_SCHEMA;
    project: string;
    indexGeneration: number;
    languageServer: string;
    repoStateIdentity: RepoStateIdentity;
    locations: CodeLocation[];
    nextCursor: string;
    truncated: boolean;
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
export declare function stopCodeIntelligence(): void;
export declare function runTypeScriptLanguageServiceFixtureSelfTest(): {
    success: boolean;
    definitions: number;
    references: number;
    diagnostics: number;
};
