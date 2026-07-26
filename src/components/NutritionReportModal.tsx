import { useState, useEffect } from 'react'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuthStore } from '../store/authStore'
import { useGoalStore } from '../store/goalStore'
import { useScrollLock } from '../hooks/useScrollLock'
import type { DailyLog } from '../types'
import { EMPTY_NUTRIENTS } from '../types'
import { sumNutrients, formatDate } from '../lib/utils'

interface Props {
  onClose: () => void
}

type Period = '7days' | '30days'

export default function NutritionReportModal({ onClose }: Props) {
  useScrollLock(true)
  const user = useAuthStore((s) => s.user)
  const goal = useGoalStore((s) => s.goal)
  const [period, setPeriod] = useState<Period>('7days')
  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState<DailyLog[]>([])

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

  const daysCount = period === '7days' ? 7 : 30
  const targets = goal?.targets ?? EMPTY_NUTRIENTS

  // Average calculation
  const totalDaysWithLogs = logs.filter((l) => l.entries && l.entries.length > 0).length || 1
  const aggregated = sumNutrients(...logs.flatMap((l) => l.entries ? l.entries.map((e) => e.nutrients) : []))

  const avgCalories = Math.round(aggregated.calories / totalDaysWithLogs)
  const avgCarbs = Math.round(aggregated.carbs / totalDaysWithLogs)
  const avgProtein = Math.round((aggregated.completeProtein + aggregated.incompleteProtein || aggregated.protein) / totalDaysWithLogs)
  const avgFat = Math.round(aggregated.fat / totalDaysWithLogs)
  const avgSodium = Math.round(aggregated.sodium / totalDaysWithLogs)
  const avgFiber = Math.round(aggregated.fiber / totalDaysWithLogs)

  // Report cards check
  const getStatus = (actual: number, target: number, isUpperLimit = false) => {
    if (!target) return { type: 'normal', text: '无目标' }
    const pct = (actual / target) * 100
    if (isUpperLimit) {
      if (pct > 120) return { type: 'danger', text: `超标 ${Math.round(pct - 100)}%` }
      if (pct > 100) return { type: 'warning', text: `偏高 ${Math.round(pct - 100)}%` }
      return { type: 'good', text: '达标' }
    } else {
      if (pct < 70) return { type: 'danger', text: `不足 ${Math.round(100 - pct)}%` }
      if (pct < 90) return { type: 'warning', text: `偏低 ${Math.round(100 - pct)}%` }
      if (pct > 125) return { type: 'warning', text: `偏高 ${Math.round(pct - 100)}%` }
      return { type: 'good', text: '达标' }
    }
  }

  const calStatus = getStatus(avgCalories, targets.calories)
  const carbsStatus = getStatus(avgCarbs, targets.carbs)
  const proteinStatus = getStatus(avgProtein, targets.protein || (targets.completeProtein + targets.incompleteProtein))
  const fatStatus = getStatus(avgFat, targets.fat)
  const sodiumStatus = getStatus(avgSodium, targets.sodium || 2000, true) // Upper limit
  const fiberStatus = getStatus(avgFiber, targets.fiber || 25)

  // Summary generation
  const warnings: string[] = []
  if (sodiumStatus.type === 'danger' || sodiumStatus.type === 'warning') {
    warnings.push(`钠摄入量平均为 ${avgSodium} mg，超出健康参考范围，建议减少用盐及高钠酱料。`)
  }
  if (fiberStatus.type === 'danger' || fiberStatus.type === 'warning') {
    warnings.push(`膳食纤维平均仅 ${avgFiber} g (目标 ${targets.fiber || 25} g)，建议适当增加全谷物与新鲜蔬菜。`)
  }
  if (calStatus.type === 'danger' && avgCalories > targets.calories) {
    warnings.push(`日均热量明显超标 (${avgCalories} / ${targets.calories} kcal)，注意控制总摄入。`)
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
      <div className="bg-white w-full max-w-lg rounded-2xl max-h-[85vh] flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between shrink-0">
          <h3 className="font-bold text-gray-800 text-sm">定期营养评估报告</h3>
          <button onClick={onClose} className="text-gray-400 text-sm">关闭</button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {/* Period selector */}
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            {(['7days', '30days'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  period === p ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500'
                }`}
              >
                {p === '7days' ? '近 7 天报告' : '近 30 天报告'}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Executive Summary */}
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 space-y-1">
                <div className="text-xs font-bold text-emerald-800 flex items-center gap-1">
                  <span>📊 综合评估结论</span>
                  <span className="text-emerald-600 font-normal">({totalDaysWithLogs}/{daysCount} 天有记录)</span>
                </div>
                <p className="text-xs text-emerald-700 leading-relaxed">
                  {warnings.length > 0
                    ? warnings.join(' ')
                    : '整体营养摄入比例良好，各项指标均在目标范围内，请继续保持！'}
                </p>
              </div>

              {/* Key Indicators Grid */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: '平均热量', actual: avgCalories, target: targets.calories, unit: 'kcal', status: calStatus },
                  { label: '平均蛋白质', actual: avgProtein, target: targets.protein || (targets.completeProtein + targets.incompleteProtein), unit: 'g', status: proteinStatus },
                  { label: '平均碳水', actual: avgCarbs, target: targets.carbs, unit: 'g', status: carbsStatus },
                  { label: '平均脂肪', actual: avgFat, target: targets.fat, unit: 'g', status: fatStatus },
                  { label: '平均钠', actual: avgSodium, target: targets.sodium || 2000, unit: 'mg', status: sodiumStatus },
                  { label: '平均膳食纤维', actual: avgFiber, target: targets.fiber || 25, unit: 'g', status: fiberStatus },
                ].map((item) => (
                  <div key={item.label} className="bg-gray-50 rounded-xl p-3 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">{item.label}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        item.status.type === 'good' ? 'bg-emerald-100 text-emerald-700' :
                        item.status.type === 'warning' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {item.status.text}
                      </span>
                    </div>
                    <div className="mt-2">
                      <span className="text-base font-bold text-gray-800">{item.actual}</span>
                      <span className="text-xs text-gray-400 font-normal"> / {item.target} {item.unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
