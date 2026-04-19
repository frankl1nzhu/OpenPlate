import { create } from 'zustand'
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, where, type Unsubscribe } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { db, storage } from '../lib/firebase'
import { compressImage } from '../lib/storage'
import { formatDate } from '../lib/utils'
import type { Nutrients } from '../types'

export type AiTaskType = 'food' | 'quick'
export type AiTaskStatus = 'processing' | 'ready' | 'failed'

export interface LLMFoodResult {
  name: string
  isCompleteProtein: boolean
  nutrients: Nutrients
}

export interface AiTask {
  id: string
  type: AiTaskType
  status: AiTaskStatus
  photoStoragePath: string
  photoDownloadURL?: string
  description?: string
  result?: LLMFoodResult
  error?: string
  createdAt: number
  targetDate: string
  userId: string
}

interface AiTaskState {
  tasks: AiTask[]
  startFoodTask: (userId: string, photoFile: File, fcmToken: string | null, description?: string) => Promise<void>
  startQuickTask: (userId: string, photoFile: File, fcmToken: string | null, description?: string, targetDate?: string) => Promise<void>
  dismissTask: (id: string) => void
}

let unsubAiTasks: Unsubscribe | null = null

export function subscribeAiTasks(userId: string) {
  unsubscribeAiTasks()
  const q = query(collection(db, 'aiTasks'), where('userId', '==', userId))
  unsubAiTasks = onSnapshot(q, (snap) => {
    const tasks: AiTask[] = snap.docs.map((d) => {
      const data = d.data()
      return {
        id: d.id,
        type: data.type,
        status: data.status,
        photoStoragePath: data.photoStoragePath,
        photoDownloadURL: data.photoDownloadURL,
        description: data.description,
        result: data.result,
        error: data.error,
        createdAt: data.createdAt?.toMillis?.() ?? Date.now(),
        targetDate: data.targetDate,
        userId: data.userId,
      }
    })
    useAiTaskStore.setState({ tasks })
  })
}

export function unsubscribeAiTasks() {
  unsubAiTasks?.()
  unsubAiTasks = null
}

export const useAiTaskStore = create<AiTaskState>()((set, get) => ({
  tasks: [],

  startFoodTask: async (userId, photoFile, fcmToken, description) => {
    const id = crypto.randomUUID()
    const storagePath = `ai-tasks/${id}.jpg`

    const compressed = await compressImage(photoFile, 800)
    const storageRef = ref(storage, storagePath)
    await uploadBytes(storageRef, compressed)
    const photoDownloadURL = await getDownloadURL(storageRef)

    // Create Firestore doc — triggers the Cloud Function
    await setDoc(doc(db, 'aiTasks', id), {
      type: 'food',
      status: 'processing',
      photoStoragePath: storagePath,
      photoDownloadURL,
      description: description || null,
      userId,
      targetDate: formatDate(new Date()),
      ...(fcmToken ? { fcmToken } : {}),
      createdAt: new Date(),
    })
  },

  startQuickTask: async (userId, photoFile, fcmToken, description, targetDate) => {
    const id = crypto.randomUUID()
    const storagePath = `ai-tasks/${id}.jpg`
    const date = targetDate ?? formatDate(new Date())

    const compressed = await compressImage(photoFile, 800)
    const storageRef = ref(storage, storagePath)
    await uploadBytes(storageRef, compressed)
    const photoDownloadURL = await getDownloadURL(storageRef)

    await setDoc(doc(db, 'aiTasks', id), {
      type: 'quick',
      status: 'processing',
      photoStoragePath: storagePath,
      photoDownloadURL,
      description: description || null,
      userId,
      targetDate: date,
      ...(fcmToken ? { fcmToken } : {}),
      createdAt: new Date(),
    })
  },

  dismissTask: (id) => {
    const task = get().tasks.find((t) => t.id === id)
    // Delete Firestore doc
    deleteDoc(doc(db, 'aiTasks', id)).catch(console.warn)
    // Delete Storage photo
    if (task?.photoStoragePath) {
      deleteObject(ref(storage, task.photoStoragePath)).catch(console.warn)
    }
    // Optimistic local removal
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }))
  },
}))
