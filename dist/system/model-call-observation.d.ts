type Observation = {
    requestId: string;
    stage: string;
    model_call_status: "called";
    usage?: any;
};
/** Observe the existing physical request ledger; no extra requests or durable data. */
export declare function observeModelCalls<T>(operation: (rows: Map<string, Observation>) => Promise<T>): Promise<T>;
export declare function inModelCallStage<T>(stage: string, operation: () => Promise<T>): Promise<T>;
export declare function observePhysicalModelRequest(row: any): void;
export {};
