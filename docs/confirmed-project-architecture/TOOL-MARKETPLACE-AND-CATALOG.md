# MCP/Skill 工具市场与目录生命周期

## 权威链路

```text
官方固定目录 / 社区目录 / 自定义HTTPS来源
→ 固定公网IP安全读取
→ 规范条目与不可变物料
→ 完整预览
→ 隔离事务
→ Admin单次签名确认
→ 连接测试与原子切换
→ ToolManager和子Agent运行时重同步
→ 审计、恢复与回滚
```

市场负责软件供应链，不直接授予Agent权限。工具激活后仍需在全局、群聊或项目作用域显式授权。

## 来源与凭据

- CCM官方内置工具来自随包固定清单，保持系统管理状态。
- Skills.sh、Smithery、CCM Community和用户保存的HTTPS目录属于外部来源。
- 外部读取固定DNS核验得到的公网IP；TLS仍校验原主机名，每次重定向重新执行协议、凭据、地址和次数门禁。
- loopback、私网、共享地址、链路本地、文档地址、基准测试网段、组播、保留地址、IPv4映射IPv6和云元数据地址全部拒绝。
- URL不能包含用户名、密码或Token类敏感查询参数。私有目录Token、Smithery Key、远程MCP Header和环境变量进入AES-256-GCM凭据仓库。
- 页面、安装投影、Trace和日志只显示凭据是否配置及脱敏来源，不返回Key、Header值、完整敏感URL或本地包路径。

## Skill物料

- GitHub来源在隔离时记录真实commit SHA，激活使用同一份隔离物料，不重新读取可变化分支。
- 树哈希覆盖每个相对路径、文件类型、大小和文件内容；修改任意脚本、参考文件或`SKILL.md`都会使旧确认失效。
- 包拒绝symlink、Junction、路径逃逸、异常文件类型、单文件超限、总大小超限和文件数超限。
- 安装目录由物料checksum参与命名，名称slug相同的工具不会覆盖彼此。

## 市场事务

`MarketplaceTransactionV2`状态为：

```text
previewed → quarantined → activating → active
                                  └→ failed / recovery_required
previewed / quarantined / failed → rolled_back
```

- 社区和自定义工具默认进入`quarantined`，不会写入启用目录或启动进程。
- 预览包含命令、参数、真实可执行路径、网络目标、环境变量Key、Header Key、文件清单、授权影响和运行时影响。
- 激活Token绑定Admin用户、浏览器会话、事务、动作、来源指纹、树哈希、命令checksum、目录revision和15分钟有效期。
- stdio MCP使用结构化`command + args`和`shell:false`；Shell拼接、命令替换、程序缺失和已批准路径漂移均拒绝。
- 安装、更新和卸载使用跨进程市场锁及持久checkpoint。更新先测试新版本，失败时恢复旧配置和旧包。
- 卸载必须命中市场安装ID；手工MCP或Skill只能从普通工具管理入口删除。
- `ToolManager`加载、MCP初始化、`tools/list`及受影响运行时重同步全部成功后才进入`active`。

## MCP运行时

- 主Agent ToolManager统一支持`stdio`、`streamable_http`和`sse`。
- 远程MCP优先Streamable HTTP，协议不兼容时受控回退SSE；两者均使用安全公网读取、加密Header、30秒初始化门禁、8MB响应上限和有限重连。
- 全局、群聊和项目主Agent读取同一目录；项目子Agent原生配置和CCM代理引用同一`catalogRevision/materialHash`。
- 更新或卸载后重新生成受影响的签名授权快照。重同步失败时安装记录为`resync_required`，新派发失败关闭。
- MCP stderr只保留脱敏、限长摘要，原始stderr、Prompt、Token、Header和环境变量不进入日志或Trace。

## 迁移与恢复

- 旧官方/内部记录惰性升级为V2并继续运行。
- 无完整来源、树哈希、安装归属或运行时证明的旧外部记录进入`quarantined_legacy`，配置和包保留但禁用。
- 启动恢复将中断的`activating`事务改为`recovery_required`，只清理带CCM命名且未被事务引用的过期暂存目录。
- V1记录和历史审计保留只读，不删除手工目录或原始安装历史。

## 接口

- `GET/POST /api/marketplace/transactions`
- `GET /api/marketplace/transactions/:id`
- `POST /api/marketplace/transactions/:id/activate`
- `POST /api/marketplace/transactions/:id/retry`
- `POST /api/marketplace/transactions/:id/rollback`
- 旧install/update/uninstall接口继续返回V2事务；外部工具必须继续激活。
- `/api/marketplace/**`与`/api/smithery/**`全部为Admin专用，并继续经过CSRF门禁。

## 实现与验证

- 市场与事务：`backend/modules/tools/marketplace.ts`、`marketplace-transactions.ts`
- 公网读取：`backend/tools/secure-public-network.ts`
- MCP客户端：`backend/tools/mcp-client.ts`、`mcp-remote-client.ts`、`tool-manager.ts`
- 页面：`frontend/src/components/tools/ToolsConfigPanel.vue`
- 回归：`scripts/marketplace-supply-chain-v2-selftest.mjs`、`runtime-tool-fabric-selftest.mjs`

验证不调用付费Provider或真实外部MCP。
