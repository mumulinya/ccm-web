import { BrowserActionSpec, BrowserAssertionSpec } from "../types";
export type BrowserTargetSpec = Partial<Omit<BrowserActionSpec, "type"> & Omit<BrowserAssertionSpec, "type">>;
export interface SemanticLocatorPlan {
    kind: "selector" | "testId" | "label" | "placeholder" | "role" | "text" | "altText" | "title";
    value: string;
    name?: string;
    exact?: boolean;
}
export declare function buildSemanticLocatorPlan(target: BrowserTargetSpec): SemanticLocatorPlan | null;
export declare function browserTargetDetail(target: BrowserTargetSpec): string;
export declare function resolvePlaywrightLocator(page: any, target: BrowserTargetSpec): any;
