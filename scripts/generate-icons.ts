import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { COLORS, FOX_PALETTE, foxGrid, gridToRects } from '../src/sprites/data';

const PUBLIC = resolve(import.meta.dirname, '../public');

const hex = (c: string): [number, number, number] => [
  parseInt(c.slice(1, 3), 16),
  parseInt(c.slice(3, 5), 16),
  parseInt(c.slice(5, 7), 16),
];

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf: Buffer): number => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

const chunk = (type: string, data: Buffer): Buffer => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};

function png(size: number, pixels: Uint8Array): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0; // filter: none
    Buffer.from(pixels.subarray(y * size * 3, (y + 1) * size * 3)).copy(raw, y * (size * 3 + 1) + 1);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function render(size: number, foxFraction: number, stars: boolean): Buffer {
  const pixels = new Uint8Array(size * size * 3);
  const [br, bg, bb] = hex(COLORS.night);
  for (let i = 0; i < size * size; i++) pixels.set([br, bg, bb], i * 3);

  const fill = (x0: number, y0: number, w: number, h: number, color: string) => {
    const [r, g, b] = hex(color);
    for (let y = Math.max(0, y0); y < Math.min(size, y0 + h); y++)
      for (let x = Math.max(0, x0); x < Math.min(size, x0 + w); x++) pixels.set([r, g, b], (y * size + x) * 3);
  };

  const s = Math.max(1, Math.floor((size * foxFraction) / 16));
  const ox = Math.floor((size - 16 * s) / 2);
  const oy = Math.floor((size - 16 * s) / 2);

  if (stars) {
    const star = (cx: number, cy: number) => {
      fill(cx, cy - s, s, 3 * s, COLORS.gold);
      fill(cx - s, cy, 3 * s, s, COLORS.gold);
    };
    star(ox + 1 * s, oy - 1 * s);
    star(ox + 16 * s, oy + 1 * s);
    star(ox + 15 * s, oy + 15 * s);
  }

  for (const r of gridToRects(foxGrid('happy'), FOX_PALETTE)) fill(ox + r.x * s, oy + r.y * s, r.w * s, s, r.color);
  return png(size, pixels);
}

function faviconSvg(): string {
  const rects = gridToRects(foxGrid('happy'), FOX_PALETTE)
    .map((r) => `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="1" fill="${r.color}"/>`)
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges"><rect width="16" height="16" fill="${COLORS.night}"/>${rects}</svg>\n`;
}

mkdirSync(resolve(PUBLIC, 'icons'), { recursive: true });
writeFileSync(resolve(PUBLIC, 'icons/icon-192.png'), render(192, 0.8, true));
writeFileSync(resolve(PUBLIC, 'icons/icon-512.png'), render(512, 0.8, true));
writeFileSync(resolve(PUBLIC, 'icons/icon-maskable-512.png'), render(512, 0.56, false));
writeFileSync(resolve(PUBLIC, 'icons/apple-touch-icon.png'), render(180, 0.8, true));
writeFileSync(resolve(PUBLIC, 'favicon.svg'), faviconSvg());
console.log('Icons generated in public/');
