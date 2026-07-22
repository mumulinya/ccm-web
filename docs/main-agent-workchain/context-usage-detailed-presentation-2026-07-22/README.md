# 会话上下文详情展示

Date: 2026-07-22

## 展示目标

全局 Agent、群聊会话和项目会话底部的上下文用量入口现在可以展开 Context 详情面板，让用户看到当前精确会话的真实模型可见上下文，而不是只看到一个百分比。

## 展示内容

详情面板按后端 `ModelVisiblePayloadSnapshot.tokenBreakdown` 展示：

- `System prompt`：系统提示；
- `Tool definitions`：工具定义；
- `Rules`、`Skills`、`MCP & dynamic tools`、`Subagent definitions`：只有后端提供对应独立分桶时才展示；
- `Summarized conversation`：正式模型摘要或 Session Memory；
- `Conversation`：近期完整原文；
- `Current request`：尚未计入历史的当前请求；
- `Recovery context`：会话恢复附件与连续性上下文；
- `Hooks`：生命周期 hooks 的模型可见结果。

没有分桶快照时，界面显示 `Fixed context`，并使用已有 token measurement 的固定上下文估算，不把它伪装成某一个具体组件。

## 门禁信息

面板同时显示：

- 当前使用量 / 模型有效上下文容量；
- 当前百分比与自动压缩线位置；
- 当前会话是否已压缩、正在压缩或熔断；
- 摘要来源：模型摘要、模型 Session Memory 或暂无正式摘要；
- 计量来源：Provider 实测加后续增量、完整模型可见上下文估算或会话原文估算；
- 最近一次真实计量更新时间。

百分比、分桶和压缩状态都来自现有 `/api/memory-center/scope` 摘要接口，不在前端重新计算一套独立记忆状态。全局、群聊和项目页面继续通过同一个 `SessionContextUsage` 组件展示，因此不同会话仍按各自精确 scope/session 隔离。

## 验证

```text
npm run build:frontend
```

桌面和移动端上下文入口保持可展开、可关闭、键盘可操作，详情面板不会改变压缩触发逻辑，也不会写入或修改记忆。
