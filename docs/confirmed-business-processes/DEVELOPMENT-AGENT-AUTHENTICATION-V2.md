# 开发 Agent 认证与可用性 V2

Date: 2026-07-29

Status: Confirmed and implemented

## 正式流程

```text
安装检测 -> 凭据来源识别 -> 原生登录或模型challenge -> 持久认证证据
-> 账号与模型目录 -> 任务启动门禁 -> 失效、退出与恢复
```

Codex、Antigravity CLI和OpenCode的本机状态只证明存在候选认证，不能直接证明账号仍可用。Cursor可使用CLI的正向status证据；Claude Code绑定CCM或CC-Switch配置，但仍需真实API challenge。只有有效的`DevelopmentAgentAuthEvidenceV2`才能让项目任务进入对应运行时。

## 认证证据

证据绑定Provider、脱敏账号指纹、模型、CLI版本、来源、验证时间、过期时间和checksum，不保存Token、API Key、Prompt或CLI原始输出。模型测试使用单次随机challenge，只解析Provider结构化最终assistant事件；用户输入回显、日志和stderr中的标记不能通过。

配置、模型、账号、CLI版本、登录和退出变化都会使旧证据失效。任务启动失败关闭，不静默换用其他开发Agent。

## Provider边界

- OpenCode登录允许选择Provider，不再固定OpenAI；未指定时由OpenCode交互选择。
- Antigravity使用官方`agy`管理账号。CCM只读取非敏感状态并执行随机challenge，不保存、转发或删除Google认证材料；登录、退出和切换账号在官方交互终端完成。
- 历史内部ID`gemini`继续映射到Antigravity，旧项目与任务无需迁移；旧`gemini`可执行程序不再进入生产派发。
- Claude远程接口必须使用HTTPS，HTTP只允许localhost、127.0.0.0/8和::1。
- 模型目录按Provider、账号、CLI版本和认证checksum做Singleflight及短期缓存，旧请求不能覆盖新账号结果。

## 进程与安装

模型测试在Windows终止完整进程树，在Linux/macOS使用独立进程组并执行SIGTERM/SIGKILL。安装任务持久保存状态、PID和终态；CCM重启后核验原进程，不把中断任务显示为idle。

## 页面口径

页面区分未安装、检测到凭据、验证中、已验证、已过期和失败。检测到凭据时允许用户执行测试，但不能用于正式任务。模型目录只加载一轮，并使用请求generation阻止旧响应覆盖。

## 验证

自动化测试覆盖结构化challenge、Prompt回显拒绝、OpenCode多Provider参数、Claude HTTPS边界、模型选择、账号脱敏和任务运行时配置。默认Provider均为Mock，付费调用为0。
