/** Verification completion is distinct from an explicit delivery decision.
 * This approval authorizes the existing result, never another Provider call. */
export declare function stageDispatchTaskDelivery(taskId: string, execution: any, summary: any): any;
export declare function approveDispatchTaskDelivery(task: any, actorId: string): {
    delivery_confirmation?: undefined;
    user_acceptance?: undefined;
} | {
    delivery_confirmation: {
        confirmed: boolean;
        approval_id: string;
        action_fingerprint: any;
        actor_id: string;
    };
    user_acceptance: any;
};
/** The approved output also closes the legacy execution projection. This
 * grants merge readiness only; merging remains a separate explicit action. */
export declare function finalizeApprovedDispatchDelivery(task: any): void;
/** Repair only an already authorized, unchanged delivery after the SQLite
 * decision committed but its Task projection did not. No Runtime is replayed. */
export declare function reconcileDispatchTaskDeliveryDecisions(): {
    repaired: number;
    blocked: number;
};
