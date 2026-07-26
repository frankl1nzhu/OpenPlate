import { useState, useRef } from 'react'
import { useDailyLogStore } from '../store/dailyLogStore'
import { useFoodStore } from '../store/foodStore'
import { useMealStore } from '../store/mealStore'
import { useAuthStore } from '../store/authStore'
import { useGoalStore } from '../store/goalStore'
import { useFitnessGoalStore } from '../store/fitnessGoalStore'
import { useToastStore } from '../store/toastStore'
import { sumNutrients } from '../lib/utils'
import { adjustTargetsForExercise } from '../lib/nutrition'
import { NUTRIENT_LABELS, NUTRIENT_UNITS, EMPTY_NUTRIENTS, MACRO_KEYS, MICRO_KEYS, EXERCISE_TYPE_LABELS, FITNESS_GOAL_LABELS } from '../types'
import type { Nutrients, LogEntry, Food, Meal } from '../types'
import AddEntryModal from '../components/AddEntryModal'
import AIQuickRecordModal from '../components/AIQuickRecordModal'
import AITaskBanner from '../components/AITaskBanner'
import NutritionReportModal from '../components/NutritionReportModal'
import NutritionTrendsModal from '../components/NutritionTrendsModal'

export default function DailyLogPage() {
  const user = useAuthStore((s) => s.user)
  const { currentLog, selectedDate, setSelectedDate, removeEntry, removeExercise, copyLogToDate, loading } = useDailyLogStore()
  const { foods } = useFoodStore()
  const { meals } = useMealStore()
  const { goal, homeNutrientKeys } = useGoalStore()
  const { getActiveGoal } = useFitnessGoalStore()
  const [showAddModal, setShowAddModal] = useState(false)
  const [addModalTab, setAddModalTab] = useState<'food' | 'exercise'>('food')
  const [showAIQuickModal, setShowAIQuickModal] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [showTrendsModal, setShowTrendsModal] = useState(false)
  const [showCopyModal, setShowCopyModal] = useState(false)
  const [copyTargetDate, setCopyTargetDate] = useState('')
  const [copying, setCopying] = useState(false)
  const dateInputRef = useRef<HTMLInputElement>(null)
  const addToast = useToastStore((s) => s.addToast)


  const handleDeleteEntry = (entryId: string, entryName: string) => {
    if (!user) return
    setPendingDeletes(prev => new Set(prev).add(entryId))
    
    const timerId = setTimeout(() => {
      removeEntry(user.uid, entryId)
      setPendingDeletes(prev => {
        const next = new Set(prev)
        next.delete(entryId)
        return next
      })
    }, 6500)
    
    addToast(`已删除「${entryName}」`, {
      type: 'info',
      duration: 6000,
      actionLabel: '撤销',
      action: () => {
        clearTimeout(timerId)
        setPendingDeletes(prev => {
          const next = new Set(prev)
          next.delete(entryId)
          return next
        })
      },
    })
  }

  const handleDeleteExercise = (exerciseId: string, exerciseName: string) => {
    if (!user) return
    setPendingDeletes(prev => new Set(prev).add(exerciseId))
    
    const timerId = setTimeout(() => {
      removeExercise(user.uid, exerciseId)
      setPendingDeletes(prev => {
        const next = new Set(prev)
        next.delete(exerciseId)
        return next
      })
    }, 6500)
    
    addToast(`已删除「${exerciseName}」`, {
      type: 'info',
      duration: 6000,
      actionLabel: '撤销',
      action: () => {
        clearTimeout(timerId)
        setPendingDeletes(prev => {
          const next = new Set(prev)
          next.delete(exerciseId)
          return next
        })
      },
    })
  }

  const allEntries = currentLog?.entries ?? []
  const allExercises = currentLog?.exercises ?? []
  const [pendingDeletes, setPendingDeletes] = useState<Set<string>>(new Set())
  const entries = allEntries.filter(e => !pendingDeletes.has(e.id))
  const exercises = allExercises.filter(e => !pendingDeletes.has(e.id))

  const mealGroups = entries.reduce<{ mealIndex: number; entries: LogEntry[] }[]>((groups, entry, index) => {
    const mealIndex = entry.mealIndex ?? index + 1
    const group = groups.find((item) => item.mealIndex === mealIndex)
    if (group) group.entries.push(entry)
    else groups.push({ mealIndex, entries: [entry] })
    return groups
  }, [])

  const getMealTitle = (index: number) => {
    const chineseNumbers = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十']
    return index <= 10 ? `第${chineseNumbers[index]}顿` : `第${index}顿`
  }

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

  const isActive = (key: keyof Nutrients) => {
    const inSelected = homeNutrientKeys.length > 0
      ? homeNutrientKeys.includes(key)
      : MACRO_KEYS.includes(key)
    return inSelected && (targets[key] || 0) > 0
  }

  const getRingColor = (actual: number, target: number) => {
    if (!target) return '#34d399'
    const pct = (actual / target) * 100
    if (pct < 80) return '#34d399'
    if (pct <= 100) return '#10b981'
    return '#f59e0b'
  }

  const renderNRing = (label: string, actual: number, target: number, unit: string) => {
    const pct = target > 0 ? Math.min(100, (actual / target) * 100) : 0
    const r = 24
    const sw = 4
    const vb = 60
    const cx = 30
    const circ = 2 * Math.PI * r
    const dash = circ * (1 - pct / 100)
    const color = getRingColor(actual, target)

    return (
      <div className="flex flex-col items-center">
        <div className="relative w-full aspect-square">
          <svg
            viewBox={`0 0 ${vb} ${vb}`}
            className="absolute inset-0 w-full h-full"
            style={{ transform: 'rotate(-90deg)' }}
          >
            <circle cx={cx} cy={cx} r={r} fill="none" stroke="#f3f4f6" strokeWidth={sw} />
            <circle
              cx={cx} cy={cx} r={r}
              fill="none"
              stroke={color}
              strokeWidth={sw}
              strokeDasharray={circ}
              strokeDashoffset={dash}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center px-1.5 gap-0.5">
            <span className="text-[10px] leading-tight text-gray-500 text-center">{label}</span>
            <span className="text-[13px] font-bold text-gray-800 tabular-nums leading-tight">{Math.round(actual)}</span>
            <span className="text-[9px] text-gray-400 leading-none tabular-nums">/{Math.round(target)} {unit}</span>
          </div>
        </div>
      </div>
    )
  }

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

  const totalProteinActual = totalNutrients.completeProtein + totalNutrients.incompleteProtein
  const totalProteinTarget = targets.protein || (targets.completeProtein + targets.incompleteProtein)

  return (
    <div className="pb-20">
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

      <div className="px-4 py-1.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between text-xs">
        <button
          onClick={() => { setCopyTargetDate(selectedDate); setShowCopyModal(true) }}
          disabled={loading || entries.length === 0}
          className="text-emerald-600 font-medium hover:underline disabled:opacity-40"
        >
          📋 复制今日记录
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowTrendsModal(true)}
            className="text-gray-600 font-medium hover:text-emerald-600"
          >
            📈 趋势图表
          </button>
          <button
            onClick={() => setShowReportModal(true)}
            className="text-gray-600 font-medium hover:text-emerald-600"
          >
            📊 营养报告
          </button>
        </div>
      </div>

      <AITaskBanner type="quick" />

      <div className="px-4 py-2 bg-white border-b border-gray-100 flex gap-2">
        <button
          onClick={() => setShowAIQuickModal(true)}
          disabled={loading}
          className="flex-1 bg-blue-500 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50"
        >
          AI快速记录
        </button>
        <button
          onClick={() => { setAddModalTab('food'); setShowAddModal(true) }}
          disabled={loading}
          className="flex-1 bg-emerald-500 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50"
        >
          + 添加饮食
        </button>
        <button
          onClick={() => { setAddModalTab('exercise'); setShowAddModal(true) }}
          disabled={loading}
          className="flex-1 bg-purple-500 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50"
        >
          + 添加运动
        </button>
      </div>

      <div className="px-4 py-3 bg-white mb-2">
        {totalExerciseCalories > 0 && (
          <div className="text-center text-xs text-purple-500 mb-2.5">
            运动消耗 {totalExerciseCalories} kcal
          </div>
        )}

        <div className="grid grid-cols-3 gap-3">
          {isActive('calories') && renderNRing('热量', totalNutrients.calories, targets.calories, 'kcal')}
          {isActive('carbs') && renderNRing('碳水', totalNutrients.carbs, targets.carbs, 'g')}
          {isActive('protein') && renderNRing('蛋白质', totalProteinActual, totalProteinTarget, 'g')}
          {isActive('completeProtein') && renderNRing('完全蛋白', totalNutrients.completeProtein, targets.completeProtein, 'g')}
          {isActive('incompleteProtein') && renderNRing('不完全蛋白', totalNutrients.incompleteProtein, targets.incompleteProtein, 'g')}
          {isActive('fat') && renderNRing('脂肪', totalNutrients.fat, targets.fat, 'g')}
          {isActive('saturatedFat') && renderNRing('饱和脂肪', totalNutrients.saturatedFat, targets.saturatedFat, 'g')}
          {isActive('monounsaturatedFat') && renderNRing('单不饱和', totalNutrients.monounsaturatedFat, targets.monounsaturatedFat, 'g')}
          {isActive('polyunsaturatedFat') && renderNRing('多不饱和', totalNutrients.polyunsaturatedFat, targets.polyunsaturatedFat, 'g')}
          {isActive('fiber') && renderNRing('膳食纤维', totalNutrients.fiber, targets.fiber, 'g')}
          {isActive('sodium') && renderNRing('钠', totalNutrients.sodium, targets.sodium, 'mg')}
          {MICRO_KEYS.filter(isActive).map((key) => (
            <div key={key} style={{ display: 'contents' }}>
              {renderNRing(NUTRIENT_LABELS[key], totalNutrients[key], targets[key], NUTRIENT_UNITS[key])}
            </div>
          ))}
        </div>
      </div>

      <div className="px-4">
        <div className="mb-2">
          <h3 className="text-sm font-medium text-gray-700">饮食记录</h3>
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
          <div className="space-y-3">
            {mealGroups.map((group) => {
              const mealCalories = group.entries.reduce((total, entry) => total + entry.nutrients.calories, 0)
              return (
                <section key={group.mealIndex} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                  <div className="px-3 py-2 flex items-center justify-between bg-emerald-50 border-b border-emerald-100">
                    <h4 className="text-sm font-medium text-emerald-800">{getMealTitle(group.mealIndex)}</h4>
                    <span className="text-xs text-emerald-600">{Math.round(mealCalories)} kcal · {group.entries.length} 项</span>
                  </div>
                  {group.entries.map((entry) => {
                    const photo = getEntryPhoto(entry)
                    return (
                      <div key={entry.id} className="flex items-center gap-3 p-3 border-b border-gray-50 last:border-b-0">
                        {photo ? <img src={photo} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" /> : <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm shrink-0 ${getEntryIconClass(entry.type)}`}>{getEntryIconChar(entry)}</div>}
                        <div className="flex-1 min-w-0"><div className="text-sm font-medium truncate">{getEntryName(entry)}</div><div className="text-xs text-gray-400">{entry.quantity} {getEntryUnit(entry)} · {Math.round(entry.nutrients.calories)} kcal</div></div>
                        <button onClick={() => handleDeleteEntry(entry.id, getEntryName(entry))} className="text-gray-300 p-1 shrink-0" aria-label={`删除${getEntryName(entry)}`}><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                      </div>
                    )
                  })}
                </section>
              )
            })}
          </div>
        )}
      </div>

      <div className="px-4 mt-2">
        <div className="mb-2">
          <h3 className="text-sm font-medium text-gray-700">运动记录</h3>
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
                  onClick={() => handleDeleteExercise(ex.id, EXERCISE_TYPE_LABELS[ex.exerciseType])}
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

      {showTrendsModal && (
        <NutritionTrendsModal onClose={() => setShowTrendsModal(false)} />
      )}

      {showReportModal && (
        <NutritionReportModal onClose={() => setShowReportModal(false)} />
      )}

      {showCopyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-4 space-y-3">
            <h3 className="font-bold text-gray-800 text-sm">复制 {selectedDate} 的记录</h3>
            <p className="text-xs text-gray-500">将当前日期的全部饮食和运动记录批量复制到目标日期：</p>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">目标日期</label>
              <input
                type="date"
                value={copyTargetDate}
                onChange={(e) => setCopyTargetDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCopyModal(false)}
                className="flex-1 py-2 border border-gray-300 text-gray-600 text-sm rounded-lg"
              >
                取消
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!user || !copyTargetDate) return
                  setCopying(true)
                  try {
                    await copyLogToDate(user.uid, selectedDate, copyTargetDate)
                    addToast(`已成功复制记录到 ${copyTargetDate}`, { type: 'success' })
                    setShowCopyModal(false)
                  } catch (err) {
                    console.error(err)
                    addToast('复制失败，请重试', { type: 'error' })
                  } finally {
                    setCopying(false)
                  }
                }}
                disabled={copying || !copyTargetDate || copyTargetDate === selectedDate}
                className="flex-1 py-2 bg-emerald-500 text-white text-sm font-medium rounded-lg disabled:opacity-50"
              >
                {copying ? '复制中...' : '确认复制'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
