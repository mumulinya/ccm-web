# User Facing Role Spacing Polish v1

## 背景

主 Agent / 子 Agent 术语会在用户可见文本里替换成“我 / 执行成员”。部分文本原本写成“主 Agent 采纳”，替换后会留下“我 采纳”这样的多余空格。

## 改动

- `sanitizeMainAgentUserFacingText(...)` 在角色和协议词替换后，清理中文字符之间的多余空格。
- 协作显示层 `sanitizeMainAgentUserText(...)` 做同样清理，覆盖群聊任务卡、Agent QA 预览等用户可见内容。
- 协作 UX 自测更新到当前用户可见语言：
  - “主 Agent” -> “我”
  - “子 Agent 会话” -> “执行成员会话”
  - “子 Agent”派发摘要 -> “执行成员”派发摘要

## 边界

- 只影响用户可见文本的排版清理。
- 不改变技术详情、协议字段或执行链路。
