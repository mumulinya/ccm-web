export declare const CCM_BUSINESS_REQUIREMENT_CONTRACT_SCHEMA: "ccm-business-requirement-contract-v1";
export type CcmBusinessRequirementContractV1 = {
    schema: typeof CCM_BUSINESS_REQUIREMENT_CONTRACT_SCHEMA;
    requirementId: string;
    revision: number;
    checksum: string;
    title: string;
    businessGoal: string;
    background: string;
    acceptanceCriteria: Array<{
        id: string;
        description: string;
    }>;
    constraints: string[];
    exclusions: string[];
    targetProjects: string[];
    sourceMessageIds: string[];
    contentStored: false;
};
export declare function businessRequirementChecksum(contract: any): string;
export declare function normalizeBusinessRequirementContract(input: any, options?: {
    requirementId?: string;
    revision?: number;
    title?: string;
    sourceMessageIds?: string[];
    targetProjects?: string[];
}): CcmBusinessRequirementContractV1 | null;
export declare function validateBusinessRequirementContract(contract: any): {
    valid: boolean;
    issues: string[];
};
export declare function acceptanceIdsForDescriptions(contract: CcmBusinessRequirementContractV1 | null | undefined, descriptions: any): string[];
export declare function runBusinessRequirementContractSelfTest(): {
    normalized: boolean;
    checksum: boolean;
    acceptanceStable: boolean;
};
