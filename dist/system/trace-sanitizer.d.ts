export declare function sanitizeTraceValue(value: any, depth?: number, seen?: WeakSet<object>): any;
export declare function sanitizeTraceEvent(input: any): {
    event: {
        id: string;
        at: string;
        type: string;
        status: string;
        task_id: string;
        group_id: string;
        agent: string;
        runtime: string;
        message: string;
        data: any;
    };
    dataChecksum: string;
};
export declare function sanitizeLegacyTrace(trace: any): {
    version: number;
    schema: string;
    trace_id: string;
    task_id: string;
    group_id: string;
    created_at: string;
    updated_at: string;
    legacy: boolean;
    events: any;
};
