"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestRecoverableProjectSourceInquiry = requestRecoverableProjectSourceInquiry;
exports.requestRecoverableGroupSourceInquiry = requestRecoverableGroupSourceInquiry;
const source_inquiry_contract_1 = require("../agents/source-inquiry-contract");
const group_source_inquiry_1 = require("../modules/collaboration/group-source-inquiry");
const project_source_inquiry_1 = require("../modules/projects/project-source-inquiry");
function uniqueText(values, max = 12, itemMax = 500) {
    return [...new Set(values.map(value => String(value || "").replace(/[\0\r\n\t]+/g, " ").trim().slice(0, itemMax)).filter(Boolean))].slice(0, max);
}
function uniqueEvidence(values) {
    return [...new Map(values.filter(item => item?.evidenceId && item?.project && item?.path && item?.checksum).map(item => [item.evidenceId, item])).values()];
}
function projectEvidence(result) {
    return result.evidence.files.map(file => ({
        evidenceId: file.evidenceId,
        project: result.evidence.project,
        path: file.path,
        checksum: file.checksum,
        from: 1,
        to: 1,
        source: "source_read",
        contentStored: false,
    }));
}
function mergeProjectInquiry(first, supplement) {
    const final = supplement || first;
    const evidence = uniqueEvidence([...projectEvidence(first), ...(supplement ? projectEvidence(supplement) : [])]);
    const project = final.evidence.project;
    const finalProjectReceipt = final.receipt.projectReceipts.find(item => item.project === project);
    const findings = uniqueText([
        ...first.receipt.projectReceipts.flatMap(item => item.findings || []),
        ...(supplement ? supplement.receipt.projectReceipts.flatMap(item => item.findings || []) : []),
    ], 12, 1200);
    const projectReceipt = (0, source_inquiry_contract_1.buildSourceInquiryProjectReceipt)({
        project,
        projectSessionId: finalProjectReceipt?.projectSessionId || first.receipt.projectReceipts[0]?.projectSessionId || "source-inquiry",
        readDepth: supplement ? "broad" : (finalProjectReceipt?.readDepth || "focused"),
        evidenceIds: evidence.map(item => item.evidenceId),
        paths: evidence.map(item => item.path),
        findings,
        sufficient: final.receipt.sufficient === true,
        repoStateChecksum: finalProjectReceipt?.repoStateChecksum || first.receipt.projectReceipts[0]?.repoStateChecksum || final.evidence.manifestChecksum,
    });
    const receipt = (0, source_inquiry_contract_1.buildSourceInquiryReceipt)({
        requestScope: final.receipt.requestScope,
        accessRoute: final.receipt.accessRoute,
        exactSessionId: final.receipt.exactSessionId,
        scope: final.receipt.scope,
        scopeId: final.receipt.scopeId,
        generation: final.receipt.generation,
        targetProjects: [project],
        projectReceipts: [projectReceipt],
        sufficient: final.receipt.sufficient === true,
        reason: final.receipt.reason,
    });
    const missing = uniqueText([
        ...first.missingEvidence.map(item => item.summary),
        ...(supplement ? supplement.missingEvidence.map(item => item.summary) : []),
    ]);
    return {
        answer: String(final.answer || first.answer || receipt.reason).trim(),
        receipt,
        planningEvidenceEntries: evidence,
        missingEvidenceSummaries: receipt.sufficient ? [] : missing,
        needsUserInput: final.needsUserInput === true,
        automaticSupplementAttempts: supplement ? 1 : 0,
        cacheStatus: final.cacheStatus,
        contentStored: false,
    };
}
async function requestRecoverableProjectSourceInquiry(input) {
    const first = await (0, project_source_inquiry_1.requestProjectSourceInquiry)(input);
    if (first.receipt.sufficient || input.automaticSupplement === false || input.readDepth === "broad" || first.needsUserInput) {
        return mergeProjectInquiry(first);
    }
    const supplement = await (0, project_source_inquiry_1.requestProjectSourceInquiry)({ ...input, readDepth: "broad" });
    return mergeProjectInquiry(first, supplement);
}
function missingProjects(receipt) {
    return receipt.targetProjects.filter(project => !receipt.projectReceipts.some(item => item.project === project && item.sufficient));
}
function mergeGroupInquiry(first, supplement) {
    const evidence = uniqueEvidence([
        ...(Array.isArray(first?.planningEvidenceEntries) ? first.planningEvidenceEntries : []),
        ...(Array.isArray(supplement?.planningEvidenceEntries) ? supplement.planningEvidenceEntries : []),
    ]);
    const targetProjects = uniqueText(first.receipt.targetProjects, 20, 160);
    const byProject = new Map();
    for (const item of evidence)
        byProject.set(item.project, [...(byProject.get(item.project) || []), item]);
    const finalReceipt = supplement?.receipt || first.receipt;
    const projectReceipts = targetProjects.map(project => {
        const rows = byProject.get(project) || [];
        const prior = finalReceipt.projectReceipts.find((item) => item.project === project)
            || first.receipt.projectReceipts.find((item) => item.project === project);
        return (0, source_inquiry_contract_1.buildSourceInquiryProjectReceipt)({
            project,
            projectSessionId: prior?.projectSessionId || `group-source:${project}`,
            readDepth: supplement ? "broad" : (prior?.readDepth || "focused"),
            evidenceIds: rows.map(item => item.evidenceId),
            paths: rows.map(item => item.path),
            findings: prior?.findings || [],
            sufficient: rows.length > 0,
            repoStateChecksum: prior?.repoStateChecksum || "",
        });
    });
    const sufficient = targetProjects.length > 0 && targetProjects.every(project => projectReceipts.some(item => item.project === project && item.sufficient));
    const receipt = (0, source_inquiry_contract_1.buildSourceInquiryReceipt)({
        requestScope: first.receipt.requestScope,
        accessRoute: first.receipt.accessRoute,
        exactSessionId: first.receipt.exactSessionId,
        scope: first.receipt.scope,
        scopeId: first.receipt.scopeId,
        generation: first.receipt.generation,
        targetProjects,
        projectReceipts,
        sufficient,
        reason: sufficient ? "群聊主 Agent 已取得目标项目源码证据" : "部分成员项目仍缺少可验证源码证据",
    });
    const unanswered = missingProjects(receipt);
    const answers = uniqueText([first.answer, supplement?.answer], 2, 8_000);
    return {
        answer: answers.join("\n\n"),
        receipt,
        planningEvidenceEntries: evidence,
        missingEvidenceSummaries: unanswered.map(project => `项目 ${project} 尚未取得可验证源码证据`),
        needsUserInput: false,
        automaticSupplementAttempts: supplement ? 1 : 0,
        contentStored: false,
    };
}
async function requestRecoverableGroupSourceInquiry(input) {
    const first = await (0, group_source_inquiry_1.requestGroupSourceInquiry)(input);
    const missing = missingProjects(first.receipt);
    if (!missing.length || input.automaticSupplement === false || input.readDepth === "broad")
        return mergeGroupInquiry(first);
    const supplement = await (0, group_source_inquiry_1.requestGroupSourceInquiry)({ ...input, projects: missing, readDepth: "broad" });
    return mergeGroupInquiry(first, supplement);
}
//# sourceMappingURL=delegated-inquiry-recovery.js.map