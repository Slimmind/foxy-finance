export interface Option {
  label: string;
  /** 1 (very cautious) .. 4 (very bold) */
  points: 1 | 2 | 3 | 4;
}

export interface Question {
  id: string;
  /** "tolerance" is willingness to take risk; "capacity" is the ability to absorb losses. */
  kind: 'tolerance' | 'capacity';
  text: string;
  /** Short explanation shown by the fox next to this question. */
  hint: string;
  options: Option[];
}

export const QUESTIONS: Question[] = [
  {
    id: 'horizon',
    kind: 'capacity',
    text: 'Через сколько лет тебе могут понадобиться деньги, которые ты планируешь вложить?',
    hint: 'Чем короче срок, тем меньше времени у рынка восстановиться после падения.',
    options: [
      { label: 'Меньше чем через год', points: 1 },
      { label: '1–3 года', points: 2 },
      { label: '3–10 лет', points: 3 },
      { label: 'Больше 10 лет', points: 4 },
    ],
  },
  {
    id: 'cushion',
    kind: 'capacity',
    text: 'Есть ли у тебя финансовая подушка вне инвестиций?',
    hint: 'Финансовая подушка — это деньги на 3–6 месяцев жизни вне инвестиций.',
    options: [
      { label: 'Нет, это все мои сбережения', points: 1 },
      { label: 'Хватит на 1–3 месяца', points: 2 },
      { label: 'Хватит на 3–6 месяцев', points: 3 },
      { label: 'Больше 6 месяцев', points: 4 },
    ],
  },
  {
    id: 'share',
    kind: 'capacity',
    text: 'Какую долю всех твоих накоплений составит сумма, которую ты планируешь вложить в ETF?',
    hint: 'Саму сумму ты укажешь позже. Чем больше доля накоплений, тем болезненнее убытки.',
    options: [
      { label: 'Больше 75%', points: 1 },
      { label: '50–75%', points: 2 },
      { label: '25–50%', points: 3 },
      { label: 'Меньше 25%', points: 4 },
    ],
  },
  {
    id: 'goal',
    kind: 'tolerance',
    text: 'Какая цель для тебя важнее всего?',
    hint: 'Цель определяет, какие колебания стоимости портфеля для тебя приемлемы.',
    options: [
      { label: 'Не потерять деньги', points: 1 },
      { label: 'Обогнать инфляцию', points: 2 },
      { label: 'Стабильно приумножать', points: 3 },
      { label: 'Максимальный рост, даже с риском', points: 4 },
    ],
  },
  {
    id: 'drop',
    kind: 'tolerance',
    text: 'Портфель за месяц упал на 20%. Что ты сделаешь?',
    hint: 'Падения рынка на 20% и больше случаются раз в несколько лет. Важно заранее знать свою реакцию.',
    options: [
      { label: 'Продам всё, пока не стало хуже', points: 1 },
      { label: 'Продам часть', points: 2 },
      { label: 'Ничего не буду делать', points: 3 },
      { label: 'Докуплю — подешевело!', points: 4 },
    ],
  },
  {
    id: 'bet',
    kind: 'tolerance',
    text: 'Какой исход за год ты выберешь?',
    hint: 'Чем шире разброс возможных результатов, тем выше риск.',
    options: [
      { label: 'Гарантированные +4%', points: 1 },
      { label: 'От −5% до +12%', points: 2 },
      { label: 'От −15% до +25%', points: 3 },
      { label: 'От −30% до +50%', points: 4 },
    ],
  },
  {
    id: 'experience',
    kind: 'tolerance',
    text: 'Какой у тебя опыт инвестирования?',
    hint: 'На практике просадки переносятся тяжелее, чем кажется на бумаге. Опыт это показывает.',
    options: [
      { label: 'Только депозиты и наличные', points: 1 },
      { label: 'Пробовал(а) немного', points: 2 },
      { label: 'Несколько лет, переживал(а) просадки', points: 3 },
      { label: 'Опытный инвестор', points: 4 },
    ],
  },
];
