/** Legacy loops can return diagnostic text. A frozen development Task cannot
 * treat an unfinished tool round as a successful Runtime result. */
export declare function assertDispatchToolLoopResult(taskId: string, result: any): void;
