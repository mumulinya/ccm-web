declare function isPetRunning(): boolean;
declare function launchPet(port: number): {
    success: boolean;
    pid: number;
    error?: undefined;
} | {
    success: boolean;
    error: any;
    pid?: undefined;
};
declare function stopPet(): {
    success: boolean;
    error: string;
} | {
    success: boolean;
    error?: undefined;
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
