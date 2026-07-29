// 记忆系统可靠性改造自测：熔断冷却半开、展示态分离、蒸馏节流、
// 冲突检测、跨会话升格、模型判定 schema 校验与降级可见性。
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// CCM_DIR 是 ~/.cc-connect 的硬编码常量（没有 env 覆盖），落盘型断言只能写进真实
// 数据目录。因此：scope 名带 pid+时间戳保证每次唯一，且结束时无条件清理，
// 避免自测残留污染用户数据（与仓库既有自测隔离约定一致）。
const runId = `${process.pid}-${Date.now().toString(36)}`;
const CONFLICT_SCOPE = `memory-upgrade-selftest-conflict-${runId}`;
const PROMOTION_PROJECT = `memory-upgrade-selftest-project-${runId}`;
const JUDGMENT_SCOPE = `memory-upgrade-selftest-judgment-${runId}`;
const CCM_HOME = path.join(os.homedir(), ".cc-connect");
const residue = [
  path.join(CCM_HOME, "typed-memory-conflicts", `${CONFLICT_SCOPE}.json`),
  path.join(CCM_HOME, "typed-memory-conflicts", `${CONFLICT_SCOPE}.json.bak`),
  path.join(CCM_HOME, "promoted-memory", `${PROMOTION_PROJECT}.json`),
  path.join(CCM_HOME, "promoted-memory", `${PROMOTION_PROJECT}.json.bak`),
  path.join(CCM_HOME, "typed-memory-model-judgments", JUDGMENT_SCOPE),
];
const cleanup = () => {
  for (const target of residue) {
    try { fs.rmSync(target, { recursive: true, force: true }); } catch {}
  }
};
process.on("exit", cleanup);

const policy = await import("../ccm-package/dist/modules/collaboration/group-memory-auto-compact-circuit-policy.js");
const throttle = await import("../ccm-package/dist/modules/collaboration/group-typed-memory-distillation-throttle.js");
const conflict = await import("../ccm-package/dist/modules/collaboration/typed-memory-conflict.js");
const promotion = await import("../ccm-package/dist/modules/collaboration/typed-memory-promotion.js");
const judgment = await import("../ccm-package/dist/modules/collaboration/typed-memory-model-judgment.js");
const identity = await import("../ccm-package/dist/modules/knowledge/memory-control-center-identity.js");

let checks = 0;
const check = (condition, label) => { assert.ok(condition, label); checks += 1; };

// ---------------------------------------------------------------- 熔断策略
{
  const cancelled = policy.classifyAutoCompactFailure({ code: "GROUP_COMPACTION_CANCELLED" });
  check(cancelled.failureMode === "cancelled" && cancelled.countsTowardCircuit === false, "用户取消不计入熔断");

  const structural = policy.classifyAutoCompactFailure(new Error("exact_group_session_required_for_group_memory_compaction"));
  check(structural.failureMode === "structural", "会话身份错误判为结构性故障");

  const transient = policy.classifyAutoCompactFailure(new Error("model upstream 503"));
  check(transient.failureMode === "transient", "模型抖动判为可重试故障");

  const openedAt = new Date(Date.now() - 60 * 60_000).toISOString();
  const cooled = policy.evaluateAutoCompactCircuitAdmission({
    state: "open", blocked: true, failure_mode: "transient", open_count: 1,
    opened_at: openedAt, last_failure_at: openedAt,
  });
  check(cooled.allowed === true && cooled.probe === true && cooled.effectiveState === "half_open", "冷却期过后放行半开试探");

  const stillCooling = policy.evaluateAutoCompactCircuitAdmission({
    state: "open", blocked: true, failure_mode: "transient", open_count: 1,
    opened_at: new Date().toISOString(), last_failure_at: new Date().toISOString(),
  });
  check(stillCooling.allowed === false && !!stillCooling.retryAt, "冷却期内拦截但给出自动重试时间");

  const structuralOpen = policy.evaluateAutoCompactCircuitAdmission({
    state: "open", blocked: true, failure_mode: "structural", open_count: 1,
    opened_at: openedAt, last_failure_at: openedAt,
  });
  check(structuralOpen.allowed === false && !structuralOpen.retryAt, "结构性故障不自动半开，需人工重置");

  const backoff = policy.autoCompactCircuitCooldownMs(3, 60_000);
  check(backoff === 240_000, "重复打开按指数退避拉长冷却");

  // 展示态：硬熔断与软降级必须分开，不能互相冒充。
  const softOnly = policy.buildAutoCompactCircuitDisplayState({
    autoCompactCircuitBreaker: { state: "closed", consecutiveFailures: 0 },
    summaryFallbackFailures: 3,
  });
  check(softOnly.circuitOpen === false && softOnly.summaryDegraded === true, "摘要降级不报成压缩熔断");

  const hardOnly = policy.buildAutoCompactCircuitDisplayState({
    autoCompactCircuitBreaker: { state: "open", consecutiveFailures: 3, failureMode: "structural" },
    summaryFallbackFailures: 0,
  });
  check(hardOnly.circuitOpen === true && hardOnly.summaryDegraded === false, "真熔断能被正确上报");
  check(hardOnly.circuitRequiresManualReset === true, "结构性熔断标记需人工重置");

  const countOnlyLedger = policy.buildAutoCompactCircuitDisplayState({
    autoCompactCircuitBreaker: { consecutive_failures: 3 },
  });
  check(countOnlyLedger.circuitOpen === true, "只记计数不记状态的台账也能判定为熔断");
}

