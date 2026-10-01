import type { ServerResponse } from "http";
/**
 * Keeps a live response open without adding synthetic conversation events.
 * Protocol comments are ignored by EventSource and never enter the ledger.
 */
export declare function startSseHeartbeat(res: ServerResponse, intervalMs?: number): () => void;
