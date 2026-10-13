export declare function reconcileStartupConsistency(): Promise<{
    checked: number;
    consistent: number;
    repairable: number;
    blocked: number;
    repaired: number;
}>;
