/** An automatic repair is a distinct, bounded execution of the same Attempt.
 * Its reservation comes only from the persisted shared review cycle; repeated
 * delivery of that reservation must resolve to the very same Run. */
export declare function persistedDispatchReworkExecutionKey(taskId: string, executionId: string, originalKey?: string): string;
export declare function dispatchReworkMentionKey(task: any, base: string): string;
