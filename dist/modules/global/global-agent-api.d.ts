import type { CollabCtx } from "../collaboration/collaboration";
export declare function createGlobalAgentApi(deps: any): {
    handleGlobalAgentApi: (pathname: string, req: any, res: any, parsed: any, ctx: CollabCtx) => boolean;
    drainGlobalWebTurns: (baseUrl: string, ctx: CollabCtx, sessionId: string) => Promise<void>;
    startGlobalWebTurnRecoveryForServer: (baseUrl: string, ctx: CollabCtx) => {
        started: boolean;
    };
    stopGlobalWebTurnRecoveryForServer: () => void;
};
