import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  doc,
  onSnapshot,
  runTransaction,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { DailyLog, LogEntry } from '../types'
import { formatDate } from '../lib/utils'

interface DailyLogState {
  currentLog: DailyLog | null
  selectedDate: string
  loading: boolean
  setSelectedDate: (date: string) => void
  addEntry: (userId: string, entry: Omit<LogEntry, 'id'>) => Promise<void>
  removeEntry: (userId: string, entryId: string) => Promise<void>
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
          const existing = snap.exists() ? (snap.data().entries as LogEntry[]) : []
          tx.set(ref, { userId, date, entries: [...existing, newEntry] })
        })

        // Optimistic local update
        const current = get().currentLog
        const entries = [...(current?.entries ?? []), newEntry]
        set({ currentLog: { id: docId, userId, date, entries }, loading: false })
      },

      removeEntry: async (userId, entryId) => {
        const date = get().selectedDate
        const docId = `${userId}_${date}`
        const ref = doc(db, 'dailyLogs', docId)

        await runTransaction(db, async (tx) => {
          const snap = await tx.get(ref)
          const existing = snap.exists() ? (snap.data().entries as LogEntry[]) : []
          tx.set(ref, { userId, date, entries: existing.filter((e) => e.id !== entryId) })
        })

        // Optimistic local update
        const current = get().currentLog
        const entries = (current?.entries ?? []).filter((e) => e.id !== entryId)
        set({ currentLog: { id: docId, userId, date, entries }, loading: false })
      },
    }),
    {
      name: 'openplate-dailylog',
      partialize: (state) => ({ selectedDate: state.selectedDate }),
    },
  ),
)

export function subscribeDailyLog(userId: string, date: string) {
  unsubscribe?.()
  const docId = `${userId}_${date}`
  useDailyLogStore.setState({ loading: true, currentLog: null })
  unsubscribe = onSnapshot(doc(db, 'dailyLogs', docId), (snapshot) => {
    if (snapshot.exists()) {
      useDailyLogStore.setState({
        currentLog: { id: snapshot.id, ...snapshot.data() } as DailyLog,
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
