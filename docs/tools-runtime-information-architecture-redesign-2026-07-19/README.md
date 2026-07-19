# Tools Runtime Information Architecture Redesign

## Goal

Reduce visual noise in the Tools and Skills workspace while preserving every existing management and diagnostic capability.

## Problems Found

- Resource totals, navigation, page title, health metrics, runtime metadata, and every probe result competed at the same visual level.
- Successful checks occupied large green rows, making failures harder to identify.
- Every unhealthy runtime expanded into a long diagnostic card.
- The sidebar showed `businessRuntimeSummary` while the page used `runtimeReadiness`, producing inconsistent totals such as `0/4` versus `0/11`.

## Design

- A compact workspace header now groups identity, resource counts, reload, and contextual creation actions.
- The sidebar uses restrained Lucide icons, quieter groups, and compact status badges.
- Each content page has a clear title, supporting description, and one icon-only refresh action.
- Agent Runtime starts with four metrics: total, ready, needs attention, and CLI ready.
- Unhealthy runtimes sort before healthy runtimes.
- Runtime cards are collapsed by default and expose status, passed checks, MCP sync, and Skill sync in one summary row.
- Expanding a runtime shows the primary failure, CLI/snapshot/check time, and the complete ordered probe list with failures first.
- The sidebar and Runtime page now share the same `runtimeReadiness` totals.

## Responsive Behavior

- At narrow widths the navigation becomes a horizontal selector.
- Runtime metrics use two columns and technical metadata becomes a single column.
- Status text is removed from the compact row when space is limited, while the warning icon and check counts remain.
- No horizontal document overflow occurs at a 390 by 844 viewport.

## Verification

- Production data rendered 11 runtime cards, all collapsed by default.
- Expanding the first card rendered all 9 probes and identified exactly 1 failed probe.
- Sidebar runtime count matched the page at `0/11`.
- Desktop viewport had no horizontal overflow.
- Mobile viewport had no horizontal overflow and retained a two-column metric grid.
- Browser console errors: 0.
- `npm run build:frontend`: passed with 2,076 modules transformed.
- `npm run check`: passed.
- No paid Provider or model calls were made.