// ---------------------------------------------------------------- 蒸馏节流
{
  const compacted = throttle.decideTypedMemoryDistillationRun({ compacted: true, pendingMessageCount: 1 });
  check(compacted.run === true && compacted.reason === "compact_boundary_committed", "压缩落边界必须蒸馏");

  const throttled = throttle.decideTypedMemoryDistillationRun({
    pendingMessageCount: 2, lastDistilledAt: new Date().toISOString(), minPendingMessages: 12, maxIdleMs: 300_000,
  });
  check(throttled.run === false && throttled.reason === "throttled_below_batch_and_interval", "零星消息不进蒸馏事务");

  const batched = throttle.decideTypedMemoryDistillationRun({
    pendingMessageCount: 12, lastDistilledAt: new Date().toISOString(), minPendingMessages: 12,
  });
  check(batched.run === true && batched.reason === "pending_batch_reached", "攒够批量后蒸馏");

  const idle = throttle.decideTypedMemoryDistillationRun({
    pendingMessageCount: 1,
    lastDistilledAt: new Date(Date.now() - 30 * 60_000).toISOString(),
    minPendingMessages: 12, maxIdleMs: 300_000,
  });
  check(idle.run === true && idle.reason === "idle_interval_reached", "超过空闲间隔也会蒸馏");

  const maintenance = throttle.decideTypedMemoryDistillationRun({ maintenanceRequired: true, pendingMessageCount: 0 });
  check(maintenance.run === true, "台账维护不受批量阈值限制");
}

