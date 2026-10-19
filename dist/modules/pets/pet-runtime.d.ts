type Binding = {
    userId?: string;
    sessionId?: string;
};
export declare function readPetRuntimeIdentity(): {
    schema: string;
    pid: number;
    port: number;
    clientId: string;
    startedAt: string;
    status: any;
    windows: number;
    error: string;
    owned: boolean;
};
export declare function isPetRunning(): boolean;
export declare function resolvePetElectron(): {
    executable: string;
    args: string[];
};
export declare function petRequestUserId(req: any): string;
export declare function authorizePetRuntimeRequest(req: any): boolean;
export declare function launchPet(port: number, binding?: Binding): Promise<any>;
export declare function stopPet(): Promise<{
    success: boolean;
    status: any;
    error: string;
} | {
    success: boolean;
    error: string;
    status?: undefined;
} | {
    success: boolean;
    status: string;
    error?: undefined;
}>;
export declare function savedPetBinding(): Binding | null;
export declare function stopPetForShutdown(): Promise<void>;
export declare function stopOwnedPetForDesktop(): Promise<{
    success: boolean;
    status: any;
    error: string;
} | {
    success: boolean;
    error: string;
    status?: undefined;
} | {
    success: boolean;
    status: string;
    error?: undefined;
} | {
    success: boolean;
    external: boolean;
}>;
export {};
