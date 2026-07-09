# Browser Storage Actions

## Summary

Added structured Web Storage setup actions to the standalone TestAgent. This lets a work order seed or clear `localStorage` and `sessionStorage` before browser assertions, without requiring the group orchestration layer to generate custom JavaScript.

## Added

- New browser action types:
  - `setLocalStorage`
  - `setSessionStorage`
  - `clearStorage`
- New aliases:
  - `set_local_storage`
  - `local_storage_set`
  - `write_local_storage`
  - `seed_local_storage`
  - `set_session_storage`
  - `session_storage_set`
  - `write_session_storage`
  - `seed_session_storage`
  - `clear_storage`
  - `clear_browser_storage`
  - `clear_local_storage`
  - `remove_local_storage`
  - `delete_local_storage`
  - `clear_session_storage`
  - `remove_session_storage`
  - `delete_session_storage`
- Playwright provider behavior:
  - `setLocalStorage` and `setSessionStorage` require `key`/`storageKey` plus `value`, `text`, or `content`.
  - `clearStorage` clears both storage areas by default.
  - `clearStorage` can target `localStorage` or `sessionStorage` through `storage`, `storageArea`, aliases, or action names such as `clear_local_storage`.
  - `clearStorage` removes specific keys when `key` or `keys` is supplied; otherwise it clears the selected area.
- MCP adapter behavior:
  - JavaScript-capable browser MCP adapters map storage actions through their evaluate tools.
  - Computer Use reports storage actions as unsupported because it cannot access Web Storage directly.
- Added `browser_storage_actions` to the TestAgent capability profile.

## Verification

- Added `runTestAgentBrowserStorageActionSelfTest`.
- The self-test starts a local browser fixture and verifies:
  - seeded `localStorage` changes app state after reload,
  - seeded `sessionStorage` changes app state after reload,
  - clearing selected storage resets app state after reload,
  - a wrong seeded value fails browser assertions instead of being accepted.
