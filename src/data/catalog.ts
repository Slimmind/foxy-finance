import type { AssetClass, Market } from './etfs';

export type CategoryId =
  | 'world'
  | 'usa'
  | 'tech'
  | 'dividend'
  | 'exus'
  | 'em'
  | 'small'
  | 'reit'
  | 'bonds'
  | 'bonds-long'
  | 'bonds-short'
  | 'bonds-corp'
  | 'bonds-hy'
  | 'bonds-infl'
  | 'cash'
  | 'gold';

export interface Category {
  id: CategoryId;
  title: string;
  /** Short label for filter chips. */
  short: string;
  assetClass: AssetClass;
  /** 1 (calm) .. 5 (very volatile) */
  riskLevel: 1 | 2 | 3 | 4 | 5;
  color: string;
  about: string;
  /** What this kind of fund is usually considered for. */
  fits: string;
  risks: string;
  /** Illustrative annual return scenarios, % — not a forecast. */
  returns: { low: number; base: number; high: number };
  /** Illustrative deep-drawdown estimate, %. */
  drawdown: number;
}

export const CATEGORIES: Record<CategoryId, Category> = {
  world: {
    id: 'world',
    title: 'Акции: весь мир',
    short: 'Весь мир',
    assetClass: 'equity',
    riskLevel: 4,
    color: '#4cc9f0',
    about: 'Фонды на широкий индекс мировых акций: компании десятков стран в одном тикере.',
    fits: 'Часто используют как основу акционной части портфеля: не нужно самому выбирать страны и отрасли.',
    risks:
      'Акции могут падать на 30–50% и долго восстанавливаться. По весу в индексе преобладают США (больше половины), поэтому «весь мир» не означает равные доли стран.',
    returns: { low: -4, base: 8, high: 14 },
    drawdown: 50,
  },
  usa: {
    id: 'usa',
    title: 'Акции: США',
    short: 'США',
    assetClass: 'equity',
    riskLevel: 4,
    color: '#5a7bff',
    about: 'Индексы крупных американских компаний, например S&P 500, или весь рынок США.',
    fits: 'Рассматривают, когда хотят сделать ставку именно на американский рынок, который составляет большую часть мирового.',
    risks:
      'Концентрация в одной стране и нескольких крупнейших компаниях. Для тех, чьи расходы не в долларах, добавляется валютный риск. Прошлая доходность США не гарантирует будущую.',
    returns: { low: -4, base: 9, high: 15 },
    drawdown: 52,
  },
  tech: {
    id: 'tech',
    title: 'Технологии и рост',
    short: 'Технологии',
    assetClass: 'equity',
    riskLevel: 5,
    color: '#c77dff',
    about: 'Фонды на технологический сектор или компании роста: Nasdaq-100, IT-сектор, growth-индексы.',
    fits: 'Обычно рассматривают как небольшую тематическую добавку к широкому рынку, если готов к сильным колебаниям.',
    risks:
      'Узкая отрасль и высокие оценки компаний: в падениях 2000–2002 и 2022 годов такие индексы теряли заметно больше широкого рынка. Сильно пересекаются с фондами США и «весь мир».',
    returns: { low: -8, base: 10, high: 18 },
    drawdown: 60,
  },
  dividend: {
    id: 'dividend',
    title: 'Дивидендные акции',
    short: 'Дивиденды',
    assetClass: 'equity',
    riskLevel: 4,
    color: '#2ec4b6',
    about: 'Акции компаний, которые стабильно платят дивиденды или увеличивают их.',
    fits: 'Рассматривают ради регулярных выплат и более «зрелого» состава компаний.',
    risks:
      'Это тоже акции, просадки возможны. Дивиденды не гарантированы и могут быть сокращены. Состав смещён в отдельные отрасли. Налогообложение выплат зависит от страны и типа фонда.',
    returns: { low: -3, base: 7, high: 12 },
    drawdown: 40,
  },
  exus: {
    id: 'exus',
    title: 'Акции: мир без США',
    short: 'Мир без США',
    assetClass: 'equity',
    riskLevel: 4,
    color: '#b8c0ff',
    about: 'Акции развитых и развивающихся стран, кроме США.',
    fits: 'Рассматривают как дополнение к фонду США, чтобы получить остальной мир.',
    risks: 'Валютные колебания и периоды отставания от американского рынка. Пересекается с фондами «весь мир».',
    returns: { low: -4, base: 7, high: 13 },
    drawdown: 50,
  },
  em: {
    id: 'em',
    title: 'Развивающиеся рынки',
    short: 'Развивающиеся',
    assetClass: 'equity',
    riskLevel: 5,
    color: '#ff4d6d',
    about: 'Акции компаний из развивающихся стран: Китай, Индия, Тайвань, Бразилия и др.',
    fits: 'Рассматривают как небольшую долю для диверсификации и ставки на рост этих экономик.',
    risks:
      'Высокая волатильность, политические и регуляторные риски, зависимость от нескольких стран (особенно Китая), возможные ограничения и санкции.',
    returns: { low: -6, base: 8, high: 16 },
    drawdown: 55,
  },
  small: {
    id: 'small',
    title: 'Малые компании',
    short: 'Малые компании',
    assetClass: 'equity',
    riskLevel: 5,
    color: '#e9c46a',
    about: 'Акции компаний небольшой капитализации.',
    fits: 'Рассматривают как дополнение к крупным компаниям, делая ставку на премию за размер.',
    risks: 'Колеблются сильнее и менее ликвидны, чем крупные компании. Бывают длительные периоды отставания.',
    returns: { low: -6, base: 9, high: 16 },
    drawdown: 55,
  },
  reit: {
    id: 'reit',
    title: 'Недвижимость (REIT)',
    short: 'Недвижимость',
    assetClass: 'equity',
    riskLevel: 4,
    color: '#ff9ecb',
    about: 'Компании, владеющие коммерческой недвижимостью: торговой, складской, офисной, жилой.',
    fits: 'Рассматривают как доступ к недвижимости без покупки объектов и как источник выплат.',
    risks:
      'Чувствительны к процентным ставкам и сильно падают в кризисы. Налогообложение выплат зависит от страны и типа фонда.',
    returns: { low: -5, base: 7, high: 14 },
    drawdown: 55,
  },
  bonds: {
    id: 'bonds',
    title: 'Облигации: широкий рынок',
    short: 'Облигации',
    assetClass: 'bonds',
    riskLevel: 2,
    color: '#4be37a',
    about: 'Диверсифицированный набор государственных и корпоративных облигаций высокого качества.',
    fits: 'Рассматривают как стабилизирующую часть портфеля: колебания обычно меньше, чем у акций.',
    risks:
      'Цены падают при росте процентных ставок: в 2022 году широкие индексы потеряли около 13%. Доходность ограничена, инфляция может её съедать.',
    returns: { low: -1, base: 3.5, high: 6 },
    drawdown: 17,
  },
  'bonds-long': {
    id: 'bonds-long',
    title: 'Длинные гособлигации',
    short: 'Длинные гос.',
    assetClass: 'bonds',
    riskLevel: 3,
    color: '#06d6a0',
    about: 'Государственные облигации со сроком погашения 20 лет и больше.',
    fits: 'Иногда рассматривают как противовес акциям на случай рецессии.',
    risks:
      'Самая высокая чувствительность к ставкам: в 2020–2023 годах такие фонды теряли около половины стоимости.',
    returns: { low: -4, base: 3.5, high: 8 },
    drawdown: 45,
  },
  'bonds-short': {
    id: 'bonds-short',
    title: 'Короткие гособлигации',
    short: 'Короткие гос.',
    assetClass: 'bonds',
    riskLevel: 1,
    color: '#80ed99',
    about: 'Государственные облигации со сроком до погашения 1–3 года.',
    fits: 'Рассматривают как консервативную часть: колебания небольшие, доходность близка к ставкам денежного рынка.',
    risks: 'Доходность следует за ставками и может снижаться. Инфляцию обгоняет не всегда.',
    returns: { low: 1, base: 3, high: 4.5 },
    drawdown: 4,
  },
  'bonds-corp': {
    id: 'bonds-corp',
    title: 'Корпоративные облигации',
    short: 'Корпоративные',
    assetClass: 'bonds',
    riskLevel: 2,
    color: '#52b788',
    about: 'Облигации компаний с инвестиционным кредитным рейтингом.',
    fits: 'Рассматривают ради доходности выше, чем у государственных облигаций, за дополнительный кредитный риск.',
    risks:
      'Риск дефолтов и расширения спредов в кризисы. Чувствительны к ставкам. В кризисы ведут себя ближе к акциям, чем гособлигации.',
    returns: { low: -1.5, base: 4.5, high: 7 },
    drawdown: 22,
  },
  'bonds-hy': {
    id: 'bonds-hy',
    title: 'Высокодоходные облигации',
    short: 'Высокодоходные',
    assetClass: 'bonds',
    riskLevel: 3,
    color: '#95d5b2',
    about: 'Облигации компаний с рейтингом ниже инвестиционного.',
    fits: 'Рассматривают ради повышенного купона.',
    risks: 'Высокий кредитный риск, просадки на 20–30% в кризисы, сильная связь с поведением акций.',
    returns: { low: -3, base: 6, high: 9 },
    drawdown: 30,
  },
  'bonds-infl': {
    id: 'bonds-infl',
    title: 'Инфляционные облигации',
    short: 'Инфляционные',
    assetClass: 'bonds',
    riskLevel: 2,
    color: '#b7e4c7',
    about: 'Облигации с индексацией номинала на инфляцию (TIPS и аналоги).',
    fits: 'Рассматривают как защиту покупательной способности на случай неожиданной инфляции.',
    risks: 'Чувствительны к реальным ставкам: в 2022 году такие фонды теряли в цене. При низкой инфляции доход небольшой.',
    returns: { low: -1, base: 3.5, high: 6 },
    drawdown: 15,
  },
  cash: {
    id: 'cash',
    title: 'Денежный рынок',
    short: 'Кэш',
    assetClass: 'cash',
    riskLevel: 1,
    color: '#9aa5c4',
    about: 'Очень короткие государственные облигации или овернайт-ставка: доходность следует за ключевыми ставками.',
    fits: 'Рассматривают как место для временно свободных денег внутри портфеля и для краткосрочных целей.',
    risks: 'Доходность падает вместе со ставками и не защищает от инфляции. Не заменяет банковский вклад по гарантиям.',
    returns: { low: 1.5, base: 3, high: 4.5 },
    drawdown: 1,
  },
  gold: {
    id: 'gold',
    title: 'Золото',
    short: 'Золото',
    assetClass: 'gold',
    riskLevel: 3,
    color: '#ffd23f',
    about: 'Фонды, обеспеченные физическим золотом.',
    fits: 'Рассматривают как диверсификатор: исторически слабо связано с акциями, используется как защита от инфляции и кризисов.',
    risks:
      'Не приносит дивидендов и процентов. Цена бывает волатильной и десятилетиями может не расти (1980–2000). Часть продуктов — ETC, а не ETF.',
    returns: { low: -4, base: 4, high: 10 },
    drawdown: 45,
  },
};

