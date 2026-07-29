# TestAgent 浏览器证据与返工复验

## 目标链路

```text
群聊主 Agent / 项目主 Agent
-> 创建验收工单（目标、验收标准、browser_scenarios）
-> TestAgent 生成并校验结构化命令、HTTP、浏览器动作与断言
-> 确定性执行器运行检查
-> 保存截图、页面快照、控制台、网络与报告
-> 主 Agent通过签名 MCP读取精确任务证据
-> 失败时生成返工单
-> 原开发 Agent返工
-> TestAgent重新执行完整验收
```

TestAgent只负责独立验证，不修改业务源码，也不替代主 Agent做最终产品验收。

## 工单与规划

- `create_test_work_order` 接收 `browser_scenarios`，群聊和项目验收会把当前精确任务配置的浏览器场景传入工单。
- 模型规划只能输出受支持的浏览器 action/assertion schema；未知字段、危险 URL、越界路径和非法动作在执行前拒绝。
- 生产路径统一接入点击、表单、上传、下载、弹窗、键盘、悬停、滚动、拖拽、剪贴板、历史、网络状态、响应式和重复点击等验收流程构建器。
- 同一验收标准只保留最具体的流程；已经由交互流程覆盖的标准不再额外生成通用路径 smoke，避免重复执行和重复证据。
- 浏览器执行计划在运行前冻结，Provider必须复用同一个 plan ID和 check ID，不能执行时重新生成另一份计划。

## 浏览器证据

- 关键交互在动作前后分别截图，最终页面为每条断言绑定语义化截图引用。
- Playwright执行失败时尝试保存失败截图；截图本身失败会生成明确的失败断言，不伪造文件路径。
- MCP浏览器截图失败只进入失败步骤和错误记录，不会把错误文本写入 `screenshots[]`。
- `get_test_evidence` 通过 task、run和 artifact ID读取精确证据。图片以 MCP image content block返回；跨任务、超限文件和未登记路径均拒绝。
- Playwright预检会给出 `npx playwright install chromium` 提示；使用系统 Edge/Chrome回退时在报告中明确记录，不伪装成 bundled Chromium。

## 返工与复验

- 首轮失败后，模型可生成一轮聚焦检查；命令和浏览器检查都会真实执行。
- 聚焦浏览器检查标记为 `agenticFollowup` 诊断证据，不修改冻结的首轮执行计划，也不能把首轮失败改判为通过。
- 主 Agent返工提示包含 artifact目录和失败截图路径，开发 Agent可以精确定位证据。
- 项目与群聊正式返工后仍会创建新的完整 TestAgent验收轮次；最多三轮，仍失败则 fail closed并进入 blocked。

## 安全边界

- 证据 MCP只读，不开放目录遍历或跨任务读取。
- TestAgent不安装依赖、不修改源码、不提交 Git，不使用截图存在本身替代行为断言。
- 模型规划失败时不会伪造执行结果；最终状态仍由确定性证据门禁计算。

## 验证证据

- TypeScript检查：通过。
- TestAgent浏览器编排自测：20/20通过，付费 Provider调用为0。
- 真实浏览器矩阵：Playwright失败截图、MCP失败截图、点击流程、表单流程4/4通过。
- 项目主 Agent编排：25/25通过。
- 统一自动开发流程：16/16通过。
- TestAgent生产加固：23/23通过。
- 内部 MCP目录与 npm打包内容：通过。

