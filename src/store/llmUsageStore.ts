import { create } from 'zustand'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { formatDate } from '../lib/utils'

type FeatureType = 'food' | 'quick'

interface LLMUsageState {
  /** Check remaining uses for today. Returns remaining count (0 = limit reached) */
  getRemainingUses: (userId: string, feature: FeatureType) => Promise<number>
  /** Increment usage count (call after successful LLM completion) */
  recordUsage: (userId: string, feature: FeatureType) => Promise<void>
}

const DAILY_LIMIT = 5

function getDocId(userId: string, feature: FeatureType, date: string) {
  return `${userId}_${feature}_${date}`
}

export const useLLMUsageStore = create<LLMUsageState>()(() => ({
  getRemainingUses: async (userId, feature) => {
    const date = formatDate(new Date())
    const docId = getDocId(userId, feature, date)
    const snap = await getDoc(doc(db, 'llmUsage', docId))
    const count = snap.exists() ? (snap.data().count || 0) : 0
    return Math.max(0, DAILY_LIMIT - count)
  },

  recordUsage: async (userId, feature) => {
    const date = formatDate(new Date())
    const docId = getDocId(userId, feature, date)
    const ref = doc(db, 'llmUsage', docId)
    const snap = await getDoc(ref)
    const current = snap.exists() ? (snap.data().count || 0) : 0
    await setDoc(ref, { userId, feature, date, count: current + 1 })
  },
}))
