import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  doc,
  onSnapshot,
  runTransaction,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { DailyLog, LogEntry, ExerciseEntry } from '../types'
import { formatDate } from '../lib/utils'

interface DailyLogState {
  currentLog: DailyLog | null
  selectedDate: string
  loading: boolean
  setSelectedDate: (date: string) => void
  addEntry: (userId: string, entry: Omit<LogEntry, 'id'>) => Promise<void>
  removeEntry: (userId: string, entryId: string) => Promise<void>
  addExercise: (userId: string, exercise: Omit<ExerciseEntry, 'id'>) => Promise<void>
  removeExercise: (userId: string, exerciseId: string) => Promise<void>
}

let unsubscribe: (() => void) | null = null

export const useDailyLogStore = create<DailyLogState>()(
  persist(
    (set, get) => ({
      currentLog: null,
      selectedDate: formatDate(new Date()),
      loading: true,

      setSelectedDate: (date) => {
        set({ selectedDate: date, currentLog: null, loading: true })
      },

      addEntry: async (userId, entry) => {
        const date = get().selectedDate
        const docId = `${userId}_${date}`
        const newEntry: LogEntry = { ...entry, id: crypto.randomUUID() }
        const ref = doc(db, 'dailyLogs', docId)

        await runTransaction(db, async (tx) => {
          const snap = await tx.get(ref)
          const existing = snap.exists() ? snap.data() : {}
          tx.set(ref, {
            userId,
            date,
            entries: [...(existing.entries ?? []), newEntry],
            exercises: existing.exercises ?? [],
          })
        })

        // Optimistic local update
        const current = get().currentLog
        const entries = [...(current?.entries ?? []), newEntry]
        set({ currentLog: { id: docId, userId, date, entries, exercises: current?.exercises ?? [] }, loading: false })
      },

      removeEntry: async (userId, entryId) => {
        const date = get().selectedDate
        const docId = `${userId}_${date}`
        const ref = doc(db, 'dailyLogs', docId)

        await runTransaction(db, async (tx) => {
          const snap = await tx.get(ref)
          const existing = snap.exists() ? snap.data() : {}
          tx.set(ref, {
            userId,
            date,
            entries: (existing.entries ?? []).filter((e: LogEntry) => e.id !== entryId),
            exercises: existing.exercises ?? [],
          })
        })

        // Optimistic local update
        const current = get().currentLog
        const entries = (current?.entries ?? []).filter((e) => e.id !== entryId)
        set({ currentLog: { id: docId, userId, date, entries, exercises: current?.exercises ?? [] }, loading: false })
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

        // Optimistic local update
        const current = get().currentLog
        const exercises = (current?.exercises ?? []).filter((e) => e.id !== exerciseId)
        set({ currentLog: { id: docId, userId, date, entries: current?.entries ?? [], exercises }, loading: false })
      },
    }),
    {
      name: 'openplate-dailylog',
      partialize: () => ({}),
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
    useDailyLogStore.setState({ loading: false })
  })
}

export function unsubscribeDailyLog() {
  unsubscribe?.()
  unsubscribe = null
}
