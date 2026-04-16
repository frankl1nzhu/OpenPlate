import { useState } from 'react'
import { useMealStore } from '../store/mealStore'
import { useFoodStore } from '../store/foodStore'
import { Link } from 'react-router-dom'
import { sumNutrients, multiplyNutrients } from '../lib/utils'

export default function MealListPage() {
  const { meals, loading } = useMealStore()
  const { foods } = useFoodStore()
  const [search, setSearch] = useState('')

  const filtered = meals.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()),
  )

  const getMealCalories = (meal: typeof meals[number]) => {
    const nutrientsList = meal.foods.map((mf) => {
      const food = foods.find((f) => f.id === mf.foodId)
      if (!food) return null
      return multiplyNutrients(food.nutrientsPerUnit, mf.quantity)
    }).filter(Boolean) as NonNullable<ReturnType<typeof multiplyNutrients>>[]
    return sumNutrients(...nutrientsList).calories
  }

  return (
    <div className="pb-20">
      <div className="sticky top-0 bg-white z-10 px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold">套餐库</h2>
          <Link
            to="/meals/new"
            className="bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium"
          >
            + 添加套餐
          </Link>
        </div>
        <input
          type="text"
          placeholder="搜索套餐..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-2 bg-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          {search ? '没有找到匹配的套餐' : '还没有套餐，点击上方添加'}
        </div>
      ) : (
        <div className="px-4 space-y-2 mt-2">
          {filtered.map((meal) => (
            <Link
              key={meal.id}
              to={`/meals/${meal.id}`}
              className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 active:bg-gray-50"
            >
              {meal.photoURL ? (
                <img
                  src={meal.photoURL}
                  alt={meal.name}
                  className="w-12 h-12 rounded-lg object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600 text-lg">
                  {meal.name[0]}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{meal.name}</div>
                <div className="text-xs text-gray-400">
                  {meal.foods.length} 种食物 · {Math.round(getMealCalories(meal))} kcal
                </div>
              </div>
              <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
