export declare function scoreMusicCandidate(keyword: string, fields?: any): number;
export declare function pickBestCandidateByScore(keyword: string, candidates?: any[]): {
    index: number;
    score: number;
    reason: string;
};
/**
 * Pick the best track for a keyword from candidates.
 * Semantic selection is model-only; lexical scoring only validates an exact-song result.
 */
export declare function selectMusicTrack(input?: {
    keyword?: string;
    candidates?: any[];
    selectionMode?: string;
    randomize?: boolean;
    originalRequest?: string;
    allowModel?: boolean;
    modelConfig?: any;
}): Promise<{
    success: boolean;
    index: number;
    source: string;
    reason: string;
    rejected: boolean;
    semanticDecisionReceipt?: undefined;
    reply?: undefined;
    candidate?: undefined;
} | {
    success: boolean;
    index: number;
    source: string;
    reason: string;
    rejected: boolean;
    semanticDecisionReceipt: import("../../system/semantic-decision-runtime").SemanticDecisionReceiptV1;
    reply?: undefined;
    candidate?: undefined;
} | {
    success: boolean;
    index: number;
    source: string;
    reason: string;
    reply: string;
    rejected: boolean;
    candidate: any;
    semanticDecisionReceipt: import("../../system/semantic-decision-runtime").SemanticDecisionReceiptV1;
}>;
