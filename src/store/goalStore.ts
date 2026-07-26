import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { DailyGoal, Nutrients } from '../types'
import { EMPTY_NUTRIENTS } from '../types'
import { useToastStore } from './toastStore'

interface GoalState {
  goal: DailyGoal | null
  loading: boolean
  homeNutrientKeys: (keyof Nutrients)[]
  setGoal: (userId: string, targets: Nutrients) => Promise<void>
  setHomeNutrientKeys: (keys: (keyof Nutrients)[]) => void
}

let unsubscribe: (() => void) | null = null

export const useGoalStore = create<GoalState>()(
  persist(
    (_set, _get) => ({
      goal: null as DailyGoal | null,
      loading: true,
      homeNutrientKeys: [] as (keyof Nutrients)[],

      setGoal: async (userId: string, targets: Nutrients) => {
        await setDoc(doc(db, 'dailyGoals', userId), { userId, targets })
      },

      setHomeNutrientKeys: (keys: (keyof Nutrients)[]) => {
        _set({ homeNutrientKeys: keys })
      },
    }),
    { name: 'openplate-goals', partialize: (state) => ({ goal: state.goal, homeNutrientKeys: state.homeNutrientKeys }) },
  ),
)

export function subscribeGoal(userId: string) {
  unsubscribe?.()
  useGoalStore.setState({ loading: true })
  unsubscribe = onSnapshot(doc(db, 'dailyGoals', userId), (snapshot) => {
    if (snapshot.exists()) {
      useGoalStore.setState({
        goal: { id: snapshot.id, ...snapshot.data() } as DailyGoal,
        loading: false,
      })
    } else {
      useGoalStore.setState({
        goal: { id: userId, userId, targets: EMPTY_NUTRIENTS },
        loading: false,
      })
    }
  }, (err) => {
    console.error('subscribeGoal error:', err)
    useGoalStore.setState({ loading: false })
    useToastStore.getState().addToast('目标数据同步受阻', { type: 'error' })
  })
}

export function unsubscribeGoal() {
  unsubscribe?.()
  unsubscribe = null
}
