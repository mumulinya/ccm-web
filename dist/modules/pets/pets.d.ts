type PetConfigV2 = {
    schema: "ccm-pet-config-v2";
    revision: number;
    configs: Record<string, any>;
    positions: Record<string, {
        x: number;
        y: number;
    }>;
    customTypes: any[];
    settings: {
        autoStart: boolean;
        webFallback: boolean;
        agentProgressMode: "milestones" | "terminal_only";
    };
    updatedAt: string;
};
export declare function readPetConfig(): PetConfigV2;
declare function isPetRunning(): boolean;
declare function launchPet(port: number): {
    success: boolean;
    pid: number;
    status: string;
    error?: undefined;
} | {
    success: boolean;
    error: any;
    pid?: undefined;
    status?: undefined;
};
declare function stopPet(): {
    success: boolean;
    error: string;
    pid?: undefined;
    status?: undefined;
} | {
    success: boolean;
    error: string;
    pid: number;
    status?: undefined;
} | {
    success: boolean;
    pid: number;
    status: string;
    error?: undefined;
};
export declare function runPetAssetSecuritySelfTest(): {
    pass: boolean;
    checks: Record<string, boolean>;
};
export declare function maybeAutoStartPet(port: number): {
    success: boolean;
    pid: number;
    status: string;
    error?: undefined;
} | {
    success: boolean;
    error: any;
    pid?: undefined;
    status?: undefined;
} | {
    success: boolean;
    skipped: boolean;
    reason: string;
};
export { isPetRunning, launchPet, stopPet };
export declare function handlePetsApi(pathname: string, req: any, res: any, parsed: any, ctx: {
    PORT: number;
    getPetAgents: Function;
    getPetNavigationTarget: Function;
    broadcastPetNavigation: Function;
    broadcastPetConfigChanged: Function;
    getProjectPetActionStrategy?: Function;
    petWorkspaceClientsSize: number;
}): boolean;
