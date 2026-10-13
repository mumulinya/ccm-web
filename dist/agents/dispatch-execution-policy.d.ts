import { DispatchProfileSnapshot } from "./dispatch-profile";
/** Apply the persisted profile without weakening an explicit permission gate. */
export declare function applyDispatchExecutionPolicy(policy: any, snapshot: DispatchProfileSnapshot): any;
export declare function assertDispatchExecutionPolicy(task: any): void;
