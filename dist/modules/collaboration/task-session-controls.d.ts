export declare function taskSessionControls(deps: any): {
    confirmExecution: ({ task, payload }: any) => {
        success: boolean;
        action: string;
        queued: any;
        task: any;
    };
    archiveUnfinished: ({ task, payload, req }: any) => Promise<any>;
    taskRunAction: ({ action, task, run, payload, req }: any) => Promise<any>;
};
