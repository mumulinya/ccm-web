export declare function runMusicAgentIntentSelfTest(): {
    pass: boolean;
    checks: {
        agentPlayAction: boolean;
        genericPlayBecomesRandom: boolean;
        fallbackPlayRequiresNoAutoplay: boolean;
        searchDoesNotAutoplay: boolean;
        questionDoesNotAutoplay: boolean;
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
    };
};
interface MusicCtx {
    getMusicPetAgent: () => any;
    setMusicPetState: (state: string, detail?: string, track?: any) => void;
    broadcastPetSpeech: (agent: string, payload: any) => void;
    MUSIC_PET_AGENT_NAME: string;
}
export declare function handleMusicApi(pathname: string, req: any, res: any, parsed: any, ctx: MusicCtx): boolean;
export {};
