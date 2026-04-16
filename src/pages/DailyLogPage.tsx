import { useState } from 'react'
import { useDailyLogStore } from '../store/dailyLogStore'
import { useFoodStore } from '../store/foodStore'
import { useMealStore } from '../store/mealStore'
import { useAuthStore } from '../store/authStore'
import { useGoalStore } from '../store/goalStore'
import { sumNutrients } from '../lib/utils'
import { NUTRIENT_LABELS, EMPTY_NUTRIENTS, MACRO_KEYS } from '../types'
import type { Nutrients, LogEntry, Food, Meal } from '../types'
import AddEntryModal from '../components/AddEntryModal'

export default function DailyLogPage() {
  const user = useAuthStore((s) => s.user)
  const { currentLog, selectedDate, setSelectedDate, removeEntry, loading } = useDailyLogStore()
  const { foods } = useFoodStore()
  const { meals } = useMealStore()
  const { goal } = useGoalStore()
  const [showAddModal, setShowAddModal] = useState(false)

  const entries = currentLog?.entries ?? []

  const totalNutrients = entries.length > 0
    ? sumNutrients(...entries.map((e) => e.nutrients))
    : { ...EMPTY_NUTRIENTS }

  const targets = goal?.targets ?? EMPTY_NUTRIENTS

  const getEntryRef = (entry: LogEntry): Food | Meal | undefined => {
    if (entry.type === 'food') return foods.find((f) => f.id === entry.refId)
    return meals.find((m) => m.id === entry.refId)
  }

  const getEntryName = (entry: LogEntry) => {
    const ref = getEntryRef(entry)
    if (!ref) return entry.type === 'food' ? '未知食物' : '未知套餐'
    return ref.name
  }

  const getEntryPhoto = (entry: LogEntry): string | undefined => {
    const ref = getEntryRef(entry)
    return ref?.photoURL
  }

  const getEntryUnit = (entry: LogEntry) => {
    if (entry.type === 'food') {
      const food = foods.find((f) => f.id === entry.refId)
      return food ? `× ${food.defaultQuantity}${food.unit}` : ''
    }
    return '份'
  }

  const handleDateChange = (offset: number) => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + offset)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    setSelectedDate(`${y}-${m}-${day}`)
  }

  const isToday = selectedDate === new Date().toISOString().split('T')[0]

  const getProgress = (key: keyof Nutrients) => {
    if (!targets[key]) return 0
    return Math.min(100, (totalNutrients[key] / targets[key]) * 100)
  }

  const getProgressColor = (key: keyof Nutrients) => {
    const pct = getProgress(key)
    if (pct < 80) return 'bg-emerald-400'
    if (pct <= 100) return 'bg-emerald-500'
    return 'bg-amber-500'
  }

  // Only show progress bars for macro keys that have targets set
  const activeGoalKeys = MACRO_KEYS.filter((k) => (targets[k] || 0) > 0)

  return (
    <div className="pb-20">
      {/* Date selector */}
      <div className="bg-white px-4 py-3 flex items-center justify-between border-b border-gray-100">
        <button onClick={() => handleDateChange(-1)} className="p-1 text-gray-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="text-center">
          <div className="text-sm font-medium">
            {isToday ? '今天' : selectedDate}
          </div>
          {isToday && <div className="text-xs text-gray-400">{selectedDate}</div>}
        </div>
        <button onClick={() => handleDateChange(1)} className="p-1 text-gray-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Nutrient summary */}
      <div className="px-4 py-3 bg-white mb-2">
        <div className="grid grid-cols-4 gap-2 mb-3">
          <div className="text-center">
            <div className="text-lg font-bold text-emerald-600">{Math.round(totalNutrients.calories)}</div>
            <div className="text-xs text-gray-400">热量 kcal</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-blue-600">{Math.round(totalNutrients.carbs * 10) / 10}</div>
            <div className="text-xs text-gray-400">碳水 g</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-orange-600">
              {Math.round((totalNutrients.completeProtein + totalNutrients.incompleteProtein) * 10) / 10}
            </div>
            <div className="text-xs text-gray-400">蛋白 g</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-yellow-600">{Math.round(totalNutrients.fat * 10) / 10}</div>
            <div className="text-xs text-gray-400">脂肪 g</div>
          </div>
        </div>

        {/* Progress bars */}
        {activeGoalKeys.length > 0 && (
          <div className="space-y-1.5">
            {activeGoalKeys.map((key) => (
              <div key={key} className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-16 shrink-0">{NUTRIENT_LABELS[key]}</span>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden min-w-0">
                  <div
                    className={`h-full rounded-full transition-all ${getProgressColor(key)}`}
                    style={{ width: `${Math.min(100, getProgress(key))}%` }}
                  />
                </div>
                <span className="text-xs text-gray-400 shrink-0 tabular-nums whitespace-nowrap">
                  {Math.round(totalNutrients[key])}/{Math.round(targets[key])}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Entry list */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-700">饮食记录</h3>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium"
          >
            + 添加
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">
            今日还没有记录，点击添加
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => {
              const photo = getEntryPhoto(entry)
              return (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100"
                >
                  {photo ? (
                    <img src={photo} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm shrink-0 ${
                      entry.type === 'food' ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'
                    }`}>
                      {getEntryName(entry)[0] || (entry.type === 'food' ? '食' : '餐')}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{getEntryName(entry)}</div>
                    <div className="text-xs text-gray-400">
                      {entry.quantity} {getEntryUnit(entry)} · {Math.round(entry.nutrients.calories)} kcal
                    </div>
                  </div>
                  <button
                    onClick={() => user && removeEntry(user.uid, entry.id)}
                    className="text-gray-300 p-1 shrink-0"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showAddModal && (
        <AddEntryModal onClose={() => setShowAddModal(false)} />
      )}
    </div>
  )
}
