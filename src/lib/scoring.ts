import { QUESTIONS } from '../data/questions';
import { PROFILES, type Profile } from '../data/profiles';

export type Answers = Record<string, number>; // questionId -> option index

export interface RiskResult {
  /** 0..100 — willingness to take risk. */
  appetite: number;
  toleranceLevel: number;
  /** Highest level the investor's situation can sustain. */
  capacityLevel: number;
  level: number;
  /** True when capacity forced a more conservative profile than tolerance suggests. */
  capped: boolean;
  profile: Profile;
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 1);

/** Maps an average of 1..4 points onto profile levels 1..5. */
export const levelFromAverage = (a: number): number =>
  Math.min(5, Math.max(1, Math.round(1 + ((a - 1) * 4) / 3)));

const pointsFor = (answers: Answers, questionId: string): number => {
  const q = QUESTIONS.find((x) => x.id === questionId);
  const idx = answers[questionId];
  if (!q || idx === undefined || !q.options[idx]) throw new Error(`Missing answer: ${questionId}`);
  return q.options[idx].points;
};

export const isComplete = (answers: Answers): boolean =>
  QUESTIONS.every((q) => answers[q.id] !== undefined && q.options[answers[q.id]] !== undefined);

export function assessRisk(answers: Answers): RiskResult {
  const tol = QUESTIONS.filter((q) => q.kind === 'tolerance').map((q) => pointsFor(answers, q.id));
  const cap = QUESTIONS.filter((q) => q.kind === 'capacity').map((q) => pointsFor(answers, q.id));

  const toleranceAvg = avg(tol);
  const toleranceLevel = levelFromAverage(toleranceAvg);

  // Capacity is a ceiling, so it is one step more lenient than tolerance is…
  let capacityLevel = Math.min(5, levelFromAverage(avg(cap)) + 1);
  // …except for hard limits: money needed soon or no safety net must not sit in equities.
  const horizon = pointsFor(answers, 'horizon');
  const cushion = pointsFor(answers, 'cushion');
  if (horizon === 1) capacityLevel = Math.min(capacityLevel, 1);
  else if (horizon === 2) capacityLevel = Math.min(capacityLevel, 2);
  if (cushion === 1) capacityLevel = Math.min(capacityLevel, 2);

  const level = Math.min(toleranceLevel, capacityLevel);
  return {
    appetite: Math.round(((toleranceAvg - 1) / 3) * 100),
    toleranceLevel,
    capacityLevel,
    level,
    capped: level < toleranceLevel,
    profile: PROFILES[level - 1],
  };
}
