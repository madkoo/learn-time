# Time to learn

A small browser app for children ages 5-8 to explore analog and digital clocks.

- Explore: move either hand and watch the digital time change.
- Read: choose the digital time that matches the clock.
- Set: move the hands to a target time, then check your answer.

Choose hours and half-hours, quarter-hours, five-minute intervals, or individual minutes under "For grown-ups". Practice is untimed, with retries and optional hints. "Show me" becomes available after an attempt.

## Run locally

Use Node 22.12+ or Node 24 and npm:

```sh
npm ci
npm run dev
```

Open the URL printed by Vite. On a Mac with keg-only Homebrew Node 24, first run:

```sh
export PATH="/opt/homebrew/opt/node@24/bin:$PATH"
```

## Test and build

```sh
npx playwright install chromium firefox webkit
npm run check
```

`npm run build` type-checks and creates the static site in `dist/`. `npm test` runs model tests. `npm run test:e2e` runs Playwright in Chromium, Firefox, WebKit, and mobile WebKit emulation. The browser tests start their own local server.

If your environment proxies local traffic, set `NO_PROXY=127.0.0.1,localhost` (and `no_proxy` where needed) for browser tests. The sandbox must allow listening on `127.0.0.1:5173` and launching browsers.

## Interaction and privacy

Use the labeled hour/minute buttons with a pointer or keyboard, or drag the
hands using their visible grab cues. The active hand is outlined, and hand hit
areas are 52 CSS pixels wide even at the 320-pixel layout. When hands overlap,
grab outside the central hub, near the centre for hours or near the tip for
minutes. Only one pointer controls a hand. Escape, pointer cancellation,
resize/orientation change, or a language change restores an unfinished drag.
The page can still scroll outside hand targets. Read is not draggable.
Hand hit targets are HTML overlays aligned with the SVG hands, so native
touch gesture arbitration sees `touch-action: none` on the actual target.
The clock face and central hub retain normal scrolling.

Correct Read/Set answers show a lasting success card and matching numeric time;
Read also marks the correct choice with a checkmark. A decorative local star
burst lasts 0.9 seconds and is omitted under reduced motion. Repeated checks or
language changes do not reward again. "Next clock" becomes the primary action;
there is no automatic advance. Incorrect answers remain retryable, with optional
hints. "Show me" gives an instructional answer without a success reward. A
committed edit or a new activity/question clears feedback.

Choose **Language / Keel → English / Eesti**. The first preferred browser locale
selects Eesti for `et` or `et-*`, otherwise English. Switching preserves the
question, choice order, time, outcome, preferences and focused controls. The
interface, accessible descriptions and document title are translated; both
languages use numeric 12-hour times such as `7:30`.

The app has no external fonts, accounts, analytics, or persistent storage.
Language overrides and settings are memory-only and reset on reload. Clock
descriptions do not identify the correct Read choice before a response/reveal.

## Validation status

The production build and 25 model/translation tests passed. Focused Playwright
tests cover correct versus reveal, reward deduplication, language detection and
state/focus preservation, narrow/enlarged Estonian layout, and native Chromium
multi-touch input (all stages/both movable activities, overlap, hub exclusion,
rollover, extra fingers, capture, cancellation, resize and outside scrolling).
Native multi-touch injection uses Chromium CDP; those tests explicitly skip
other engines rather than substituting mouse events.
The reported native-touch 7:30 → 7:40 cancellation has a focused regression
at desktop and narrow widths, including pointer-event logging and scrolling
from the clock face. The SVG-only hit targets were replaced with HTML boxes.
Integrated Chromium browser smoke checks with native CDP touch input passed
for both hands, cancellation restoring time, and horizontal reflow at 320 and
1024 CSS pixels. Correct Set feedback and switching its completed state to
Estonian also passed a browser smoke check.

Browser tests are type-checked but **not executed successfully**: the initial
attempt failed with a local-proxy Host mismatch; the documented `NO_PROXY` retry
was blocked by sandbox policy (`listen EPERM` on `127.0.0.1:5173`). Review the
sandbox policy before running the browser suite; these smoke checks are not a
full browser-suite pass.

Automated accessibility checks are not a WCAG certification. Before release, run the browser suite and manually check VoiceOver/TalkBack (including Estonian pronunciation and single success announcements), keyboard navigation, 200% text size, 400% zoom, both orientations, and dragging/scrolling on Safari/iOS and Chrome/Android real touch devices. Have an Estonian-speaking reviewer approve the wording. Test the prototype with children and guardians, including children with access needs. Educational effectiveness has not been measured.

See [plan.md](plan.md) for scope and [research.md](research.md) for the supporting research.
