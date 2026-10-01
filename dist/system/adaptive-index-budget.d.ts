/**
 * TypeScript's language service retains ASTs and module metadata.  A fixed
 * repository-wide limit is both too strict for small machines and needlessly
 * wasteful on larger ones.  This policy derives a conservative budget from
 * the current process headroom and machine memory, while retaining a hard
 * safety ceiling as a last resort.
 */
export type AdaptiveIndexBudget = {
    maxFiles: number;
    maxBytes: number;
    headroomBytes: number;
    availableMemoryBytes: number;
    reason: "adaptive" | "emergency";
};
export declare function resolveAdaptiveIndexBudget(): AdaptiveIndexBudget;
