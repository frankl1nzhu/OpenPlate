import { useState, useEffect, type FormEvent, type ChangeEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMealStore } from '../store/mealStore'
import { useFoodStore } from '../store/foodStore'
import { useAuthStore } from '../store/authStore'
import { uploadPhoto, compressImage } from '../lib/storage'
import { sumNutrients, getFoodUnits, calculateFoodNutrients } from '../lib/utils'
import { useScrollLock } from '../hooks/useScrollLock'
import { NUTRIENT_LABELS, NUTRIENT_UNITS, MACRO_KEYS, EMPTY_NUTRIENTS } from '../types'
import type { MealFood } from '../types'
import DeleteReasonDialog from '../components/DeleteReasonDialog'

export default function MealFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { meals, addMeal, updateMeal, requestDeleteMeal } = useMealStore()
  const { foods } = useFoodStore()
  const user = useAuthStore((s) => s.user)

  const existing = id && id !== 'new' ? meals.find((m) => m.id === id) : null

  const [name, setName] = useState('')
  const [mealFoods, setMealFoods] = useState<MealFood[]>([])
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showFoodPicker, setShowFoodPicker] = useState(false)
  const [foodSearch, setFoodSearch] = useState('')
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  useScrollLock(showFoodPicker)

  useEffect(() => {
    if (existing) {
      setName(existing.name)
      setMealFoods([...existing.foods])
      if (existing.photoURL) setPhotoPreview(existing.photoURL)
    }
  }, [existing])

  const handlePhoto = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (photoPreview && !photoPreview.startsWith('http')) {
        URL.revokeObjectURL(photoPreview)
      }
      setPhotoFile(file)
      setPhotoPreview(URL.createObjectURL(file))
    }
  }

  const addFoodToMeal = (foodId: string) => {
    if (mealFoods.some((mf) => mf.foodId === foodId)) return
    const food = foods.find((f) => f.id === foodId)
    const units = food ? getFoodUnits(food) : []
    const defaultUnit = units[0]?.name || food?.unit || 'g'
    const defaultQty = food?.defaultQuantity || 1
    setMealFoods([...mealFoods, { foodId, quantity: defaultQty, unit: defaultUnit }])
    setShowFoodPicker(false)
    setFoodSearch('')
  }

  const updateQuantity = (index: number, quantity: number) => {
    const updated = [...mealFoods]
    updated[index] = { ...updated[index], quantity }
    setMealFoods(updated)
  }

  const updateUnit = (index: number, unit: string) => {
    const updated = [...mealFoods]
    updated[index] = { ...updated[index], unit, quantity: 1 }
    setMealFoods(updated)
  }

  const removeFoodFromMeal = (index: number) => {
    setMealFoods(mealFoods.filter((_, i) => i !== index))
  }

  const totalNutrients = sumNutrients(
    ...mealFoods.map((mf) => {
      const food = foods.find((f) => f.id === mf.foodId)
      if (!food) return { ...EMPTY_NUTRIENTS }
      return calculateFoodNutrients(food, mf.quantity, mf.unit)
    }),
  )

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!user) return
    setSubmitting(true)

    try {
      let photoURL = existing?.photoURL

      if (photoFile) {
        const compressed = await compressImage(photoFile)
        const path = `meals/${Date.now()}_${compressed.name}`
        photoURL = await uploadPhoto(compressed, path)
      }

      const mealData: Record<string, unknown> = {
        name,
        foods: mealFoods,
        createdBy: user.uid,
        createdAt: existing?.createdAt ?? Date.now(),
      }
      if (photoURL) {
        mealData.photoURL = photoURL
      }

      if (existing) {
        await updateMeal(existing.id, mealData as Partial<typeof existing>)
      } else {
        await addMeal(mealData as Omit<typeof existing & { id: string }, 'id'>)
      }

      navigate('/meals')
    } catch (err) {
      console.error(err)
      alert('保存失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (reason: string) => {
    if (!existing || !user) return
    try {
      await requestDeleteMeal(existing.id, existing.name, user.uid, reason)
      alert('删除申请已提交，等待管理员审批')
      navigate('/meals')
    } catch (err) {
      console.error(err)
      alert('提交失败')
    }
  }

  const filteredFoods = foods.filter((f) =>
    f.name.toLowerCase().includes(foodSearch.toLowerCase()),
  )

  return (
    <div className="pb-24">
      <div className="sticky top-0 bg-white z-10 px-4 py-3 flex items-center gap-3 border-b border-gray-100">
        <button onClick={() => navigate(-1)} className="text-gray-500 p-2 -ml-2" aria-label="返回">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="font-bold">{existing ? '编辑套餐' : '添加套餐'}</h2>
      </div>

      <form onSubmit={handleSubmit} className="px-4 mt-4 space-y-4">
        {/* Photo */}
        <div className="flex justify-center">
          <label className="cursor-pointer">
            {photoPreview ? (
              <img src={photoPreview} alt="" className="w-24 h-24 rounded-xl object-cover" />
            ) : (
              <div className="w-24 h-24 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
                添加照片
              </div>
            )}
            <input type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
          </label>
        </div>

        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">套餐名称</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="如：健身餐A"
          />
        </div>

        {/* Foods in meal */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-700">食物组合</h3>
            <button
              type="button"
              onClick={() => setShowFoodPicker(true)}
              className="text-sm text-emerald-500 font-medium"
            >
              + 添加食物
            </button>
          </div>

          {mealFoods.length === 0 ? (
            <div className="text-center py-6 text-gray-400 text-sm border border-dashed border-gray-200 rounded-lg">
              点击上方添加食物到套餐
            </div>
          ) : (
            <div className="space-y-2">
              {mealFoods.map((mf, index) => {
                const food = foods.find((f) => f.id === mf.foodId)
                if (!food) return null
                const units = getFoodUnits(food)
                return (
                  <div key={mf.foodId} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{food.name}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={mf.quantity}
                        onChange={(e) => updateQuantity(index, parseFloat(e.target.value) || 0)}
                        min={0}
                        step="any"
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-center"
                      />
                      {units.length > 1 ? (
                        <select
                          value={mf.unit || units[0].name}
                          onChange={(e) => updateUnit(index, e.target.value)}
                          className="px-1 py-1 border border-gray-300 rounded text-sm bg-white"
                        >
                          {units.map((u) => (
                            <option key={u.name} value={u.name}>{u.name}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs text-gray-400">{mf.unit || food.unit}</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFoodFromMeal(index)}
                      className="text-red-400 p-1"
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

        {/* Total nutrients */}
        {mealFoods.length > 0 && (
          <div className="bg-emerald-50 rounded-lg p-3">
            <h3 className="text-sm font-medium text-emerald-700 mb-2">套餐总营养</h3>
            <div className="grid grid-cols-2 gap-1">
              {MACRO_KEYS.map((key) => (
                <div key={key} className="flex justify-between text-xs">
                  <span className="text-gray-600">{NUTRIENT_LABELS[key]}</span>
                  <span className="font-medium">
                    {Math.round(totalNutrients[key] * 10) / 10} {NUTRIENT_UNITS[key]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || mealFoods.length === 0}
          className="w-full py-2.5 bg-emerald-500 text-white font-medium rounded-lg hover:bg-emerald-600 disabled:opacity-50 transition-colors"
        >
          {submitting ? '保存中...' : '保存'}
        </button>

        {existing && (
          <button
            type="button"
            onClick={() => setShowDeleteDialog(true)}
            className="w-full py-2.5 text-red-500 font-medium rounded-lg border border-red-200 hover:bg-red-50 transition-colors"
          >
            申请删除
          </button>
        )}
      </form>

      {existing && (
        <DeleteReasonDialog
          open={showDeleteDialog}
          itemName={existing.name}
          itemType="套餐"
          onConfirm={(reason) => {
            setShowDeleteDialog(false)
            handleDelete(reason)
          }}
          onCancel={() => setShowDeleteDialog(false)}
        />
      )}

      {/* Food picker modal */}
      {showFoodPicker && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-2xl max-h-[70vh] flex flex-col">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-medium">选择食物</h3>
              <button onClick={() => { setShowFoodPicker(false); setFoodSearch('') }} className="text-gray-400">
                关闭
              </button>
            </div>
            <div className="px-4 py-2">
              <input
                type="text"
                placeholder="搜索食物..."
                value={foodSearch}
                onChange={(e) => setFoodSearch(e.target.value)}
                className="w-full px-3 py-2 bg-gray-100 rounded-lg text-sm focus:outline-none"
                autoFocus
              />
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-8">
              {filteredFoods.map((food) => (
                <button
                  key={food.id}
                  type="button"
                  onClick={() => addFoodToMeal(food.id)}
                  disabled={mealFoods.some((mf) => mf.foodId === food.id)}
                  className="w-full text-left flex items-center gap-3 py-3 border-b border-gray-50 disabled:opacity-40"
                >
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 text-sm shrink-0">
                    {food.name[0]}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{food.name}</div>
                    <div className="text-xs text-gray-400">
                      每{food.defaultQuantity}{food.unit} · {food.nutrientsPerUnit.calories} kcal
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
