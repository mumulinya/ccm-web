export type ManagedProcessRow = {
    pid: number;
    parentPid: number;
    commandLine: string;
};
export declare function queryManagedProcessesAsync(): Promise<ManagedProcessRow[]>;
