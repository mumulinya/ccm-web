import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

// 审计文档不变量 #14：手动 compact 与自动 compact 必须满足相同的不变量。
//
// 此前两条路径从未被放在一起比较过。全仓 scripts/ 里 force:false 只出现一次,
// 断言只是个 trigger === "auto" 的标签检查,没有跟 manual 结果做任何对比。
// 而两条入口确有实质差异:手动路由(group-routes.ts:2827)传 force:true 绕过
// 熔断器准入并写死 memoryCompactionMode,自动路径靠阈值判定进入。
//
// 本测试用同一份夹具分别驱动两条路径,断言:
//   - 允许不同:trigger / type 标签(manual vs auto)
//   - 必须相同:压缩窗口、边界锚点、保留消息数、摘要来源、质量门结论
//
// 防空转:必须先断言两条路径都真的压缩了(compacted === true)。若任一路径
// 因阈值或熔断器未进入压缩,后面的"结构一致"断言就是在比较两个空对象。

const root = path.resolve(import.meta.dirname, "..");
const home = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-manual-auto-parity-"));
process.env.HOME = home;
process.env.USERPROFILE = home;

const require = createRequire(import.meta.url);
const compaction = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-memory-compaction.js"));

// 夹具必须够大以自然越过 getGroupAutoCompactThreshold 的 18k 硬地板,
// 否则自动路径不会触发,两条路径无从比较。
function buildMessages() {
  const messages = [];
  for (let index = 0; index < 140; index += 1) {
    messages.push({
      id: `u${index}`,
      role: "user",
      target: "coordinator",
      content: index === 0
        ? "实现订单审核并保留权限校验"
        : `补充要求 ${index} ${"内容".repeat(30)}`,
    });
    messages.push({
      id: `a${index}`,
      role: "assistant",
      agent: "backend",
      content: `进度 ${index}, 文件 src/order-${index}.ts ${"结果".repeat(30)}`,
    });
  }
  return messages;
}

const memory = { goal: "订单审核", nextActions: [{ action: "继续测试" }] };

// 回显引擎自己算出的保真校验参照。引擎按实际压缩窗口重算 validationFallback,
// 外部无法预知,因此从 prompt 里解析后原样返回,使摘要必然通过保真校验。
async function echoSummarizer({ user }) {
  const marker = "保真校验参考（最终摘要必须由模型生成并完整覆盖这些事实）：\n";
  const start = user.indexOf(marker) + marker.length;
  const end = user.indexOf("\n", start);
  const reference = JSON.parse(user.slice(start, end));
  return {
    summary: {
      ...reference,
      primaryRequest: reference.primaryRequest || "实现订单审核并保留权限校验",
      currentWork: reference.currentWork || "继续测试",
    },
  };
}

function config(extra = {}) {
  return {
    minKeepMessages: 2,
    minKeepTokens: 1,
    maxKeepTokens: 200,
    memoryCompactionUseModel: true,
    compactionModelCall: echoSummarizer,
    // 阈值需高于压缩后体积、低于压缩前活跃量,两条路径才都能落地提交
    modelContextWindow: 120_000,
    modelAutoCompactTokenLimit: 25_000,
    ...extra,
  };
}

function runCompaction(tag, force, extra = {}) {
  return compaction.compactGroupConversationMemory({
    groupId: `parity-${tag}`,
    groupSessionId: `gcs_parity_${tag}`,
    messages: buildMessages(),
    memory: { ...memory, compaction: {} },
    transcriptPath: "raw.json",
    force,
    config: config(extra),
  });
}

// 手动路径:复刻 group-routes.ts:2827 的调用形态
const manual = await runCompaction("manual", true, { memoryCompactionMode: "model-required" });
// 自动路径:不传 force,走真实阈值判定
const auto = await runCompaction("auto", false);

// ---------------------------------------------------------------------------
// 防空转前置:两条路径都必须真的压缩了
// ---------------------------------------------------------------------------
assert.equal(manual.compacted, true, "手动路径必须完成压缩,否则无从比较");
assert.equal(
  auto.compacted, true,
  `自动路径必须越过阈值并完成压缩,否则后续结构断言是在比较空对象。`
  + `reason=${auto.compactStrategyDecision?.reason || ""}`,
);

