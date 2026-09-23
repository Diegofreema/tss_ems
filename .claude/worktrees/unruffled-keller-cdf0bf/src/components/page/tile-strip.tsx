import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type Tile = {
  label: string;
  /** A node so a tile can animate its figure — see `CountUp`. */
  value: ReactNode;
  /** Optional third line, e.g. "+12% on last term". */
  delta?: string;
  deltaTone?: 'brand' | 'muted';
};

/**
 * Tiles share one 2px frame and are separated by inset shadows rather than
 * gaps, so a ragged final row still reads as a grid.
 */
export function TileStrip({
  tiles,
  size = 'sm',
  className,
}: {
  tiles: Tile[];
  /** `lg` is the dashboard figure size; `sm` is the list-page summary. */
  size?: 'sm' | 'lg';
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap overflow-hidden border-2 border-divider bg-background',
        className,
      )}
    >
      {tiles?.map((tile, index) => (
        <div
          key={tile.label}
          style={{ animationDelay: `${index * 40}ms` }}
          className={cn(
            'min-w-0 flex-[1_1_240px] animate-ems-up bg-background shadow-[inset_-2px_0_0_var(--ems-divider),inset_0_-2px_0_var(--ems-divider)] transition-colors hover:bg-neutral-100',
            size === 'lg' ? 'px-4 py-4.5' : 'px-4 py-3.5',
          )}
        >
          <div className="text-2xs uppercase tracking-widest text-muted-foreground">
            {tile.label}
          </div>
          <div
            className={cn(
              'font-heading font-extrabold tabular-nums tracking-[-0.02em]',
              size === 'lg' ? 'my-2 text-stat' : 'mt-1.5 text-xl',
            )}
          >
            {tile.value}
          </div>
          {tile.delta && (
            <div
              className={cn(
                'text-2xs',
                tile.deltaTone === 'brand'
                  ? 'text-brand-700'
                  : 'text-muted-foreground',
              )}
            >
              {tile.delta}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
