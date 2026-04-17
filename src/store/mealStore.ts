import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { cleanForFirestore } from '../lib/utils'
import type { Meal } from '../types'

interface MealState {
  meals: Meal[]
  loading: boolean
  addMeal: (meal: Omit<Meal, 'id'>) => Promise<string>
  updateMeal: (id: string, data: Partial<Meal>) => Promise<void>
  deleteMeal: (id: string) => Promise<void>
  requestDeleteMeal: (mealId: string, mealName: string, userId: string, reason: string) => Promise<void>
}

let unsubscribe: (() => void) | null = null

export const useMealStore = create<MealState>()(
  persist(
    (_set) => ({
      meals: [],
      loading: true,

      addMeal: async (meal) => {
        const docRef = await addDoc(collection(db, 'meals'), cleanForFirestore(meal as Record<string, unknown>))
        return docRef.id
      },

      updateMeal: async (id, data) => {
        await updateDoc(doc(db, 'meals', id), cleanForFirestore(data as Record<string, unknown>))
      },

      deleteMeal: async (id) => {
        await deleteDoc(doc(db, 'meals', id))
      },

      requestDeleteMeal: async (mealId, mealName, userId, reason) => {
        await addDoc(collection(db, 'deleteRequests'), {
          type: 'meal',
          targetId: mealId,
          targetName: mealName,
          reason,
          requestedBy: userId,
          requestedAt: Date.now(),
          status: 'pending',
        })
      },
    }),
    { name: 'openplate-meals', partialize: (state) => ({ meals: state.meals }) },
  ),
)

export function subscribeMeals(userId: string) {
  unsubscribe?.()
  const q = query(collection(db, 'meals'), where('createdBy', '==', userId), orderBy('createdAt', 'desc'))
  unsubscribe = onSnapshot(q, (snapshot) => {
    const meals = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Meal))
    useMealStore.setState({ meals, loading: false })
  }, () => {
    useMealStore.setState({ loading: false })
  })
}

export function unsubscribeMeals() {
  unsubscribe?.()
  unsubscribe = null
}