// ---------------------------------------------------------------- 冲突检测
{
  const prohibitRetry = {
    relPath: "rule-approval.md", name: "重试需审批", checksum: "c1",
    body: "失败后禁止直接重试，必须先等待人工确认审批后再重试。",
  };
  const allowRetry = {
    relPath: "rule-retry.md", name: "允许重试", checksum: "c2",
    body: "构建失败后可以直接重试，不需要人工确认。",
  };
  const unrelated = {
    relPath: "rule-style.md", name: "命名约定", checksum: "c3",
    body: "必须使用中文注释，接口命名保持一致。",
  };

  const scan = conflict.scanTypedMemoryConflicts(CONFLICT_SCOPE, [prohibitRetry, allowRetry, unrelated]);
  check(scan.pairCount >= 1, "相反极性 + 可执行概念重叠被识别为冲突");
  const pair = scan.pairs[0];
  check([pair.left.relPath, pair.right.relPath].sort().join(",") === "rule-approval.md,rule-retry.md", "冲突对指向正确的两个文档");
  check(!scan.pairs.some(item => [item.left.relPath, item.right.relPath].includes("rule-style.md")), "无关记忆不被误判为冲突");

  const idA = conflict.conflictPairId("s", "a.md", "b.md");
  const idB = conflict.conflictPairId("s", "b.md", "a.md");
  check(idA === idB, "冲突对 id 与文档顺序无关");

  conflict.recordTypedMemoryConflicts(CONFLICT_SCOPE, [prohibitRetry, allowRetry, unrelated]);
  const pendingIndex = conflict.buildTypedMemoryConflictRecallIndex(CONFLICT_SCOPE);
  const penalty = conflict.evaluateTypedMemoryConflictPenalty("rule-retry.md", pendingIndex);
  check(penalty.adjustment < 0 && penalty.suppressed === false, "未裁决冲突降权但不删除");

  conflict.resolveTypedMemoryConflict(CONFLICT_SCOPE, pair.pairId, {
    resolution: "keep_left", reason: "审批规则优先", actor: "selftest",
  });
  const resolvedIndex = conflict.buildTypedMemoryConflictRecallIndex(CONFLICT_SCOPE);
  const loserKey = pair.left.relPath === "rule-approval.md" ? "rule-retry.md" : "rule-approval.md";
  const winnerKey = loserKey === "rule-retry.md" ? "rule-approval.md" : "rule-retry.md";
  check(conflict.evaluateTypedMemoryConflictPenalty(loserKey, resolvedIndex).suppressed === true, "裁决淘汰方不再召回");
  check(conflict.evaluateTypedMemoryConflictPenalty(winnerKey, resolvedIndex).adjustment === 0, "裁决保留方恢复正常权重");

  assert.throws(() => conflict.resolveTypedMemoryConflict(CONFLICT_SCOPE, pair.pairId, { resolution: "keep_left" }), /原因/);
  checks += 1;
}

// ------------------------------------------------------------ 跨会话升格
{
  const highConfidence = promotion.evaluatePromotionCandidate({ type: "user", text: "必须先跑测试再提交", confidence: 0.95, usageWeight: 0 });
  check(highConfidence.promote === true, "高置信用户规则直接升格");

  const lowNoUsage = promotion.evaluatePromotionCandidate({ type: "user", text: "也许应该这样", confidence: 0.82, usageWeight: 0 });
  check(lowNoUsage.promote === false && lowNoUsage.reason === "insufficient_usage_evidence", "置信不足且没被用过不升格");

  const lowWithUsage = promotion.evaluatePromotionCandidate({ type: "user", text: "也许应该这样", confidence: 0.82, usageWeight: 2 });
  check(lowWithUsage.promote === true && lowWithUsage.reason === "repeatedly_used_durable_rule", "被反复用过的规则可升格");

  const reference = promotion.evaluatePromotionCandidate({ type: "reference", text: "https://example.com", confidence: 1 });
  check(reference.promote === false, "一次性外链不跨会话升格");

  const idA = promotion.promotionId("proj", "user", "必须先跑测试");
  const idB = promotion.promotionId("proj", "user", "  必须先跑测试  ");
  check(idA === idB, "升格幂等键忽略空白差异");

  // 撤销后不得被自动升格流程写回。
  const file = promotion.getPromotedMemoryFile(PROMOTION_PROJECT);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify({
    schema: "ccm-promoted-memory-store-v1",
    version: 1,
    project: PROMOTION_PROJECT,
    entries: [{ promotionId: "pm_keep", type: "user", text: "保留", status: "active", confidence: 0.95 },
      { promotionId: "pm_gone", type: "user", text: "已撤销", status: "revoked", confidence: 0.95 }],
    updatedAt: new Date().toISOString(),
  }, null, 2));
  const active = promotion.listActivePromotedMemory(PROMOTION_PROJECT);
  check(active.length === 1 && active[0].promotionId === "pm_keep", "已撤销的升格记忆不再对外可见");

  assert.throws(() => promotion.revokePromotedMemory(PROMOTION_PROJECT, "pm_keep", {}), /原因/);
  checks += 1;
  const revoked = promotion.revokePromotedMemory(PROMOTION_PROJECT, "pm_keep", { reason: "不再适用", actor: "selftest" });
  check(revoked.entry.status === "revoked", "撤销写入状态与原因");
}

