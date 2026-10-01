export type CcmConversationScope = "global" | "group" | "project";
export type CcmConversationIdentityV1 = {
    scope: CcmConversationScope;
    scopeId: string;
    exactSessionId: string;
};
export declare function normalizeConversationIdentity(input: Partial<CcmConversationIdentityV1> & {
    scope?: any;
    scopeId?: any;
    exactSessionId?: any;
    sessionId?: any;
}): CcmConversationIdentityV1 | null;
export declare function conversationIdentityKey(input: Partial<CcmConversationIdentityV1> & {
    scope?: any;
    scopeId?: any;
    exactSessionId?: any;
    sessionId?: any;
}): string;
export declare function conversationIdentityDigest(input: Partial<CcmConversationIdentityV1> & {
    scope?: any;
    scopeId?: any;
    exactSessionId?: any;
    sessionId?: any;
}): string;
export declare function identityMatches(left: any, right: any): boolean;
