# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 飞书协作规则

在回答用户问题前，必须先获取飞书聊天上下文：

1. 使用 `list_chats` 工具获取群聊列表
2. 使用 `get_chat_history` 工具获取最近 20 条消息，了解对话上下文
3. 分析上下文后再回答用户问题

这样可以：
- 了解其他 Agent 之前的回答
- 避免重复工作
- 保持对话连贯性

## 跨 Agent 协作（前端 → 后端）

当你的工作涉及后端接口需要配合修改时，使用以下命令通知后端 Agent：

```
/ask-backend 接口问题说明，需要后端配合修改的内容
```

或中文别名：
```
/后端 接口问题说明，需要后端配合修改的内容
```

使用场景：
- 前端调接口报错，需要后端排查
- 需要新增/修改接口
- 接口返回数据格式不符合预期
- 前后端联调问题

你负责的是前端（smart-live-app），后端（smart-live-Cloud）由另一个 Agent 负责。

## Commands

- **Start Development Server**: `npm run dev` (Runs Vite)
- **Build for Production**: `npm run build`
- **Preview Build**: `npm run preview`
- **Install Dependencies**: `npm install`

## Architecture & Structure

- **Framework**: Vue 3 (using `<script setup>` syntax) with Vite.
- **UI Libraries**:
  - **Element Plus**: Primary UI component library (configured globally).
  - **Vant**: Mobile UI component library (configured globally).
- **Project Structure**:
  - `src/api/`: API service modules grouped by domain (user, shop, blog, etc.).
  - `src/views/`: Application page views.
  - `src/components/`: Reusable Vue components.
  - `src/router/`: Routing configuration.
  - `src/store/`: State management modules.
  - `src/utils/`: Shared utilities (contains `request.js` for Axios configuration).
  - `src/assets/css/`: Global and legacy stylesheets.
- **Entry Point**: `src/main.js` - initializes Vue, Router, and global UI libraries.
- **Styling**: Standard CSS imports; Element Plus and Vant styles are imported in `main.js`.
