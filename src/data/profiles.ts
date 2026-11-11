import type { SlotId } from './etfs';

export type ProfileId = 'sleepy' | 'careful' | 'clever' | 'hunter' | 'blaze';

export interface Profile {
  id: ProfileId;
  level: 1 | 2 | 3 | 4 | 5;
  name: string;
  tagline: string;
  description: string;
  /** Slot weights in percent, sums to 100. */
  weights: Partial<Record<SlotId, number>>;
  /** Illustrative annual return scenarios, % (not a forecast). */
  returns: { low: number; base: number; high: number };
  /** Illustrative worst-case drawdown, %. */
  drawdown: number;
  color: string;
}

export const PROFILES: Profile[] = [
  {
    id: 'sleepy',
    level: 1,
    name: 'Сонная лиса',
    tagline: 'Главное — сохранить',
    description:
      'Тебе важнее спать спокойно, чем гнаться за доходностью. Портфель почти целиком из облигаций и кэш-эквивалентов.',
    weights: { world: 20, bonds: 40, cash: 30, gold: 10 },
    returns: { low: 1, base: 3, high: 5 },
    drawdown: 10,
    color: '#4cc9f0',
  },
  {
    id: 'careful',
    level: 2,
    name: 'Осторожная лиса',
    tagline: 'Тихо, но растём',
    description:
      'Готова на небольшие просадки ради заметно большей доходности, чем по депозиту. Облигации и акции примерно 60/40.',
    weights: { world: 30, sp500: 10, bonds: 35, cash: 15, gold: 10 },
    returns: { low: 1.5, base: 4.5, high: 7.5 },
    drawdown: 18,
    color: '#4be37a',
  },
  {
    id: 'clever',
    level: 3,
    name: 'Хитрая лиса',
    tagline: 'Золотая середина',
    description:
      'Классический сбалансированный подход: акции двигают портфель вперёд, облигации и золото страхуют от обвалов.',
    weights: { world: 40, sp500: 15, nasdaq: 5, bonds: 25, cash: 5, gold: 10 },
    returns: { low: 1, base: 6, high: 10 },
    drawdown: 28,
    color: '#ffd23f',
  },
  {
    id: 'hunter',
    level: 4,
    name: 'Лиса-охотница',
    tagline: 'Идём за ростом',
    description:
      'Ты понимаешь, что рынок бывает красным, и готова ждать. Основа — акции, облигации и золото только смягчают падения.',
    weights: { world: 45, sp500: 20, nasdaq: 10, reit: 5, bonds: 10, gold: 10 },
    returns: { low: -1, base: 7.5, high: 12.5 },
    drawdown: 36,
    color: '#ff8c1a',
  },
  {
    id: 'blaze',
    level: 5,
    name: 'Огненная лиса',
    tagline: 'Максимум риска, максимум роста',
    description:
      'Длинный горизонт и железные нервы. Почти 100% акций, включая технологии и развивающиеся рынки. Просадки в полтора-два раза глубже среднего.',
    weights: { world: 35, sp500: 20, nasdaq: 25, em: 10, reit: 5, gold: 5 },
    returns: { low: -3, base: 9, high: 15 },
    drawdown: 48,
    color: '#ff4d6d',
  },
];

export const getProfile = (id: ProfileId): Profile => {
  const p = PROFILES.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown profile: ${id}`);
  return p;
};
