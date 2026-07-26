import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { useFirestoreSync } from './hooks/useFirestoreSync'
import BottomNav from './components/BottomNav'
import ScrollToTop from './components/ScrollToTop'
import OfflineIndicator from './components/OfflineIndicator'
import ToastContainer from './components/ToastContainer'
import ErrorBoundary from './components/ErrorBoundary'
import { Suspense, lazy, type ReactNode } from 'react'
import { useNotificationPermission } from './hooks/useNotificationPermission'
import { useFCM } from './hooks/useFCM'

const LoginPage = lazy(() => import('./pages/LoginPage'))
const RegisterPage = lazy(() => import('./pages/RegisterPage'))
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage'))
const DailyLogPage = lazy(() => import('./pages/DailyLogPage'))
const FoodListPage = lazy(() => import('./pages/FoodListPage'))
const FoodFormPage = lazy(() => import('./pages/FoodFormPage'))
const MealListPage = lazy(() => import('./pages/MealListPage'))
const MealFormPage = lazy(() => import('./pages/MealFormPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const AdminPage = lazy(() => import('./pages/AdminPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

const PageLoading = () => (
  <div className="flex items-center justify-center py-20">
    <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
  </div>
)

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
  useFCM()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <h1 className="text-lg font-bold text-emerald-600 text-center">OpenPlate</h1>
      </header>
      <ErrorBoundary>
        <Suspense fallback={<PageLoading />}>
          <Routes>
            <Route path="/" element={<DailyLogPage />} />
            <Route path="/foods" element={<FoodListPage />} />
            <Route path="/foods/:id" element={<FoodFormPage />} />
            <Route path="/meals" element={<MealListPage />} />
            <Route path="/meals/:id" element={<MealFormPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
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
      <Suspense fallback={<PageLoading />}>
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
      </Suspense>
    </BrowserRouter>
  )
}

export default App
