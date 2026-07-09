# Browser Cookie Actions

## Summary

Added structured browser cookie setup actions to the standalone TestAgent. This lets a work order seed or clear cookies before browser assertions, so TestAgent can verify session/auth/feature-gate behavior in the running product without relying on custom JavaScript snippets from the orchestration layer.

## Added

- New browser action types:
  - `setCookie`
  - `clearCookies`
- New aliases:
  - `set_cookie`
  - `cookie_set`
  - `write_cookie`
  - `seed_cookie`
  - `clear_cookie`
  - `clear_cookies`
  - `clear_browser_cookies`
  - `remove_cookie`
  - `remove_cookies`
  - `delete_cookie`
  - `delete_cookies`
- Playwright provider behavior:
  - `setCookie` accepts `key`, `cookieName`, or `name` for the cookie name.
  - `setCookie` accepts `value`, `text`, or `content` for the cookie value.
  - `setCookie` supports `domain`, `cookiePath`, `expires`, `httpOnly`, `secure`, and `sameSite`.
  - `clearCookies` clears all cookies when no key is supplied.
  - `clearCookies` removes specific cookies when `key` or `keys` is supplied.
- MCP adapter behavior:
  - JavaScript-capable browser MCP adapters use `document.cookie` for non-HttpOnly cookie setup/cleanup.
  - HttpOnly cookie setup remains Playwright-first.
  - Computer Use reports cookie actions as unsupported because it cannot access browser cookies directly.
- Added `browser_cookie_actions` to the TestAgent capability profile.

## Verification

- Added `runTestAgentBrowserCookieActionSelfTest`.
- The self-test starts a local HTTP fixture and verifies:
  - seeded auth cookie is sent on reload and changes server-rendered app state,
  - clearing the auth cookie signs the user out after reload,
  - a wrong cookie value fails browser assertions instead of being accepted.
