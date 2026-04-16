import { useState, useEffect, type FormEvent } from 'react'
import { useGoalStore } from '../store/goalStore'
import { useAuthStore } from '../store/authStore'
import { NUTRIENT_LABELS, NUTRIENT_UNITS, EMPTY_NUTRIENTS, MACRO_KEYS, MICRO_KEYS } from '../types'
import type { Nutrients } from '../types'

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user)
  const { signOut } = useAuthStore()
  const { goal, loading, setGoal } = useGoalStore()

  const [targets, setTargets] = useState<Nutrients>({ ...EMPTY_NUTRIENTS })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showMicro, setShowMicro] = useState(false)

  useEffect(() => {
    if (goal?.targets) {
      setTargets({ ...EMPTY_NUTRIENTS, ...goal.targets })
      const hasMicro = MICRO_KEYS.some((k) => ((goal.targets)[k] || 0) > 0)
      if (hasMicro) setShowMicro(true)
    }
  }, [goal])

  const handleChange = (key: keyof Nutrients, value: string) => {
    setTargets((prev) => ({ ...prev, [key]: parseFloat(value) || 0 }))
    setSaved(false)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    try {
      await setGoal(user.uid, targets)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error(err)
      alert('保存失败')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="pb-20 px-4 py-4">
      <div className="text-center mb-6">
        <div className="text-sm text-gray-500">{user?.email}</div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <h3 className="text-sm font-bold text-gray-700">每日目标摄入</h3>
        <p className="text-xs text-gray-400">设置为 0 表示不追踪该指标</p>

        <div className="space-y-3">
          <h4 className="text-xs font-medium text-gray-500 uppercase">宏量营养素</h4>
          {MACRO_KEYS.map((key) => (
            <div key={key} className="flex items-center gap-2">
              <label className="text-sm text-gray-600 w-20 shrink-0">
                {NUTRIENT_LABELS[key]}
              </label>
              <input
                type="number"
                value={targets[key] || ''}
                onChange={(e) => handleChange(key, e.target.value)}
                min={0}
                step="any"
                className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="0"
              />
              <span className="text-xs text-gray-400 w-10">{NUTRIENT_UNITS[key]}</span>
            </div>
          ))}

          <button
            type="button"
            onClick={() => setShowMicro(!showMicro)}
            className="flex items-center gap-1 text-xs font-medium text-gray-500 uppercase mt-2"
          >
            微量元素
            <svg
              className={`w-4 h-4 transition-transform ${showMicro ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showMicro && MICRO_KEYS.map((key) => (
            <div key={key} className="flex items-center gap-2">
              <label className="text-sm text-gray-600 w-20 shrink-0">
                {NUTRIENT_LABELS[key]}
              </label>
              <input
                type="number"
                value={targets[key] || ''}
                onChange={(e) => handleChange(key, e.target.value)}
                min={0}
                step="any"
                className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="0"
              />
              <span className="text-xs text-gray-400 w-10">{NUTRIENT_UNITS[key]}</span>
            </div>
          ))}
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-2.5 bg-emerald-500 text-white font-medium rounded-lg hover:bg-emerald-600 disabled:opacity-50 transition-colors"
        >
          {saving ? '保存中...' : saved ? '已保存' : '保存目标'}
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-gray-200">
        <button
          onClick={signOut}
          className="w-full py-2.5 text-red-500 font-medium rounded-lg border border-red-200 hover:bg-red-50 transition-colors"
        >
          退出登录
        </button>
      </div>
    </div>
  )
}
