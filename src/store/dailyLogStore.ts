import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  doc,
  onSnapshot,
  setDoc,
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
        set({ selectedDate: date })
      },

      addEntry: async (userId, entry) => {
        const date = get().selectedDate
        const docId = `${userId}_${date}`
        const current = get().currentLog
        const newEntry: LogEntry = { ...entry, id: crypto.randomUUID() }
        const entries = [...(current?.entries ?? []), newEntry]

        await setDoc(doc(db, 'dailyLogs', docId), {
          userId,
          date,
          entries,
        })
      },

      removeEntry: async (userId, entryId) => {
        const date = get().selectedDate
        const docId = `${userId}_${date}`
        const current = get().currentLog
        const entries = (current?.entries ?? []).filter((e) => e.id !== entryId)

        await setDoc(doc(db, 'dailyLogs', docId), {
          userId,
          date,
          entries,
        })
      },
    }),
    { name: 'openplate-dailylog', partialize: (state) => ({ currentLog: state.currentLog, selectedDate: state.selectedDate }) },
  ),
)

export function subscribeDailyLog(userId: string, date: string) {
  unsubscribe?.()
  const docId = `${userId}_${date}`
  useDailyLogStore.setState({ loading: true })
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
