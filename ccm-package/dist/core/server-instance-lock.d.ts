type ServerInstanceLock = {
    bypassed?: boolean;
    file: string;
    token: string;
    pid: number;
    port: number;
};
export declare function acquireCcmServerInstanceLock(port: number): ServerInstanceLock;
export declare function releaseCcmServerInstanceLock(lock: ServerInstanceLock | null | undefined): boolean;
export declare function inspectCcmServerInstanceLock(): {
    file: string;
    present: boolean;
    owner: any;
    active: boolean;
};
export {};
