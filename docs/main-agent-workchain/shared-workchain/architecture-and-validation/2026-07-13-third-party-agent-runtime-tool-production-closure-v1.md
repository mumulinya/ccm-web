# 第三方 Agent MCP / Skill 生产闭环验收 v1

日期：2026-07-13

## 目标

让项目 Agent 和群聊成员使用 Claude Code、Cursor 或 Codex 时，能够获得当前业务范围授权的 MCP 与 Skill，并以真实调用证据判断是否可用。系统不得把失败调用、缺失事件或普通文本提及误判成成功。

## 生产链路

1. 用户在项目或群聊配置 MCP 与 Skill。
2. 后端建立范围授权清单，检查服务、工具、Skill 和授权引用是否存在。
3. 派发前为具体第三方 Agent 生成独立运行时快照与原生配置文件。
4. Claude Code、Cursor 或 Codex 从自己的原生目录读取 MCP 与 Skill。
5. Agent 执行任务时，工具循环和 Skill 加载器写入带项目、群聊、任务、执行和运行时身份的审计事件。
6. 链路验收聚合授权、最新运行时快照和调用审计，生成 `verified`、`ready_not_observed`、`verification_incomplete` 或阻断状态。
7. 用户可在工具配置页查看状态、失败记录，并直接前往对应项目或群聊执行真实工具任务。

通用三 CLI 兼容矩阵与业务范围验收相互独立。兼容矩阵证明产品能够向三种 CLI 原生投递和调用工具；项目/群聊状态只接受该业务范围自己的真实调用证据。

## 严格成功口径

配置范围只有同时满足下列条件才显示“已验证可用”：

- 授权清单完整，派发门禁允许执行。
- 最新运行时快照存在、未过期且与当前工具目录一致。
- 配置了 MCP 时，至少存在一次 `ok=true` 的真实 MCP 工具调用。
- 配置了 Skill 时，至少存在一次已授权且 `ok=true` 的 `skill_invoked` 事件。
- 没有未处理的越权调用。

以下旧口径已废止：

- MCP 调用失败不算成功。
- `skill_missing` 不算 Skill 调用成功。
- 回复正文、Prompt 或日志中仅出现 Skill 名称不算成功。
- 工具循环结束但没有工具调用不算成功。
- 通用 CLI fixture 通过不能替代某个项目或群聊的业务调用证据。

## 三 CLI 真实结果

接口：`GET /api/tools/runtime-real-cli-matrix`

最终矩阵状态为 `passed`，`complete=true`：

| 运行时 | CLI 版本 | 授权快照 | MCP 服务端调用 | 原生 Skill | 版本一致 |
| --- | --- | --- | --- | --- | --- |
| Claude Code | `2.1.201` | 通过 | 通过 | 通过 | 通过 |
| Cursor | `2026.07.09-a3815c0` | 通过 | 通过 | 通过 | 通过 |
| Codex | `0.115.0` | 通过 | 通过 | 通过 | 通过 |

每次运行使用私有随机 Skill 标记和 MCP 返回标记。MCP 必须由测试服务端真实收到请求，CLI 输出必须包含该次随机返回值。输出副本保存在对应运行目录的 `cli-output.txt`，不会仅靠模型自述判断成功。

## 运行时兼容策略

- 单项重验只替换对应 CLI 的证据，其他仍新鲜的通过证据予以保留。
- 部分通过显示 `partial_passed`，不会伪装为全量成功。
- 服务重启后，超过运行窗口的 `running` 自动转为 `interrupted`。
- CLI 在执行期间升级或版本变化，本轮直接失败，要求使用新版本重新验证。
- 新鲜窗口内也会核对当前 CLI 版本；旧版本证据不能证明升级后的 CLI。
- 最新快照按业务目标去重，历史失败快照不会覆盖同一目标的新快照。
- Codex Skill 投递到 `CODEX_HOME/skills`，并通过 `$runtime-tool-e2e-skill` 原生声明调用。

## 用户状态与操作

项目和群聊统一显示三阶段：

- 已授权：目录引用完整，可创建运行时。
- 已同步：第三方 Agent 原生配置已投递，快照与目录一致。
- 已验证：该项目或群聊已出现成功 MCP / Skill 调用证据。

当已有失败调用时显示“调用验证未通过”，仍可派发，但不会显示已验证。操作按钮为“前往项目执行真实任务”或“前往群聊执行真实任务”，会跳到准确业务页面。它不再误触发通用三 CLI fixture 矩阵。

## 真实渲染证据

- [三 CLI 验收桌面端](evidence/2026-07-13-runtime-tool-matrix-desktop.png)
- [三 CLI 验收手机端](evidence/2026-07-13-runtime-tool-matrix-mobile.png)
- [项目工具配置桌面端](evidence/2026-07-13-project-tools-modal-desktop.png)
- [项目工具配置手机端](evidence/2026-07-13-project-tools-modal-mobile.png)
- [群聊工具配置桌面端](evidence/2026-07-13-group-tools-modal-desktop.png)
- [群聊工具配置手机端](evidence/2026-07-13-group-tools-modal-mobile.png)

手机项目工具弹窗遮罩层为 `z-index: 10001`，高于底部导航的 `z-index: 1000`；保存按钮可见且页面无横向溢出。

## 当前现场数据

系统能力和通用三 CLI 兼容验证已经完成，但现有运行数据仍保留三个业务范围的旧失败调用证据：

- 项目 `nova-erp-server`
- 项目 `smart-live-Cloud`
- 群聊 `gmps7ha15`（智评生活开发群）

当前链路门禁为 `dispatchReady=true`、`verified=false`、`blockingScopes=0`、`verificationIncomplete=3`。这三个范围可以派发任务，但需要各自执行一次确实调用已授权工具的真实任务，才能由审计证据升级为“已验证”。历史失败记录不会被清除或伪造成成功。

因此应区分：

- 系统功能完成：授权、投递、门禁、审计、三 CLI 原生验证、用户状态和恢复策略均已实现。
- 现场业务待验证：三个既有范围尚未产生完整成功证据，目标审计应保持 `partial`，直到真实任务发生。

## 回归命令

```text
npm run check
npm run build
npm run test:runtime-tools
npm run test:runtime-paths
```

运行时工具自测还覆盖失败证据、最新快照、CLI 版本变化、运行中断、项目工具字段、移动端弹窗层级，以及业务范围按钮不会误跑通用矩阵。
