export declare function callMusicLlm(config: any, prompt: string, options?: {
    system?: string;
    maxTokens?: number;
    temperature?: number;
    timeoutMs?: number;
}): Promise<string>;
export declare function generateSongQuote(config: any, title: string, artist?: string): Promise<string>;
export declare function classifySongEmotion(config: any, title: string, artist: string, labels: string[]): Promise<string>;
