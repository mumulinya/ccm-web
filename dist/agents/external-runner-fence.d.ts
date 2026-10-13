/** Validate the persisted launch identity at the consumer, immediately before
 * spawning. Publishing a request is not permission to run it indefinitely. */
export declare function assertExternalRunnerLease(request: any): import("./agent-run-types").AgentRun;
export declare function authorizeExternalRunnerLaunch(request: any): import("./agent-run-types").AgentRun;
export declare function renewExternalRunnerLease(request: any, ttlMs: number): void;
/** Timeout is not evidence of process exit. Keep ownership/evidence available
 * for inspection and cancellation; do not make a new automatic attempt. */
export declare function blockUnconfirmedExternalRunner(request: any, reason: string): void;
