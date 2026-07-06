import type { IncomingMessage, ServerResponse } from "http";
import type { UrlWithParsedQuery } from "url";
type BasicGroupRouteDeps = {
    getGroupMemoryFile: (groupId: string) => string;
    loadGroupMemory: (groupId: string) => any;
    saveGroupMemory: (groupId: string, memory: any) => any;
    buildGroupMemoryContext: (memory: any) => string;
    buildAgentMemoryPacket: (groupId: string, project: string) => string;
    buildInlineTaskRuntime: (task: any) => any;
    getAgentQaItemsForGroup: (groupId: string, limit?: number) => any[];
};
export declare function handleBasicGroupRoutes(req: IncomingMessage, res: ServerResponse, parsed: UrlWithParsedQuery, ctx: any, deps: BasicGroupRouteDeps): boolean;
export {};
