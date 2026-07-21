// Behavior-freeze facade — implementation split into focused modules.
import { handleMusicApiPartA } from "./music-part-01";
import { handleMusicApiPartB } from "./music-part-02";
import { handleMusicMemoryApi } from "./memory";

export { handleMusicApiPartA, handleMusicApiPartB, handleMusicMemoryApi };
export { runMusicAgentIntentSelfTest } from "./agent";
export { runMusicRemoteCommandQueueSelfTest } from "./state";

export function handleMusicApi(pathname: string, req: any, res: any, parsed: any, ctx: any): boolean {
  if (handleMusicMemoryApi(pathname, req, res)) return true;
  if (handleMusicApiPartA(pathname, req, res, parsed, ctx)) return true;
  return handleMusicApiPartB(pathname, req, res, parsed, ctx);
}
