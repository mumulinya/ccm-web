# MCP Native Tool Name Parsing

## Background

CCM prompts and runtime permission rules can reference MCP tools in native-style names:

```text
mcp__ccm__payments__createInvoice
```

The server name itself includes `ccm__`, so a naive `mcp__(server)__(tool)` parser can split this incorrectly as:

```text
server = ccm
tool = payments__createInvoice
```

That breaks two important paths:

- ToolManager may fail to execute a proxy tool call emitted with the native MCP name.
- Authorization/runtime sync audits may misclassify tool-scoped grants.

## What Changed

The MCP grant parser was updated in:

- `backend/tools/tool-manager.ts`
- `backend/tools/runtime-tool-sync.ts`
- `backend/tools/tool-authorization.ts`

The parser now treats `mcp__ccm__<server>__<tool>` as:

```text
server = ccm__<server>
tool = <tool>
```

ToolManager also resolves proxy tool calls by these accepted forms:

- raw tool name, such as `createInvoice`
- grant-style name, such as `payments/createInvoice`
- native-style name, such as `mcp__ccm__payments__createInvoice`

After resolution, ToolManager sends the canonical MCP tool name (`createInvoice`) to the underlying MCP client while keeping the original native-style name in error messages and permission audit entries.

The same authorization check still runs after resolution, so this does not expand permissions.

## Test Coverage

`npm run test:runtime-tools` now verifies:

- ToolManager audits native-style grants as available.
- ToolManager can execute `mcp__ccm__payments__createInvoice` through the proxy path when authorized.
- ToolManager rejects the same native-style tool name when the scope grants a different tool.
- Runtime sync keeps native-style tool-level grants proxy-only.
- Authorization normalization removes native-style subtool grants when the full server is already granted.

## Verification

Run:

```powershell
npm run build:backend
npm run test:runtime-tools
npm run check
```
