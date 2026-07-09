/**
 * Zustand store — UI slice.
 * Ola 1: solo el estado de UI. En Olas siguientes se suman slices de lists/battles.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface UIState {
  sidebarOpen: boolean;
  toast: { message: string; type: 'info' | 'success' | 'error' } | null;
  online: boolean;
  toggleSidebar: () => void;
  showToast: (message: string, type?: 'info' | 'success' | 'error') => void;
  dismissToast: () => void;
  setOnline: (online: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: false,
      toast: null,
      online: typeof navigator !== 'undefined' ? navigator.onLine : true,
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      showToast: (message, type = 'info') => {
        set({ toast: { message, type } });
        setTimeout(() => set({ toast: null }), 3500);
      },
      dismissToast: () => set({ toast: null }),
      setOnline: (online) => set({ online }),
    }),
    {
      name: 'dobleuno-ui',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ sidebarOpen: state.sidebarOpen }),
    },
  ),
);
