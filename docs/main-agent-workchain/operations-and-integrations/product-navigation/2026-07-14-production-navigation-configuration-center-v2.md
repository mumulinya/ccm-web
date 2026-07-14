# 生产级导航配置中心 v2

## 目标

将原有菜单管理页和侧边栏中的重复配置入口合并为一个可实际使用的导航配置中心。用户只在菜单管理页维护一次，桌面侧栏、浏览器式标签页、移动端底栏和“更多”面板立即使用同一份结果。

## 用户能力

- 创建、编辑、删除和调整功能分组顺序。
- 调整菜单所属分组和组内顺序。
- 隐藏暂时不用的菜单；隐藏后同时取消常用和手机入口状态。
- 将高频菜单固定到桌面侧栏的“常用”区域。
- 自定义最多四个手机主导航入口，其余入口自动进入“更多”。
- 添加、编辑和删除外部链接。
- 导入、导出、恢复默认和撤销到上一版配置。
- 通过搜索和“全部、常用、手机入口、已隐藏”视图快速定位配置项。

菜单管理入口受到保护，不能被隐藏，避免用户失去恢复导航的入口。

## 统一配置

配置使用版本化结构 `ccm-navigation-config-v2`，包含：

- `groups`：有序分组定义。
- `items`：菜单的分组、顺序、隐藏、常用和手机入口状态。
- `customLinks`：经过安全校验的外部链接。
- `schema`、`version`、`updatedAt`：格式识别和升级信息。

首次加载会自动迁移旧键：

- `menu-groups`
- `menu-tab-groups`
- `menu-custom-links`
- `tab-order`

新菜单会自动补齐默认分组，不会因为旧配置缺少项目而漂移到未分组。当前补齐范围包含知识库、记忆控制中心、清理中心和菜单管理等后续加入的页面。

## 安全与恢复

- 外部链接仅允许完整的 `http://` 或 `https://` 地址。
- 拒绝 `javascript:` 等非网页协议。
- 拒绝在 URL 中携带用户名或密码。
- 外部链接只以新标签页打开，并使用 `noopener,noreferrer`。
- 不再通过无沙箱 iframe 加载用户输入的地址。
- 每次保存前保留一份上一版配置，可直接撤销。
- 导入内容会重新标准化和校验，不能绕过隐藏保护、手机数量限制或 URL 安全规则。

## 页面导航修复

- `?tab=menumanager` 现在首屏直接加载菜单管理，不再先挂载工作台后切换。
- 页面切换会同步当前 `tab` 到地址栏。
- 清理项目、群聊或任务定位参数时保留当前 `tab`。
- 刷新页面后仍停留在当前功能页，导航配置和新建分组保持生效。

## 实现位置

- `frontend/src/utils/menuConfiguration.js`：配置创建、迁移、标准化、保存、备份、导入导出和安全校验。
- `frontend/src/components/workspace/MenuManager.vue`：统一导航配置中心交互界面。
- `frontend/src/App.vue`：桌面、移动端和深链导航消费统一配置。
- `scripts/menu-configuration-selftest.mjs`：配置模型与源码契约自测。
- `scripts/menu-configuration-render-regression.mjs`：生产页面 Playwright 真实交互和截图回归。

## 验证

- `npm run test:menu-configuration`：通过。
- `npm run test:menu-configuration:render`：通过。
- `npm run build:frontend`：通过。

Playwright 真实交互覆盖：

1. 20 个内置菜单完整进入默认分组。
2. 固定代码变更后，桌面侧栏立即出现“常用”；隐藏性能监控后，侧栏立即移除该入口。
3. `javascript:` 外链被拒绝，合法 HTTPS 外链可以保存。
4. 新建分组与之前的固定、隐藏和外链配置在刷新后保留。
5. 390 x 844 移动端按配置显示四个主入口，菜单管理页可滚动操作且没有横向溢出。

## 截图证据

- `evidence/menu-configuration-v2/desktop-navigation-center.png`
- `evidence/menu-configuration-v2/desktop-pinned-hidden-and-link.png`
- `evidence/menu-configuration-v2/desktop-persisted-configuration.png`
- `evidence/menu-configuration-v2/mobile-navigation-center.png`

完整机器可读结果见 `evidence/menu-configuration-v2/report.json`。
