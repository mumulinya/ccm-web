import type { IncomingMessage, ServerResponse } from "http";
import type { UrlWithParsedQuery } from "url";
import { GroupLiveRoutesDeps } from "./group-live-routes-part-01";
export declare function handleGroupLiveRoutes(req: IncomingMessage, res: ServerResponse, parsed: UrlWithParsedQuery, ctx: any, deps: GroupLiveRoutesDeps): boolean;
