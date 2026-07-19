import type { IncomingMessage, ServerResponse } from "http";
import type { UrlWithParsedQuery } from "url";
import { BasicGroupRouteDeps } from "./group-routes-part-01";
export declare function handleBasicGroupRoutes(req: IncomingMessage, res: ServerResponse, parsed: UrlWithParsedQuery, ctx: any, deps: BasicGroupRouteDeps): boolean;
