# 音乐播放器沉浸式氛围改版

## 目标

将现有 Aura Music 从多块同权重的霓虹玻璃面板，重构为清晰的夜间音乐工作台。改版保留本地曲库、歌单、队列、下载中心、音乐 Agent、歌词、频谱和单播放器互斥逻辑。

## 页面结构

- 顶部为品牌、当前歌曲状态、陪伴时间、天气和音源切换，不再重复曲库导航。
- 左上为当前歌曲封面舞台，显示播放状态、收藏、歌曲身份、情绪和今日音乐文案。
- 中上为歌词与声音舞台，包含逐行歌词、当前时间、实时频谱和下一首推荐。
- 左下曲库横跨两栏，继续支持搜索、上传、下载、收藏、队列、歌单和排序。
- 右侧音乐助手贯穿上下两行，保留聊天、推荐结果、重试、清空和设置。
- 底部只保留一个固定播放器，不新增第二套播放控制或音频元素。

## 视觉系统

- 深炭黑与蓝黑作为基础，青色、洋红、紫色和少量琥珀色共同构成音乐光源。
- 背景继续使用当前封面，但降低亮度与饱和度，只承担环境光，不影响信息阅读。
- 当前封面保持清晰，歌词激活行使用青色和洋红混合辉光。
- 卡片圆角统一不超过 8px，减少旧版大面积模糊和同层级玻璃块。
- 动画尊重 `prefers-reduced-motion`，用户减少动态效果时关闭环境动画。

## 响应式行为

- 宽桌面为三栏两行布局。
- 中等宽度切换为双栏播放舞台，曲库与助手分别占整行。
- 手机端依次展示封面、歌词、曲库和助手；内部工作区滚动，底部播放器与应用底部导航保持独立安全区。
- 手机封面限制为约 220px，歌词和推荐区压缩到一屏内，避免可点击区域被系统导航遮挡。

## 实现文件

- `frontend/src/components/music/MusicPlayer.template.html`
- `frontend/src/components/music/MusicPlayerPanel.vue`
- `frontend/src/components/music/MusicPlayerAtmosphere.css`

旧的业务样式继续保留，新的氛围样式作为最后加载的视觉层，避免改动播放、曲库和 Agent 数据逻辑。

## 验证

- `npm run build:frontend`
- `npm run check`
- `npm run test:music-latest-wins`
- `CCM_MUSIC_URL=http://127.0.0.1:3080/ npm run test:music-render`

Playwright 覆盖桌面与 390x844 手机视口，并验证收藏、歌单创建、添加歌曲、排序、重命名、助手搜索、重试和下载中心。页面无横向溢出、无交互控件重叠，付费 Provider 调用为 0。

## 证据

- 概念参考：`concept-reference.png`
- 桌面：`../main-agent-workchain/operations-and-integrations/music/evidence/production-workflow/01-music-desktop.png`
- 桌面助手：`../main-agent-workchain/operations-and-integrations/music/evidence/production-workflow/02-music-assistant-desktop.png`
- 手机歌单：`../main-agent-workchain/operations-and-integrations/music/evidence/production-workflow/03-music-mobile-playlist.png`
- 手机下载：`../main-agent-workchain/operations-and-integrations/music/evidence/production-workflow/04-music-mobile.png`
