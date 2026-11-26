import './styles.css';
import { angleDelta, choices, clock, normalize, question, stages } from './time';
import { answerMessage, describeHands, preferredLanguage, translations, type Language, type TextKey } from './translations';

type Mode = 'explore' | 'read' | 'set';
let mode: Mode = 'explore';
let stage = 0;
let time = 450;
let target = 450;
type Outcome = 'unanswered' | 'incorrect' | 'correct' | 'revealed';
let outcome: Outcome = 'unanswered';
let lastAnswer: number | undefined;
let language = preferredLanguage(navigator.languages?.[0] || navigator.language);
let burstTimer: ReturnType<typeof setTimeout> | undefined;
let exploreAnnouncement = false;

function element<T extends Element>(selector: string, type: { new(...args: never[]): T }): T {
  const found = document.querySelector(selector);
  if (!(found instanceof type)) throw new Error(`Missing UI element: ${selector}`);
  return found;
}

const app = element('#app', HTMLElement);
const numerals = Array.from({ length: 12 }, (_, i) => {
  const angle = (i + 1) * Math.PI / 6;
  return `<text x="${160 + Math.sin(angle) * 113}" y="${160 - Math.cos(angle) * 113}">${i + 1}</text>`;
}).join('');
const ticks = Array.from({ length: 60 }, (_, i) => {
  const angle = i * Math.PI / 30;
  const radius = i % 5 === 0 ? 134 : 141;
  return `<line x1="${160 + Math.sin(angle) * radius}" y1="${160 - Math.cos(angle) * radius}"
    x2="${160 + Math.sin(angle) * 147}" y2="${160 - Math.cos(angle) * 147}" class="${i % 5 === 0 ? 'major' : 'tick'}"/>`;
}).join('');

app.innerHTML = `
  <header><h1 data-text="title"></h1><p data-text="subtitle"></p>
    <label class="language" for="language">Language / Keel
      <select id="language"><option value="en">English</option><option value="et">Eesti</option></select>
    </label>
  </header>
  <nav data-label="activities">
    <button data-mode="explore" data-text="explore" aria-pressed="true"></button>
    <button data-mode="read" data-text="read" aria-pressed="false"></button>
    <button data-mode="set" data-text="set" aria-pressed="false"></button>
  </nav>
  <section class="workbench" aria-labelledby="task">
    <div class="clock-area">
      <div id="clock-surface">
      <svg id="clock" viewBox="0 0 320 320" role="img" aria-label="Teaching clock">
        <circle cx="160" cy="160" r="155" class="face"/>
        <g aria-hidden="true">${ticks}${numerals}
          <g id="hour-hand"><path d="M150 170 L150 104 L160 91 L170 104 L170 170 Z" class="hour"/>
            <circle cx="160" cy="112" r="5" class="grab-cue"/></g>
          <g id="minute-hand"><line x1="160" y1="178" x2="160" y2="49" class="minute"/>
            <circle cx="160" cy="65" r="5" class="grab-cue"/></g>
          <circle cx="160" cy="160" r="20" class="hub"/>
        </g>
      </svg>
      <div id="hour-target" class="hand-target" aria-hidden="true"><div class="hit" data-hand="hour"></div></div>
      <div id="minute-target" class="hand-target" aria-hidden="true"><div class="hit" data-hand="minute"></div></div>
      <div class="hub-mask" aria-hidden="true"></div>
      </div>
      <div id="burst" aria-hidden="true" hidden>★ ✦ ★ ✦ ★</div>
      <div class="key"><span><b class="hour-key"></b><span data-text="hourKey"></span></span><span><b class="minute-key"></b><span data-text="minuteKey"></span></span></div>
      <p id="drag-tip" data-text="dragTip"></p>
    </div>
    <div class="practice">
      <h2 id="task">Make the hands move.</h2>
      <p id="instruction">Watch how the short hand moves as the minutes go by.</p>
      <div id="readout" class="readout" aria-label="Current time">7:30</div>
      <div id="controls">
        <fieldset><legend data-text="hour"></legend>
          <button data-step="-60" data-label="backHour" data-text="minusHour"></button>
          <button data-step="60" data-label="forwardHour" data-text="plusHour"></button>
        </fieldset>
        <fieldset><legend data-text="minute"></legend>
          <button id="minute-back" data-step="-30">-30 min</button>
          <button id="minute-forward" data-step="30">+30 min</button>
        </fieldset>
      </div>
      <div id="choices" class="choices" role="group" data-label="timeChoices" hidden></div>
      <div id="success" class="success-card" hidden>
        <span aria-hidden="true">✓</span> <strong data-text="success"></strong>
        <div id="success-time"></div>
      </div>
      <div class="actions">
        <button id="check" class="primary" data-text="check" hidden></button>
        <button id="reveal" data-text="reveal" hidden></button>
        <button id="next" data-text="next" hidden></button>
      </div>
      <p id="status" role="status" aria-live="polite" aria-atomic="true"></p>
    </div>
  </section>
  <footer>
    <label class="preference"><input id="contrast" type="checkbox"><span data-text="contrast"></span></label>
    <details><summary data-text="grownups"></summary>
      <label for="stage" data-text="practice"></label>
      <select id="stage">${stages.map((_, i) => `<option value="${i}"></option>`).join('')}</select>
      <label class="preference"><input id="hints" type="checkbox" checked><span data-text="hints"></span></label>
      <p data-text="privacy"></p>
    </details>
  </footer>`;

