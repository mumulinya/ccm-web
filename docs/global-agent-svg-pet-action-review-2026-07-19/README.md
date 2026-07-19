# 全局 Agent SVG 宠物动作审核升级

## 目标

将宠物生成从“确认一张待机图后自动安装”升级为两阶段用户确认，并让动作质量由真实渲染结果而不是 SVG 标签数量决定。

## 两阶段事务

1. 用户上传参考图，全局 Agent 生成 `idle` 形象预览。
2. 用户确认或修改角色形象。
3. 全局 Agent 分批生成 26 个独立状态。
4. Chromium 在 `0s`、`0.43s`、`0.97s` 渲染每个 SVG，生成 `visual-qa.json` 与动作总览 PNG。
5. 通过渲染门禁后，全局模型同时读取原参考图和动作总览，复审身份一致性。
6. 任务进入 `awaiting_action_approval`，不会安装。
7. 用户可选择任一动作填写意见并单独重做；重做后整套动作重新验收。
8. 只有渲染验收与身份复审都通过，用户点击“确认整套并安装”后才写入正式皮肤配置。

服务重启会保留两个等待确认状态。生成、重做、验收或安装中断会转为可重试失败；原参考图、已确认形象和已生成动作文件保留。

## 独立动作集合

在原 12 个核心状态基础上，以下状态不再复用其他动作：

- `planning`、`debugging`、`notification`、`attention`
- `juggling`
- `yawning`、`dozing`、`collapsing`、`waking`
- `click_left`、`click_right`、`double_click`
- `idle_look`、`idle_play`

安装时分别映射为网页与 Electron 桌面宠物所需的状态文件、点击反馈文件和待机随机动作文件。

## 渲染门禁

每个动作检查：

- 非空且角色占据合理画面比例。
- 角色未越出 `192x208` 安全区域。
- 主动作在三个时间点有真实位移、缩放、旋转或形变。
- 跟随动作有独立的实际变化。
- 角色主体面积、中心和配色相对已确认待机形象没有异常漂移。
- 动作源码指纹不与任何其他状态重复。

仅添加 `<animate>` 标签但数值不变化、复制另一个状态后只改状态名称、角色过小或越界都会失败。

## 模型一致性复审

渲染门禁全部通过后才执行一次模型复审，避免为确定失败的动作浪费模型调用。模型对照：

- 用户原参考图。
- 已批准角色设定。
- 26 状态动作总览。

复审关注轮廓、脸部、发型、服装、配色、左右侧配件和比例。分数低于 `0.72` 或存在明确问题时禁止安装。

## 接口

- `GET /api/pets/generation-jobs/preview?id=...&state=...`：读取单动作 SVG。
- `GET /api/pets/generation-jobs/contact-sheet?id=...`：读取动作总览。
- `POST /api/pets/generation-jobs/actions-regenerate`：单次重做最多 3 个动作，单动作最多 5 次。
- `POST /api/pets/generation-jobs/actions-approve`：验收通过后确认并安装。

## 验证

- `node scripts/global-agent-svg-pet-selftest.mjs`：通过。
  - 实际渲染运动通过。
  - 冻结动画拒绝。
  - 复制动作拒绝。
  - 动作总览生成。
  - 双图身份复审输入正确。
  - 未确认动作前禁止安装。
- `node scripts/pet-workspace-companion-selftest.mjs`：通过。
- `node scripts/pet-workspace-companion-render-regression.mjs`：桌面与移动端通过。
- backend/frontend production build：通过。
- 所有自动测试使用 mock 模型，付费 Provider 调用为 0。

