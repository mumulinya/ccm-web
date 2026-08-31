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
exports.CCM_BUSINESS_REQUIREMENT_CONTRACT_SCHEMA = void 0;
exports.businessRequirementChecksum = businessRequirementChecksum;
exports.normalizeBusinessRequirementContract = normalizeBusinessRequirementContract;
exports.validateBusinessRequirementContract = validateBusinessRequirementContract;
exports.acceptanceIdsForDescriptions = acceptanceIdsForDescriptions;
exports.runBusinessRequirementContractSelfTest = runBusinessRequirementContractSelfTest;
const crypto = __importStar(require("crypto"));
exports.CCM_BUSINESS_REQUIREMENT_CONTRACT_SCHEMA = "ccm-business-requirement-contract-v1";
function text(value, max = 2400) {
    return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}
function list(value, max = 40, itemMax = 800) {
    const source = Array.isArray(value) ? value : value === undefined || value === null ? [] : [value];
    return [...new Set(source.map(item => text(item, itemMax)).filter(Boolean))].slice(0, max);
}
function stable(value) {
    if (Array.isArray(value))
        return value.map(stable);
    if (!value || typeof value !== "object")
        return value;
    return Object.keys(value).sort().reduce((out, key) => {
        out[key] = stable(value[key]);
        return out;
    }, {});
}
function hash(value) {
    return crypto.createHash("sha256").update(JSON.stringify(stable(value))).digest("hex");
}
function businessRequirementChecksum(contract) {
    const { checksum: _ignored, ...core } = contract || {};
    return hash(core);
}
function acceptanceRows(source) {
    const direct = Array.isArray(source?.acceptanceCriteria)
        ? source.acceptanceCriteria
        : Array.isArray(source?.acceptance_criteria)
            ? source.acceptance_criteria
            : Array.isArray(source?.expectedResults)
                ? source.expectedResults
                : [];
    const fromSteps = (Array.isArray(source?.steps) ? source.steps : [])
        .flatMap((step) => Array.isArray(step?.acceptance) ? step.acceptance : Array.isArray(step?.acceptanceCriteria) ? step.acceptanceCriteria : []);
    // The business requirement is the authority.  Step-level acceptance is only
    // a fallback for legacy/model drafts that did not provide a requirement
    // contract; otherwise it would silently create a second set of business
    // criteria with different ids and make dispatch verification impossible.
    const rows = direct.length ? direct : fromSteps;
    const seen = new Set();
    return rows.map((row, index) => {
        const description = text(typeof row === "string" ? row : row?.description || row?.title || row?.label || row?.criterion, 800);
        if (!description)
            return null;
        const key = description.toLowerCase();
        if (seen.has(key))
            return null;
        seen.add(key);
        const id = text(typeof row === "object" ? row?.id : "", 100)
            .replace(/[^a-zA-Z0-9._-]+/g, "-") || `ac_${hash([description, index]).slice(0, 16)}`;
        return { id, description };
    }).filter(Boolean).slice(0, 60);
}
function normalizeBusinessRequirementContract(input, options = {}) {
    const source = input?.businessRequirement && typeof input.businessRequirement === "object"
        ? input.businessRequirement
        : input?.requirementContract && typeof input.requirementContract === "object"
            ? input.requirementContract
            : input;
    if (!source || typeof source !== "object")
        return null;
    const businessGoal = text(source.businessGoal || source.business_goal || source.goal || source.summary || source.objective || source.overview, 2400);
    if (!businessGoal)
        return null;
    const acceptanceCriteria = acceptanceRows(source);
    const requirementId = text(source.requirementId || source.requirement_id || options.requirementId, 240)
        || `req_${hash([businessGoal, options.sourceMessageIds || source.sourceMessageIds || []]).slice(0, 24)}`;
    const contract = {
        schema: exports.CCM_BUSINESS_REQUIREMENT_CONTRACT_SCHEMA,
        requirementId,
        revision: Math.max(1, Number(options.revision || source.revision || 1)),
        checksum: "",
        title: text(source.title || options.title, 200) || "业务需求",
        businessGoal,
        background: text(source.background || source.context || source.why || source.overview || businessGoal, 2400),
        acceptanceCriteria,
        constraints: list(source.constraints || source.rules, 40, 800),
        exclusions: list(source.exclusions || source.outOfScope || source.out_of_scope || source.boundaries, 40, 800),
        targetProjects: list(source.targetProjects || source.target_projects || source.projects || options.targetProjects, 40, 180),
        sourceMessageIds: list(source.sourceMessageIds || source.source_message_ids || options.sourceMessageIds, 80, 240),
        contentStored: false,
    };
    contract.checksum = businessRequirementChecksum(contract);
    return contract;
}
function validateBusinessRequirementContract(contract) {
    const issues = [];
    if (!contract || contract.schema !== exports.CCM_BUSINESS_REQUIREMENT_CONTRACT_SCHEMA)
        issues.push("requirement_schema_invalid");
    if (!text(contract?.requirementId, 240))
        issues.push("requirement_id_missing");
    if (!text(contract?.businessGoal, 2400))
        issues.push("business_goal_missing");
    if (!Array.isArray(contract?.acceptanceCriteria) || !contract.acceptanceCriteria.length)
        issues.push("acceptance_criteria_missing");
    if (!text(contract?.checksum, 120) || businessRequirementChecksum(contract) !== contract.checksum)
        issues.push("requirement_checksum_invalid");
    return { valid: issues.length === 0, issues };
}
function acceptanceIdsForDescriptions(contract, descriptions) {
    if (!contract)
        return [];
    const requested = new Set(list(descriptions, 40, 800).map(item => item.toLowerCase()));
    return contract.acceptanceCriteria.filter(item => requested.has(item.description.toLowerCase())).map(item => item.id);
}
function runBusinessRequirementContractSelfTest() {
    const contract = normalizeBusinessRequirementContract({
        title: "导出订单",
        goal: "用户可以导出当前筛选后的订单",
        steps: [{ acceptance: ["导出文件只包含筛选结果"] }],
        projects: ["web"],
    }, { requirementId: "req-test" });
    return {
        normalized: contract?.schema === exports.CCM_BUSINESS_REQUIREMENT_CONTRACT_SCHEMA,
        checksum: validateBusinessRequirementContract(contract).valid,
        acceptanceStable: acceptanceIdsForDescriptions(contract, ["导出文件只包含筛选结果"]).length === 1,
    };
}
//# sourceMappingURL=business-requirement-contract.js.map