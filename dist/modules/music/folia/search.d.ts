import type { MusicIntentDecisionV2 } from '../agent';
import type { MusicPlaybackCandidateV2 } from '../playback-decision';
export declare function searchFoliaPlaybackCandidates(intent: MusicIntentDecisionV2, options?: {
    signal?: AbortSignal;
}): Promise<{
    candidates: MusicPlaybackCandidateV2[];
    sourceStatuses: Record<"local" | "qq" | "kugou" | "netease" | "bilibili" | "douyin" | "navidrome", {
        status: "success" | "unavailable" | "timeout" | "rate_limited" | "rejected" | "login_required" | "risk_controlled" | "capability_unavailable" | "not_requested";
        resultCount: number;
        error?: string;
        retryable?: boolean;
    }>;
}>;
