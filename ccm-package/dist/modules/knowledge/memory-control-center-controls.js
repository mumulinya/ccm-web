"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMemoryItemId = getMemoryItemId;
exports.editableField = editableField;
exports.itemText = itemText;
exports.scopeControls = scopeControls;
exports.applyListControls = applyListControls;
exports.applyMemoryControls = applyMemoryControls;
exports.pruneMemoryControls = pruneMemoryControls;
exports.updateMemoryControl = updateMemoryControl;
const memory_control_center_types_1 = require("./memory-control-center-types");
const memory_control_center_identity_1 = require("./memory-control-center-identity");
function getMemoryItemId(itemType, item, index = 0) {
    return (0, memory_control_center_identity_1.memoryItemStableId)(itemType, item, index);
}
function editableField(itemType, item) {
    if (itemType === "factAnchors" || itemType === "persistentRequirements")
        return "text";
    if (itemType === "decisions")
        return "decision";
    if (itemType === "durableMemories")
        return "content";
    if (itemType === "conclusions" || itemType === "completed" || itemType === "workerLedger")
        return "summary";
    if (itemType === "blocked")
        return "reason";
    if (itemType === "openQuestions")
        return typeof item === "string" ? "value" : "question";
    if (itemType === "nextActions")
        return typeof item === "string" ? "value" : "action";
    if (["user", "feedback", "authorization", "missions", "unresolved", "references"].includes(itemType))
        return "text";
    return item?.text !== undefined ? "text" : item?.summary !== undefined ? "summary" : "value";
}
function itemText(itemType, item) {
    if (typeof item === "string")
        return item;
    const field = editableField(itemType, item);
    return String(item?.[field] || item?.text || item?.summary || item?.decision || item?.reason || "");
}
function scopeControls(scope, scopeId) {
    return ((0, memory_control_center_types_1.getControlsState)().controls || []).filter((item) => item.scope === scope && item.scopeId === scopeId);
}
function applyListControls(scope, scopeId, itemType, source) {
    const controls = scopeControls(scope, scopeId).filter((item) => item.itemType === itemType);
    const mapped = (Array.isArray(source) ? source : []).map((original, index) => {
        // 稳定 id 命中不了时回退到旧式 id，保证历史 pin/deprecate 不因正文改写而失效。
        const resolved = (0, memory_control_center_identity_1.resolveMemoryItemControl)(controls, itemType, original, index);
        const id = resolved.itemId;
        const control = resolved.control;
        let value = typeof original === "string" ? original : { ...original };
        if (control?.editedText !== undefined) {
            const field = editableField(itemType, original);
            value = field === "value" ? control.editedText : { ...value, [field]: control.editedText };
        }
        if (typeof value === "object" && value) {
            value.memoryControl = control ? {
                pinned: !!control.pinned,
                deprecated: !!control.deprecated,
                reason: control.reason || "",
                updatedAt: control.updatedAt,
                itemId: id,
            } : { pinned: false, deprecated: false, itemId: id };
        }
        return { id, value, control };
    }).filter((entry) => !entry.control?.deprecated);
    mapped.sort((a, b) => Number(!!b.control?.pinned) - Number(!!a.control?.pinned));
    return mapped.map((entry) => entry.value);
}
function applyMemoryControls(scope, scopeId, source) {
    const memory = JSON.parse(JSON.stringify(source || {}));
    const keys = scope === "group"
        ? ["factAnchors", "persistentRequirements", "decisions", "completed", "blocked", "workerLedger", "openQuestions", "nextActions"]
        : scope === "project" ? ["durableMemories"] : ["user", "feedback", "authorization", "decisions", "missions", "unresolved", "references"];
    for (const key of keys)
        memory[key] = applyListControls(scope, scopeId, key, memory[key]);
    return memory;
}
/**
 * 回收孤儿控制项：itemId 匹配不上任何现存记忆条目、且超过保留期的控制项。
 * 调用方负责给出「本轮确实扫描过的 scope → 存活 itemId 集合」，未扫描到的 scope
 * 一律跳过，避免因为某个 scope 读取失败就误删用户的置顶/屏蔽设置。
 */
