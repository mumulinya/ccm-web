export declare const DIRECT_AGENT_DISPATCH_REQUEST_SCHEMA = "ccm-direct-agent-dispatch-request-v1";
export declare const DIRECT_AGENT_DISPATCH_RESULT_SCHEMA = "ccm-direct-agent-dispatch-result-v1";
export declare const DIRECT_AGENT_DISPATCH_TRANSCRIPT_SCHEMA = "ccm-direct-agent-dispatch-transcript-event-v1";
export declare function readDirectAgentDispatchTranscript(id: string, options?: any): {
    id: string;
    valid: boolean;
    issues: string[];
    events: any[];
    bytes: number;
    file: string;
    event_count?: undefined;
    stream_bytes?: undefined;
    last_event?: undefined;
    head_checksum?: undefined;
} | {
    id: string;
    valid: boolean;
    issues: string[];
    events: {
        sequence: any;
        type: any;
        at: any;
        payload: any;
        payloadBytes: any;
        eventChecksum: any;
    }[];
    event_count: number;
    bytes: number;
    stream_bytes: number;
    last_event: {
        sequence: any;
        type: any;
        at: any;
        payload: any;
        payloadBytes: any;
        eventChecksum: any;
    };
    head_checksum: string;
    file: string;
} | {
    id: string;
    valid: boolean;
    issues: string[];
    events: any[];
    bytes: number;
    file: string;
    last_event: any;
    stream_bytes: number;
    event_count?: undefined;
    head_checksum?: undefined;
};
export declare function appendDirectAgentDispatchTranscript(id: string, type: string, payload?: any): any;
export declare function createDirectAgentDispatchRequest(input?: any): {
    id: string;
    requestFile: any;
    resultFile: string;
    request: any;
};
export declare function markDirectAgentDispatchStarted(id: string, input?: any): any;
export declare function completeDirectAgentDispatch(id: string, input?: any): {
    request: any;
    result: any;
};
export declare function readDirectAgentDispatchRequest(id: string): any;
export declare function readDirectAgentDispatchResult(id: string): any;
export declare function validateDirectAgentDispatchPair(request: any, result: any): {
    valid: boolean;
    issues: string[];
};
export declare function listDirectAgentDispatchSpool(options?: any): {
    id: string;
    request: any;
    result: any;
    transcript: {
        id: string;
        valid: boolean;
        issues: string[];
        events: any[];
        bytes: number;
        file: string;
        event_count?: undefined;
        stream_bytes?: undefined;
        last_event?: undefined;
        head_checksum?: undefined;
    } | {
        id: string;
        valid: boolean;
        issues: string[];
        events: {
            sequence: any;
            type: any;
            at: any;
            payload: any;
            payloadBytes: any;
            eventChecksum: any;
        }[];
        event_count: number;
        bytes: number;
        stream_bytes: number;
        last_event: {
            sequence: any;
            type: any;
            at: any;
            payload: any;
            payloadBytes: any;
            eventChecksum: any;
        };
        head_checksum: string;
        file: string;
    } | {
        id: string;
        valid: boolean;
        issues: string[];
        events: any[];
        bytes: number;
        file: string;
        last_event: any;
        stream_bytes: number;
        event_count?: undefined;
        head_checksum?: undefined;
    };
    pair: {
        valid: boolean;
        issues: string[];
    };
}[];
export declare function cancelPreparedDirectAgentDispatch(id: string, input?: any): any;
export declare function pruneDirectAgentDispatchTerminalPair(id: string): {
    id: string;
    deleted_count: number;
    deleted: string[];
};
export declare function pruneDirectAgentDispatchSpool(options?: any): {
    deleted_count: number;
    deleted: string[];
};
