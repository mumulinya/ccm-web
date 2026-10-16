type Preparation = {
    pid: number;
    owner: string;
    expiresAt: number;
    taskIds: string[];
    phase: 'waiting' | 'sealed';
};
export declare function trackDesktopMutation(req: any, res: any, pathname: string): void;
export declare function desktopPreparation(): Preparation | null;
export declare function desktopExecutionAllowed(taskId?: string): boolean;
export declare function assertDesktopExecutionAllowed(taskId?: string): void;
export declare function waitForDesktopExecution(taskId?: string): Promise<void>;
export declare function desktopBusySnapshot(): {
    busy: boolean;
    counts: {
        agent_runs: number;
        tasks: number;
        processes: any;
        terminals: any;
        mutations: number;
        media: any;
        git: number;
    };
    taskIds: string[];
};
export declare function isDesktopOwner(req: any): boolean;
export declare function deferDuringDesktopUpdate(callback: () => void): boolean;
export declare function isLifecycleCaller(req: any, drain?: boolean): boolean;
export declare function desktopMutationBlocked(req: any, pathname: string): boolean;
export declare function handleDesktopLifecycleApi(pathname: string, req: any, res: any): boolean;
export {};
