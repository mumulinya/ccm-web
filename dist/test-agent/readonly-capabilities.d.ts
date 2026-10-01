import { type SelectedRoleSkill } from "../skills/role-skills";
export interface TestAgentReadonlyMcpCapability {
    name: string;
    canonicalName: string;
    server: string;
    description: string;
    inputSchema: Record<string, any>;
    scope: "test-agent";
    mutability: "read_only";
    readOnly: true;
    schemaChecksum: string;
    signature: string;
}
export interface TestAgentReadonlySkillCapability {
    name: string;
    description: string;
    scope: "test-agent";
    readOnly: true;
    source: "builtin" | "registry";
    contentHash: string;
    summaryChecksum: string;
    truncated: boolean;
    signature: string;
}
export interface TestAgentReadonlyCapabilityManifest {
    schema: "ccm-test-agent-readonly-capability-manifest-v1";
    targetName: string;
    workDir: string;
    issuedAt: string;
    expiresAt: string;
    mcp: TestAgentReadonlyMcpCapability[];
    skills: TestAgentReadonlySkillCapability[];
    mcpCount: number;
    skillCount: number;
    checksum: string;
    signature: string;
    contentStored: false;
}
export interface TestAgentReadonlyCapabilityBuildOptions {
    targetName?: string;
    workDir?: string;
    taskText?: string;
    selectedSkillNames?: string[];
    mcpTools?: any[];
    allowedMcpServers?: string[];
    scope?: string;
    generation?: number;
    ttlMs?: number;
    skillSummaryMaxChars?: number;
    skillCatalogBudgetChars?: number;
}
export interface TestAgentReadonlyCapabilityBuildResult {
    manifest: TestAgentReadonlyCapabilityManifest;
    /** Ephemeral planner text; never put this field in durable records. */
    prompt: string;
    selectedSkills: SelectedRoleSkill[];
    rejectedSkills: Array<{
        name: string;
        reason: string;
    }>;
    rejectedMcp: Array<{
        name: string;
        reason: string;
    }>;
}
export declare function buildTestAgentReadonlyCapabilityManifest(options?: TestAgentReadonlyCapabilityBuildOptions): TestAgentReadonlyCapabilityBuildResult;
export declare function verifyTestAgentReadonlyCapabilityManifest(manifest: any): {
    valid: boolean;
    reason: string;
    checksum?: undefined;
    expiresAt?: undefined;
    mcpCount?: undefined;
    skillCount?: undefined;
} | {
    valid: boolean;
    checksum: string;
    expiresAt: any;
    mcpCount: any;
    skillCount: any;
    reason?: undefined;
};
export declare function runTestAgentReadonlyCapabilitySelfTest(): {
    pass: boolean;
    validation: {
        valid: boolean;
        reason: string;
        checksum?: undefined;
        expiresAt?: undefined;
        mcpCount?: undefined;
        skillCount?: undefined;
    } | {
        valid: boolean;
        checksum: string;
        expiresAt: any;
        mcpCount: any;
        skillCount: any;
        reason?: undefined;
    };
    manifestChecksum: string;
};
