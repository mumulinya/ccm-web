# Test Runtime Data Cleanup

## Deleted

- 39 historical tasks in total: 29 active-list records and 10 previously archived records.
- Task replay journals, task Agent sessions, execution artifacts, TestAgent runs, and TestAgent evidence removed through the task purge transaction.
- 5 historical group chat sessions.
- 2 global Agent sessions containing 57 messages.
- 20 project sessions containing 160 messages.
- Group runtime logs for the three retained groups.
- 124 orphan self-test group-session directories not owned by any current group.
- 6 orphan project Agent run records from `cc-connect-test` and `ccm-e2e-mini-kanban`.
- 1,558 historical work-journal events and the derived daily/weekly report caches.
- 46 remaining execution-kernel files and 483 TestAgent/task-replay evidence files reported by Cleanup Center.
- Historical run metadata for the 4 retained disabled cron definitions; schedules and prompts were preserved.

## Retained

- Group definitions and membership.
- Project definitions and source directories.
- Agent, provider, memory-policy, and UI configuration.
- Music library, playlists, downloads, and music settings.
- Application source code and documentation.

## Post-Cleanup State

- All tasks, including archived tasks: 0.
- Task replay index: 0.
- Global sessions/messages: 0 / 0.
- Project sessions/messages: 0 / 0.
- Group sessions/messages: 3 / 0. Each retained group owns one newly created empty session.
- Orphan group-session directories: 0.
- Project Agent runs: 0.
- Work-journal events / current running report rows: 0 / 0.
- Execution artifacts: 0.
- TestAgent and replay evidence: 0.

Cleanup used CCM task/session/project-run APIs so associated memory, compaction, Agent binding, execution, and replay state were invalidated together. Derived journal, report, and orphan artifact files required filesystem removal; every target was resolved and verified under the CCM runtime root before deletion. The three remaining conversation rows are the intentionally retained empty sessions automatically owned by the three retained groups.
