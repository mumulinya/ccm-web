# 群聊动态测试目标与安全登录验收

## 目标

群聊中的项目不再固定为“App 端、Admin 端”。用户可以为当前群聊的任意项目配置多个测试目标，例如 Web 用户端、运营后台、H5、API、混合应用或原生应用，并为每个目标单独设置环境、入口、启动方式、验证命令和认证方式。

## 业务流程

1. 用户在群聊顶部打开“测试目标”。
2. 测试目标必须绑定当前群聊已有项目，名称、类型和环境由用户自由填写。
3. 登录字段可以动态增加，字段值由本机 AES-256-GCM 凭据库保存；群聊数据只保存 `ccm-secret://` 引用。
4. 群聊主 Agent 通过签名的 `ccm__test_acceptance/list_test_targets` 读取无凭据目标清单。
5. 主 Agent 可以把 `test_target_ids` 传给 `create_test_work_order`；标记为“每次验收必测”的目标始终加入。
6. 未指定目标时，当前项目下所有已启用目标展开为独立 TestAgent 项目目标。
7. TestAgent 模型读取目标名称、类型、环境、URL、登录字段的环境变量名和当前源码，生成只读验证计划。
8. worker 启动前按 `groupId + targetId + checksum` 重新读取配置。配置变化、目标删除或跨群聊引用时拒绝旧工单。
9. 凭据只进入运行时执行副本，用于验证命令、开发服务器和 Playwright；规范化工单、模型 Prompt、运行状态、报告和 artifact 均不包含明文。
10. 确定性证据门禁继续决定 `accept/rework/need_human`，模型不能自行宣布通过。

## 数据结构

每个 `GroupTestTargetV1` 包含：

- `id/project/name/kind/environment`
- `enabled/required`
- `baseUrl/startupCommand/verificationCommands`
- `auth.mode`
- `auth.loginPath/submitLabel/successText/successUrlIncludes`
- `auth.storageStatePath/existingSessionProvider`
- 动态 `auth.fields[]`，包含名称、环境变量名、页面输入框标签和加密引用
- `createdAt/updatedAt/checksum`

API：

- `GET /api/groups/test-targets?id=<groupId>`
- `POST /api/groups/test-targets`
- `POST /api/groups/test-targets/delete`

`GET /api/groups`、创建、成员修改和重命名响应不会返回测试目标密文引用，只返回 `test_target_count`。

## 认证模式

- `none`：公开入口或无需登录。
- `credentials`：Playwright 使用 `valueEnv` 在执行时填写动态字段；必须设置登录成功文本或 URL 特征。
- `storage_state`：状态文件必须位于项目工作目录内，状态正文不会发送给模型。
- `existing_session`：要求受控浏览器 MCP。正式 worker 没有执行器时明确阻止。

Web、H5 和混合应用使用 Playwright；API 由 HTTP 与项目命令验证。原生应用目标可以配置，但只有项目提供受控的 Appium、Maestro 或同类原生驱动时才会产生原生交互证据。

## 安全边界

- 测试目标不能绑定群聊外项目。
- MCP 模型不能通过参数指定其他群聊。
- 凭据值不进入群聊 JSON、TestAgent 工单、模型规划、报告或 artifact。
- 删除目标、删除登录字段或显式清空字段时，会同步删除对应的本机密文条目。
- 登录检查关闭普通截图、trace、HAR 和视频中的敏感采集，沿用 TestAgent 认证脱敏策略。
- 旧工单的目标校验和与当前配置不一致时必须重新规划。
- 不以字符截断、放宽校验或伪造登录状态绕过失败。

## 验证证据

- `npm run test:group-test-targets`：14/14，通过；付费 Provider 调用 0。
- `npm run test:test-agent-runtime-env`：5/5，通过；验证凭据到达子进程且未进入报告或 artifact；付费 Provider 调用 0。
- `npm run test:test-agent-agentic-planning`：9/9，通过；付费 Provider 调用 0。
- `npm run build:backend`：通过。
- `npm run build:frontend`：通过。
