/** Internal materialization and user-visible opening are separate lifecycles. */
export declare function taskSessionOpeningState(task: any): {
    open: boolean;
    reason: string;
};
export declare function isPrivateTaskSessionId(value: any): boolean;
export declare function assertTaskSessionOpen(task: any): void;
