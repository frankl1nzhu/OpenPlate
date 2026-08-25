import { useState, type ChangeEvent } from 'react'
import { useFoodStore } from '../store/foodStore'
import { useMealStore } from '../store/mealStore'
import { useDailyLogStore } from '../store/dailyLogStore'
import { useCategoryStore } from '../store/categoryStore'
import { useGoalStore } from '../store/goalStore'
import { useAuthStore } from '../store/authStore'
import { useUserProfileStore } from '../store/userProfileStore'
import { useToastStore } from '../store/toastStore'
import { multiplyNutrients, sumNutrients, getFoodUnits, calculateFoodNutrients } from '../lib/utils'
import { calculateExerciseCalories } from '../lib/nutrition'
import { uploadPhoto, compressImage } from '../lib/storage'
import { useScrollLock } from '../hooks/useScrollLock'
import NumberInput from './NumberInput'
import { EMPTY_NUTRIENTS, MACRO_KEYS, MICRO_KEYS, NUTRIENT_LABELS, NUTRIENT_UNITS, EXERCISE_TYPE_LABELS, EXERCISE_INTENSITY_LABELS, DEFAULT_HOME_NUTRIENT_KEYS } from '../types'
import type { Nutrients, ExerciseType, ExerciseIntensity, Food } from '../types'
import UnitSelect from './UnitSelect'

interface Props {
  onClose: () => void
  defaultTab?: 'food' | 'exercise'
  /** When provided, add entries to this existing meal group instead of creating a new one */
  mealIndex?: number
}

type DietTab = 'food' | 'meal' | 'quick'
type SortOption = 'recent' | 'calories-desc' | 'calories-asc' | 'name'

type DietDraft = {
  id: string
  type: DietTab
  refId: string
  name: string
  photoURL?: string
  photoFile?: File
  quantity: number
  unit?: string
  nutrients?: Nutrients
}

