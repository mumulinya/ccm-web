# 音乐 Agent 单例记忆对齐

Date: 2026-07-20

## 目标

将音乐 Agent 从浏览器 `localStorage` 最近记录升级为 CCM 正式记忆，同时遵守产品决定：音乐 Agent 不提供会话列表。

## 最终结构

```text
music-agent 固定单例
├─ 服务端完整 transcript
├─ CC 风格正式模型摘要 S1 -> S2 -> S3
├─ 10K-40K token 动态近期完整原文
├─ Provider 容量驱动的自动压缩线
├─ 三次失败熔断和压缩后门禁
└─ 模型提取的长期音乐偏好
```

权威存储为 `.cc-connect/music-agent-memory.json`。前端不再把 `aura-music-chat-messages` 作为事实来源；首次加载服务端数据后会清理旧浏览器缓存。

## 模型上下文

- 未压缩时，音乐模型收到单例 transcript 全部原文，不再固定为最近 10 条。
- 压缩后收到正式模型摘要、动态近期完整原文和长期音乐偏好。
- 第二次压缩显式携带上一轮摘要和 checksum，保证 S1 信息进入 S2。
- 自动阈值使用统一模型配置的可信容量；无可信 Provider usage 时估算完整模型可见 payload。
- 模型不可用、摘要为空、checksum 错误或压缩后仍超线时 fail closed。
- 输入 `/compact` 可手动压缩，不创建新会话。

## 长期偏好

只有包含明确长期信号的用户表达才调度模型提取。一次点歌不等于偏好。模型可以增加或撤销：

- preferences / dislikes；
- favoriteArtists / favoriteGenres；
- listeningContexts；
- playbackPreferences。

助手回复和模型推荐不能独立写入长期偏好。清空对话默认保留长期偏好。

## 播放边界

记忆改造没有创建第二个播放器。全局 Agent和音乐 Agent仍调用 `window.__cc_global_play_music`，共用始终挂载的 MusicPlayer、一个 `<audio>` 和 latest-wins 协调器。

## 验证

- `test:music-agent-memory`：`27/27`，付费 Provider 调用 `0`。
- `test:music-agent`：通过，覆盖动作识别和远程命令队列。
- `test:music-latest-wins`：通过，覆盖跨标签页、新请求覆盖旧请求和唯一 `<audio>`。
- backend 与 frontend production build：通过。
- `test:music-production` 需要本机 `3082` 服务及真实网易云网络，本轮未启动 live 服务，因此未作为离线完成门禁。

## 主要实现

- `backend/modules/music/memory.ts`
- `backend/modules/music/music.ts`
- `backend/modules/music/music-part-01.ts`
- `backend/modules/music/music-part-02.ts`
- `frontend/src/composables/useMusicAgentChat.js`
- `frontend/src/components/music/useMusicPlayer.js`
- `scripts/music-agent-memory-selftest.mjs`
