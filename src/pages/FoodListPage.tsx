import { useState } from 'react'
import { useFoodStore } from '../store/foodStore'
import { Link } from 'react-router-dom'

export default function FoodListPage() {
  const { foods, loading } = useFoodStore()
  const [search, setSearch] = useState('')

  const filtered = foods.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="pb-20">
      <div className="sticky top-0 bg-white z-10 px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold">食物库</h2>
          <Link
            to="/foods/new"
            className="bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium"
          >
            + 添加食物
          </Link>
        </div>
        <input
          type="text"
          placeholder="搜索食物..."
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
          {search ? '没有找到匹配的食物' : '还没有食物，点击上方添加'}
        </div>
      ) : (
        <div className="px-4 space-y-2 mt-2">
          {filtered.map((food) => (
            <Link
              key={food.id}
              to={`/foods/${food.id}`}
              className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 active:bg-gray-50"
            >
              {food.photoURL ? (
                <img
                  src={food.photoURL}
                  alt={food.name}
                  className="w-12 h-12 rounded-lg object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 text-lg">
                  {food.name[0]}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{food.name}</div>
                <div className="text-xs text-gray-400">
                  每{food.defaultQuantity}{food.unit} · {food.nutrientsPerUnit.calories} kcal
                  {food.isCompleteProtein && (
                    <span className="ml-1 text-emerald-500">· 完全蛋白</span>
                  )}
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
