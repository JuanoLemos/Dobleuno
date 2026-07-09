import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/cn.js';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: 'default' | 'elevated' | 'outlined';
}

export function Card({ children, className, variant = 'default', ...rest }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border bg-forge-1',
        variant === 'default' && 'border-forge-3',
        variant === 'elevated' && 'border-forge-3 shadow-lifted',
        variant === 'outlined' && 'border-forge-2 bg-transparent',
        'p-4',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('mb-3 flex items-start justify-between', className)} {...rest}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className, ...rest }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn('font-serif text-lg text-parchment-50', className)} {...rest}>
      {children}
    </h3>
  );
}

export function CardSubtitle({ children, className, ...rest }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('text-xs text-parchment-300', className)} {...rest}>
      {children}
    </p>
  );
}
