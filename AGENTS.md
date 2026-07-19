# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

CCM (published as `@mumulinya167/cc-web`) is a multi-agent AI coding collaboration web console. It manages multi-agent task dispatching, code change review, group chat collaboration, and integrates with messaging platforms (Feishu/Lark, WeChat, Telegram, Slack, Discord, DingTalk). The primary language for UI, comments, and docs is Chinese.

## Build & Development Commands

```bash
# Install dependencies
npm install
npm --prefix frontend install

# Type-check (no emit) - backend + mcp-feishu integration
npm run check

# Full build (frontend -> mcp-feishu -> backend)
npm run build

# Individual builds
npm run build:backend       # tsc -> ccm-package/dist/
npm run build:frontend      # Vite -> ccm-package/public/
npm run build:mcp-feishu    # tsc -> ccm-package/mcp-feishu/dist/

# Development
npm run dev:frontend        # Vite dev server on :3081, proxies /api to :3080
npm start                   # Run server: node ccm-package/dist/server.js

# Test
npm run test:coordinator    # Builds backend, then runs coordinator smoke test

# Package for npm
npm run pack                # Builds everything, creates tarball from ccm-package/
```

## Architecture

### Two-Level Package Structure

This is NOT a monorepo (no workspaces/lerna/turborepo). Source code lives in `backend/`, `frontend/`, and `integrations/`. Build output flows into `ccm-package/`, which is the npm publish payload. **Never edit files in `ccm-package/` directly** — they are generated.

```
backend/       -> tsc -> ccm-package/dist/
frontend/      -> Vite -> ccm-package/public/
integrations/  -> tsc -> ccm-package/mcp-feishu/dist/
```

### Backend (`backend/`)

Raw Node.js `http.createServer()` — no Express or other HTTP framework. All routing is in `server.ts`. State is persisted as JSON files in `~/.cc-connect/` (no database).

Key entry files:
- `server.ts` — HTTP server, routing, static serving, SSE streams
- `db.ts` — JSON file persistence layer
- `utils.ts` — Shared utilities (paths, diff, multipart, XML parsing)
- `agent-runner.ts` — External agent execution via file-based request/result queue
- `agent-runtime.ts` — Agent type definitions (Codex, Cursor, Gemini CLI, Codex, Qoder)
- `agent-worktree.ts` — Git worktree isolation for parallel child agents
- `mcp-client.ts` — MCP protocol client (stdio transport)
- `tool-manager.ts` — MCP tools and Skills management
- `runtime-tool-sync.ts` — Syncs MCP/Skill tools to agent runtime configs

Modules in `backend/modules/`:
- `collaboration.ts` — Core multi-agent collaboration, group chat, task queue, Feishu integration
- `group-orchestrator.ts` — Coordinator/worker protocol, LLM-based task decomposition
- `global-agent.ts` — System-wide intent routing agent
- `cron.ts` — Automated daily dev task scheduler
- `projects.ts` — Project CRUD, agent lifecycle
- `sessions.ts` — Session management (cc-connect sync)
- `tools.ts` — MCP/Skills API, shared files, terminal
- `git.ts` — Git diff visualization, change tracking
- `rag.ts` — TF-based RAG knowledge base
- `templates.ts` — Prompt template management
- `marketplace.ts` — MCP marketplace / Smithery integration
- `music.ts` — Music player (yt-dlp based)
- `pets.ts` — Electron desktop pet

### Frontend (`frontend/`)

Vue 3 SPA with Vite. No router library — navigation is handled in `App.vue`. No state management library — plain fetch calls. CSS is plain (no component library).

- `src/App.vue` — Root component with all page routing
- `src/api/index.js` — Fetch-based API client wrapping all backend endpoints
- `src/components/` — Vue components (ProjectManager, GroupChat, TaskManager, GlobalAgent, Settings, etc.)

### Integrations (`integrations/mcp-feishu/`)

Standalone MCP server for Feishu/Lark messaging. ESM module (`"type": "module"`), uses `@modelcontextprotocol/sdk` with StdioServerTransport. Can run as MCP server or standalone CLI.

### TypeScript Config

- **Backend**: ES2022, CommonJS, `strict: false`, declaration + sourceMap enabled
- **mcp-feishu**: ES2022, Node16 module resolution, `strict: true`, ESM

## Key Patterns

- **Coordinator/Worker protocol**: Main agent decomposes tasks, assigns to child agents, collects `CCM_AGENT_RECEIPT` receipts, reviews results
- **Git worktree isolation**: Child agents can work in parallel without conflicts
- **File-based agent runner**: Queue in `~/.cc-connect/agent-runner/` for environments where process spawn is restricted
- **TOML configuration**: Project configs use TOML format (template at `ccm-package/configs/config-template.toml`)
- **Runtime data**: All state in `~/.cc-connect/` as JSON files (configs/, mcp/, skills/, pids/, logs/, sessions/, tasks.json, groups.json, etc.)

## Conventions

- Git commits use conventional prefixes: `chore:`, `feat:`, `docs:`, `fix:`
- Node.js >= 18.0.0 required
- Windows is the primary development platform
- Do not add new logic to files that already exceed 1,500 lines; extract new behavior into focused modules instead.
- Do not wire diagnostic/local keyword rules into the healthy model routing path. Healthy routing uses model decisions and tools only; local rules are limited to write authorization, clarification, confirmation, idempotency, schema validation, explicit buttons, offline diagnostics, and dedicated degraded entrypoints.

## Collaboration Runtime UX

- Persistent group development tasks expose `taskRuntime` on their existing group messages; extend that inline panel instead of creating a separate status page.
- Native-session resume, runtime fallback, conflict protection, execution state, and green level must come from persisted backend records rather than UI-only state.
- Potentially overlapping agents in one Git repository run serially in a shared isolated worktree; only the designated merge owner may merge or clean that shared lane.
- Every persistent development task carries one backend-issued `trace_id`. Reuse it across intake messages, task status transitions, worker receipts, Runtime fallback, verification, merge, and final delivery; never generate UI-only trace identifiers.
- Reliability-sensitive intake paths use persistent idempotency keys and task leases. A duplicate must replay the original result or report that it is still running, never create another task.
- Long-running reliability validation uses the persisted soak-test state under `~/.cc-connect/reliability/soak/`. Server restarts resume the same test ID and append samples; never reset an active soak test during ordinary startup.

## Global Agent Agentic Loop

- Web and Feishu global-assistant requests must use the backend Agentic Loop in `backend/global-agent-loop.ts`; do not reintroduce browser-side action execution or require the Web page to remain open.
- The model decides from full semantics and observations. Local keyword rules are degradation-only and may never bypass the server-side write-authorization or high-risk confirmation gates.
- Read tools may run automatically. Code/project/task writes require explicit user authorization; destructive operations always persist a `waiting_confirmation` run and execute the exact pending tool only after confirmation.
- Every run is persisted under `~/.cc-connect/global-agent-runs/`, carries one `trace_id`, enforces step/time budgets and idempotent tool execution, and must survive server restart without changing its run ID.
- Terminal replies must distinguish actual completion from delegation or ongoing work and include observations/evidence, risks, and any user decision still required.
