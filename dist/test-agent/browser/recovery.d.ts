import { BrowserRecoveryEvidence, BrowserRecoveryEvent, BrowserRecoveryStatus, BrowserRecoveryTrigger } from "../types";
export declare const MAX_BROWSER_SESSION_RECOVERY_ATTEMPTS = 1;
export declare function browserRecoveryTrigger(error: any): BrowserRecoveryTrigger | null;
export declare function browserRecoveryFailureMessage(trigger: BrowserRecoveryTrigger, status: BrowserRecoveryStatus): string;
export declare class BrowserRecoveryTracker {
    private provider;
    private maxAttempts;
    private events;
    constructor(provider: BrowserRecoveryEvent["provider"], maxAttempts?: number);
    record(input: Omit<BrowserRecoveryEvent, "provider" | "attempt">): void;
    evidence(): BrowserRecoveryEvidence | undefined;
}