export const CATEGORY_ORDER: CategoryId[] = [
  'world',
  'usa',
  'tech',
  'dividend',
  'exus',
  'em',
  'small',
  'reit',
  'bonds',
  'bonds-long',
  'bonds-short',
  'bonds-corp',
  'bonds-hy',
  'bonds-infl',
  'cash',
  'gold',
];

export interface Fund {
  /** `${market}:${ticker}` in lower case — unique across markets. */
  id: string;
  market: Market;
  ticker: string;
  name: string;
  issuer: string;
  /** Total expense ratio, % per year. Approximate. */
  ter: number;
  isin?: string;
  category: CategoryId;
  index: string;
  /** Rough size of the portfolio, e.g. "около 3 700 компаний". */
  holdings: string;
  /** Accumulating funds reinvest income; distributing funds pay it out. */
  distribution: 'acc' | 'dist';
  currency: 'USD' | 'EUR';
  summary: string;
  note?: string;
  /** Last day the ticker/ISIN were checked against OpenFIGI (YYYY-MM-DD). */
  idsChecked?: string;
  /** Last day the fee and facts were checked against the issuer's documents. Unset means not checked. */
  factsChecked?: string;
  /** Official page or KID where the fee and facts can be checked. */
  sourceUrl?: string;
}

type FundInput = Omit<Fund, 'id' | 'market' | 'idsChecked'>;

