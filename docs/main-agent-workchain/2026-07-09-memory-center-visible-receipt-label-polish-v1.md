# Memory Center Visible Receipt Label Polish v1

## 目标

用户可见界面继续统一避免“回执”这种内部协议词，改用更容易理解的业务表达。

## 实现

- Memory Center 的 `IGNORE MEMORY RECEIPTS` 面板改为 `IGNORE MEMORY DECLARATIONS`。
- “不使用记忆回执”改为“不使用记忆声明”。
- “暂无 ignore-memory 回执缺口”改为“暂无 ignore-memory 声明缺口”。

## 验证

- 静态 UI 自测的 `userVisibleReceiptTerminologyPolished` 会检查这些前端源码不再包含用户可见“回执”。
