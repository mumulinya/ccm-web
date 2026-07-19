# 记忆系统过度设计清理

Date: 2026-07-18

## 目标

保留用户真正需要的链路：多群聊、多 `gcs_*` 会话、Session Memory、typed memory、压缩后重注入、每任务 `tas_*`、最终派发容量 gate、Provider usage 反馈和 Global Agent 全局隔离。

删除为了证明链路而扩张出来的治理系统，不再让 Memory Center 承担开发诊断台职责。

## 删除内容

### live Provider 治理

- endurance/soak report 与 retention；
- wave approval、initial baseline canary、version transition canary；
- usage authorization/execution/cost plan；
- cron scheduler、API、Memory Center 控件和 standalone scripts。

保留的是正常 Provider 调用返回的 token usage。它仍然按 `direct_input + cache_read + cache_creation` 反馈到下一轮最终派发 preflight。

### Memory Center 诊断链

- replay/repair work item、dispatch brief、closure、cold archive、maintenance notification、cleanup WAL 的报告与 UI；
- Provider 排名、proof matrix、soak fleet 等产品卡片；
- 114 个 mechanically split diagnostics/reports/self-tests 后端文件，约 4.61 MB；
- 与已删除报告 API 耦合的历史脚本和 npm 命令。
- 369 个遗留 `.js`、`.d.ts` 和 source map 编译产物，约 8.64 MB。

Memory Center 现在只有：

1. 当前全局、群聊会话和项目记忆；
2. 记忆固定、修改、删除、恢复和审计；
3. 上下文窗口、压缩阈值和记忆注入预算；
4. 子 Agent 模型容量；
5. Session Memory 提示词与模板。

### 文档

- 删除 Phase 173-211；
- 删除 Phase 348-375；
- 删除已撤回的 Phase 398；
- 共 68 份 Phase 文档，约 402 KB。

## 保留边界

- 不删除最终派发 gate、响应式压缩或 Provider usage baseline；
- 不删除群聊会话隔离、Session Memory、typed memory 和抽取定制；
- 不删除 Global Agent global-only 边界；
- 不调用收费 Provider；
- 不迁移旧会话数据。

## 验收

- backend build：通过；
- frontend build：通过；
- split exports：通过；
- factory deps：通过；
- Global Agent global-only：`13/13`；
- final dispatch gate：`17/17`；
- reactive compact：`18/18`；
- Provider usage baseline：`35/35`；
- 精简会话隔离与抽取定制：`8/8`；
- Memory Center desktop：`1280x720`，无横向溢出；
- Memory Center mobile：`390x844`，无横向溢出；
- browser console error：`0`。

## 结论

核心记忆压缩功能仍然完整。删除的是审批、耐久证明、报告套报告和 repair 工单，不是记忆的生成、压缩、召回、隔离或子 Agent 上下文注入。
