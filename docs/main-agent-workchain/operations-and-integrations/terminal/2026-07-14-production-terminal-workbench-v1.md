# 生产级内置终端工作区 v1

## 目标

将原先同步等待结果的终端模拟器升级为可用于日常开发工作的终端工作区，并保持终端技术输出完整可查。

## 后端

- 新增独立 `backend/modules/tools/terminal.ts`，不再把新增运行逻辑继续堆入通用工具路由。
- `/api/terminal/stream` 使用 PowerShell/bash 子进程和 SSE 实时返回 `started/stdout/stderr/done` 事件。
- `done` 事件包含退出码、耗时、停止状态和命令结束后的真实工作目录。
- `/api/terminal/stop` 可以停止指定运行；服务关闭时会清理全部终端子进程。
- 同时运行上限为 4，命令、输出、历史和会话数量都有明确上限。
- `/api/terminal/workspace` 使用原子 JSON 与备份机制保存多会话、目录、历史、输出和上次运行结果。
- 原 `/api/terminal/exec` 和 `/api/terminal/info` 保留，兼容已有调用。

## 前端

- 使用功能命名的终端工作区，不再使用装饰性窗口圆点和 emoji 工具栏。
- 使用 Lucide 图标统一新建、分屏、历史、清屏、重置、复制、下载和停止操作。
- 每个终端独立维护项目目录、命令历史、输出、运行状态、退出码和耗时。
- 分屏只改变视图，不删除第二终端；最多保存 4 个会话。
- 输出实时追加，可过滤、复制和下载；历史抽屉可搜索并重新填入命令。
- `clear/cls` 本地清屏；高风险命令和高风险快捷命令执行前必须确认。
- 桌面使用双列分屏；手机使用单列终端和横向快捷命令，避免横向页面溢出。

## 验证

- `npx tsc backend/modules/tools/terminal.ts --noEmit ...`：通过。
- `npm run build`（frontend）：通过。
- `node scripts/terminal-production-selftest.mjs`：通过。
  - 工作区真实落盘与恢复。
  - 延迟命令输出实时分段返回。
  - 退出码和耗时正确。
  - 长命令可以在运行中停止。
- `node scripts/terminal-render-regression.mjs`：通过。
  - 桌面无损分屏。
  - 流式结果、退出码和耗时可见。
  - 历史抽屉可用。
  - 手机无页面横向溢出。

## 截图

- `scratch/terminal-render-regression/desktop-split-workspace.png`
- `scratch/terminal-render-regression/desktop-command-result.png`
- `scratch/terminal-render-regression/desktop-history-drawer.png`
- `scratch/terminal-render-regression/mobile-terminal-workspace.png`

完整断言记录见 `scratch/terminal-render-regression/report.json`。
