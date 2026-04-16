import { useState, useEffect, type FormEvent, type ChangeEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useFoodStore } from '../store/foodStore'
import { useAuthStore } from '../store/authStore'
import { uploadPhoto, compressImage } from '../lib/storage'
import { NUTRIENT_LABELS, NUTRIENT_UNITS, EMPTY_NUTRIENTS, MACRO_KEYS, MICRO_KEYS } from '../types'
import type { Nutrients } from '../types'

export default function FoodFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { foods, addFood, updateFood, requestDelete } = useFoodStore()
  const user = useAuthStore((s) => s.user)

  const existing = id && id !== 'new' ? foods.find((f) => f.id === id) : null

  const [name, setName] = useState('')
  const [unit, setUnit] = useState('g')
  const [defaultQuantity, setDefaultQuantity] = useState(100)
  const [isCompleteProtein, setIsCompleteProtein] = useState(false)
  const [protein, setProtein] = useState(0) // single protein input
  const [nutrients, setNutrients] = useState<Nutrients>({ ...EMPTY_NUTRIENTS })
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showMicro, setShowMicro] = useState(false)

  useEffect(() => {
    if (existing) {
      setName(existing.name)
      setUnit(existing.unit)
      setDefaultQuantity(existing.defaultQuantity)
      setIsCompleteProtein(existing.isCompleteProtein)
      // Read protein from whichever field has value
      setProtein(existing.isCompleteProtein
        ? existing.nutrientsPerUnit.completeProtein
        : existing.nutrientsPerUnit.incompleteProtein)
      setNutrients({ ...existing.nutrientsPerUnit })
      if (existing.photoURL) setPhotoPreview(existing.photoURL)
      // Show micro section if any micro value is set
      const hasMicro = MICRO_KEYS.some((k) => (existing.nutrientsPerUnit[k] || 0) > 0)
      if (hasMicro) setShowMicro(true)
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

  const handleNutrient = (key: keyof Nutrients, value: string) => {
    setNutrients((prev) => ({ ...prev, [key]: parseFloat(value) || 0 }))
  }

  // Visible macro keys, excluding completeProtein and incompleteProtein (handled by protein input)
  const visibleMacroKeys = MACRO_KEYS.filter(
    (k) => k !== 'completeProtein' && k !== 'incompleteProtein',
  )

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!user) return
    setSubmitting(true)

    try {
      let photoURL: string | undefined = existing?.photoURL

      if (photoFile) {
        const compressed = await compressImage(photoFile)
        const path = `foods/${Date.now()}_${compressed.name}`
        photoURL = await uploadPhoto(compressed, path)
      }

      // Map protein to correct field based on checkbox
      const finalNutrients: Nutrients = {
        ...nutrients,
        completeProtein: isCompleteProtein ? protein : 0,
        incompleteProtein: isCompleteProtein ? 0 : protein,
      }

      const foodData: Record<string, unknown> = {
        name,
        unit,
        defaultQuantity,
        isCompleteProtein,
        nutrientsPerUnit: finalNutrients,
        createdBy: user.uid,
        createdAt: existing?.createdAt ?? Date.now(),
      }
      if (photoURL) {
        foodData.photoURL = photoURL
      }

      if (existing) {
        await updateFood(existing.id, foodData as Partial<typeof existing>)
      } else {
        await addFood(foodData as Omit<typeof existing & { id: string }, 'id'>)
      }

      navigate('/foods')
    } catch (err) {
      console.error(err)
      alert('保存失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!existing || !user) return
    if (!confirm('将发送删除申请，管理员审批后才会删除。确定申请？')) return
    try {
      await requestDelete(existing.id, existing.name, user.uid)
      alert('删除申请已提交，等待管理员审批')
      navigate('/foods')
    } catch (err) {
      console.error(err)
      alert('提交失败')
    }
  }

  return (
    <div className="pb-8">
      <div className="sticky top-0 bg-white z-10 px-4 py-3 flex items-center gap-3 border-b border-gray-100">
        <button onClick={() => navigate(-1)} className="text-gray-500 p-2 -ml-2" aria-label="返回">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="font-bold">{existing ? '编辑食物' : '添加食物'}</h2>
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
          <label className="block text-sm font-medium text-gray-700 mb-1">名称</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="如：鸡胸肉"
          />
        </div>

        {/* Unit and quantity */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">默认数量</label>
            <input
              type="number"
              value={defaultQuantity}
              onChange={(e) => setDefaultQuantity(parseFloat(e.target.value) || 0)}
              min={0}
              step="any"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">单位</label>
            <input
              type="text"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="g / 个 / 杯"
            />
          </div>
        </div>

        {/* Macro nutrients */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            每 {defaultQuantity}{unit} 宏量营养素
          </h3>
          <div className="space-y-2">
            {visibleMacroKeys.map((key) => (
              <div key={key} className="flex items-center gap-2">
                <label className="text-sm text-gray-600 w-20 shrink-0">
                  {NUTRIENT_LABELS[key]}
                </label>
                <input
                  type="number"
                  value={nutrients[key] || ''}
                  onChange={(e) => handleNutrient(key, e.target.value)}
                  min={0}
                  step="any"
                  className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-xs text-gray-400 w-10">{NUTRIENT_UNITS[key]}</span>
              </div>
            ))}

            {/* Protein row with checkbox */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 w-20 shrink-0">蛋白质</label>
              <input
                type="number"
                value={protein || ''}
                onChange={(e) => setProtein(parseFloat(e.target.value) || 0)}
                min={0}
                step="any"
                className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-xs text-gray-400 w-10">g</span>
            </div>

            <label className="flex items-center gap-2 cursor-pointer pl-1">
              <input
                type="checkbox"
                checked={isCompleteProtein}
                onChange={(e) => setIsCompleteProtein(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500"
              />
              <span className="text-xs text-gray-500">
                完全蛋白来源
                <span className="text-gray-400 ml-1">(肉/蛋/奶/鱼/大豆/荞麦/藜麦/奇亚籽/火麻仁)</span>
              </span>
            </label>
          </div>
        </div>

        {/* Micronutrients */}
        <div>
          <button
            type="button"
            onClick={() => setShowMicro(!showMicro)}
            className="flex items-center gap-1 text-sm font-medium text-gray-700"
          >
            微量元素
            <svg
              className={`w-4 h-4 transition-transform ${showMicro ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showMicro && (
            <div className="space-y-2 mt-2">
              {MICRO_KEYS.map((key) => (
                <div key={key} className="flex items-center gap-2">
                  <label className="text-sm text-gray-600 w-20 shrink-0">
                    {NUTRIENT_LABELS[key]}
                  </label>
                  <input
                    type="number"
                    value={nutrients[key] || ''}
                    onChange={(e) => handleNutrient(key, e.target.value)}
                    min={0}
                    step="any"
                    className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-xs text-gray-400 w-10">{NUTRIENT_UNITS[key]}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5 bg-emerald-500 text-white font-medium rounded-lg hover:bg-emerald-600 disabled:opacity-50 transition-colors"
        >
          {submitting ? '保存中...' : '保存'}
        </button>

        {existing && (
          <button
            type="button"
            onClick={handleDelete}
            className="w-full py-2.5 text-red-500 font-medium rounded-lg border border-red-200 hover:bg-red-50 transition-colors"
          >
            申请删除
          </button>
        )}
      </form>
    </div>
  )
}
