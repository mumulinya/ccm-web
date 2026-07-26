export declare function applyCcConnectTurnGuards(content: string, guards: {
    idleTimeoutMins: number;
    maxTurnTimeMins: number;
    resetOnIdleMins: number;
}): string;
export declare function getLogs(projectName: string, lines?: number): string;
export declare function stopControlBotConnection(): {
    success: boolean;
    running: boolean;
    message: string;
    process_owned?: undefined;
} | {
    success: boolean;
    running: boolean;
    process_owned: boolean;
    message: string;
};
export declare function startControlBotConnection(port?: number): {
    success: boolean;
    running: boolean;
    pid: number;
    target_port: number;
    endpoint_current: boolean;
    build_current: boolean;
    config_path: string;
    message: string;
    rebound_from_port?: undefined;
    log_file?: undefined;
} | {
    success: boolean;
    running: boolean;
    pid: number;
    target_port: number;
    endpoint_current: boolean;
    build_current: boolean;
    rebound_from_port: number;
    config_path: string;
    log_file: string;
    message: string;
};
declare function startProject(projectName: string, agentType: string, port: number): {
    success: boolean;
    error: string;
    running?: undefined;
    pid?: undefined;
    endpoint_current?: undefined;
    build_current?: undefined;
    message?: undefined;
    recycled?: undefined;
} | {
    success: boolean;
    running: boolean;
    pid: number;
    endpoint_current: boolean;
    build_current: boolean;
    message: string;
    error?: undefined;
    recycled?: undefined;
} | {
    success: boolean;
    running: boolean;
    pid: number;
    endpoint_current: boolean;
    build_current: boolean;
    recycled: boolean;
    message: string;
    error?: undefined;
};
declare function stopProject(projectName: string, explicit?: boolean): {
    success: boolean;
    running: boolean;
    process_owned: boolean;
    message: string;
};
export { startProject, stopProject };
export declare function reconcileProjectFeishuConnections(port: number): any[];
export declare function startFeishuChannelSupervisorForServer(port: number): void;
export declare function stopFeishuChannelSupervisorForServer(): void;
export declare function handleProjectsApi(pathname: string, req: any, res: any, parsed: any, ctx: {
    PORT: number;
    getSessions: Function;
    getAgentState: Function;
}): boolean;
