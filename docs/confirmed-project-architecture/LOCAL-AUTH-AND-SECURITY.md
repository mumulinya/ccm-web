# 本地认证、RBAC与访问安全

## 完整业务流程

```text
首次运行 CCM
→ 生成24小时一次性安装码（只保存Hash）
→ ccm setup-code 在服务器本机显示原码
→ 首次注册原子创建唯一Admin并销毁安装码
→ 登录与持久限流
→ 创建绑定客户端指纹和CSRF的HttpOnly会话
→ 中央API策略解析角色与能力
→ Viewer / Operator / Admin业务门禁
→ 浏览器或签名内部调用
→ API执行与安全审计
```

## 首次安装与注册

- 真正没有用户的新安装不创建默认账户，也不生成随机管理员密码。
- 首次读取认证状态时生成一次性安装码。原码只写入所有者可读文件，认证接口和登录页不返回路径或原码。
- `ccm setup-code`显示有效安装码；`ccm setup-code --rotate`只允许在没有用户时轮换。
- 安装码有效期24小时。首次注册必须提交安装码，用户文件锁保证并发请求只有一个能创建首个`admin`。
- 创建成功后安装码立即失效并删除原码文件。以后开放注册只创建`viewer`，注册默认关闭。
- 已有V1管理员、密码Hash和用户ID保持不变；旧`role=user`惰性归一为`viewer`。

## 角色与能力

| 角色 | 允许 | 禁止 |
| --- | --- | --- |
| Viewer | 查看普通数据、知识检索、普通只读问答 | 创建任务、写工具、源码修改、进程、Git写入和系统管理 |
| Operator | Viewer能力、任务执行、附件、项目源码运行、Git协作 | 账户、项目定义、终端、Agent凭据、工具市场、永久清理和高风险审批 |
| Admin | 全部能力 | 无 |

- 所有`/api`请求先经过中央策略。GET默认至少Viewer；敏感日志、终端、凭据和安全状态要求Admin；修改请求默认Admin，Operator接口必须明确登记。
- Viewer发送全局、群聊或项目消息时，模型仍负责语义判断。只有只读回答可以继续；模型判定需要任务、写工具或文件修改时返回`VIEWER_EXECUTION_FORBIDDEN`。
- 高风险权限只能由浏览器中已登录的Admin批准，签名内部调用不能绕过。
- 页面按能力隐藏管理入口，但服务端门禁始终是权威。

## 账户与会话生命周期

- Admin可以查看账户，调整角色，禁用、恢复、删除和撤销会话。
- 不能删除自己；不能删除、禁用或降级最后一个有效管理员。
- 角色安全变更、账户禁用、密码修改和管理员撤销都会使相关会话失效。
- 用户可查看并撤销自己的会话；Admin可管理全部用户会话。
- 密码使用随机盐`scrypt`；会话文件只保存Token的SHA-256。
- Cookie为`HttpOnly`、`SameSite=Strict`，HTTPS下增加`Secure`，有效期7天。
- V2会话保存随机CSRF、客户端指纹、最近访问、到期和撤销信息。所有同源修改请求必须提供`X-CCM-CSRF`。
- 指纹不匹配会撤销会话并返回`SESSION_CLIENT_MISMATCH`。登出只有服务端确认后才切换登录页。

## 登录限流

- 登录失败账本只保存脱敏Hash，并通过文件锁持久化。
- 账号+地址15分钟内失败5次锁定15分钟；同地址失败30次锁定1小时；24小时内重复触发升级为24小时。
- 账本跨重启生效，最多5000项，并清理过期和最旧记录。
- 只有`CCM_TRUST_PROXY=1`且直连来源为可信本机代理时读取转发地址。

## 内部API身份

- 无Cookie本机请求、`X-CCM-ACP: 1`和`X-CCM-QUEUED-FEISHU: 1`不再是认证证据。
- 全局Agent桥接、飞书ACP、项目飞书队列、后台恢复和CLI停止使用HMAC头；调用方、方法、完整路径、时间和随机nonce共同签名。
- 签名有效期30秒，nonce只能使用一次且缓存有界。不同调用方具有独立路由白名单。

## 网络安全

- 默认只接受loopback、监听地址和本机网卡Host。公网域名通过`CCM_PUBLIC_ORIGIN`或`ccm start --public-origin`显式配置。
- 静态和API响应统一包含CSP、`frame-ancestors 'none'`、`nosniff`、Referrer Policy和Permissions Policy。

## 数据、接口与验证

- 用户：`ccm-local-auth-users-v2`；会话：`ccm-local-auth-sessions-v2`。
- 账户接口：`/api/auth/users`及角色、状态、删除、用户会话撤销。
- 会话接口：`/api/auth/sessions`及单会话撤销。
- `/api/auth/session`只返回公开用户、能力、CSRF和会话元数据，不返回Token、密码或安装码。
- 实现：`backend/modules/system/local-auth.ts`、`api-access-control.ts`、`internal-api-auth.ts`。
- 页面：`frontend/src/components/auth/AuthPage.vue`、`frontend/src/Root.vue`、`SettingsSecurityPanel.vue`。
- 回归：`scripts/local-auth-selftest.mjs`与`local-auth-rbac-static-audit.mjs`，Provider调用为0。
