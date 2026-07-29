import type { IncomingMessage, ServerResponse } from "http";
export type AuthRole = "admin" | "operator" | "viewer";
type LoginTheme = "command" | "minimal" | "light";
export type AuthCapability = "read" | "chat.read_only" | "task.execute" | "project.runtime" | "project.git" | "attachment.manage" | "project.define" | "terminal.manage" | "agent.credentials" | "tools.manage" | "cleanup.permanent" | "permission.high_risk" | "security.manage";
type StoredUser = {
    id: string;
    username: string;
    normalizedUsername: string;
    role: AuthRole;
    password: {
        algorithm: "scrypt";
        salt: string;
        hash: string;
    };
    createdAt: string;
    updatedAt: string;
    disabledAt?: string;
    securityAudit?: Array<{
        at: string;
        action: string;
        actorId?: string;
    }>;
};
type StoredSession = {
    id: string;
    tokenHash: string;
    userId: string;
    csrfToken: string;
    clientFingerprintHash: string;
    createdAt: string;
    lastSeenAt: string;
    expiresAt: string;
    revokedAt?: string;
    revokedReason?: string;
};
export declare function getOrCreateLocalSetupCode(options?: {
    rotate?: boolean;
}): {
    code: string;
    expires_at: string;
};
export declare function resolveLocalAuthSession(req: IncomingMessage): {
    user: StoredUser;
    session: StoredSession;
    capabilities: AuthCapability[];
};
export declare function verifyBrowserCsrf(req: IncomingMessage, auth?: {
    user: StoredUser;
    session: StoredSession;
    capabilities: AuthCapability[];
}): boolean;
export declare function roleCapabilities(role: AuthRole): AuthCapability[];
export declare function hasAuthCapability(role: AuthRole, capability: AuthCapability): boolean;
export declare function browserApiAccessAllowed(req: IncomingMessage): boolean;
export declare function localAuthPublicState(req: IncomingMessage): {
    authenticated: boolean;
    registration_enabled: boolean;
    first_install: boolean;
    login_theme: LoginTheme;
    user: {
        id: string;
        username: string;
        role: AuthRole;
        disabled_at: string;
        created_at: string;
        updated_at: string;
    };
    capabilities: AuthCapability[];
    csrf: string;
    session_error: any;
    session: {
        id: string;
        created_at: string;
        last_seen_at: string;
        expires_at: string;
    };
};
export declare function handleLocalAuthApi(pathname: string, req: IncomingMessage, res: ServerResponse): boolean;
export declare function localAuthStorageFiles(): {
    users: string;
    sessions: string;
    setupCode: string;
    rateLimit: string;
};
export {};
