import { create } from 'zustand'
import { analyzeFoodPhoto, analyzeQuickRecordPhoto } from '../lib/llm'
import type { LLMFoodResult } from '../lib/llm'
import { useLLMUsageStore } from './llmUsageStore'
import { formatDate } from '../lib/utils'

export type AiTaskType = 'food' | 'quick'
export type AiTaskStatus = 'processing' | 'ready' | 'failed'

export interface AiTask {
  id: string
  type: AiTaskType
  status: AiTaskStatus
  photoDataURL: string   // base64 data URL for display
  description?: string
  result?: LLMFoodResult
  error?: string
  createdAt: number
  targetDate: string     // date for quick tasks (the day the photo was taken)
  userId: string
}

interface AiTaskState {
  tasks: AiTask[]
  startFoodTask: (userId: string, photoFile: File, description?: string) => Promise<void>
  startQuickTask: (userId: string, photoFile: File, description?: string, targetDate?: string) => Promise<void>
  dismissTask: (id: string) => void
  _updateTask: (id: string, updates: Partial<AiTask>) => void
}

function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function sendNotification(title: string, body: string) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/pwa-192x192.png' })
  }
}

export const useAiTaskStore = create<AiTaskState>((set, get) => ({
  tasks: [],

  _updateTask: (id, updates) => {
    set((s) => ({
      tasks: s.tasks.map((t) => t.id === id ? { ...t, ...updates } : t),
    }))
  },

  startFoodTask: async (userId, photoFile, description) => {
    const id = crypto.randomUUID()
    const photoDataURL = await fileToDataURL(photoFile)
    const task: AiTask = {
      id,
      type: 'food',
      status: 'processing',
      photoDataURL,
      description,
      createdAt: Date.now(),
      targetDate: formatDate(new Date()),
      userId,
    }
    set((s) => ({ tasks: [...s.tasks, task] }))

    // Run LLM in background — do NOT await here
    ;(async () => {
      try {
        const result = await analyzeFoodPhoto(photoFile, description)
        get()._updateTask(id, { status: 'ready', result })
        await useLLMUsageStore.getState().recordUsage(userId, 'food')
        sendNotification('OpenPlate', 'AI食物识别完成，请前往食物库验证')
      } catch (err) {
        get()._updateTask(id, {
          status: 'failed',
          error: err instanceof Error ? err.message : '识别失败',
        })
        // Don't record usage on failure
      }
    })()
  },

  startQuickTask: async (userId, photoFile, description, targetDate) => {
    const id = crypto.randomUUID()
    const photoDataURL = await fileToDataURL(photoFile)
    const date = targetDate ?? formatDate(new Date())
    const task: AiTask = {
      id,
      type: 'quick',
      status: 'processing',
      photoDataURL,
      description,
      createdAt: Date.now(),
      targetDate: date,
      userId,
    }
    set((s) => ({ tasks: [...s.tasks, task] }))

    ;(async () => {
      try {
        const result = await analyzeQuickRecordPhoto(photoFile, description)
        get()._updateTask(id, { status: 'ready', result })
        await useLLMUsageStore.getState().recordUsage(userId, 'quick')
        sendNotification('OpenPlate', 'AI快速记录识别完成，请验证后添加')
      } catch (err) {
        get()._updateTask(id, {
          status: 'failed',
          error: err instanceof Error ? err.message : '识别失败',
        })
      }
    })()
  },

  dismissTask: (id) => {
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }))
  },
}))
