import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { analyzeFoodPhotoFromDataURL, analyzeQuickRecordPhotoFromDataURL } from '../lib/llm'
import type { LLMFoodResult } from '../lib/llm'
import { useLLMUsageStore } from './llmUsageStore'
import { compressImage } from '../lib/storage'
import { formatDate } from '../lib/utils'

export type AiTaskType = 'food' | 'quick'
export type AiTaskStatus = 'processing' | 'ready' | 'failed'

export interface AiTask {
  id: string
  type: AiTaskType
  status: AiTaskStatus
  photoDataURL: string   // compressed base64 data URL for display and LLM
  description?: string
  result?: LLMFoodResult
  error?: string
  createdAt: number
  targetDate: string     // date for quick tasks
  userId: string
}

interface AiTaskState {
  tasks: AiTask[]
  startFoodTask: (userId: string, photoFile: File, description?: string) => Promise<void>
  startQuickTask: (userId: string, photoFile: File, description?: string, targetDate?: string) => Promise<void>
  resumeProcessingTasks: (userId: string) => void
  dismissTask: (id: string) => void
  _updateTask: (id: string, updates: Partial<AiTask>) => void
}

function sendNotification(title: string, body: string) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/pwa-192x192.png' })
  }
}

async function fileToCompressedDataURL(file: File): Promise<string> {
  const compressed = await compressImage(file, 800)
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(compressed)
  })
}

// Runs the LLM call for a task in the background (fire-and-forget IIFE)
function runBackgroundLLM(
  id: string,
  type: AiTaskType,
  photoDataURL: string,
  description: string | undefined,
  userId: string,
  get: () => AiTaskState,
) {
  ;(async () => {
    try {
      const result = type === 'food'
        ? await analyzeFoodPhotoFromDataURL(photoDataURL, description)
        : await analyzeQuickRecordPhotoFromDataURL(photoDataURL, description)
      get()._updateTask(id, { status: 'ready', result })
      await useLLMUsageStore.getState().recordUsage(userId, type)
      sendNotification(
        'OpenPlate',
        type === 'food' ? 'AI食物识别完成，请前往食物库验证' : 'AI快速记录识别完成，请验证后添加',
      )
    } catch (err) {
      get()._updateTask(id, {
        status: 'failed',
        error: err instanceof Error ? err.message : '识别失败',
      })
    }
  })()
}

export const useAiTaskStore = create<AiTaskState>()(
  persist(
    (set, get) => ({
      tasks: [],

      _updateTask: (id, updates) => {
        set((s) => ({
          tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        }))
      },

      startFoodTask: async (userId, photoFile, description) => {
        const id = crypto.randomUUID()
        const photoDataURL = await fileToCompressedDataURL(photoFile)
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
        runBackgroundLLM(id, 'food', photoDataURL, description, userId, get)
      },

      startQuickTask: async (userId, photoFile, description, targetDate) => {
        const id = crypto.randomUUID()
        const photoDataURL = await fileToCompressedDataURL(photoFile)
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
        runBackgroundLLM(id, 'quick', photoDataURL, description, userId, get)
      },

      // Re-run LLM for any tasks that were mid-flight when the app was closed.
      // Called once on login. Only resumes tasks belonging to the current user.
      resumeProcessingTasks: (userId) => {
        const staleTasks = get().tasks.filter(
          (t) => t.status === 'processing' && t.userId === userId,
        )
        staleTasks.forEach((task) => {
          runBackgroundLLM(task.id, task.type, task.photoDataURL, task.description, task.userId, get)
        })
      },

      dismissTask: (id) => {
        set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }))
      },
    }),
    {
      name: 'openplate-aitasks',
      partialize: (state) => ({ tasks: state.tasks }),
    },
  ),
)
