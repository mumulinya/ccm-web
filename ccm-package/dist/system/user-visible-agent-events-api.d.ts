import type { IncomingMessage, ServerResponse } from "http";
import { type UserVisibleAgentEvent } from "./user-visible-agent-events";
export declare function rehydrateReadonlyToolDetail(event: UserVisibleAgentEvent, options?: any): Promise<import("./tool-display-projection").ToolDisplayDetailV1>;
export declare function handleUserVisibleAgentEventsApi(pathname: string, req: IncomingMessage, res: ServerResponse, parsed: any): boolean;
