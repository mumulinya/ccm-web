# 音乐曲库、媒体平台与统一播放器完整链路 V4

## 用户入口

用户可以从音乐页面浏览本地曲库、统一搜索本地/网易/B站、直接播放或下载，也可以从音乐助手、全局 Agent、网页会话或飞书提出自然语言点歌请求。浏览标签只影响手动浏览，不限制 AI 点歌来源。

## 完整链路

```text
本地索引 / 网易 / B站
→ 有界并行搜索
→ 模型形成唯一选歌决定
→ SQLite播放命令与generation
→ 浏览器领取租约
→ 本地播放或持久下载
→ 解码、音质和checksum核验
→ 播放结果、历史和来源回执
```

AI 点歌默认使用 `auto`，并行读取本地、网易和B站。只有用户在消息里明确指定来源，模型意图才可收窄到 `local | netease | bilibili`。单个平台失败不会清空其他平台结果；全部平台失败返回可重试错误，不能显示成“没有歌曲”。

## 权威状态

- `music_playback_commands_v3`保存latest-wins播放命令、generation、租约和fencing token。
- `music_library_state_v4`保存歌单、收藏、队列、播放模式和历史revision；修改使用CAS。
- `music_catalog_generations_v4`与`music_catalog_tracks_v4`保存版本化曲库索引，失败继续服务last-good generation。
- `music_download_jobs_v2`保存下载状态、checkpoint、请求音质、实际音质和播放消费者。
- `music_media_assets_v2`保存平台身份、稳定文件名、真实媒体参数和文件checksum。
- 旧JSON仅作惰性导入和只读兼容，成功迁移后不会重复导入，也不会删除原文件。

## 曲库与文件安全

曲库扫描异步执行，媒体探测最多两个并发，单个文件失败不会阻塞全部索引。列表和搜索只读取active generation并使用游标分页，不在HTTP请求里遍历目录或同步执行`ffprobe`。

上传使用流式Multipart，最多10个文件、合计100MB、单文件100MB、120秒超时。文件先进入隔离区，经过扩展名、MIME、签名、完整解码、checksum和真实路径校验后原子进入曲库。符号链接、Junction、目录逃逸、伪造格式、超大ID3和封面均被拒绝。

## 下载与音质升级

同一平台歌曲以`source + source_id`绑定唯一正式资产：

1. 已有文件真实音质不低于请求时直接复用。
2. 更高音质请求下载到任务专属暂存文件。
3. 新文件通过解码、码率、采样率、大小和checksum校验后才原子替换。
4. 下载、解析或提交失败时保留旧文件，绝不自动降级。
5. 新点歌替代旧播放命令时，仅取消没有其他消费者的播放下载；手动下载不受影响。

ffmpeg由受管进程树执行，超时或取消会终止完整进程树，只清理带CCM任务身份的临时文件。

## 重复项与恢复

重复识别使用来源身份、checksum、规范化歌名/歌手、时长和真实码率。合并先将待移除文件移动到CCM隔离回收区，再一次性替换收藏、歌单、队列和历史引用。事务中断会进入`recovery_required`，可重试或回滚；回滚同时恢复文件和合并前的音乐库引用。

## 网络与代理

网易、B站、歌词、字幕、评论和封面通过`MusicPlatformHttpClient`访问，统一具有Host白名单、重定向复核、连接/响应超时、响应体上限和有限重试。代理使用请求级`ProxyAgent`，不修改进程级`HTTP_PROXY/HTTPS_PROXY`，并发媒体请求不会串用代理。

## 浏览器播放器

浏览器是唯一音频输出端。播放器先peek命令，音频引擎就绪后原子claim，并使用租约心跳和fencing token提交`playing | completed | failed | needs_user_gesture`。旧generation和旧租约不能覆盖最新状态。页面的曲库、统一搜索和状态加载使用AbortController与请求generation，旧响应不能覆盖新页面。

## 验证

- `scripts/music-media-platform-v4-selftest.mjs`验证SQLite latest-wins、租约、终态、revision CAS、索引、音质升级、代理隔离和前端并发门禁。
- `npm run test:media`覆盖音乐语义、聊天、队列、播放历史、歌词、下载、界面、天气和宠物兼容。
- 所有模型测试使用Mock Provider，付费调用为0。

