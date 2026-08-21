import { normalizeOpenAiResponsesUrl } from "./openai-responses-transport";
export type UnifiedCompactionModelAudit = {
    beforeRequest?: (input: {
        provider: string;
        model: string;
        system: string;
    }) => void | Promise<void>;
    afterResponse?: (input: {
        provider: string;
        model: string;
        responseId: string;
        usage: any;
    }) => void | Promise<void>;
};
export declare function extractUnifiedCompactionJson(text: string): any;
export declare function normalizeUnifiedOpenAiUrl(value: string): string;
export { normalizeOpenAiResponsesUrl };
export declare function normalizeUnifiedAnthropicUrl(value: string): string;
export declare function normalizeUnifiedGeminiUrl(value: string, model: string): string;
export declare function callUnifiedCompactionModelOnce(config: any, system: string, user: string, maxOutputTokens: number, attemptTimeoutMs: number, audit?: UnifiedCompactionModelAudit): Promise<{
    summary: any;
    usage: any;
    provider: string;
    model: string;
    responseId: string;
    stopReason: string;
}>;
export declare function callUnifiedCompactionModel(config: any, system: string, user: string, maxOutputTokens?: number, audit?: UnifiedCompactionModelAudit): Promise<any>;
