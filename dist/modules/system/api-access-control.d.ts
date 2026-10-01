import type { IncomingMessage, ServerResponse } from "http";
import { type AuthCapability, type AuthRole } from "./local-auth";
export type ApiAccessPrincipal = {
    kind: "browser";
    userId: string;
    role: AuthRole;
    capabilities: AuthCapability[];
    sessionId: string;
    readOnly: boolean;
} | {
    kind: "internal";
    caller: string;
    role: "internal";
    capabilities: string[];
    readOnly: false;
};
export type AuthenticatedIncomingMessage = IncomingMessage & {
    ccmAuth?: ApiAccessPrincipal;
};
export declare function authorizeApiRequest(req: AuthenticatedIncomingMessage, res: ServerResponse, pathnameWithQuery: string): boolean;
export declare function applySecurityHeaders(res: ServerResponse): void;
export declare function validateRequestHost(req: IncomingMessage, res: ServerResponse): boolean;
export declare function requestIsReadOnly(req: IncomingMessage): boolean;
export declare function requestAccessPrincipal(req: IncomingMessage): ApiAccessPrincipal;
