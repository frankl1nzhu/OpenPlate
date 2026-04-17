import { useState } from 'react'
import { useFoodStore } from '../store/foodStore'
import { useMealStore } from '../store/mealStore'
import { useDailyLogStore } from '../store/dailyLogStore'
import { useAuthStore } from '../store/authStore'
import { useUserProfileStore } from '../store/userProfileStore'
import { multiplyNutrients, sumNutrients, getFoodUnits, calculateFoodNutrients } from '../lib/utils'
import { calculateExerciseCalories } from '../lib/nutrition'
import { useScrollLock } from '../hooks/useScrollLock'
import { EMPTY_NUTRIENTS, MACRO_KEYS, MICRO_KEYS, NUTRIENT_LABELS, NUTRIENT_UNITS, EXERCISE_TYPE_LABELS, EXERCISE_INTENSITY_LABELS } from '../types'
import type { Nutrients, ExerciseType, ExerciseIntensity } from '../types'

interface Props {
  onClose: () => void
  defaultTab?: 'food' | 'exercise'
}

export default function AddEntryModal({ onClose, defaultTab = 'food' }: Props) {
  useScrollLock(true)
  const { foods } = useFoodStore()
  const { meals } = useMealStore()
  const { addEntry } = useDailyLogStore()
  const user = useAuthStore((s) => s.user)
  const { profile } = useUserProfileStore()

  const isExerciseMode = defaultTab === 'exercise'
  const [tab, setTab] = useState<'food' | 'meal' | 'quick' | 'exercise'>(isExerciseMode ? 'exercise' : 'food')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedUnit, setSelectedUnit] = useState<string>('')
  const [quantity, setQuantity] = useState(1)
  const [submitting, setSubmitting] = useState(false)

  // Quick-add state
  const [quickName, setQuickName] = useState('')
  const [quickProtein, setQuickProtein] = useState(0)
  const [quickIsComplete, setQuickIsComplete] = useState(false)
  const [quickNutrients, setQuickNutrients] = useState<Nutrients>({ ...EMPTY_NUTRIENTS })
  const [showQuickMicro, setShowQuickMicro] = useState(false)

  // Exercise state
  const [exType, setExType] = useState<ExerciseType>('running')
  const [exIntensity, setExIntensity] = useState<ExerciseIntensity>('moderate')
  const [exDuration, setExDuration] = useState(30)
  const [exManualCal, setExManualCal] = useState(false)
  const [exCalories, setExCalories] = useState(0)
  const { addExercise } = useDailyLogStore()

  const filteredFoods = foods.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase()),
  )
  const filteredMeals = meals.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()),
  )

  const selectedFood = tab === 'food' ? foods.find((f) => f.id === selectedId) : null
  const selectedMeal = tab === 'meal' ? meals.find((m) => m.id === selectedId) : null

  const calculateNutrients = (): Nutrients => {
    if (selectedFood) {
      return calculateFoodNutrients(selectedFood, quantity, selectedUnit || undefined)
    }
    if (selectedMeal) {
      const mealNutrients = sumNutrients(
        ...selectedMeal.foods.map((mf) => {
          const food = foods.find((f) => f.id === mf.foodId)
          if (!food) return { ...EMPTY_NUTRIENTS }
          return calculateFoodNutrients(food, mf.quantity, mf.unit)
        }),
      )
      return multiplyNutrients(mealNutrients, quantity)
    }
    return { ...EMPTY_NUTRIENTS }
  }

  const handleAdd = async () => {
    if (!user || !selectedId) return
    setSubmitting(true)
    try {
      const name = selectedFood?.name || selectedMeal?.name || ''
      const photoURL = selectedFood?.photoURL || selectedMeal?.photoURL
      await addEntry(user.uid, {
        type: tab as 'food' | 'meal',
        refId: selectedId,
        name,
        ...(photoURL ? { photoURL } : {}),
        quantity,
        ...(tab === 'food' && selectedUnit ? { unit: selectedUnit } : {}),
        nutrients: calculateNutrients(),
        timestamp: Date.now(),
      })
      onClose()
    } catch (err) {
      console.error(err)
      alert('添加失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleQuickAdd = async () => {
    if (!user || !quickName.trim()) return
    setSubmitting(true)
    try {
      const nutrients: Nutrients = {
        ...quickNutrients,
        completeProtein: quickIsComplete ? quickProtein : 0,
        incompleteProtein: quickIsComplete ? 0 : quickProtein,
      }
      await addEntry(user.uid, {
        type: 'quick',
        refId: '',
        name: quickName.trim(),
        quantity: 1,
        nutrients,
        timestamp: Date.now(),
      })
      onClose()
    } catch (err) {
      console.error(err)
      alert('添加失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleQuickNutrient = (key: keyof Nutrients, value: string) => {
    setQuickNutrients((prev) => ({ ...prev, [key]: parseFloat(value) || 0 }))
  }

  const exerciseCaloriesPreview = exManualCal
    ? exCalories
    : calculateExerciseCalories(exType, exIntensity, exDuration, profile?.weightKg || 70)

  const handleAddExercise = async () => {
    if (!user) return
    setSubmitting(true)
    try {
      await addExercise(user.uid, {
        exerciseType: exType,
        intensity: exIntensity,
        durationMinutes: exDuration,
        caloriesBurned: exManualCal ? exCalories : exerciseCaloriesPreview,
        manualCalories: exManualCal,
        timestamp: Date.now(),
      })
      onClose()
    } catch (err) {
      console.error(err)
      alert('添加失败')
    } finally {
      setSubmitting(false)
    }
  }

  // Visible macro keys for quick-add (exclude protein fields, handled separately)
  const quickMacroKeys = MACRO_KEYS.filter(
    (k) => k !== 'completeProtein' && k !== 'incompleteProtein',
  )

  const previewCalories = Math.round(calculateNutrients().calories)

  const switchTab = (t: 'food' | 'meal' | 'quick' | 'exercise') => {
    setTab(t)
    setSelectedId(null)
    setSelectedUnit('')
    setSearch('')
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
      <div className="bg-white w-full max-w-lg rounded-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between shrink-0">
          <h3 className="font-medium">{isExerciseMode ? '添加运动' : '添加记录'}</h3>
          <button onClick={onClose} className="text-gray-400 text-sm">关闭</button>
        </div>

        {/* Tabs */}
        {isExerciseMode ? (
          <div className="flex border-b border-gray-100 shrink-0">
            <div className="flex-1 py-2 text-sm font-medium text-center text-purple-600 border-b-2 border-purple-500">
              运动
            </div>
          </div>
        ) : (
          <div className="flex border-b border-gray-100 shrink-0">
            <button
              onClick={() => switchTab('food')}
              className={`flex-1 py-2 text-sm font-medium ${tab === 'food' ? 'text-emerald-600 border-b-2 border-emerald-500' : 'text-gray-400'}`}
            >
              食物
            </button>
            <button
              onClick={() => switchTab('meal')}
              className={`flex-1 py-2 text-sm font-medium ${tab === 'meal' ? 'text-emerald-600 border-b-2 border-emerald-500' : 'text-gray-400'}`}
            >
              套餐
            </button>
            <button
              onClick={() => switchTab('quick')}
              className={`flex-1 py-2 text-sm font-medium ${tab === 'quick' ? 'text-blue-600 border-b-2 border-blue-500' : 'text-gray-400'}`}
            >
              快速添加
            </button>
          </div>
        )}

        {/* Exercise form */}
        {tab === 'exercise' ? (
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">运动类型</label>
              <div className="grid grid-cols-4 gap-2">
                {(Object.entries(EXERCISE_TYPE_LABELS) as [ExerciseType, string][]).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setExType(key)}
                    className={`py-2 text-xs rounded-lg border ${exType === key ? 'bg-purple-500 text-white border-purple-500' : 'border-gray-300 text-gray-600'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">强度</label>
              <div className="flex gap-2">
                {(Object.entries(EXERCISE_INTENSITY_LABELS) as [ExerciseIntensity, string][]).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setExIntensity(key)}
                    className={`flex-1 py-2 text-sm rounded-lg border ${exIntensity === key ? 'bg-purple-500 text-white border-purple-500' : 'border-gray-300 text-gray-600'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 shrink-0">时长</label>
              <input
                type="number"
                value={exDuration}
                onChange={(e) => setExDuration(parseInt(e.target.value) || 0)}
                min={1}
                className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <span className="text-xs text-gray-400">分钟</span>
            </div>

            <div className="bg-purple-50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-purple-700 font-medium">预估消耗</span>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exManualCal}
                    onChange={(e) => setExManualCal(e.target.checked)}
                    className="w-4 h-4 rounded text-purple-500 focus:ring-purple-500"
                  />
                  <span className="text-xs text-gray-500">手动输入</span>
                </label>
              </div>
              {exManualCal ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={exCalories}
                    onChange={(e) => setExCalories(parseInt(e.target.value) || 0)}
                    min={0}
                    className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <span className="text-xs text-gray-400">kcal</span>
                </div>
              ) : (
                <div className="text-center">
                  <span className="text-2xl font-bold text-purple-600">{exerciseCaloriesPreview}</span>
                  <span className="text-sm text-purple-400 ml-1">kcal</span>
                  {!profile?.weightKg && (
                    <p className="text-xs text-gray-400 mt-1">未设置体重，使用默认70kg计算</p>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={handleAddExercise}
              disabled={submitting || exDuration <= 0}
              className="w-full py-2.5 bg-purple-500 text-white font-medium rounded-lg disabled:opacity-50"
            >
              {submitting ? '添加中...' : '确认添加'}
            </button>
          </div>
        ) : tab === 'quick' ? (
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">名称</label>
              <input
                type="text"
                value={quickName}
                onChange={(e) => setQuickName(e.target.value)}
                placeholder="如：午餐外卖"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">营养素</h4>
              {quickMacroKeys.map((key) => (
                <div key={key} className="flex items-center gap-2">
                  <label className="text-sm text-gray-600 w-20 shrink-0">{NUTRIENT_LABELS[key]}</label>
                  <input
                    type="number"
                    value={quickNutrients[key] || ''}
                    onChange={(e) => handleQuickNutrient(key, e.target.value)}
                    min={0}
                    max={99999}
                    step="any"
                    className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-xs text-gray-400 w-10">{NUTRIENT_UNITS[key]}</span>
                </div>
              ))}

              {/* Protein with checkbox */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600 w-20 shrink-0">蛋白质</label>
                <input
                  type="number"
                  value={quickProtein || ''}
                  onChange={(e) => setQuickProtein(parseFloat(e.target.value) || 0)}
                  min={0}
                  max={99999}
                  step="any"
                  className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-xs text-gray-400 w-10">g</span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer pl-1">
                <input
                  type="checkbox"
                  checked={quickIsComplete}
                  onChange={(e) => setQuickIsComplete(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-500 focus:ring-blue-500"
                />
                <span className="text-xs text-gray-500">完全蛋白来源</span>
              </label>

              {/* Micronutrients */}
              <button
                type="button"
                onClick={() => setShowQuickMicro(!showQuickMicro)}
                className="flex items-center gap-1 text-sm font-medium text-gray-700"
              >
                微量元素
                <svg
                  className={`w-4 h-4 transition-transform ${showQuickMicro ? 'rotate-180' : ''}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showQuickMicro && (
                <div className="space-y-2">
                  {MICRO_KEYS.map((key) => (
                    <div key={key} className="flex items-center gap-2">
                      <label className="text-sm text-gray-600 w-20 shrink-0">{NUTRIENT_LABELS[key]}</label>
                      <input
                        type="number"
                        value={quickNutrients[key] || ''}
                        onChange={(e) => handleQuickNutrient(key, e.target.value)}
                        min={0}
                        max={99999}
                        step="any"
                        className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-xs text-gray-400 w-10">{NUTRIENT_UNITS[key]}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={handleQuickAdd}
              disabled={submitting || !quickName.trim()}
              className="w-full py-2.5 bg-blue-500 text-white font-medium rounded-lg disabled:opacity-50"
            >
              {submitting ? '添加中...' : '确认添加'}
            </button>
          </div>
        ) : (
          <>
            {/* Search */}
            <div className="px-4 py-2 shrink-0">
              <input
                type="text"
                placeholder={tab === 'food' ? '搜索食物...' : '搜索套餐...'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-3 py-2 bg-gray-100 rounded-lg text-sm focus:outline-none"
              />
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto px-4">
              {tab === 'food' ? (
                filteredFoods.map((food) => (
                  <button
                    key={food.id}
                    onClick={() => {
                      setSelectedId(food.id)
                      const units = getFoodUnits(food)
                      setSelectedUnit(units[0]?.name || food.unit)
                      setQuantity(food.defaultQuantity)
                    }}
                    className={`w-full text-left flex items-center gap-3 py-3 border-b border-gray-50 ${selectedId === food.id ? 'bg-emerald-50 -mx-2 px-2 rounded-lg' : ''
                      }`}
                  >
                    {food.photoURL ? (
                      <img src={food.photoURL} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 text-sm shrink-0">
                        {food.name[0]}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{food.name}</div>
                      <div className="text-xs text-gray-400">
                        每{food.defaultQuantity}{food.unit} · {food.nutrientsPerUnit.calories} kcal
                      </div>
                    </div>
                    {selectedId === food.id && (
                      <svg className="w-5 h-5 text-emerald-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                ))
              ) : (
                filteredMeals.map((meal) => (
                  <button
                    key={meal.id}
                    onClick={() => setSelectedId(meal.id)}
                    className={`w-full text-left flex items-center gap-3 py-3 border-b border-gray-50 ${selectedId === meal.id ? 'bg-emerald-50 -mx-2 px-2 rounded-lg' : ''
                      }`}
                  >
                    {meal.photoURL ? (
                      <img src={meal.photoURL} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600 text-sm shrink-0">
                        {meal.name[0]}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{meal.name}</div>
                      <div className="text-xs text-gray-400">{meal.foods.length} 种食物</div>
                    </div>
                    {selectedId === meal.id && (
                      <svg className="w-5 h-5 text-emerald-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                ))
              )}
            </div>

            {/* Quantity + confirm */}
            {selectedId && (
              <div className="px-4 py-3 border-t border-gray-100 shrink-0">
                <div className="flex items-center gap-3 mb-3">
                  <label className="text-sm text-gray-600">数量</label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                    min={0}
                    step="any"
                    className="w-20 px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-center"
                  />
                  {tab === 'food' && selectedFood ? (
                    (() => {
                      const units = getFoodUnits(selectedFood)
                      return units.length > 1 ? (
                        <select
                          value={selectedUnit}
                          onChange={(e) => {
                            setSelectedUnit(e.target.value)
                            setQuantity(1)
                          }}
                          className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm bg-white"
                        >
                          {units.map((u) => (
                            <option key={u.name} value={u.name}>{u.name}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-sm text-gray-500">{selectedUnit || selectedFood.unit}</span>
                      )
                    })()
                  ) : (
                    <span className="text-sm text-gray-400">份</span>
                  )}
                  <span className="text-sm text-emerald-600 font-medium ml-auto">
                    {previewCalories} kcal
                  </span>
                </div>
                <button
                  onClick={handleAdd}
                  disabled={submitting}
                  className="w-full py-2.5 bg-emerald-500 text-white font-medium rounded-lg disabled:opacity-50"
                >
                  {submitting ? '添加中...' : '确认添加'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
