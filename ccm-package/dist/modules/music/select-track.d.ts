export declare function scoreMusicCandidate(keyword: string, fields?: any): number;
export declare function pickBestCandidateByScore(keyword: string, candidates?: any[]): {
    index: number;
    score: number;
    reason: string;
};
/**
 * Pick the best track for a keyword from candidates.
 * Prefers model judgment; falls back to score matching when the model fails.
 */
export declare function selectMusicTrack(input?: {
    keyword?: string;
    candidates?: any[];
}): Promise<{
    success: boolean;
    index: number;
    source: string;
    reason: string;
    rejected: boolean;
    candidate?: undefined;
} | {
    success: boolean;
    index: number;
    source: string;
    reason: string;
    rejected: boolean;
    candidate: any;
}>;
