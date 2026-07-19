export { runMusicAgentIntentSelfTest } from "./agent";
export { runMusicRemoteCommandQueueSelfTest } from "./state";
interface MusicCtx {
    getMusicPetAgent: () => any;
    setMusicPetState: (state: string, detail?: string, track?: any) => void;
    broadcastPetSpeech: (agent: string, payload: any) => void;
    MUSIC_PET_AGENT_NAME: string;
}
export declare function handleMusicApiPartA(pathname: string, req: any, res: any, parsed: any, ctx: MusicCtx): boolean;
