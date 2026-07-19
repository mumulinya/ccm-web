# SVG 宠物形象预览完整显示修复

## 问题

全局 Agent 已生成完整 SVG，且角色内容位于 SVG 的 `viewBox` 内，但生成记录中的预览只显示头部。原因是固定高度的 Grid 容器将图片按网格固有尺寸撑高，图片实际高度远超容器，再被 `overflow: hidden` 裁掉。

## 修复

- 生成结果预览改为 Flex 居中布局，避免 Grid 固有行尺寸放大图片。
- 图片使用 `max-width: 100%`、`max-height: 100%` 和自动宽高，完整保持 SVG 原始宽高比。
- 桌面预览高度调整为 240px，移动端为 220px，使完整角色更容易检查。
- 不修改生成出的 SVG，不裁剪、不拉伸，也不重新调用模型。

## 验证

- `npm run build:frontend`：通过。
- `node scripts/pet-workspace-companion-render-regression.mjs`：通过。
- 回归测试会等待 SVG 加载完成，比较图片与容器边界，并校验渲染宽高比和 SVG 自然宽高比一致。
- 桌面、移动端、形象确认和动作确认相关回归全部通过。
- 本次验证使用现有数据和 mock 接口，付费模型调用为 0。
