import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { cleanForFirestore } from '../lib/utils'
import type { UserProfile } from '../types'

interface UserProfileState {
  profile: UserProfile | null
  loading: boolean
  setProfile: (userId: string, data: Partial<UserProfile>) => Promise<void>
  setNickname: (userId: string, nickname: string) => Promise<void>
}

let unsubscribe: (() => void) | null = null

export const useUserProfileStore = create<UserProfileState>()(
  persist(
    (_set) => ({
      profile: null as UserProfile | null,
      loading: true as boolean,

      setProfile: async (userId: string, data: Partial<UserProfile>) => {
        const ref = doc(db, 'userProfiles', userId)
        const snap = await getDoc(ref)
        const existing = snap.exists() ? snap.data() : {}
        await setDoc(ref, cleanForFirestore({
          ...existing,
          ...data,
          id: userId,
          userId,
        } as Record<string, unknown>))
      },

      setNickname: async (userId: string, nickname: string) => {
        const ref = doc(db, 'userProfiles', userId)
        const snap = await getDoc(ref)
        const existing = snap.exists() ? snap.data() : {}
        await setDoc(ref, cleanForFirestore({
          ...existing,
          id: userId,
          userId,
          nickname,
        } as Record<string, unknown>))
      },
    }),
    { name: 'openplate-userprofile', partialize: (state) => ({ profile: state.profile }) },
  ),
)

export function subscribeUserProfile(userId: string) {
  unsubscribe?.()
  useUserProfileStore.setState({ loading: true })
  unsubscribe = onSnapshot(doc(db, 'userProfiles', userId), (snapshot) => {
    if (snapshot.exists()) {
      useUserProfileStore.setState({
        profile: { id: snapshot.id, ...snapshot.data() } as UserProfile,
        loading: false,
      })
    } else {
      useUserProfileStore.setState({ profile: null, loading: false })
    }
  }, () => {
    useUserProfileStore.setState({ loading: false })
  })
}

export function unsubscribeUserProfile() {
  unsubscribe?.()
  unsubscribe = null
}

/**
 * Batch fetch user profiles by UIDs (for admin use)
 */
export async function fetchUserProfiles(uids: string[]): Promise<Record<string, UserProfile>> {
  const result: Record<string, UserProfile> = {}
  const unique = [...new Set(uids)]
  await Promise.all(
    unique.map(async (uid) => {
      const snap = await getDoc(doc(db, 'userProfiles', uid))
      if (snap.exists()) {
        result[uid] = { id: snap.id, ...snap.data() } as UserProfile
      }
    }),
  )
  return result
}
