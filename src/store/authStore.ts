import { create } from 'zustand'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth'
import { auth } from '../lib/firebase'

interface AuthState {
  user: User | null
  isAdmin: boolean
  loading: boolean
  error: string | null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAdmin: false,
  loading: true,
  error: null,

  signIn: async (email, password) => {
    set({ error: null })
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '登录失败'
      set({ error: msg })
      throw e
    }
  },

  signUp: async (email, password) => {
    set({ error: null })
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password)
      await sendEmailVerification(result.user)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '注册失败'
      set({ error: msg })
      throw e
    }
  },

  signOut: async () => {
    await firebaseSignOut(auth)
  },

  clearError: () => set({ error: null }),
}))

// Listen to auth state changes
onAuthStateChanged(auth, async (user) => {
  if (user) {
    const tokenResult = await user.getIdTokenResult()
    const isAdmin = tokenResult.claims.admin === true
    useAuthStore.setState({ user, isAdmin, loading: false })
  } else {
    useAuthStore.setState({ user: null, isAdmin: false, loading: false })
  }
})
