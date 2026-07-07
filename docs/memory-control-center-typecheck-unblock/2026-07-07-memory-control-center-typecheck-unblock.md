# Memory Control Center Typecheck Unblock

## Why

在验证 marketplace 授权影响升级时，`npm run check` 被 `backend/modules/knowledge/memory-control-center.ts` 的 TypeScript 推断问题阻断。该文件已有未提交改动，`previousById.get()` 被 TypeScript 推断为 `unknown`，导致后续读取 `id`、`createdAt`、`seenCount` 和对象展开时报错。

## Changes

- 将 `previousById` 显式标注为 `Map<string, any>`。
- 不改变运行时逻辑，只修正 TypeScript 对 Map value 的类型推断。

## Affected Files

- `backend/modules/knowledge/memory-control-center.ts`

## Verification

- 该修复用于恢复 `npm run check` 的后端 TypeScript 验证。
- `npm run build:backend`
- `npm run check`

## Risks

- 这是类型标注级别修复，不改变 replay repair work item 的数据合并逻辑。
