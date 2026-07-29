# 音乐意图识别与统一播放器 V2

本文记录 CCM 当前已实现的音乐请求完整链路。全局网页、全局飞书、音乐助手和播放器页面共享同一套意图、候选、播放决定与持久队列；浏览器仍是唯一实际音频输出端。

## 完整流程

```text
用户文字请求
→ SemanticDecisionRuntimeV1 生成 MusicIntentDecisionV2
→ 服务端按已授权来源搜索候选
→ 唯一候选确定性核验或模型选择候选
→ MusicPlaybackDecisionV2 绑定回复与歌曲
→ MusicPlaybackCommandV2 使旧 generation 失效
→ 浏览器先 peek，音频引擎就绪后 claim
→ 下载、播放、心跳和终态回执
→ Web运行事件或原飞书会话收到真实结果
```

直接点击歌曲、播放/暂停、队列排序和停止属于明确播放器操作，不调用模型。自然语言中的点歌、歌手、情绪、场景、曲风、搜索和转码意图必须由统一模型决定；模型不可用、超时或结构无效时失败关闭，不使用关键词、正则或随机推荐替代语义判断。

## 语义与选曲

`MusicIntentDecisionV2`保存动作、策略、搜索主题、歌手、情绪、曲风、来源模式、置信度和签名语义回执。来源模式由调用方授权确定，模型不能把本地请求扩大到网易或B站。

服务端只搜索当前来源。明确随机请求允许从候选中随机选择；明确歌曲且只有一个高可信候选时通过确定性身份核验。其他多候选场景由`music_selection`模型决定，最多形成“意图一次、选曲一次”两次语义调用。回复、候选列表、队列命令和真实播放均引用同一个`MusicPlaybackDecisionV2.selectedCandidate`，不会出现推荐A而播放B。

三个开关相互独立：

- `AI推荐`关闭：情绪、场景和曲风请求不自动推荐。
- `自动选歌`关闭：返回候选并等待用户点击，不创建播放副作用。
- `情绪识别`关闭：停止歌曲氛围标签模型调用，不影响明确点歌和直接播放。

## 播放队列

播放命令状态为：

```text
pending → resolving → ready → claimed → playing
                                      → needs_user_gesture
                                      → completed | failed | superseded | cancelled
```

新播放命令会原子地把旧的非终态播放命令标为`superseded`。停止命令将活动播放标为`cancelled`。轮询器只读`head`，播放器未挂载时不会领取；引擎就绪后才以精确命令ID和generation领取。

claim租约为15秒，播放准备期间每5秒续租，累计最多三次领取。服务端已替代旧generation时，续租失败会立即使浏览器本地播放意图失效并停止旧音频，因此旧下载即使稍后完成也不能抢回播放权。浏览器拦截自动播放时状态进入`needs_user_gesture`，用户点击播放成功后补交同一命令的`completed`回执。

旧`remote-command`、`take`和`ack`接口继续映射到V2状态机，历史队列惰性读取且保留终态审计，不通过消费接口直接删除。

## 回复与来源隔离

音乐助手每轮只创建一个权威助手消息；SSE中的文本、候选、决定和播放状态更新该消息，不再追加“已自动播放”气泡，也不会显示工具JSON或伪`<tool_call>`文本。

全局网页和飞书最初只确认“正在选择并准备播放”。真实开始、失败、被替代或等待用户点击后，队列发布脱敏`music.playback.*`运行事件；飞书来源使用保存的精确session绑定更新对应播放卡。Web和飞书不会互相转发回复。

公开状态不返回Prompt、API Key、下载签名或Provider原始协议。下载签名只在领取成功的浏览器执行命令中出现。

## 失败策略

- 模型鉴权和配置错误立即失败；瞬时网络或Provider错误使用统一重试、120秒配置超时和任务级冷却。
- 找不到候选或模型拒绝选择时不创建播放命令。
- 音频临时错误最多重试三次，最终失败时按播放器队列策略跳到下一首并记录原因。
- SSE建立后发生错误时仍以`error → terminal → done`结束，不混写JSON响应。
- 多标签页通过共享latest-wins协调器确保只有最新generation拥有播放权。

## 接口

- `POST /api/music/intent/resolve`
- `POST /api/music/playback/resolve`
- `POST /api/music/playback/commands`
- `GET /api/music/playback/commands/head`
- `POST /api/music/playback/commands/:id/claim`
- `POST /api/music/playback/commands/:id/heartbeat`
- `POST /api/music/playback/commands/:id/complete`
- `POST /api/music/playback/commands/:id/cancel`

## 验证证据

- `music-semantic-playback-selftest.mjs`：具体歌曲、歌手、情绪、曲风、随机、来源锁定与模型失败关闭。
- `music-playback-v2-selftest.mjs`：peek/claim、短租约、latest-wins、终态回执、隐私投影和用户手势闭环。
- `music-latest-playback-wins-selftest.mjs`：多标签、反序完成、旧下载防抢播、重试和失败跳过。
- `authenticated-music-release-selftest.mjs`：隔离服务中的鉴权、上传、Range流媒体、下载签名、队列和歌单。
- 媒体域Provider全部使用Mock，付费调用为0。

