/** Reuse CCM's permission broker, including expiry and exact workspace binding.
 * Frozen confirm_before_write overrides a weaker conversation default. */
export declare function ensureDispatchWritePermission(input: any): Promise<void>;
/** Synchronous process/lease observations cannot ask a model or create grants. */
export declare function assertDispatchWritePermission(input: any): void;