export default function AddEntryModal({ onClose, defaultTab = 'food', mealIndex: existingMealIndex }: Props) {
  useScrollLock(true)
  const { foods } = useFoodStore()
  const { meals } = useMealStore()
  const { currentLog, addEntries, addExercise, recentFoodIds } = useDailyLogStore()
  const { categories } = useCategoryStore()
  const { homeNutrientKeys } = useGoalStore()
  const user = useAuthStore((s) => s.user)
  const { profile } = useUserProfileStore()
  const isExerciseMode = defaultTab === 'exercise'
  const displayNutrientKeys = homeNutrientKeys.length > 0 ? homeNutrientKeys : DEFAULT_HOME_NUTRIENT_KEYS

  const recentFoods = recentFoodIds
    .map(id => foods.find(f => f.id === id))
    .filter((f): f is Food => f !== undefined)

  const [tab, setTab] = useState<DietTab | 'exercise'>(isExerciseMode ? 'exercise' : 'food')
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('全部')
  const [sortBy, setSortBy] = useState<SortOption>('recent')

  const [drafts, setDrafts] = useState<DietDraft[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [quickName, setQuickName] = useState('')
  const [quickUnit, setQuickUnit] = useState('份')
  const [quickProtein, setQuickProtein] = useState(0)
  const [quickIsComplete, setQuickIsComplete] = useState(false)
  const [quickNutrients, setQuickNutrients] = useState<Nutrients>({ ...EMPTY_NUTRIENTS })
  const [quickPhotoFile, setQuickPhotoFile] = useState<File | null>(null)
  const [quickPhotoPreview, setQuickPhotoPreview] = useState<string | null>(null)
  const [showQuickMicro, setShowQuickMicro] = useState(false)
  const [exType, setExType] = useState<ExerciseType>('running')
  const [exIntensity, setExIntensity] = useState<ExerciseIntensity>('moderate')
  const [exDuration, setExDuration] = useState(30)
  const [exManualCal, setExManualCal] = useState(false)
  const [exCalories, setExCalories] = useState(0)

  const categoryList = ['全部', ...categories]

  const processedFoods = foods
    .filter((food) => {
      const matchesSearch = food.name.toLowerCase().includes(search.toLowerCase())
      const matchesCategory = selectedCategory === '全部' || (food.categories && food.categories.includes(selectedCategory))
      return matchesSearch && matchesCategory
    })
    .sort((a, b) => {
      if (sortBy === 'calories-desc') {
        return (b.nutrientsPerUnit?.calories || 0) - (a.nutrientsPerUnit?.calories || 0)
      }
      if (sortBy === 'calories-asc') {
        return (a.nutrientsPerUnit?.calories || 0) - (b.nutrientsPerUnit?.calories || 0)
      }
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name, 'zh-CN')
      }
      return (b.createdAt || 0) - (a.createdAt || 0)
    })

  const filteredMeals = meals.filter((meal) => meal.name.toLowerCase().includes(search.toLowerCase()))
  const quickMacroKeys = MACRO_KEYS.filter((key) => key !== 'protein' && key !== 'completeProtein' && key !== 'incompleteProtein')

  const setTabAndSearch = (nextTab: DietTab) => {
    setTab(nextTab)
    setSearch('')
  }

  const addOrRemoveReference = (type: 'food' | 'meal', refId: string) => {
    const exists = drafts.some((draft) => draft.type === type && draft.refId === refId)
    if (exists) {
      setDrafts((current) => current.filter((draft) => !(draft.type === type && draft.refId === refId)))
      return
    }
    if (type === 'food') {
      const food = foods.find((item) => item.id === refId)
      if (!food) return
      const units = getFoodUnits(food)
      setDrafts((current) => [...current, {
        id: crypto.randomUUID(), type, refId, name: food.name, photoURL: food.photoURL,
        quantity: food.defaultQuantity, unit: units[0]?.name || food.unit,
      }])
      return
    }
    const meal = meals.find((item) => item.id === refId)
    if (!meal) return
    setDrafts((current) => [...current, {
      id: crypto.randomUUID(), type, refId, name: meal.name, photoURL: meal.photoURL, quantity: 1,
    }])
  }

  const updateDraft = (id: string, update: Partial<DietDraft>) => {
    setDrafts((current) => current.map((draft) => draft.id === id ? { ...draft, ...update } : draft))
  }

  const calculateDraftNutrients = (draft: DietDraft): Nutrients => {
    if (draft.type === 'quick') return draft.nutrients ?? { ...EMPTY_NUTRIENTS }
    if (draft.type === 'food') {
      const food = foods.find((item) => item.id === draft.refId)
      return food ? calculateFoodNutrients(food, draft.quantity, draft.unit) : { ...EMPTY_NUTRIENTS }
    }
    const meal = meals.find((item) => item.id === draft.refId)
    if (!meal) return { ...EMPTY_NUTRIENTS }
    const nutrients = sumNutrients(...meal.foods.map((mealFood) => {
      const food = foods.find((item) => item.id === mealFood.foodId)
      return food ? calculateFoodNutrients(food, mealFood.quantity, mealFood.unit) : { ...EMPTY_NUTRIENTS }
    }))
    return multiplyNutrients(nutrients, draft.quantity)
  }

  const addQuickDraft = () => {
    if (!quickName.trim()) return
    const nutrients: Nutrients = {
      ...quickNutrients,
      protein: quickProtein,
      completeProtein: quickIsComplete ? quickProtein : 0,
      incompleteProtein: quickIsComplete ? 0 : quickProtein,
    }
    setDrafts((current) => [...current, {
      id: crypto.randomUUID(), type: 'quick', refId: '', name: quickName.trim(), quantity: 1, unit: quickUnit,
      nutrients, photoFile: quickPhotoFile ?? undefined, photoURL: quickPhotoPreview ?? undefined,
    }])
    setQuickName('')
    setQuickUnit('份')
    setQuickProtein(0)
    setQuickIsComplete(false)
    setQuickNutrients({ ...EMPTY_NUTRIENTS })
    setQuickPhotoFile(null)
    setQuickPhotoPreview(null)
  }

  const handleAddMeal = async () => {
    if (!user || drafts.length === 0) return
    setSubmitting(true)
    try {
      const targetMealIndex = existingMealIndex ?? (() => {
        const maxMealIndex = (currentLog?.entries ?? []).reduce<number>((max, entry, index) => {
          const mIdx = entry.mealIndex ?? (index + 1)
          return Math.max(max, mIdx)
        }, 0)
        return maxMealIndex + 1
      })()
      const timestamp = Date.now()
      const entries = await Promise.all(drafts.map(async (draft, index) => {
        let photoURL = draft.photoURL
        if (draft.type === 'quick' && draft.photoFile) {
          try {
            const compressed = await compressImage(draft.photoFile)
            photoURL = await uploadPhoto(compressed, `quick-records/${timestamp}_${index}.jpg`)
          } catch {
            useToastStore.getState().addToast('图片上传失败，记录将不包含照片', { type: 'error' })
            photoURL = undefined
          }
        }
        return {
          type: draft.type as 'food' | 'meal' | 'quick',
          refId: draft.refId,
          name: draft.name,
          ...(photoURL ? { photoURL } : {}),
          quantity: draft.quantity,
          ...(draft.unit ? { unit: draft.unit } : {}),
          nutrients: calculateDraftNutrients(draft),
          timestamp: timestamp + index,
          mealIndex: targetMealIndex,
        }
      }))
      await addEntries(user.uid, entries)
      // Track recent foods
      for (const draft of drafts) {
        if (draft.type === 'food' && draft.refId) {
          useDailyLogStore.getState().addRecentFood(draft.refId)
        }
      }
      onClose()
    } catch (error) {
      console.error(error)
      alert('添加失败')
    } finally {
      setSubmitting(false)
    }
  }

  const exerciseCaloriesPreview = exManualCal
    ? exCalories
    : calculateExerciseCalories(exType, exIntensity, exDuration, profile?.weightKg || 70)

  const handleAddExercise = async () => {
    if (!user) return
    setSubmitting(true)
    try {
      await addExercise(user.uid, {
        exerciseType: exType, intensity: exIntensity, durationMinutes: exDuration,
        caloriesBurned: exerciseCaloriesPreview, manualCalories: exManualCal, timestamp: Date.now(),
      })
      onClose()
    } catch (error) {
      console.error(error)
      alert('添加失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
      <div className="bg-white w-full max-w-lg rounded-2xl max-h-[85vh] flex flex-col">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div><h3 className="font-medium">{isExerciseMode ? '添加运动' : '添加饮食'}</h3>{!isExerciseMode && <p className="text-xs text-gray-400 mt-0.5">已选内容会归入同一顿</p>}</div>
          <button onClick={onClose} className="text-gray-400 text-sm">关闭</button>
        </div>

        {tab === 'exercise' ? (
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            <div><label className="block text-sm font-medium text-gray-700 mb-2">运动类型</label><div className="grid grid-cols-4 gap-2">{(Object.entries(EXERCISE_TYPE_LABELS) as [ExerciseType, string][]).map(([key, label]) => <button key={key} type="button" onClick={() => setExType(key)} className={`py-2 text-xs rounded-lg border ${exType === key ? 'bg-purple-500 text-white border-purple-500' : 'border-gray-300 text-gray-600'}`}>{label}</button>)}</div></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-2">强度</label><div className="flex gap-2">{(Object.entries(EXERCISE_INTENSITY_LABELS) as [ExerciseIntensity, string][]).map(([key, label]) => <button key={key} type="button" onClick={() => setExIntensity(key)} className={`flex-1 py-2 text-sm rounded-lg border ${exIntensity === key ? 'bg-purple-500 text-white border-purple-500' : 'border-gray-300 text-gray-600'}`}>{label}</button>)}</div></div>
            <div className="flex items-center gap-2"><label className="text-sm text-gray-600 shrink-0">时长</label><NumberInput value={exDuration} onValueChange={setExDuration} min={1} className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" /><span className="text-xs text-gray-400">分钟</span></div>
            <div className="bg-purple-50 rounded-lg p-3"><div className="flex items-center justify-between mb-2"><span className="text-sm text-purple-700 font-medium">预估消耗</span><label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={exManualCal} onChange={(event) => setExManualCal(event.target.checked)} className="w-4 h-4 rounded text-purple-500 focus:ring-purple-500" /><span className="text-xs text-gray-500">手动输入</span></label></div>{exManualCal ? <div className="flex items-center gap-2"><NumberInput value={exCalories} onValueChange={setExCalories} min={0} className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm" /><span className="text-xs text-gray-400">kcal</span></div> : <div className="text-2xl font-bold text-purple-600">{exerciseCaloriesPreview} <span className="text-sm font-normal">kcal</span></div>}</div>
            <button onClick={handleAddExercise} disabled={submitting || exDuration <= 0} className="w-full py-2.5 bg-purple-500 text-white font-medium rounded-lg disabled:opacity-50">{submitting ? '添加中...' : '确认添加'}</button>
          </div>
        ) : (
          <>
            <div className="flex border-b border-gray-100 shrink-0">{([['food', '食物'], ['meal', '套餐'], ['quick', '快速添加']] as [DietTab, string][]).map(([key, label]) => <button key={key} onClick={() => setTabAndSearch(key)} className={`flex-1 py-2 text-sm font-medium ${tab === key ? 'text-emerald-600 border-b-2 border-emerald-500' : 'text-gray-400'}`}>{label}</button>)}</div>
            <div className="flex-1 overflow-y-auto px-4 py-3">
              {tab === 'quick' ? (
                <div className="space-y-3">
                  <div className="flex gap-2"><input type="text" value={quickName} onChange={(event) => setQuickName(event.target.value)} placeholder="如：午餐外卖" className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /><UnitSelect value={quickUnit} onChange={setQuickUnit} /></div>
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-blue-500"><input type="file" accept="image/*" className="hidden" onChange={(event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (file) { if (quickPhotoPreview) URL.revokeObjectURL(quickPhotoPreview); setQuickPhotoFile(file); setQuickPhotoPreview(URL.createObjectURL(file)) } }} />{quickPhotoPreview ? <img src={quickPhotoPreview} alt="" className="w-10 h-10 object-cover rounded-lg" /> : '选择照片（可选）'}</label>
                  {quickMacroKeys.map((key) => <div key={key} className="flex items-center gap-2"><label className="text-sm text-gray-600 w-20">{NUTRIENT_LABELS[key]}</label><NumberInput value={quickNutrients[key]} onValueChange={(value) => setQuickNutrients((current) => ({ ...current, [key]: value }))} min={0} step="any" className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm" /><span className="text-xs text-gray-400 w-10">{NUTRIENT_UNITS[key]}</span></div>)}
                  <div className="flex items-center gap-2"><label className="text-sm text-gray-600 w-20">蛋白质</label><NumberInput value={quickProtein} onValueChange={setQuickProtein} min={0} step="any" className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm" /><span className="text-xs text-gray-400 w-10">g</span></div><label className="flex items-center gap-2 text-xs text-gray-500"><input type="checkbox" checked={quickIsComplete} onChange={(event) => setQuickIsComplete(event.target.checked)} />完全蛋白来源</label>
                  <button type="button" onClick={() => setShowQuickMicro((show) => !show)} className="text-sm text-gray-600">微量元素 {showQuickMicro ? '⌃' : '⌄'}</button>{showQuickMicro && MICRO_KEYS.map((key) => <div key={key} className="flex items-center gap-2"><label className="text-sm text-gray-600 w-20">{NUTRIENT_LABELS[key]}</label><NumberInput value={quickNutrients[key]} onValueChange={(value) => setQuickNutrients((current) => ({ ...current, [key]: value }))} min={0} step="any" className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm" /><span className="text-xs text-gray-400 w-10">{NUTRIENT_UNITS[key]}</span></div>)}
                  <button type="button" onClick={addQuickDraft} disabled={!quickName.trim()} className="w-full py-2 border border-blue-500 text-blue-600 rounded-lg text-sm font-medium disabled:opacity-50">+ 加入本顿</button>
                </div>
              ) : (
                <>
                  <input type="text" placeholder={tab === 'food' ? '搜索食物...' : '搜索套餐...'} value={search} onChange={(event) => setSearch(event.target.value)} className="w-full px-3 py-2 mb-2 bg-gray-100 rounded-lg text-sm focus:outline-none" />
                  
                  {tab === 'food' && (
                    <div className="mb-3 space-y-2">
                      {/* Category Pills */}
                      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                        {categoryList.map((tag) => {
                          const isSelected = selectedCategory === tag
                          return (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => setSelectedCategory(tag)}
                              className={`px-2.5 py-1 text-xs rounded-full whitespace-nowrap transition-colors ${
                                isSelected
                                  ? 'bg-emerald-500 text-white font-medium'
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              {tag}
                            </button>
                          )
                        })}
                      </div>

                      {/* Sort Dropdown */}
                      <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
                        <span>共 {processedFoods.length} 个食物</span>
                        <div className="flex items-center gap-1">
                          <span>排序：</span>
                          <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as SortOption)}
                            className="bg-gray-50 border border-gray-200 rounded px-2 py-0.5 text-xs text-gray-700 focus:outline-none"
                          >
                            <option value="recent">最近添加</option>
                            <option value="calories-desc">热量从高到低</option>
                            <option value="calories-asc">热量从低到高</option>
                            <option value="name">按名称排序</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {tab === 'food' && !search && selectedCategory === '全部' && recentFoods.length > 0 && (
                    <div className="mb-3">
                      <div className="text-xs font-medium text-gray-500 mb-2">🕔 最近使用</div>
                      {recentFoods.map(item => {
                        const selected = drafts.some(draft => draft.type === 'food' && draft.refId === item.id)
                        return (
                          <button key={`recent-${item.id}`} type="button" onClick={() => addOrRemoveReference('food', item.id)}
                            className={`w-full text-left flex items-center gap-3 py-2.5 border-b border-gray-50 ${selected ? 'bg-emerald-50 -mx-2 px-2 rounded-lg' : ''}`}>
                            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-sm bg-emerald-100 text-emerald-600">
                              {item.photoURL ? <img src={item.photoURL} alt="" className="w-full h-full rounded-lg object-cover" /> : item.name[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">{item.name}</div>
                              <div className="text-xs text-gray-400">每{item.defaultQuantity}{item.unit} · {item.nutrientsPerUnit?.calories || 0} kcal</div>
                            </div>
                            <span className={`text-lg ${selected ? 'text-emerald-500' : 'text-gray-300'}`}>{selected ? '✓' : '+'}</span>
                          </button>
                        )
                      })}
                      <div className="border-b border-gray-200 my-2" />
                    </div>
                  )}

                  {tab === 'food' ? (
                    processedFoods.length === 0 ? (
                      <div className="text-center py-8 text-sm text-gray-400">未查找到匹配食物</div>
                    ) : (
                      processedFoods.map((item) => {
                        const selected = drafts.some((draft) => draft.type === 'food' && draft.refId === item.id)
                        return (
                          <button key={item.id} type="button" onClick={() => addOrRemoveReference('food', item.id)} className={`w-full text-left flex items-center gap-3 py-3 border-b border-gray-50 ${selected ? 'bg-emerald-50 -mx-2 px-2 rounded-lg' : ''}`}>
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center text-sm bg-emerald-100 text-emerald-600">
                              {item.photoURL ? <img src={item.photoURL} alt="" className="w-full h-full rounded-lg object-cover" /> : item.name[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">{item.name}</div>
                              <div className="text-xs text-gray-400">每{item.defaultQuantity}{item.unit} · {item.nutrientsPerUnit?.calories || 0} kcal</div>
                            </div>
                            <span className={`text-lg ${selected ? 'text-emerald-500' : 'text-gray-300'}`}>{selected ? '✓' : '+'}</span>
                          </button>
                        )
                      })
                    )
                  ) : (
                    filteredMeals.map((item) => {
                      const selected = drafts.some((draft) => draft.type === 'meal' && draft.refId === item.id)
                      return (
                        <button key={item.id} type="button" onClick={() => addOrRemoveReference('meal', item.id)} className={`w-full text-left flex items-center gap-3 py-3 border-b border-gray-50 ${selected ? 'bg-emerald-50 -mx-2 px-2 rounded-lg' : ''}`}>
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center text-sm bg-orange-100 text-orange-600">
                            {item.photoURL ? <img src={item.photoURL} alt="" className="w-full h-full rounded-lg object-cover" /> : item.name[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{item.name}</div>
                            <div className="text-xs text-gray-400">{item.foods.length} 种食物</div>
                          </div>
                          <span className={`text-lg ${selected ? 'text-emerald-500' : 'text-gray-300'}`}>{selected ? '✓' : '+'}</span>
                        </button>
                      )
                    })
                  )}
                </>
              )}
            </div>
            <div className="px-4 py-3 border-t border-gray-100 shrink-0 max-h-64 overflow-y-auto">
              <div className="flex items-center justify-between mb-2"><span className="text-sm font-medium text-gray-700">本顿已选 {drafts.length} 项</span><span className="text-xs text-emerald-600">{Math.round(sumNutrients(...drafts.map(calculateDraftNutrients)).calories)} kcal</span></div>
              {drafts.length > 0 && <div className="space-y-2 mb-3">{drafts.map((draft) => { const food = draft.type === 'food' ? foods.find((item) => item.id === draft.refId) : undefined; const units = food ? getFoodUnits(food) : []; return <div key={draft.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-2 py-1.5"><span className="text-sm flex-1 truncate">{draft.name}</span><NumberInput value={draft.quantity} onValueChange={(quantity) => updateDraft(draft.id, { quantity })} min={0} step="any" className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-center" />{draft.type === 'food' && units.length > 1 ? <select value={draft.unit} onChange={(event) => updateDraft(draft.id, { unit: event.target.value, quantity: 1 })} className="max-w-20 px-1 py-1 border border-gray-300 rounded text-sm bg-white">{units.map((unit) => <option key={unit.name} value={unit.name}>{unit.name}</option>)}</select> : draft.type === 'quick' ? <UnitSelect value={draft.unit || '份'} onChange={(unit) => updateDraft(draft.id, { unit })} className="max-w-24" inputClassName="w-16" /> : <span className="text-xs text-gray-400">{draft.type === 'food' ? draft.unit : '份'}</span>}<button type="button" onClick={() => setDrafts((current) => current.filter((item) => item.id !== draft.id))} className="text-gray-400 p-1">×</button></div> })}</div>}
              {drafts.length > 0 && (() => {
                const totalN = sumNutrients(...drafts.map(calculateDraftNutrients))
                return (
                  <div className="mb-3 bg-emerald-50 rounded-lg px-3 py-2">
                    <div className="text-xs font-medium text-emerald-700 mb-1.5">本顿营养汇总</div>
                    <div className="grid grid-cols-3 gap-x-3 gap-y-1">
                      {displayNutrientKeys.map((key) => (
                        <div key={key} className="flex items-baseline justify-between text-xs">
                          <span className="text-gray-600 truncate">{NUTRIENT_LABELS[key]}</span>
                          <span className="font-medium text-gray-800 tabular-nums ml-1">
                            {Math.round(totalN[key] * 10) / 10}
                            <span className="text-gray-400 font-normal ml-0.5">{NUTRIENT_UNITS[key]}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}
              <button onClick={handleAddMeal} disabled={submitting || drafts.length === 0} className="w-full py-2.5 bg-emerald-500 text-white font-medium rounded-lg disabled:opacity-50">{submitting ? '添加中...' : existingMealIndex != null ? '确认添加' : `确认添加第 ${(currentLog?.entries ?? []).reduce<number[]>((acc, entry, index) => { const mIdx = entry.mealIndex ?? (index + 1); if (!acc.includes(mIdx)) acc.push(mIdx); return acc }, []).length + 1} 顿`}</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
