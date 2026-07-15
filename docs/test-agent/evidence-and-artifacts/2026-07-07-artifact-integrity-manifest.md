# Artifact Integrity Manifest

## Completed

Added file integrity metadata to the TestAgent artifact manifest.

Each manifest file entry now includes:

- `integrity.exists`
- `integrity.sizeBytes`
- `integrity.sha256` when hashing is stable
- `integrity.error` when a file is missing, not a file, or intentionally not hashed

## Why

The group main agent will eventually consume TestAgent reports automatically. A path string alone is weak evidence: it does not prove the file exists or that the consumer is looking at the same artifact TestAgent produced.

The manifest now gives downstream agents and humans a quick way to verify whether screenshots, page snapshots, browser logs, report files, and transcripts are present and unchanged.

## Self-Referential Manifest Hash

`artifact-manifest.json` intentionally omits its own `sha256`.

Hashing the manifest from inside itself would make the hash unstable because writing the hash changes the file content. The manifest entry still records that the file exists and its size, with:

```text
sha256 omitted for self-referential artifact.
```

## Verification

Expanded `runTestAgentArtifactManifestSelfTest` to verify:

- every manifest entry has integrity metadata
- no expected artifact is missing
- report JSON and screenshot artifacts have 64-character SHA-256 hashes
- manifest self-entry exists and explicitly marks self-hash omission
