export declare function createPetActivityRuntime(deps: any): {
    AGENT_RUNNER_DIR: any;
    AGENT_RUNNER_REQUESTS_DIR: any;
    AGENT_RUNNER_RESULTS_DIR: any;
    MUSIC_PET_AGENT_NAME: string;
    bindProjectRunAgentSession: (projectRun: any, projectName: string, agentType: string) => any;
    broadcastPetConfigChanged: () => void;
    broadcastPetNavigation: (agent: string, target: any) => {
        type: string;
        agent: string;
        target: any;
        url: string;
        timestamp: string;
    };
    broadcastPetSpeech: (agent: string, payload?: any) => void;
    getAgentRunActivityDuration: (timeoutMs?: number) => number;
    getAgentState: (name: string) => any;
    getMusicPetAgent: () => {
        name: string;
        displayName: string;
        petLabel: string;
        virtual: boolean;
        type: string;
        agent: string;
        running: boolean;
        state: string;
        lastActivity: string;
        stateDetail: string;
        track: any;
    };
    getPetAgents: () => ({
        name: string;
        displayName: string;
        petLabel: string;
        virtual: boolean;
        type: string;
        agent: string;
        running: boolean;
        state: string;
        lastActivity: string;
        stateDetail: string;
        track: any;
    } | {
        name: string;
        displayName: string;
        petLabel: string;
        virtual: boolean;
        type: string;
        agent: string;
        running: boolean;
        state: any;
        lastActivity: string;
        stateDetail: any;
        actor: any;
        actorKind: any;
        runtime: any;
    })[];
    getPetNavigationTarget: (agent: string) => any;
    getProjectPetActionStrategy: () => {
        idleCycleSeconds: number;
        idle: {
            state: string;
            seconds: number;
            detail: string;
            order: number;
        }[];
        active: {
            state: string;
            seconds: number;
            detail: string;
            trigger: string;
            order: number;
        }[];
    };
    petStatusClients: Set<any>;
    petWorkspaceClients: Set<any>;
    setAgentActivity: (name: string, state: string, detail?: string, workspaceTarget?: any, durationMs?: number, metadata?: any) => void;
    setMusicPetState: (state: string, detail?: string, track?: any) => void;
    writeSse: (res: any, data: any) => void;
};
