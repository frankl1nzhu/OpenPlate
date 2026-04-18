import { create } from 'zustand'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { formatDate } from '../lib/utils'

type FeatureType = 'food' | 'quick'

interface LLMUsageState {
  getRemainingUses: (userId: string, feature: FeatureType) => Promise<number>
  recordUsage: (userId: string, feature: FeatureType) => Promise<void>
}

const DAILY_LIMIT = 5

export const useLLMUsageStore = create<LLMUsageState>()(() => ({
  getRemainingUses: async (userId, feature) => {
    const date = formatDate(new Date())
    // Path: llmUsage/{userId}/daily/{feature}_{date}
    const ref = doc(db, 'llmUsage', userId, 'daily', `${feature}_${date}`)
    const snap = await getDoc(ref)
    const count = snap.exists() ? (snap.data().count || 0) : 0
    return Math.max(0, DAILY_LIMIT - count)
  },

  recordUsage: async (userId, feature) => {
    const date = formatDate(new Date())
    const ref = doc(db, 'llmUsage', userId, 'daily', `${feature}_${date}`)
    const snap = await getDoc(ref)
    const current = snap.exists() ? (snap.data().count || 0) : 0
    await setDoc(ref, { count: current + 1 })
  },
}))
