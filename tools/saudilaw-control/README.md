# SaudiLaw pipeline workspace

A small static settings/inspection page in the existing repository. It is outside dist/, so the existing Pages deployment does not include it. It has no backend, credentials, cookies, browser persistence, live API calls or network fetches. Import, inspect, edit, reset and download controls work locally; Reddit Start/Stop are visibly disabled.

Serve the repository root with a static server in an authorized cloud/local test environment, then open tools/saudilaw-control/. ES modules and SHA-256 need HTTP localhost or HTTPS. Opening index.html directly as a file is not the supported test route.

Example in the permitted cloud test workspace:

    python3 -m http.server 8000 --bind 127.0.0.1

Page: http://127.0.0.1:8000/tools/saudilaw-control/

Do not start a server on the user's gaming PC without permission. Do not expose this server publicly or deploy the page as part of this branch's preparation.

## Functional controls

- Import a pipeline JSON receipt, bounded to 256 KB. Validate digest, disabled policy, known preview/provenance structure and timestamps. Stale receipts remain inspectable with a prominent expired label. Freshness updates every 30 seconds and on focus/visibility restoration.
- Display reported preview count, zero accepted posts, quarantine reasons, source timestamps and exact draft text using textContent. No arbitrary HTML, Markdown execution or clickable imported links.
- Edit and validate a settings proposal: check interval, stricter evidence/snapshot age, proposed daily cap/time, and the supported White & Case adapter. Related limits and locked scope/safety policies are enforced again during export.
- Reset the local draft or export a content-addressed settings proposal with applied:false. Nothing applies automatically or changes a live feed.
- Record up to 100 local session actions in the exported proposal. This is unsigned, mutable local evidence, not a server audit or authorization receipt. Reload clears the session.

## Explicit limitations

A SHA-256 match is an integrity check, not proof of employer authenticity or an authorized translation. A self-created file can have a valid digest. The UI never marks any receipt ready to post and always reports no live connection.

Changing the proposed daily cap to zero is not a live kill switch. The page cannot control Reddit or GitHub. The observed app has Job bot status / Start / Stop; actual production state requires an authenticated moderator session. Stop invalidates scheduled callbacks and requests cancellation, but cannot retract an already submitted post or guarantee cancellation of an in-flight operation.

Exported cadence/limits/source settings are proposals only. The current CLI does not consume the settings export, and the existing monitor schedule is unchanged. Applying settings, connecting real status, changing approved app code and enabling recurring posts require separate integration, tests and applicable approval. No single-click cross-platform control is claimed.

Current pipeline coverage remains one reviewed White & Case programme. Its draft translation is pending approval; A&O, Segal and new source formats remain unsupported. This workspace does not complete the full automation chain.

## Verification

    node --test test/dashboard-model.test.mjs
    npm test
    npm run build

Browser checks should cover desktop and narrow mobile layouts, keyboard access, receipt import (including stale, corrupt and malicious text), failed-import clearing, repeated imports, invalid settings, export contents and disabled live controls. No browser checks are claimed until the cloud worker records them.
