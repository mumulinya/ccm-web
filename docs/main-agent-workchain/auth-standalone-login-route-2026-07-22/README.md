# 登录页独立路由

Date: 2026-07-22

## 问题

旧实现只在根组件中用登录页替换工作台，没有改变浏览器地址。用户从设置等页面退出或 Token 失效时，虽然看到登录界面，地址栏仍保留 `?tab=settings`，容易误认为登录页属于设置页面。

## 当前行为

- 未登录访问任意 CCM 页面时，当前同源地址暂存到 `sessionStorage`，浏览器地址通过 `history.replaceState` 切换为 `/login`。
- 登录成功后恢复登录前的同源页面，例如 `/login` 恢复为 `/?tab=settings`。
- 退出登录或 Token 失效时统一进入 `/login`。
- 已登录用户直接访问 `/login` 时返回暂存页面；没有暂存页面时返回 `/` 工作台。
- 返回地址只允许当前 origin 下以 `/` 开头的路径，拒绝 `//` 和外部 origin，避免开放重定向。
- 服务端已有 SPA fallback，直接刷新 `/login` 仍返回 CCM 前端入口。

登录页仍由根认证层拥有，不放入设置菜单、工作台标签或任何业务页面。

## 验证

```text
npm run build:frontend
```

Playwright 验证：

- 未登录 `/?tab=settings` -> `/login`；
- 登录成功 `/login` -> `/?tab=settings`；
- 已登录直接访问 `/login` -> `/`。
