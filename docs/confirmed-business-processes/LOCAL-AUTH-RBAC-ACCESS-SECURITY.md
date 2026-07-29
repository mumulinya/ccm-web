# 本地认证、RBAC与访问安全完整流程

权威结构见[本地认证、RBAC与访问安全](../confirmed-project-architecture/LOCAL-AUTH-AND-SECURITY.md)。

```text
HTTP请求
→ Host白名单与安全响应头
→ 公开登录/首次注册，或已认证API
→ 浏览器会话 / 签名内部调用二选一
→ 浏览器修改请求校验CSRF
→ 中央RBAC确定Viewer、Operator或Admin能力
→ 业务路由
→ 会话与安全审计
```

失败关闭规则：匿名本机请求不可信；旧ACP头不可信；未登记修改接口默认Admin；内部调用方只能使用签名白名单路由；Viewer的自然语言请求只有在模型证明为只读问答后才继续。

上线回归覆盖安装码缺失、错误和重放，三角色HTTP权限矩阵，最后Admin保护，CSRF，客户端指纹，HMAC路径绑定与nonce重放，Host/CSP和登录限流跨重启。付费Provider调用为0。
