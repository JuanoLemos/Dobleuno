import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '../../lib/cn.js';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, className, id, ...rest },
  ref,
) {
  const inputId = id ?? `input-${Math.random().toString(36).slice(2, 9)}`;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-parchment-200">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={cn(
          'h-11 w-full rounded-xl border bg-forge-1 px-4 text-parchment-50',
          'placeholder:text-parchment-300/50',
          'focus:outline-none focus:ring-2 focus:ring-blood-500/40 focus:border-blood-500',
          'transition-colors',
          error ? 'border-blood-500' : 'border-forge-3',
          className,
        )}
        {...rest}
      />
      {error ? (
        <p className="text-xs text-blood-400">{error}</p>
      ) : hint ? (
        <p className="text-xs text-parchment-300/70">{hint}</p>
      ) : null}
    </div>
  );
});
