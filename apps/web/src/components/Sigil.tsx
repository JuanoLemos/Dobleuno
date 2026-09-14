import { cn } from '../lib/cn.js';

interface SigilProps {
  size?: 'mini' | 'full';
  className?: string;
  /** Si se pasa, usa una PNG del brand kit. Si no, usa el SVG inline (default). */
  brandSrc?: string;
}

const dims = { mini: { w: 32, h: 38 } };

/**
 * Sigilo "2·1" en heater shield.
 *
 * - size="mini" (default): SVG inline compacto, 32×38, ideal para header.
 *   brandSrc="..."  →  PNG del brand kit (apps/web/public/brand/).
 *
 * El SVG inline es el fallback liviano. Para hero/landing usamos el iluminado
 * del brand kit (más impactante, pero más pesado).
 */
export function Sigil({ size = 'mini', className, brandSrc }: SigilProps) {
  if (brandSrc) {
    return (
      <img
        src={brandSrc}
        alt="Dobleuno"
        className={cn('sigil-mark', className)}
        width={dims.mini.w}
        height={dims.mini.h}
        loading="eager"
        decoding="sync"
      />
    );
  }
  return (
    <svg
      className={cn('sigil-mark', className)}
      width={dims.mini.w}
      height={dims.mini.h}
      viewBox="0 0 100 120"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`g-${size}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c41e3a" />
          <stop offset="1" stopColor="#7e1313" />
        </linearGradient>
        <linearGradient id={`br-${size}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e0c283" />
          <stop offset="1" stopColor="#7d5a07" />
        </linearGradient>
      </defs>
      <path
        d="M50 4 L96 4 L96 60 Q96 96 50 116 Q4 96 4 60 L4 4 Z"
        fill={`url(#g-${size})`}
        stroke={`url(#br-${size})`}
        strokeWidth="3"
      />
      <text
        x="50"
        y="68"
        textAnchor="middle"
        fontFamily="DM Serif Display, serif"
        fontSize="44"
        fill="#f7f5f0"
        fontWeight="bold"
      >
        2·1
      </text>
    </svg>
  );
}