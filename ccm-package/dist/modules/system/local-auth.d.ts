import type { IncomingMessage, ServerResponse } from "http";
type AuthRole = "admin" | "user";
type LoginTheme = "command" | "minimal" | "light";
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
};
type StoredSession = {
    id: string;
    tokenHash: string;
    userId: string;
    createdAt: string;
    expiresAt: string;
    userAgentHash: string;
};
export declare function resolveLocalAuthSession(req: IncomingMessage): {
    user: StoredUser;
    session: StoredSession;
};
export declare function isBrowserRequest(req: IncomingMessage): boolean;
export declare function isTrustedLocalAgentRequest(req: IncomingMessage): boolean;
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
        created_at: string;
    };
};
export declare function handleLocalAuthApi(pathname: string, req: IncomingMessage, res: ServerResponse): boolean;
export declare function localAuthStorageFiles(): {
    users: string;
    sessions: string;
};
export {};
