import { create } from 'zustand';

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  variant: ToastVariant;
  title: string;
  body?: string;
  durationMs: number;
}

export interface ToastInput {
  variant: ToastVariant;
  title: string;
  body?: string;
  durationMs?: number;
}

interface ToastState {
  toasts: Toast[];
  push(input: ToastInput): string;
  dismiss(id: string): void;
  clear(): void;
}

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (input) => {
    const id = uid();
    set((state) => ({
      toasts: [...state.toasts, { id, durationMs: 4000, ...input }],
    }));
    return id;
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
  clear: () => set({ toasts: [] }),
}));
