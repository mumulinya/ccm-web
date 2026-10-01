import type { IncomingMessage } from "http";
export type InternalApiCaller = "global-agent" | "feishu-acp" | "project-feishu-queue" | "ccm-cli" | "server-recovery" | "desktop-pet";
export declare function buildInternalApiHeaders(caller: InternalApiCaller, method: string, pathname: string): {
    "X-CCM-Internal-Caller": InternalApiCaller;
    "X-CCM-Internal-Timestamp": string;
    "X-CCM-Internal-Nonce": string;
    "X-CCM-Internal-Signature": string;
};
export declare function verifyInternalApiRequest(req: IncomingMessage, pathnameWithQuery: string): {
    caller: InternalApiCaller;
    kind: "internal";
};
export declare function internalApiSecretFile(): string;
