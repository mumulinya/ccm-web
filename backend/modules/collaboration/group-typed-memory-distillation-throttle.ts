// 类型化记忆蒸馏节流。
//
// 原先蒸馏挂在自动压缩流程里：每条消息 append 都会触发一次，即使压缩因为
// 低于阈值被跳过，蒸馏仍然照跑一遍——租约锁、事务、artifact staging 的固定
// 开销每轮都要付。这里把「是否该蒸馏」独立成按批量/间隔的节流决策，
// 压缩真正落边界时仍然强制蒸馏（折叠前必须先把内容提炼出来）。

export const TYPED_MEMORY_DISTILLATION_MIN_PENDING_MESSAGES = Math.max(
  1,
  Number(process.env.CCM_TYPED_MEMORY_DISTILLATION_MIN_PENDING_MESSAGES || 12)
);

export const TYPED_MEMORY_DISTILLATION_MAX_IDLE_MS = Math.max(
  10_000,
  Number(process.env.CCM_TYPED_MEMORY_DISTILLATION_MAX_IDLE_MS || 5 * 60_000)
);

function timeMs(value: any) {
  const parsed = Date.parse(String(value || ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

/** 纯决策函数：给定 preflight 信号，判断本轮是否值得进蒸馏事务。 */
export function decideTypedMemoryDistillationRun(input: any = {}) {
  const nowMs = Number(input.nowMs || Date.now());
  const minPending = Math.max(1, Number(input.minPendingMessages || TYPED_MEMORY_DISTILLATION_MIN_PENDING_MESSAGES));
  const maxIdleMs = Math.max(1_000, Number(input.maxIdleMs || TYPED_MEMORY_DISTILLATION_MAX_IDLE_MS));
  const pendingMessageCount = Math.max(0, Number(input.pendingMessageCount || 0));
  const lastDistilledMs = timeMs(input.lastDistilledAt);
  const idleMs = lastDistilledMs > 0 ? Math.max(0, nowMs - lastDistilledMs) : Number.POSITIVE_INFINITY;

  const base = {
    schema: "ccm-typed-memory-distillation-throttle-v1",
    pendingMessageCount,
    minPendingMessages: minPending,
    maxIdleMs,
    idleMs: Number.isFinite(idleMs) ? idleMs : null,
    lastDistilledAt: String(input.lastDistilledAt || ""),
  };

  // 压缩已经落边界：被折叠的原文必须先蒸馏，否则长期记忆会缺这一段。
  if (input.compacted === true) return { ...base, run: true, reason: "compact_boundary_committed" };
  if (input.force === true) return { ...base, run: true, reason: "forced" };
  if (input.disabled === true) return { ...base, run: false, reason: "disabled" };
  // 台账自身需要维护（驱逐、归档变更、回收）时不受批量阈值限制。
  if (input.maintenanceRequired === true) return { ...base, run: true, reason: "ledger_maintenance_required" };
  if (input.recoveryRequired === true) return { ...base, run: true, reason: "transaction_recovery_required" };
  if (pendingMessageCount <= 0) return { ...base, run: false, reason: "no_pending_messages" };
  if (pendingMessageCount >= minPending) return { ...base, run: true, reason: "pending_batch_reached" };
  if (idleMs >= maxIdleMs) return { ...base, run: true, reason: "idle_interval_reached" };
  return { ...base, run: false, reason: "throttled_below_batch_and_interval" };
}

/** 节流后的跳过结果，形状与蒸馏的 skipped 返回保持兼容。 */
function throttledSkipResult(groupId: string, decision: any, preflight: any, ledger: any) {
  return {
    schema: "ccm-group-typed-memory-distillation-v1",
    version: Number(ledger?.version || 1),
    groupId,
    skipped: true,
    reason: `throttled:${decision.reason}`,
    throttle: decision,
    preflight,
    ledgerFile: ledger?.file || "",
    sourceMessageCount: 0,
    candidateCount: 0,
    extractedCandidateCount: 0,
    rejectedCandidateCount: 0,
    evictedExistingFactCount: 0,
    newFactCount: 0,
    updatedFactCount: 0,
    writeCount: 0,
    removalCount: 0,
    writes: [],
    removals: [],
    quality: ledger?.quality || null,
    admission: ledger?.admission || null,
    lastDistilledMessageId: String(preflight?.previousCommittedMessageId || ""),
    distilledAt: String(ledger?.lastDistilledAt || ledger?.updatedAt || ""),
  };
}

/**
 * 按节流策略决定是否真正执行蒸馏。惰性 require 目标模块，避免与
 * group-memory-distillation / group-memory-context 之间形成循环依赖。
 */
export function runTypedMemoryDistillationIfDue(groupId: string, messages: any[] = [], memory: any = {}, options: any = {}) {
  const distillation = require("./group-memory-distillation");
  const preflight = distillation.inspectGroupTypedMemoryDistillationWork(groupId, messages, options);
  const ledger = distillation.readGroupTypedMemoryDistillationLedger(groupId);
  const decision = decideTypedMemoryDistillationRun({
    compacted: options.compacted === true,
    force: options.force === true || options.forceDistillation === true,
    disabled: preflight.disabled === true,
    maintenanceRequired: preflight.maintenanceRequired === true || preflight.postCompactUsageArchiveChanged === true,
    recoveryRequired: preflight.recoveryRequired === true,
    pendingMessageCount: preflight.pendingMessageCount,
    lastDistilledAt: ledger?.lastDistilledAt || ledger?.updatedAt || "",
    minPendingMessages: options.distillMinPendingMessages,
    maxIdleMs: options.distillMaxIdleMs,
    nowMs: options.nowMs,
  });
  if (!decision.run) return throttledSkipResult(groupId, decision, preflight, ledger);
  const result = distillation.distillGroupMessagesToTypedMemory(groupId, messages, memory, options);
  // 蒸馏落盘后立刻做一次 doc 对 doc 冲突扫描：新写入的规则可能与既有规则打架。
  let conflictScan: any = null;
  if (result?.skipped !== true) {
    try {
      const docs = require("./typed-memory-index-build").scanGroupTypedMemoryDocuments(groupId);
      const scan = require("./typed-memory-conflict").recordTypedMemoryConflicts(groupId, docs, {});
      conflictScan = { pairCount: scan.pairCount, persisted: scan.persisted === true, scannedDocCount: scan.scannedDocCount };
    } catch (error: any) {
      conflictScan = { failed: true, error: String(error?.message || error).slice(0, 200) };
    }
  }
  return { ...result, throttle: decision, conflictScan };
}
