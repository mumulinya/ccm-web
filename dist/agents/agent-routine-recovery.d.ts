import type { CollabCtx } from "../modules/collaboration/collaboration";
export declare function selectMissedRoutineWindows(definition: any, latestRunCreatedAt: string | null, now?: Date): Date[];
/**
 * Replays missed cron windows after a service restart. The routine store is
 * the source of truth for windows already observed; dispatch itself remains
 * idempotent, so a recovery pass can safely overlap the normal scheduler.
 */
export declare function recoverAgentRoutineRuns(ctx: CollabCtx, now?: Date): Promise<{
    checked: number;
    recovered: number;
    skipped: number;
    failed: number;
    windows: number;
}>;
