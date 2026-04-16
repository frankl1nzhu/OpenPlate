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
  orderBy,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { Food } from '../types'

interface FoodState {
  foods: Food[]
  loading: boolean
  addFood: (food: Omit<Food, 'id'>) => Promise<string>
  updateFood: (id: string, data: Partial<Food>) => Promise<void>
  deleteFood: (id: string) => Promise<void>
}

let unsubscribe: (() => void) | null = null

export const useFoodStore = create<FoodState>()(
  persist(
    (_set) => ({
      foods: [],
      loading: true,

      addFood: async (food) => {
        const docRef = await addDoc(collection(db, 'foods'), food)
        return docRef.id
      },

      updateFood: async (id, data) => {
        await updateDoc(doc(db, 'foods', id), data)
      },

      deleteFood: async (id) => {
        await deleteDoc(doc(db, 'foods', id))
      },
    }),
    { name: 'openplate-foods', partialize: (state) => ({ foods: state.foods }) },
  ),
)

export function subscribeFoods() {
  if (unsubscribe) return
  const q = query(collection(db, 'foods'), orderBy('createdAt', 'desc'))
  unsubscribe = onSnapshot(q, (snapshot) => {
    const foods = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Food))
    useFoodStore.setState({ foods, loading: false })
  }, () => {
    useFoodStore.setState({ loading: false })
  })
}

export function unsubscribeFoods() {
  unsubscribe?.()
  unsubscribe = null
}
