import { describe, expect, it } from 'vitest';
import { answerMessage, describeHands, preferredLanguage, translations } from './translations';

describe('complete typed translations', () => {
  it.each([['et', 'et'], ['et-EE', 'et'], ['ET-ee', 'et'], ['en-GB', 'en'], ['fi', 'en'], ['eternal', 'en']])(
    'detects preferred locale %s as %s', (locale, language) => expect(preferredLanguage(locale)).toBe(language),
  );
  it('has matching nonempty keys and all four stages', () => {
    expect(Object.keys(translations.et)).toEqual(Object.keys(translations.en));
    for (const t of Object.values(translations)) {
      expect(t.stages).toHaveLength(4);
      for (const value of Object.values(t)) if (typeof value === 'string') expect(value.length).toBeGreaterThan(0);
    }
  });
  it('localizes exact hours, between hours and one/multiple small ticks', () => {
    expect(describeHands(420, 'en')).toBe('Short hour hand on 7. Long minute hand on 12.');
    expect(describeHands(475, 'en')).toBe('Short hour hand between 7 and 8. Long minute hand on 11.');
    expect(describeHands(30, 'et')).toContain('numbrite 12 ja 1 vahel');
    expect(describeHands(420, 'et')).toContain('numbril 7');
    expect(describeHands(61, 'en')).toContain('1 small tick past 12');
    expect(describeHands(62, 'en')).toContain('2 small ticks past 12');
    expect(describeHands(61, 'et')).toContain('1 väike kriips pärast numbrit 12');
    expect(describeHands(62, 'et')).toContain('2 väikest kriipsu pärast numbrit 12');
    expect(translations.et.minuteStep(1, true)).toBe('1 minut edasi');
    expect(translations.et.minuteStep(5, false)).toBe('5 minutit tagasi');
  });
  it('retains hints and numeric 12h time in both languages', () => {
    for (const language of ['en', 'et'] as const) {
      const t = translations[language];
      expect(answerMessage(475, 475, language, false)).toBe(t.correct('7:55'));
      expect(answerMessage(535, 475, language, true)).toBe(t.hourHint);
      expect(answerMessage(470, 475, language, true)).toBe(t.minuteHint);
      expect(answerMessage(470, 475, language, false)).toBe(t.retry);
    }
  });
});
