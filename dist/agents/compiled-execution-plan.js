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
exports.CCM_COMPILED_EXECUTION_PLAN_SCHEMA = void 0;
exports.compileExecutionPlan = compileExecutionPlan;
const crypto = __importStar(require("crypto"));
exports.CCM_COMPILED_EXECUTION_PLAN_SCHEMA = "ccm-compiled-execution-plan-v1";
function stable(value) {
    if (Array.isArray(value))
        return value.map(stable);
    if (!value || typeof value !== "object")
        return value;
    return Object.keys(value).sort().reduce((out, key) => { out[key] = stable(value[key]); return out; }, {});
}
function hash(value) { return crypto.createHash("sha256").update(JSON.stringify(stable(value))).digest("hex"); }
function text(value, max = 1_000) { return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max); }
function list(value, max = 100) { return [...new Set((Array.isArray(value) ? value : value ? [value] : []).map(item => text(item, 600)).filter(Boolean))].slice(0, max); }
function safePath(value) {
    const normalized = text(value, 600).replace(/\\/g, "/").replace(/^\.\//, "");
    if (!normalized || normalized.startsWith("/") || /^[A-Za-z]:/.test(normalized) || normalized.split("/").includes(".."))
        return "";
    return normalized;
}
function stepFiles(plan, step) {
    const explicit = list(step?.files || step?.filePaths || step?.allowedPaths).map(safePath).filter(Boolean);
    if (explicit.length)
        return explicit;
    const projects = new Set(list(step?.projects || step?.project));
    return (Array.isArray(plan?.files) ? plan.files : [])
        .filter((row) => !projects.size || !row?.project || projects.has(String(row.project)))
        .map((row) => safePath(row?.path)).filter(Boolean);
}
function stepEvidence(plan, step, paths) {
    const explicit = list(step?.sourceEvidenceIds || step?.evidenceRefs || step?.evidenceIds);
    if (explicit.length)
        return explicit;
    return [...new Set((Array.isArray(plan?.files) ? plan.files : [])
            .filter((row) => paths.includes(safePath(row?.path)))
            .flatMap((row) => list(row?.sourceEvidenceIds || row?.evidenceRefs)))];
}
function hasCycle(items) {
    const byId = new Map(items.map(item => [item.id, item]));
    const visiting = new Set();
    const visited = new Set();
    const visit = (id) => {
        if (visiting.has(id))
            return true;
        if (visited.has(id))
            return false;
        visiting.add(id);
        for (const dependency of byId.get(id)?.dependencies || [])
            if (byId.has(dependency) && visit(dependency))
                return true;
        visiting.delete(id);
        visited.add(id);
        return false;
    };
    return items.some(item => visit(item.id));
}
/** Deterministically compiles an already reviewed plan; it never invents scope or business goals. */
function compileExecutionPlan(input) {
    const plan = input.plan || {};
    const allowed = new Set(list(input.allowedProjects));
    const steps = Array.isArray(plan.steps) ? plan.steps : [];
    const issues = [];
    const stepProjects = new Map();
    steps.forEach((step, index) => {
        const baseId = text(step?.id || `step-${index + 1}`, 120);
        stepProjects.set(baseId, list(step?.projects || step?.project));
    });
    const compiledId = (baseId, projectId) => {
        const projects = stepProjects.get(baseId) || [];
        return projects.length > 1 ? `${baseId}:${projectId}` : baseId;
    };
    const compiledDependencies = (step, projectId) => list(step?.dependsOn || step?.depends_on).flatMap(dependencyId => {
        const dependencyProjects = stepProjects.get(dependencyId) || [];
        if (dependencyProjects.includes(projectId))
            return [compiledId(dependencyId, projectId)];
        return dependencyProjects.map(dependencyProjectId => compiledId(dependencyId, dependencyProjectId));
    });
    const workItems = steps.flatMap((step, index) => {
        const baseId = text(step?.id || `step-${index + 1}`, 120);
        const projects = list(step?.projects || step?.project);
        if (!projects.length)
            issues.push(`${baseId}:project_missing`);
        return projects.map(projectId => {
            const id = compiledId(baseId, projectId);
            if (allowed.size && !allowed.has(projectId))
                issues.push(`${id}:project_unauthorized:${projectId}`);
            const allowedPaths = stepFiles(plan, step);
            const evidenceRefs = stepEvidence(plan, step, allowedPaths);
            const acceptanceCriterionIds = list(step?.acceptanceCriterionIds || step?.acceptance_criterion_ids);
            const configuredCommands = (Array.isArray(step?.verification) ? step.verification : Array.isArray(plan?.verification) ? plan.verification : [])
                .map((row) => text(row?.command, 600)).filter(Boolean);
            const discoveredCommands = (input.verificationCommands || []).filter(row => !row.projectId || row.projectId === projectId).map(row => text(row.command, 600)).filter(Boolean);
            if (!text(step?.objective || step?.title, 2_000))
                issues.push(`${id}:objective_missing`);
            if (!acceptanceCriterionIds.length)
                issues.push(`${id}:acceptance_mapping_missing`);
            if (input.evidencePolicy.perFileEvidenceRequired && allowedPaths.length && !evidenceRefs.length)
                issues.push(`${id}:evidence_missing`);
            if (input.evidencePolicy.verificationEvidenceRequired && !configuredCommands.length && !discoveredCommands.length)
                issues.push(`${id}:verification_missing`);
            return {
                id,
                projectId,
                objective: text(step?.objective || step?.title, 2_000),
                dependencies: [...new Set(compiledDependencies(step, projectId))],
                allowedPaths,
                evidenceRefs,
                acceptanceCriterionIds,
                verificationCommands: [...new Set([...configuredCommands, ...discoveredCommands])],
            };
        });
    });
    const ids = new Set(workItems.map(item => item.id));
    if (ids.size !== workItems.length)
        issues.push("work_item_id_duplicate");
    for (const item of workItems)
        for (const dependency of item.dependencies)
            if (!ids.has(dependency))
                issues.push(`${item.id}:dependency_missing:${dependency}`);
    if (hasCycle(workItems))
        issues.push("dependency_cycle");
    if (!workItems.length)
        issues.push("work_items_empty");
    const strictFailure = input.evidencePolicy.level === "strict" && issues.some(issue => /project_|evidence_|verification_|acceptance_|dependency_/.test(issue));
    const verdict = !issues.length ? "ready" : strictFailure ? "blocked" : "repair_required";
    const core = {
        schema: exports.CCM_COMPILED_EXECUTION_PLAN_SCHEMA,
        requirementChecksum: text(plan?.requirementBinding?.checksum || plan?.businessRequirement?.checksum, 160),
        reviewedPlanChecksum: text(plan?.checksum, 160),
        evidencePolicyChecksum: hash(input.evidencePolicy),
        workItems,
        verdict,
        contentStored: false,
    };
    return { ...core, dispatchChecksum: hash(core), issues: [...new Set(issues)] };
}
//# sourceMappingURL=compiled-execution-plan.js.map