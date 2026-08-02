import { useState, useMemo } from 'react'
import { useFoodStore } from '../store/foodStore'
import { useMealStore } from '../store/mealStore'
import { useDailyLogStore } from '../store/dailyLogStore'
import { useGoalStore } from '../store/goalStore'
import { useAuthStore } from '../store/authStore'
import { useToastStore } from '../store/toastStore'
import { sumNutrients, getFoodUnits, calculateFoodNutrients, multiplyNutrients } from '../lib/utils'
import { useScrollLock } from '../hooks/useScrollLock'
import NumberInput from './NumberInput'
import AddEntryModal from './AddEntryModal'
import { NUTRIENT_LABELS, NUTRIENT_UNITS, DEFAULT_HOME_NUTRIENT_KEYS, EMPTY_NUTRIENTS } from '../types'
import type { LogEntry, Nutrients } from '../types'

interface Props {
  mealEntries: LogEntry[]
  mealTitle: string
  onClose: () => void
}

export default function EditMealModal({ mealEntries, mealTitle, onClose }: Props) {
  useScrollLock(true)
  const { foods } = useFoodStore()
  const { meals } = useMealStore()
  const { updateEntries, removeEntry } = useDailyLogStore()
  const { homeNutrientKeys } = useGoalStore()
  const user = useAuthStore((s) => s.user)
  const addToast = useToastStore((s) => s.addToast)

  const displayNutrientKeys = homeNutrientKeys.length > 0 ? homeNutrientKeys : DEFAULT_HOME_NUTRIENT_KEYS

  // Local editable state: entries with their current quantity/unit
  const [editableEntries, setEditableEntries] = useState<LogEntry[]>(() =>
    mealEntries.map((e) => ({ ...e }))
  )
  const [submitting, setSubmitting] = useState(false)
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set())
  const [showAddFood, setShowAddFood] = useState(false)

  // Get the mealIndex from existing entries
  const mealIndex = mealEntries[0]?.mealIndex ?? 1

  const activeEntries = editableEntries.filter((e) => !removedIds.has(e.id))

  // Recalculate nutrients for an entry based on its current quantity/unit
  const recalcNutrients = (entry: LogEntry): Nutrients => {
    if (entry.type === 'food') {
      const food = foods.find((f) => f.id === entry.refId)
      if (food) return calculateFoodNutrients(food, entry.quantity, entry.unit)
    }
    if (entry.type === 'meal') {
      const meal = meals.find((m) => m.id === entry.refId)
      if (meal) {
        const mealNutrients = sumNutrients(
          ...meal.foods.map((mf) => {
            const food = foods.find((f) => f.id === mf.foodId)
            return food ? calculateFoodNutrients(food, mf.quantity, mf.unit) : { ...EMPTY_NUTRIENTS }
          })
        )
        return multiplyNutrients(mealNutrients, entry.quantity)
      }
    }
    // quick type: nutrients are stored directly, scale by quantity ratio
    const original = mealEntries.find((e) => e.id === entry.id)
    if (original && original.quantity > 0) {
      const ratio = entry.quantity / original.quantity
      return multiplyNutrients(original.nutrients, ratio)
    }
    return entry.nutrients
  }

  const totalNutrients = useMemo(() => {
    if (activeEntries.length === 0) return { ...EMPTY_NUTRIENTS }
    return sumNutrients(...activeEntries.map(recalcNutrients))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeEntries, foods, meals])

  const updateEntry = (id: string, updates: Partial<Pick<LogEntry, 'quantity' | 'unit'>>) => {
    setEditableEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...updates } : e))
    )
  }

  const handleRemoveEntry = (id: string) => {
    setRemovedIds((prev) => new Set(prev).add(id))
  }

  const getEntryName = (entry: LogEntry) => {
    if (entry.name) return entry.name
    if (entry.type === 'quick') return '快速记录'
    if (entry.type === 'food') {
      const food = foods.find((f) => f.id === entry.refId)
      return food?.name ?? '未知食物'
    }
    const meal = meals.find((m) => m.id === entry.refId)
    return meal?.name ?? '未知套餐'
  }

  const getUnitsForEntry = (entry: LogEntry) => {
    if (entry.type === 'food') {
      const food = foods.find((f) => f.id === entry.refId)
      if (food) return getFoodUnits(food)
    }
    return []
  }

  const getEntryPhoto = (entry: LogEntry): string | undefined => {
    if (entry.photoURL) return entry.photoURL
    if (entry.type === 'food') {
      const food = foods.find((f) => f.id === entry.refId)
      return food?.photoURL
    }
    if (entry.type === 'meal') {
      const meal = meals.find((m) => m.id === entry.refId)
      return meal?.photoURL
    }
    return undefined
  }

  const getEntryIconClass = (type: string) => {
    if (type === 'quick') return 'bg-blue-100 text-blue-600'
    if (type === 'meal') return 'bg-orange-100 text-orange-600'
    return 'bg-emerald-100 text-emerald-600'
  }

  const hasChanges = useMemo(() => {
    if (removedIds.size > 0) return true
    return editableEntries.some((e) => {
      const original = mealEntries.find((o) => o.id === e.id)
      if (!original) return true
      return e.quantity !== original.quantity || e.unit !== original.unit
    })
  }, [editableEntries, mealEntries, removedIds])

  const handleSave = async () => {
    if (!user) return
    setSubmitting(true)
    try {
      // Remove entries that were deleted
      for (const id of removedIds) {
        await removeEntry(user.uid, id)
      }

      // Update remaining entries with recalculated nutrients
      const toUpdate = activeEntries
        .filter((e) => {
          const original = mealEntries.find((o) => o.id === e.id)
          return original && (e.quantity !== original.quantity || e.unit !== original.unit)
        })
        .map((e) => ({
          ...e,
          nutrients: recalcNutrients(e),
        }))

      if (toUpdate.length > 0) {
        await updateEntries(user.uid, toUpdate)
      }

      addToast('已保存修改', { type: 'success' })
      onClose()
    } catch (err) {
      console.error(err)
      addToast('保存失败，请重试', { type: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/40 backdrop-blur-sm">
      <div className="flex-1" onClick={onClose} />
      <div className="bg-white rounded-t-2xl max-h-[85vh] flex flex-col animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
          <button onClick={onClose} className="text-gray-500 text-sm">取消</button>
          <h3 className="text-base font-bold text-gray-800">编辑{mealTitle}</h3>
          <button
            onClick={handleSave}
            disabled={submitting || !hasChanges}
            className="text-emerald-600 text-sm font-medium disabled:opacity-40"
          >
            {submitting ? '保存中...' : '保存'}
          </button>
        </div>

        {/* Entry list */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {activeEntries.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              已移除所有条目
            </div>
          ) : (
            activeEntries.map((entry) => {
              const units = getUnitsForEntry(entry)
              const photo = getEntryPhoto(entry)
              const entryNutrients = recalcNutrients(entry)
              return (
                <div key={entry.id} className="bg-gray-50 rounded-xl p-3">
                  <div className="flex items-center gap-3 mb-2">
                    {photo ? (
                      <img src={photo} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm shrink-0 ${getEntryIconClass(entry.type)}`}>
                        {getEntryName(entry)[0] || '食'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{getEntryName(entry)}</div>
                      <div className="text-xs text-gray-400">{Math.round(entryNutrients.calories)} kcal</div>
                    </div>
                    <button
                      onClick={() => handleRemoveEntry(entry.id)}
                      className="text-red-400 hover:text-red-500 p-1.5 shrink-0"
                      aria-label={`删除${getEntryName(entry)}`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-500">数量</label>
                    <NumberInput
                      value={entry.quantity}
                      onValueChange={(quantity) => updateEntry(entry.id, { quantity })}
                      min={0}
                      step="any"
                      className="w-20 px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                    {entry.type === 'food' && units.length > 1 ? (
                      <select
                        value={entry.unit ?? ''}
                        onChange={(e) => updateEntry(entry.id, { unit: e.target.value })}
                        className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        {units.map((u) => (
                          <option key={u.name} value={u.name}>{u.name}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-xs text-gray-400">{entry.unit || (entry.type === 'meal' ? '份' : '')}</span>
                    )}
                  </div>
                </div>
              )
            })
          )}

          {/* Add food button */}
          <button
            type="button"
            onClick={() => setShowAddFood(true)}
            className="w-full py-2.5 border-2 border-dashed border-emerald-300 rounded-xl text-emerald-600 text-sm font-medium hover:bg-emerald-50 transition-colors flex items-center justify-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            添加食物
          </button>
        </div>

        {/* Nutrition summary */}
        {activeEntries.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 shrink-0">
            <div className="bg-emerald-50 rounded-lg px-3 py-2">
              <div className="text-xs font-medium text-emerald-700 mb-1.5">本顿营养汇总</div>
              <div className="grid grid-cols-3 gap-x-3 gap-y-1">
                {displayNutrientKeys.map((key) => (
                  <div key={key} className="flex items-baseline justify-between text-xs">
                    <span className="text-gray-600 truncate">{NUTRIENT_LABELS[key]}</span>
                    <span className="font-medium text-gray-800 tabular-nums ml-1">
                      {Math.round(totalNutrients[key] * 10) / 10}
                      <span className="text-gray-400 font-normal ml-0.5">{NUTRIENT_UNITS[key]}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {showAddFood && (
        <AddEntryModal
          mealIndex={mealIndex}
          onClose={() => {
            setShowAddFood(false)
            onClose() // Close EditMealModal too, entries are in the store
          }}
        />
      )}
    </div>
  )
}
