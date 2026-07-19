# 全 Agent 剪贴板附件

## 目标

群聊主 Agent、项目 Agent 和全局 Agent 的消息输入框统一支持直接粘贴剪贴板图片与文件，并继续使用各自已有的附件上传和模型上下文链路。

## 行为

- 剪贴板只有文字时，不阻止浏览器原生粘贴。
- 剪贴板包含图片或文件时，将原始 `File` 加入附件列表并阻止附带的 HTML、URL 或占位文本进入输入框。
- 图片保留原始二进制数据和 MIME 类型；共享输入框显示缩略图，全局 Agent 使用已有预览区。
- `clipboardData.items` 与 `clipboardData.files` 同时暴露同一文件时只加入一次；重复选择或粘贴也会去重。
- 单纯粘贴不会自动发送，用户仍可补充文字后再提交。

## 数据流

1. `clipboardAttachments.js` 从浏览器 `ClipboardEvent` 提取文件。
2. 群聊和项目通过 `ChatComposer` 的现有 `files-selected` 事件进入原附件数组。
3. 全局 Agent 通过 `useGlobalAgentAttachments.addFiles()` 进入原 `selectedFiles` 数组。
4. 发送阶段沿用既有 `FormData`/附件 API，后端继续进行附件存储、图片识别和模型上下文注入。

## 失败与边界

- 浏览器未向页面暴露文件时不拦截粘贴。
- 全局 Agent 沿用 25 MB 单文件限制。
- Agent 正在执行且附件按钮不可用时，不通过粘贴绕过原有状态门禁。
- 不新增 Base64 文本协议，不把图片内容写进消息文本，也不发起真实 Provider 调用。

## 验证

- `node scripts/clipboard-attachments-selftest.mjs`：通过。覆盖纯文字、图片加 HTML、items/files 重复暴露、重复粘贴去重和三类 Agent 接线。
- `cd frontend && npm run build`：通过，Vite production build 共转换 2070 个模块。
- `http://127.0.0.1:3080` 桌面浏览器：通过。
  - 全局 Agent：测试 PNG 生成 1 个预览和 1 张图片，输入文字为空；随后普通文字可原样粘贴。
  - 群聊主 Agent：测试 PNG 生成 1 个附件 chip 和 1 张缩略图，输入文字为空。
  - 项目 Agent：当前可见 composer 生成 1 个附件 chip 和 1 张缩略图，输入文字为空。
- 浏览器验证未点击发送，真实 Provider 调用为 `0`。
