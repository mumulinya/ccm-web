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
exports.normalizeAutomationTaskSource = normalizeAutomationTaskSource;
exports.inferAutomationTaskSource = inferAutomationTaskSource;
exports.listAutomationSessionBindings = listAutomationSessionBindings;
exports.bindAutomationSessionSources = bindAutomationSessionSources;
exports.replaceAutomationSessionSources = replaceAutomationSessionSources;
exports.createBoundAutomationSession = createBoundAutomationSession;
exports.setAutomationSessionBindingStatus = setAutomationSessionBindingStatus;
exports.resolveAutomationSessionBinding = resolveAutomationSessionBinding;
exports.listGlobalDispatchTargets = listGlobalDispatchTargets;
const crypto = __importStar(require("crypto"));
const path = __importStar(require("path"));
const db_1 = require("../core/db");
const utils_1 = require("../core/utils");
const atomic_json_file_1 = require("../core/atomic-json-file");
const storage_1 = require("../modules/collaboration/storage");
const sessions_1 = require("../modules/projects/sessions");
const STORE_FILE = path.join(utils_1.CCM_DIR, "automation-session-bindings.json");
const SOURCE_ORDER = ["requirement_pool", "workbench", "global_agent"];
const SOURCE_TITLES = {
    requirement_pool: "需求池自动化任务",
    workbench: "工作台自动化任务",
    global_agent: "全局 Agent 自动化任务",
};
function checksum(value) {
    return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
function bindingChecksum(input) {
    const { checksum: _ignored, ...base } = input;
    return checksum(base);
}
function emptyStore() {
    return { schema: "ccm-automation-session-binding-store-v1", revision: 0, bindings: [], updatedAt: "" };
}
function normalizeSources(value) {
    const rows = Array.isArray(value) ? value : value ? [value] : [];
    return SOURCE_ORDER.filter(source => rows.some(row => normalizeAutomationTaskSource(row) === source));
}
function normalizeBinding(value) {
    const scope = String(value?.scope || "").trim();
    const scopeId = String(value?.scopeId || value?.scope_id || "").trim();
    const exactSessionId = String(value?.exactSessionId || value?.exact_session_id || "").trim();
    const sources = normalizeSources(value?.sources);
    if (!["project", "group"].includes(scope) || !scopeId || !exactSessionId || !sources.length)
        return null;
    const createdAt = String(value?.createdAt || value?.created_at || new Date().toISOString());
    const normalized = {
        schema: "ccm-automation-session-binding-v1",
        bindingId: String(value?.bindingId || value?.binding_id || `asb_${crypto.randomUUID()}`),
        scope,
        scopeId,
        exactSessionId,
        sources,
        status: ["active", "draining", "archived"].includes(String(value?.status)) ? value.status : "active",
        revision: Math.max(1, Math.floor(Number(value?.revision || 1))),
        createdAt,
        updatedAt: String(value?.updatedAt || value?.updated_at || createdAt),
        updatedBy: String(value?.updatedBy || value?.updated_by || "system"),
        reason: String(value?.reason || ""),
    };
    return { ...normalized, checksum: bindingChecksum(normalized) };
}
function loadStore() {
    const raw = (0, atomic_json_file_1.readJsonWithBackup)(STORE_FILE, emptyStore());
    return {
        schema: "ccm-automation-session-binding-store-v1",
        revision: Math.max(0, Math.floor(Number(raw?.revision || 0))),
        bindings: (Array.isArray(raw?.bindings) ? raw.bindings : []).map(normalizeBinding).filter(Boolean),
        updatedAt: String(raw?.updatedAt || raw?.updated_at || ""),
    };
}
function saveStore(store) {
    const next = {
        schema: "ccm-automation-session-binding-store-v1",
        revision: Math.max(0, Math.floor(Number(store.revision || 0))) + 1,
        bindings: store.bindings.map(binding => ({ ...binding, checksum: bindingChecksum(binding) })),
        updatedAt: new Date().toISOString(),
    };
    (0, atomic_json_file_1.writeJsonAtomic)(STORE_FILE, next);
    return next;
}
function normalizeAutomationTaskSource(value) {
    const normalized = String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
    if (["requirement_pool", "requirement", "requirements", "requirement_epic"].includes(normalized))
        return "requirement_pool";
    if (["workbench", "usability_intake", "usability"].includes(normalized))
        return "workbench";
    if (["global_agent", "global", "global_web", "global_feishu", "global_agent_chat", "web_global_agent", "global_agent_request"].includes(normalized))
        return "global_agent";
    return null;
}
function inferAutomationTaskSource(task) {
    const values = [
        task?.automation_task_source,
        task?.automationTaskSource,
        task?.request_origin,
        task?.requestOrigin,
        task?.workflow_meta?.intake?.source,
        task?.workflowMeta?.intake?.source,
    ];
    for (const value of values) {
        const source = normalizeAutomationTaskSource(value);
        if (source)
            return source;
    }
    return null;
}
function requireScope(scopeValue, scopeIdValue) {
    const scope = String(scopeValue || "").trim();
    const scopeId = String(scopeIdValue || "").trim();
    if (!["project", "group"].includes(scope) || !scopeId)
        throw new Error("自动化会话目标无效");
    if (scope === "project" && !(0, db_1.getConfigs)().some((config) => String(config?.name || "") === scopeId))
        throw new Error("目标项目不存在或已归档");
    if (scope === "group" && !(0, storage_1.loadGroups)().some((group) => String(group?.id || "") === scopeId))
        throw new Error("目标群聊不存在或已归档");
    return { scope, scopeId };
}
function sessionInfo(scope, scopeId, exactSessionId) {
    if (scope === "project") {
        const session = (0, sessions_1.getSessionDetail)(scopeId, exactSessionId);
        if (!session)
            return null;
        return {
            id: exactSessionId,
            title: String(session.name || session.title || exactSessionId),
            sessionKind: String(session.session_kind || session.sessionKind || "conversation"),
            archived: session.archived === true,
        };
    }
    const session = (0, storage_1.listGroupChatSessions)(scopeId).sessions.find((item) => String(item?.id || "") === exactSessionId);
    if (!session)
        return null;
    return {
        id: exactSessionId,
        title: String(session.title || session.name || exactSessionId),
        sessionKind: String(session.session_kind || session.sessionKind || "conversation"),
        archived: session.archived === true,
    };
}
function requireAutomationSession(scope, scopeId, exactSessionId) {
    const session = sessionInfo(scope, scopeId, exactSessionId);
    if (!session)
        throw new Error("自动化任务会话不存在");
    if (session.archived)
        throw new Error("归档会话不能接收新任务");
    if (session.sessionKind !== "automation")
        throw new Error("普通会话不能绑定自动化任务来源");
    return session;
}
function createAutomationSession(scope, scopeId, source, title = "") {
    const sessionTitle = String(title || SOURCE_TITLES[source]).trim().slice(0, 80) || SOURCE_TITLES[source];
    if (scope === "project") {
        const created = (0, sessions_1.createProjectSessionRecord)(scopeId, sessionTitle, "web", { sessionKind: "automation" });
        return { exactSessionId: String(created.sessionId), title: created.name };
    }
    const created = (0, storage_1.createGroupChatSession)(scopeId, sessionTitle, { sessionKind: "automation" });
    return { exactSessionId: String(created.id), title: created.title };
}
function publicBinding(binding) {
    const info = sessionInfo(binding.scope, binding.scopeId, binding.exactSessionId);
    const tasks = (0, db_1.loadTasks)().filter((task) => {
        const taskSession = binding.scope === "project" ? task?.project_session_id : task?.group_session_id;
        return String(taskSession || "") === binding.exactSessionId;
    });
    return {
        ...binding,
        session: info,
        runningTaskCount: tasks.filter((task) => ["in_progress", "running", "verifying", "queued"].includes(String(task?.status || ""))).length,
        taskCount: tasks.length,
    };
}
function listAutomationSessionBindings(scopeValue, scopeIdValue) {
    const scope = scopeValue ? String(scopeValue) : "";
    const scopeId = scopeIdValue ? String(scopeIdValue) : "";
    return loadStore().bindings
        .filter(binding => (!scope || binding.scope === scope) && (!scopeId || binding.scopeId === scopeId))
        .map(publicBinding);
}
function bindAutomationSessionSources(input) {
    const { scope, scopeId } = requireScope(input.scope, input.scopeId);
    const exactSessionId = String(input.exactSessionId || "").trim();
    const sources = normalizeSources(input.sources);
    if (!sources.length)
        throw new Error("至少选择一个任务来源");
    requireAutomationSession(scope, scopeId, exactSessionId);
    return (0, atomic_json_file_1.withFileLock)(STORE_FILE, () => {
        const store = loadStore();
        const existing = store.bindings.find(binding => binding.scope === scope && binding.scopeId === scopeId && binding.exactSessionId === exactSessionId && binding.status !== "archived");
        if (input.expectedRevision != null && (!existing || existing.revision !== Number(input.expectedRevision)))
            throw new Error("绑定状态已经变化，请刷新后重试");
        for (const binding of store.bindings) {
            if (binding.scope !== scope || binding.scopeId !== scopeId || binding.exactSessionId === exactSessionId || binding.status !== "active")
                continue;
            const remaining = binding.sources.filter(source => !sources.includes(source));
            binding.sources = remaining;
            binding.revision += 1;
            binding.updatedAt = new Date().toISOString();
            binding.updatedBy = String(input.actor || "system");
            binding.reason = `source_transferred:${String(input.reason || "manual_binding")}`;
            if (!remaining.length)
                binding.status = "archived";
            binding.checksum = bindingChecksum(binding);
        }
        const now = new Date().toISOString();
        let target = existing;
        if (target) {
            target.sources = normalizeSources([...target.sources, ...sources]);
            target.status = "active";
            target.revision += 1;
            target.updatedAt = now;
            target.updatedBy = String(input.actor || "system");
            target.reason = String(input.reason || "manual_binding");
            target.checksum = bindingChecksum(target);
        }
        else {
            const draft = {
                schema: "ccm-automation-session-binding-v1",
                bindingId: `asb_${crypto.randomUUID()}`,
                scope,
                scopeId,
                exactSessionId,
                sources,
                status: "active",
                revision: 1,
                createdAt: now,
                updatedAt: now,
                updatedBy: String(input.actor || "system"),
                reason: String(input.reason || "manual_binding"),
            };
            target = { ...draft, checksum: bindingChecksum(draft) };
            store.bindings.push(target);
        }
        saveStore(store);
        return publicBinding(target);
    });
}
function replaceAutomationSessionSources(input) {
    const { scope, scopeId } = requireScope(input.scope, input.scopeId);
    const exactSessionId = String(input.exactSessionId || "").trim();
    const sources = normalizeSources(input.sources);
    requireAutomationSession(scope, scopeId, exactSessionId);
    return (0, atomic_json_file_1.withFileLock)(STORE_FILE, () => {
        const store = loadStore();
        const existing = store.bindings.find(binding => binding.scope === scope && binding.scopeId === scopeId && binding.exactSessionId === exactSessionId && binding.status !== "archived");
        if (input.expectedRevision != null && (!existing || existing.revision !== Number(input.expectedRevision)))
            throw new Error("绑定状态已经变化，请刷新后重试");
        for (const binding of store.bindings) {
            if (binding.scope !== scope || binding.scopeId !== scopeId || binding.exactSessionId === exactSessionId || binding.status !== "active")
                continue;
            const remaining = binding.sources.filter(source => !sources.includes(source));
            if (remaining.length === binding.sources.length)
                continue;
            binding.sources = remaining;
            binding.status = remaining.length ? binding.status : "archived";
            binding.revision += 1;
            binding.updatedAt = new Date().toISOString();
            binding.updatedBy = String(input.actor || "system");
            binding.reason = `source_transferred:${String(input.reason || "manual_binding_replace")}`;
            binding.checksum = bindingChecksum(binding);
        }
        const now = new Date().toISOString();
        let target = existing;
        if (!target) {
            const draft = {
                schema: "ccm-automation-session-binding-v1",
                bindingId: `asb_${crypto.randomUUID()}`,
                scope,
                scopeId,
                exactSessionId,
                sources,
                status: sources.length ? "active" : "archived",
                revision: 1,
                createdAt: now,
                updatedAt: now,
                updatedBy: String(input.actor || "system"),
                reason: String(input.reason || "manual_binding_replace"),
            };
            target = { ...draft, checksum: bindingChecksum(draft) };
            store.bindings.push(target);
        }
        else {
            target.sources = sources;
            target.status = sources.length ? "active" : "archived";
            target.revision += 1;
            target.updatedAt = now;
            target.updatedBy = String(input.actor || "system");
            target.reason = String(input.reason || "manual_binding_replace");
            target.checksum = bindingChecksum(target);
        }
        saveStore(store);
        return publicBinding(target);
    });
}
function createBoundAutomationSession(input) {
    const { scope, scopeId } = requireScope(input.scope, input.scopeId);
    const sources = normalizeSources(input.sources);
    if (!sources.length)
        throw new Error("至少选择一个任务来源");
    return (0, atomic_json_file_1.withFileLock)(STORE_FILE, () => {
        const created = createAutomationSession(scope, scopeId, sources[0], input.title);
        // The store lock is already held, so perform the same transfer in-place.
        const store = loadStore();
        for (const binding of store.bindings) {
            if (binding.scope !== scope || binding.scopeId !== scopeId || binding.status !== "active")
                continue;
            binding.sources = binding.sources.filter(source => !sources.includes(source));
            if (!binding.sources.length)
                binding.status = "archived";
            binding.revision += 1;
            binding.updatedAt = new Date().toISOString();
            binding.updatedBy = String(input.actor || "system");
            binding.reason = "source_transferred:auto_session_created";
            binding.checksum = bindingChecksum(binding);
        }
        const now = new Date().toISOString();
        const draft = {
            schema: "ccm-automation-session-binding-v1",
            bindingId: `asb_${crypto.randomUUID()}`,
            scope,
            scopeId,
            exactSessionId: created.exactSessionId,
            sources,
            status: "active",
            revision: 1,
            createdAt: now,
            updatedAt: now,
            updatedBy: String(input.actor || "system"),
            reason: String(input.reason || "automation_session_created"),
        };
        const binding = { ...draft, checksum: bindingChecksum(draft) };
        store.bindings.push(binding);
        saveStore(store);
        return publicBinding(binding);
    });
}
function setAutomationSessionBindingStatus(bindingIdValue, statusValue, expectedRevision, actor = "system", reason = "") {
    const bindingId = String(bindingIdValue || "").trim();
    const status = String(statusValue || "").trim();
    if (!["active", "draining", "archived"].includes(status))
        throw new Error("绑定状态无效");
    return (0, atomic_json_file_1.withFileLock)(STORE_FILE, () => {
        const store = loadStore();
        const binding = store.bindings.find(item => item.bindingId === bindingId);
        if (!binding)
            throw new Error("自动化会话绑定不存在");
        if (expectedRevision != null && binding.revision !== Number(expectedRevision))
            throw new Error("绑定状态已经变化，请刷新后重试");
        binding.status = status;
        binding.revision += 1;
        binding.updatedAt = new Date().toISOString();
        binding.updatedBy = String(actor || "system");
        binding.reason = String(reason || `binding_${status}`);
        binding.checksum = bindingChecksum(binding);
        saveStore(store);
        return publicBinding(binding);
    });
}
function resolveAutomationSessionBinding(input) {
    const { scope, scopeId } = requireScope(input.scope, input.scopeId);
    const source = normalizeAutomationTaskSource(input.source);
    if (!source)
        throw new Error("自动化任务来源无效");
    return (0, atomic_json_file_1.withFileLock)(STORE_FILE, () => {
        const store = loadStore();
        const active = store.bindings.find(binding => binding.scope === scope && binding.scopeId === scopeId && binding.status === "active" && binding.sources.includes(source));
        if (active) {
            const session = sessionInfo(scope, scopeId, active.exactSessionId);
            if (session && session.sessionKind === "automation" && !session.archived) {
                const snapshot = {
                    schema: "ccm-automation-session-resolution-v1",
                    taskSource: source,
                    bindingId: active.bindingId,
                    bindingRevision: active.revision,
                    bindingChecksum: active.checksum,
                    scope,
                    scopeId,
                    exactSessionId: active.exactSessionId,
                    resolution: "explicit_binding",
                    resolvedAt: new Date().toISOString(),
                };
                return { binding: publicBinding(active), snapshot, created: false };
            }
            active.status = "archived";
            active.revision += 1;
            active.updatedAt = new Date().toISOString();
            active.updatedBy = "system";
            active.reason = "bound_session_missing_or_unwritable";
            active.checksum = bindingChecksum(active);
        }
        const created = createAutomationSession(scope, scopeId, source, input.title);
        const now = new Date().toISOString();
        const draft = {
            schema: "ccm-automation-session-binding-v1",
            bindingId: `asb_${crypto.randomUUID()}`,
            scope,
            scopeId,
            exactSessionId: created.exactSessionId,
            sources: [source],
            status: "active",
            revision: 1,
            createdAt: now,
            updatedAt: now,
            updatedBy: String(input.actor || "system"),
            reason: "first_task_auto_created",
        };
        const binding = { ...draft, checksum: bindingChecksum(draft) };
        store.bindings.push(binding);
        saveStore(store);
        const snapshot = {
            schema: "ccm-automation-session-resolution-v1",
            taskSource: source,
            bindingId: binding.bindingId,
            bindingRevision: binding.revision,
            bindingChecksum: binding.checksum,
            scope,
            scopeId,
            exactSessionId: binding.exactSessionId,
            resolution: "auto_created",
            resolvedAt: now,
        };
        return { binding: publicBinding(binding), snapshot, created: true };
    });
}
function listGlobalDispatchTargets() {
    const projects = (0, db_1.getConfigs)().map((config) => ({
        scope: "project",
        scopeId: String(config?.name || ""),
        canonicalName: String(config?.name || ""),
        displayName: String(config?.display_name || config?.displayName || config?.name || ""),
        ready: !!String(config?.name || ""),
        unavailableReason: "",
    })).filter(item => item.scopeId);
    const groups = (0, storage_1.loadGroups)().map((group) => {
        const members = Array.isArray(group?.members) ? group.members : [];
        const ready = members.some((member) => !!String(member?.project || member?.id || ""));
        return {
            scope: "group",
            scopeId: String(group?.id || ""),
            canonicalName: String(group?.name || group?.id || ""),
            displayName: String(group?.name || group?.id || ""),
            ready,
            unavailableReason: ready ? "" : "群聊尚未配置可执行成员",
        };
    }).filter(item => item.scopeId);
    return [...groups, ...projects].sort((a, b) => `${a.scope}:${a.displayName}`.localeCompare(`${b.scope}:${b.displayName}`, "zh-CN"));
}
//# sourceMappingURL=automation-session-bindings.js.map