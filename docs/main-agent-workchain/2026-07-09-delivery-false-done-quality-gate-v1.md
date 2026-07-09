# Delivery False Done Quality Gate v1

## 目标

主 Agent 的最终交付总结如果已经处于“未完成 / 已取消 / 处理中”，用户可见文本不能再出现“已完成”“最终验收已通过”“可以查看改动详情”等完成口径。

## 实现

- `buildDeliveryFinalSummaryQuality` 新增 `failed_status_false_done_visible` 检查。
- 该检查会扫描最终总结 section 和可见交付卡文本。
- 非 `done` 状态下，如果出现 false done 文案，质量门禁会失败。

## 用户体验

- 用户看到的状态、正文、卡片和下一步保持一致。
- 技术细节仍默认折叠，主文本不会自相矛盾。

## 自测

- `finalSummaryQualityCatchesFalseDoneForFailedStatus` 构造一个 `failed` 状态但文本里写“任务已完成 / 最终验收已通过 / 可以查看改动详情”的坏总结，确认质量门禁会失败。
