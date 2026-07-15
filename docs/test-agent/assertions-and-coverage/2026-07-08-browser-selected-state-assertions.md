# Browser Selected State Assertions

## Goal

Make TestAgent prove both the submitted value and user-visible text of a selected browser option. This gives acceptance-derived select flows explicit final-state evidence instead of relying only on later page text.

## New Assertions

- `selectedValue`
- `selectedTextIncludes`

Examples:

```json
{ "type": "selectedValue", "label": "Priority", "value": "priority-high" }
```

```json
{ "type": "selectedTextIncludes", "label": "Priority", "text": "High" }
```

## Changes

- Added both assertion types and snake-case work-order aliases.
- Playwright now reads the selected option value and visible text from the real DOM.
- `selectOption` detects whether the requested input matches an option value; otherwise it selects by visible label without waiting for a failed value lookup timeout.
- Acceptance-derived form flows now add `selectedTextIncludes` after inferred select actions.
- MCP browser adapters return an explicit unsupported result because their current tool contracts do not expose selected DOM state.
- Added a dedicated real-browser self-test where visible text `High` maps to DOM value `priority-high`.
- Strengthened the existing select/checkbox acceptance-flow fixture with different option labels and values.

## Verification

- TypeScript no-emit compile: PASS
- Targeted runtime self-tests:
  - `runTestAgentBrowserSelectStateSelfTest`: PASS
  - `runTestAgentAcceptanceSelectCheckboxFormFlowSelfTest`: PASS
- Full TestAgent self-test matrix: 48/48 PASS

## Follow-up

- Add multi-select state assertions if acceptance parsing later supports selecting several options.
- Add MCP selected-state support when an adapter exposes DOM property evaluation.
