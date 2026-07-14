export type PetGenerationStatus = "queued" | "preparing" | "generating" | "validating" | "installing" | "completed" | "failed" | "cancelled";
export interface PetGenerationJob {
    id: string;
    petId: string;
    name: string;
    description: string;
    style: string;
    targetAgent: "global-agent" | "music-agent";
    status: PetGenerationStatus;
    stageLabel: string;
    progress: number;
    referencePath: string;
    runDir: string;
    promptPath: string;
    logPath: string;
    pid?: number;
    error?: string;
    createdAt: string;
    updatedAt: string;
    completedAt?: string;
    manifest?: any;
    installed?: any;
}
export declare function setPetGenerationConfigChangedNotifier(notifier: (() => void) | null): void;
export declare function setPetGenerationLifecycleNotifier(notifier: ((job: PetGenerationJob) => void) | null): void;
export declare function createPetGenerationJob(input: {
    referencePath: string;
    name?: string;
    description?: string;
    style?: string;
    targetAgent?: string;
}): PetGenerationJob;
export declare function listPetGenerationJobs(): PetGenerationJob[];
export declare function toPublicPetGenerationJob(job: PetGenerationJob | null): {
    id: string;
    petId: string;
    name: string;
    description: string;
    style: string;
    targetAgent: "global-agent" | "music-agent";
    status: PetGenerationStatus;
    stageLabel: string;
    progress: number;
    error: string;
    createdAt: string;
    updatedAt: string;
    completedAt: string;
    installed: {
        id: any;
        name: any;
        spriteVersionNumber: any;
        spritesheetPath: any;
    };
};
export declare function getPetGenerationJob(id: string): PetGenerationJob;
export declare function cancelPetGenerationJob(id: string): PetGenerationJob;
export declare function retryPetGenerationJob(id: string): PetGenerationJob;
export declare function recoverPetGenerationJobs(): {
    recovered: number;
};
export declare function runPetGenerationContractSelfTest(): {
    schema: string;
    pass: boolean;
    checks: {
        only_codex_v2_dimensions: boolean;
        rejects_v1_manifest: boolean;
        rejects_intermediate_atlas_dimensions: boolean;
        accepts_valid_v2_package: boolean;
        hatch_pet_skill_available: boolean;
        generated_skin_targets_system_agents: boolean;
        reference_path_is_workspace_scoped: boolean;
        all_terminal_states_supported: boolean;
    };
};