/** Every identifier below was cross-checked with OpenFIGI on this day (see scripts/check-catalog.ts). */
const IDS_CHECKED = '2026-11-12';

/** Official pages confirmed to exist for the fund (not guessed). */
const SOURCES: Record<string, string> = {
  'us:voo': 'https://investor.vanguard.com/investment-products/etfs/profile/voo',
  'ucits:iwda': 'https://www.ishares.com/uk/individual/en/products/251882/ishares-msci-world-ucits-etf-acc-fund',
  'ucits:ibts': 'https://www.ishares.com/uk/individual/en/products/251715',
  'ucits:vuaa': 'https://fund-docs.vanguard.com/ie00bfmxxd54-en.pdf',
};

const make = (market: Market, list: FundInput[]): Fund[] =>
  list.map((f) => {
    const id = `${market}:${f.ticker.toLowerCase()}`;
    return { ...f, market, id, idsChecked: IDS_CHECKED, sourceUrl: f.sourceUrl ?? SOURCES[id] };
  });

const US: FundInput[] = [
  {
    ticker: 'VT',
    name: 'Vanguard Total World Stock ETF',
    issuer: 'Vanguard',
    ter: 0.06,
    category: 'world',
    index: 'FTSE Global All Cap',
    holdings: 'около 9 000 компаний',
    distribution: 'dist',
    currency: 'USD',
    summary: 'Одним фондом покрывает акции развитых и развивающихся стран, включая малые компании.',
    note: 'Доля США в индексе порядка 60%.',
  },
  {
    ticker: 'ACWI',
    name: 'iShares MSCI ACWI ETF',
    issuer: 'iShares (BlackRock)',
    ter: 0.32,
    category: 'world',
    index: 'MSCI ACWI',
    holdings: 'около 2 300 компаний',
    distribution: 'dist',
    currency: 'USD',
    summary: 'Крупные и средние компании 23 развитых и 24 развивающихся стран.',
    note: 'Охват похож на VT, но комиссия выше, и малые компании в индекс не входят.',
  },
  {
    ticker: 'VOO',
    name: 'Vanguard S&P 500 ETF',
    issuer: 'Vanguard',
    ter: 0.03,
    category: 'usa',
    index: 'S&P 500',
    holdings: '500 компаний',
    distribution: 'dist',
    currency: 'USD',
    summary: '500 крупнейших публичных компаний США, около 80% капитализации американского рынка акций.',
    note: 'Заметный вес нескольких крупнейших технологических компаний.',
  },
  {
    ticker: 'VTI',
    name: 'Vanguard Total Stock Market ETF',
    issuer: 'Vanguard',
    ter: 0.03,
    category: 'usa',
    index: 'CRSP US Total Market',
    holdings: 'около 3 600 компаний',
    distribution: 'dist',
    currency: 'USD',
    summary: 'Весь американский рынок акций: от крупных до малых компаний.',
  },
  {
    ticker: 'QQQM',
    name: 'Invesco NASDAQ 100 ETF',
    issuer: 'Invesco',
    ter: 0.15,
    category: 'tech',
    index: 'Nasdaq-100',
    holdings: '100 компаний',
    distribution: 'dist',
    currency: 'USD',
    summary: '100 крупнейших нефинансовых компаний биржи Nasdaq с сильным перекосом в технологии.',
    note: 'Отслеживает тот же индекс, что и QQQ, с меньшей комиссией.',
  },
  {
    ticker: 'VUG',
    name: 'Vanguard Growth ETF',
    issuer: 'Vanguard',
    ter: 0.04,
    category: 'tech',
    index: 'CRSP US Large Cap Growth',
    holdings: 'около 160 компаний',
    distribution: 'dist',
    currency: 'USD',
    summary: 'Крупные американские компании роста с большой долей технологий.',
  },
  {
    ticker: 'VGT',
    name: 'Vanguard Information Technology ETF',
    issuer: 'Vanguard',
    ter: 0.09,
    category: 'tech',
    index: 'MSCI US IMI Information Technology 25/50',
    holdings: 'около 320 компаний',
    distribution: 'dist',
    currency: 'USD',
    summary: 'Американские IT-компании: полупроводники, программное обеспечение, оборудование.',
    note: 'Ставка на одну отрасль в одной стране.',
  },
  {
    ticker: 'SCHD',
    name: 'Schwab U.S. Dividend Equity ETF',
    issuer: 'Charles Schwab',
    ter: 0.06,
    category: 'dividend',
    index: 'Dow Jones U.S. Dividend 100',
    holdings: '100 компаний',
    distribution: 'dist',
    currency: 'USD',
    summary: 'Американские компании с длинной историей выплаты дивидендов, отобранные по качеству и доходности.',
  },
  {
    ticker: 'VEA',
    name: 'Vanguard FTSE Developed Markets ETF',
    issuer: 'Vanguard',
    ter: 0.05,
    category: 'exus',
    index: 'FTSE Developed All Cap ex US',
    holdings: 'около 3 900 компаний',
    distribution: 'dist',
    currency: 'USD',
    summary: 'Акции развитых стран без США: Европа, Япония, Канада, Австралия и др.',
  },
  {
    ticker: 'VXUS',
    name: 'Vanguard Total International Stock ETF',
    issuer: 'Vanguard',
    ter: 0.05,
    category: 'exus',
    index: 'FTSE Global All Cap ex US',
    holdings: 'около 8 500 компаний',
    distribution: 'dist',
    currency: 'USD',
    summary: 'Весь мир без США: развитые и развивающиеся рынки, включая малые компании.',
  },
  {
    ticker: 'VWO',
    name: 'Vanguard FTSE Emerging Markets ETF',
    issuer: 'Vanguard',
    ter: 0.08,
    category: 'em',
    index: 'FTSE Emerging Markets All Cap China A Inclusion',
    holdings: 'около 5 800 компаний',
    distribution: 'dist',
    currency: 'USD',
    summary: 'Акции развивающихся стран: Китай, Индия, Тайвань, Бразилия и др.',
  },
  {
    ticker: 'IEMG',
    name: 'iShares Core MSCI Emerging Markets ETF',
    issuer: 'iShares (BlackRock)',
    ter: 0.09,
    category: 'em',
    index: 'MSCI Emerging Markets IMI',
    holdings: 'около 2 700 компаний',
    distribution: 'dist',
    currency: 'USD',
    summary: 'Крупные, средние и малые компании развивающихся стран.',
  },
  {
    ticker: 'VB',
    name: 'Vanguard Small-Cap ETF',
    issuer: 'Vanguard',
    ter: 0.05,
    category: 'small',
    index: 'CRSP US Small Cap',
    holdings: 'около 1 400 компаний',
    distribution: 'dist',
    currency: 'USD',
    summary: 'Американские компании малой капитализации.',
  },
  {
    ticker: 'VNQ',
    name: 'Vanguard Real Estate ETF',
    issuer: 'Vanguard',
    ter: 0.13,
    category: 'reit',
    index: 'MSCI US IMI Real Estate 25/50',
    holdings: 'около 150 компаний',
    distribution: 'dist',
    currency: 'USD',
    summary: 'Американские REIT: торговая, складская, офисная, жилая недвижимость и телекоммуникационные объекты.',
  },
  {
    ticker: 'BND',
    name: 'Vanguard Total Bond Market ETF',
    issuer: 'Vanguard',
    ter: 0.03,
    category: 'bonds',
    index: 'Bloomberg U.S. Aggregate Float Adjusted',
    holdings: 'около 11 000 облигаций',
    distribution: 'dist',
    currency: 'USD',
    summary: 'Широкий рынок облигаций США: государственные, ипотечные и корпоративные бумаги высокого качества.',
  },
  {
    ticker: 'BNDX',
    name: 'Vanguard Total International Bond ETF',
    issuer: 'Vanguard',
    ter: 0.07,
    category: 'bonds',
    index: 'Bloomberg Global Aggregate ex-USD Float Adjusted (USD Hedged)',
    holdings: 'около 7 000 облигаций',
    distribution: 'dist',
    currency: 'USD',
    summary: 'Облигации развитых стран вне США с хеджированием валют в доллар.',
    note: 'Хеджирование убирает большую часть валютных колебаний, но само стоит денег.',
  },
  {
    ticker: 'TLT',
    name: 'iShares 20+ Year Treasury Bond ETF',
    issuer: 'iShares (BlackRock)',
    ter: 0.15,
    category: 'bonds-long',
    index: 'ICE US Treasury 20+ Year',
    holdings: 'около 40 выпусков',
    distribution: 'dist',
    currency: 'USD',
    summary: 'Долгосрочные казначейские облигации США со сроком больше 20 лет.',
  },
  {
    ticker: 'SHY',
    name: 'iShares 1-3 Year Treasury Bond ETF',
    issuer: 'iShares (BlackRock)',
    ter: 0.15,
    category: 'bonds-short',
    index: 'ICE US Treasury 1-3 Year',
    holdings: 'около 90 выпусков',
    distribution: 'dist',
    currency: 'USD',
    summary: 'Казначейские облигации США со сроком до погашения 1–3 года.',
  },
  {
    ticker: 'LQD',
    name: 'iShares iBoxx $ Investment Grade Corporate Bond ETF',
    issuer: 'iShares (BlackRock)',
    ter: 0.14,
    category: 'bonds-corp',
    index: 'Markit iBoxx USD Liquid Investment Grade',
    holdings: 'около 2 800 облигаций',
    distribution: 'dist',
    currency: 'USD',
    summary: 'Долларовые облигации американских компаний с инвестиционным рейтингом.',
  },
  {
    ticker: 'HYG',
    name: 'iShares iBoxx $ High Yield Corporate Bond ETF',
    issuer: 'iShares (BlackRock)',
    ter: 0.49,
    category: 'bonds-hy',
    index: 'Markit iBoxx USD Liquid High Yield',
    holdings: 'около 1 200 облигаций',
    distribution: 'dist',
    currency: 'USD',
    summary: 'Долларовые облигации компаний с рейтингом ниже инвестиционного.',
  },
  {
    ticker: 'TIP',
    name: 'iShares TIPS Bond ETF',
    issuer: 'iShares (BlackRock)',
    ter: 0.18,
    category: 'bonds-infl',
    index: 'ICE US Treasury Inflation Linked Bond',
    holdings: 'около 50 выпусков',
    distribution: 'dist',
    currency: 'USD',
    summary: 'Казначейские облигации США с индексацией на инфляцию (TIPS).',
  },
  {
    ticker: 'SGOV',
    name: 'iShares 0-3 Month Treasury Bond ETF',
    issuer: 'iShares (BlackRock)',
    ter: 0.09,
    category: 'cash',
    index: 'ICE 0-3 Month US Treasury Securities',
    holdings: 'казначейские векселя США',
    distribution: 'dist',
    currency: 'USD',
    summary: 'Казначейские векселя США сроком до 3 месяцев, аналог денежного рынка.',
  },
  {
    ticker: 'GLDM',
    name: 'SPDR Gold MiniShares Trust',
    issuer: 'State Street (SPDR)',
    ter: 0.1,
    category: 'gold',
    index: 'LBMA Gold Price PM',
    holdings: 'физическое золото',
    distribution: 'dist',
    currency: 'USD',
    summary: 'Фонд, обеспеченный физическим золотом в хранилищах.',
    note: 'Налоговый режим золотых фондов может отличаться от акционных.',
  },
  {
    ticker: 'IAU',
    name: 'iShares Gold Trust',
    issuer: 'iShares (BlackRock)',
    ter: 0.25,
    category: 'gold',
    index: 'LBMA Gold Price',
    holdings: 'физическое золото',
    distribution: 'dist',
    currency: 'USD',
    summary: 'Фонд, обеспеченный физическим золотом.',
    note: 'Комиссия выше, чем у GLDM, при той же базовой идее.',
  },
];

