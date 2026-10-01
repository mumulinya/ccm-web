export declare const PROVIDER_SSE_JSON_INVALID_AFTER_BYTES = "CCM_PROVIDER_SSE_JSON_INVALID_AFTER_BYTES";
export type SseJsonConsumeResult = {
    payloadCount: number;
    receivedBytes: number;
    done: boolean;
};
type ParsedJsonDocuments = {
    payloads: any[];
    done: boolean;
};
/**
 * Parse either one SSE multiline JSON value or the non-standard relay form where
 * multiple complete JSON documents are emitted as adjacent `data:` lines without
 * the blank event separator required by the SSE specification.
 */
export declare function parseSseJsonDocuments(lines: string[], receivedBytes?: number): ParsedJsonDocuments;
export declare function consumeSseJsonTextChunks(chunks: AsyncIterable<string>, onPayload: (payload: any) => void): Promise<SseJsonConsumeResult>;
export declare function runSseJsonParserSelfTest(): Promise<{
    pass: boolean;
    checks: {
        standardSse: boolean;
        adjacentRelayEvents: boolean;
        rawNdjsonFallback: boolean;
        invalidBytesAreClassified: boolean;
    };
}>;
export {};
