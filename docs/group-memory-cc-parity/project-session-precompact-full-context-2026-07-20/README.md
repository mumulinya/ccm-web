# 项目会话压缩前完整上下文回注

Date: 2026-07-20

## 目标

修复独立项目 Agent 在第三方 Agent 原生会话首次创建、Provider 切换或压缩后新世代启动时的上下文恢复差异：未发生正式模型压缩时必须回注当前项目会话全部历史原文，不能提前套用 `10K-40K token` 近期窗口。

## 最终流程

```text
项目会话收到用户消息
  -> 服务端按完整 model-visible payload 执行自动压缩预检
  -> 原生第三方会话可证明连续：继续原生 session，不重复回注 transcript
  -> 需要新原生 generation：
       未正式压缩 -> 全部历史原文 + 当前请求
       已正式压缩 -> 正式模型摘要 + 10K-40K 动态近期原文 + 当前请求
  -> 最终 prompt 交给 Codex / Claude Code / Cursor
```

当前请求由调用层单独加入最终 prompt。连续性构建器只在 transcript 最后一条确实是同内容的用户消息时删除该副本；直接 API 未预存消息时不会再误删上一条 Agent 回复。

## 实现约束

- `precompact_full_raw`：没有可信模型摘要或 Session Memory 时，回注本轮请求之前的全部 `user/assistant` 原文。
- `canonical_summary_recent_raw`：只有可信摘要通过来源与 checksum 校验后，才使用完整轮次的动态近期窗口。
- 本地摘要、旧 `local_structured` 摘要、固定消息条数和字符裁切都不能进入项目会话连续性上下文。
- 原始 transcript 永不删除；这次修改不改变 compact head、项目长期记忆或原生 generation 的事务边界。
- 同一 Provider 的有效原生会话继续复用，不重复发送历史；Provider 切换或成功 compact 后的新世代才恢复 CCM 连续性上下文。

## 代码

- `backend/modules/projects/project-session-compaction.ts`
  - 新增当前请求精确去重。
  - 未压缩使用完整原文，压缩后使用正式摘要与动态近期原文。
  - 连续性包显式记录两种模式及去重结果。
- `backend/server.ts`
  - 将本轮 `finalMessage` 传给连续性构建器，避免前端预存消息重复进入 Provider prompt。
- `scripts/project-session-native-binding-restart-selftest.mjs`
  - 增加超过 40K token 的未压缩会话、最早消息保留、当前请求去重和直接 API 末条 assistant 保留验证。

## 验证

- `npm run test:project-session-native-binding-restart`：`84/84` 通过，真实付费 Provider 调用为 `0`。
- `node scripts/project-memory-business-flow-v4-selftest.mjs`：`30/30` 通过。
- `node scripts/all-session-cc-compaction-alignment-selftest.mjs`：`51/51` 通过。
- backend TypeScript production build 通过。

项目管理生命周期测试当前仍在既有 `tasks.json` 保留断言处失败；失败位置与本次上下文构建、会话压缩和项目记忆代码无关，本次没有借机改动项目永久删除策略。
