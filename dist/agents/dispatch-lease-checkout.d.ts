import type Database from "better-sqlite3";
import type { AgentRun } from "./agent-run-types";
/** Called inside the same transaction as the lease claim. A resumed Run must
 * recover its physical lane before the transaction can authorize a launch. */
export declare function ensureClaimedRunCheckout(db: Database.Database, run: AgentRun, ttlMs: number): void;
