import { clock, feedback, handPositions } from './time';

export type Language = 'en' | 'et';
export function preferredLanguage(locale: string): Language {
  return /^et(?:-|$)/i.test(locale) ? 'et' : 'en';
}

const en = {
  title: 'Time to learn',
  description: 'Explore clocks and practise telling the time, at your own pace.',
  subtitle: 'A little clock. A whole day to discover.',
  activities: 'Clock activities',
  explore: 'Explore', read: 'Read the clock', set: 'Set the clock',
  hourKey: 'Short hand: hours', minuteKey: 'Long hand: minutes',
  dragTip: 'Move the short hand for hours. Move the long hand for minutes. Or use the buttons.',
  exploreTask: 'Make the hands move.', readTask: 'What time is it?', setTask: 'Can you set this time?',
  exploreInstruction: 'Watch how the short hand moves as the minutes go by.',
  readInstruction: 'Look at both hands. Choose the matching time.',
  setInstruction: 'Move the hands, then check your clock.',
  current: 'Current time', target: 'Time to set',
  hour: 'Hour hand', minute: 'Minute hand',
  backHour: 'Back one hour', forwardHour: 'Forward one hour',
  minusHour: '-1 hour', plusHour: '+1 hour',
  timeChoices: 'Time choices', check: 'Check my clock', reveal: 'Show me', next: 'Next clock',
  contrast: 'Higher contrast', grownups: 'For grown-ups', practice: 'Practise these times',
  hints: 'Give hints after a try',
  privacy: 'No timers, scores, accounts, or data collection. Choose a stage together.',
  retry: 'Not quite yet. Have another try.',
  hourHint: 'Look at the short hour hand. Use the last number it has passed, even when it is close to the next one.',
  minuteHint: 'Look at the long minute hand. Count five minutes for each big number, starting at 12. Each small tick adds one minute.',
  success: 'You found it!', correctChoice: 'Correct answer',
  stages: ['Hours and half-hours', 'Quarter-hours', 'Five minutes', 'Every minute'],
  minuteStep: (n: number, forward: boolean) => `${forward ? 'Forward' : 'Back'} ${n} ${n === 1 ? 'minute' : 'minutes'}`,
  minuteButton: (n: number, forward: boolean) => `${forward ? '+' : '-'}${n} min`,
  correct: (time: string) => `You found it! The time is ${time}.`,
  timeIs: (time: string) => `The time is ${time}.`,
  clockShowing: (time: string, hands: string) => `Clock showing ${time}. ${hands}`,
  hands: (p: ReturnType<typeof handPositions>) => {
    const short = p.exactHour ? `on ${p.hour}` : `between ${p.hour} and ${p.next}`;
    const long = p.ticks === 0 ? `on ${p.minuteNumber}`
      : `${p.ticks} small ${p.ticks === 1 ? 'tick' : 'ticks'} past ${p.minuteNumber}`;
    return `Short hour hand ${short}. Long minute hand ${long}.`;
  },
};

// A mapped type checks every key and function signature in both languages.
type Translation = { [K in keyof typeof en]: (typeof en)[K] };
const et: Translation = {
  title: 'Õpime kella',
  description: 'Uuri kella ja harjuta kellaaja lugemist omas tempos.',
  subtitle: 'Väike kell. Terve päev avastamiseks.',
  activities: 'Kellategevused',
  explore: 'Uuri kella', read: 'Loe kella', set: 'Sea kell',
  hourKey: 'Lühike tunniosuti', minuteKey: 'Pikk minutiosuti',
  dragTip: 'Liiguta lühikest osutit tundide jaoks. Liiguta pikka osutit minutite jaoks. Võid kasutada ka nuppe.',
  exploreTask: 'Pane osutid liikuma.', readTask: 'Mis kell on?', setTask: 'Kas oskad selle kellaaja seada?',
  exploreInstruction: 'Vaata, kuidas lühike osuti minutite möödudes liigub.',
  readInstruction: 'Vaata mõlemat osutit. Vali sobiv kellaaeg.',
  setInstruction: 'Liiguta osuteid ja kontrolli siis oma kella.',
  current: 'Praegune kellaaeg', target: 'Seatav kellaaeg',
  hour: 'Tunniosuti', minute: 'Minutiosuti',
  backHour: 'Üks tund tagasi', forwardHour: 'Üks tund edasi',
  minusHour: '-1 tund', plusHour: '+1 tund',
  timeChoices: 'Kellaaegade valikud', check: 'Kontrolli mu kella', reveal: 'Näita mulle', next: 'Järgmine kell',
  contrast: 'Suurem kontrast', grownups: 'Täiskasvanutele', practice: 'Harjuta neid kellaaegu',
  hints: 'Anna pärast proovimist vihjeid',
  privacy: 'Ei ole taimerit, punkte, kontosid ega andmete kogumist. Valige koos sobiv tase.',
  retry: 'Veel mitte päris. Proovi uuesti.',
  hourHint: 'Vaata lühikest tunniosutit. Vali viimane number, millest see on möödunud, isegi kui see on järgmise numbri lähedal.',
  minuteHint: 'Vaata pikka minutiosutit. Loenda iga suure numbri kohta viis minutit, alustades 12 juurest. Iga väike kriips lisab ühe minuti.',
  success: 'Leidsid õige aja!', correctChoice: 'Õige vastus',
  stages: ['Täis- ja pooltunnid', 'Veerandtunnid', 'Viie minuti kaupa', 'Iga minut'],
  minuteStep: (n, forward) => `${n} ${n === 1 ? 'minut' : 'minutit'} ${forward ? 'edasi' : 'tagasi'}`,
  minuteButton: (n, forward) => `${forward ? '+' : '-'}${n} min`,
  correct: time => `Leidsid õige aja! Kell on ${time}.`,
  timeIs: time => `Kell on ${time}.`,
  clockShowing: (time, hands) => `Kell näitab ${time}. ${hands}`,
  hands: p => {
    const short = p.exactHour ? `numbril ${p.hour}` : `numbrite ${p.hour} ja ${p.next} vahel`;
    const long = p.ticks === 0 ? `numbril ${p.minuteNumber}`
      : `${p.ticks} ${p.ticks === 1 ? 'väike kriips' : 'väikest kriipsu'} pärast numbrit ${p.minuteNumber}`;
    return `Lühike tunniosuti on ${short}. Pikk minutiosuti on ${long}.`;
  },
};

export const translations: Record<Language, Translation> = { en, et };
export type TextKey = { [K in keyof Translation]: Translation[K] extends string ? K : never }[keyof Translation];
export function describeHands(minutes: number, language: Language): string {
  return translations[language].hands(handPositions(minutes));
}
export function answerMessage(answer: number, target: number, language: Language, hints: boolean): string {
  const t = translations[language];
  const result = feedback(answer, target);
  return result === 'correct' ? t.correct(clock(target).digital) : hints ? t[result] : t.retry;
}
