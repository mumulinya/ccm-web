import { BrowserActionEffectEvidence, BrowserActionEffectSignal, BrowserActionEffectSnapshot, BrowserActionSpec, BrowserCheckResult, BrowserStepResult } from "../types";
export declare const BROWSER_ACTION_EFFECT_SIGNALS: BrowserActionEffectSignal[];
export interface BrowserActionEffectObservation {
    url?: string;
    title?: string;
    pageText?: string;
    dom?: string;
    networkCount?: number;
    dialogCount?: number;
    popupCount?: number;
    downloadCount?: number;
}
export declare function browserActionEffectRequired(action: BrowserActionSpec): boolean;
export declare function browserActionEffectSession(action: BrowserActionSpec): string;
export declare function browserActionEffectTimeout(action: BrowserActionSpec, fallback: number): number;
export declare function buildBrowserActionEffectSnapshot(observation: BrowserActionEffectObservation, requestedSignals: BrowserActionEffectSignal[]): BrowserActionEffectSnapshot;
export declare function browserActionEffectEvidenceErrors(evidence: BrowserActionEffectEvidence | Record<string, any> | undefined, label?: string): string[];
export declare function browserActionEffectResultErrors(result: BrowserCheckResult | Record<string, any>, label?: string): string[];
export declare function verifyBrowserActionEffect(input: {
    provider: BrowserActionEffectEvidence["provider"];
    action: BrowserActionSpec;
    actionIndex: number;
    session?: string;
    effectSession?: string;
    defaultTimeout: number;
    beforeObservation: BrowserActionEffectObservation;
    capture: () => Promise<BrowserActionEffectObservation>;
}): Promise<{
    evidence: BrowserActionEffectEvidence;
    step: BrowserStepResult;
}>;
export declare function suppressBrowserActionEffectDetails(evidence: BrowserActionEffectEvidence[]): {
    before: {};
    after: {};
    detailSuppressed: boolean;
    provider: "playwright" | "mcp";
    actionIndex: number;
    session?: string;
    effectSession?: string;
    actionType: BrowserActionSpec["type"];
    status: "changed" | "unchanged" | "unavailable";
    timeoutMs: number;
    startedAt: string;
    finishedAt: string;
    durationMs: number;
    requestedSignals: BrowserActionEffectSignal[];
    observedSignals: BrowserActionEffectSignal[];
    changedSignals: BrowserActionEffectSignal[];
}[];
