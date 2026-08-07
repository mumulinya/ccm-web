import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

// 审计文档不变量 #17 / #19：
//   #17 Compact Boundary 变更后，旧 cursor 必须被拒绝，子 Agent 必须重新 hydration
//   #19 Provider 切换必须建立新 generation，不得沿用旧 provider 的上下文血缘
//
// 两条共用 createThirdPartyMemorySnapshot 里的 sameLineage 判定
// (backend/integrations/third-party-memory-snapshot.ts)，因此用同一组夹具覆盖。
//
// 防空转设计：三个分支互为对照。必须先证明"同血缘"这一路真的走到
// delta_available 且保留 cursor，"boundary 变更"和"provider 切换"两路的
// 拒绝断言才有意义——否则 sameLineage 恒假时所有断言都会假绿灯通过。

const root = path.resolve(import.meta.dirname, "..");
const home = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-boundary-cursor-fence-"));
process.env.HOME = home;
process.env.USERPROFILE = home;

const require = createRequire(import.meta.url);
const snapshot = require(path.join(root, "ccm-package", "dist", "integrations", "third-party-memory-snapshot.js"));

const project = "boundary-fence-project";
const projectSessionId = "bfs1";

const messages = Array.from({ length: 6 }, (_, index) => ({
  id: `m${index}`,
  role: index % 2 ? "assistant" : "user",
  content: `轮次 ${index} ${"会话内容".repeat(40)}`,
}));

function createSnapshot(extra = {}) {
  return snapshot.createThirdPartyMemorySnapshot({
    bindingKind: "project_session",
    role: "project-agent",
    project,
    projectSessionId,
    provider: "codex",
    nativeGeneration: 1,
    boundaryGeneration: 0,
    mode: "precompact_full_raw",
    messages,
    memoryItems: [
      { id: "req1", kind: "project_memory", source: project, required: true, content: "必须运行 npm test。" },
    ],
    pageTokens: 1000,
    modelContextWindow: 200_000,
    autoCompactThreshold: 167_000,
    requestText: "继续实现",
    ...extra,
  });
}

// ---------------------------------------------------------------------------
// 建立基线：完成一次完整 hydration 握手并确认，产生一个可继承的 cursor
// 关键：createThirdPartyMemorySnapshot 内部从磁盘读取 readLatestSnapshot(key)
// 来决定 previous，不使用 input.previous，因此这三个快照必须顺序创建
// ---------------------------------------------------------------------------
const baseline = createSnapshot();
const context = {
  project,
  projectSessionId,
  memorySnapshotId: baseline.id,
  memorySnapshotChecksum: baseline.checksum,
};

snapshot.getThirdPartyMemoryManifest(context);
for (const segmentId of baseline.requiredSegmentIds) {
  snapshot.readThirdPartySessionContext(context, { segmentId });
}
if (baseline.requiredMemoryItemIds.length) {
  snapshot.readThirdPartyMemoryItems(context, baseline.requiredMemoryItemIds);
}

const inspected = snapshot.inspectThirdPartyMemoryHydration(context);
assert.equal(inspected.ready, true, `基线 hydration 必须就绪，缺失段=${inspected.missingSegmentIds.join(",")}`);
snapshot.acknowledgeThirdPartyMemoryHydration(context);

assert.equal(baseline.rehydrationReason, "initial_generation", "首个快照必须标记为初始代际");

// ---------------------------------------------------------------------------
// 对照组（防空转）：血缘未变时必须走增量，且继承 cursor
// 现在 createSnapshot 会从磁盘读取 baseline（刚写入的最新快照）作为 previous
// ---------------------------------------------------------------------------
const sameLineage = createSnapshot();

assert.equal(
  sameLineage.rehydrationReason,
  "delta_available",
  "血缘未变时必须走增量路径，否则后续拒绝断言无区分力",
);
assert.equal(sameLineage.rehydrationRequired, false, "血缘未变时不得要求重新 hydration");
assert.equal(
  sameLineage.previousAcknowledgedCursor,
  baseline.messageCursor,
  `血缘未变时必须继承已确认 cursor(${baseline.messageCursor})`,
);

