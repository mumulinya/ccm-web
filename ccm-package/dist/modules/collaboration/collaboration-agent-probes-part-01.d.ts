export declare function hasFreshSuccessfulAgentProbe(readiness: any): boolean;
export declare function taskMatchesAgentProbeTarget(task: any, target?: any): any;
export declare function getAgentProbeTargetStatusKey(target: any): string;
export declare function readAgentProbeStatus(requiredTarget?: any): any;
export declare function getAgentProbeHealth(probe: any): {
    status: string;
    successFresh: boolean;
    failureRecent: boolean;
    message: any;
};
export declare function getAgentProbeOutputFailure(output: any): {
    message: string;
    error: string;
};
export declare function getAgentExecutionReadiness(probeTarget?: any): {
    ready: boolean;
    mode: string;
    message: string;
    fix_actions: string[];
    childProcess: any;
    externalRunner: {
        active: boolean;
        status: any;
        detail: any;
        pid: number;
        process_alive: boolean;
        updated_at: any;
        age_ms: number;
        pending_requests: number;
        requests: number;
        results: number;
        last_result: any;
    };
    probe: any;
    probeHealth: {
        status: string;
        successFresh: boolean;
        failureRecent: boolean;
        message: any;
    };
} | {
    ready: boolean;
    mode: string;
    message: string;
    fix_actions: any[];
    childProcess: any;
    probe: any;
    probeHealth: {
        status: string;
        successFresh: boolean;
        failureRecent: boolean;
        message: any;
    };
    externalRunner?: undefined;
};
export declare function enforceAgentProbeExecutionReadiness(capability?: any): {
    childProcess: any;
    externalRunner: any;
    probe: any;
    probeHealth: any;
    ready: boolean;
    mode: string;
    message: string;
    fix_actions: string[];
    gateway: {
        baseUrl: string;
        host: string;
        port: number;
        ok: boolean;
        error: any;
    };
} | {
    ready: boolean;
    mode: string;
    message: string;
    fix_actions: string[];
    childProcess: any;
    externalRunner: any;
    probe: any;
    probeHealth: any;
};
