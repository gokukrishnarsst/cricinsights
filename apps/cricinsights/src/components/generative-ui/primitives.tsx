'use client';

import { useState } from 'react';
import { resolvePlayerPhoto } from '@/lib/player-photo';
import { cn, entrance, glassCard, statNum, surfaceInset } from './utils';
import type { PlayerProfile } from './types';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function GlassCard({ children, className, style }: GlassCardProps) {
  return (
    <div className={cn(glassCard, entrance, className)} style={style}>
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-start justify-between gap-3">
      <div>
        <h3 className="font-display text-[11px] font-bold tracking-[0.22em] text-accent-2 uppercase">
          {title}
        </h3>
        {subtitle ? (
          <p className="mt-0.5 text-xs text-ink-mute">{subtitle}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function StatPill({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: 'cyan' | 'amber' | 'emerald';
}) {
  const accentClass =
    accent === 'amber'
      ? 'text-gold'
      : accent === 'emerald'
        ? 'text-emerald'
        : 'text-accent-2';

  return (
    <div className={cn(surfaceInset, 'px-3 py-2')}>
      <p className="text-[10px] font-bold tracking-wider text-ink-faint uppercase">
        {label}
      </p>
      <p className={cn('mt-0.5 text-lg font-semibold text-ink', statNum, accentClass)}>
        {value}
      </p>
    </div>
  );
}

export function AvatarPlaceholder({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-accent-2/25 bg-gradient-to-br from-accent/15 to-accent-2/10 font-display text-lg font-bold text-accent-2">
      {initials || '?'}
    </div>
  );
}

/** SportMonks photo when available, else generated avatar — used in chat cards. */
export function PlayerAvatar({
  name,
  profile,
  size = 'md',
  className,
}: {
  name: string;
  profile?: PlayerProfile | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const seed = profile?.sportmonksId != null ? String(profile.sportmonksId) : name;
  const src = resolvePlayerPhoto(profile?.imagePath, name, seed);

  const sizeClass =
    size === 'sm' ? 'h-12 w-12' : size === 'lg' ? 'h-20 w-20' : 'h-14 w-14';

  if (failed) {
    return <AvatarPlaceholder name={name} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name}
      width={size === 'lg' ? 80 : size === 'sm' ? 48 : 56}
      height={size === 'lg' ? 80 : size === 'sm' ? 48 : 56}
      className={cn(
        'team-logo-3d shrink-0 rounded-full border-2 border-accent-2/30 object-cover shadow-sm',
        sizeClass,
        className,
      )}
      onError={() => setFailed(true)}
    />
  );
}
