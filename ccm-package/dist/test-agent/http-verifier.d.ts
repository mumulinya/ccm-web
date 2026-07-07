import { HttpCheckResult, NormalizedTestAgentWorkOrder } from "./types";
export declare function runHttpVerification(workOrder: NormalizedTestAgentWorkOrder): Promise<HttpCheckResult[]>;
