import { type ExtensionInstallationV1 } from "../../tools/extension-state";
import { fetchPluginMaterial } from "./extension-material";
export interface MarketplaceTransactionV3 {
    schema: "ccm-marketplace-transaction-v3";
    id: string;
    extensionId: string;
    action: "install" | "update" | "uninstall";
    state: "quarantined" | "activating" | "active" | "failed" | "recovery_required";
    principal: {
        userId: string;
        sessionId: string;
    };
    expiresAt: number;
    materialHash: string;
    snapshotRef: string;
    error?: string;
    previous?: ExtensionInstallationV1;
    configurationHash?: string;
    createdAt: string;
    updatedAt: string;
}
export declare function publicPackageTransaction(transaction: MarketplaceTransactionV3): {
    schema: "ccm-marketplace-transaction-v3";
    id: string;
    extensionId: string;
    action: "install" | "update" | "uninstall";
    state: "failed" | "recovery_required" | "active" | "activating" | "quarantined";
    name: any;
    description: any;
    version: any;
    materialHash: string;
    members: any;
    files: any;
    hooksIgnored: any;
    error: string;
    updatedAt: string;
};
export declare function getPackageTransaction(id: string): MarketplaceTransactionV3;
export declare function configureExtensionPackage(id: string, memberName: string, input: any, principal: MarketplaceTransactionV3["principal"]): {
    transaction: {
        schema: "ccm-marketplace-transaction-v3";
        id: string;
        extensionId: string;
        action: "install" | "update" | "uninstall";
        state: "failed" | "recovery_required" | "active" | "activating" | "quarantined";
        name: any;
        description: any;
        version: any;
        materialHash: string;
        members: any;
        files: any;
        hooksIgnored: any;
        error: string;
        updatedAt: string;
    };
    activation_token: string;
};
export declare function prepareExtensionRemoval(extensionId: string, principal: MarketplaceTransactionV3["principal"]): {
    transaction: {
        schema: "ccm-marketplace-transaction-v3";
        id: string;
        extensionId: string;
        action: "install" | "update" | "uninstall";
        state: "failed" | "recovery_required" | "active" | "activating" | "quarantined";
        name: any;
        description: any;
        version: any;
        materialHash: string;
        members: any;
        files: any;
        hooksIgnored: any;
        error: string;
        updatedAt: string;
    };
    activation_token: string;
    requires_activation: boolean;
};
export declare function prepareExtensionPackage(sourceUrl: string, principal: MarketplaceTransactionV3["principal"], action?: "install" | "update", fetchMaterial?: typeof fetchPluginMaterial): Promise<{
    transaction: {
        schema: "ccm-marketplace-transaction-v3";
        id: string;
        extensionId: string;
        action: "install" | "update" | "uninstall";
        state: "failed" | "recovery_required" | "active" | "activating" | "quarantined";
        name: any;
        description: any;
        version: any;
        materialHash: string;
        members: any;
        files: any;
        hooksIgnored: any;
        error: string;
        updatedAt: string;
    };
    activation_token: string;
}>;
export declare function pendingExtensionMcp(name: string): any;
export declare function activateExtensionPackage(id: string, token: string, principal: MarketplaceTransactionV3["principal"]): Promise<{
    transaction: {
        schema: "ccm-marketplace-transaction-v3";
        id: string;
        extensionId: string;
        action: "install" | "update" | "uninstall";
        state: "failed" | "recovery_required" | "active" | "activating" | "quarantined";
        name: any;
        description: any;
        version: any;
        materialHash: string;
        members: any;
        files: any;
        hooksIgnored: any;
        error: string;
        updatedAt: string;
    };
    duplicate: boolean;
    removed?: undefined;
    installation?: undefined;
} | {
    transaction: {
        schema: "ccm-marketplace-transaction-v3";
        id: string;
        extensionId: string;
        action: "install" | "update" | "uninstall";
        state: "failed" | "recovery_required" | "active" | "activating" | "quarantined";
        name: any;
        description: any;
        version: any;
        materialHash: string;
        members: any;
        files: any;
        hooksIgnored: any;
        error: string;
        updatedAt: string;
    };
    removed: boolean;
    duplicate?: undefined;
    installation?: undefined;
} | {
    transaction: {
        schema: "ccm-marketplace-transaction-v3";
        id: string;
        extensionId: string;
        action: "install" | "update" | "uninstall";
        state: "failed" | "recovery_required" | "active" | "activating" | "quarantined";
        name: any;
        description: any;
        version: any;
        materialHash: string;
        members: any;
        files: any;
        hooksIgnored: any;
        error: string;
        updatedAt: string;
    };
    installation: ExtensionInstallationV1;
    duplicate?: undefined;
    removed?: undefined;
}>;
export declare function recoverExtensionPackages(): void;
