import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  doc,
  onSnapshot,
  runTransaction,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { DailyLog, LogEntry, ExerciseEntry } from '../types'
import { formatDate, normalizeMealIndices } from '../lib/utils'
import { useToastStore } from './toastStore'

interface DailyLogState {
  currentLog: DailyLog | null
  selectedDate: string
  recentFoodIds: string[]
  loading: boolean
  setSelectedDate: (date: string) => void
  addRecentFood: (foodId: string) => void
  addEntry: (userId: string, entry: Omit<LogEntry, 'id'>, date?: string) => Promise<void>
  addEntries: (userId: string, entries: Omit<LogEntry, 'id'>[], date?: string) => Promise<void>
  updateEntries: (userId: string, updatedEntries: LogEntry[]) => Promise<void>
  removeEntry: (userId: string, entryId: string) => Promise<void>
  removeEntries: (userId: string, entryIds: string[]) => Promise<void>
  addExercise: (userId: string, exercise: Omit<ExerciseEntry, 'id'>) => Promise<void>
  removeExercise: (userId: string, exerciseId: string) => Promise<void>
  copyLogToDate: (userId: string, sourceDate: string, targetDate: string) => Promise<void>
}

let unsubscribe: (() => void) | null = null

export const useDailyLogStore = create<DailyLogState>()(
  persist(
    (set, get) => ({
      currentLog: null,
      selectedDate: formatDate(new Date()),
      recentFoodIds: [],
      loading: true,

      setSelectedDate: (date) => {
        set({ selectedDate: date, currentLog: null, loading: true })
      },

      addRecentFood: (foodId) => {
        set((state) => {
          const ids = [foodId, ...state.recentFoodIds.filter((id) => id !== foodId)].slice(0, 20)
          return { recentFoodIds: ids }
        })
      },

      addEntry: async (userId, entry, explicitDate) => {
        const date = explicitDate ?? get().selectedDate
        const docId = `${userId}_${date}`
        const current = get().currentLog
        const existingEntries = current?.entries ?? []
        const fallbackMealIndex = existingEntries.reduce((max, e, idx) => Math.max(max, e.mealIndex ?? (idx + 1)), 0) + 1
        const newEntry: LogEntry = {
          ...entry,
          id: crypto.randomUUID(),
          mealIndex: entry.mealIndex ?? fallbackMealIndex,
        }
        const updatedEntries = normalizeMealIndices([...existingEntries, newEntry])
        const ref = doc(db, 'dailyLogs', docId)

        // Optimistic local update
        set({ currentLog: { id: docId, userId, date, entries: updatedEntries, exercises: current?.exercises ?? [] }, loading: false })
        if (entry.type === 'food') {
          get().addRecentFood(entry.refId)
        }

        try {
          await runTransaction(db, async (tx) => {
            const snap = await tx.get(ref)
            const existing = snap.exists() ? snap.data() : {}
            const txExistingEntries: LogEntry[] = existing.entries ?? []
            const txFallbackMealIndex = txExistingEntries.reduce((max, e, idx) => Math.max(max, e.mealIndex ?? (idx + 1)), 0) + 1
            const txNewEntry: LogEntry = {
              ...newEntry,
              mealIndex: entry.mealIndex ?? txFallbackMealIndex,
            }
            const txUpdated = normalizeMealIndices([...txExistingEntries, txNewEntry])
            tx.set(ref, {
              userId,
              date,
              entries: txUpdated,
              exercises: existing.exercises ?? [],
            })
          })
        } catch (err) {
          console.error('addEntry error:', err)
          if (current) set({ currentLog: current })
          throw err
        }
      },

      addEntries: async (userId, entriesToAdd, explicitDate) => {
        if (entriesToAdd.length === 0) return
        const date = explicitDate ?? get().selectedDate
        const docId = `${userId}_${date}`
        const current = get().currentLog
        const existingEntries = current?.entries ?? []
        const fallbackMealIndex = existingEntries.reduce((max, e, idx) => Math.max(max, e.mealIndex ?? (idx + 1)), 0) + 1

        const newEntries: LogEntry[] = entriesToAdd.map((entry) => ({
          ...entry,
          id: crypto.randomUUID(),
          mealIndex: entry.mealIndex ?? fallbackMealIndex,
        }))
        const updatedEntries = normalizeMealIndices([...existingEntries, ...newEntries])
        const ref = doc(db, 'dailyLogs', docId)

        // Optimistic local update
        set({ currentLog: { id: docId, userId, date, entries: updatedEntries, exercises: current?.exercises ?? [] }, loading: false })
        entriesToAdd.forEach((entry) => {
          if (entry.type === 'food') {
            get().addRecentFood(entry.refId)
          }
        })

        try {
          await runTransaction(db, async (tx) => {
            const snap = await tx.get(ref)
            const existing = snap.exists() ? snap.data() : {}
            const txExistingEntries: LogEntry[] = existing.entries ?? []
            const txFallbackMealIndex = txExistingEntries.reduce((max, e, idx) => Math.max(max, e.mealIndex ?? (idx + 1)), 0) + 1
            const txNewEntries: LogEntry[] = newEntries.map((entry, idx) => ({
              ...entry,
              mealIndex: entriesToAdd[idx].mealIndex ?? txFallbackMealIndex,
            }))
            const txUpdated = normalizeMealIndices([...txExistingEntries, ...txNewEntries])
            tx.set(ref, {
              userId,
              date,
              entries: txUpdated,
              exercises: existing.exercises ?? [],
            })
          })
        } catch (err) {
          console.error('addEntries error:', err)
          if (current) set({ currentLog: current })
          throw err
        }
      },

      updateEntries: async (userId, updatedEntries) => {
        const date = get().selectedDate
        const docId = `${userId}_${date}`
        const ref = doc(db, 'dailyLogs', docId)

        const current = get().currentLog
        const allEntries = current?.entries ?? []
        // Replace entries by id with the updated versions
        const updatedIds = new Set(updatedEntries.map(e => e.id))
        const merged = allEntries.map(e => {
          if (updatedIds.has(e.id)) {
            return updatedEntries.find(u => u.id === e.id)!
          }
          return e
        })
        const updatedNormalized = normalizeMealIndices(merged)

        // Optimistic local update
        set({ currentLog: { id: docId, userId, date, entries: updatedNormalized, exercises: current?.exercises ?? [] }, loading: false })

        try {
          await runTransaction(db, async (tx) => {
            const snap = await tx.get(ref)
            const existing = snap.exists() ? snap.data() : {}
            const existingEntries: LogEntry[] = existing.entries ?? []
            const txMerged = existingEntries.map(e => {
              if (updatedIds.has(e.id)) {
                return updatedEntries.find(u => u.id === e.id)!
              }
              return e
            })
            const txUpdated = normalizeMealIndices(txMerged)
            tx.set(ref, {
              userId,
              date,
              entries: txUpdated,
              exercises: existing.exercises ?? [],
            })
          })
        } catch (err) {
          console.error('updateEntries error:', err)
          if (current) set({ currentLog: current })
          throw err
        }
      },

      removeEntries: async (userId, entryIds) => {
        if (entryIds.length === 0) return
        const date = get().selectedDate
        const docId = `${userId}_${date}`
        const ref = doc(db, 'dailyLogs', docId)
        const removeSet = new Set(entryIds)

        const current = get().currentLog
        const filtered = (current?.entries ?? []).filter((e) => !removeSet.has(e.id))
        const updatedEntries = normalizeMealIndices(filtered)

        // Optimistic local update FIRST
        set({ currentLog: { id: docId, userId, date, entries: updatedEntries, exercises: current?.exercises ?? [] }, loading: false })

        try {
          await runTransaction(db, async (tx) => {
            const snap = await tx.get(ref)
            const existing = snap.exists() ? snap.data() : {}
            const txFiltered = (existing.entries ?? []).filter((e: LogEntry) => !removeSet.has(e.id))
            const txUpdated = normalizeMealIndices(txFiltered)
            tx.set(ref, {
              userId,
              date,
              entries: txUpdated,
              exercises: existing.exercises ?? [],
            })
          })
        } catch (err) {
          console.error('removeEntries error:', err)
          if (current) set({ currentLog: current })
        }
      },

      removeEntry: async (userId, entryId) => {
        return get().removeEntries(userId, [entryId])
      },

      addExercise: async (userId, exercise) => {
        const date = get().selectedDate
        const docId = `${userId}_${date}`
        const newExercise: ExerciseEntry = { ...exercise, id: crypto.randomUUID() }
        const ref = doc(db, 'dailyLogs', docId)

        await runTransaction(db, async (tx) => {
          const snap = await tx.get(ref)
          const existing = snap.exists() ? snap.data() : {}
          tx.set(ref, {
            userId,
            date,
            entries: existing.entries ?? [],
            exercises: [...(existing.exercises ?? []), newExercise],
          })
        })

        // Optimistic local update
        const current = get().currentLog
        const exercises = [...(current?.exercises ?? []), newExercise]
        set({ currentLog: { id: docId, userId, date, entries: current?.entries ?? [], exercises }, loading: false })
      },

      removeExercise: async (userId, exerciseId) => {
        const date = get().selectedDate
        const docId = `${userId}_${date}`
        const ref = doc(db, 'dailyLogs', docId)

        const current = get().currentLog
        const updatedExercises = (current?.exercises ?? []).filter((e) => e.id !== exerciseId)

        // Optimistic local update FIRST
        set({ currentLog: { id: docId, userId, date, entries: current?.entries ?? [], exercises: updatedExercises }, loading: false })

        try {
          await runTransaction(db, async (tx) => {
            const snap = await tx.get(ref)
            const existing = snap.exists() ? snap.data() : {}
            tx.set(ref, {
              userId,
              date,
              entries: existing.entries ?? [],
              exercises: (existing.exercises ?? []).filter((e: ExerciseEntry) => e.id !== exerciseId),
            })
          })
        } catch (err) {
          console.error('removeExercise error:', err)
          if (current) set({ currentLog: current })
        }
      },

      copyLogToDate: async (userId, sourceDate, targetDate) => {
        const sourceDocId = `${userId}_${sourceDate}`
        const targetDocId = `${userId}_${targetDate}`
        
        await runTransaction(db, async (tx) => {
          const sourceRef = doc(db, 'dailyLogs', sourceDocId)
          const targetRef = doc(db, 'dailyLogs', targetDocId)
          
          const sourceSnap = await tx.get(sourceRef)
          if (!sourceSnap.exists()) return

          const sourceData = sourceSnap.data()
          const sourceEntries = sourceData.entries ?? []
          const sourceExercises = sourceData.exercises ?? []

          // Re-generate IDs for copied items to avoid conflicts
          const entriesToCopy = sourceEntries.map((e: LogEntry) => ({ ...e, id: crypto.randomUUID() }))
          const exercisesToCopy = sourceExercises.map((e: ExerciseEntry) => ({ ...e, id: crypto.randomUUID() }))

          const targetSnap = await tx.get(targetRef)
          const targetData = targetSnap.exists() ? targetSnap.data() : {}
          
          tx.set(targetRef, {
            userId,
            date: targetDate,
            entries: [...(targetData.entries ?? []), ...entriesToCopy],
            exercises: [...(targetData.exercises ?? []), ...exercisesToCopy],
          })
        })
      },
    }),
    {
      name: 'openplate-dailylog',
      partialize: (state) => ({ recentFoodIds: state.recentFoodIds }),
    },
  ),
)

export function subscribeDailyLog(userId: string, date: string) {
  unsubscribe?.()
  const docId = `${userId}_${date}`
  useDailyLogStore.setState({ loading: true, currentLog: null })
  unsubscribe = onSnapshot(doc(db, 'dailyLogs', docId), (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data()
      useDailyLogStore.setState({
        currentLog: {
          id: snapshot.id,
          userId: data.userId,
          date: data.date,
          entries: data.entries ?? [],
          exercises: data.exercises ?? [],
        },
        loading: false,
      })
    } else {
      useDailyLogStore.setState({ currentLog: null, loading: false })
    }
  }, () => {
    useToastStore.getState().addToast('日记数据同步受阻', { type: 'error' })
    useDailyLogStore.setState({ loading: false })
  })
}

export function unsubscribeDailyLog() {
  unsubscribe?.()
  unsubscribe = null
}
