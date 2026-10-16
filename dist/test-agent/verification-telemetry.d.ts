export interface ModelCallObservation {
    requestId?: string;
    stage: "planning" | "supplemental_planning";
    model_call_status: "not_called" | "called" | "unknown";
    usage?: any;
}
export declare function summarizeVerificationModelCalls(observations: ModelCallObservation[]): any;
/** Phase durations are wall-clock intervals, including parallel children once. */
export declare function createVerificationTiming(): {
    start: (stage: string) => () => void;
    measure<T>(stage: string, operation: () => T | Promise<T>): Promise<T>;
    snapshot(): {
        totalMs: number;
        verificationMs: number;
        stage_durations: {
            [x: string]: number;
        };
    };
};
