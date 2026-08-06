# 项目长期记忆业务流程 V4

日期：2026-07-19

## 目标

项目子 Agent 会频繁创建新会话，因此项目仍需要跨会话记忆；但长期记忆不再承担任务回放职责。本次将原来的“每次回执都追加并固定注入”调整为“任务历史可追溯、长期记忆通过门禁、上下文按需召回”。

## 新业务流程

```text
第三方项目 Agent 返回 CCM_AGENT_RECEIPT
  -> 普通摘要、文件和验证写入 taskHistory
  -> 同一 taskId + agent 幂等更新，不重复追加
  -> projectMemory 提交长期记忆候选
  -> 主 Agent 完成最终验收
  -> status=done 且 acceptance gate 通过
  -> 按类型去重并提交 durableMemories
  -> 新子 Agent 获得核心长期记忆 + 本轮相关历史证据
```

失败、阻塞、返工中、未通过最终验收的回执只能进入任务历史，不能成为正式长期记忆。

## 数据职责

### taskHistory

- 保存最近 80 条任务执行记录，用于审计与按任务关键词召回。
- 同一任务和项目 Agent 再次执行时更新原记录。
- 不再固定注入最近三条任务总结。
- 测试输出、修改文件和普通完成总结不会自动成为长期知识。

### durableMemories

只接收以下类型：

- `constraint`：用户长期约束和项目规则。
- `decision`：关键架构或实现决策及原因。
- `fact`：跨会话稳定且经过本轮证据支持的事实。
- `lesson`：值得避免重复发生的历史经验。
- `risk`：仍然有效的已知风险。
- `open_item`：需要后续继续处理的事项。
- `contract`：稳定的接口、schema、配置或消费者契约。

内容按“类型 + 规范化文本”去重；重复出现时更新证据、关联文件、来源任务和出现次数。`resolved` 与 `superseded` 记录保留审计，但不再注入。

系统还会拒绝“任务已完成”“测试通过”“暂无”等空泛候选，避免 Agent 虽然填写了 `projectMemory`，却把普通状态重新混入长期记忆。

## 回执协议

`CCM_AGENT_RECEIPT` 新增 `projectMemory`：

```json
{
  "projectMemory": {
    "constraints": [],
    "decisions": [],
    "facts": [],
    "lessons": [],
    "risks": [],
    "openItems": [],
    "contracts": []
  }
}
```

Agent 被明确要求不要把普通总结、文件清单、测试输出、临时状态和可直接从源码读取的信息填入该字段。没有长期价值时保持空数组。

## 上下文注入

项目执行简报现在包含：

- 项目定位、工作目录、技术栈和资源配置。
- 最多 24 条与当前任务相关或必须持续遵守的有效长期记忆。
- 通过关键词从任务历史和旧归档召回的最多 6 条执行证据。
- 当前 Git 状态和“必须核验真实源码”的执行规则。

不再默认注入：最近三条任务总结、全部历史压缩摘要、历史决策归档全文、缓存目录树和最近修改文件列表。

## 旧数据兼容

- 项目记忆版本升级为 V4，读取时惰性补齐新字段。
- 旧 `conclusions`、`conclusionArchives`、`decisions` 和归档不删除。
- 旧任务结论只在匹配当前任务时作为历史证据召回，不再默认进入上下文。
- 原有备份、归档 checksum 和恢复逻辑继续保留。

## 记忆中心

项目长期记忆不再显示会话的“自动压缩线”，改为展示：

- 实际可注入上下文 Token 估算。
- 有效长期记忆条数。
- 任务历史条数。
- “验收后提交”写入策略。

详情区只展示 V4 `durableMemories`。旧决策、旧结论和旧归档继续保存在原文件中用于兼容和相关证据召回，但不再铺满长期记忆主界面；任务历史只显示数量，具体执行过程继续由任务回放承担。

项目会话仍使用原来的模型上下文容量和自动压缩机制，两者不会混用。

## 验证证据

- `npm run build:backend`：通过。
- `npm run build:frontend`：通过。
- `npm run test:project-memory-v4`：通过，覆盖写入门禁、任务幂等、长期记忆去重、失败拒绝、最终验收提交、回执解析和记忆中心口径。
- `node scripts/memory-center-scope-hierarchy-selftest.mjs`：20 项通过。

当前仓库四项旧回归与本次改动无关：`project-management-production-selftest.mjs` 的测试环境未生成其断言要求的 `tasks.json`；`project-chat-presentation-selftest.mjs` 仍检查已被现有页面重构替换的旧组件源码结构；`memory-center-live-token-display-selftest.mjs` 的群聊夹具没有生成其断言要求的 ready Session Memory；`global-memory-center-session-render-selftest.mjs` 没有生成脚本等待的“你好呀”测试会话。本次未修改业务代码迁就这些失效的夹具或过期断言。
