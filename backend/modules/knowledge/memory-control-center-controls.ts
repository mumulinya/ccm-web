// Behavior-freeze extraction from memory-control-center.ts.
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { DEFAULT_CONTEXT_WINDOW_TOKENS } from "../../system/context-budget";
import { CCM_DIR, GROUP_MESSAGES_DIR } from "../../core/utils";
import { withFileLock, writeJsonAtomic as writeJsonAtomicDurable } from "../../core/atomic-json-file";
import { loadProjectConfigs, loadTasks, saveTasks } from "../../core/db";
import {
  inspectGroupSessionMemoryExtractionLease,
  readGroupSessionMemoryExtractionState,
} from "../collaboration/group-session-memory-extraction";
import {
  inspectGroupSessionMemoryModelExtractionArtifactRetention,
  readGroupSessionMemoryTypedMemoryRetryState,
  retryGroupSessionModelExtractionTypedMemory,
  readGroupSessionMemoryModelExtractionHistory,
  replayGroupSessionMemoryModelExtraction,
  readGroupSessionMemoryCustomPromptProfile,
  readGroupSessionMemoryCustomTemplateProfile,
  runGroupSessionMemoryModelExtractionNow,
  runGroupSessionMemoryModelExtractionArtifactRetention,
  saveGroupSessionMemoryCustomPrompt,
  saveGroupSessionMemoryCustomTemplate,
  verifyGroupSessionMemoryDirectWriteSuppressionReceipt,
  verifyGroupSessionMemoryFactSupersessionGraph,
  verifyGroupSessionMemoryModelExtractionReceipt,
  verifyGroupSessionMemoryModelExtractionReplayEvidence,
} from "../collaboration/group-session-memory-model-extraction";
import {
  cancelPreparedDirectAgentDispatch,
  listDirectAgentDispatchSpool,
  pruneDirectAgentDispatchTerminalPair,
} from "../../agents/direct-dispatch-spool";
import {
  listTypedMemoryDispatchWal,
  transitionTypedMemoryDispatchWal,
  TYPED_MEMORY_DISPATCH_WAL_DIR,
  verifyTypedMemoryDispatchWal,
} from "../collaboration/typed-memory-dispatch-wal";
import { readGroupPostTurnSummaries } from "../collaboration/group-post-turn-summary";
import {
  GROUP_SESSION_LIFECYCLE_HEAD_DIR,
  readGroupSessionLifecycleCommitChain,
  readGroupSessionLifecycleHead,
  readGroupSessionLifecycleJournal,
  verifyGroupSessionLifecycleHead,
} from "../collaboration/group-session-lifecycle-head";
import { MemoryScope, MemoryAction, CONTROL_FILE, now, writeJsonAtomic, hash, cleanId, getControlsState, appendAudit } from "./memory-control-center-types";

export function getMemoryItemId(itemType: string, item: any, index = 0) {
  const explicit = item?.id || item?.messageId;
  if (explicit) return `${cleanId(itemType)}:${cleanId(explicit)}`;
  const identity = [item?.archiveId, item?.taskId, item?.groupId, item?.time, item?.timestamp, item?.decision, item?.summary, item?.text, item?.reason, item?.question, item?.action];
  if (!identity.some(Boolean)) identity.push(index);
  return `${cleanId(itemType)}:${hash(identity)}`;
}


export function editableField(itemType: string, item: any) {
  if (itemType === "factAnchors" || itemType === "persistentRequirements") return "text";
  if (itemType === "decisions") return "decision";
  if (itemType === "conclusions" || itemType === "completed" || itemType === "workerLedger") return "summary";
  if (itemType === "blocked") return "reason";
  if (itemType === "openQuestions") return typeof item === "string" ? "value" : "question";
  if (itemType === "nextActions") return typeof item === "string" ? "value" : "action";
  if (["user", "feedback", "authorization", "missions", "unresolved", "references"].includes(itemType)) return "text";
  return item?.text !== undefined ? "text" : item?.summary !== undefined ? "summary" : "value";
}


export function itemText(itemType: string, item: any) {
  if (typeof item === "string") return item;
  const field = editableField(itemType, item);
  return String(item?.[field] || item?.text || item?.summary || item?.decision || item?.reason || "");
}


