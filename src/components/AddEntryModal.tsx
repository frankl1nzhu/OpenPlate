import { useState } from 'react'
import { useFoodStore } from '../store/foodStore'
import { useMealStore } from '../store/mealStore'
import { useDailyLogStore } from '../store/dailyLogStore'
import { useAuthStore } from '../store/authStore'
import { multiplyNutrients, sumNutrients } from '../lib/utils'
import type { Nutrients } from '../types'

interface Props {
  onClose: () => void
}

export default function AddEntryModal({ onClose }: Props) {
  const { foods } = useFoodStore()
  const { meals } = useMealStore()
  const { addEntry } = useDailyLogStore()
  const user = useAuthStore((s) => s.user)

  const [tab, setTab] = useState<'food' | 'meal'>('food')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [submitting, setSubmitting] = useState(false)

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
      return multiplyNutrients(selectedFood.nutrientsPerUnit, quantity)
    }
    if (selectedMeal) {
      const mealNutrients = sumNutrients(
        ...selectedMeal.foods.map((mf) => {
          const food = foods.find((f) => f.id === mf.foodId)
          if (!food) return { calories: 0, carbs: 0, completeProtein: 0, incompleteProtein: 0, fat: 0, fiber: 0, sodium: 0 }
          return multiplyNutrients(food.nutrientsPerUnit, mf.quantity)
        }),
      )
      return multiplyNutrients(mealNutrients, quantity)
    }
    return { calories: 0, carbs: 0, completeProtein: 0, incompleteProtein: 0, fat: 0, fiber: 0, sodium: 0 }
  }

  const handleAdd = async () => {
    if (!user || !selectedId) return
    setSubmitting(true)
    try {
      await addEntry(user.uid, {
        type: tab,
        refId: selectedId,
        quantity,
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

  const previewCalories = Math.round(calculateNutrients().calories)

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end">
      <div className="bg-white w-full rounded-t-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between shrink-0">
          <h3 className="font-medium">添加记录</h3>
          <button onClick={onClose} className="text-gray-400 text-sm">关闭</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 shrink-0">
          <button
            onClick={() => { setTab('food'); setSelectedId(null); setSearch('') }}
            className={`flex-1 py-2 text-sm font-medium ${tab === 'food' ? 'text-emerald-600 border-b-2 border-emerald-500' : 'text-gray-400'}`}
          >
            食物
          </button>
          <button
            onClick={() => { setTab('meal'); setSelectedId(null); setSearch('') }}
            className={`flex-1 py-2 text-sm font-medium ${tab === 'meal' ? 'text-emerald-600 border-b-2 border-emerald-500' : 'text-gray-400'}`}
          >
            套餐
          </button>
        </div>

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
                onClick={() => setSelectedId(food.id)}
                className={`w-full text-left flex items-center gap-3 py-3 border-b border-gray-50 ${selectedId === food.id ? 'bg-emerald-50 -mx-2 px-2 rounded-lg' : ''
                  }`}
              >
                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 text-sm shrink-0">
                  {food.photoURL ? (
                    <img src={food.photoURL} alt="" className="w-10 h-10 rounded-lg object-cover" />
                  ) : food.name[0]}
                </div>
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
                <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600 text-sm shrink-0">
                  {meal.photoURL ? (
                    <img src={meal.photoURL} alt="" className="w-10 h-10 rounded-lg object-cover" />
                  ) : meal.name[0]}
                </div>
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
              <span className="text-sm text-gray-400">
                {tab === 'food' && selectedFood
                  ? `× ${selectedFood.defaultQuantity}${selectedFood.unit}`
                  : '份'}
              </span>
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
      </div>
    </div>
  )
}
