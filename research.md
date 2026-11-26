# Research brief: a clock-learning app for children ages 5–8

## Goal and approach

This brief turns the delegated curriculum, product, accessibility, and implementation research into a practical starting point for a simple browser app. It separates sourced findings from product recommendations and treats published age/grade milestones as flexible learning stages, not fixed developmental deadlines.

## Executive summary

Build a calm, skill-based experience that connects analog and digital time from the beginning. A useful progression is everyday order and duration, hours and half-hours, quarter-hours, five-minute intervals, then individual minutes. Offer both “read the clock” and “set the clock” practice, with an untimed demonstration mode, clear retryable feedback, and accessible controls alongside dragging. For a small implementation, render the clock in SVG and derive both displays from one normalized time value. Curriculum milestones support this sequence; they do not establish that this particular app will improve learning, so prototype testing with children remains essential.[^1][^2][^3]

## Findings and recommendations

### Learning progression

- Start with familiar routines, “earlier/later,” and how long activities take. Counting by fives and understanding halves and quarters support later clock reading.[^2]
- Use optional stages: **o’clock and half-past → quarter-past/to → five-minute intervals → nearest minute**. England places these across Years 1–3; the US Common Core similarly distributes hour/half-hour, five-minute, and nearest-minute work across grades 1–3, with differences such as when a.m./p.m. appears. Let children move on when ready rather than assigning a level solely by age.[^1]
- Teach that the hour hand moves continuously between numerals. For example, at 7:55 it is near 8, not fixed at 7; at 7:45, “quarter to” refers to 8. Use a leading zero for times such as 7:05. Children can confuse the two hands or interpret the same numeral as the same number of minutes regardless of which hand points to it.[^3]
- Check understanding with transition examples such as **7:05, 7:30, 7:45, 7:55, and 8:00**, including the movement of the hour hand. Correct hand placement alone may not demonstrate understanding, so ask learners to explain or match the digital time as well.[^3]

### Practice and feedback

- Provide both directions: show an analog clock and ask for its digital time; then give a digital target and ask the learner to set the analog clock. In an exploration lesson, keep both displays synchronized; hide the answer display in a “read the clock” challenge, then reveal a hint or answer after an attempt.
- Keep early practice untimed. Use specific, neutral prompts (“Look at the minute hand. Which number is 30 minutes?”), allow retries, and avoid making score loss the main feedback. These are design recommendations informed by accessible-learning guidance and examples from existing products, not proven outcomes for this app.[^5][^6][^9]
- Keep the child’s task uncluttered. Put stage, language, and hint settings in a simple adult area if needed, while leaving sound, contrast, and motion preferences available to the child.[^9]

### Accessible, child-friendly interaction

- Use WCAG 2.2 AA as a design baseline, while recognizing that legal obligations depend on the app’s jurisdiction and use. Make touch controls about **48 × 48 CSS pixels** where practical; this is a recommendation, not WCAG’s AA minimum. WCAG 2.2 AA generally requires 24 × 24 CSS-pixel targets subject to exceptions; 44 × 44 is the enhanced AAA criterion.[^7]
- Dragging should never be the only way to set a hand. Provide labeled hour/minute step controls that can reach every time, plus keyboard operation and a visible focus indicator. Keyboard access and a non-drag pointer alternative address different accessibility needs.[^8]
- Label the **hour hand** and **minute hand** in text; do not distinguish them by color alone. Announce useful clock changes to assistive technology in practice mode, but do not reveal the answer prematurely in a quiz. Use short written instructions; optional speech should be replayable, stoppable, and never the only way to understand a task.[^7][^8][^9]
- Keep text and meaningful controls/graphics at WCAG contrast levels. Avoid autoplay, flashing, or decorative movement by default; honor reduced-motion preferences. Stack the clock, readout, and controls on narrow screens, and test keyboard, screen readers, zoom/reflow, both orientations, and touch assistive technology.[^7][^9]

### Minimal web implementation

