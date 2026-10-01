export declare function toolResultFingerprint(value: {
    name: string;
    ok: boolean;
    output?: any;
    error?: string;
}): string;
export declare function isToolResultReference(value: any): boolean;
export declare function isConversationUserMessage(message: any): boolean;
export declare function hasToolResult(message: any): boolean;
type CompletedReference = {
    index: number;
    callId: string;
    name: string;
    checksum: string;
};
/** Lossless references to identical earlier evidence; active results stay intact. */
export declare function completedToolResultReferences(messages: any[], beforeIndex: number): Map<number, CompletedReference>;
export declare function completedToolResultAnchors(messages: any[], beforeIndex: number): Set<number>;
export {};
