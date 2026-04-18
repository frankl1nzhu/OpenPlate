import { useState, useRef } from 'react'
import { useDailyLogStore } from '../store/dailyLogStore'
import { useFoodStore } from '../store/foodStore'
import { useMealStore } from '../store/mealStore'
import { useAuthStore } from '../store/authStore'
import { useGoalStore } from '../store/goalStore'
import { useFitnessGoalStore } from '../store/fitnessGoalStore'
import { sumNutrients } from '../lib/utils'
import { adjustTargetsForExercise } from '../lib/nutrition'
import { NUTRIENT_LABELS, NUTRIENT_UNITS, EMPTY_NUTRIENTS, MACRO_KEYS, MICRO_KEYS, EXERCISE_TYPE_LABELS, FITNESS_GOAL_LABELS } from '../types'
import type { Nutrients, LogEntry, Food, Meal } from '../types'
import AddEntryModal from '../components/AddEntryModal'
import AIQuickRecordModal from '../components/AIQuickRecordModal'
import AITaskBanner from '../components/AITaskBanner'

export default function DailyLogPage() {
  const user = useAuthStore((s) => s.user)
  const { currentLog, selectedDate, setSelectedDate, removeEntry, removeExercise, loading } = useDailyLogStore()
  const { foods } = useFoodStore()
  const { meals } = useMealStore()
  const { goal, homeNutrientKeys } = useGoalStore()
  const { getActiveGoal } = useFitnessGoalStore()
  const [showAddModal, setShowAddModal] = useState(false)
  const [addModalTab, setAddModalTab] = useState<'food' | 'exercise'>('food')
  const [showAIQuickModal, setShowAIQuickModal] = useState(false)
  const dateInputRef = useRef<HTMLInputElement>(null)

  const entries = currentLog?.entries ?? []
  const exercises = currentLog?.exercises ?? []

  const totalNutrients = entries.length > 0
    ? sumNutrients(...entries.map((e) => e.nutrients))
    : { ...EMPTY_NUTRIENTS }

  const baseTargets = goal?.targets ?? EMPTY_NUTRIENTS

  const totalExerciseCalories = exercises.reduce((sum, ex) => sum + ex.caloriesBurned, 0)
  const activeGoal = getActiveGoal(selectedDate)
  const calorieAdj = activeGoal?.calorieAdjustment ?? 0

  const targets = (baseTargets.calories > 0 && (totalExerciseCalories > 0 || calorieAdj !== 0))
    ? adjustTargetsForExercise(baseTargets, totalExerciseCalories, calorieAdj)
    : baseTargets

  const getEntryRef = (entry: LogEntry): Food | Meal | undefined => {
    if (entry.type === 'quick') return undefined
    if (entry.type === 'food') return foods.find((f) => f.id === entry.refId)
    return meals.find((m) => m.id === entry.refId)
  }

  const getEntryName = (entry: LogEntry) => {
    if (entry.name) return entry.name
    if (entry.type === 'quick') return '快速记录'
    const ref = getEntryRef(entry)
    if (!ref) return entry.type === 'food' ? '未知食物' : '未知套餐'
    return ref.name
  }

  const getEntryPhoto = (entry: LogEntry): string | undefined => {
    if (entry.photoURL) return entry.photoURL
    const ref = getEntryRef(entry)
    return ref?.photoURL
  }

  const getEntryUnit = (entry: LogEntry) => {
    if (entry.type === 'quick') return ''
    if (entry.unit) return entry.unit
    if (entry.type === 'meal') return '份'
    const food = foods.find((f) => f.id === entry.refId)
    return food ? `× ${food.defaultQuantity}${food.unit}` : ''
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

  // Whether a nutrient key should be shown based on homeNutrientKeys setting and having a target
  const isActive = (key: keyof Nutrients) => {
    const inSelected = homeNutrientKeys.length > 0
      ? homeNutrientKeys.includes(key)
      : MACRO_KEYS.includes(key)
    return inSelected && (targets[key] || 0) > 0
  }

  const getProgressColor = (actual: number, target: number) => {
    if (!target) return 'bg-emerald-400'
    const pct = (actual / target) * 100
    if (pct < 80) return 'bg-emerald-400'
    if (pct <= 100) return 'bg-emerald-500'
    return 'bg-amber-500'
  }

  // Two-line row: label + value on top, full-width progress bar below.
  // All bars span the same full width. Child rows indent only the text line, not the bar.
  const renderNRow = (label: string, actual: number, target: number, unit: string, indented = false) => {
    const pct = target > 0 ? Math.min(100, (actual / target) * 100) : 0
    return (
      <div className={indented ? 'pl-4' : ''}>
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-xs text-gray-600 whitespace-nowrap">{label}</span>
          <span className="text-xs tabular-nums ml-2 whitespace-nowrap shrink-0">
            <span className="text-gray-700">{Math.round(actual)}</span>
            <span className="text-gray-400"> / {Math.round(target)} {unit}</span>
          </span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${getProgressColor(actual, target)}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    )
  }

  const renderParentLabel = (label: string) => (
    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide pt-1">{label}</div>
  )

  const getEntryIconClass = (type: string) => {
    if (type === 'quick') return 'bg-blue-100 text-blue-600'
    if (type === 'meal') return 'bg-orange-100 text-orange-600'
    return 'bg-emerald-100 text-emerald-600'
  }

  const getEntryIconChar = (entry: LogEntry) => {
    const name = getEntryName(entry)
    if (name[0]) return name[0]
    if (entry.type === 'quick') return '快'
    return entry.type === 'food' ? '食' : '餐'
  }

  const showProtein = isActive('completeProtein') || isActive('incompleteProtein')
  const showFat = isActive('fat') || isActive('saturatedFat') || isActive('monounsaturatedFat') || isActive('polyunsaturatedFat')

  return (
    <div className="pb-20">
      {/* Date selector */}
      <div className="bg-white px-4 py-3 flex items-center justify-between border-b border-gray-100">
        <button onClick={() => handleDateChange(-1)} className="p-2 text-gray-400" aria-label="前一天">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          onClick={() => dateInputRef.current?.showPicker?.() ?? dateInputRef.current?.click()}
          className="text-center relative"
        >
          <div className="flex items-center gap-2">
            <div className="text-sm font-medium">
              {isToday ? '今天' : selectedDate}
            </div>
            {activeGoal && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                activeGoal.type === 'bulk' ? 'bg-blue-100 text-blue-600'
                : activeGoal.type === 'cut' ? 'bg-orange-100 text-orange-600'
                : 'bg-emerald-100 text-emerald-600'
              }`}>
                {FITNESS_GOAL_LABELS[activeGoal.type]}
              </span>
            )}
          </div>
          {isToday && <div className="text-xs text-gray-400">{selectedDate}</div>}
          <input
            ref={dateInputRef}
            type="date"
            value={selectedDate}
            onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
          />
        </button>
        <button onClick={() => handleDateChange(1)} className="p-2 text-gray-400" aria-label="后一天">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* AI task status banner */}
      <AITaskBanner type="quick" />

      {/* Nutrient summary */}
      <div className="px-4 py-3 bg-white mb-2">
        {/* Exercise calories */}
        {totalExerciseCalories > 0 && (
          <div className="text-center text-xs text-purple-500 mb-2.5">
            运动消耗 {totalExerciseCalories} kcal
          </div>
        )}

        {/* Hierarchical nutrient rows */}
        <div className="space-y-2.5">
          {isActive('calories') && renderNRow('热量', totalNutrients.calories, targets.calories, 'kcal')}
          {isActive('carbs') && renderNRow('碳水', totalNutrients.carbs, targets.carbs, 'g')}

          {showProtein && (
            <>
              {renderParentLabel('蛋白')}
              {isActive('completeProtein') && renderNRow('完全蛋白', totalNutrients.completeProtein, targets.completeProtein, 'g', true)}
              {isActive('incompleteProtein') && renderNRow('不完全蛋白', totalNutrients.incompleteProtein, targets.incompleteProtein, 'g', true)}
            </>
          )}

          {showFat && (
            <>
              {renderParentLabel('脂肪')}
              {isActive('fat') && renderNRow('脂肪总量', totalNutrients.fat, targets.fat, 'g', true)}
              {isActive('saturatedFat') && renderNRow('饱和脂肪', totalNutrients.saturatedFat, targets.saturatedFat, 'g', true)}
              {isActive('monounsaturatedFat') && renderNRow('单不饱和脂肪', totalNutrients.monounsaturatedFat, targets.monounsaturatedFat, 'g', true)}
              {isActive('polyunsaturatedFat') && renderNRow('多不饱和脂肪', totalNutrients.polyunsaturatedFat, targets.polyunsaturatedFat, 'g', true)}
            </>
          )}

          {isActive('fiber') && renderNRow('膳食纤维', totalNutrients.fiber, targets.fiber, 'g')}
          {isActive('sodium') && renderNRow('钠', totalNutrients.sodium, targets.sodium, 'mg')}

          {MICRO_KEYS.filter(isActive).map((key) => (
            <div key={key}>
              {renderNRow(NUTRIENT_LABELS[key], totalNutrients[key], targets[key], NUTRIENT_UNITS[key])}
            </div>
          ))}
        </div>
      </div>

      {/* Entry list */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-700">饮食记录</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAIQuickModal(true)}
              disabled={loading}
              className="bg-blue-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50"
            >
              AI记录
            </button>
            <button
              onClick={() => { setAddModalTab('food'); setShowAddModal(true) }}
              disabled={loading}
              className="bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50"
            >
              + 添加
            </button>
          </div>
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
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm shrink-0 ${getEntryIconClass(entry.type)}`}>
                      {getEntryIconChar(entry)}
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

      {/* Exercise records */}
      <div className="px-4 mt-2">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-700">运动记录</h3>
          <button
            onClick={() => { setAddModalTab('exercise'); setShowAddModal(true) }}
            disabled={loading}
            className="bg-purple-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            + 添加
          </button>
        </div>

        {exercises.length === 0 ? (
          <div className="text-center py-6 text-gray-400 text-sm">
            今日还没有运动记录
          </div>
        ) : (
          <div className="space-y-2">
            {exercises.map((ex) => (
              <div
                key={ex.id}
                className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100"
              >
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600 text-sm shrink-0">
                  {EXERCISE_TYPE_LABELS[ex.exerciseType]?.[0] || '动'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{EXERCISE_TYPE_LABELS[ex.exerciseType]}</div>
                  <div className="text-xs text-gray-400">
                    {ex.durationMinutes} 分钟 · {ex.caloriesBurned} kcal
                  </div>
                </div>
                <button
                  onClick={() => user && removeExercise(user.uid, ex.id)}
                  className="text-gray-300 p-1 shrink-0"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAddModal && (
        <AddEntryModal defaultTab={addModalTab} onClose={() => setShowAddModal(false)} />
      )}

      {showAIQuickModal && (
        <AIQuickRecordModal onClose={() => setShowAIQuickModal(false)} />
      )}
    </div>
  )
}
