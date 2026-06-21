# Agent 工作流程最佳实践

## 🎯 核心原则

### 1. 修复循环 vs 验证循环

**❌ 错误的验证循环**：
```
Read dist/server.js → npm run check 失败 → 重复（没有修复）
```

**✅ 正确的修复循环**：
```
npm run check 失败 → 分析错误输出 → 定位源文件 → 修复错误 → 重新验证
```

### 2. 编译失败时的处理流程

当 `npm run check` 或 `npm run build` 失败时：

1. **读取完整错误输出**
   - 不要只看 exit code
   - 读取 tsc 的完整错误信息
   - 找到具体的文件路径、行号和错误类型

2. **定位问题源文件**
   - 错误通常在仓库根目录的 `backend/` 目录下
   - 不要读 `dist/` 目录下的编译输出
   - 使用错误信息中的文件路径定位

3. **修复 TypeScript 错误**
   - 类型错误：添加正确的类型注解或类型断言
   - 导入缺失：添加缺失的 import 语句
   - 语法问题：修复语法错误
   - 未使用的变量：删除或使用

4. **重新验证**
   - 修复后运行 `npm run check` 验证
   - 确保所有错误都已修复
   - 运行 `npm run build` 确认编译成功

### 3. CCM_AGENT_RECEIPT 要求

**必须在回复末尾添加 receipt**：

```json
{
  "ccm_receipt": true,
  "status": "done | partial | blocked | failed | needs_info",
  "summary": "一句话说明实际完成/确认了什么",
  "actions": ["实际执行的动作"],
  "filesChanged": ["修改过的文件路径"],
  "verification": ["已运行的验证命令及其结果"],
  "blockers": ["阻塞点或缺失信息"],
  "needs": ["还需要用户或其他 Agent 补充的内容"]
}
```

**status 选择指南**：
- `done`：任务完全完成，所有验证通过
- `partial`：部分完成，还有未完成的部分
- `blocked`：被阻塞，需要外部帮助
- `failed`：任务失败，无法完成
- `needs_info`：需要更多信息才能继续

### 4. Windows 环境注意事项

**spawn EPERM 问题**：
- Windows 下 PowerShell 可能有权限限制
- 使用 `check-build.bat` 脚本运行检查
- 或使用 `cmd /c` 前缀运行命令

**示例**：
```bash
# 直接运行
npm run check

# 使用 cmd 运行
cmd /c "npm run check"

# 使用批处理脚本
check-build.bat
```

## 📋 检查清单

### 任务开始前
- [ ] 理解任务需求
- [ ] 检查项目结构
- [ ] 了解相关文件

### 任务执行中
- [ ] 执行必要的修改
- [ ] 运行验证命令
- [ ] 如果验证失败，修复问题后重新验证
- [ ] 记录所有修改的文件

### 任务完成后
- [ ] 运行 `npm run check` 确保通过
- [ ] 运行 `npm run build` 确保通过
- [ ] 生成 CCM_AGENT_RECEIPT
- [ ] 在回复末尾添加 receipt

## 🔧 常见问题解决

### 问题 1：npm run check 失败

**症状**：
```
error TS2304: Cannot find name 'xxx'
error TS2345: Argument of type 'xxx' is not assignable to parameter of type 'xxx'
```

**解决**：
1. 找到错误所在的 `.ts` 文件
2. 添加缺失的 import 或类型注解
3. 重新运行 `npm run check`

### 问题 2：npm run build 失败

**症状**：
```
error TS1148: Cannot compile modules unless the '--module' flag is provided
```

**解决**：
1. 检查 `tsconfig.json` 配置
2. 确保 `module` 选项正确设置
3. 重新运行 `npm run build`

### 问题 3：spawn EPERM

**症状**：
```
Error: spawn EPERM
```

**解决**：
1. 使用 `check-build.bat` 脚本
2. 或使用 `cmd /c` 前缀运行命令
3. 检查 PowerShell 执行策略

## 📚 相关文档

- [CCM 系统架构](./daily-dev-agent.md)
- [Coordinator/Worker 协议](./daily-dev-agent.md#coordinatorworker-协议)
- [CCM_AGENT_RECEIPT 格式](./daily-dev-agent.md#ccm_agent_receipt)
