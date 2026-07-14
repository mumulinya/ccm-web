export declare function getLogs(projectName: string, lines?: number): string;
export declare function startControlBotConnection(port?: number): {
    success: boolean;
    running: boolean;
    pid: number;
    target_port: number;
    endpoint_current: boolean;
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
    rebound_from_port: number;
    config_path: string;
    log_file: string;
    message: string;
};
declare function startProject(projectName: string, agentType: string, port: number): {
    success: boolean;
    error: string;
    pid?: undefined;
} | {
    success: boolean;
    pid: number;
    error?: undefined;
};
declare function stopProject(projectName: string): {
    success: boolean;
    error: string;
} | {
    success: boolean;
    error?: undefined;
};
export { startProject, stopProject };
export declare function handleProjectsApi(pathname: string, req: any, res: any, parsed: any, ctx: {
    PORT: number;
    getSessions: Function;
    getAgentState: Function;
}): boolean;
