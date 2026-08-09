import type { IncomingMessage, ServerResponse } from "http";
export declare function handleAgentCommunicationApi(pathname: string, req: IncomingMessage, res: ServerResponse, parsed: any, options?: {
    retryTask?: (taskId: string, ctx: any, reason?: string, autoExecute?: boolean) => any;
    createCollabCtx?: () => any;
}): boolean;