// ---------------------------------------------------------------------------
// 允许不同:trigger / type 是入口标签,本就该区分
// ---------------------------------------------------------------------------
assert.equal(manual.boundary?.type, "manual", "手动压缩的 boundary.type 必须是 manual");
assert.equal(auto.boundary?.type, "auto", "自动压缩的 boundary.type 必须是 auto");
assert.equal(manual.boundary?.compactMetadata?.trigger, "manual");
assert.equal(auto.boundary?.compactMetadata?.trigger, "auto");
assert.notEqual(
  manual.boundary?.type, auto.boundary?.type,
  "两条路径的 type 必须可区分,否则说明标签没生效",
);

// ---------------------------------------------------------------------------
// 必须相同:压缩窗口与边界锚点
// ---------------------------------------------------------------------------
assert.equal(
  manual.boundary?.summarizedMessageCount,
  auto.boundary?.summarizedMessageCount,
  "同一夹具下两条路径压缩的消息数必须一致",
);
assert.equal(
  manual.boundary?.summarizedFromMessageId,
  auto.boundary?.summarizedFromMessageId,
  "边界起点必须一致",
);
assert.equal(
  manual.boundary?.summarizedThroughMessageId,
  auto.boundary?.summarizedThroughMessageId,
  "边界终点必须一致",
);
assert.equal(
  manual.boundary?.preservedMessageIds?.length,
  auto.boundary?.preservedMessageIds?.length,
  "保留的近期消息数必须一致",
);
assert.deepEqual(
  manual.boundary?.preservedMessageIds,
  auto.boundary?.preservedMessageIds,
  "保留的具体消息必须一致",
);

// ---------------------------------------------------------------------------
// 必须相同:摘要来源与质量门结论
// ---------------------------------------------------------------------------
assert.equal(
  manual.memory?.unifiedSessionCompaction?.summarySource,
  auto.memory?.unifiedSessionCompaction?.summarySource,
  "摘要来源必须一致(都应为 model)",
);
assert.equal(manual.memory?.unifiedSessionCompaction?.summarySource, "model", "手动压缩摘要必须由模型生成");
assert.equal(
  manual.memory?.unifiedSessionCompaction?.qualityStatus,
  auto.memory?.unifiedSessionCompaction?.qualityStatus,
  "质量门结论必须一致",
);
assert.equal(manual.memory?.unifiedSessionCompaction?.qualityStatus, "passed", "手动压缩必须通过质量门");

// 原始 transcript 在两条路径下都不得被改写
assert.equal(
  manual.memory?.unifiedSessionCompaction?.contentStored === false,
  true,
  "手动压缩不得破坏原始 transcript",
);
assert.equal(
  auto.memory?.unifiedSessionCompaction?.contentStored === false,
  true,
  "自动压缩不得破坏原始 transcript",
);

console.log(JSON.stringify({
  schema: "ccm-manual-auto-compact-parity-selftest-v1",
  pass: true,
  manual: {
    compacted: manual.compacted,
    type: manual.boundary?.type,
    trigger: manual.boundary?.compactMetadata?.trigger,
    summarized: manual.boundary?.summarizedMessageCount,
    preserved: manual.boundary?.preservedMessageIds?.length,
    source: manual.memory?.compaction?.summarySource,
  },
  auto: {
    compacted: auto.compacted,
    type: auto.boundary?.type,
    trigger: auto.boundary?.compactMetadata?.trigger,
    summarized: auto.boundary?.summarizedMessageCount,
    preserved: auto.boundary?.preservedMessageIds?.length,
    source: auto.memory?.compaction?.summarySource,
  },
  shared_invariants: {
    boundary_from: manual.boundary?.summarizedFromMessageId,
    boundary_through: manual.boundary?.summarizedThroughMessageId,
    summarized_count: manual.boundary?.summarizedMessageCount,
    quality_pass: manual.memory?.compaction?.quality?.pass,
  },
}, null, 2));

fs.rmSync(home, { recursive: true, force: true });
