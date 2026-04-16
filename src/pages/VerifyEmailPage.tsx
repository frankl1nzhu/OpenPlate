import { useState } from 'react'
import { sendEmailVerification } from 'firebase/auth'
import { useAuthStore } from '../store/authStore'
import { auth } from '../lib/firebase'

export default function VerifyEmailPage() {
  const user = useAuthStore((s) => s.user)
  const { signOut } = useAuthStore()
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const handleResend = async () => {
    if (!auth.currentUser) return
    setSending(true)
    try {
      await sendEmailVerification(auth.currentUser)
      setSent(true)
      setTimeout(() => setSent(false), 5000)
    } catch {
      alert('发送失败，请稍后重试')
    } finally {
      setSending(false)
    }
  }

  const handleRefresh = () => {
    window.location.reload()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mb-6">
          <div className="w-16 h-16 mx-auto mb-4 bg-emerald-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">验证您的邮箱</h2>
          <p className="text-sm text-gray-500">
            验证邮件已发送至 <span className="font-medium text-gray-700">{user?.email}</span>
          </p>
          <p className="text-sm text-gray-400 mt-1">请查看邮箱并点击验证链接</p>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleRefresh}
            className="w-full py-2.5 bg-emerald-500 text-white font-medium rounded-lg hover:bg-emerald-600 transition-colors"
          >
            已验证，刷新页面
          </button>

          <button
            onClick={handleResend}
            disabled={sending || sent}
            className="w-full py-2.5 text-emerald-600 font-medium rounded-lg border border-emerald-200 hover:bg-emerald-50 disabled:opacity-50 transition-colors"
          >
            {sending ? '发送中...' : sent ? '已发送' : '重新发送验证邮件'}
          </button>

          <button
            onClick={signOut}
            className="w-full py-2.5 text-gray-500 text-sm"
          >
            退出登录
          </button>
        </div>
      </div>
    </div>
  )
}