export function scopeControls(scope: MemoryScope, scopeId: string) {
  return (getControlsState().controls || []).filter((item: any) => item.scope === scope && item.scopeId === scopeId);
}


export function applyListControls(scope: MemoryScope, scopeId: string, itemType: string, source: any[]) {
  const controls = scopeControls(scope, scopeId).filter((item: any) => item.itemType === itemType);
  const mapped = (Array.isArray(source) ? source : []).map((original: any, index: number) => {
    const id = getMemoryItemId(itemType, original, index);
    const control = controls.find((item: any) => item.itemId === id);
    let value: any = typeof original === "string" ? original : { ...original };
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
  }).filter((entry: any) => !entry.control?.deprecated);
  mapped.sort((a: any, b: any) => Number(!!b.control?.pinned) - Number(!!a.control?.pinned));
  return mapped.map((entry: any) => entry.value);
}


export function applyMemoryControls(scope: MemoryScope, scopeId: string, source: any) {
  const memory = JSON.parse(JSON.stringify(source || {}));
  const keys = scope === "group"
    ? ["factAnchors", "persistentRequirements", "decisions", "completed", "blocked", "workerLedger", "openQuestions", "nextActions"]
    : scope === "project" ? ["conclusions", "decisions"] : ["user", "feedback", "authorization", "decisions", "missions", "unresolved", "references"];
  for (const key of keys) memory[key] = applyListControls(scope, scopeId, key, memory[key]);
  if (scope === "project") {
    for (const archiveKey of ["conclusionArchives", "decisionArchives"]) {
      memory[archiveKey] = (memory[archiveKey] || []).map((archive: any) => ({
        ...archive,
        records: applyListControls(scope, scopeId, archiveKey === "conclusionArchives" ? "conclusions" : "decisions", (archive.records || []).map((item: any) => ({ ...item, archiveId: archive.id }))),
      }));
    }
  }
  return memory;
}


export function updateMemoryControl(input: {
  scope: MemoryScope; scopeId: string; itemType: string; itemId: string; action: MemoryAction;
  text?: string; reason?: string; actor?: string;
}) {
  const scope: MemoryScope = input.scope === "project" ? "project" : input.scope === "global" ? "global" : "group";
  const scopeId = String(input.scopeId || "").trim();
  const itemType = cleanId(input.itemType);
  const itemId = cleanId(input.itemId);
  const action = input.action;
  if (!scopeId || !itemType || !itemId) throw new Error("缺少记忆定位信息");
  if (!["pin", "unpin", "lock", "unlock", "edit", "deprecate", "delete", "restore"].includes(action)) throw new Error("不支持的记忆操作");
  if ((action === "edit" || action === "deprecate" || action === "delete") && !String(input.reason || "").trim()) throw new Error("修改或删除记忆时必须填写原因");
  if (action === "edit" && !String(input.text || "").trim()) throw new Error("修改后的记忆不能为空");

  const state = getControlsState();
  const controls = Array.isArray(state.controls) ? state.controls : [];
  const index = controls.findIndex((item: any) => item.scope === scope && item.scopeId === scopeId && item.itemType === itemType && item.itemId === itemId);
  const before = index >= 0 ? controls[index] : null;
  const current = { scope, scopeId, itemType, itemId, pinned: false, deprecated: false, ...(before || {}) };
  if (action === "pin" || action === "lock") current.pinned = true;
  if (action === "unpin" || action === "unlock") current.pinned = false;
  if (action === "edit") current.editedText = String(input.text || "").trim();
  if (action === "deprecate" || action === "delete") current.deprecated = true;
  if (action === "restore") {
    current.deprecated = false;
    delete current.editedText;
  }
  current.reason = String(input.reason || current.reason || "").trim();
  current.updatedAt = now();
  current.updatedBy = String(input.actor || "local-user");
  if (index >= 0) controls[index] = current; else controls.push(current);
  const next = { version: 1, controls, updatedAt: current.updatedAt };
  writeJsonAtomic(CONTROL_FILE, next);
  const audit = appendAudit({
    type: "memory_control", action, scope, scopeId, itemType, itemId,
    actor: current.updatedBy, reason: current.reason,
    beforeHash: before ? hash(before, 24) : "", afterHash: hash(current, 24),
  });
  return { control: current, audit };
}
