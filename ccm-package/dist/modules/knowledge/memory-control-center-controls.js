"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMemoryItemId = getMemoryItemId;
exports.editableField = editableField;
exports.itemText = itemText;
exports.scopeControls = scopeControls;
exports.applyListControls = applyListControls;
exports.applyMemoryControls = applyMemoryControls;
exports.updateMemoryControl = updateMemoryControl;
const memory_control_center_types_1 = require("./memory-control-center-types");
function getMemoryItemId(itemType, item, index = 0) {
    const explicit = item?.id || item?.messageId;
    if (explicit)
        return `${(0, memory_control_center_types_1.cleanId)(itemType)}:${(0, memory_control_center_types_1.cleanId)(explicit)}`;
    const identity = [item?.archiveId, item?.taskId, item?.groupId, item?.time, item?.timestamp, item?.decision, item?.summary, item?.text, item?.reason, item?.question, item?.action];
    if (!identity.some(Boolean))
        identity.push(index);
    return `${(0, memory_control_center_types_1.cleanId)(itemType)}:${(0, memory_control_center_types_1.hash)(identity)}`;
}
function editableField(itemType, item) {
    if (itemType === "factAnchors" || itemType === "persistentRequirements")
        return "text";
    if (itemType === "decisions")
        return "decision";
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
        const id = getMemoryItemId(itemType, original, index);
        const control = controls.find((item) => item.itemId === id);
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
        : scope === "project" ? ["conclusions", "decisions"] : ["user", "feedback", "authorization", "decisions", "missions", "unresolved", "references"];
    for (const key of keys)
        memory[key] = applyListControls(scope, scopeId, key, memory[key]);
    if (scope === "project") {
        for (const archiveKey of ["conclusionArchives", "decisionArchives"]) {
            memory[archiveKey] = (memory[archiveKey] || []).map((archive) => ({
                ...archive,
                records: applyListControls(scope, scopeId, archiveKey === "conclusionArchives" ? "conclusions" : "decisions", (archive.records || []).map((item) => ({ ...item, archiveId: archive.id }))),
            }));
        }
    }
    return memory;
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
    const state = (0, memory_control_center_types_1.getControlsState)();
    const controls = Array.isArray(state.controls) ? state.controls : [];
    const index = controls.findIndex((item) => item.scope === scope && item.scopeId === scopeId && item.itemType === itemType && item.itemId === itemId);
    const before = index >= 0 ? controls[index] : null;
    const current = { scope, scopeId, itemType, itemId, pinned: false, deprecated: false, ...(before || {}) };
    if (action === "pin" || action === "lock")
        current.pinned = true;
    if (action === "unpin" || action === "unlock")
        current.pinned = false;
    if (action === "edit")
        current.editedText = String(input.text || "").trim();
    if (action === "deprecate" || action === "delete")
        current.deprecated = true;
    if (action === "restore") {
        current.deprecated = false;
        delete current.editedText;
    }
    current.reason = String(input.reason || current.reason || "").trim();
    current.updatedAt = (0, memory_control_center_types_1.now)();
    current.updatedBy = String(input.actor || "local-user");
    if (index >= 0)
        controls[index] = current;
    else
        controls.push(current);
    const next = { version: 1, controls, updatedAt: current.updatedAt };
    (0, memory_control_center_types_1.writeJsonAtomic)(memory_control_center_types_1.CONTROL_FILE, next);
    const audit = (0, memory_control_center_types_1.appendAudit)({
        type: "memory_control", action, scope, scopeId, itemType, itemId,
        actor: current.updatedBy, reason: current.reason,
        beforeHash: before ? (0, memory_control_center_types_1.hash)(before, 24) : "", afterHash: (0, memory_control_center_types_1.hash)(current, 24),
    });
    return { control: current, audit };
}
//# sourceMappingURL=memory-control-center-controls.js.map