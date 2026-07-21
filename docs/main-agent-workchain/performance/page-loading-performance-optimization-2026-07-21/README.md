# Page Loading Performance Optimization

## Objective

减少 CCM 冷启动和页面切换时不必要的脚本、接口和后台计算，并保证数据未就绪时始终有明确的加载反馈。

## Changes

### Static startup state

- `frontend/index.html` 内置轻量启动状态。
- Vue 主脚本尚未下载或执行时，页面也会显示“正在打开工作台”，不再出现空白首屏。
- Vue 挂载后会自然替换该静态节点，不新增第二套应用状态。

### Lazy music engine

- 完整 `MusicPlayer` 首次进入音乐页时才下载和挂载。
- 首屏不再加载约 107 KB JS、81 KB CSS 以及曲库、天气、下载任务和音乐记忆请求。
- 首次加载后播放器保持挂载，切换到其他页面时音乐不会中断。
- 全局 Agent、飞书或远程命令在引擎未加载时会先唤醒音乐页，等待引擎就绪后继续执行原命令。
- 轻量 `MusicRemoteHost` 继续常驻，远程点歌入口没有被关闭。

### Workbench request convergence

- 工作台首次加载只使用 SSE 的初始快照，不再同时发送重复 GET。
- SSE 1.5 秒内未给出快照时才自动降级到 GET。
- EventSource 不可用或断线时仍会恢复普通请求。
- 工作台读取接口不再触发归档写入；归档继续由既有治理调度器负责。
- SSE 后台快照检查从每 2 秒调整为每 5 秒，降低长期打开页面时的磁盘和 CPU 开销。

### Intent-based preloading

- 用户悬停或键盘聚焦侧栏、标签栏和移动端入口时，提前加载对应异步页面包。
- 只预取用户表现出访问意图的页面，不在首屏批量下载全部功能。

## Verification

- Backend TypeScript production build passed.
- Frontend Vite production build passed.
- Cold-start browser regression confirms zero `MusicPlayer` assets and zero heavy music data requests on the workbench.
- Workbench cold start uses one SSE stream and zero duplicate GET requests.
- Memory Center bundle is requested on navigation hover before click.
- Music assets and `/api/music/list` are requested only after entering the music page.
- Returning to the workbench keeps the audio engine mounted but visually hidden.
- A mock remote command confirms an unloaded audio engine triggers exactly one lazy-engine wake request; no real song or paid Provider is called.
- Static pre-Vue startup state, ready workbench, on-demand music page and machine-readable timing report are stored under `evidence/`.
