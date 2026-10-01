export type ExternalClaudeProviderConfig = {
    source: "cc-switch" | "external-file";
    providerId: string;
    providerName: string;
    apiUrl: string;
    apiKey: string;
    model: string;
    credentialType: "api_key" | "auth_token";
};
export declare function loadCcSwitchClaudeProvider(): ExternalClaudeProviderConfig | null;
