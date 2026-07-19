# Global Agent SVG Pet Generation

## Goal

Replace Codex CLI pet generation with a user-controlled SVG workflow driven directly by CCM's configured global vision model.

## Runtime Flow

1. The user uploads a PNG, JPG, or WebP reference image in Pet Space or the global Agent conversation.
2. CCM creates a persistent `global-agent-svg` job and sends the original image to the configured global model.
3. The model reads the built-in `ccm-svg-pet-designer` Skill and returns a character design brief plus an animated `idle.svg` preview.
4. The job stops at `awaiting_approval`; nothing is installed automatically.
5. The user either approves the preview or submits revision notes. A revision regenerates the complete preview while preserving approved identity features.
6. After approval, the global model generates 12 canonical SVG states in batches of two while receiving the original image, approved design brief, and approved idle SVG.
7. CCM validates every SVG and installs state files for the web and Electron desktop pet renderers.

## Skill

The internal immutable Skill is stored at:

`ccm-package/templates/skills/ccm-svg-pet-designer/SKILL.md`

It defines:

- Reference-image identity preservation.
- Canonical `192x208` viewBox and transparent composition.
- Preview and state-batch JSON contracts.
- Character consistency across actions.
- State semantics and revision behavior.
- SVG safety constraints.

The Skill is registered in CCM's internal catalog and selected automatically for global Agent requests involving reference images and desktop pets.

## Safety And Failure Behavior

- Rejects scripts, event handlers, `foreignObject`, iframe/object/embed, external URLs, imports, embedded raster data, invalid viewBox, incomplete SVG, and assets over 96 KB.
- Model JSON or SVG validation failure is fail closed and never installs a partial pet.
- Cancellation prevents late model output from committing.
- Service restart marks an interrupted model call retryable while preserving previews already waiting for approval.
- Revision is limited to eight rounds per task.
- No Codex CLI fallback exists in the new generation path.

## Compatibility

- Historical Codex v2 WebP pets remain readable and are labeled as historical records.
- New pets use existing per-state SVG filenames, so both the web preview and Electron desktop renderer work without a new rendering engine.
- The global Agent and music Agent remain the only system pet targets.

## Verification

- `ccm-svg-pet-designer` passed the Skill validator.
- Mock preview generation passed and received the reference-image Skill prompt.
- Mock two-state batch generation returned exactly the requested states.
- Unsafe SVG and incorrect viewBox fixtures were rejected.
- Static generation-path check found no `codex exec`, `spawnSync`, or `hatch-pet` call.
- Global Agent role selection included `ccm-svg-pet-designer` for a reference-image pet request.
- Pet workspace self-test passed.
- Live `/api/pets/self-test` passed with `ccm-global-agent-svg-pet-contract-selftest-v1`.
- Desktop and mobile render regression passed, including preview, revision, and approval controls.
- `npm run check`, backend build, and frontend production build passed.
- Paid Provider/model calls during testing: 0.

## Evidence

- `docs/main-agent-workchain/operations-and-integrations/pets/evidence/workspace-companion/02-generation-jobs-desktop.png`
- `docs/main-agent-workchain/operations-and-integrations/pets/evidence/workspace-companion/03-generation-mobile.png`
