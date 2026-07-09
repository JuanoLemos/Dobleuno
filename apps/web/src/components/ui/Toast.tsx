import { useUIStore } from '../../lib/store.js';
import { cn } from '../../lib/cn.js';

export function Toast() {
  const toast = useUIStore((s) => s.toast);
  const dismiss = useUIStore((s) => s.dismissToast);
  if (!toast) return null;
  return (
    <div
      role="alert"
      className={cn(
        'fixed left-1/2 top-4 z-50 -translate-x-1/2 transform',
        'animate-slide-up rounded-full px-4 py-2 text-sm font-medium shadow-lifted',
        'max-w-[90vw]',
        toast.type === 'success' && 'bg-bronze-500 text-forge-0',
        toast.type === 'error' && 'bg-blood-500 text-parchment-50',
        toast.type === 'info' && 'bg-forge-3 text-parchment-50',
      )}
      onClick={dismiss}
    >
      {toast.message}
    </div>
  );
}
