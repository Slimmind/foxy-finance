import { useMemo } from 'react';
import { gridToRects, type Grid, type Palette } from '../sprites/data';

interface Props {
  grid: Grid;
  palette: Palette;
  /** Screen pixels per sprite pixel. */
  scale?: number;
  label?: string;
  className?: string;
}

export function PixelSprite({ grid, palette, scale = 4, label, className }: Props) {
  const rects = useMemo(() => gridToRects(grid, palette), [grid, palette]);
  const w = grid[0].length;
  const h = grid.length;
  return (
    <svg
      className={className}
      width={w * scale}
      height={h * scale}
      viewBox={`0 0 ${w} ${h}`}
      shapeRendering="crispEdges"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {rects.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={r.color} />
      ))}
    </svg>
  );
}
