# 会话搜索与任务回放

## 已确认边界

- 会话搜索覆盖全局、群聊、项目、音乐助手以及对应飞书来源，只检索当前用户有权读取的精确会话。
- canonical transcript、任务、Trace、执行记录和TestAgent证据是事实来源；搜索索引与回放快照都是可重建投影。
- 搜索不截断消息正文，不扫描兄弟作用域，不把收藏正文保存到浏览器公共存储。
- 任务状态只读取结构化状态与终态回执；旧记录缺少证明时显示未知，不从自然语言猜测成功或失败。

## ConversationSearchIndexV3

会话写入只标记索引为脏。后台Worker在SQLite中构建不可变generation，完成来源校验后原子切换active pointer；构建期间继续提供last-good generation并标记stale。三字及以上使用FTS5 trigram，一至二字使用短词索引。搜索结果绑定generation、row ID、消息ID、scope和source checksum。

点击结果先读取目标消息前后完整窗口，再进入对应页面。索引过期或消息身份不匹配时明确提示刷新，不通过“读取最近1000条”猜测位置。收藏按认证用户和row ID保存在服务端，索引内容变化后旧收藏不会错误指向新消息。

## TaskReplayV3

任务回放按根任务收集任务族、精确会话消息、全局Run、Mission监督、开发执行、Agent会话、TestAgent证据、Trace和任务日志。来源身份生成checksum与`task_replay_source_manifests_v3`，事件快照写完后才切换，不会在并发刷新时出现空窗口。

首次打开读取用户摘要、计划、工作项、投递、证据目录和最近事件。运行期刷新只读取分页事件与轻量状态，不重复传输计划、文件清单和Diff。`blocked`是终态；历史未知状态保持`info/unknown`。完整文件证据不再静默限制200项，具体Diff按证据身份读取。

## 安全与兼容

- 搜索正文、Trace技术详情和回放证据继续执行脱敏与大小门禁。
- Viewer可检索和维护自己的收藏；敏感Trace仍仅Admin可见。
- V1/V2接口继续读取，新写入使用V3索引与manifest，不迁移或删除历史事实数据。
- 索引Worker失败不影响会话写入；回放物化失败可由canonical来源重新生成。
