# CCM Memory Phase 340: Canonical Model Extraction Replay

Date: 2026-07-16

## Goal

Make Session Memory model extraction fully replayable from its signed request and result artifacts. The text used for prompt construction, merge-quality analysis, fact-supersession graphs, receipts, and restart replay must have one canonical checksum.

## Source Evidence

Reviewed:

- `D:\claude-code\src\services\SessionMemory\sessionMemory.ts`

Claude Code reads the current Session Memory file, passes that exact state into an isolated forked extraction task, and only records extraction progress after the task succeeds. CCM adds durable signed artifacts and replay on top of that behavior, so its integrity layer must bind the same current-memory representation that the isolated model actually received.

## Previous Gap

`buildGroupSessionMemoryModelExtractionPrompt()` trimmed `currentNotes` before rendering the model prompt and persisted the trimmed value in the request artifact. The commit path then analyzed merge quality using the pre-trim source string. The default template ends with a newline, so a valid extraction could produce:

```text
request artifact checksum = canonical currentNotes
merge-quality checksum    = raw currentNotes with trailing newline
```

After restart, replay only had the canonical request artifact. Output validation and merge-quality scoring passed, but the fact-supersession graph checksum failed, creating a false extraction-replay failure in Memory Center and delivery evidence.

## Implementation

The request builder now records body-free normalization evidence:

- `currentNotesCanonicalization=trim`
- `currentNotesChecksum`
- `currentNotesRawChecksum`
- raw and canonical character counts
- whether normalization changed the source

The commit path uses `request.replayMaterial.currentNotes` for merge-quality and fact-supersession analysis. The signed receipt adds `mergeQualityInput`, binding canonicalization mode and checksums to the same request artifact.

Replay now validates:

- canonical currentNotes checksum against the request audit;
- merge-quality input checksum against the signed receipt;
- canonicalization evidence against the receipt;
- replayed merge-quality and fact graph checksums against terminal history and result artifacts.

For historical receipts created before Phase 340, replay may test only two additional representations: one trailing LF or one trailing CRLF. A legacy representation is accepted only when its checksum exactly matches the checksum already present in the signed historical receipt. Arbitrary checksum mismatches remain failures.

## Visibility And Isolation

- Memory Center rows show canonicalization and replay input mode.
- Fleet totals expose verified canonical inputs and legacy-compatible replays.
- Evidence remains body-free; no extra Session Memory content is copied into metrics.
- Replay is bound to one exact `groupId--gcs_*` artifact chain.
- Sibling group sessions remain isolated, and Global Agent still does not read group Session Memory.

## Verification

Dedicated test:

```text
PHASE340_RESULT={"checks":14,"passed":14}
```

Coverage includes request normalization, receipt binding, merge-quality and fact-graph checksum identity, full fresh replay, canonical mode visibility, legacy LF compatibility, arbitrary checksum rejection, signed-receipt tamper rejection, restart replay stability, sibling-session isolation, Memory Center backend/UI visibility, and Global Agent separation.

Adjacent regressions:

```text
Phase 339 safe cursor advance: 12/12
Session Memory model extraction: 12/12
Session Memory update cadence: 17/17
Phase 338 cadence cursor miss: 12/12
Phase 337 cursorless compact resume: 14/14
npm run check: passed
npm run docs:check: passed
npm run build: passed
```

## Result

Session Memory extraction can now be verified after restart from the exact canonical memory representation sent to the isolated model. Valid history no longer fails because of invisible trailing whitespace, while forged or unrelated checksums cannot use the compatibility path to bypass artifact integrity.
