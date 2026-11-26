import { describe, expect, it } from 'vitest';
import { angleDelta, choices, clock, feedback, handPositions, normalize, question, stages } from './time';

describe('clock model', () => {
  it.each([
    [425, '7:05', 212.5, 30], [450, '7:30', 225, 180],
    [465, '7:45', 232.5, 270], [475, '7:55', 237.5, 330],
    [480, '8:00', 240, 0],
  ])('derives both displays from %i minutes', (t, digital, hourDegrees, minuteDegrees) => {
    expect(clock(t)).toMatchObject({ digital, hourDegrees, minuteDegrees });
  });
  it.each([[719 + 1, '12:00'], [59 + 1, '1:00'], [475 + 5, '8:00'], [-1, '11:59']])(
    'wraps %i to %s', (t, digital) => expect(clock(t).digital).toBe(digital),
  );
  it('rejects invalid time instead of displaying a broken clock', () => {
    for (const t of [NaN, Infinity, 0.5]) expect(() => normalize(t)).toThrow(RangeError);
  });
  it('provides language-independent positions and hint rules', () => {
    expect(handPositions(475)).toEqual({ hour: 7, next: 8, exactHour: false, minuteNumber: 11, ticks: 0 });
    expect(handPositions(30)).toMatchObject({ hour: 12, next: 1 });
    expect(handPositions(61).ticks).toBe(1);
    expect(handPositions(62).ticks).toBe(2);
    expect(feedback(60 + 55, 55)).toBe('hourHint');
    expect(feedback(54, 55)).toBe('minuteHint');
    expect(feedback(775, 55)).toBe('correct');
  });
  it('crosses the top of the clock in both directions', () => {
    expect(angleDelta(330, 30)).toBe(60);
    expect(angleDelta(30, 330)).toBe(-60);
  });
  it.each(stages)('generates valid, non-repeating questions for $step-minute steps', ({ step }) => {
    let previous = 0;
    for (let i = 0; i < 1000; i++) {
      const target = question(step, previous);
      expect(target).not.toBe(previous);
      expect(target % step).toBe(0);
      expect(target).toBeGreaterThanOrEqual(0);
      expect(target).toBeLessThan(720);
      const options = choices(target, step);
      expect(options).toHaveLength(4);
      expect(new Set(options).size).toBe(4);
      expect(options.filter(t => t === target)).toHaveLength(1);
      previous = target;
    }
  });
});
