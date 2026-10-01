import type { IncomingMessage, ServerResponse } from "http";
/** Recovery writes deliberately go through the existing guarded replay action handler. */
export declare function handleTaskRecoveryRoutes(pathname: string, req: IncomingMessage, res: ServerResponse): boolean;