const svg = element('#clock', SVGSVGElement);
const clockSurface = element('#clock-surface', HTMLElement);
const hourTarget = element('#hour-target', HTMLElement);
const minuteTarget = element('#minute-target', HTMLElement);
const hourHand = element('#hour-hand', SVGGElement);
const minuteHand = element('#minute-hand', SVGGElement);
const status = element('#status', HTMLElement);
const readout = element('#readout', HTMLElement);
const controls = element('#controls', HTMLElement);
const options = element('#choices', HTMLElement);
const check = element('#check', HTMLButtonElement);
const reveal = element('#reveal', HTMLButtonElement);
const next = element('#next', HTMLButtonElement);
const hints = element('#hints', HTMLInputElement);
const stepBack = element('#minute-back', HTMLButtonElement);
const stepForward = element('#minute-forward', HTMLButtonElement);

function draw() {
  const t = translations[language];
  const solved = outcome === 'correct' || outcome === 'revealed';
  const shown = mode === 'read' ? target : time;
  const c = clock(shown);
  hourHand.setAttribute('transform', `rotate(${c.hourDegrees} 160 160)`);
  minuteHand.setAttribute('transform', `rotate(${c.minuteDegrees} 160 160)`);
  hourTarget.style.transform = `rotate(${c.hourDegrees}deg)`;
  minuteTarget.style.transform = `rotate(${c.minuteDegrees}deg)`;
  svg.setAttribute('aria-label', mode === 'explore' || solved
    ? t.clockShowing(c.digital, describeHands(shown, language))
    : describeHands(shown, language));
  readout.hidden = mode === 'read' && !solved;
  readout.textContent = clock(mode === 'set' && !solved ? target : shown).digital;
  readout.setAttribute('aria-label', mode === 'set' && !solved ? t.target : t.current);
  controls.hidden = mode === 'read';
  element('#drag-tip', HTMLElement).hidden = mode === 'read';
  clockSurface.classList.toggle('draggable', mode !== 'read');
  hourTarget.classList.toggle('active-target', drag?.hand === 'hour');
  minuteTarget.classList.toggle('active-target', drag?.hand === 'minute');
  check.hidden = mode !== 'set' || solved;
  reveal.hidden = mode === 'explore' || outcome !== 'incorrect';
  next.hidden = mode === 'explore';
  next.classList.toggle('primary', outcome === 'correct');
  element('#success', HTMLElement).hidden = outcome !== 'correct';
  element('#success-time', HTMLElement).textContent = clock(target).digital;
  hourHand.classList.toggle('active-hand', drag?.hand === 'hour');
  minuteHand.classList.toggle('active-hand', drag?.hand === 'minute');
  options.querySelectorAll<HTMLButtonElement>('button').forEach(button => {
    const correct = outcome === 'correct' && Number(button.dataset.answer) === target;
    button.classList.toggle('correct-choice', correct);
    button.setAttribute('aria-disabled', String(solved));
    button.setAttribute('aria-label', correct ? `${clock(target).digital}. ${t.correctChoice}` : button.dataset.digital!);
    const marker = button.querySelector<HTMLElement>('.choice-check');
    if (marker) marker.hidden = !correct;
  });
}

