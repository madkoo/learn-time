# Implementation Plan: Clock-Learning App

Source: [research.md](research.md)

## MVP

- Explore, Read, and Set modes for children ages 5-8.
- Flexible stages: hour/half-hour, quarter-hour, five-minute, then minute intervals.
- Untimed practice with retryable, specific feedback and optional hints.
- An SVG analog clock and digital readout derived from one time value.
- Native, labeled controls as a complete alternative to dragging.
- No backend, accounts, analytics, or child data collection.

## Phases

1. **Foundation:** Confirm the repository setup, scaffold a minimal static app, and add unit and browser tests without overwriting `research.md` or this plan. Done when the app builds and both test runners work.
2. **Time model:** Implement normalized 12-hour time, display formatting, hand angles, stage rules, question generation, and feedback. Test 7:05, 7:30, 7:45, 7:55, 8:00; hour rollovers; and each stage's valid increments.
3. **Explore mode:** Render the clock in SVG with a synchronized digital display and labeled step controls. Verify keyboard and touch use, visible focus, reduced motion, contrast, and a 320-CSS-pixel layout.
4. **Read and Set modes:** Add staged questions, answer checking, hints, retries, and answer reveal after an attempt. Keep practice untimed; ensure quiz answers are not exposed before the learner responds.
5. **Optional dragging:** Add pointer-based hand dragging only after button controls work. Preserve the button alternative; test cancellation, overlap, rollover, zoom, and resize.
6. **Validation:** Run automated tests across supported browsers and manually check keyboard, screen readers, zoom/reflow, touch, and orientations. Test prototypes with children ages 5-8, including relevant accessibility needs, before making learning-effectiveness claims.

## Acceptance criteria

- All three modes work at every learning stage, with analog and digital time kept consistent.
- Boundary times, especially 7:55 -> 8:00 and 12 -> 1, behave correctly.
- WCAG 2.2 AA is the accessibility baseline; controls remain operable without dragging.
- MVP sends no child data off-device. Resolve applicable privacy requirements before collecting data.

## Decisions to confirm

- Teaching language and phrasing (for example, UK "half past" or US "seven thirty").
- Whether Read mode uses multiple choice only, or also supports typed answers in later stages.

## Planned additions: kid-friendly interaction and Estonian

These are two feature packages: feedback and touch interaction together, then
Estonian language support. Implementation is complete; automated browser and
manual release validation remain pending (see delivery status below).

### 1. Clear success feedback and touch-friendly clock hands

#### Pre-addition behavior (historical baseline)

- [main.ts](src/main.ts) displays a text message after a correct answer. Read
  choices have no visual indication of which answer was correct.
- Pointer dragging already exists for Explore and Set, including stage-based
  snapping, pointer capture, cancellation, and hour/minute overlap handling.
  [styles.css](src/styles.css) gives each hand a transparent hit area.
- "Show me" and a correct answer currently share the `solved` flag. They need
  separate outcomes before adding celebrations.
- [clock.spec.ts](e2e/clock.spec.ts) tests mouse dragging. The mobile browser
  project does not yet test an actual touch drag.

#### Proposed experience

- After a correct Read or Set answer, show a prominent success card beside the
  clock with a checkmark, "You found it!", and the matching digital time.
- In Read, also mark the chosen correct answer with a checkmark and a distinct
  border/background. Do not rely on green alone.
- Add a brief, local star burst around the clock, lasting at most one second.
  Keep the success card visible until the next question or an edit. Under
  reduced motion, show the static success card without the burst.
- Make "Next clock" the primary action after success. Let the child choose when
  to continue; no automatic advance, scores, streaks, timers, or sound.
- Keep incorrect answers calm and retryable, with the existing optional hints.
  "Show me" displays an instructional answer, not a success celebration.
