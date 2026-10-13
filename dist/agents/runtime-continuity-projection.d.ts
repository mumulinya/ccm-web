/** Inspection and actual Provider observation are independent evidence levels. */
export declare function projectRuntimeContinuity(run: any, events?: any[]): {
    session_saved: boolean;
    inspection: string;
    reuse: any;
    reason: string;
    evidence_refs: any[];
};
export declare function readRuntimeContinuity(run: any): {
    session_saved: boolean;
    inspection: string;
    reuse: any;
    reason: string;
    evidence_refs: any[];
};