// 让每个变更分支都从"一个已确认握手的 baseline"重新出发。
// 必须换独立 HOME：createThirdPartyMemorySnapshot 从磁盘读 latest 快照作为
// previous，若共用目录，前一个分支的落盘会成为后一个分支的 previous，
// 从而掩盖真正的判定条件。
function withFreshAckedBaseline(extra) {
  const branchHome = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-boundary-cursor-fence-branch-"));
  process.env.HOME = branchHome;
  process.env.USERPROFILE = branchHome;

  const base = createSnapshot();
  const branchContext = {
    project,
    projectSessionId,
    memorySnapshotId: base.id,
    memorySnapshotChecksum: base.checksum,
  };
  snapshot.getThirdPartyMemoryManifest(branchContext);
  for (const segmentId of base.requiredSegmentIds) {
    snapshot.readThirdPartySessionContext(branchContext, { segmentId });
  }
  if (base.requiredMemoryItemIds.length) {
    snapshot.readThirdPartyMemoryItems(branchContext, base.requiredMemoryItemIds);
  }
  snapshot.acknowledgeThirdPartyMemoryHydration(branchContext);

  return { base, next: createSnapshot(extra) };
}

// ---------------------------------------------------------------------------
// 不变量 #17：boundaryGeneration 前进后，旧 cursor 必须失效
// ---------------------------------------------------------------------------
const { base: boundaryBase, next: boundaryAdvanced } = withFreshAckedBaseline({ boundaryGeneration: 1 });

assert.equal(
  boundaryBase.messageCursor,
  baseline.messageCursor,
  "分支 baseline 必须与主 baseline 同形，否则两条分支不可比",
);

assert.equal(
  boundaryAdvanced.rehydrationReason,
  "identity_or_boundary_changed",
  "Boundary 变更后必须判定为身份/边界已变",
);
assert.equal(boundaryAdvanced.rehydrationRequired, true, "Boundary 变更后必须要求重新 hydration");
assert.equal(
  boundaryAdvanced.previousAcknowledgedCursor,
  "",
  "Boundary 变更后旧 cursor 必须被清空，不得让子 Agent 继续沿用",
);
assert.equal(
  boundaryAdvanced.previousSnapshotId,
  "",
  "Boundary 变更后不得继承旧快照 id",
);

// ---------------------------------------------------------------------------
// 不变量 #19：Provider 切换必须建立新代际，不沿用旧 provider 血缘
// ---------------------------------------------------------------------------
const { next: providerSwitched } = withFreshAckedBaseline({ provider: "anthropic" });

assert.equal(
  providerSwitched.rehydrationReason,
  "identity_or_boundary_changed",
  "Provider 切换后必须判定为身份已变",
);
assert.equal(providerSwitched.rehydrationRequired, true, "Provider 切换后必须要求重新 hydration");
assert.equal(
  providerSwitched.previousAcknowledgedCursor,
  "",
  "Provider 切换后不得沿用旧 provider 的已确认 cursor",
);
assert.equal(
  providerSwitched.provider,
  "anthropic",
  "新快照必须记录切换后的 provider",
);

// nativeGeneration 前进同样应触发重新 hydration
const { next: generationAdvanced } = withFreshAckedBaseline({ nativeGeneration: 2 });
assert.equal(
  generationAdvanced.rehydrationRequired,
  true,
  "nativeGeneration 前进后必须要求重新 hydration",
);

console.log(JSON.stringify({
  schema: "ccm-boundary-cursor-fence-selftest-v1",
  pass: true,
  invariants: {
    same_lineage_uses_delta: {
      reason: sameLineage.rehydrationReason,
      rehydration_required: sameLineage.rehydrationRequired,
      inherited_cursor: sameLineage.previousAcknowledgedCursor,
    },
    boundary_change_rejects_cursor: {
      reason: boundaryAdvanced.rehydrationReason,
      rehydration_required: boundaryAdvanced.rehydrationRequired,
      cursor_cleared: boundaryAdvanced.previousAcknowledgedCursor === "",
    },
    provider_switch_starts_new_generation: {
      reason: providerSwitched.rehydrationReason,
      rehydration_required: providerSwitched.rehydrationRequired,
      cursor_cleared: providerSwitched.previousAcknowledgedCursor === "",
      provider: providerSwitched.provider,
    },
  },
}, null, 2));
