/**
 * 全局任务交付证据契约：生产端（buildDeliverySummary）在组装交付摘要时，
 * 把已经结构化的门禁结论压成一份带版本号的契约；消费端（global-mission 门禁）
 * 优先消费契约字段做判定，只有旧数据（无契约）才回退到文本正则启发式。
 * 契约字段全部为布尔/计数，禁止依赖自由文本匹配。
 */
export declare const MISSION_EVIDENCE_CONTRACT_VERSION = 1;
/** 与 global-mission 门禁共用的"实质性检查项"集合：命中其一才算有真实交付证据。 */
export declare const SUBSTANTIVE_GATE_CHECK_IDS: Set<string>;
export type MissionEvidenceContract = {
    version: number;
    generated_at: string;
    acceptance_gate_passed: boolean;
    gate_check_count: number;
    gate_failed_count: number;
    substantive_gate_check_passed: boolean;
    verification_executed_count: number;
    verification_failed_count: number;
    external_runner_verification_count: number;
    verification_source_gate_passed: boolean;
    verification_required_gate_passed: boolean;
    independent_review_required: boolean;
    independent_review_gate_passed: boolean;
    independent_review_evidence_count: number;
    actual_file_change_count: number;
};
/** 由交付摘要的结构化字段生成契约，不读取任何自由文本。 */
export declare function buildMissionEvidenceContract(summary: any): MissionEvidenceContract;
/** 读取任务交付摘要上的契约；缺失或版本不兼容时返回 null（消费端回退旧文本路径）。 */
export declare function readMissionEvidenceContract(task: any): MissionEvidenceContract | null;
/** 契约版"强验收证据"判定：与旧文本路径同构，但只看结构化字段。 */
export declare function missionEvidenceContractStrong(contract: MissionEvidenceContract): boolean;
/** 契约版子任务交付门禁：对应旧路径 globalMissionChildGatePassedFromEvidence 的结构化部分。 */
export declare function missionEvidenceContractGatePassed(contract: MissionEvidenceContract, requirements: {
    requiresCodeChanges: boolean;
    requiresVerification: boolean;
}): boolean;
export declare function runMissionEvidenceContractSelfTest(): {
    pass: boolean;
    checks: {
        contractStrongPasses: boolean;
        contractGatePasses: boolean;
        contractRejectsMisleadingText: boolean;
        contractRejectsFailedVerification: boolean;
        contractRoundTripsThroughRead: boolean;
        contractIgnoresUnknownVersion: boolean;
        contractIgnoresMalformedPayload: boolean;
    };
};