// -------------------------------------------------------- 模型判定与降级
{
  const missingWhy = judgment.validateAdmissionJudgment({ id: "a", admit: true, confidence: 0.9, howToApply: "x" });
  check(missingWhy.valid === false && missingWhy.issues.includes("admitted_without_why"), "准入通过但没给理由的模型输出被拒");

  const badConfidence = judgment.validateAdmissionJudgment({ id: "a", admit: false, confidence: 7 });
  check(badConfidence.valid === false && badConfidence.issues.includes("confidence_out_of_range"), "越界置信度被 schema 拦下");

  const okAdmission = judgment.validateAdmissionJudgment({
    id: "a", admit: true, confidence: 0.9, why: "用户明确要求", howToApply: "后续任务照此执行",
  });
  check(okAdmission.valid === true && okAdmission.value.confidence === 0.9, "合法准入判定通过校验");

  const badRerank = judgment.validateRerankJudgment({ id: "d", relevance: -1 });
  check(badRerank.valid === false, "越界相关度被拒");

  const okRerank = judgment.validateRerankJudgment({ id: "d", relevance: 0.9, applicable: true });
  check(okRerank.valid === true, "合法重排判定通过校验");

  check(judgment.isMemoryModelJudgmentEnabled({}) === false, "未配置模型时判定通道默认关闭");
  check(judgment.isMemoryModelJudgmentEnabled({ enabled: true, apiUrl: "u", apiKey: "k", model: "m" }) === true, "配置齐全时判定通道开启");

  // 模型不可用必须降级可见，而不是静默退回正则。
  const degraded = await judgment.judgeMemoryAdmissionWithModel("scope", [{ id: "x", text: "必须先跑测试", category: "user" }], {});
  check(degraded.degraded === true && degraded.degradedReason === "model_judgment_disabled", "模型关闭时显式标注降级");

  const rerankDegraded = await judgment.rerankMemoryRecallWithModel("scope", "任务", [{ relPath: "a.md" }], {});
  check(rerankDegraded.degraded === true, "重排在模型不可用时显式降级");

  // 模型输出不合法时同样降级，不能把垃圾判定当真。
  const garbage = await judgment.judgeMemoryAdmissionWithModel(
    "scope",
    [{ id: "x", text: "必须先跑测试", category: "user" }],
    { modelCall: async () => "not json at all" },
  );
  check(garbage.degraded === true, "模型输出无法解析时降级");

  const wrongShape = await judgment.judgeMemoryAdmissionWithModel(
    "scope",
    [{ id: "y", text: "必须先跑测试", category: "user" }],
    { modelCall: async () => JSON.stringify({ judgments: [{ id: "y", admit: true, confidence: 2 }] }) },
  );
  check(wrongShape.degraded === true, "模型输出全部不合法时等同不可用");

  const good = await judgment.judgeMemoryAdmissionWithModel(
    JUDGMENT_SCOPE,
    [{ id: "z", text: "必须先跑测试再提交", category: "user" }],
    {
      modelCall: async () => JSON.stringify({
        judgments: [{ id: "z", admit: true, confidence: 0.93, why: "用户长期要求", howToApply: "每次提交前执行", durable: true, nonObvious: false }],
      }),
    },
  );
  check(good.degraded === false && good.byId.get("z")?.admit === true, "合法模型判定被采纳");

  const adjustment = judgment.modelRerankScoreAdjustment({ relevance: 1, applicable: true }, { weight: 14 });
  check(adjustment.adjustment === 14, "高相关度上浮");
  const notApplicable = judgment.modelRerankScoreAdjustment({ relevance: 0.9, applicable: false }, { weight: 14 });
  check(notApplicable.adjustment === -14, "模型判为不适用则强制下沉");
}

