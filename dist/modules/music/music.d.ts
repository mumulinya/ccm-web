import { handleMusicMemoryApi } from "./memory";
export { handleMusicMemoryApi };
export { runMusicAgentIntentSelfTest } from "./agent";
export { runMusicRemoteCommandQueueSelfTest } from "./state";
export declare function handleMusicApi(pathname: string, req: any, res: any, parsed: any, ctx: any): boolean;
interface MusicCtx {
    getMusicPetAgent: () => any;
    setMusicPetState: (state: string, detail?: string, track?: any) => void;
    broadcastPetSpeech: (agent: string, payload: any) => void;
    MUSIC_PET_AGENT_NAME: string;
}
export declare function handleMusicApiPartA(pathname: string, req: any, res: any, parsed: any, ctx: MusicCtx): boolean;
export { runMusicWeatherSelfTest } from "./weather";
interface MusicCtx {
    getMusicPetAgent: () => any;
    setMusicPetState: (state: string, detail?: string, track?: any) => void;
    broadcastPetSpeech: (agent: string, payload: any) => void;
    MUSIC_PET_AGENT_NAME: string;
}
export declare function handleMusicApiPartB(pathname: string, req: any, res: any, parsed: any, ctx: MusicCtx): boolean;
