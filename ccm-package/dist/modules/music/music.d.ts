import { handleMusicApiPartA } from "./music-part-01";
import { handleMusicApiPartB } from "./music-part-02";
export { handleMusicApiPartA, handleMusicApiPartB };
export { runMusicAgentIntentSelfTest } from "./agent";
export { runMusicRemoteCommandQueueSelfTest } from "./state";
export declare function handleMusicApi(pathname: string, req: any, res: any, parsed: any, ctx: any): boolean;
