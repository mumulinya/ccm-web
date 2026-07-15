# Concurrent HTTP Adversarial Verification

Date: 2026-07-10

## Goal

Extend the independent CCM TestAgent so it can verify concurrency, race, duplicate-submission,
idempotency, and lost-write claims against a real running HTTP service.

The design follows the verification guidance in:

- `D:\claude-code\src\tools\AgentTool\built-in\verificationAgent.ts`

That guidance requires active adversarial probes, including parallel requests and checks for
idempotency or lost updates, instead of accepting a delivery from source inspection or one
happy-path request.

This milestone changes only:

- `backend/test-agent/**`
- `docs/test-agent/**`

No collaboration or group-chat code was modified.

## Work Order

A concurrent HTTP probe can be declared as:

```json
{
  "name": "Concurrent message writes",
  "method": "POST",
  "url": "http://127.0.0.1:3000/api/messages?number={{requestNumber}}",
  "headers": {
    "x-request-index": "{{requestIndex}}"
  },
  "json": {
    "requestNumber": "{{requestNumber}}"
  },
  "assertions": [
    { "type": "status", "status": 201 }
  ],
  "concurrency": {
    "requests": 4,
    "aggregateAssertions": [
      { "type": "responseCount", "count": 4 },
      { "type": "statusCount", "status": 201, "count": 4 },
      { "type": "jsonPathUniqueCount", "path": "messageId", "count": 4 }
    ]
  }
}
```

Interpolation is applied recursively to URL, headers, body strings, and JSON:

- `{{requestIndex}}`: zero-based request index;
- `{{requestNumber}}`: one-based request number.

The supported concurrency range is 2 through 50 requests.

## Aggregate Assertions

Supported aggregate assertions:

- `responseCount`: number of completed HTTP responses;
- `statusCount`: number of responses with a selected status;
- `jsonPathUniqueCount`: number of distinct canonical JSON values at a path;
- `jsonPathAllEqual`: all responses contain the path and have the same canonical JSON value.

Count assertions accept `count`, `minCount`, and `maxCount` forms, including normalized aliases.
The work-order normalizer and contract reject missing counts, invalid status codes, missing JSON
paths, invalid ranges, and unsupported request counts.

## Execution Semantics

The verifier launches each configured request through one `Promise.all` group.
Each request independently records:

- request index and number;
- interpolated URL and method;
- start, finish, and duration;
- HTTP status and content type;
- per-request assertion results;
- aggregate JSON-path digest evidence;
- a bounded response preview or a suppression marker;
- a failure or blocking reason.

The concurrency evidence records:

- requested, completed, passed, failed, and blocked counts;
- launch spread;
- maximum requests in flight;
- whether overlap was observed;
- normalized aggregate assertion specifications;
- overlap and aggregate assertion results;
- all request evidence entries.

## Result Status

`httpConcurrencyResultStatus` is the single status authority used by execution, report summaries,
report contract validation, and artifact verification.

Rules:

1. A request with product assertion failure makes the probe `failed`.
2. A blocked request with no product failure makes the probe `blocked`.
3. With no blocked requests, a failed overlap or aggregate assertion makes the probe `failed`.
4. Only a complete request set with passing requests and aggregate assertions is `passed`.

This ordering prevents an unreachable endpoint or an overlap assertion affected by environmental
blocking from being mislabeled as a product defect.

## Evidence Integrity

The report contract and artifact verifier independently rebuild concurrency evidence.
They verify:

- `requested` equals the number of request entries;
- request indexes cover exactly `0..requested-1`;
- request numbers equal `requestIndex + 1`;
- passed requests have a response and only passing assertions;
- failed requests have a response plus a failed assertion or error;
- blocked requests have no HTTP response and include a blocking error;
- request time windows and HTTP statuses are valid;
- aggregate paths exactly match the configured JSON-path assertions;
- aggregate paths are unique per request;
- present values have a valid SHA-256 and positive serialized byte count;
- absent values do not retain digest metadata;
- counters, overlap, launch spread, max-in-flight, and aggregate results rebuild exactly;
- each HTTP result status matches the rebuilt concurrency status;
- report and verdict summaries and verdict counters match raw evidence.

Artifact verification emits a dedicated `http_concurrency_evidence` item only when concurrent HTTP
evidence exists. Reports without concurrent probes do not receive a misleading passing item.

## Evidence Privacy

Aggregate JSON-path values are canonicalized and stored only as:

- SHA-256;
- serialized byte count;
- path;
- presence flag.

When a concurrent probe uses aggregate JSON paths, raw response previews are suppressed and replaced
with response byte count, aggregate-path count, and a suppression marker. This prevents the same raw
value from leaking through a secondary report field.

## Report Surfaces

Concurrency data is available in:

- JSON report;
- JSON verdict;
- Markdown report;
- CLI report summary;
- CLI execution-plan summary;
- execution-plan project details;
- report and verdict contracts;
- artifact semantic verification.

The TestAgent profile now declares:

- `concurrent_http_adversarial_probes`;
- `http_concurrency_request_interpolation`;
- `http_concurrency_aggregate_assertions`;
- `http_concurrency_evidence_integrity`.

## Self-Test

Added:

- `backend/test-agent/http-concurrency-self-test.ts`
- `runTestAgentHttpConcurrencySelfTest`

The self-test starts a real local HTTP server and verifies:

- four simultaneous message writes preserve four unique message IDs;
- URL, header, and JSON interpolation reach the server consistently;
- four idempotent submissions return one shared resource ID;
- a defective idempotency endpoint returning four resource IDs is `failed`;
- an unreachable endpoint is `blocked`, not a product failure;
- overlap is observed with `maxInFlight >= 2`;
- report JSON contains digest evidence and suppresses raw aggregate values;
- invalid request counts, count assertions, JSON paths, and statuses fail contract validation;
- request evidence tampering remains detectable after refreshing manifest integrity;
- HTTP result status tampering is rejected by evidence reconstruction;
- verdict summary and counter tampering is rejected;
- CLI, Markdown, and execution-plan summaries expose concurrency evidence.

Observed dedicated self-test states:

- valid concurrent probes: `passed`;
- defective idempotency probe: `failed`;
- unreachable concurrent probe: `blocked`;
- intact artifact verification: `passed`;
- report, status, and verdict tampering: `failed`.

## Verification

Passed:

- final TestAgent-only TypeScript dependency-closure check;
- `runTestAgentHttpConcurrencySelfTest`;
- HTTP/API and adversarial HTTP self-tests;
- required adversarial evidence gate self-test;
- required acceptance evidence gate self-test;
- contract, artifact verifier, and CLI self-tests;
- real Playwright browser self-test;
- Playwright multi-session and stability self-tests;
- managed and multi-session authentication self-tests;
- Playwright, multi-session, and cross-session action-effect self-tests;
- safe recovery, unsafe retry prevention, and failed recovery self-tests;
- `git diff --check -- backend/test-agent docs/test-agent`.

A full `npm run check` passed earlier in the milestone. At final verification time it was blocked by
an unrelated concurrent edit in `backend/modules/collaboration/collaboration.ts` concerning
`independentReviewGate`. That file is outside this milestone and was intentionally not changed.

The long-term TestAgent goal remains active for later integration and additional verification
milestones.
