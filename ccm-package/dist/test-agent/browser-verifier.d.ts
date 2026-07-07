import { NormalizedTestAgentWorkOrder, TestAgentRuntimeOptions } from "./types";
export declare function runBrowserVerification(workOrder: NormalizedTestAgentWorkOrder, runtime?: TestAgentRuntimeOptions): Promise<import("./types").BrowserCheckResult[]>;
