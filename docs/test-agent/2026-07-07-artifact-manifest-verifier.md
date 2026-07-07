# Artifact Manifest Verifier

## Completed

Added an independent verifier for TestAgent artifact manifests.

The verifier re-checks every file listed in `artifact-manifest.json` against the manifest integrity metadata:

- file exists
- path is a file
- size matches
- SHA-256 matches when present

The manifest self-entry is treated specially because `artifact-manifest.json` cannot stably hash itself.

## API

New exports:

```ts
verifyTestAgentArtifactManifest(manifest, manifestPath)
verifyTestAgentArtifactManifestFile(manifestPath)
```

The result uses schema:

```text
ccm-test-agent-artifact-verification-v1
```

## CLI

The standalone CLI now supports:

```powershell
node dist/test-agent/cli.js --verify-artifacts path\to\artifact-manifest.json --summary
```

Exit codes:

- `0`: artifact bundle verifies
- `1`: one or more artifacts are missing or changed
- `2`: invalid CLI input, unreadable JSON, or invalid manifest shape

## Verification

Added `runTestAgentArtifactVerifierSelfTest`.

The self-test:

- runs TestAgent to generate a real artifact bundle
- verifies the manifest through the API
- verifies the manifest through the CLI
- tampers with `report.md`
- verifies that both API and CLI detect the changed artifact

While validating this, local HTTP self-tests were also switched from fixed random port ranges to OS-assigned free ports to reduce intermittent collisions in the full TestAgent matrix.
