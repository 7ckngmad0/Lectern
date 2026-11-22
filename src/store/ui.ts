import { create } from 'zustand';

export type ToastTone = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
}

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
}

export interface Transfer {
  title: string;
  /** 0–1, or null when the size is unknown. */
  progress: number | null;
  onCancel?: () => void;
}

interface UiState {
  toast: Toast | null;
  dialog: ConfirmOptions | null;
  transfer: Transfer | null;
  setTransfer: (transfer: Transfer | null) => void;
  showToast: (message: string, tone?: ToastTone) => void;
  hideToast: () => void;
  confirm: (options: ConfirmOptions) => void;
  closeDialog: () => void;
}

let toastSeq = 0;

export const useUiStore = create<UiState>((set) => ({
  toast: null,
  dialog: null,
  transfer: null,
  setTransfer: (transfer) => set({ transfer }),
  showToast: (message, tone = 'success') => set({ toast: { id: ++toastSeq, message, tone } }),
  hideToast: () => set({ toast: null }),
  confirm: (dialog) => set({ dialog }),
  closeDialog: () => set({ dialog: null }),
}));

/** Imperative helpers usable outside React components. */
export const toast = (message: string, tone?: ToastTone) => useUiStore.getState().showToast(message, tone);
export const confirmAction = (options: ConfirmOptions) => useUiStore.getState().confirm(options);
