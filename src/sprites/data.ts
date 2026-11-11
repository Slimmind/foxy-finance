export type Grid = readonly string[];
export type Palette = Record<string, string>;

export const COLORS = {
  ink: '#2b1a14',
  orange: '#ff8c1a',
  cream: '#fff4e0',
  gold: '#ffd23f',
  night: '#1b1230',
};

export const FOX_PALETTE: Palette = { K: COLORS.ink, O: COLORS.orange, W: COLORS.cream };

const FOX_BASE: string[] = [
  '................',
  '..KK........KK..',
  '.KOOK......KOOK.',
  '.KOOOK....KOOOK.',
  '.KOWOOKKKKOOWOK.',
  'KOOOOOOOOOOOOOOK',
  'KOOKKOOOOOOKKOOK',
  'KOOKKOOOOOOKKOOK',
  'KOOOOOOOOOOOOOOK',
  'KWOOOOOOOOOOOOWK',
  'KWWWOOOOOOOOWWWK',
  '.KWWWWWKKWWWWWK.',
  '..KWWWWWWWWWWK..',
  '...KKWWWWWWKK...',
  '.....KKKKKK.....',
  '................',
];

export type FoxMood = 'idle' | 'blink' | 'happy';

const EYES: Record<FoxMood, [string, string]> = {
  idle: ['KOOKKOOOOOOKKOOK', 'KOOKKOOOOOOKKOOK'],
  blink: ['KOOOOOOOOOOOOOOK', 'KOOKKOOOOOOKKOOK'],
  happy: ['KOOOKOOOOOOKOOOK', 'KOOKOKOOOOKOKOOK'],
};

export function foxGrid(mood: FoxMood = 'idle'): Grid {
  const g = [...FOX_BASE];
  [g[6], g[7]] = EYES[mood];
  return g;
}

export const COIN_PALETTE: Palette = { K: COLORS.ink, Y: COLORS.gold, W: COLORS.cream, D: '#e0a21a' };

export const COIN: Grid = [
  '..KKKK..',
  '.KYYYYK.',
  'KYWWYYDK',
  'KYWYYYDK',
  'KYYYYYDK',
  'KYYYYDDK',
  '.KDDDDK.',
  '..KKKK..',
];

export const HEART_PALETTE: Palette = { K: COLORS.ink, R: '#ff4d6d', W: '#ffd0d9' };
export const HEART: Grid = [
  '.KK..KK.',
  'KRWRKRRK',
  'KRRRRRRK',
  'KRRRRRRK',
  '.KRRRRK.',
  '..KRRK..',
  '...KK...',
  '........',
];

export interface Rect {
  x: number;
  y: number;
  w: number;
  color: string;
}

/** Merges horizontal runs of identical colour — keeps the SVG small. */
export function gridToRects(grid: Grid, palette: Palette): Rect[] {
  const rects: Rect[] = [];
  grid.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const color = palette[row[x]];
      if (!color) {
        x++;
        continue;
      }
      let w = 1;
      while (x + w < row.length && row[x + w] === row[x]) w++;
      rects.push({ x, y, w, color });
      x += w;
    }
  });
  return rects;
}
