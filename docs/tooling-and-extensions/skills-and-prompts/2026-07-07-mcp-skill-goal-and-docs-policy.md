# CCM MCP/Skill Long-Running Goal And Docs Policy

## Long-Running Goal

CCM should be the central control plane for MCP servers and Skills:

- centrally manage installed MCP and Skill packages;
- support group, project, and agent-level authorization;
- ensure Claude Code, Cursor, Codex, and future project child agents can discover and invoke authorized tools through their native runtime mechanisms;
- prevent child agents from using MCP servers or Skills outside their assigned scope;
- support external MCP/Skill marketplace sources for discovery, preview, install, update, uninstall, and runtime sync.

## Execution Policy

Every feature upgrade under this goal must include a dedicated documentation record:

- create one focused folder under `docs/`;
- create one Markdown file for that upgrade;
- record why the change was needed, what changed, affected files, verification commands, and any remaining risk.

The docs record is part of the delivery requirement, not an optional release note. A feature is not considered complete until its matching docs record exists.

## Current Runtime Scope

The current implementation path covers:

- marketplace import and installation records;
- authorization options and change audit;
- runtime sync for Codex, Cursor, and Claude Code;
- Claude plugin inheritance for child agents;
- Skill native alias mapping;
- MCP native tool-name parsing and scoped proxy execution.

Future increments should keep extending this same chain rather than adding a parallel MCP/Skill path.