function pruneMemoryControls(liveIdsByScope, options = {}) {
    return (0, memory_control_center_types_1.withMemoryCenterFileLock)(memory_control_center_types_1.CONTROL_FILE, () => {
        const state = (0, memory_control_center_types_1.getControlsState)();
        const controls = Array.isArray(state.controls) ? state.controls : [];
        const orphans = (0, memory_control_center_identity_1.collectOrphanMemoryControls)(controls, liveIdsByScope, options);
        if (!orphans.length)
            return { pruned: 0, orphans: [] };
        const orphanKey = (entry) => `${entry?.scope}::${entry?.scopeId}::${entry?.itemType}::${entry?.itemId}`;
        const dropped = new Set(orphans.map(orphanKey));
        const next = controls.filter((entry) => !dropped.has(orphanKey(entry)));
        (0, memory_control_center_types_1.writeJsonAtomic)(memory_control_center_types_1.CONTROL_FILE, { version: 1, controls: next, updatedAt: (0, memory_control_center_types_1.now)() });
        (0, memory_control_center_types_1.appendAudit)({
            type: "memory_control_gc",
            action: "prune_orphans",
            actor: String(options.actor || "memory-center"),
            reason: `orphan controls older than ${Number(options.retentionDays || 60)} days`,
            prunedCount: orphans.length,
            scopes: [...new Set(orphans.map((entry) => `${entry.scope}::${entry.scopeId}`))].slice(0, 40),
        });
        return { pruned: orphans.length, orphans };
    });
}
function updateMemoryControl(input) {
    const scope = input.scope === "project" ? "project" : input.scope === "global" ? "global" : "group";
    const scopeId = String(input.scopeId || "").trim();
    const itemType = (0, memory_control_center_types_1.cleanId)(input.itemType);
    const itemId = (0, memory_control_center_types_1.cleanId)(input.itemId);
    const action = input.action;
    if (!scopeId || !itemType || !itemId)
        throw new Error("缺少记忆定位信息");
    if (!["pin", "unpin", "lock", "unlock", "edit", "deprecate", "delete", "restore"].includes(action))
        throw new Error("不支持的记忆操作");
    if ((action === "edit" || action === "deprecate" || action === "delete") && !String(input.reason || "").trim())
        throw new Error("修改或删除记忆时必须填写原因");
    if (action === "edit" && !String(input.text || "").trim())
        throw new Error("修改后的记忆不能为空");
    // 读改写必须在锁内完成，否则并发的 pin/edit/deprecate 会互相覆盖。
    const { current, before } = (0, memory_control_center_types_1.withMemoryCenterFileLock)(memory_control_center_types_1.CONTROL_FILE, () => {
        const state = (0, memory_control_center_types_1.getControlsState)();
        const controls = Array.isArray(state.controls) ? state.controls : [];
        const index = controls.findIndex((item) => item.scope === scope && item.scopeId === scopeId && item.itemType === itemType && item.itemId === itemId);
        const previous = index >= 0 ? controls[index] : null;
        const entry = { scope, scopeId, itemType, itemId, pinned: false, deprecated: false, ...(previous || {}) };
        if (action === "pin" || action === "lock")
            entry.pinned = true;
        if (action === "unpin" || action === "unlock")
            entry.pinned = false;
        if (action === "edit")
            entry.editedText = String(input.text || "").trim();
        if (action === "deprecate" || action === "delete")
            entry.deprecated = true;
        if (action === "restore") {
            entry.deprecated = false;
            delete entry.editedText;
        }
        entry.reason = String(input.reason || entry.reason || "").trim();
        entry.updatedAt = (0, memory_control_center_types_1.now)();
        entry.updatedBy = String(input.actor || "local-user");
        if (index >= 0)
            controls[index] = entry;
        else
            controls.push(entry);
        (0, memory_control_center_types_1.writeJsonAtomic)(memory_control_center_types_1.CONTROL_FILE, { version: 1, controls, updatedAt: entry.updatedAt });
        return { current: entry, before: previous };
    });
    const audit = (0, memory_control_center_types_1.appendAudit)({
        type: "memory_control", action, scope, scopeId, itemType, itemId,
        actor: current.updatedBy, reason: current.reason,
        beforeHash: before ? (0, memory_control_center_types_1.hash)(before, 24) : "", afterHash: (0, memory_control_center_types_1.hash)(current, 24),
    });
    return { control: current, audit };
}
//# sourceMappingURL=memory-control-center-controls.js.map