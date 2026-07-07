import { DevServerResult, NormalizedTestAgentWorkOrder } from "./types";
export interface ManagedDevServer {
    result: DevServerResult;
    stop: () => void;
}
export declare function startDevServersForBrowserChecks(workOrder: NormalizedTestAgentWorkOrder): Promise<ManagedDevServer[]>;
