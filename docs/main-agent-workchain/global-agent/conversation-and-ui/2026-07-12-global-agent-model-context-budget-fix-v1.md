# 全局 Agent 大模型上下文预算修复 v1

日期：2026-07-12

## 问题

全局 Agent 显示“当前统一大模型不可用”，但音乐 Agent 使用设置中的同一套大模型配置时表面运行正常。

## 根因

配置读取没有问题。当前统一配置为：

- 已启用。
- API 格式为 `anthropic-compatible`。
- API Base URL 为 `https://ciyuan.fast`。
- 模型为 `gpt-5.6-terra`。
- API Key 已保存。

对 `/v1/messages` 和 `/v1/chat/completions` 的最小真实请求均返回 HTTP 200，因此不是 Key、模型名或网关端点失效。

真正问题是全局 Agent 将完整 `group_memory_context` 对象直接序列化进模型请求。修复前一次普通“你好”的上下文为：

- 总体积：3,577,133 bytes。
- 粗略 token：约 763,758。
- `group_memory_context`：约 3.57 MB。

群聊记忆对象包含 typed memory、文件引用访问账本、读取计划访问账本和完整状态，远超模型请求预算。音乐 Agent 的上下文很小，并且动作识别失败会退回规则判断，所以看起来仍能正常工作。

## 修复

- 新增 `buildGlobalAgentGroupMemoryModelContext` 模型边界适配器。
- 原始群聊记忆继续完整保存在记忆系统和技术查询接口中。
- 发给全局模型的群聊记忆只使用既有 `rendered_text` 摘要。
- 摘要增加 12,000 字符硬上限，并携带来源体积、截断状态和完整上下文查询提示。
- `query_group_memory` 工具返回模型时也使用相同预算，避免第二轮再次膨胀。
- 全局模型请求体增加 512 KB 安全上限。
- 模型调用失败会写入内部运行记录和服务日志，用户正文仍保持友好简洁。

## 修复结果

同一真实数据集修复后：

- 总上下文：30,825 bytes。
- 粗略 token：约 6,386。
- 群聊记忆摘要使用：11,964 / 12,000 字符。
- 原始 3.57 MB 记忆没有删除，仍可通过技术查询读取。
- 使用修复后的真实上下文调用当前配置模型：HTTP 200，返回合法结构化 JSON。

## 回归

- 新增大对象压缩测试，验证模型上下文不携带原始 typed memory 字段。
- 新增源码桥接检查 `globalAgentModelContextStaysBounded`。
- `npm run check`：通过。
- `npm run build`：通过。
- `npm run test:main-agent-runtime-e2e`：通过。
- `npm run test:render-regression`：通过，37 张截图全部生成。
- `node scripts/main-agent-decision-ui-selftest.mjs`：通过。
- `runGlobalAgentIntentSelfTest`：通过。

## 边界

本次没有修改统一大模型的 Key、URL、模型名或格式，也没有删除群聊记忆。修复只发生在全局 Agent 向模型发送上下文的边界。
