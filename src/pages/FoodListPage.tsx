import { useState, useEffect } from 'react'
import { useFoodStore } from '../store/foodStore'
import { fetchUserProfiles } from '../store/userProfileStore'
import { Link } from 'react-router-dom'
import AIFoodModal from '../components/AIFoodModal'
import AITaskBanner from '../components/AITaskBanner'
import type { UserProfile } from '../types'
import { DEFAULT_FOOD_CATEGORIES } from '../types'

export default function FoodListPage() {
  const { foods, loading } = useFoodStore()
  const [search, setSearch] = useState('')
  const [showAIModal, setShowAIModal] = useState(false)
  const [creatorProfiles, setCreatorProfiles] = useState<Record<string, UserProfile>>({})
  const [selectedCategory, setSelectedCategory] = useState<string>('全部')
  const [sortBy, setSortBy] = useState<'newest' | 'cal_asc' | 'cal_desc' | 'name'>('newest')

  useEffect(() => {
    if (foods.length === 0) return
    const uids = [...new Set(foods.map((f) => f.createdBy).filter(Boolean))]
    fetchUserProfiles(uids).then(setCreatorProfiles)
  }, [foods])

  const allCategories = ['全部', ...new Set([
    ...DEFAULT_FOOD_CATEGORIES,
    ...foods.flatMap(f => f.categories || [])
  ])]

  const filtered = foods.filter((f) => {
    if (search && !f.name.toLowerCase().includes(search.toLowerCase())) return false
    if (selectedCategory !== '全部') {
      const cats = f.categories || []
      if (!cats.includes(selectedCategory) && !(cats.length === 0 && selectedCategory === '其他')) {
        return false
      }
    }
    return true
  }).sort((a, b) => {
    switch (sortBy) {
      case 'cal_asc':
        return (a.nutrientsPerUnit.calories || 0) - (b.nutrientsPerUnit.calories || 0)
      case 'cal_desc':
        return (b.nutrientsPerUnit.calories || 0) - (a.nutrientsPerUnit.calories || 0)
      case 'name':
        return a.name.localeCompare(b.name, 'zh-CN')
      case 'newest':
      default:
        return (b.createdAt || 0) - (a.createdAt || 0)
    }
  })

  return (
    <div className="pb-20">
      <div className="sticky top-0 bg-white z-10 px-4 pt-4 pb-2 border-b border-gray-100 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">食物库</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAIModal(true)}
              className="bg-blue-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium"
            >
              AI识别
            </button>
            <Link
              to="/foods/new"
              className="bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium"
            >
              + 添加食物
            </Link>
          </div>
        </div>

        {/* Search & Sort */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="搜索食物..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-3 py-2 bg-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value as 'newest' | 'cal_asc' | 'cal_desc' | 'name')}
            className="px-2 py-2 bg-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="newest">最近添加</option>
            <option value="cal_asc">热量:从低到高</option>
            <option value="cal_desc">热量:从高到低</option>
            <option value="name">名称排序</option>
          </select>
        </div>

        {/* Categories Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {allCategories.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedCategory(tag)}
              className={`px-3 py-1 text-xs rounded-full font-medium shrink-0 transition-colors ${
                selectedCategory === tag
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* AI task status banner */}
      <AITaskBanner type="food" />

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          {search || selectedCategory !== '全部' ? '没有找到匹配的食物' : '还没有食物，点击上方添加'}
        </div>
      ) : (
        <div className="px-4 space-y-2 mt-2">
          {filtered.map((food) => {
            const creator = creatorProfiles[food.createdBy]
            return (
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
                  <div className="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 text-lg font-bold">
                    {food.name[0]}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-medium text-sm truncate">{food.name}</span>
                    {food.categories?.map((c) => (
                      <span key={c} className="text-[10px] px-1.5 py-0.2 bg-emerald-50 text-emerald-700 rounded border border-emerald-200">
                        {c}
                      </span>
                    ))}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    每{food.defaultQuantity}{food.unit} · {food.nutrientsPerUnit.calories} kcal
                    {food.isCompleteProtein && (
                      <span className="ml-1 text-emerald-500">· 完全蛋白</span>
                    )}
                  </div>
                  {creator?.nickname && (
                    <div className="text-xs text-gray-300 mt-0.5">by {creator.nickname}</div>
                  )}
                </div>
                <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            )
          })}
        </div>
      )}

      {showAIModal && <AIFoodModal onClose={() => setShowAIModal(false)} />}
    </div>
  )
}
