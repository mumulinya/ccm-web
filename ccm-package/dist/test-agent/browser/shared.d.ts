import { BrowserCheckSpec, NormalizedTestAgentProjectTarget, NormalizedTestAgentWorkOrder } from "../types";
export declare function wantsBrowser(workOrder: NormalizedTestAgentWorkOrder): boolean;
export declare function checksForProject(project: NormalizedTestAgentProjectTarget, acceptanceCriteria?: string[]): BrowserCheckSpec[];
