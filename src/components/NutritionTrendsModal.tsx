import { useState, useEffect } from 'react'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuthStore } from '../store/authStore'
import { useGoalStore } from '../store/goalStore'
import { useScrollLock } from '../hooks/useScrollLock'
import type { DailyLog } from '../types'
import { NUTRIENT_LABELS, NUTRIENT_UNITS } from '../types'
import { sumNutrients, formatDate } from '../lib/utils'

interface Props {
  onClose: () => void
}

type Period = '7days' | '30days'
type MetricKey = 'calories' | 'carbs' | 'protein' | 'fat'

export default function NutritionTrendsModal({ onClose }: Props) {
  useScrollLock(true)
  const user = useAuthStore((s) => s.user)
  const goal = useGoalStore((s) => s.goal)
  const [period, setPeriod] = useState<Period>('7days')
  const [metric, setMetric] = useState<MetricKey>('calories')
  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState<DailyLog[]>([])
  const [hoveredData, setHoveredData] = useState<{ date: string; val: number } | null>(null)

  useEffect(() => {
    if (!user) return
    let mounted = true
    setLoading(true)

    const days = period === '7days' ? 7 : 30
    const today = new Date()
    const startDate = new Date(today)
    startDate.setDate(today.getDate() - (days - 1))
    const startStr = formatDate(startDate)
    const endStr = formatDate(today)

    const q = query(
      collection(db, 'dailyLogs'),
      where('userId', '==', user.uid),
    )

    getDocs(q)
      .then((snapshot) => {
        if (!mounted) return
        const fetched = snapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() } as DailyLog))
          .filter((l) => l.date >= startStr && l.date <= endStr)
        setLogs(fetched)
      })
      .catch((err) => console.error(err))
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [user, period])

  // Build daily data array for the period
  const daysCount = period === '7days' ? 7 : 30
  const dailyPoints: { date: string; shortDate: string; value: number }[] = []
  const today = new Date()

  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const dateStr = formatDate(d)
    const shortDate = `${d.getMonth() + 1}/${d.getDate()}`

    const log = logs.find((l) => l.date === dateStr)
    let value = 0
    if (log && log.entries && log.entries.length > 0) {
      const totals = sumNutrients(...log.entries.map((e) => e.nutrients))
      if (metric === 'protein') {
        value = totals.completeProtein + totals.incompleteProtein || totals.protein || 0
      } else {
        value = totals[metric] || 0
      }
    }
    dailyPoints.push({ date: dateStr, shortDate, value: Math.round(value) })
  }

  const targetValue = goal?.targets ? Math.round(goal.targets[metric] || 0) : 0
  const maxValue = Math.max(targetValue * 1.25, ...dailyPoints.map((p) => p.value), 10)

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
      <div className="bg-white w-full max-w-lg rounded-2xl max-h-[85vh] flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between shrink-0">
          <h3 className="font-bold text-gray-800 text-sm">营养摄入趋势</h3>
          <button onClick={onClose} className="text-gray-400 text-sm">关闭</button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {/* Controls */}
          <div className="flex items-center justify-between gap-2">
            {/* Period selector */}
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              {(['7days', '30days'] as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    period === p ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500'
                  }`}
                >
                  {p === '7days' ? '近7天' : '近30天'}
                </button>
              ))}
            </div>

            {/* Metric selector */}
            <div className="flex gap-1">
              {(['calories', 'carbs', 'protein', 'fat'] as MetricKey[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMetric(m)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors ${
                    metric === m
                      ? 'bg-emerald-500 text-white border-emerald-500'
                      : 'border-gray-200 text-gray-600'
                  }`}
                >
                  {NUTRIENT_LABELS[m]}
                </button>
              ))}
            </div>
          </div>

          {/* Value tooltip */}
          <div className="h-6 flex items-center justify-between text-xs text-gray-500 px-1">
            <span>
              {hoveredData ? `${hoveredData.date}: ${hoveredData.val} ${NUTRIENT_UNITS[metric]}` : '点击/触摸柱状图查看具体数值'}
            </span>
            {targetValue > 0 && (
              <span className="text-emerald-600 font-medium">目标: {targetValue} {NUTRIENT_UNITS[metric]}</span>
            )}
          </div>

          {/* SVG Bar Chart */}
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="relative h-48 w-full">
                {/* Target Line */}
                {targetValue > 0 && (
                  <div
                    className="absolute left-0 right-0 border-b-2 border-dashed border-emerald-400 z-10"
                    style={{
                      bottom: `${Math.min(95, (targetValue / maxValue) * 100)}%`,
                    }}
                  />
                )}

                {/* Bars */}
                <div className="h-full flex items-end justify-between gap-1 pt-4 pb-6 px-1">
                  {dailyPoints.map((pt) => {
                    const heightPct = Math.min(100, Math.max(4, (pt.value / maxValue) * 100))
                    const isOver = targetValue > 0 && pt.value > targetValue * 1.15
                    const barColor = pt.value === 0 ? 'bg-gray-200' : isOver ? 'bg-amber-500' : 'bg-emerald-500'

                    return (
                      <div
                        key={pt.date}
                        className="flex-1 flex flex-col items-center h-full justify-end cursor-pointer group"
                        onMouseEnter={() => setHoveredData({ date: pt.date, val: pt.value })}
                        onTouchStart={() => setHoveredData({ date: pt.date, val: pt.value })}
                      >
                        <div
                          className={`w-full rounded-t-sm ${barColor} transition-all duration-300 group-hover:brightness-90`}
                          style={{ height: `${heightPct}%` }}
                        />
                      </div>
                    )
                  })}
                </div>

                {/* X Axis Labels */}
                <div className="absolute bottom-0 left-0 right-0 flex justify-between px-1 text-[9px] text-gray-400">
                  {dailyPoints.filter((_, idx) => period === '7days' || idx % 5 === 0).map((pt) => (
                    <span key={pt.date}>{pt.shortDate}</span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
