# Submission Checklist

Use this file before final handoff.

## Required Links

- Project repository URL: `______________________________`
- Deployed app URL (if available): `______________________________`
- Demo video URL: `______________________________`
- Optional slide deck URL: `______________________________`
- Optional architecture doc URL: `______________________________`

## Video Constraints Checklist

- Video length is within challenge limits.
- Video is publicly viewable without login barriers.
- Audio is clear and narration is understandable at 1x speed.
- UI text is readable at normal playback resolution.
- Demo includes live product flow, not slides only.
- Demo avoids exposing raw secrets, tokens, or personal data.

## Judge Quick-Verify Checklist

- App starts with documented quickstart commands.
- Health endpoint returns success (`/health`).
- Manual rotation can be triggered from UI or API.
- Audit timeline shows ordered events for a rotation.
- Verify-before-revoke behavior is visible in logs/audit.
- Consent lifecycle is demonstrated or test-backed.
- Step-up/pending/resume behavior is demonstrated or test-backed.
- Provider-mode Token Vault flow is explained and test-backed.

## Required Evidence To Include In Submission Notes

- One sentence problem statement.
- One paragraph architecture summary.
- Link to README quickstart section.
- Link to CI workflow file.
- Link to coverage output (artifact, screenshot, or report path).
- Explicit mention of what is real vs mocked in the demo.

## Final Pre-Submit Checks

- README is up to date and matches current implementation.
- All required env vars are documented.
- CI workflow runs on both `push` and `pull_request`.
- Lint/type-check/tests pass in local or CI environment.
- Demo video mirrors current code behavior (no outdated screens).

