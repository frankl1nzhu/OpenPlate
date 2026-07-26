import { create } from 'zustand'

export interface Toast {
  id: string
  message: string
  type: 'success' | 'info' | 'error'
  action?: () => void
  actionLabel?: string
}

interface ToastOptions {
  type?: Toast['type']
  duration?: number
  action?: () => void
  actionLabel?: string
}

interface ToastState {
  toasts: Toast[]
  addToast: (message: string, options?: ToastOptions) => string
  removeToast: (id: string) => void
}

const DEFAULT_DURATIONS: Record<Toast['type'], number> = {
  success: 3000,
  info: 4000,
  error: 5000,
}

const timerMap = new Map<string, ReturnType<typeof setTimeout>>()

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  addToast: (message, options = {}) => {
    const id = crypto.randomUUID()
    const type = options.type ?? 'info'
    const duration = options.duration ?? (options.action ? 6000 : DEFAULT_DURATIONS[type])
    
    set((s) => ({ toasts: [...s.toasts, { id, message, type, action: options.action, actionLabel: options.actionLabel }] }))
    
    const timer = setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
      timerMap.delete(id)
    }, duration)
    timerMap.set(id, timer)
    
    return id
  },

  removeToast: (id) => {
    const timer = timerMap.get(id)
    if (timer) {
      clearTimeout(timer)
      timerMap.delete(id)
    }
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
  },
}))
