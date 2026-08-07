import { create } from 'zustand'
import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { DEFAULT_FOOD_CATEGORIES } from '../types'
import { useFoodStore } from './foodStore'
import { useAuthStore } from './authStore'
import { useToastStore } from './toastStore'

interface CategoryState {
  categories: string[]
  loading: boolean
  addCategory: (name: string) => Promise<void>
  renameCategory: (oldName: string, newName: string) => Promise<void>
  deleteCategory: (name: string) => Promise<void>
}

let unsubscribe: (() => void) | null = null

const CATEGORY_DOC_REF = doc(db, 'settings', 'categories')

export const useCategoryStore = create<CategoryState>()((set, get) => ({
  categories: DEFAULT_FOOD_CATEGORIES,
  loading: true,

  addCategory: async (name: string) => {
    if (!useAuthStore.getState().isAdmin) {
      useToastStore.getState().addToast('仅管理员可管理分类', { type: 'error' })
      return
    }
    const trimmed = name.trim()
    if (!trimmed || get().categories.includes(trimmed)) return
    const next = [...get().categories, trimmed]
    set({ categories: next })
    try {
      await setDoc(CATEGORY_DOC_REF, { categories: next })
      useToastStore.getState().addToast(`分类「${trimmed}」已创建`, { type: 'success' })
    } catch (err) {
      console.error('addCategory error:', err)
      useToastStore.getState().addToast('创建分类失败，请重试', { type: 'error' })
    }
  },

  renameCategory: async (oldName: string, newName: string) => {
    if (!useAuthStore.getState().isAdmin) {
      useToastStore.getState().addToast('仅管理员可管理分类', { type: 'error' })
      return
    }
    const trimmed = newName.trim()
    if (!trimmed || oldName === trimmed) return
    if (get().categories.includes(trimmed)) {
      useToastStore.getState().addToast(`分类「${trimmed}」已存在`, { type: 'error' })
      return
    }

    const next = get().categories.map((c) => (c === oldName ? trimmed : c))
    set({ categories: next })
    try {
      await setDoc(CATEGORY_DOC_REF, { categories: next })

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
    if (!useAuthStore.getState().isAdmin) {
      useToastStore.getState().addToast('仅管理员可管理分类', { type: 'error' })
      return
    }
    const next = get().categories.filter((c) => c !== name)
    set({ categories: next })
    try {
      await setDoc(CATEGORY_DOC_REF, { categories: next })

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
}))

export function subscribeCategories() {
  if (unsubscribe) return
  useCategoryStore.setState({ loading: true })
  unsubscribe = onSnapshot(
    CATEGORY_DOC_REF,
    (snapshot) => {
      if (snapshot.exists() && Array.isArray(snapshot.data().categories)) {
        useCategoryStore.setState({ categories: snapshot.data().categories, loading: false })
      } else {
        // Doc doesn't exist — admin auto-seeds it
        useCategoryStore.setState({ categories: DEFAULT_FOOD_CATEGORIES, loading: false })
        if (useAuthStore.getState().isAdmin) {
          setDoc(CATEGORY_DOC_REF, { categories: DEFAULT_FOOD_CATEGORIES }).catch(console.error)
        }
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
