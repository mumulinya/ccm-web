# 音乐播放“最后一次请求生效”修复

## 问题

音乐页虽然每个页面只有一个 `audio` 元素，但旧的搜索或下载任务完成后会无条件调用 `play()`。当用户在第一首歌尚未准备完成时点第二首歌，第一首歌可能更晚完成并覆盖第二首歌。

多个 CCM 标签页各自拥有独立的 `audio` 元素，原实现也没有跨标签页播放所有权，因此不同标签页可能同时播放。

## 行为

- 每次本地播放、歌单播放、Agent 点歌、远程点歌和云端下载播放都会创建一个有序播放意图。
- 新意图立即使本页旧意图失效，并通知其他 CCM 标签页停播。
- 搜索、模型选曲、队列同步、下载等待和 `audio.play()` Promise 完成后都会重新校验意图。
- 旧下载可以继续写入曲库，但旧请求不能再修改音源或自动播放。
- 被替代的调用返回 `skipped: true` 与 `reason: "superseded"`，上层不会显示虚假的播放成功或失败消息。
- 用户主动停止会广播停止意图，使所有标签页的播放令牌同时失效。

## 跨标签页传输

优先使用 `BroadcastChannel` 传播播放和停止意图，并使用 `localStorage` 的 `storage` 事件作为兼容回退。最后一次意图会保留，刚打开的标签页也能恢复当前所有权。意图通过逻辑时钟和稳定 ID 排序，兄弟标签页对最新所有者得到一致结论。

## 验证

- `npm run build:frontend`
- `node scripts/music-latest-playback-wins-selftest.mjs`
- `npm run check`
- `CCM_MUSIC_URL=http://127.0.0.1:3080/ npm run test:music-render`

测试使用虚拟标签页和虚拟音频 Promise，不播放真实声音，不调用付费 Provider，付费调用为 0。
