"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.acceptanceDisplayText = acceptanceDisplayText;
exports.acceptanceUserProjection = acceptanceUserProjection;
/** User projection is an allowlist. Never expose command bodies, output or arbitrary metadata. */
function acceptanceDisplayText(value) {
    return String(value || "").replace(/```[\s\S]*?(?:```|$)/g, "[技术内容已折叠]")
        .replace(/\b(?:cookie|set-cookie|authorization)\s*[:=][^\r\n]*/gi, "[认证信息已隐藏]")
        .replace(/\b(?:api[_-]?key|token|password|secret)\s*[:=]\s*[^\s,;]+/gi, "[敏感信息已隐藏]")
        .replace(/https?:\/\/[^\s<>"']+/gi, "[地址已隐藏]")
        .replace(/[A-Za-z]:[\\/][^\s,;]+/g, "[本地路径已隐藏]")
        .slice(0, 600);
}
function acceptanceUserProjection(result) {
    return {
        status: result.status, canComplete: result.canComplete === true,
        criteria: (result.criteria || []).map((row) => ({
            criterionId: row.criterionId, description: acceptanceDisplayText(row.description), expected: acceptanceDisplayText(row.expected),
            status: row.status, freshness: row.freshness, verifier: row.verifier, reason: acceptanceDisplayText(row.reason),
            evidenceIds: row.evidenceIds || [], verificationIds: row.verificationIds || [],
        })),
        blockedReasons: (result.issues || []).map((issue) => {
            const code = issue.split(":")[0];
            return { criterion_not_verified: "仍有必需验收标准未通过", acceptance_ledger_missing: "缺少执行证据账本",
                generation_mismatch: "任务执行版本与验收合同不一致", contract_binding_mismatch: "验收合同归属不一致",
                scope_audit_failed: "检测到未授权的文件或测试夹具变更", scope_audit_blocked: "无法完成工作区范围审计",
                scope_audit_snapshot_only: "仅有文件快照，缺少合同要求的 Git 审计", execution_missing: "工作项缺少执行记录",
            }[code] || "合同或证据需要核对";
        }).filter((reason, index, rows) => rows.indexOf(reason) === index),
    };
}
//# sourceMappingURL=acceptance-user-projection.js.map