function stopBurst() {
  clearTimeout(burstTimer);
  element('#burst', HTMLElement).hidden = true;
}
function clearOutcome() {
  outcome = 'unanswered';
  lastAnswer = undefined;
  exploreAnnouncement = false;
  status.textContent = '';
  stopBurst();
}
function renderStatus() {
  const t = translations[language];
  const text = outcome === 'revealed'
    ? `${t.timeIs(clock(target).digital)} ${describeHands(target, language)}`
    : lastAnswer !== undefined && outcome !== 'unanswered'
      ? answerMessage(lastAnswer, target, language, hints.checked)
      : exploreAnnouncement ? t.timeIs(clock(time).digital) : '';
  // Ordinary redraws must not repeat the live announcement.
  if (status.textContent !== text) status.textContent = text;
}
function localize() {
  const t = translations[language];
  document.documentElement.lang = language;
  document.title = t.title;
  document.querySelector('meta[name="description"]')?.setAttribute('content', t.description);
  document.querySelectorAll<HTMLElement>('[data-text]').forEach(node => {
    node.textContent = t[node.dataset.text as TextKey];
  });
  document.querySelectorAll<HTMLElement>('[data-label]').forEach(node => {
    node.setAttribute('aria-label', t[node.dataset.label as TextKey]);
  });
  element('#language', HTMLSelectElement).value = language;
  element('#stage', HTMLSelectElement).querySelectorAll('option').forEach((option, i) => {
    option.textContent = t.stages[i];
  });
  element('#task', HTMLElement).textContent = t[`${mode}Task`];
  element('#instruction', HTMLElement).textContent = t[`${mode}Instruction`];
  const step = stages[stage].step;
  stepBack.dataset.step = String(-step);
  stepForward.dataset.step = String(step);
  stepBack.textContent = t.minuteButton(step, false);
  stepForward.textContent = t.minuteButton(step, true);
  stepBack.setAttribute('aria-label', t.minuteStep(step, false));
  stepForward.setAttribute('aria-label', t.minuteStep(step, true));
  renderStatus();
  draw();
}

function newActivity() {
  cancelDrag();
  clearOutcome();
  options.replaceChildren();
  options.hidden = mode !== 'read';
  const step = stages[stage].step;
  if (mode === 'explore') {
    time = normalize(Math.round(time / step) * step);
  } else {
    target = question(step, target);
    time = normalize(target + 60);
  }
  if (mode === 'read') {
    for (const answer of choices(target, step)) {
      const button = document.createElement('button');
      button.textContent = clock(answer).digital;
      button.dataset.answer = String(answer);
      button.dataset.digital = clock(answer).digital;
      const marker = document.createElement('span');
      marker.className = 'choice-check';
      marker.textContent = ' ✓';
      marker.setAttribute('aria-hidden', 'true');
      marker.hidden = true;
      button.append(marker);
      button.addEventListener('click', () => submit(answer));
      options.append(button);
    }
  }
  localize();
}

function submit(answer: number) {
  if (outcome === 'correct' || outcome === 'revealed') return;
  cancelDrag();
  lastAnswer = normalize(answer);
  outcome = lastAnswer === target ? 'correct' : 'incorrect';
  renderStatus();
  if (outcome === 'correct' && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    element('#burst', HTMLElement).hidden = false;
    burstTimer = setTimeout(stopBurst, 900);
  }
  draw();
  if (outcome === 'correct' && mode === 'set') next.focus();
}