- Make the short hour hand and long minute hand easier to grab with touch.
  Add visible grab cues and an outline on the active hand, matching the existing
  hand colors and labels. Use "Move the short hand for hours. Move the long hand
  for minutes." as the starting instruction.
- Keep existing movement rules: an hour-hand step changes one hour while
  preserving minutes; minute movement snaps to the selected learning stage and
  moves the hour hand accordingly. Keep clockwise and counterclockwise rollover.
- At overlap, retain near-center selection for hours and near-tip selection for
  minutes. Exclude the hub's ambiguous center. Only one pointer controls a hand
  at a time; extra fingers must not change it.
- Prevent scrolling for hand gestures only. Keep normal page scrolling outside
  the hand targets and retain all button/keyboard alternatives. Read remains
  non-draggable.

#### Implementation

- In [main.ts](src/main.ts), represent unanswered, incorrect, correct, and
  revealed outcomes explicitly. Derive feedback styling and available actions
  from that state. Celebrate only the transition into a correct outcome.
- Reset feedback on a committed edit, stage/mode change, or next question.
  A canceled drag restores the prior time and outcome without replaying a reward.
- In [styles.css](src/styles.css), add success, correct-choice, active-hand, and
  reduced-motion styles. Scale SVG hit areas so each hand has a usable target
  at least 48 CSS pixels across at the narrowest supported layout.
- Reuse the existing Pointer Events and SVG coordinate mapping rather than
  adding a separate touch-event implementation or a gesture dependency.

#### Acceptance and validation

- A correct answer in Read and Set produces the card and visual marker exactly
  once. A wrong answer or "Show me" never celebrates.
- Success is announced once through the existing live region. Decorative stars
  and checkmarks are hidden from assistive technology; no duplicate announcement.
- Touch dragging works for both hands in Explore and Set at every stage.
  Cover overlapping hands, both directions across 12, leaving the clock while
  captured, extra fingers, pointer cancellation, and resize/orientation changes.
- Touch tests use actual touch input, not mouse events carrying a touch label.
  Run automated coverage where supported, then verify Safari on iOS and Chrome
  on Android with real devices.
- Verify scrolling outside hand targets, keyboard alternatives, visible focus,
  reduced motion, higher contrast, and no horizontal overflow at 320 CSS pixels.
- Try the prototype with children and guardians: ask them to identify when an
  answer is correct and move each hand without an adult explaining the controls.
  Record observations, not claims of improved learning effectiveness.

### 2. Estonian language support

#### Proposed experience

- Add a visible language selector labeled "Language / Keel" with "English" and
  "Eesti". Use labels rather than flags.
- On first load, choose Estonian when the browser's preferred language is `et`
  or an `et-*` locale; otherwise use English. Allow an immediate override.
- Keep the selection in memory only, consistent with the current no-storage
  policy. On reload, apply browser-language detection again.
- Switching languages keeps the current mode, stage, clock time, question,
  choices, attempt/outcome, and preferences. It must not generate a new question
  or replay a celebration. Cancel an active drag before applying the change.
- Translate the full interface: activities, instructions, hand labels, buttons,
  learning stages, hints, feedback, grown-up settings, accessible names, clock
  descriptions, and the document title. Update the document's `lang` attribute.
- Keep the current 12-hour clock and numeric `7:30` display in both languages.
  Adding a 24-hour clock or spoken-time exercises is outside this feature.

#### Implementation

- Add a small typed [src/](src/) translation module with matching English and
  Estonian keys and message functions for variable times, counts, and hand
  positions. Do not assemble translated sentences from English fragments.
- Keep time arithmetic, question generation, and answer comparison in
  [time.ts](src/time.ts) language-independent. Move its English stage labels,
  feedback wording, and hand descriptions to the translation layer while
  preserving the existing hint rules.
- In [main.ts](src/main.ts), render messages from the selected language and
  stored outcome/answer data, not from previously rendered English strings.
  Preserve focused controls when relabeling.
