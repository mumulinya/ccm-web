import "../core/runtime-paths";
import { type OAuthClientProvider } from "@modelcontextprotocol/sdk/client/auth.js";
import { securePublicFetch } from "./secure-public-network";
export declare class ExtensionOAuthProvider implements OAuthClientProvider {
    private name;
    private redirect?;
    private epoch;
    constructor(name: string, redirect?: (url: URL) => Promise<void>);
    private get data();
    get redirectUrl(): string;
    get clientMetadata(): any;
    state(): string;
    clientInformation(): any;
    saveClientInformation(client: any): void;
    tokens(): any;
    saveTokens(tokens: any): void;
    redirectToAuthorization(url: URL): Promise<void>;
    saveCodeVerifier(verifier: string): void;
    codeVerifier(): string;
    invalidateCredentials(scope: string): void;
}
export declare function extensionOAuthProvider(server: string, url?: string): ExtensionOAuthProvider;
export declare function extensionOAuthConnectionIdentity(server: string): string;
export declare function startExtensionOAuth(config: any, redirectUrl: string, principal: {
    userId: string;
    sessionId: string;
}, fetchFn?: typeof securePublicFetch): Promise<{
    server: any;
    status: string;
    authorizationUrl: string;
}>;
export declare function finishExtensionOAuth(query: any, principal: {
    userId: string;
    sessionId: string;
}, fetchFn?: typeof securePublicFetch): Promise<{
    server: string;
    status: string;
}>;
export declare function disconnectExtensionOAuth(server: string): void;
export declare function extensionOAuthStatus(server: string, url?: string): {
    server: string;
    status: string;
    configured: boolean;
    updatedAt: string;
};
