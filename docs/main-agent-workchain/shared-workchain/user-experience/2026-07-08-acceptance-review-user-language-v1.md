# 主 Agent 验收清单用户语言优化 v1

## 目标

对照 CC 的 `TaskCompleted` hook 思路，完成不是一句“已完成”，而是可以被外部检查阻止，并给出阻止原因。本项目已经有验收闸门，本次重点是把闸门原因翻译成用户能执行的补齐清单，避免用户区出现 ACK、gate、API microcompact 等内部协议词。

## 本次实现

- 后端 `acceptance_review.checks` 直接生成友好标签和说明。
- `ACK 前置审核` 改为“接单说明完整”。
- `API microcompact 使用声明` 改为“上下文压缩计划使用说明”。
- `记忆 gate`、`重注入 gate` 等内部词改为“记忆使用声明”“压缩后上下文恢复声明”。
- 原始检查名、原始 detail 继续保存在 `acceptance_review.technical.raw_gate_checks`，默认不在用户区展示。
- 前端共享清洗器补齐旧数据兼容：ACK、microcompact、native_applied、used/ignored/verified 都会转成中文业务表达。
- 任务卡协作状态里的“记忆派发校验”“压缩重注入校验”改成更容易理解的“记忆使用声明”“压缩后上下文恢复”。

## 用户可见行为

- 验收失败时，用户看到的是“还有 1 个接单说明需要补齐目标、范围和验证安排”。
- 上下文相关缺口会显示“记忆使用声明”“上下文压缩计划缺少使用状态”。
- 用户区不会出现 ACK、gate、microcompact、native_applied、used/ignored/verified。
- 技术详情仍保留原始协议字段，便于主 Agent 和开发者排障。

## 回归覆盖

- 后端协作 UX 自测扫描 `acceptance_review` 用户可见字段，确保不含内部协议词。
- 后端自测确认原始 gate detail 仍在 technical 中。
- 静态 UI 自测覆盖友好标签和渲染断言。
- Playwright 渲染回归覆盖验收卡真实展示，并断言 raw 协议词不在可见区域。
- 渲染回归额外生成“验收清单用户语言”元素截图，便于人工确认排版。
