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
exports.acceptanceHash = acceptanceHash;
exports.relativeAcceptancePath = relativeAcceptancePath;
exports.sealAcceptanceContract = sealAcceptanceContract;
exports.validateAcceptanceContract = validateAcceptanceContract;
exports.taskAcceptanceContract = taskAcceptanceContract;
exports.isAcceptanceProjectionTask = isAcceptanceProjectionTask;
const crypto_1 = require("crypto");
const path = __importStar(require("path"));
function acceptanceHash(value) {
    const stable = (v) => Array.isArray(v) ? v.map(stable) : v && typeof v === "object"
        ? Object.fromEntries(Object.keys(v).sort().map(k => [k, stable(v[k])])) : v;
    return (0, crypto_1.createHash)("sha256").update(JSON.stringify(stable(value))).digest("hex");
}
function relativeAcceptancePath(value) {
    return typeof value === "string" && !!value.trim() && !path.posix.isAbsolute(value) && !path.win32.isAbsolute(value)
        && !value.includes(":") && !value.includes("\0") && !value.replace(/\\/g, "/").split("/").includes("..");
}
function sealAcceptanceContract(input) {
    return { ...input, checksum: acceptanceHash(input) };
}
function validateAcceptanceContract(value) {
    const issues = [];
    if (value?.schema !== "ccm-acceptance-contract-v1")
        issues.push("contract_schema_invalid");
    const { checksum, ...core } = value || {};
    if (!checksum || checksum !== acceptanceHash(core))
        issues.push("contract_checksum_invalid");
    for (const key of ["taskId", "scopeId", "exactSessionId", "planId", "planChecksum", "requirementChecksum"])
        if (typeof value?.[key] !== "string" || !value[key].trim())
            issues.push(`${key}_missing`);
    if (!["project", "group", "global"].includes(value?.scope))
        issues.push("scope_invalid");
    if (!["standard", "strict"].includes(value?.level))
        issues.push("level_invalid");
    if (!Number.isSafeInteger(value?.generation) || value.generation < 0)
        issues.push("generation_invalid");
    for (const key of ["revision", "planRevision"])
        if (!Number.isSafeInteger(value?.[key]) || value[key] < 1)
            issues.push(`${key}_invalid`);
    const arrays = ["workItems", "criteria", "checks"];
    for (const key of arrays)
        if (!Array.isArray(value?.[key]) || !value[key].length)
            issues.push(`${key}_missing`);
    const items = Array.isArray(value?.workItems) ? value.workItems : [];
    const criteria = Array.isArray(value?.criteria) ? value.criteria : [];
    const checks = Array.isArray(value?.checks) ? value.checks : [];
    // Reject malformed JSON before iterating nested fields; API validation must not throw.
    const objectRow = (row) => row && typeof row === "object" && !Array.isArray(row);
    const stringArray = (rows) => Array.isArray(rows) && rows.every(v => typeof v === "string" && !!v.trim());
    if (![...items, ...criteria, ...checks].every(objectRow)
        || items.some((item) => !["dependsOn", "editablePaths", "readOnlyPaths", "forbiddenPaths", "cleanupPaths"].every(key => stringArray(item[key]))
            || !Array.isArray(item.synchronizedFixturePaths) || item.synchronizedFixturePaths.some((f) => !objectRow(f) || typeof f.path !== "string" || !stringArray(f.allowedChanges)))
        || criteria.some((row) => !stringArray(row.preconditions) || !Array.isArray(row.verificationGroups) || row.verificationGroups.some((g) => !stringArray(g)))
        || checks.some((row) => !stringArray(row.sourceEvidenceIds)))
        return { valid: false, issues: [...issues, "contract_nested_structure_invalid"] };
    for (const [name, rows] of [["workItem", items], ["criterion", criteria], ["verification", checks]]) {
        const ids = new Set();
        for (const row of rows) {
            if (typeof row?.id !== "string" || !row.id.trim() || ids.has(row.id))
                issues.push(`${name}_id_duplicate_or_missing`);
            ids.add(row?.id);
        }
    }
    const byItem = new Map(items.map((r) => [r.id, r]));
    const byCheck = new Map(checks.map((r) => [r.id, r]));
    const visiting = new Set(), visited = new Set();
    const visit = (id) => {
        if (visiting.has(id)) {
            issues.push("dependency_cycle");
            return;
        }
        if (visited.has(id))
            return;
        visiting.add(id);
        for (const dep of byItem.get(id)?.dependsOn || []) {
            if (!byItem.has(dep))
                issues.push("unknown_dependency");
            else
                visit(dep);
        }
        visiting.delete(id);
        visited.add(id);
    };
    for (const item of items) {
        visit(item.id);
        if (!item.projectId || !criteria.some((r) => r.workItemId === item.id))
            issues.push("work_item_uncovered");
        if (![item.editablePaths, item.readOnlyPaths].some(x => Array.isArray(x) && x.length))
            issues.push("work_item_scope_missing");
        for (const key of ["editablePaths", "readOnlyPaths", "forbiddenPaths", "cleanupPaths"])
            if (!Array.isArray(item[key]) || item[key].some((p) => !relativeAcceptancePath(p)))
                issues.push(`${key}_invalid`);
        if ((item.cleanupPaths || []).some((p) => p === "." || p.replace(/\\/g, "/").split("/").some(s => s === ".git" || s === "node_modules")
            || [...(item.editablePaths || []), ...(item.readOnlyPaths || []), ...(item.forbiddenPaths || []), ...(item.synchronizedFixturePaths || []).map((f) => f.path)]
                .some((q) => q === p || q.startsWith(`${p}/`))))
            issues.push("cleanup_overlaps_protected_scope");
        if (!Array.isArray(item.synchronizedFixturePaths))
            issues.push("fixtures_invalid");
        for (const fixture of item.synchronizedFixturePaths || [])
            if (!relativeAcceptancePath(fixture.path) || !Array.isArray(fixture.allowedChanges) || !fixture.allowedChanges.length)
                issues.push("fixture_fields_missing");
    }
    for (const check of checks) {
        if (byItem.get(check.workItemId)?.projectId !== check.projectId)
            issues.push("verification_project_mismatch");
        if (!relativeAcceptancePath(check.cwd))
            issues.push("verification_cwd_invalid");
        if (!Array.isArray(check.sourceEvidenceIds) || !check.sourceEvidenceIds.length)
            issues.push("verification_source_missing");
        if (!check.expected || !["command", "http", "browser", "scope_audit", "receipt"].includes(check.kind))
            issues.push("verification_invalid");
        if (check.kind === "command" && !check.command)
            issues.push("verification_command_missing");
        if (!["exit_code", "json_equals", "structured_result"].includes(check.assertion?.kind))
            issues.push("verification_assertion_missing");
        if (!check.assertion || !Object.prototype.hasOwnProperty.call(check.assertion, "value"))
            issues.push("verification_expected_value_missing");
        if (check.assertion?.kind === "exit_code" && (check.kind !== "command" || !Number.isInteger(check.assertion.value)))
            issues.push("exit_assertion_invalid");
        if (check.assertion?.kind === "structured_result" && check.kind === "command")
            issues.push("command_requires_observable_assertion");
    }
    for (const row of criteria) {
        if (byItem.get(row.workItemId)?.projectId !== row.projectId)
            issues.push("criterion_project_mismatch");
        if (!row.description || !row.action || !row.expected || !Array.isArray(row.preconditions))
            issues.push("criterion_not_observable");
        if (!Array.isArray(row.verificationGroups) || !row.verificationGroups.length) {
            issues.push("criterion_uncovered");
            continue;
        }
        for (const group of row.verificationGroups) {
            if (!Array.isArray(group) || !group.length) {
                issues.push("verification_group_empty");
                continue;
            }
            for (const id of group) {
                const check = byCheck.get(id);
                if (!check)
                    issues.push("unknown_verification");
                else if (check.projectId !== row.projectId || check.workItemId !== row.workItemId)
                    issues.push("criterion_verification_scope_mismatch");
            }
        }
    }
    return { valid: issues.length === 0, issues: [...new Set(issues)] };
}
function taskAcceptanceContract(task) {
    return task?.acceptance_contract || task?.plan_dispatch_contract?.acceptanceContract
        || task?.workflow_meta?.plan_dispatch_contract?.acceptanceContract || null;
}
/** Task kind is not an acceptance route. Never classify development by route. */
function isAcceptanceProjectionTask(task) {
    return task?.task_kind === "acceptance_projection"
        || String(task?.requirement_item_key || task?.mission_target?.item_key || "").toUpperCase() === "TESTAGENT_VERIFY";
}
//# sourceMappingURL=acceptance-contract.js.map