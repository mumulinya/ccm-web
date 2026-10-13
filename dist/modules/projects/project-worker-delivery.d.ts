export declare function enqueueProjectWorkerDelivery(input: {
    prepared: any;
    workItem: any;
    mainWorkDir: string;
    queue: Promise<void>;
    taskId?: string;
}): {
    queue: Promise<void>;
    promise: Promise<any>;
};
