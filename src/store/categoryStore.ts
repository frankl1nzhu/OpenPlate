import { create } from 'zustand'
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

export const useCategoryStore = create<CategoryState>()((_set, get) => ({
  categories: DEFAULT_FOOD_CATEGORIES,
  loading: true,

  addCategory: async (name: string) => {
    const trimmed = name.trim()
    if (!trimmed || get().categories.includes(trimmed)) return
    const next = [...get().categories, trimmed]
    await setDoc(doc(db, 'settings', 'categories'), { categories: next }, { merge: true })
    useToastStore.getState().addToast(`分类「${trimmed}」已创建`, { type: 'success' })
  },

  renameCategory: async (oldName: string, newName: string) => {
    const trimmed = newName.trim()
    if (!trimmed || oldName === trimmed) return
    if (get().categories.includes(trimmed)) {
      useToastStore.getState().addToast(`分类「${trimmed}」已存在`, { type: 'error' })
      return
    }

    const next = get().categories.map((c) => (c === oldName ? trimmed : c))
    await setDoc(doc(db, 'settings', 'categories'), { categories: next }, { merge: true })

    // Batch update all foods containing oldName
    const foodsToUpdate = useFoodStore.getState().foods.filter((f) => f.categories?.includes(oldName))
    await Promise.all(
      foodsToUpdate.map((f) => {
        const newCats = (f.categories || []).map((c) => (c === oldName ? trimmed : c))
        return updateDoc(doc(db, 'foods', f.id), { categories: newCats })
      })
    )
    useToastStore.getState().addToast(`分类已重命名为「${trimmed}」`, { type: 'success' })
  },

  deleteCategory: async (name: string) => {
    const next = get().categories.filter((c) => c !== name)
    await setDoc(doc(db, 'settings', 'categories'), { categories: next }, { merge: true })

    // Batch remove category from all foods
    const foodsToUpdate = useFoodStore.getState().foods.filter((f) => f.categories?.includes(name))
    await Promise.all(
      foodsToUpdate.map((f) => {
        const newCats = (f.categories || []).filter((c) => c !== name)
        return updateDoc(doc(db, 'foods', f.id), { categories: newCats })
      })
    )
    useToastStore.getState().addToast(`分类「${name}」已删除`, { type: 'success' })
  },
}))

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
      console.error(err)
      useCategoryStore.setState({ loading: false })
    }
  )
}

export function unsubscribeCategories() {
  unsubscribe?.()
  unsubscribe = null
}
