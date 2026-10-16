/** Review a worker before its receipt can unlock dependent workers. Repairs
 * use the same mention/worker/session path as the original assignment. */
export declare function reviewCrossWorker(input: {
    mention: any;
    env: any;
    outputs: string[];
    execute: (mention: any) => Promise<string[]>;
}): Promise<any[]>;
