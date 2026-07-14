export declare const RANDOM_MUSIC_KEYWORD = "__random__";
export declare function extractMusicIntent(msg: string): {
    type: string;
    keyword: string;
};
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
} | {
    error: any;
    type: string;
    keyword: string;
    mode: string;
    source: string;
    confidence: number;
    reason: string;
}>;
export declare function getMusicHelpText(chatMode: string): "🎵 本地音乐助手\n\n你可以说：\n• \"播放 周杰伦\" - 搜索并播放\n• \"搜索 轻音乐\" - 搜索本地曲库\n• \"来首钢琴曲\" - 自然语言搜索\n\n将 MP3 文件放入 ~/.cc-connect/music/ 目录" | "🎵 网易云音乐助手\n\n你可以说：\n• \"我想听周杰伦的歌\" - 搜索网易云\n• \"搜索 轻音乐\" - 搜索网易云音乐\n• \"来首适合学习的音乐\" - 智能推荐\n\n点击搜索结果可一键下载为本地 MP3" | "🎵 B站音乐助手\n\n你可以说：\n• \"我想听周杰伦的歌\" - 搜索B站\n• \"搜索 轻音乐\" - 搜索B站视频\n• \"来首适合编程的音乐\" - 智能推荐\n\n点击搜索结果可一键转码为本地 MP3";
export declare function writeSse(res: any, data: any): void;
export declare function callClaudeAgent(cfg: any, system: string, messages: any[], res: any, chatMode: string): Promise<void>;
export declare function runMusicAgentIntentSelfTest(): {
    pass: boolean;
    checks: {
        agentPlayAction: boolean;
        genericPlayBecomesRandom: boolean;
        fallbackPlayRequiresNoAutoplay: boolean;
        searchDoesNotAutoplay: boolean;
        questionDoesNotAutoplay: boolean;
        emptyPendingMessageRemoved: boolean;
        currentMessageNotDuplicated: boolean;
        conversationStartsWithUser: boolean;
        structuredTextContentSupported: boolean;
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
    };
};
