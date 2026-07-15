import type { IncomingMessage, ServerResponse } from "http";
import type { UrlWithParsedQuery } from "url";
type AgentQaRouteDeps = {
    getAgentQaItemsForGroup: (groupId: string, limit?: number) => any[];
    runAgentCollaborationProtocolSelfTest: () => any;
    setAgentQaArbitration: (id: string, decision: "accept" | "reject", reason: string) => any;
    resumeAgentQaFromStoredContinuation: (item: any, group: any, ctx: any, streamRes: any) => Promise<any>;
    setAgentQaManualTakeover: (id: string, reason: string) => any;
    retryAgentQaItem: (id: string, ctx: any, streamRes: any) => Promise<any>;
    listGroupCoordinationRequests?: (query: any) => any[];
};
export declare function handleAgentQaRoutes(req: IncomingMessage, res: ServerResponse, parsed: UrlWithParsedQuery, ctx: any, deps: AgentQaRouteDeps): boolean;
export {};
