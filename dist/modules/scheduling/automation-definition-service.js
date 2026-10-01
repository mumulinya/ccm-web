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
exports.listAutomationDefinitions = listAutomationDefinitions;
exports.getAutomationDefinition = getAutomationDefinition;
exports.createAutomationDefinition = createAutomationDefinition;
exports.updateAutomationDefinition = updateAutomationDefinition;
exports.deleteAutomationDefinition = deleteAutomationDefinition;
exports.listAutomationDefinitionRuns = listAutomationDefinitionRuns;
exports.automationDefinitionStorePath = automationDefinitionStorePath;
const crypto = __importStar(require("crypto"));
const path = __importStar(require("path"));
const utils_1 = require("../../core/utils");
const atomic_json_file_1 = require("../../core/atomic-json-file");
const task_workflow_model_1 = require("../collaboration/task-workflow-model");
const task_run_store_1 = require("../collaboration/task-run-store");
const schedule_expression_1 = require("./schedule-expression");
const FILE = path.join(utils_1.CCM_DIR, "automation-definitions.json");
const LOCK = path.join(utils_1.CCM_DIR, "automation-definitions-v1");
function text(value, fallback = "") { const valueText = String(value ?? "").trim(); return valueText || fallback; }
function readRows() {
    const raw = (0, atomic_json_file_1.readJsonWithBackup)(FILE, { schema: "ccm-automation-definition-store-v1", definitions: [] });
    return (Array.isArray(raw) ? raw : raw?.definitions || []).filter((row) => row && row.definition_id);
}
function persist(definitions) { (0, atomic_json_file_1.writeJsonAtomic)(FILE, { schema: "ccm-automation-definition-store-v1", version: 1, updated_at: new Date().toISOString(), definitions }); }
function normalizeInput(input, fallback = {}) {
    const merged = { ...fallback, ...input };
    const target = input?.target || fallback?.target;
    if (target && typeof target === "object") {
        merged.group_id = target.type === "group" ? text(target.id) : null;
        merged.project = target.type === "project" ? text(target.id) : "";
        merged.exact_session_id = text(target.exact_session_id || target.exactSessionId);
    }
    merged.id = text(input?.definition_id || input?.definitionId || input?.id || fallback?.definition_id || fallback?.id);
    merged.name = text(input?.name, text(fallback?.name, "自动化任务"));
    merged.prompt = text(input?.prompt, text(input?.goal, text(fallback?.prompt, text(fallback?.goal))));
    merged.business_goal = text(input?.goal, text(input?.business_goal, text(fallback?.goal, merged.prompt)));
    merged.scope = text(input?.scope, text(fallback?.scope));
    merged.schedule = text(input?.schedule, text(fallback?.schedule));
    merged.timezone = text(input?.timezone, text(fallback?.timezone, "Asia/Shanghai"));
    merged.source_attachments = Array.isArray(input?.attachments) ? input.attachments : (Array.isArray(input?.source_attachments) ? input.source_attachments : (Array.isArray(fallback?.attachments) ? fallback.attachments : []));
    merged.dispatch_policy = text(input?.dispatch_policy || input?.dispatchPolicy, text(input?.execution_policy?.dispatch, text(fallback?.execution_policy?.dispatch)));
    merged.verification_policy = text(input?.verification_policy || input?.verificationPolicy, text(input?.execution_policy?.verification, text(fallback?.execution_policy?.verification)));
    merged.workspace_policy = text(input?.workspace_policy || input?.workspacePolicy, text(input?.execution_policy?.workspace, text(fallback?.execution_policy?.workspace)));
    merged.approval_policy = text(input?.approval_policy || input?.approvalPolicy, text(input?.execution_policy?.approval, text(fallback?.execution_policy?.approval)));
    return merged;
}
function validateDefinitionInput(input) {
    if (!text(input?.name))
        throw new Error("请输入自动化名称");
    if (!text(input?.schedule))
        throw new Error("请输入 Cron 表达式");
    (0, schedule_expression_1.validateCronExpression)(input.schedule);
    (0, schedule_expression_1.normalizeCronTimezone)(input.timezone);
    const target = input?.target || {};
    const type = text(target.type, input?.group_id ? "group" : "project");
    if (!["project", "group"].includes(type) || !text(target.id || input?.group_id || input?.project))
        throw new Error("请选择自动化目标");
    if (!text(input?.prompt || input?.goal || input?.business_goal))
        throw new Error("请输入自动化执行内容");
}
function listAutomationDefinitions() {
    return readRows().sort((a, b) => String(b.updated_at || b.frozen_at || "").localeCompare(String(a.updated_at || a.frozen_at || "")));
}
function getAutomationDefinition(id) { return listAutomationDefinitions().find(row => row.definition_id === text(id)) || null; }
function createAutomationDefinition(input) {
    return (0, atomic_json_file_1.withFileLock)(LOCK, () => {
        const now = new Date().toISOString();
        const normalized = normalizeInput({ ...input, id: text(input?.definition_id || input?.id, `automation_${crypto.randomUUID()}`), revision: 1 });
        validateDefinitionInput(normalized);
        const definition = (0, task_workflow_model_1.buildAutomationDefinitionV1)(normalized, (0, task_workflow_model_1.resolveTaskExecutionPolicy)({ ...normalized, origin: "automation" }));
        const row = { ...definition, owner_id: text(input?.owner_id || input?.ownerId || "local-user"), enabled: input?.enabled !== false, updated_at: now };
        const rows = readRows();
        rows.push(row);
        persist(rows);
        return row;
    }, { timeoutMs: 10_000, staleMs: 60_000 });
}
function updateAutomationDefinition(id, updates) {
    return (0, atomic_json_file_1.withFileLock)(LOCK, () => {
        const rows = readRows();
        const index = rows.findIndex(row => row.definition_id === text(id));
        if (index < 0)
            return null;
        const current = rows[index];
        if (current.deleted_at && !updates?.deleted_at)
            throw new Error("已删除的定时任务不可修改");
        if (updates?.revision != null && Number(updates.revision) !== Number(current.revision))
            throw new Error("自动化定义版本冲突");
        const normalized = normalizeInput({ ...updates, id: current.definition_id, revision: Number(current.revision || 1) + 1 }, current);
        validateDefinitionInput(normalized);
        const next = (0, task_workflow_model_1.buildAutomationDefinitionV1)(normalized, (0, task_workflow_model_1.resolveTaskExecutionPolicy)({ ...normalized, origin: "automation" }));
        rows[index] = {
            ...current,
            ...next,
            owner_id: current.owner_id,
            enabled: updates?.enabled === undefined ? current.enabled !== false : updates.enabled !== false,
            ...(updates?.deleted_at ? { deleted_at: text(updates.deleted_at) } : current.deleted_at ? { deleted_at: current.deleted_at } : {}),
            updated_at: new Date().toISOString(),
        };
        persist(rows);
        return rows[index];
    }, { timeoutMs: 10_000, staleMs: 60_000 });
}
function deleteAutomationDefinition(id) {
    const current = getAutomationDefinition(id);
    return current?.deleted_at ? current : updateAutomationDefinition(id, { enabled: false, deleted_at: new Date().toISOString() });
}
function listAutomationDefinitionRuns(id) { return (0, task_run_store_1.listTaskRuns)().filter(run => run.automation_definition_id === text(id)); }
function automationDefinitionStorePath() { return FILE; }
//# sourceMappingURL=automation-definition-service.js.map