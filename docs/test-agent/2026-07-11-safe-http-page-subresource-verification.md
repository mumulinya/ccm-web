# Safe HTTP Page Subresource Verification

Date: 2026-07-11

## Goal

Strengthen CCM TestAgent's frontend verification so an entry page cannot pass merely because its
HTML returns HTTP 200 while scripts, stylesheets, images, fonts, manifests, frames, or CSS
dependencies are broken.

Reference:

- `D:\claude-code\src\tools\AgentTool\built-in\verificationAgent.ts`

The reference verifier explicitly requires sampling frontend subresources because a successful HTML
response does not prove the running page is usable.

This milestone changes only:

- `backend/test-agent/**`
- `docs/test-agent/**`

No collaboration or group-chat source file was modified.

## Previous Behavior

The automatic page HTTP probe searched all `src` and `href` attributes with one regular expression.
It checked only same-origin URLs and failed the page when a selected resource returned an error.

That baseline had important gaps:

- ordinary navigation links and canonical links could be fetched as if they were resources;
- `srcset`, module preload, manifest, video poster, object/embed, inline CSS, and CSS dependencies were
  not represented accurately;
- an SPA fallback could return HTML with status 200 for a missing `.css` or `.js` file and pass;
- redirects were automatically followed without preserving a same-origin redirect boundary;
- evidence did not identify resource kind, discovery source, expected MIME type, or redirect count;
- semantic artifact verification could not independently reject edited resource evidence.

## Safe Discovery

Added `backend/test-agent/http-page-resources.ts`.

The HTML scanner selects only resources that a browser can load automatically:

- `script[src]`;
- stylesheet, modulepreload, preload, icon, manifest, and image-srcset links;
- image `src` and `srcset`;
- source, video, audio, iframe, object, embed, and image-input resources;
- `url(...)` references in inline style blocks and style attributes.

It deliberately ignores:

- anchors and ordinary navigation `href` values;
- canonical links;
- form actions;
- hash, mail, telephone, JavaScript, data, blob, and about URLs;
- external-origin resources;
- resources inside comments, templates, noscript, textarea, and xmp content.

`<base href>` is respected for URL resolution, but the final candidate must still share the entry
page origin.

Candidates are prioritized so scripts, stylesheets, manifests, fonts, and then media are sampled
before low-value generic resources when the configured limit is reached.

## CSS Dependencies

After a stylesheet passes HTTP and MIME validation, TestAgent scans its body for:

- `@import` stylesheets;
- `url(...)` fonts, images, media, scripts, or other same-origin dependencies.

Nested stylesheets are followed until the global page-resource limit is reached. A selected URL is
requested at most once, so circular imports cannot loop indefinitely.

## Request Safety

Every resource request:

- uses GET;
- starts from a same-origin candidate;
- uses manual redirect handling;
- follows at most three redirects;
- follows only HTTP(S) redirects that remain on the verified page origin;
- fails immediately when a redirect leaves the origin or omits `Location`.

This prevents the probe from turning an untrusted resource redirect into unrestricted external
network access.

The existing `maxHttpResourceChecks` option remains the total per-page bound. Explicit value `0`
now correctly disables resource requests instead of being replaced by the default value `12`.

## MIME Validation

Resource evidence now records a semantic kind and validates the returned Content-Type:

| Kind | Expected Content-Type family |
| --- | --- |
| Script | JavaScript, ECMAScript, or WebAssembly |
| Stylesheet | `text/css` |
| Image | `image/*` |
| Font | font or recognized binary-font types |
| Media | audio, video, Ogg, or binary media |
| Document | HTML or XHTML |
| Manifest | web manifest JSON or JSON |
| Other | HTTP status only |

A 200 response with `text/html` for a stylesheet or script is a failed resource. This catches common
SPA fallback and missing-build-output failures that status-only checks miss.

## Evidence

Every selected resource records:

- redacted original URL;
- redacted final URL;
- resource kind;
- discovery source;
- parent page or stylesheet;
- redirect count;
- status and HTTP status code;
- observed Content-Type;
- expected Content-Type families;
- whether Content-Type matched;
- failure or blocking reason.

Sensitive URL query values such as token, signature, auth, password, secret, credential, and API-key
parameters are replaced with `[redacted]` in report evidence. The raw URL is used only for the actual
ephemeral request.

CLI and Markdown now expose an HTTP page-resource summary with total, passed, failed, blocked,
MIME-mismatch, and kind counts. Markdown resource details include kind, source, redirect destination,
and MIME mismatch information.

## Integrity

Report contract validation and artifact verification now rebuild page-resource semantics:

- resource count cannot exceed the recorded limit;
- resource URLs, final URLs, and parent URLs must be same-origin HTTP(S) URLs;
- sensitive query values must be redacted;
- resource URLs cannot be duplicated;
- kind, source, redirect count, and expected MIME families must be valid;
- `contentTypeMatched` must agree with kind and observed Content-Type;
- passed resources require a successful response and matching MIME type;
- blocked resources require no response and a blocking error;
- failed resources require an HTTP, MIME, or redirect failure;
- page probe status is rebuilt from the main response, resource policy, and resource statuses.

Artifact verification emits a dedicated `http_page_resource_evidence` item. Editing resource MIME or
status and refreshing the manifest SHA-256 still fails semantic verification.

The TestAgent capability profile now declares:

- `safe_same_origin_page_resource_probe`;
- `html_css_subresource_discovery`;
- `http_resource_content_type_validation`;
- `http_page_resource_evidence_integrity`.

## Self-Test

Added:

- `backend/test-agent/http-page-resources-self-test.ts`;
- `runTestAgentHttpPageResourcesSelfTest`.

The passing fixture verifies a real local page containing:

- JavaScript and modulepreload;
- a same-origin script redirect;
- stylesheet and nested `@import`;
- CSS font and background images;
- manifest;
- image-optimizer-style URL;
- `srcset` images;
- inline CSS URL.

It proves eleven selected resources pass, nested CSS dependencies are requested, sensitive font URL
query data is redacted, and the navigation endpoint is never requested.

The failing fixture proves TestAgent rejects:

- a missing script returning 404;
- a script redirecting outside the verified origin;
- a stylesheet returning HTML with status 200.

The self-test also tampers with a passing resource's Content-Type, refreshes report integrity in the
manifest, and proves the dedicated semantic verifier rejects it.

## Verification

Passed:

- TestAgent-only TypeScript dependency-closure check;
- safe HTTP page-resource self-test;
- HTTP/API self-test;
- automatic browser smoke self-test;
- Playwright resource-error self-test;
- blank-page smoke self-test;
- real Playwright browser self-test;
- report contract self-test;
- artifact verifier self-test;
- CLI self-test;
- full `npm run check`;
- `git diff --check -- backend/test-agent docs/test-agent`.

The long-term independent TestAgent goal remains active for later verification milestones and final
group-agent integration.
