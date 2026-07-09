# Acceptance-Derived Browser Network Assertions

## Summary

Extended TestAgent's acceptance-derived browser checks so explicit API/network requirements in human acceptance criteria become real browser network assertions. This helps TestAgent verify that a UI action actually calls the expected endpoint and receives the expected response, instead of only checking visible text after the action.

## Added

- New parser module: `backend/test-agent/browser/acceptance-network-assertions.ts`.
- New derived assertion reason: `browser_network`.
- New inferred assertion types:
  - `networkRequest`
  - `networkResponse`
  - `networkRequestNot`
  - `networkResponseNot`
- Form-flow checks now carry non-URL acceptance-derived assertions, so a generated form flow can verify API calls after clicking submit.
- API/network paths such as `/api/tasks` are excluded from page path smoke checks when they are used as network targets.
- Assertion de-duplication now includes network fields such as method, URL fragment, status, and resource type.

## Behavior

Example:

```text
At /tasks, fill "Task" with "Buy milk", click "Add task", then show "Saved Buy milk" and send a POST request to /api/tasks and receive a 201 API response.
```

Produces a generated form-flow browser check for `/tasks` with:

- form actions for the `Task` field and `Add task` button,
- visible text assertion for `Saved Buy milk`,
- `networkRequest` with `method=POST` and `urlIncludes=/api/tasks`,
- `networkResponse` with `status=201` and `urlIncludes=/api/tasks`,
- `urlIncludes=/tasks`.

The API path `/api/tasks` is not treated as a page route for a separate smoke check.

## Boundaries

- The derivation is intentionally conservative.
- It recognizes obvious API paths such as `/api/*`, `/graphql`, `/trpc`, `/rpc`, `/rest`, and `/v1/*`.
- Non-API-looking paths are only treated as network targets when they are adjacent to request/call/fetch/method language.
- It does not infer the UI action by itself; it composes with existing acceptance form-flow generation or load-time smoke checks.
- For detailed request/response body or header validation, use explicit browser network assertions in the work order.

## Verification

- Added `runTestAgentAcceptanceDerivedNetworkAssertionSelfTest`.
- The self-test verifies:
  - network request and response assertions are derived from acceptance criteria,
  - the UI route `/tasks` remains the browser page route,
  - the API route `/api/tasks` is not converted into a page smoke route,
  - generated form-flow checks include the derived network assertions,
  - a real Playwright browser submits a local form and verifies `POST /api/tasks` plus `201` response telemetry.
