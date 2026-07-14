# 全局状态标签用户动作拆分 v1

## 背景

用户问全局主 Agent “现在进展怎么样”时，状态列表会展示全局任务、直派任务和独立运行。此前 `waiting_confirmation`、`waiting_clarification`、`waiting_user`、`blocked` 等状态都会被统一标成“需要处理”，用户很难区分是自己要确认，还是主 Agent/执行成员还要补齐证据。

## 改动

- `waiting_confirmation` 显示为“等待你确认”。
- `waiting_clarification`、`waiting_user`、`needs_user`、`paused` 显示为“等待你补充”。
- `blocked`、`needs_attention`、`needs_info` 显示为“待补齐”。
- 保留原有当前进展和下一步说明，用具体文本解释需要谁做什么。

## 回归

- 后端全局状态自测增加：
  - “部署登录修复到生产环境”显示“等待你确认”，不再显示“需要处理”。
  - “等待用户确认部署窗口”显示“等待你补充”，不再显示“需要处理”。
- `main-agent-decision-ui-selftest` 增加源码守门检查。

## 预期效果

全局主 Agent 的状态回复更接近真实任务链路：状态标签先告诉用户当前阶段，具体动作放在“当前进展/下一步”里，减少把内部补齐动作误写成用户待办。
