export declare function extensionCenterItems(): {
    items: ({
        id: string;
        type: string;
        delivery: {
            id: string;
            runtime: any;
            state: string;
            updatedAt: any;
            snapshotId: any;
            message: string;
        }[];
        installationId: string;
        members: {
            kind: string;
            name: any;
            transport: string;
            connection: {
                server: string;
                status: string;
                configured: boolean;
                updatedAt: string;
            };
        }[];
        connection: {
            server: string;
            status: string;
            configured: boolean;
            updatedAt: string;
        };
        kind: string;
        name: any;
        description: string;
        installed: boolean;
        enabled: boolean;
        ready: boolean;
        integrity: boolean;
        state: any;
        reason: string;
        version: string;
        source: any;
        materialHash: any;
    } | {
        id: string;
        name: string;
        description: string;
        version: string;
        type: string;
        enabled: boolean;
        installed: boolean;
        ready: boolean;
        state: "failed" | "recovery_required" | "active" | "removed" | "preparing";
        reason: string;
        source: string;
        sourceUrl: string;
        transactionId: string;
        delivery: {
            id: string;
            runtime: any;
            state: string;
            updatedAt: any;
            snapshotId: any;
            message: string;
        }[];
        members: {
            transport: string;
            connection: {
                server: string;
                status: string;
                configured: boolean;
                updatedAt: string;
            };
            kind: "mcp" | "skill";
            name: string;
            materialHash?: string;
            owned: boolean;
        }[];
    })[];
    availabilityMode: "installed";
    tools: {
        mcp: any[];
        skill: any[];
    };
    entries: {
        kind: string;
        name: any;
        description: string;
        installed: boolean;
        enabled: boolean;
        ready: boolean;
        integrity: boolean;
        state: any;
        reason: string;
        version: string;
        source: any;
        materialHash: any;
    }[];
    revision: string;
};
export declare function changeExtensionEnabled(id: string, enabled: boolean): Promise<{
    enabled: boolean;
    runtime: any[];
}>;
export declare function handleExtensionsApi(pathname: string, req: any, res: any, parsed: any): boolean;
