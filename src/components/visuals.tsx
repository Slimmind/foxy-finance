import type { ProjectionPoint } from '../lib/projection';

interface BarItem {
  key: string;
  weight: number;
  label: string;
  color: string;
}

export function AllocationBar({ items }: { items: BarItem[] }) {
  const summary = items.map((i) => `${i.label} ${Math.round(i.weight)}%`).join(', ');
  return (
    <div className="alloc" role="img" aria-label={`Структура портфеля: ${summary}`}>
      {items.map((i) => (
        <span key={i.key} className="alloc__seg" style={{ width: `${i.weight}%`, background: i.color }} />
      ))}
    </div>
  );
}

export function RiskMeter({ level, color }: { level: number; color: string }) {
  return (
    <div className="meter" role="img" aria-label={`Уровень риска ${level} из 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className="meter__cell" style={n <= level ? { background: color } : undefined} />
      ))}
    </div>
  );
}

const W = 320;
const H = 170;
const PAD = 6;

export function GrowthChart({ points }: { points: ProjectionPoint[] }) {
  const last = points[points.length - 1];
  const max = Math.max(last.high, last.invested, ...points.map((p) => p.base)) || 1;
  const years = points.length - 1 || 1;
  const x = (year: number) => PAD + (year / years) * (W - PAD * 2);
  const y = (v: number) => H - PAD - (Math.max(0, v) / max) * (H - PAD * 2);
  const line = (pick: (p: ProjectionPoint) => number) =>
    points.map((p) => `${Math.round(x(p.year))},${Math.round(y(pick(p)))}`).join(' ');

  return (
    <svg
      className="chart"
      viewBox={`0 0 ${W} ${H}`}
      shapeRendering="crispEdges"
      role="img"
      aria-label="График роста капитала по трём сценариям"
    >
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1={PAD} x2={W - PAD} y1={Math.round(PAD + (H - PAD * 2) * f)} y2={Math.round(PAD + (H - PAD * 2) * f)} className="chart__grid" />
      ))}
      <polyline points={line((p) => p.invested)} className="chart__line chart__line--invested" />
      <polyline points={line((p) => p.low)} className="chart__line chart__line--low" />
      <polyline points={line((p) => p.high)} className="chart__line chart__line--high" />
      <polyline points={line((p) => p.base)} className="chart__line chart__line--base" />
    </svg>
  );
}