// ------------------------------------------------------ 控制项稳定身份
{
  const before = { archiveId: "arc-1", text: "压缩前的原文", updatedAt: "2026-01-01T00:00:00.000Z" };
  const after = { archiveId: "arc-1", text: "压缩后被改写的正文", updatedAt: "2026-02-01T00:00:00.000Z" };
  check(
    identity.memoryItemStableId("factAnchors", before) === identity.memoryItemStableId("factAnchors", after),
    "有稳定锚点时正文改写不会换 id",
  );
  check(
    identity.memoryItemLegacyId("factAnchors", before) !== identity.memoryItemLegacyId("factAnchors", after),
    "旧式 id 确实会因正文改写而漂移（这正是要修的问题）",
  );

  const legacyControl = { itemType: "factAnchors", itemId: identity.memoryItemLegacyId("factAnchors", before), pinned: true };
  const resolved = identity.resolveMemoryItemControl([legacyControl], "factAnchors", before);
  check(resolved.control?.pinned === true && resolved.matchedBy === "legacy", "历史控制项通过旧式 id 别名仍能命中");

  const liveIds = new Map([["group::g1", new Set(["factAnchors:live"])]]);
  const orphans = identity.collectOrphanMemoryControls(
    [
      { scope: "group", scopeId: "g1", itemType: "factAnchors", itemId: "factAnchors:gone", updatedAt: "2020-01-01T00:00:00.000Z" },
      { scope: "group", scopeId: "g1", itemType: "factAnchors", itemId: "factAnchors:live", updatedAt: "2020-01-01T00:00:00.000Z" },
      { scope: "group", scopeId: "unscanned", itemType: "factAnchors", itemId: "factAnchors:x", updatedAt: "2020-01-01T00:00:00.000Z" },
    ],
    liveIds,
  );
  check(orphans.length === 1 && orphans[0].itemId === "factAnchors:gone", "只回收确实失联且过保留期的控制项");
  check(!orphans.some(item => item.scopeId === "unscanned"), "本轮未扫描到的 scope 一律不回收");

  const recent = identity.collectOrphanMemoryControls(
    [{ scope: "group", scopeId: "g1", itemType: "factAnchors", itemId: "factAnchors:gone", updatedAt: new Date().toISOString() }],
    liveIds,
  );
  check(recent.length === 0, "保留期内的失联控制项不回收");
}

// --------------------------------------------------------------- 接线核查
{
  const contextSource = fs.readFileSync(new URL("../backend/modules/collaboration/group-memory-context.ts", import.meta.url), "utf8");
  assert.match(contextSource, /runTypedMemoryDistillationIfDue\(/);
  assert.match(contextSource, /outcome: "clean_run"/);
  assert.match(contextSource, /readGroupMemoryAutoCompactCircuitAdmission\(/);
  assert.match(contextSource, /applyModelRecallRerankToBundle\(/);
  assert.match(contextSource, /safeMemoryPromotionWithModel\(/);
  checks += 5;

  const loadingSource = fs.readFileSync(new URL("../backend/modules/collaboration/group-memory-loading.ts", import.meta.url), "utf8");
  assert.match(loadingSource, /evaluateTypedMemoryConflictPenalty\(doc\.relPath, semanticConflictIndex\)/);
  checks += 1;

  const apiSource = fs.readFileSync(new URL("../backend/modules/knowledge/memory-control-center-api.ts", import.meta.url), "utf8");
  assert.match(apiSource, /buildAutoCompactCircuitDisplayState\(/);
  checks += 1;

  const controlsSource = fs.readFileSync(new URL("../backend/modules/knowledge/memory-control-center-controls.ts", import.meta.url), "utf8");
  assert.match(controlsSource, /withMemoryCenterFileLock\(CONTROL_FILE/);
  checks += 1;

  const metricsSource = fs.readFileSync(new URL("../backend/modules/knowledge/memory-control-center-metrics.ts", import.meta.url), "utf8");
  assert.match(metricsSource, /appendFileSync/);
  checks += 1;
}

cleanup();

console.log(JSON.stringify({
  pass: true,
  checks,
  circuit_breaker_half_open: true,
  circuit_display_split_from_summary_degradation: true,
  distillation_throttled_from_compaction: true,
  doc_vs_doc_conflict_detection: true,
  cross_session_promotion: true,
  model_judgment_with_visible_degradation: true,
  stable_control_item_identity: true,
}, null, 2));
