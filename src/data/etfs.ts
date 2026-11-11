export type SlotId = 'world' | 'sp500' | 'nasdaq' | 'em' | 'bonds' | 'cash' | 'gold' | 'reit';
export type Market = 'us' | 'ucits';
export type AssetClass = 'equity' | 'bonds' | 'cash' | 'gold';

export interface Etf {
  ticker: string;
  name: string;
  /** Total expense ratio, % per year. Approximate — check the issuer before buying. */
  ter: number;
  isin?: string;
}

export interface Slot {
  id: SlotId;
  title: string;
  assetClass: AssetClass;
  blurb: string;
  etf: Record<Market, Etf>;
}

export const SLOTS: Record<SlotId, Slot> = {
  world: {
    id: 'world',
    title: 'Весь мир',
    assetClass: 'equity',
    blurb: 'Тысячи компаний из десятков стран одним тикером — основа портфеля.',
    etf: {
      us: { ticker: 'VT', name: 'Vanguard Total World Stock', ter: 0.06 },
      ucits: { ticker: 'VWCE', name: 'Vanguard FTSE All-World UCITS Acc', ter: 0.22, isin: 'IE00BK5BQT80' },
    },
  },
  sp500: {
    id: 'sp500',
    title: 'США 500',
    assetClass: 'equity',
    blurb: '500 крупнейших компаний США. Классика индексного инвестирования.',
    etf: {
      us: { ticker: 'VOO', name: 'Vanguard S&P 500', ter: 0.03 },
      ucits: { ticker: 'CSPX', name: 'iShares Core S&P 500 UCITS Acc', ter: 0.07, isin: 'IE00B5BMR087' },
    },
  },
  nasdaq: {
    id: 'nasdaq',
    title: 'Технологии (Nasdaq)',
    assetClass: 'equity',
    blurb: 'Сто крупнейших нефинансовых компаний Nasdaq. Растёт быстро, падает глубоко.',
    etf: {
      us: { ticker: 'QQQM', name: 'Invesco Nasdaq 100', ter: 0.15 },
      ucits: { ticker: 'CNDX', name: 'iShares Nasdaq 100 UCITS Acc', ter: 0.33, isin: 'IE00B53SZB19' },
    },
  },
  em: {
    id: 'em',
    title: 'Развивающиеся рынки',
    assetClass: 'equity',
    blurb: 'Китай, Индия, Бразилия и другие. Выше потенциал и выше качели.',
    etf: {
      us: { ticker: 'VWO', name: 'Vanguard FTSE Emerging Markets', ter: 0.08 },
      ucits: { ticker: 'EIMI', name: 'iShares Core MSCI EM IMI UCITS Acc', ter: 0.18, isin: 'IE00BKM4GZ66' },
    },
  },
  reit: {
    id: 'reit',
    title: 'Недвижимость (REIT)',
    assetClass: 'equity',
    blurb: 'Торговые центры, офисы, склады — арендный доход без покупки квартиры.',
    etf: {
      us: { ticker: 'VNQ', name: 'Vanguard Real Estate', ter: 0.13 },
      ucits: { ticker: 'IWDP', name: 'iShares Developed Markets Property Yield UCITS', ter: 0.59, isin: 'IE00B1FZS350' },
    },
  },
  bonds: {
    id: 'bonds',
    title: 'Облигации',
    assetClass: 'bonds',
    blurb: 'Стабилизатор портфеля: меньше доходность, но и просадки мягче.',
    etf: {
      us: { ticker: 'BND', name: 'Vanguard Total Bond Market', ter: 0.03 },
      ucits: { ticker: 'AGGH', name: 'iShares Global Aggregate Bond UCITS EUR Hedged Acc', ter: 0.1, isin: 'IE00BDBRDM35' },
    },
  },
  cash: {
    id: 'cash',
    title: 'Кэш-эквивалент',
    assetClass: 'cash',
    blurb: 'Казначейские векселя / овернайт-ставка. «Подушка» внутри портфеля.',
    etf: {
      us: { ticker: 'SGOV', name: 'iShares 0-3 Month Treasury Bond', ter: 0.09 },
      ucits: { ticker: 'XEON', name: 'Xtrackers EUR Overnight Rate Swap UCITS', ter: 0.1, isin: 'LU0290358497' },
    },
  },
  gold: {
    id: 'gold',
    title: 'Золото',
    assetClass: 'gold',
    blurb: 'Страховка от инфляции и кризисов. Не приносит дивидендов, зато не коррелирует с акциями.',
    etf: {
      us: { ticker: 'GLDM', name: 'SPDR Gold MiniShares', ter: 0.1 },
      ucits: { ticker: 'SGLN', name: 'iShares Physical Gold ETC', ter: 0.12, isin: 'IE00B4ND3602' },
    },
  },
};

export const MARKETS: Record<Market, { title: string; hint: string }> = {
  us: { title: 'США', hint: 'ETF американских эмитентов (VT, VOO…). Для брокеров с доступом к US-рынку.' },
  ucits: { title: 'Европа (UCITS)', hint: 'Европейские аналоги (VWCE, CSPX…). Нужны, если US-ETF вам недоступны.' },
};

export const SLOT_COLORS: Record<SlotId, string> = {
  world: '#4cc9f0',
  sp500: '#5a7bff',
  nasdaq: '#c77dff',
  em: '#ff4d6d',
  reit: '#ff9ecb',
  bonds: '#4be37a',
  cash: '#9aa5c4',
  gold: '#ffd23f',
};
