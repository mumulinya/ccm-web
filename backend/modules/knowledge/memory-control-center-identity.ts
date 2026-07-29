// 记忆条目身份：把「稳定锚点」与「易变正文」分开。
//
// 旧实现把 archiveId/taskId/time 与 decision/summary/text 一起哈希，压缩或蒸馏
// 改写正文就会换 id，导致用户之前的 pin / deprecate 全部失效（被删的记忆复活、
// 置顶的掉下来）。这里改成：只要存在稳定锚点就只按锚点取 id，正文哈希仅在
// 完全没有锚点时兜底；同时保留旧式 id 作为别名，历史控制项不丢。

import { cleanId, hash } from "./memory-control-center-types";

export const MEMORY_ITEM_IDENTITY_VERSION = 2;

// 与正文无关、可跨改写存活的锚点字段。
const STABLE_ANCHOR_KEYS = ["archiveId", "messageId", "taskId", "missionId", "checksum", "factId", "recordId"];

function anchorValues(item: any) {
  if (!item || typeof item !== "object") return [];
  const direct = STABLE_ANCHOR_KEYS.map(key => item[key]).filter(Boolean);
  const source = item.source || {};
  const nested = [
    source.messageIds?.[0],
    source.messageId,
    source.taskId,
    source.missionId,
    source.sessionId && source.timestamp ? `${source.sessionId}@${source.timestamp}` : "",
  ].filter(Boolean);
  return [...direct, ...nested].map((value: any) => String(value));
}

function volatileValues(item: any) {
  if (!item || typeof item !== "object") return [];
  return [item.decision, item.summary, item.text, item.reason, item.question, item.action, item.content]
    .filter(Boolean)
    .map((value: any) => String(value));
}

function creationTime(item: any) {
  if (!item || typeof item !== "object") return "";
  // createdAt/firstSeenAt 不随正文改写变化，updatedAt 会，故不参与身份。
  return String(item.createdAt || item.firstSeenAt || item.time || item.timestamp || item.source?.timestamp || "");
}

/**
 * 稳定 id：优先显式 id → 稳定锚点 → (分组 + 创建时间) → 正文哈希兜底。
 */
export function memoryItemStableId(itemType: string, item: any, index = 0) {
  const type = cleanId(itemType);
  const explicit = item?.id || item?.messageId;
  if (explicit) return `${type}:${cleanId(explicit)}`;

  const anchors = anchorValues(item);
  if (anchors.length) return `${type}:a${hash(anchors)}`;

  const groupAnchor = [item?.groupId, creationTime(item)].filter(Boolean).map((value: any) => String(value));
  if (groupAnchor.length >= 2) return `${type}:t${hash(groupAnchor)}`;

  const volatile = volatileValues(item);
  if (volatile.length) return `${type}:c${hash(volatile)}`;

  return `${type}:${hash([index])}`;
}

/**
 * 旧式 id（v1）：archiveId/taskId/groupId/time/正文 混合哈希。
 * 仅用于把历史控制项迁移到稳定 id，不再用于新写入。
 */
export function memoryItemLegacyId(itemType: string, item: any, index = 0) {
  const explicit = item?.id || item?.messageId;
  if (explicit) return `${cleanId(itemType)}:${cleanId(explicit)}`;
  const identity = [item?.archiveId, item?.taskId, item?.groupId, item?.time, item?.timestamp, item?.decision, item?.summary, item?.text, item?.reason, item?.question, item?.action];
  if (!identity.some(Boolean)) identity.push(index);
  return `${cleanId(itemType)}:${hash(identity)}`;
}

/** 一个条目当前可被匹配到的全部 id（稳定 id 优先，旧式 id 作为别名）。 */
export function memoryItemIdAliases(itemType: string, item: any, index = 0) {
  const stable = memoryItemStableId(itemType, item, index);
  const legacy = memoryItemLegacyId(itemType, item, index);
  return stable === legacy ? [stable] : [stable, legacy];
}

/** 按稳定 id 与别名解析控制项，返回命中的控制项及其是否为旧式命中。 */
export function resolveMemoryItemControl(controls: any[], itemType: string, item: any, index = 0) {
  const [stableId, legacyId] = memoryItemIdAliases(itemType, item, index);
  const scoped = (Array.isArray(controls) ? controls : []).filter((entry: any) => entry?.itemType === itemType);
  const exact = scoped.find((entry: any) => entry.itemId === stableId);
  if (exact) return { control: exact, itemId: stableId, matchedBy: "stable" };
  if (legacyId) {
    const legacy = scoped.find((entry: any) => entry.itemId === legacyId);
    if (legacy) return { control: legacy, itemId: stableId, matchedBy: "legacy" };
  }
  return { control: null, itemId: stableId, matchedBy: "none" };
}

/**
 * 孤儿控制项：既匹配不上任何现存条目，且已超过保留期。
 * 保留期存在的意义是——记忆可能只是暂时不在召回窗口内，不能一看不见就删。
 */
export function collectOrphanMemoryControls(controls: any[], liveIdsByScope: Map<string, Set<string>>, options: any = {}) {
  const retentionDays = Math.max(1, Number(options.retentionDays || 60));
  const nowMs = Number(options.nowMs || Date.now());
  const cutoffMs = nowMs - retentionDays * 24 * 60 * 60 * 1000;
  return (Array.isArray(controls) ? controls : []).filter((entry: any) => {
    const scopeKey = `${entry?.scope || ""}::${entry?.scopeId || ""}`;
    const live = liveIdsByScope.get(scopeKey);
    // 该 scope 本轮没有被扫描到，无法判断存活与否，保守保留。
    if (!live) return false;
    if (live.has(String(entry?.itemId || ""))) return false;
    const updatedMs = Date.parse(String(entry?.updatedAt || ""));
    return Number.isFinite(updatedMs) && updatedMs < cutoffMs;
  });
}
