import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { useFirestoreSync } from './hooks/useFirestoreSync'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DailyLogPage from './pages/DailyLogPage'
import FoodListPage from './pages/FoodListPage'
import FoodFormPage from './pages/FoodFormPage'
import MealListPage from './pages/MealListPage'
import MealFormPage from './pages/MealFormPage'
import SettingsPage from './pages/SettingsPage'
import AdminPage from './pages/AdminPage'
import VerifyEmailPage from './pages/VerifyEmailPage'
import BottomNav from './components/BottomNav'
import ScrollToTop from './components/ScrollToTop'
import OfflineIndicator from './components/OfflineIndicator'
import ToastContainer from './components/ToastContainer'
import type { ReactNode } from 'react'
import { useNotificationPermission } from './hooks/useNotificationPermission'

function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuthStore()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!user.emailVerified) {
    return <Navigate to="/verify-email" replace />
  }

  return <>{children}</>
}

function AppShell() {
  useFirestoreSync()
  useNotificationPermission()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <h1 className="text-lg font-bold text-emerald-600 text-center">OpenPlate</h1>
      </header>
      <Routes>
        <Route path="/" element={<DailyLogPage />} />
        <Route path="/foods" element={<FoodListPage />} />
        <Route path="/foods/:id" element={<FoodFormPage />} />
        <Route path="/meals" element={<MealListPage />} />
        <Route path="/meals/:id" element={<MealFormPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
      <BottomNav />
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <OfflineIndicator />
      <ToastContainer />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route
          path="/*"
          element={
            <AuthGuard>
              <AppShell />
            </AuthGuard>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