- Prefer **inline SVG** for the clock face, numerals, and hands, with native HTML controls outside the graphic. Canvas exposes a bitmap rather than its drawn objects; an SVG exposed as one image is also not a collection of semantic controls, so keep interactive controls separately accessible.[^10]
- Keep one integer source of truth, `t`, representing minutes in a 12-hour cycle (`0–719`), and derive the readout and hand angles:

  ```js
  const t = ((minutes % 720) + 720) % 720;
  const h = Math.floor(t / 60);
  const m = t % 60;
  const digitalHour = h || 12;
  const minuteDegrees = 6 * m;
  const hourDegrees = 30 * h + 0.5 * m;
  ```

  This keeps the hour hand between numerals and naturally handles increments such as 11:59 → 12:00 and 12:59 → 1:00. A 12-hour value does not encode a.m./p.m.; if the app teaches those, store time across a 24-hour day and handle noon and midnight explicitly.[^4][^11]
- If hands are draggable, use Pointer Events and pointer capture; provide a cancel/undo path and keep any `touch-action: none` restriction limited to the drag area. Test hand overlap, angle wraparound, minute/hour rollover, and browser zoom rather than relying on visual inspection alone.[^11][^12]

## Product examples and prior art

- **[tellingtime.io](https://tellingtime.io/)** demonstrates a staged lesson sequence and read, set, match, and timed practice modes. Its digital-clock lesson synchronizes digital and analog representations. One half-past explanation uses the “smaller” adjacent hour, so explicitly test explanations and interactions at the 12-to-1 boundary.[^5]
- **[Math Learning Center Math Clock](https://www.mathlearningcenter.org/apps/math-clock)** is an open-ended manipulative with a digital display and exploration tools. **[Toy Theater](https://toytheater.com/clock/)** separates a draggable clock from a telling-time game; **[Mathsframe](https://mathsframe.co.uk/en/resources/resource/116/Telling%20the%20Time%20-%20interactive%20game)** offers selectable precision and timed/untimed play. These illustrate useful patterns, not evidence that a specific game design is more effective. The review inspected official pages and delivered code but did not play-test the products or verify assistive-technology behavior.[^6]
- Among open-source examples, **[Kaelyn’s Academy](https://github.com/joyfulhouse/kaelyns-academy/tree/1e5fb30c94ea42ef5a60cff71079dfec17aaa29e)** is a useful implementation reference: one normalized time value drives the clock, and the activity supports pointer, keyboard, and tap-to-step interaction. Its tests cover time wrapping, angles, and browser interaction. **[Sugarizer Clock](https://github.com/llaske/sugarizer/tree/60ccdbcb004de1a706749c7314edfa0d160288b4/activities/Clock.activity)** and **[Futatoki](https://github.com/mrksye/futatoki-app/tree/962d0f4611576bb041cb728088ef25aceee2a8fa)** show alternate Canvas and rotation approaches; Futatoki’s displayed timer is a countdown, not a synchronized digital time-of-day display. These repositories were inspected, not run, and should be treated as prior art rather than validated models.[^12][^13]

## Suggested MVP and validation

1. Ship three modes: **Explore** (both displays visible), **Read** (analog to digital), and **Set** (digital target to analog).
2. Offer the staged difficulty sequence above, untimed by default, with retries and optional hints.
3. Support both hand dragging and labeled hour/minute controls; include keyboard access, screen-reader descriptions, responsive layout, and reduced-motion behavior.
4. Verify the cited transition times, especially 7:55 → 8:00 and the 12 → 1 boundary. Test at a 320-CSS-pixel viewport, with zoom, keyboard, screen readers, touch, and overlapping hands.
5. Test prototypes with children across ages 5–8, including relevant accessibility needs. The available research does not measure learning gains for this proposed app; usability and educational effectiveness must be evaluated directly.[^7][^9]

## Confidence and open questions

**Higher confidence:** the curriculum sequence is supported by official standards, and the accessibility criteria and basic clock-angle model are grounded in cited standards and platform documentation. **Moderate confidence:** product-feature comparisons are based on inspected pages/source, not full hands-on usability testing. **Not established:** whether the proposed app improves learning, how it performs with children using assistive technology, or which privacy/legal requirements apply in a chosen jurisdiction. Resolve the last items before collecting children’s data or making learning-effectiveness claims.

## Code references

- [Kaelyn’s clock model, `clock-model.ts:18–42`](https://github.com/joyfulhouse/kaelyns-academy/blob/1e5fb30c94ea42ef5a60cff71079dfec17aaa29e/src/activities/math-clock/clock-model.ts#L18-L42) — normalized time state and wraparound.
- [Kaelyn’s player, `Player.tsx:213–294`](https://github.com/joyfulhouse/kaelyns-academy/blob/1e5fb30c94ea42ef5a60cff71079dfec17aaa29e/src/activities/math-clock/Player.tsx#L213-L294) and [`Player.tsx:408–438`](https://github.com/joyfulhouse/kaelyns-academy/blob/1e5fb30c94ea42ef5a60cff71079dfec17aaa29e/src/activities/math-clock/Player.tsx#L408-L438) — pointer, keyboard, and tap interaction.
- [Kaelyn’s model tests, `clock-model.test.ts:11–63`](https://github.com/joyfulhouse/kaelyns-academy/blob/1e5fb30c94ea42ef5a60cff71079dfec17aaa29e/src/activities/math-clock/clock-model.test.ts#L11-L63), and [browser tests, `meaningful-clock.spec.ts:7–67`](https://github.com/joyfulhouse/kaelyns-academy/blob/1e5fb30c94ea42ef5a60cff71079dfec17aaa29e/e2e/specs/meaningful-clock.spec.ts#L7-L67) — example coverage for model and interaction behavior.

## Sources

[^1]: UK Department for Education, [National curriculum in England: mathematics programmes of study](https://www.gov.uk/government/publications/national-curriculum-in-england-mathematics-programmes-of-study/national-curriculum-in-england-mathematics-programmes-of-study), Years 1–3, Measurement (updated 28 September 2021), and [national curriculum age bands](https://www.gov.uk/national-curriculum); National Governors Association/CCSSO, [Common Core State Standards for Mathematics](https://learning.ccsso.org/wp-content/uploads/2022/11/ADA-Compliant-Math-Standards.pdf), 2010, pp. 16, 20, 24.
[^2]: New Zealand Ministry of Education, [How long now?](https://newzealandcurriculum.tahurangi.education.govt.nz/how-long-now/5637163373.p), “Duration” and “Opportunities for adaptation”; [Clock it up](https://newzealandcurriculum.tahurangi.education.govt.nz/clock-it-up/5637199430.p), Activity 2.
[^3]: Oak National Academy, [Tell and write quarter past and quarter to on a clock face](https://www.thenational.academy/teachers/programmes/maths-primary-ks1/units/time-write-and-tell-the-time-to-five-minutes/lessons/tell-and-write-quarter-past-and-quarter-to-on-a-clock-face), “Keywords” and “Common misconception”; van Bommel and Walla, [Teaching and Learning of Time in Early Mathematics Education: A Systematic Literature Review](https://mdpi-res.com/d_attachment/education/education-15-01003/article_deploy/education-15-01003.pdf), 6 August 2025, pp. 6, 12–14; Earnest, Gonzales and Plant, [Time as a Measure](https://files.eric.ed.gov/fulltext/ED581317.pdf), October 2017, pp. 364–369.
[^4]: NIST, [Times of Day FAQs](https://www.nist.gov/pml/time-and-frequency-division/times-day-faqs), “Are noon and midnight referred to as 12 a.m. or 12 p.m.?” (updated 11 October 2024).
[^5]: [tellingtime.io lessons](https://tellingtime.io/learn/), [digital-clock lesson](https://tellingtime.io/learn/digital-clock/), [games](https://tellingtime.io/games/), [half-past lesson](https://tellingtime.io/learn/half-past/), and [set-clock game code](https://tellingtime.io/_astro/SetClockGame.astro_astro_type_script_index_0_lang.DKY3kS41.js); accessed 25 November 2026.
[^6]: Math Learning Center, [Math Clock](https://www.mathlearningcenter.org/apps/math-clock) and [help guide](https://apps.mathlearningcenter.org/math-clock/info/info-how-to.html); Toy Theater, [Interactive Clock](https://toytheater.com/clock/), [Telling Time](https://toytheater.com/telling-time/), and [game script](https://toytheater.com/page/telling_time/scripts/main10.js); Mathsframe, [Telling the Time](https://mathsframe.co.uk/en/resources/resource/116/Telling%20the%20Time%20-%20interactive%20game). Accessed 25 November 2026.
[^7]: W3C, [Web Content Accessibility Guidelines (WCAG) 2.2](https://www.w3.org/TR/2024/REC-WCAG22-20241212/), including Success Criteria 1.3.4, 1.4.2–1.4.4, 1.4.10–1.4.11, 2.2.2, 2.3.1, 2.3.3, 2.5.5, 2.5.8, and 4.1.3.
[^8]: W3C, [Understanding SC 2.5.8: Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html); [Understanding SC 2.5.7: Dragging Movements](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html); [ARIA Authoring Practices Guide: Slider Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/slider/).
[^9]: CAST, [UDL Guidelines 3.0](https://udlguidelines.cast.org/), considerations 1.2, 4.1, and 8.5; W3C, [Making Content Usable for People with Cognitive and Learning Disabilities](https://www.w3.org/TR/coga-usable/), 29 April 2021; Nielsen Norman Group, [Children’s UX: Usability Issues in Designing for Young People](https://www.nngroup.com/articles/childrens-websites-usability-issues/), 13 January 2019; Woodward et al., [Characterizing How Interface Complexity Affects Children’s Touchscreen Interactions](https://init.cise.ufl.edu/publications-2/characterizing-how-interface-complexity-affects-childrens-touchscreen-interactions/), 7 May 2016.
[^10]: MDN, [Canvas: Accessibility](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/canvas#accessibility) and [ARIA img role: SVG and role="img"](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/img_role#svg_and_roleimg).
[^11]: MDN, [JavaScript remainder operator](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Remainder#description), [Pointer Events: capturing the pointer](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events#capturing_the_pointer), [SVG `viewBox`](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Attribute/viewBox), and [CSS `touch-action`: accessibility](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/touch-action#accessibility); W3C, [SVG 2 `getScreenCTM()`](https://www.w3.org/TR/SVG2/types.html#__svg__SVGGraphicsElement__getScreenCTM).
[^12]: [Kaelyn’s Academy](https://github.com/joyfulhouse/kaelyns-academy/tree/1e5fb30c94ea42ef5a60cff71079dfec17aaa29e), indexed commit `1e5fb30c94ea42ef5a60cff71079dfec17aaa29e`; see the code references above and [MIT license](https://github.com/joyfulhouse/kaelyns-academy/blob/1e5fb30c94ea42ef5a60cff71079dfec17aaa29e/LICENSE#L1-L13).
[^13]: [Sugarizer Clock](https://github.com/llaske/sugarizer/tree/60ccdbcb004de1a706749c7314edfa0d160288b4/activities/Clock.activity), indexed commit `60ccdbcb004de1a706749c7314edfa0d160288b4`, [`activity.js:1195–1238`](https://github.com/llaske/sugarizer/blob/60ccdbcb004de1a706749c7314edfa0d160288b4/activities/Clock.activity/js/activity.js#L1195-L1238); [Futatoki](https://github.com/mrksye/futatoki-app/tree/962d0f4611576bb041cb728088ef25aceee2a8fa), indexed commit `962d0f4611576bb041cb728088ef25aceee2a8fa`, [`ClockLayout.tsx:223–230`](https://github.com/mrksye/futatoki-app/blob/962d0f4611576bb041cb728088ef25aceee2a8fa/src/components/ClockLayout.tsx#L223-L230) and [`TimerLayout.tsx:195–200`](https://github.com/mrksye/futatoki-app/blob/962d0f4611576bb041cb728088ef25aceee2a8fa/src/components/TimerLayout.tsx#L195-L200).
