export const stages = [
  { step: 30 },
  { step: 15 },
  { step: 5 },
  { step: 1 },
] as const;

export function normalize(minutes: number): number {
  if (!Number.isFinite(minutes) || !Number.isInteger(minutes)) {
    throw new RangeError('Time must be a finite whole number of minutes.');
  }
  return ((minutes % 720) + 720) % 720;
}

export function clock(minutes: number) {
  const t = normalize(minutes);
  const hour = Math.floor(t / 60);
  const minute = t % 60;
  return {
    hour: hour || 12,
    minute,
    digital: `${hour || 12}:${String(minute).padStart(2, '0')}`,
    hourDegrees: 30 * hour + 0.5 * minute,
    minuteDegrees: 6 * minute,
  };
}

export function handPositions(minutes: number) {
  const { hour, minute } = clock(minutes);
  return { hour, next: hour % 12 + 1, exactHour: minute === 0,
    minuteNumber: Math.floor(minute / 5) || 12, ticks: minute % 5 };
}

export function question(step: number, previous: number): number {
  const count = 720 / step;
  const previousSlot = Math.floor(normalize(previous) / step);
  return ((previousSlot + 1 + Math.floor(Math.random() * (count - 1))) % count) * step;
}

export function choices(target: number, step: number): number[] {
  const values = new Set([target, normalize(target + 60), normalize(target - 60), normalize(target + step)]);
  const shuffled = [...values];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function feedback(answer: number, target: number): 'correct' | 'hourHint' | 'minuteHint' {
  const a = clock(answer);
  const t = clock(target);
  if (normalize(answer) === normalize(target)) return 'correct';
  if (a.minute === t.minute) {
    return 'hourHint';
  }
  return 'minuteHint';
}

export function angleDelta(from: number, to: number): number {
  return ((to - from + 540) % 360) - 180;
}
