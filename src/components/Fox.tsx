import { useEffect, useState, type ReactNode } from 'react';
import { COIN, COIN_PALETTE, FOX_PALETTE, HEART, HEART_PALETTE, foxGrid, type FoxMood } from '../sprites/data';
import { PixelSprite } from './PixelSprite';

const GRIDS = { idle: foxGrid('idle'), blink: foxGrid('blink'), happy: foxGrid('happy') };

interface FoxProps {
  scale?: number;
  mood?: Exclude<FoxMood, 'blink'>;
  className?: string;
}

export function Fox({ scale = 6, mood = 'idle', className }: FoxProps) {
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    if (mood !== 'idle') return;
    let open: number;
    let close: number;
    const schedule = () => {
      open = window.setTimeout(
        () => {
          setBlink(true);
          close = window.setTimeout(() => {
            setBlink(false);
            schedule();
          }, 140);
        },
        2500 + Math.random() * 2500,
      );
    };
    schedule();
    return () => {
      window.clearTimeout(open);
      window.clearTimeout(close);
    };
  }, [mood]);

  const grid = mood === 'happy' ? GRIDS.happy : blink ? GRIDS.blink : GRIDS.idle;
  return <PixelSprite grid={grid} palette={FOX_PALETTE} scale={scale} className={className} label="Лисичка" />;
}

export const Coin = ({ scale = 4, className }: { scale?: number; className?: string }) => (
  <PixelSprite grid={COIN} palette={COIN_PALETTE} scale={scale} className={className} />
);

export const Heart = ({ scale = 3, className }: { scale?: number; className?: string }) => (
  <PixelSprite grid={HEART} palette={HEART_PALETTE} scale={scale} className={className} />
);

export function FoxSays({ children, mood = 'idle' }: { children: ReactNode; mood?: 'idle' | 'happy' }) {
  return (
    <div className="says">
      <Fox scale={4} mood={mood} className="says__fox" />
      <p className="says__bubble">{children}</p>
    </div>
  );
}
