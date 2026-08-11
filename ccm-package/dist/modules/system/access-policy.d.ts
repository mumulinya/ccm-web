export type FeatureModule = "workbench" | "resource_workspace" | "developer_tools" | "knowledge" | "memory" | "personal" | "terminal_ops" | "tool_ops" | "schedule_ops" | "maintenance_ops" | "platform_settings" | "menu_ops";
export type ResourceType = "project" | "group";
export type ResourceLevel = "use" | "manage";
export declare const FEATURE_MODULES: Array<{
    id: FeatureModule;
    label: string;
    description: string;
}>;
export declare function getEffectiveAccess(userId: string, role: string): {
    policyRevision: number;
    features: FeatureModule[];
    resources: {
        resourceType: ResourceType;
        resourceId: string;
        level: ResourceLevel;
        revision: number;
    }[];
};
export declare function hasFeatureAccess(userId: string, role: string, module: FeatureModule): boolean;
export declare function hasResourceAccess(userId: string, role: string, type: ResourceType, id: string, required?: ResourceLevel): boolean;
/**
 * Resolve the resource boundary for task reads.  A task may be a global
 * aggregate with nested targets, so all declared targets must be authorized
 * before returning the aggregate; otherwise an authorized project could be
 * used to read another project's task details.
 */
export declare function hasTaskResourceAccess(task: any, principal: any, required?: ResourceLevel): boolean;
export declare function authorizeResource(req: any, res: any, type: ResourceType, id: any, required?: ResourceLevel): boolean;
/** Remove grants with the account while preserving an auditable revocation. */
export declare function removeUserAccess(userId: string, actorUserId: string): void;
export declare function filterAccessibleResources<T>(items: T[], userId: string, role: string, type: ResourceType, getId: (item: T) => string): T[];
export declare function featureForApi(pathname: string): FeatureModule | null;
export declare function authorizeResourceQuery(req: any, res: any, parsed: any): boolean;
export declare function handleAccessPolicyApi(pathname: string, req: any, res: any): boolean;
