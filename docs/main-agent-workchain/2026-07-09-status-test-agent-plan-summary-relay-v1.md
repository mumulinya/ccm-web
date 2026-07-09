# TestAgent 复核计划状态转述 v1

## 背景

TestAgent 的具体执行流程由独立模块负责，主 agent 这里只消费 TestAgent 已产出的计划/复核事件，并把用户需要看到的内容转成友好摘要。

此前群聊和全局实时卡片已经能显示 TestAgent 复核计划与复核结论，但用户追问“现在进展怎么样”时，只有复核失败/需返工会被明显转述。若当前只生成了 TestAgent 复核计划、还没有最终复核结论，状态摘要容易退回到普通“执行中”或历史完成文案。

## 本次改动

- 全局主 agent 新增 TestAgent 复核计划状态摘要。
- 群聊主 agent 新增 TestAgent 复核计划状态摘要。
- 进展追问里优先显示：
  - TestAgent 计划是否可执行；
  - 复核范围、命令/HTTP/浏览器检查数量；
  - 下一步是启动真实复核，还是先修复交接信息。
- 技术字段、证据路径、原始计划对象继续留在技术详情，不进入用户可读状态摘要。
- 只有 TestAgent 计划、没有复核结论时，不再用旧的“任务已完成”文案盖过当前复核阶段。

## 边界

- 不修改 TestAgent 内部业务流程。
- 不改变普通问话策略，普通问话不会额外展示 Todo 或任务卡。
- 主 agent 只做连接、消费、转述和状态汇总。

## 验证

- `node scripts/main-agent-decision-ui-selftest.mjs`
- `npm run check`
- `npm run build:backend`
- `npm run test:render-regression`
- `git diff --check`
