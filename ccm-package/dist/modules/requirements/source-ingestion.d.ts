export declare const REQUIREMENT_SOURCE_SCHEMA = "ccm-requirement-source-ingestion-v1";
export declare const REQUIREMENT_EXTRACTION_SCHEMA = "ccm-business-requirement-extraction-v1";
export declare const REQUIREMENT_DECOMPOSITION_SCHEMA = "ccm-requirement-decomposition-v1";
export declare const MAX_REQUIREMENT_SOURCE_CHARS = 20000;
export declare const MAX_REQUIREMENT_TOTAL_CHARS = 60000;
export declare const MAX_REQUIREMENT_FILE_BYTES: number;
export declare const MAX_VISION_IMAGE_BYTES: number;
export declare const MAX_ONLINE_DOCUMENT_BYTES: number;
type UploadedFile = {
    filename?: string;
    name?: string;
    savedPath?: string;
    path?: string;
    size?: number;
};
export type RequirementSourceRecord = {
    id: string;
    source_type: "file" | "online_document";
    name: string;
    kind: string;
    status: "parsed" | "partial" | "needs_authorization" | "unsupported" | "failed";
    parser: string;
    readable: boolean;
    content: string;
    summary: string;
    path?: string;
    url?: string;
    size?: number;
    mime_type?: string;
    truncated?: boolean;
    error?: string;
};
export type BusinessRequirementExtraction = {
    schema: string;
    title: string;
    business_goal: string;
    scope: string[];
    acceptance_criteria: string[];
    dependencies: string[];
    risks: string[];
    clarification_questions: string[];
    source_evidence: string[];
    extraction_method: "model" | "deterministic_fallback";
};
export type RequirementDecompositionItem = {
    item_key: string;
    title: string;
    business_goal: string;
    scope: string[];
    target_type: "group" | "project" | "auto";
    target_id: string;
    acceptance_criteria: string[];
    depends_on: string[];
    risks: string[];
    suggested_agent_capabilities: string[];
    parallelizable: boolean;
    source_evidence: string[];
};
export type RequirementDecompositionPlan = {
    schema: typeof REQUIREMENT_DECOMPOSITION_SCHEMA;
    epic_title: string;
    business_goal: string;
    global_acceptance_criteria: string[];
    items: RequirementDecompositionItem[];
    clarification_questions: string[];
    risks: string[];
    source_evidence: string[];
    execution_order: "dag";
    content_hash: string;
    version: number;
    extraction_method: "model" | "deterministic_fallback";
    generated_at: string;
};
export type RequirementIngestionResult = {
    schema: string;
    generated_at: string;
    sources: RequirementSourceRecord[];
    attachments: any[];
    source_documents: string;
    agent_context: string;
    user_summary: string;
    warnings: string[];
    requirement: BusinessRequirementExtraction | null;
    decomposition: RequirementDecompositionPlan | null;
    content_hash: string;
    technical: any;
};
export declare function validateRequirementDecomposition(value: any, options?: {
    contentHash?: string;
    requirement?: BusinessRequirementExtraction | null;
    extractionMethod?: "model" | "deterministic_fallback";
}): RequirementDecompositionPlan;
export declare function diffRequirementDecompositionPlans(previous: RequirementDecompositionPlan | null | undefined, next: RequirementDecompositionPlan): {
    schema: string;
    from_version: number;
    to_version: number;
    from_content_hash: string;
    to_content_hash: string;
    added: string[];
    removed: string[];
    changed: string[];
    unchanged: string[];
    has_changes: boolean;
};
export declare function htmlToText(html: string): string;
export declare function assertPublicUrl(value: string): Promise<import("node:url").URL>;
export declare function fetchPublicDocument(urlValue: string): Promise<{
    response: any;
    buffer: Buffer<any>;
    finalUrl: string;
}>;
export declare function extractOnlineDocumentUrls(text: string): string[];
/**
 * 兼容入口只接受上游模型已经给出的结构化决定。
 * 自然语言是否属于可拆解需求必须由 WorkflowDecision 决定。
 */
export declare function shouldDecomposeRequirementIntent(input?: {
    modelDecision?: {
        actionRequired?: boolean;
        intentKind?: string;
        decomposeRequirement?: boolean;
    } | null;
}): boolean;
export declare function decomposeRequirementToTaskPlan(input: {
    requirement: BusinessRequirementExtraction;
    sources?: RequirementSourceRecord[];
    contentHash?: string;
    availableTargets?: any[];
    requirementConfig?: any;
}): Promise<RequirementDecompositionPlan>;
export declare function ingestRequirementSources(input?: {
    files?: UploadedFile[];
    userText?: string;
    urls?: string[];
    extractRequirement?: boolean;
    analyzeImages?: boolean;
    visionConfig?: any;
    onlineDocumentFetcher?: (url: string) => Promise<any>;
    requirementConfig?: any;
    decomposeRequirement?: boolean;
    availableTargets?: any[];
}): Promise<RequirementIngestionResult>;
export declare function requirementToIntakeDraft(requirement: BusinessRequirementExtraction | null, fallback?: any): {
    requirement: any;
    project: any;
    group_id: any;
    group_name: any;
    scope: any;
    acceptance: any;
    dependencies: string[];
    risks: any;
    clarification_questions: string[];
    source_evidence: string[];
    extraction_method: string;
    generated_at: string;
};
export {};
