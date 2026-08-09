# 斜杠命令与共享文件完整业务流程V2

## 1. 用户配置共享文件

```text
用户选择全局/群聊/项目
→ 流式上传或创建文本
→ 数量、容量、名称、MIME和文件签名校验
→ 临时文件安全落盘
→ 解析完整正文
→ 按完整段落生成Token分片
→ 原子更新SharedFileManifestV2
→ 页面读取脱敏清单
```

上传失败会清理临时文件。公开对象不包含磁盘路径，原文件与解析正文仍是事实来源。

## 2. Agent读取共享文件

```text
用户消息
→ 识别精确Agent作用域
→ 加载该作用域共享文件清单
→ 校验revision与checksum
→ Token预算选择完整分片
→ 作为主Agent只读上下文
→ 工作单继承给当前项目子Agent
→ 隐藏执行账本记录清单与分片回执
```

全局Agent只读取全局文件；群聊主Agent和群聊项目子Agent读取当前群聊文件；项目主Agent和项目会话子Agent读取当前项目文件。兄弟群聊、兄弟项目和其他会话不能通过作用域参数绕过。

当全部文件无法一次放入上下文时，投影只选择能完整容纳的分片并声明`complete=false`。Agent必须使用精确文件和分片ID继续读取，不允许字符截断，也不允许根据文件名补全内容。

## 3. 斜杠命令

```text
用户输入显式 /command
→ 服务端按精确作用域生成命令目录
→ 仅加入当前作用域已授权Skill
→ 校验项目/群聊/会话身份和参数
→ 只读命令直接解析
→ 修改或高风险命令返回确认挑战
→ 用户确认
→ 服务端签发短期单次回执
→ 同一用户、会话、命令、参数和作用域消费回执
→ 执行并写审计
```

执行后按 CC 生命周期分流：

```text
local-jsx → 会话内面板/抽屉 → Esc关闭 → 无消息卡、模型不可见
local     → 紧凑本地系统记录 → 跨刷新持久化 → 模型不可见
prompt    → 用户命令 → 主Agent Loop → 工具/子Agent → 最终回答
navigate  → 直接切换页面 → 不生成消息
```

同名命令优先遵循 CC 语义：`/branch` 分叉会话，`/files` 显示模型上下文来源，`/agents` 管理 Agent，`/tasks` 管理当前会话后台任务，`/plan` 切换持久 Plan Mode，`/resume` 恢复历史会话。CCM 原能力分别迁移到 `/git-status`、`/shared-files`、`/agent-health`、`/task-center` 和 `/session-stats`。

`/branch` 与 `/rewind` 必须提交精确 scope、scopeId、sessionId、anchor message、revision、generation 与会话 checksum。`/rewind` 还必须先生成预览 checksum；漂移后整体拒绝。项目和群聊会话在回退时取消未完成执行、轮换 generation 并使旧 Evidence 失效。

本地记录使用 `ccm-local-command-record-v1`，只保存命令、状态、摘要、checksum 和脱敏安全详情，`modelVisible:false`、`contentStored:false`。三类 Agent 的模型上下文投影统一过滤 `local_command/command_result`。

确认回执两分钟内有效且只能使用一次。参数、作用域、用户、角色或会话变化都会使回执失效。高风险命令需要Admin；旧的纯前端`window.confirm`不再构成授权证据。

## 4. Skill命令

- 全局命令读取全局Agent工具授权。
- 项目命令读取当前项目`tools.skill`。
- 群聊命令读取当前群聊`tools.skill`。
- 未授权、已禁用或不存在的Skill不会进入命令目录，也不能在解析阶段展开正文。

## 5. 模板退役

模板不再承担输入组织或语义路由。历史文件保留但不读取：

- 可重复工作方法迁移为Skill。
- 快捷确定性操作使用斜杠命令。
- 需求、规范、接口和业务文档使用共享文件或附件。
- 旧模板API返回410，不静默创建新数据。

## 6. 恢复与兼容

- V1全局磁盘共享文件、项目内联共享文件和群聊内联共享文件在首次读取时惰性导入V2。
- 导入按名称去重并生成checksum、revision和分片，不删除V1原始记录。
- V2清单写入使用跨进程文件锁、临时文件、fsync和原子替换。
- 服务重启后清单和正文继续可读；斜杠确认挑战失效，用户需要重新确认，避免重放。

## 7. 上线门禁

- 路径逃逸、双扩展名、符号链接和超限上传全部拒绝。
- 三种共享文件作用域严格隔离。
- 四类Agent读取正确作用域并记录隐藏回执。
- Skill命令必须有精确作用域授权。
- 修改命令不能绕过服务端确认。
- 模板后端、Agent动作和前端选择器均不存在。
- 后端、前端、MCP生产构建和文档链接检查通过，Provider调用为0。
