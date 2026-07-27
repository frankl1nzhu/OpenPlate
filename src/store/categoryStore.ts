import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { DEFAULT_FOOD_CATEGORIES } from '../types'
import { useFoodStore } from './foodStore'
import { useToastStore } from './toastStore'

interface CategoryState {
  categories: string[]
  loading: boolean
  addCategory: (name: string) => Promise<void>
  renameCategory: (oldName: string, newName: string) => Promise<void>
  deleteCategory: (name: string) => Promise<void>
}

let unsubscribe: (() => void) | null = null

export const useCategoryStore = create<CategoryState>()(
  persist(
    (set, get) => ({
      categories: DEFAULT_FOOD_CATEGORIES,
      loading: false,

      addCategory: async (name: string) => {
        const trimmed = name.trim()
        if (!trimmed || get().categories.includes(trimmed)) return
        const next = [...get().categories, trimmed]
        // Optimistic local update
        set({ categories: next })
        try {
          await setDoc(doc(db, 'settings', 'categories'), { categories: next }, { merge: true })
          useToastStore.getState().addToast(`分类「${trimmed}」已创建`, { type: 'success' })
        } catch (err) {
          console.error('addCategory error:', err)
          useToastStore.getState().addToast('创建分类失败，请重试', { type: 'error' })
        }
      },

      renameCategory: async (oldName: string, newName: string) => {
        const trimmed = newName.trim()
        if (!trimmed || oldName === trimmed) return
        if (get().categories.includes(trimmed)) {
          useToastStore.getState().addToast(`分类「${trimmed}」已存在`, { type: 'error' })
          return
        }

        const next = get().categories.map((c) => (c === oldName ? trimmed : c))
        // Optimistic local update
        set({ categories: next })
        try {
          await setDoc(doc(db, 'settings', 'categories'), { categories: next }, { merge: true })

          // Batch update all foods containing oldName
          const foodsToUpdate = useFoodStore.getState().foods.filter((f) => f.categories?.includes(oldName))
          if (foodsToUpdate.length > 0) {
            await Promise.allSettled(
              foodsToUpdate.map((f) => {
                const newCats = (f.categories || []).map((c) => (c === oldName ? trimmed : c))
                return updateDoc(doc(db, 'foods', f.id), { categories: newCats })
              }),
            )
          }
          useToastStore.getState().addToast(`分类已修改为「${trimmed}」`, { type: 'success' })
        } catch (err) {
          console.error('renameCategory error:', err)
          useToastStore.getState().addToast('修改分类失败，请重试', { type: 'error' })
        }
      },

      deleteCategory: async (name: string) => {
        const next = get().categories.filter((c) => c !== name)
        // Optimistic local update
        set({ categories: next })
        try {
          await setDoc(doc(db, 'settings', 'categories'), { categories: next }, { merge: true })

          // Batch remove category from all foods
          const foodsToUpdate = useFoodStore.getState().foods.filter((f) => f.categories?.includes(name))
          if (foodsToUpdate.length > 0) {
            await Promise.allSettled(
              foodsToUpdate.map((f) => {
                const newCats = (f.categories || []).filter((c) => c !== name)
                return updateDoc(doc(db, 'foods', f.id), { categories: newCats })
              }),
            )
          }
          useToastStore.getState().addToast(`分类「${name}」已删除`, { type: 'success' })
        } catch (err) {
          console.error('deleteCategory error:', err)
          useToastStore.getState().addToast('删除分类失败，请重试', { type: 'error' })
        }
      },
    }),
    {
      name: 'openplate-categories',
      partialize: (state) => ({ categories: state.categories }),
    },
  ),
)

export function subscribeCategories() {
  if (unsubscribe) return
  const docRef = doc(db, 'settings', 'categories')
  unsubscribe = onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists() && Array.isArray(snapshot.data().categories)) {
        useCategoryStore.setState({ categories: snapshot.data().categories, loading: false })
      } else {
        // Seed default categories doc if missing
        setDoc(docRef, { categories: DEFAULT_FOOD_CATEGORIES }, { merge: true }).catch(console.error)
        useCategoryStore.setState({ categories: DEFAULT_FOOD_CATEGORIES, loading: false })
      }
    },
    (err) => {
      console.error('subscribeCategories error:', err)
      useCategoryStore.setState({ loading: false })
    },
  )
}

export function unsubscribeCategories() {
  unsubscribe?.()
  unsubscribe = null
}
