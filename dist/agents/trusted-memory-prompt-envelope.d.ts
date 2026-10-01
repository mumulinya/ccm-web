export declare const TRUSTED_MEMORY_PROMPT_ENVELOPE_SCHEMA = "ccm-trusted-memory-prompt-envelope-v1";
export declare function trustedMemorySourceChecksum(memoryContext: any): string;
export declare function renderTrustedMemoryPromptEnvelope(contentInput: any, sourceMemoryContext?: any): string;
export declare function verifyTrustedMemoryPromptEnvelope(renderedPrompt: string, expected?: {
    projection?: string;
    sourceChecksum?: string;
}): {
    schema: string;
    present: boolean;
    valid: boolean;
    issues: string[];
    content: string;
    contentChecksum: string;
    sourceChecksum: string;
    contentChars: number;
    startOffset: number;
    endOffset: number;
    envelopeStartOffset: number;
    envelopeEndOffset: number;
    envelopeText: string;
    beginCount: number;
    endCount: number;
    rawBeginCount: number;
    rawEndCount: number;
};
