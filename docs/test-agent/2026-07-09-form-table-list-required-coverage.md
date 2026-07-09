# Form Table List Required Coverage

## Summary

Added dedicated required-check coverage for browser form, form/control state, table, list/count, and text-order verification. TestAgent now distinguishes these from a generic browser pass, so a page-level `assert:text` no longer proves that a form state, data table, rendered list, or sorted order was actually verified.

## Changed

- Added `browserFormSignal(...)` in `backend/test-agent/required-checks.ts`.
- Added `browserFormStateSignal(...)` in `backend/test-agent/required-checks.ts`.
- Added `browserTableSignal(...)` in `backend/test-agent/required-checks.ts`.
- Added `browserListSignal(...)` in `backend/test-agent/required-checks.ts`.
- Added `browserTextOrderSignal(...)` in `backend/test-agent/required-checks.ts`.
- Mapped form checks such as:
  - `browser_form`
  - `form_flow`
  - `form_submit`
  - `form_validation`
- Mapped form/control state checks such as:
  - `form_state`
  - `input_value`
  - `selected`
  - `checked`
  - `enabled`
  - `disabled`
- Mapped table checks such as:
  - `browser_table`
  - `table_assertions`
  - `table_row`
  - `table_cell`
  - `data_table`
- Mapped list/count checks such as:
  - `browser_list`
  - `element_count`
  - `item_count`
  - `collection_count`
  - `card_count`
- Mapped text-order checks such as:
  - `browser_text_order`
  - `text_order`
  - `content_order`
  - `sort_order`
  - `ordered_text`

## Evidence Rules

- `browser_form` accepts an `acceptance_form_flow`, passing form/control state assertions, or form actions paired with a meaningful completion assertion.
- `form_state` and related control-state checks require passing assertions such as `inputValueEquals`, `selectedTextIncludes`, `checked`, or `enabled`.
- `browser_table` requires passing table row/cell assertions such as `tableRowIncludes`, `tableCellTextIncludes`, or `tableCellTextEquals`.
- `browser_list` requires passing count evidence such as `elementCountEquals`, `elementCountAtLeast`, or `elementCountAtMost`.
- `browser_text_order` requires passing `textOrder` evidence.
- Failed matching assertions mark the matching required check as `not_verified`.
- Generic browser evidence leaves these specialized checks `unknown`.

## Why

These UI structures can be present, missing, stale, or ordered incorrectly even when the page renders and a broad browser e2e check passes. The group main agent can now ask TestAgent for more precise evidence before accepting project-agent work.

## Verification

Extended `runTestAgentRequiredCheckCoverageSelfTest` with fixtures that verify:

- generic browser evidence leaves form/table/list/text-order checks unknown,
- passing `acceptance_form_flow` verifies `browser_form`,
- passing control-state assertions verify form-state requirements,
- failed control-state assertions mark form-state requirements as `not_verified`,
- passing table assertions verify `browser_table`,
- failed table assertions mark `browser_table` as `not_verified`,
- passing count assertions verify `browser_list`,
- failed count assertions mark `browser_list` as `not_verified`,
- passing `textOrder` verifies `browser_text_order`,
- failed `textOrder` marks `browser_text_order` as `not_verified`.

Also ran the related browser self-tests:

- `runTestAgentAcceptanceFormFlowSelfTest`
- `runTestAgentAcceptanceMultiFieldFormFlowSelfTest`
- `runTestAgentAcceptanceSelectCheckboxFormFlowSelfTest`
- `runTestAgentAcceptanceUncheckRadioFormFlowSelfTest`
- `runTestAgentBrowserInputValueAssertionSelfTest`
- `runTestAgentBrowserEnabledStateSelfTest`
- `runTestAgentBrowserElementCountSelfTest`
- `runTestAgentBrowserTableAssertionSelfTest`
- `runTestAgentBrowserTextOrderAssertionSelfTest`
