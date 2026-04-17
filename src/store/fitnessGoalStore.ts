import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  collection,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  query,
  where,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { cleanForFirestore } from '../lib/utils'
import type { FitnessGoal } from '../types'

interface FitnessGoalState {
  goals: FitnessGoal[]
  loading: boolean
  addGoal: (goal: Omit<FitnessGoal, 'id'>) => Promise<string>
  deleteGoal: (id: string) => Promise<void>
  getActiveGoal: (date: string) => FitnessGoal | null
}

let unsubscribe: (() => void) | null = null

export const useFitnessGoalStore = create<FitnessGoalState>()(
  persist(
    (_set, get) => ({
      goals: [],
      loading: true,

      addGoal: async (goal) => {
        const docRef = await addDoc(
          collection(db, 'fitnessGoals'),
          cleanForFirestore(goal as Record<string, unknown>),
        )
        return docRef.id
      },

      deleteGoal: async (id) => {
        await deleteDoc(doc(db, 'fitnessGoals', id))
      },

      getActiveGoal: (date: string) => {
        return get().goals.find((g) => g.startDate <= date && g.endDate >= date) ?? null
      },
    }),
    { name: 'openplate-fitnessgoals', partialize: (state) => ({ goals: state.goals }) },
  ),
)

export function subscribeFitnessGoals(userId: string) {
  unsubscribe?.()
  useFitnessGoalStore.setState({ loading: true })
  const q = query(collection(db, 'fitnessGoals'), where('userId', '==', userId))
  unsubscribe = onSnapshot(q, (snapshot) => {
    const goals = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as FitnessGoal))
    useFitnessGoalStore.setState({ goals, loading: false })
  }, (err) => {
    console.error('subscribeFitnessGoals error:', err)
    useFitnessGoalStore.setState({ loading: false })
  })
}

export function unsubscribeFitnessGoals() {
  unsubscribe?.()
  unsubscribe = null
}
