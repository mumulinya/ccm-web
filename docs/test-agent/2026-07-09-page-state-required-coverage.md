# Page State Required Coverage

## Summary

Added dedicated required-check coverage for browser page state evidence: URL, title, navigation, DOM attributes, online/offline network state, and presence/visibility. TestAgent now separates these requirements from generic browser e2e success, so a page-level text assertion cannot accidentally prove route state, document title, ARIA/data attributes, network emulation, or element presence.

## Changed

- Added `browserUrlSignal(...)` in `backend/test-agent/required-checks.ts`.
- Added `browserTitleSignal(...)` in `backend/test-agent/required-checks.ts`.
- Added `browserNavigationSignal(...)` in `backend/test-agent/required-checks.ts`.
- Added `browserAttributeSignal(...)` in `backend/test-agent/required-checks.ts`.
- Added `browserNetworkStateSignal(...)` in `backend/test-agent/required-checks.ts`.
- Added `browserPresenceSignal(...)` in `backend/test-agent/required-checks.ts`.
- Added shared `browserStepAssertionSignal(...)` helper for step-based browser coverage signals.

## Mapped Checks

- URL checks:
  - `browser_url`
  - `url`
  - `url_assertions`
  - `route_url`
  - `current_url`
- Title checks:
  - `browser_title`
  - `title`
  - `document_title`
  - `page_title`
- Navigation checks:
  - `browser_navigation`
  - `navigation`
  - `url_transition`
  - `route_transition`
  - `page_navigation`
- Attribute checks:
  - `browser_attribute`
  - `attribute`
  - `dom_attribute`
  - `aria_attribute`
  - `data_attribute`
- Network state checks:
  - `browser_network_state`
  - `network_state`
  - `browser_online`
  - `browser_offline`
  - `online_state`
  - `offline_state`
- Presence/visibility checks:
  - `browser_presence`
  - `browser_visibility`
  - `presence`
  - `visibility`
  - `dom_presence`
  - `element_visibility`

## Evidence Rules

- `browser_url` requires passing `urlEquals`, `urlIncludes`, or `urlNotIncludes` evidence.
- `browser_title` requires passing `titleEquals`, `titleIncludes`, or `titleNotIncludes` evidence.
- `browser_navigation` requires passing URL transition evidence such as `waitForUrl` or URL assertions.
- `browser_attribute` requires passing `attributeEquals` or `attributeIncludes` evidence.
- `browser_network_state` requires passing online/offline action or assertion evidence such as `setOffline`, `setOnline`, `browserOffline`, `browserOnline`, or `onlineState`.
- `browser_presence` and `browser_visibility` require passing `visible`, `notVisible`, `present`, or `notPresent` evidence.
- Failed matching steps mark the matching required check as `not_verified`.
- Generic browser evidence leaves these specialized checks `unknown`.

## Why

Modern web delivery often depends on more than visible page text: correct routes, redirects, title updates, ARIA/data attributes, offline behavior, and DOM presence can all make or break a feature. These checks let the group main agent ask TestAgent for precise browser evidence instead of accepting a broad e2e pass as proof.

## Verification

Extended `runTestAgentRequiredCheckCoverageSelfTest` with fixtures that verify:

- generic browser evidence leaves page-state checks unknown,
- passing URL/title/navigation evidence verifies the matching checks,
- failed URL/title assertions mark matching checks as `not_verified`,
- passing attribute assertions verify `browser_attribute`,
- failed attribute assertions mark `browser_attribute` as `not_verified`,
- passing online/offline evidence verifies `browser_network_state`,
- failed online/offline assertions mark `browser_network_state` as `not_verified`,
- passing presence/visibility assertions verify `browser_presence` and `browser_visibility`,
- failed presence/visibility assertions mark those checks as `not_verified`.

Also ran:

- `runTestAgentRequiredCheckCoverageSelfTest`
- `runTestAgentPlaywrightUrlIncludesWaitSelfTest`
- `runTestAgentBrowserUrlTitleAssertionSelfTest`
- `runTestAgentBrowserNetworkStateActionSelfTest`
- `runTestAgentBrowserPresenceAssertionSelfTest`
- `runTestAgentBrowserAttributeAssertionSelfTest`
