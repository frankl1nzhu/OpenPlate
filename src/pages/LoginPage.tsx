import { useState, type FormEvent } from 'react'
import { useAuthStore } from '../store/authStore'
import { useNavigate, Link } from 'react-router-dom'
import { useToastStore } from '../store/toastStore'
import { getFirebaseErrorMessage } from '../lib/firebaseErrors'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  
  const [showResetModal, setShowResetModal] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetting, setResetting] = useState(false)
  const [resetError, setResetError] = useState('')

  const { signIn, error, clearError, resetPassword } = useAuthStore()
  const { addToast } = useToastStore()
  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await signIn(email, password)
      navigate('/')
    } catch {
      // error is set in store
    } finally {
      setSubmitting(false)
    }
  }

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault()
    setResetting(true)
    setResetError('')
    try {
      await resetPassword(resetEmail)
      addToast('重置密码邮件已发送，请查看收件箱', { type: 'success' })
      setShowResetModal(false)
    } catch (err: unknown) {
      setResetError(getFirebaseErrorMessage(err))
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-emerald-600">OpenPlate</h1>
          <p className="text-gray-500 mt-2">营养摄入记录</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg" onClick={clearError}>
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="至少6位"
            />
          </div>

          <div className="text-right">
            <button type="button" onClick={() => { setShowResetModal(true); setResetEmail(email) }} className="text-sm text-emerald-600">
              忘记密码？
            </button>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 bg-emerald-500 text-white font-medium rounded-lg hover:bg-emerald-600 disabled:opacity-50 transition-colors"
          >
            {submitting ? '登录中...' : '登录'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          还没有账号？{' '}
          <Link to="/register" className="text-emerald-600 font-medium">
            注册
          </Link>
        </p>
      </div>

      {showResetModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm">
            <h2 className="text-xl font-bold mb-4">重置密码</h2>
            <form onSubmit={handleResetPassword} className="space-y-4">
              {resetError && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">
                  {resetError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="your@email.com"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="flex-1 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={resetting}
                  className="flex-1 py-2 bg-emerald-500 text-white font-medium rounded-lg hover:bg-emerald-600 disabled:opacity-50 transition-colors"
                >
                  {resetting ? '发送中...' : '发送邮件'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