document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(button => {
  button.addEventListener('click', () => {
    cancelDrag();
    const selected = button.dataset.mode;
    if (selected !== 'explore' && selected !== 'read' && selected !== 'set') {
      throw new Error('Unknown clock activity.');
    }
    mode = selected;
    document.querySelectorAll('[data-mode]').forEach(tab => {
      tab.setAttribute('aria-pressed', String(tab === button));
    });
    newActivity();
  });
});
document.querySelectorAll<HTMLButtonElement>('[data-step]').forEach(button => {
  button.addEventListener('click', () => {
    cancelDrag();
    time = normalize(time + Number(button.dataset.step));
    clearOutcome();
    exploreAnnouncement = mode === 'explore';
    draw();
    renderStatus();
  });
});
check.addEventListener('click', () => {
  cancelDrag();
  submit(time);
});
reveal.addEventListener('click', () => {
  if (outcome !== 'incorrect') return;
  cancelDrag();
  time = target;
  outcome = 'revealed';
  stopBurst();
  renderStatus();
  draw();
  next.focus();
});
hints.addEventListener('change', renderStatus);
element('#language', HTMLSelectElement).addEventListener('change', event => {
  if (!(event.currentTarget instanceof HTMLSelectElement)) return;
  cancelDrag();
  language = event.currentTarget.value as Language;
  // Relabel existing nodes, preserving focus, choices and all learning state.
  localize();
});
next.addEventListener('click', newActivity);
element('#stage', HTMLSelectElement).addEventListener('change', event => {
  cancelDrag();
  if (event.currentTarget instanceof HTMLSelectElement) stage = Number(event.currentTarget.value);
  newActivity();
});
element('#contrast', HTMLInputElement).addEventListener('change', event => {
  if (event.currentTarget instanceof HTMLInputElement) {
    document.body.classList.toggle('high-contrast', event.currentTarget.checked);
  }
});

let drag: { pointer: number; hand: string; start: number; angle: number; delta: number;
  outcome: Outcome; answer: number | undefined; announcement: boolean } | undefined;
function pointerPosition(event: PointerEvent) {
  const matrix = svg.getScreenCTM();
  if (!matrix) throw new Error('Cannot map pointer coordinates to the clock.');
  const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
  return {
    angle: (Math.atan2(point.x - 160, 160 - point.y) * 180 / Math.PI + 360) % 360,
    radius: Math.hypot(point.x - 160, point.y - 160),
  };
}
function cancelDrag() {
  if (!drag) return;
  time = drag.start;
  outcome = drag.outcome;
  lastAnswer = drag.answer;
  exploreAnnouncement = drag.announcement;
  const pointer = drag.pointer;
  drag = undefined;
  if (svg.hasPointerCapture(pointer)) svg.releasePointerCapture(pointer);
  draw();
  renderStatus();
}
clockSurface.addEventListener('pointerdown', event => {
  if (mode === 'read' || drag || event.button !== 0 || !(event.target instanceof HTMLElement)) return;
  let hand = event.target.dataset.hand;
  if (!hand) return;
  const { angle, radius } = pointerPosition(event);
  if (radius <= 20) return;
  const c = clock(time);
  // Wide touch targets can overlap even when the visible hands do not. Choose
  // the nearest visible hand; truly overlapping hands use the radial rule.
  const overlapping = Math.abs(angleDelta(c.hourDegrees, c.minuteDegrees)) < 12;
  hand = radius < 85 && (overlapping
    || Math.abs(angleDelta(angle, c.hourDegrees)) <= Math.abs(angleDelta(angle, c.minuteDegrees)))
    ? 'hour' : 'minute';
  drag = { pointer: event.pointerId, hand, start: time, angle, delta: 0,
    outcome, answer: lastAnswer, announcement: exploreAnnouncement };
  svg.setPointerCapture(event.pointerId);
  event.preventDefault();
  draw();
});
svg.addEventListener('pointermove', event => {
  if (!drag || drag.pointer !== event.pointerId) return;
  const { angle } = pointerPosition(event);
  drag.delta += angleDelta(drag.angle, angle);
  drag.angle = angle;
  const increment = drag.hand === 'hour'
    ? Math.round(drag.delta / 30) * 60
    : Math.round(drag.delta / 6 / stages[stage].step) * stages[stage].step;
  time = normalize(drag.start + increment);
  // Preview movement only; commit feedback changes on pointerup. Cancellation
  // never removes/reinserts a success announcement or restarts its reward.
  draw();
});
svg.addEventListener('pointerup', event => {
  if (!drag || drag.pointer !== event.pointerId) return;
  const changed = time !== drag.start;
  drag = undefined;
  svg.releasePointerCapture(event.pointerId);
  if (changed) clearOutcome();
  exploreAnnouncement = mode === 'explore';
  draw();
  renderStatus();
});
svg.addEventListener('pointercancel', event => { if (drag?.pointer === event.pointerId) cancelDrag(); });
svg.addEventListener('lostpointercapture', event => { if (drag?.pointer === event.pointerId) cancelDrag(); });
window.addEventListener('resize', cancelDrag);
window.addEventListener('orientationchange', cancelDrag);
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') cancelDrag();
});
newActivity();
