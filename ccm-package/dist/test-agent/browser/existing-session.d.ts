import { BrowserAuthenticationConfig, BrowserAuthenticationEvidence, BrowserCheckSpec, BrowserExistingSessionEvidence, BrowserExistingSessionEvidencePolicy, BrowserExistingSessionProvider } from "../types";
export declare function normalizeBrowserAuthenticationConfig(rawCheck: any): {
    config: BrowserAuthenticationConfig;
    errors: string[];
};
export declare function browserExistingSessionConfig(check: BrowserCheckSpec): {
    mode: "existing_session";
    provider: BrowserExistingSessionProvider;
    evidencePolicy: BrowserExistingSessionEvidencePolicy;
};
export declare function browserCheckUsesExistingSession(check: BrowserCheckSpec): boolean;
export declare function browserExistingSessionUsesMinimalEvidence(check: BrowserCheckSpec): boolean;
export declare function buildExistingSessionAuthenticationEvidence(existingSession: BrowserExistingSessionEvidence): BrowserAuthenticationEvidence;
