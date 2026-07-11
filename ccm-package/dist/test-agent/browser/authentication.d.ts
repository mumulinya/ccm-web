import { BrowserActionSpec, BrowserAuthenticationEvidence, BrowserCheckSpec, BrowserSessionSpec, BrowserStorageStateEvidence, NormalizedTestAgentProjectTarget } from "../types";
export interface ResolvedBrowserActionValue {
    value: string;
    provided: boolean;
    source: "literal" | "environment" | "none";
    envName?: string;
}
export interface BrowserSecretBinding {
    envName: string;
    value: string;
}
export interface LoadedBrowserStorageState {
    path: string;
    evidence: BrowserStorageStateEvidence;
    secretBindings: BrowserSecretBinding[];
}
export declare function browserActionValueEnvName(action: BrowserActionSpec): string;
export declare function isValidBrowserEnvironmentName(value: string): boolean;
export declare function browserActionSupportsEnvironmentValue(action: BrowserActionSpec): boolean;
export declare function resolveBrowserActionValue(project: NormalizedTestAgentProjectTarget, action: BrowserActionSpec): ResolvedBrowserActionValue;
export declare function browserCheckAuthenticationActions(check: BrowserCheckSpec): BrowserActionSpec[];
export declare function browserSessionAuthenticationActions(check: BrowserCheckSpec, session: BrowserSessionSpec): BrowserActionSpec[];
export declare function browserAuthenticationEnvNames(actions: BrowserActionSpec[]): string[];
export declare function browserCheckAuthenticationEnvNames(check: BrowserCheckSpec): string[];
export declare function browserCheckHasStorageState(check: BrowserCheckSpec): boolean;
export declare function browserCheckRequiresAuthentication(check: BrowserCheckSpec): boolean;
export declare function browserCheckRequiresManagedAuthentication(check: BrowserCheckSpec): boolean;
export declare function resolveBrowserSecretBindings(project: NormalizedTestAgentProjectTarget, actions: BrowserActionSpec[]): BrowserSecretBinding[];
export declare function redactBrowserSensitiveText(value: any, bindings: BrowserSecretBinding[]): string;
export declare function browserStorageStatePath(source: BrowserCheckSpec | BrowserSessionSpec): string;
export declare function loadBrowserStorageState(project: NormalizedTestAgentProjectTarget, source: BrowserCheckSpec | BrowserSessionSpec): LoadedBrowserStorageState | null;
export declare function buildBrowserAuthenticationEvidence(input: {
    credentialEnvNames?: string[];
    storageState?: BrowserStorageStateEvidence;
    sensitiveArtifactsSuppressed?: boolean;
}): BrowserAuthenticationEvidence | undefined;
export declare function browserAuthenticationEvidenceErrors(evidence: BrowserAuthenticationEvidence, label: string): string[];
