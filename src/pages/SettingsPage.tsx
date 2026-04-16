import { useState, useEffect, type FormEvent } from 'react'
import { useGoalStore } from '../store/goalStore'
import { useAuthStore } from '../store/authStore'
import { useFoodStore } from '../store/foodStore'
import { useMealStore } from '../store/mealStore'
import { NUTRIENT_LABELS, NUTRIENT_UNITS, EMPTY_NUTRIENTS, MACRO_KEYS, MICRO_KEYS, ALL_NUTRIENT_KEYS } from '../types'
import type { Nutrients } from '../types'
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { DailyLog, LogEntry, Food, Meal } from '../types'

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user)
  const { signOut } = useAuthStore()
  const { goal, loading, setGoal, showMicroOnHome, setShowMicroOnHome } = useGoalStore()
  const { foods } = useFoodStore()
  const { meals } = useMealStore()

  const [targets, setTargets] = useState<Nutrients>({ ...EMPTY_NUTRIENTS })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showMicro, setShowMicro] = useState(false)

  // Export state
  const [exportStart, setExportStart] = useState('')
  const [exportEnd, setExportEnd] = useState('')
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    if (goal?.targets) {
      setTargets({ ...EMPTY_NUTRIENTS, ...goal.targets })
      const hasMicro = MICRO_KEYS.some((k) => ((goal.targets)[k] || 0) > 0)
      if (hasMicro) setShowMicro(true)
    }
  }, [goal])

  // Set default export date range
  useEffect(() => {
    const today = new Date()
    const weekAgo = new Date(today)
    weekAgo.setDate(weekAgo.getDate() - 7)
    setExportEnd(today.toISOString().split('T')[0])
    setExportStart(weekAgo.toISOString().split('T')[0])
  }, [])

  const handleChange = (key: keyof Nutrients, value: string) => {
    const num = parseFloat(value) || 0
    setTargets((prev) => ({ ...prev, [key]: Math.min(num, 99999) }))
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

  const getEntryName = (entry: LogEntry): string => {
    if (entry.name) return entry.name
    if (entry.type === 'quick') return '快速记录'
    if (entry.type === 'food') {
      const food = foods.find((f: Food) => f.id === entry.refId)
      return food?.name ?? '未知食物'
    }
    const meal = meals.find((m: Meal) => m.id === entry.refId)
    return meal?.name ?? '未知套餐'
  }

  const handleExport = async () => {
    if (!user || !exportStart || !exportEnd) return
    setExporting(true)
    try {
      const q = query(
        collection(db, 'dailyLogs'),
        where('userId', '==', user.uid),
        where('date', '>=', exportStart),
        where('date', '<=', exportEnd),
        orderBy('date'),
      )
      const snapshot = await getDocs(q)
      const logs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as DailyLog))

      // Build CSV
      const nutrientKeys = ALL_NUTRIENT_KEYS
      const headers = ['日期', '名称', '类型', '数量', ...nutrientKeys.map((k) => `${NUTRIENT_LABELS[k]} (${NUTRIENT_UNITS[k]})`)]
      const rows: string[][] = []

      for (const log of logs) {
        for (const entry of log.entries) {
          const name = getEntryName(entry)
          const typeLabel = entry.type === 'food' ? '食物' : entry.type === 'meal' ? '套餐' : '快速'
          const row = [
            log.date,
            name,
            typeLabel,
            String(entry.quantity),
            ...nutrientKeys.map((k) => String(Math.round((entry.nutrients[k] || 0) * 100) / 100)),
          ]
          rows.push(row)
        }
      }

      const csvContent = [headers, ...rows]
        .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
        .join('\n')

      // BOM for Excel Chinese support
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `openplate_${exportStart}_${exportEnd}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
      alert('导出失败，如果是首次导出可能需要创建索引，请检查控制台')
    } finally {
      setExporting(false)
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
                max={99999}
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
                max={99999}
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

      {/* Show micro on home toggle */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-sm text-gray-700">首页显示微量元素进度</span>
          <div
            onClick={() => setShowMicroOnHome(!showMicroOnHome)}
            className={`relative w-11 h-6 rounded-full transition-colors ${showMicroOnHome ? 'bg-emerald-500' : 'bg-gray-300'}`}
          >
            <div
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${showMicroOnHome ? 'translate-x-5' : ''}`}
            />
          </div>
        </label>
      </div>

      {/* Export */}
      <div className="mt-6 pt-4 border-t border-gray-200 space-y-3">
        <h3 className="text-sm font-bold text-gray-700">导出数据</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">开始日期</label>
            <input
              type="date"
              value={exportStart}
              onChange={(e) => setExportStart(e.target.value)}
              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">结束日期</label>
            <input
              type="date"
              value={exportEnd}
              onChange={(e) => setExportEnd(e.target.value)}
              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting || !exportStart || !exportEnd}
          className="w-full py-2.5 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
        >
          {exporting ? '导出中...' : '导出 CSV'}
        </button>
      </div>

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