const UCITS: FundInput[] = [
  {
    ticker: 'VWCE',
    name: 'Vanguard FTSE All-World UCITS ETF (USD) Accumulating',
    issuer: 'Vanguard',
    ter: 0.22,
    isin: 'IE00BK5BQT80',
    category: 'world',
    index: 'FTSE All-World',
    holdings: 'около 3 700 компаний',
    distribution: 'acc',
    currency: 'USD',
    summary: 'Крупные и средние компании развитых и развивающихся стран одним фондом.',
    note: 'Доступен на нескольких европейских биржах, тикер зависит от площадки.',
  },
  {
    ticker: 'IWDA',
    name: 'iShares Core MSCI World UCITS ETF USD (Acc)',
    issuer: 'iShares (BlackRock)',
    ter: 0.2,
    isin: 'IE00B4L5Y983',
    category: 'world',
    index: 'MSCI World',
    holdings: 'около 1 400 компаний',
    distribution: 'acc',
    currency: 'USD',
    summary: 'Крупные и средние компании только развитых стран. Развивающиеся рынки не входят.',
    note: 'Для охвата развивающихся рынков нужен отдельный фонд, например EIMI.',
  },
  {
    ticker: 'CSPX',
    name: 'iShares Core S&P 500 UCITS ETF USD (Acc)',
    issuer: 'iShares (BlackRock)',
    ter: 0.07,
    isin: 'IE00B5BMR087',
    category: 'usa',
    index: 'S&P 500',
    holdings: '500 компаний',
    distribution: 'acc',
    currency: 'USD',
    summary: '500 крупнейших публичных компаний США, накопительный фонд.',
    note: 'На биржах Германии торгуется под тикером SXR8.',
  },
  {
    ticker: 'VUAA',
    name: 'Vanguard S&P 500 UCITS ETF (USD) Accumulating',
    issuer: 'Vanguard',
    ter: 0.07,
    isin: 'IE00BFMXXD54',
    category: 'usa',
    index: 'S&P 500',
    holdings: '500 компаний',
    distribution: 'acc',
    currency: 'USD',
    summary: '500 крупнейших публичных компаний США, накопительный фонд.',
    note: 'Накопительный аналог VUSA.',
  },
  {
    ticker: 'VUSA',
    name: 'Vanguard S&P 500 UCITS ETF (USD) Distributing',
    issuer: 'Vanguard',
    ter: 0.07,
    isin: 'IE00B3XXRP09',
    category: 'usa',
    index: 'S&P 500',
    holdings: '500 компаний',
    distribution: 'dist',
    currency: 'USD',
    summary: '500 крупнейших публичных компаний США, выплачивает дивиденды.',
    note: 'Выплаты обычно раз в квартал.',
  },
  {
    ticker: 'CNDX',
    name: 'iShares Nasdaq 100 UCITS ETF USD (Acc)',
    issuer: 'iShares (BlackRock)',
    ter: 0.33,
    isin: 'IE00B53SZB19',
    category: 'tech',
    index: 'Nasdaq-100',
    holdings: '100 компаний',
    distribution: 'acc',
    currency: 'USD',
    summary: '100 крупнейших нефинансовых компаний биржи Nasdaq с сильным перекосом в технологии.',
    note: 'На биржах Германии торгуется под тикером SXRV.',
  },
  {
    ticker: 'XDWT',
    name: 'Xtrackers MSCI World Information Technology UCITS ETF 1C',
    issuer: 'Xtrackers (DWS)',
    ter: 0.25,
    isin: 'IE00BM67HT60',
    category: 'tech',
    index: 'MSCI World Information Technology 20/35 Capped',
    holdings: 'более 100 компаний',
    distribution: 'acc',
    currency: 'USD',
    summary: 'IT-компании развитых стран, преимущественно американские.',
    note: 'Ставка на одну отрасль.',
  },
  {
    ticker: 'VHYL',
    name: 'Vanguard FTSE All-World High Dividend Yield UCITS ETF (USD) Distributing',
    issuer: 'Vanguard',
    ter: 0.29,
    isin: 'IE00B8GKDB10',
    category: 'dividend',
    index: 'FTSE All-World High Dividend Yield',
    holdings: 'около 1 800 компаний',
    distribution: 'dist',
    currency: 'USD',
    summary: 'Компании мира с повышенной дивидендной доходностью.',
  },
  {
    ticker: 'EIMI',
    name: 'iShares Core MSCI EM IMI UCITS ETF USD (Acc)',
    issuer: 'iShares (BlackRock)',
    ter: 0.18,
    isin: 'IE00BKM4GZ66',
    category: 'em',
    index: 'MSCI Emerging Markets IMI',
    holdings: 'около 3 000 компаний',
    distribution: 'acc',
    currency: 'USD',
    summary: 'Крупные, средние и малые компании развивающихся стран.',
  },
  {
    ticker: 'WSML',
    name: 'iShares MSCI World Small Cap UCITS ETF USD (Acc)',
    issuer: 'iShares (BlackRock)',
    ter: 0.35,
    isin: 'IE00BF4RFH31',
    category: 'small',
    index: 'MSCI World Small Cap',
    holdings: 'около 3 300 компаний',
    distribution: 'acc',
    currency: 'USD',
    summary: 'Компании малой капитализации развитых стран.',
  },
  {
    ticker: 'IWDP',
    name: 'iShares Developed Markets Property Yield UCITS ETF USD (Dist)',
    issuer: 'iShares (BlackRock)',
    ter: 0.59,
    isin: 'IE00B1FZS350',
    category: 'reit',
    index: 'FTSE EPRA Nareit Developed Dividend+',
    holdings: 'около 300 компаний',
    distribution: 'dist',
    currency: 'USD',
    summary: 'Компании недвижимости развитых стран с выплатой дивидендов.',
  },
  {
    ticker: 'AGGH',
    name: 'iShares Core Global Aggregate Bond UCITS ETF EUR Hedged (Acc)',
    issuer: 'iShares (BlackRock)',
    ter: 0.1,
    isin: 'IE00BDBRDM35',
    category: 'bonds',
    index: 'Bloomberg Global Aggregate (EUR Hedged)',
    holdings: 'около 10 000 облигаций',
    distribution: 'acc',
    currency: 'EUR',
    summary: 'Мировой рынок облигаций высокого качества с хеджированием валют в евро.',
  },
  {
    ticker: 'IEAC',
    name: 'iShares Core € Corp Bond UCITS ETF EUR (Dist)',
    issuer: 'iShares (BlackRock)',
    ter: 0.2,
    isin: 'IE00B3F81R35',
    category: 'bonds-corp',
    index: 'Bloomberg Euro Corporate Bond',
    holdings: 'более 2 000 облигаций',
    distribution: 'dist',
    currency: 'EUR',
    summary: 'Корпоративные облигации в евро с инвестиционным рейтингом.',
  },
  {
    ticker: 'IBTS',
    name: 'iShares $ Treasury Bond 1-3yr UCITS ETF USD (Dist)',
    issuer: 'iShares (BlackRock)',
    ter: 0.07,
    isin: 'IE00B14X4S71',
    category: 'bonds-short',
    index: 'ICE US Treasury 1-3 Year',
    holdings: 'около 90 выпусков',
    distribution: 'dist',
    currency: 'USD',
    summary: 'Казначейские облигации США со сроком до погашения 1–3 года.',
  },
  {
    ticker: 'IBCI',
    name: 'iShares € Inflation Linked Govt Bond UCITS ETF EUR (Dist)',
    issuer: 'iShares (BlackRock)',
    ter: 0.25,
    isin: 'IE00B0M62X26',
    category: 'bonds-infl',
    index: 'Bloomberg Euro Government Inflation-Linked Bond',
    holdings: 'около 100 выпусков',
    distribution: 'dist',
    currency: 'EUR',
    summary: 'Государственные облигации еврозоны с индексацией на инфляцию.',
  },
  {
    ticker: 'IHYG',
    name: 'iShares € High Yield Corp Bond UCITS ETF EUR (Dist)',
    issuer: 'iShares (BlackRock)',
    ter: 0.5,
    isin: 'IE00B66F4759',
    category: 'bonds-hy',
    index: 'Markit iBoxx EUR Liquid High Yield',
    holdings: 'около 500 облигаций',
    distribution: 'dist',
    currency: 'EUR',
    summary: 'Корпоративные облигации в евро с рейтингом ниже инвестиционного.',
  },
  {
    ticker: 'XEON',
    name: 'Xtrackers II EUR Overnight Rate Swap UCITS ETF 1C',
    issuer: 'Xtrackers (DWS)',
    ter: 0.1,
    isin: 'LU0290358497',
    category: 'cash',
    index: 'Овернайт-ставка евро (€STR)',
    holdings: 'своп-контракт и корзина ценных бумаг',
    distribution: 'acc',
    currency: 'EUR',
    summary: 'Доходность следует за овернайт-ставкой евро, аналог денежного рынка.',
    note: 'Использует своп: есть контрагентный риск, который смягчается обеспечением.',
  },
  {
    ticker: 'SGLN',
    name: 'iShares Physical Gold ETC',
    issuer: 'iShares (BlackRock)',
    ter: 0.12,
    isin: 'IE00B4ND3602',
    category: 'gold',
    index: 'LBMA Gold Price PM',
    holdings: 'физическое золото',
    distribution: 'acc',
    currency: 'USD',
    summary: 'Продукт, обеспеченный физическим золотом.',
    note: 'Это ETC (биржевой товар), а не ETF: юридическая структура и налогообложение могут отличаться.',
  },
];

export const FUNDS: Fund[] = [...make('us', US), ...make('ucits', UCITS)];

const BY_ID = new Map(FUNDS.map((f) => [f.id, f]));

export const fundById = (id: string): Fund | undefined => BY_ID.get(id);

export const fundsOf = (market: Market): Fund[] => FUNDS.filter((f) => f.market === market);

export interface FundLink {
  label: string;
  url: string;
}

/** Where a reader can verify the fund's fee and facts. */
export function fundLinks(f: Fund): FundLink[] {
  const links: FundLink[] = [];
  if (f.sourceUrl) {
    links.push({ label: f.sourceUrl.endsWith('.pdf') ? 'Документ KID эмитента' : 'Страница эмитента', url: f.sourceUrl });
  }
  if (f.isin) {
    links.push({ label: 'Карточка на justETF (сторонний справочник)', url: `https://www.justetf.com/en/etf-profile.html?isin=${f.isin}` });
  }
  return links;
}