- Use child-friendly terms such as "Loe kella", "Sea kell", "Lühike tunniosuti",
  and "Pikk minutiosuti". Have an Estonian-speaking reviewer check all wording,
  especially counts and between-number descriptions, before release.
- In [index.html](index.html), retain an English static fallback and provide a
  bilingual JavaScript-disabled message. Localize runtime metadata where useful.

#### Acceptance and validation

- English retains its existing behavior. Estonian covers all three activities,
  every stage, success, retries, reveal, and hints-on/off states without stray
  English UI or accessible names, apart from the bilingual selector.
- Test browser-language detection for `et`, `et-EE`, and a non-Estonian locale.
  Switching in both directions preserves the same question and learning state.
- Test switching after a wrong answer, after success, after reveal, and during
  a drag. No answer is exposed early in Read, and no celebration repeats.
- Type-check translation key parity and test variable messages for one/multiple
  minutes, exact hours, between-hour positions, and small minute ticks.
- Verify Estonian text at 320 CSS pixels, enlarged text, and both orientations.
  Check Estonian pronunciation with a screen reader and confirm `lang="et"`.

### Delivery order

1. Separate correct/revealed outcomes and add typed translations with English
   wording unchanged. This supports both features without changing time math.
2. Add success feedback and touch improvements, with focused browser tests.
3. Add Estonian messages, language switching, and localization tests.
4. Run `npm run check`, complete real-device/accessibility checks, and update
   [README.md](README.md) with the new interaction and language behavior.
   Resolve any browser-launch or local-server sandbox restrictions before
   claiming browser validation has passed.

### Delivery status (2026-11-26)

- Implemented explicit unanswered/incorrect/correct/revealed outcomes, static
  success card, correct-choice marker, one local 0.9-second reduced-motion-aware
  reward, and child-controlled primary Next action. Reveal never celebrates.
- Implemented visible hand grab cues/active outline, 52-CSS-pixel non-scaling
  hit widths, hub exclusion, nearest-hand/radial overlap selection, single
  pointer capture, committed-edit reset and cancellation restoring prior time
  and outcome. Resize/orientation and language changes cancel unfinished drags.
  Native controls and outside scrolling remain available.
- Native-touch follow-up: replaced SVG stroke hit targets with aligned,
  52-CSS-pixel HTML boxes carrying `touch-action: none`, leaving the clock face
  and hub scrollable. Pointer capture, overlap selection and cancellation
  semantics are unchanged. Added the reported 7:30 → 7:40 CDP regression at
  desktop/narrow widths with pointer-event evidence and clock-face scrolling.
  Integrated Chromium native-CDP smoke checks passed for both hands and
  cancellation restoring time at 320 and 1024 CSS pixels, with no horizontal
  overflow. The full suite and real-device validation remain outstanding.
- Implemented complete typed English/Eesti translations, first preferred locale
  detection, in-memory override, relabeling without regenerating choices or
  changing learning state/focus, localized metadata and bilingual no-JS text.
  Time math/question generation/hint selection remain language independent.
- Production build and 25 model/translation unit tests passed. Focused browser
  tests are written and type-checked, including actual Chromium CDP touch input;
  native-touch tests skip other engines explicitly. Correct Set feedback and
  switching the completed state to Estonian passed an integrated-browser smoke
  check.
- Full browser-suite execution remains blocked: first attempt hit a local-proxy Host
  mismatch; retry with `NO_PROXY` hit sandbox `listen EPERM` on port 5173.
  Sandbox-policy review is required before browser acceptance can be confirmed.
- Outstanding acceptance validation: execute the browser suite; real-device
  Safari/iOS and Chrome/Android gestures, scrolling and orientations; manual
  screen-reader announcements/Estonian pronunciation, focus, higher contrast,
  enlarged text/zoom; Estonian-speaking wording review; child/guardian prototype
  observations. No WCAG certification or learning-effectiveness claim is made.
