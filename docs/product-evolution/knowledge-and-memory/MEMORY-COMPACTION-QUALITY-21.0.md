# 记忆压缩质量评估中心 21.0

目标：让“上下文自动压缩”不只是能运行，还能被持续验收。评估重点是用户关心的五个问题：

1. 压缩后有没有丢关键约束
2. 子 Agent 是否真的用到了记忆
3. 检索召回是否准确
4. 长任务多轮后是否还能保持同一目标
5. 压缩摘要是否能追溯原始来源

## 新增接口

- `GET /api/memory-center/quality`
  - 优先读取最近 10 分钟缓存；没有缓存时运行轻量评估，不写审计。
  - 轻量模式不会执行 RAG Top-3 检索，避免页面打开时卡住。
  - 轻量模式只做采样和来源 ID 存在性检查，不打开大体积原始消息逐条匹配；当前无缓存首开实测约 0.5 秒。
- `POST /api/memory-center/quality`
  - 手动运行完整质量评估，并写入一次审计记录。
  - 完整模式会执行 RAG Top-3 抽样检索，并对原始来源做更严格回溯匹配，耗时取决于知识库和历史消息规模。

## 五项评估

### 1. 关键约束保留

数据来源：

- 群聊记忆 `persistentRequirements`
- 全局记忆 `authorization`
- 全局记忆 `feedback`

检查逻辑：

- 约束文本是否仍存在
- 是否带有可定位来源
- 来源消息/会话证据是否还能读取
- 来源原文是否能匹配压缩后的约束摘要

### 2. 子 Agent 使用记忆

数据来源：

- 任务 `delivery_summary`
- 结构化回执 `receipt.memoryUsed / receipt.memoryIgnored`
- 群聊记忆 `workerLedger.memoryUsed / workerLedger.memoryIgnored`
- 派发证据
- Worker 通知
- 最终报告 / 状态详情

检查逻辑：

- 优先读取子 Agent 结构化回执里的 `memoryUsed`，确认本轮实际使用了哪些群聊摘要、项目记忆、历史结论、共享文档或知识库。
- 如果子 Agent 声明 `memoryIgnored`，质量中心会把原因作为缺口展示。
- 旧任务没有结构化字段时，才回退检查派发/Worker 文本里是否出现项目背景、历史结论、架构决策、项目记忆、共享文档或知识库参考等信号。

### 3. RAG 召回准确

数据来源：

- 本地知识库目录 `~/.cc-connect/knowledge`
- 现有 `queryKnowledgeBase`

检查逻辑：

- 从知识库文档抽样标题和关键词
- 调用 Top-3 检索
- 检查结果是否命中文档名或标题关键词

说明：

- 该评估不调用模型，不额外消耗 token。
- 它是轻量召回健康检查，不替代人工业务正确性评估。

### 4. 长任务目标一致

数据来源：

- 任务 `reasoning_loop`
- 多轮计划版本
- 恢复检查记录
- watchdog / gap continuation 计数

检查逻辑：

- 多轮任务的有效目标是否仍覆盖原始目标关键词
- 恢复任务时是否重新核对目标与验收条件

### 5. 摘要来源可追溯

数据来源：

- 群聊记忆事实锚点 / 持续约束 / 决策
- 项目记忆归档 checksum
- 全局记忆 archive sourceMessageIds

检查逻辑：

- 群聊摘要是否能追溯到 message id
- 项目归档是否有 archive id、checksum 和 records
- 全局归档 sourceMessageIds 是否完整

## 前端展示

记忆控制中心新增“记忆压缩质量评估”面板：

- 总分
- 五项检查卡片
- 检查样本数
- 通过数量
- 缺口数量
- 可展开查看缺口或证据
- 顶部按钮“评估压缩质量”

## 当前边界

- 子 Agent 是否“真的使用了记忆”已经优先通过结构化 `memoryUsed / memoryIgnored` 判断；历史旧任务仍会回退到派发/Worker 文本信号。
- RAG 召回检查是关键词/标题抽样，不等于业务语义完全正确。
- 长任务目标一致性使用关键词重合与恢复核对记录，后续可加入 LLM 评审或 golden task 集合。

## 后续建议

1. RAG 增加 golden queries：用户手工标注“这个问题应该召回哪些文档”。
2. 长任务加入目标漂移 E2E：模拟 3 轮返工后检查最终目标是否偏离。
3. 压缩摘要增加 source coverage：每个摘要段落至少绑定一个 source id。
4. 将 `memoryUsed` 显示延伸到群聊任务卡的轻量证据区，而不是只在任务报告里展示。
