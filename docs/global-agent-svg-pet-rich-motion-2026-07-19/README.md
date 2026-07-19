# 全局 Agent SVG 宠物丰富动作升级

## 目标

全局 Agent 根据参考图生成的宠物，不能把待机立绘加一个气泡、emoji 或状态角标当作动作。思考、工作、开发、验收等状态必须像现有桌面宠物一样，由角色姿态和连续运动本身表达。

## 动作合同

每个 SVG 使用 `192x208` 画布，并必须包含：

- `data-pet-state` 精确状态标记。
- `pet-body` 稳定角色主体。
- `pose-{state}` 状态专属姿态。
- `data-motion-role="primary"` 主动作，作用于身体、肢体或角色持有的工具。
- `data-motion-role="secondary"` 表情、眼睛、耳朵、尾巴、头发、衣物或道具的跟随动作。
- 至少两个独立 SMIL 动画，且至少一个 `animateTransform`。
- 足够的矢量角色结构，禁止用文字、emoji、漂浮图标或整体晃动冒充动作。

状态规范进一步定义了完整动作语义。例如 `thinking` 需要头身倾斜、目光或手部检查动作；思考提示只能是辅助元素。`building` 需要组装、锤击、连接或操作工具的冲击和回位阶段。

## 运行时对齐

- 生成包保留 `building`、`reviewing`、`waiting` 和 `drag` 的独立 SVG，不再把 `building` 映射到 `working`。
- 网页宠物、皮肤图鉴和 Agent 宠物列表使用生成皮肤的真实状态资源。
- Electron 桌面宠物接收 `format` 和 `generationEngine`，为 `global-agent-svg` 加载 SVG 状态表。
- 生成宠隐藏通用 emoji 状态角标，由动作画面本身表达状态。
- 旧 v2 图集与内置宠物继续兼容。

## Fail Closed

模型输出只要缺少角色主体、专属姿态、主动作、跟随动作或动画结构，就不会进入安装阶段。脚本、外部资源、文字替代动作、错误画布和过度简化的 SVG 同样会被拒绝。

## 验证

- `node scripts/global-agent-svg-pet-selftest.mjs`：通过。
- `node scripts/pet-workspace-companion-selftest.mjs`：通过。
- `npm run build:backend`：通过。
- `npm run build:frontend`：通过，2076 个模块。
- `node scripts/pet-workspace-companion-render-regression.mjs`：桌面与移动端通过，宠物列表、SVG 确认预览和生成记录均正常。
- 测试全部使用 mock 模型，付费 Provider 调用为 0。
