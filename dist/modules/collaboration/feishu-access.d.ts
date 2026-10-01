export type FeishuUserRole = "viewer" | "operator" | "admin";
export type FeishuInboundIdentity = {
    open_id: string;
    user_id: string;
    union_id: string;
    name: string;
};
export type FeishuAccessDecision = FeishuInboundIdentity & {
    allowed: boolean;
    role: FeishuUserRole;
    mode: "open" | "mapped";
    reason: string;
    canOperate: boolean;
    canApprove: boolean;
};
export declare function extractFeishuInboundIdentity(payload?: any): FeishuInboundIdentity;
export declare function resolveFeishuUserAccess(payload?: any, config?: any): FeishuAccessDecision;
export declare function signFeishuCardAction(value: any, config?: any): string;
export declare function verifyFeishuCardAction(value: any, config?: any): boolean;
export declare function publicFeishuUserMapping(item: any): {
    open_id: string;
    user_id: string;
    union_id: string;
    name: string;
    role: FeishuUserRole;
    enabled: boolean;
};
