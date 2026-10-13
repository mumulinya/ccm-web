/** Runs only in the existing managed readonly Worker. Never writes business data. */
export declare function executeProjectSourceOperation(input: any, cancelled?: () => boolean): Promise<any>;
