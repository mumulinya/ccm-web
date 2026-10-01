import { type CcmBusinessRequirementContractV1 } from "./business-requirement-contract";
import type { CcmEvidencePolicyV1 } from "./evidence-policy";
export declare const CCM_IMPLEMENTATION_PLAN_SCHEMA: "ccm-implementation-plan-v2";
export declare const CCM_IMPLEMENTATION_PLAN_PROMPT_VERSION = "2026-09-05.plan-v3";
export type CcmImplementationPlanV2 = {
    schema: typeof CCM_IMPLEMENTATION_PLAN_SCHEMA;
    planId?: string;
    title: string;
    context: string;
    goal: string;
    approach: string;
    planningReason?: string;
    businessRequirement: CcmBusinessRequirementContractV1;
    requirementBinding: {
        requirementId: string;
        revision: number;
        checksum: string;
    };
    scope: string[];
    files: Array<{
        project: string;
        path: string;
        reason: string;
        sourceEvidenceIds: string[];
    }>;
    steps: Array<{
        [key: string]: any;
        id: string;
        title: string;
        objective: string;
        projects: string[];
        dependsOn: string[];
        changeSummary?: string;
        affectedSymbols?: Array<{
            path: string;
            symbol?: string;
            ranges?: Array<{
                startLine: number;
                endLine: number;
            }>;
            evidenceIds: string[];
        }>;
        acceptanceCriterionIds: string[];
        acceptance: string[];
        files?: string[];
        sourceEvidenceIds?: string[];
        artifacts?: string[];
        allowedTools?: string[];
        forbiddenPaths?: string[];
        status?: string;
    }>;
    verification: Array<{
        command?: string;
        expected: string;
        acceptanceCriteria: string[];
        [key: string]: any;
    }>;
    risks: string[];
    exclusions: string[];
    openQuestions: string[];
    revision: number;
    checksum: string;
    promptVersion: string;
    outputLanguage: string;
    sourceManifestChecksum?: string;
    evidencePolicy?: CcmEvidencePolicyV1;
    contentStored: false;
    overview?: string;
    expectedResults?: string[];
    status?: string;
    createdAt?: string;
    updatedAt?: string;
    quality?: any;
};
export declare const IMPLEMENTATION_PLAN_PROMPTS: {
    readonly planning_exploration: `${string}

Explore before drafting. Keep the first pass narrow and cite only files actually read.`;
    readonly planning_draft: `${string}

Draft a complete ccm-implementation-plan-v2 object. Every implementation step must explain what changes, why it changes, which real file/symbol or evidence range is affected, how behavior changes, what it depends on, and how completion will be proven. Use changeSummary and affectedSymbols when the evidence supports them; never guess symbols or line ranges. Every step must identify its responsible projects, objective, acceptance criteria, and acceptance criterion IDs. Every file and verification command must have evidence. Avoid generic-only steps such as "modify related code", "\u5B8C\u5584\u529F\u80FD", or "\u8865\u5145\u6D4B\u8BD5". The server owns requirementBinding and checksums; never invent them.`;
    readonly planning_review: `${string}

Act as an independent reviewer. Reject invented paths, missing acceptance criteria, scope drift, and unverifiable claims.`;
    readonly planning_repair: `${string}

Repair only the reported plan defects. Make each affected step concrete with a real evidence-backed location, behavior change, and verification mapping. Preserve confirmed scope and increment the plan revision.`;
    readonly plan_to_dispatch: "Convert the confirmed ccm-implementation-plan-v2 into self-contained child-Agent work orders.\nPreserve the authoritative business goal. Give each child Agent only the steps assigned to its project. Copy titles, objectives, acceptance criterion IDs, and acceptance text without rewriting them. Add project/file scope, dependencies, permissions, forbidden scope, revision, and checksums.";
};
export declare const CCM_WORK_ORDER_PROMPT_CONTRACT: {
    readonly plan: "进入只读规划模式。只使用已读取的源码、配置和测试证据；明确目标、范围、排除项、依赖、风险和可观察验收标准。不得猜测路径、符号、成员、命令或完成状态。输出 ccm-implementation-plan-v3 结构，不承担权限判断。";
    readonly project: "执行自包含项目工作单。只修改允许路径，遵守禁止范围和依赖；每一步绑定验收标准并留下可复核证据。不得扩大项目范围、代替 TestAgent 验收或把推测写成事实。";
    readonly test: "以独立只读 TestAgent 验收。只检查工作单允许范围和实际变更，执行指定验证；每条标准返回 passed、failed 或 blocked，并附 Evidence ID、命令、退出码和风险。不得修改业务代码或依据开发者自报判定通过。";
    readonly rework: "依据失败验收证据生成增量返工单。沿用原 taskId 和 workItemId，仅递增 attempt，严格限制修复范围和重新验证命令；相同失败证据不得无限重复派发。";
};
export declare const IMPLEMENTATION_PLAN_LANGUAGE_CONTRACT = "Generate all user-visible plan content in the language used by the user. For Chinese conversations, use natural Simplified Chinese. Keep schema keys, tool names, identifiers, checksums, and status enums in English.";
export declare function implementationPlanChecksum(plan: any): string;
export declare function normalizeImplementationPlanV2(input: any, options?: {
    planId?: string;
    revision?: number;
    outputLanguage?: string;
    now?: string;
    requirementContract?: any;
    sourceMessageIds?: string[];
    targetProjects?: string[];
}): CcmImplementationPlanV2 | null;
export declare function reviseImplementationPlan(plan: any, patch: any, outputLanguage?: string): CcmImplementationPlanV2;
export declare function validateImplementationPlanV2(plan: any, options?: {
    allowedProjects?: string[];
}): {
    ok: boolean;
    issues: string[];
};
export declare function shouldRequireImplementationPlan(input: {
    projectCount?: number;
    independentModuleCount?: number;
    riskLevel?: string;
    needsEpicDecomposition?: boolean;
    requiresUserConfirmation?: boolean;
    impactScope?: string[];
    hasArchitectureOrPublicContractChange?: boolean;
    hasUnresolvedAmbiguity?: boolean;
}): boolean;
export declare function renderImplementationPlanMarkdown(plan: any, options?: {
    language?: string;
    includeTechnical?: boolean;
}): string;
export declare function runImplementationPlanSelfTest(): {
    pass: boolean;
    checks: {
        normalized: boolean;
        checksum: boolean;
        renderedChinese: boolean;
        promptEnglish: boolean;
        revision: boolean;
        requirementRevision: boolean;
        technicalRequirementStable: boolean;
        simpleSkips: boolean;
        crossProjectPlans: boolean;
    };
};
