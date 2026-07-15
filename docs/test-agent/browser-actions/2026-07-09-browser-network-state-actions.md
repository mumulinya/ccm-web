# Browser Network State Actions

## Summary

Added browser offline/online network state controls to standalone TestAgent. This lets TestAgent verify app behavior that depends on `navigator.onLine`, offline UI, and reconnect UI in a real Playwright browser context.

## Added

- New browser action types:
  - `setOffline`
  - `setOnline`
- New browser assertion types:
  - `browserOffline`
  - `browserOnline`
  - `onlineState`
- New aliases:
  - `set_offline`
  - `go_offline`
  - `browser_offline`
  - `network_offline`
  - `set_online`
  - `go_online`
  - `browser_online`
  - `network_online`
  - `online_state`
  - `navigator_online`
  - `is_online`
  - `is_offline`
- Playwright provider behavior:
  - `setOffline` calls browser context offline emulation.
  - `setOnline` restores the browser context to online.
  - Online assertions poll `navigator.onLine` until the expected state is observed or the assertion times out.
- MCP provider behavior:
  - MCP adapters explicitly fail these actions/assertions with guidance to use the Playwright provider.
  - TestAgent does not fake offline support through page text or JavaScript fallbacks.
- Added `browser_network_state_actions` to the TestAgent capability profile.

## Verification

- Added `runTestAgentBrowserNetworkStateActionSelfTest`.
- The self-test verifies:
  - a local app detects `setOffline` through `navigator.onLine`,
  - the app returns to online state after `setOnline`,
  - wrong online expectations fail,
  - MCP browser tooling reports offline/online emulation as unsupported rather than producing a false pass.
