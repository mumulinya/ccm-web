import type { AcceptanceContract } from "./acceptance-contract";
import { type AcceptanceSnapshot } from "./acceptance-workspace";
/** Scope authorization extends paths, never acceptance outcomes/checks. The
 * immutable approval event must attest the exact request fingerprint. */
export declare function auditDispatchAcceptanceScope(task: any, contract: AcceptanceContract, projectId: string, workItemId: string, before: AcceptanceSnapshot, after: AcceptanceSnapshot, original: any): any;
