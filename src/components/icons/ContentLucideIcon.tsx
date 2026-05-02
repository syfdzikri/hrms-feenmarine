import type { CSSProperties } from 'react';
import type { LucideIcon } from 'lucide-react';

const VARIANT_CLASS = {
  'dashboard-kpi': 'content-lucide--dashboard-kpi',
  /** Tab bar, toolbar, tombol aksi baris, ikon di field cari */
  toolbar: 'content-lucide--toolbar',
} as const;

export type ContentLucideVariant = keyof typeof VARIANT_CLASS | 'default';

type Props = {
  icon: LucideIcon;
  size?: number;
  className?: string;
  /** Optional hook for CSS under [data-icon-style] / dark theme (see index.css) */
  variant?: ContentLucideVariant;
};

const VIBRANT_PALETTE = [
  { fg: '#0E7490', soft: '#CFFAFE' }, // cyan
  { fg: '#7C3AED', soft: '#EDE9FE' }, // violet
  { fg: '#BE185D', soft: '#FCE7F3' }, // fuchsia
  { fg: '#2563EB', soft: '#DBEAFE' }, // blue
  { fg: '#C2410C', soft: '#FFEDD5' }, // orange
  { fg: '#047857', soft: '#D1FAE5' }, // emerald
  { fg: '#4338CA', soft: '#E0E7FF' }, // indigo
  { fg: '#B45309', soft: '#FEF3C7' }, // amber
] as const;

const pickVibrantColor = (seed: string) => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return VIBRANT_PALETTE[hash % VIBRANT_PALETTE.length];
};

/**
 * Ikon Lucide terpusat untuk isi halaman. Navigasi shell tetap di App; migrasi bertahap ke sini
 * agar gaya vibrant + dark mode konsisten.
 */
export function ContentLucideIcon({ icon: Icon, size = 16, className = '', variant = 'default' }: Props) {
  const vClass = variant === 'default' ? '' : VARIANT_CLASS[variant];
  const iconName = Icon.displayName || Icon.name || 'icon';
  const color = pickVibrantColor(iconName);
  const isWhiteIcon = /\btext-white\b/.test(className);
  const vibrantDecorative = variant !== 'default' && !isWhiteIcon;
  const style = vibrantDecorative ? ({
    '--vibrant-icon-fg': color.fg,
    '--vibrant-icon-soft': color.soft,
  } as CSSProperties) : undefined;

  return (
    <span
      className={vibrantDecorative ? 'content-lucide-vibrant-wrap' : undefined}
      data-icon-name={iconName}
      style={style}
    >
      <Icon size={size} className={`lucide shrink-0 ${vClass} ${className}`.trim()} strokeWidth={2} aria-hidden />
    </span>
  );
}
