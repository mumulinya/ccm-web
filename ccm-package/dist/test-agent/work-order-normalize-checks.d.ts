import { BrowserCheckSpec, HttpCheckSpec, WorkOrderIssue } from "./types";
export declare function normalizeHttpCheck(raw: any, issues: WorkOrderIssue[], project: string, index: number, forceAdversarial?: boolean): HttpCheckSpec | null;
export declare function normalizeBrowserCheck(raw: any, issues: WorkOrderIssue[], project: string, index: number, forceAdversarial?: boolean): BrowserCheckSpec | null;
