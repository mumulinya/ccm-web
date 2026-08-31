"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestGroupSourceInquiry = requestGroupSourceInquiry;
const crypto = __importStar(require("crypto"));
const group_orchestrator_routing_1 = require("./group-orchestrator-routing");
const source_inquiry_contract_1 = require("../../agents/source-inquiry-contract");
async function requestGroupSourceInquiry(input) {
    const group = (0, group_orchestrator_routing_1.normalizeGroupOrchestrator)(input.group);
    const memberProjects = (0, group_orchestrator_routing_1.getRoutableMembers)(group).map((member) => String(member?.project || "")).filter(Boolean);
    const requested = (input.projects || []).map(String).filter(Boolean);
    const authorizedProjectIds = requested.length
        ? memberProjects.filter(project => requested.includes(project))
        : memberProjects;
    if (!authorizedProjectIds.length)
        throw new Error("GROUP_SOURCE_INQUIRY_HAS_NO_AUTHORIZED_PROJECTS");
    if (requested.some(project => !memberProjects.includes(project)))
        throw new Error("GROUP_SOURCE_INQUIRY_PROJECT_OUT_OF_SCOPE");
    const readDepth = input.readDepth === "broad" ? "broad" : "focused";
    const result = await (0, group_orchestrator_routing_1.runGroupOrchestrator)({
        group,
        message: String(input.question || "").trim(),
        source: "global-source-inquiry",
        groupSessionId: "",
        sessionId: String(input.exactSessionId || ""),
        delegatedExactSessionId: String(input.exactSessionId || ""),
        authorizedProjectIds,
        sourceGeneration: Math.max(0, Math.floor(Number(input.generation || 0))),
        workflowDecision: {
            actionRequired: false,
            requiresCodeChanges: false,
            readAction: "inspect_source",
            sourceReadDepth: readDepth,
            directReplyReady: false,
            targetRefs: authorizedProjectIds.map(project => ({ type: "project", id: project })),
        },
        extraInstructions: "This is a delegated read-only source inquiry from the global main Agent. Inspect only the authorized relevant projects, do not dispatch or create a task, and return a concise evidence-grounded answer without raw source text.",
        signal: input.signal,
    });
    const rawReceipt = result?.sourceInquiryReceipt;
    if (!rawReceipt || rawReceipt.contentStored !== false)
        throw new Error("GROUP_SOURCE_INQUIRY_SAFE_RECEIPT_MISSING");
    const planningEvidenceEntries = (Array.isArray(rawReceipt.evidence) ? rawReceipt.evidence : [])
        .filter((item) => authorizedProjectIds.includes(String(item?.project || "")))
        .map((item) => ({
        evidenceId: String(item?.evidenceId || ""),
        project: String(item?.project || ""),
        path: String(item?.path || ""),
        checksum: String(item?.checksum || ""),
        from: Math.max(1, Number(item?.from || 1)),
        to: Math.max(1, Number(item?.to || item?.from || 1)),
        source: "source_read",
        contentStored: false,
    }))
        .filter((item) => item.evidenceId && item.project && item.path && item.checksum);
    const byProject = new Map();
    for (const item of planningEvidenceEntries)
        byProject.set(item.project, [...(byProject.get(item.project) || []), item]);
    const receipt = (0, source_inquiry_contract_1.buildSourceInquiryReceipt)({
        requestScope: "global",
        accessRoute: "global_project_delegation",
        exactSessionId: String(input.exactSessionId || ""),
        scope: "global",
        scopeId: "global",
        generation: Math.max(0, Math.floor(Number(input.generation || 0))),
        targetProjects: authorizedProjectIds,
        projectReceipts: authorizedProjectIds.map(project => {
            const evidence = byProject.get(project) || [];
            return {
                project,
                projectSessionId: `group-source:${group.id}:${project}`,
                readDepth,
                evidenceIds: evidence.map(item => item.evidenceId),
                paths: evidence.map(item => item.path),
                findings: [],
                sufficient: evidence.length > 0,
                repoStateChecksum: evidence.length
                    ? crypto.createHash("sha256").update(JSON.stringify(evidence.map(item => [item.path, item.checksum]).sort())).digest("hex")
                    : "",
            };
        }),
        sufficient: authorizedProjectIds.every(project => (byProject.get(project) || []).length > 0),
        reason: rawReceipt.sufficient === true ? "群聊主 Agent 已取得目标项目源码证据" : "群聊源码证据不足",
    });
    return { answer: String(result?.content || "").trim(), receipt, planningEvidenceEntries };
}
//# sourceMappingURL=group-source-inquiry.js.map