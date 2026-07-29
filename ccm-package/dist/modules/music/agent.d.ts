import { SemanticDecisionReceiptV1 } from "../../system/semantic-decision-runtime";
export declare const RANDOM_MUSIC_KEYWORD = "__random__";
export type MusicPlaybackStrategy = "exact_song" | "artist_random" | "mood_recommendation" | "genre_recommendation" | "random";
export type MusicPlaybackPlan = {
    schema: "ccm-music-playback-plan-v1";
    strategy: MusicPlaybackStrategy;
    originalRequest: string;
    searchQuery: string;
    artist: string;
    mood: string;
    genre: string;
    randomize: boolean;
    strictMatch: boolean;
    source: "model" | "fallback";
    reason: string;
};
export type MusicIntentDecisionV2 = {
    schema: "ccm-music-intent-decision-v2";
    action: "none" | "search" | "play" | "convert";
    strategy: MusicPlaybackStrategy | "none";
    originalRequest: string;
    searchQuery: string;
    artist: string;
    mood: string;
    genre: string;
    sourceMode: "local" | "netease" | "bilibili";
    randomize: boolean;
    strictMatch: boolean;
    confidence: number;
    reason: string;
    semanticDecisionReceipt: SemanticDecisionReceiptV1;
};
export declare function resolveMusicIntentDecisionV2(input: {
    config?: any;
    message: string;
    mode?: string;
    history?: any[];
    sessionId?: string;
    requestId?: string;
}): Promise<MusicIntentDecisionV2>;
export declare function resolveMusicPlaybackRequestFallback(requestText: string, keyword?: string): MusicPlaybackPlan;
export declare function resolveMusicPlaybackRequest(cfg: any, requestText: string, keyword?: string): Promise<MusicPlaybackPlan>;
export declare function extractMusicIntent(msg: string): void;
export declare function normalizeMusicAgentAction(value: any, message: string, mode: string, source?: string): {
    type: string;
    keyword: string;
    mode: string;
    source: string;
    confidence: number;
    reason: string;
};
export declare function normalizeMusicAgentMessages(history?: any[], currentMessage?: string, limit?: number): {
    role: "user" | "assistant";
    content: string;
}[];
export declare function classifyMusicAgentAction(cfg: any, message: string, mode: string, history?: any[]): Promise<{
    type: string;
    keyword: string;
    mode: string;
    source: string;
    confidence: number;
    reason: string;
    playbackPlan: {
        schema: string;
        strategy: "none" | MusicPlaybackStrategy;
        originalRequest: string;
        searchQuery: string;
        artist: string;
        mood: string;
        genre: string;
        randomize: boolean;
        strictMatch: boolean;
        source: string;
        reason: string;
    };
    intentDecision: MusicIntentDecisionV2;
    semanticDecisionReceipt: SemanticDecisionReceiptV1;
    error?: undefined;
} | {
    type: string;
    keyword: string;
    mode: string;
    source: string;
    confidence: number;
    reason: string;
    error: any;
    playbackPlan?: undefined;
    intentDecision?: undefined;
    semanticDecisionReceipt?: undefined;
}>;
export declare function getMusicHelpText(chatMode: string): "🎵 本地音乐助手\n\n你可以说：\n• \"播放 周杰伦\" - 搜索并播放\n• \"搜索 轻音乐\" - 搜索本地曲库\n• \"来首钢琴曲\" - 自然语言搜索\n\n将 MP3 文件放入 ~/.cc-connect/music/ 目录" | "🎵 网易音乐助手\n\n你可以说：\n• \"我想听周杰伦的歌\" - 搜索网易\n• \"搜索 轻音乐\" - 搜索网易音乐\n• \"来首适合学习的音乐\" - 智能推荐\n\n点击搜索结果可一键下载为本地 MP3" | "🎵 B站音乐助手\n\n你可以说：\n• \"我想听周杰伦的歌\" - 搜索B站\n• \"搜索 轻音乐\" - 搜索B站视频\n• \"来首适合编程的音乐\" - 智能推荐\n\n点击搜索结果可一键转码为本地 MP3";
export declare function writeSse(res: any, data: any): void;
export declare function callClaudeAgent(cfg: any, system: string, messages: any[], res: any, _chatMode: string, _options?: {
    allowTools?: boolean;
}): Promise<void>;
export declare function runMusicAgentIntentSelfTest(): {
    pass: boolean;
    checks: {
        agentPlayAction: boolean;
        genericPlayBecomesRandom: boolean;
        modelPlayRequiresNoLocalFallback: boolean;
        searchDoesNotAutoplay: boolean;
        questionDoesNotAutoplay: boolean;
        emptyPendingMessageRemoved: boolean;
        currentMessageNotDuplicated: boolean;
        conversationStartsWithUser: boolean;
        structuredTextContentSupported: boolean;
        openAiBaseUrlUsesUnifiedEndpoint: boolean;
        anthropicBaseUrlUsesUnifiedEndpoint: boolean;
        remoteCommandQueue: boolean;
        remoteCommandKeepsOriginalRequest: boolean;
        exactSongStaysStrict: boolean;
        sadMoodBeatsRandomKeyword: boolean;
        happyMoodRecommendation: boolean;
        artistOnlyRandomizes: boolean;
        genreRecommendation: boolean;
        playMusicIsReadRisk: boolean;
    };
    samples: {
        playSpecific: {
            type: string;
            keyword: string;
            mode: string;
            source: string;
            confidence: number;
            reason: string;
        };
        playRandom: {
            type: string;
            keyword: string;
            mode: string;
            source: string;
            confidence: number;
            reason: string;
        };
        searchOnly: {
            type: string;
            keyword: string;
            mode: string;
            source: string;
            confidence: number;
            reason: string;
        };
        questionOnly: {
            type: string;
            keyword: string;
            mode: string;
            source: string;
            confidence: number;
            reason: string;
        };
        normalizedHistory: {
            role: "user" | "assistant";
            content: string;
        }[];
        structuredHistory: {
            role: "user" | "assistant";
            content: string;
        }[];
        queueSelfTest: any;
    };
};
