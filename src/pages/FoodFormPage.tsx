import { useState, useEffect, type FormEvent, type ChangeEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useFoodStore } from '../store/foodStore'
import { useAuthStore } from '../store/authStore'
import { uploadPhoto, compressImage, deletePhoto } from '../lib/storage'
import { NUTRIENT_LABELS, NUTRIENT_UNITS, EMPTY_NUTRIENTS, MACRO_KEYS, MICRO_KEYS } from '../types'
import type { Nutrients, FoodUnit } from '../types'
import DeleteReasonDialog from '../components/DeleteReasonDialog'

export default function FoodFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { foods, addFood, updateFood, requestDelete } = useFoodStore()
  const user = useAuthStore((s) => s.user)

  const existing = id && id !== 'new' ? foods.find((f) => f.id === id) : null

  const [name, setName] = useState('')
  const [baseUnit, setBaseUnit] = useState('g')
  const [baseAmount, setBaseAmount] = useState(100)
  const [extraUnits, setExtraUnits] = useState<{ name: string; grams: number }[]>([])
  const [isCompleteProtein, setIsCompleteProtein] = useState(false)
  const [protein, setProtein] = useState(0)
  const [nutrients, setNutrients] = useState<Nutrients>({ ...EMPTY_NUTRIENTS })
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showMicro, setShowMicro] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  useEffect(() => {
    if (existing) {
      setName(existing.name)
      setBaseUnit(existing.unit)
      setBaseAmount(existing.defaultQuantity)
      setIsCompleteProtein(existing.isCompleteProtein)
      setProtein(existing.isCompleteProtein
        ? existing.nutrientsPerUnit.completeProtein
        : existing.nutrientsPerUnit.incompleteProtein)
      setNutrients({ ...existing.nutrientsPerUnit })
      if (existing.photoURL) setPhotoPreview(existing.photoURL)
      const hasMicro = MICRO_KEYS.some((k) => (existing.nutrientsPerUnit[k] || 0) > 0)
      if (hasMicro) setShowMicro(true)
      // Load extra units (exclude base unit)
      if (existing.units) {
        const extras = existing.units.filter((u) => u.name !== existing.unit)
        setExtraUnits(extras.map((u) => ({ name: u.name, grams: u.grams })))
      }
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

  const visibleMacroKeys = MACRO_KEYS.filter(
    (k) => k !== 'completeProtein' && k !== 'incompleteProtein',
  )

  const addExtraUnit = () => {
    setExtraUnits([...extraUnits, { name: '', grams: 0 }])
  }

  const updateExtraUnit = (index: number, field: 'name' | 'grams', value: string) => {
    const updated = [...extraUnits]
    if (field === 'name') {
      updated[index] = { ...updated[index], name: value }
    } else {
      updated[index] = { ...updated[index], grams: parseFloat(value) || 0 }
    }
    setExtraUnits(updated)
  }

  const removeExtraUnit = (index: number) => {
    setExtraUnits(extraUnits.filter((_, i) => i !== index))
  }

  // Build the full units array
  const buildUnits = (): FoodUnit[] => {
    // Base unit: 1 base unit = 1 gram if base is "g"/"ml", else 1 base unit = baseAmount grams
    const isGramLike = ['g', 'ml', 'kg', 'l', 'mg'].includes(baseUnit.toLowerCase())
    const baseGrams = isGramLike ? 1 : baseAmount
    const units: FoodUnit[] = [{ name: baseUnit, grams: baseGrams }]

    for (const eu of extraUnits) {
      if (eu.name.trim() && eu.grams > 0) {
        units.push({ name: eu.name.trim(), grams: eu.grams })
      }
    }
    return units
  }

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
        // Delete old photo after new one is uploaded
        if (existing?.photoURL) {
          deletePhoto(existing.photoURL).catch(console.warn)
        }
      }

      const finalNutrients: Nutrients = {
        ...nutrients,
        completeProtein: isCompleteProtein ? protein : 0,
        incompleteProtein: isCompleteProtein ? 0 : protein,
      }

      const foodData: Record<string, unknown> = {
        name,
        unit: baseUnit,
        defaultQuantity: baseAmount,
        units: buildUnits(),
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

  const handleDelete = async (reason: string) => {
    if (!existing || !user) return
    try {
      await requestDelete(existing.id, existing.name, user.uid, reason)
      alert('删除申请已提交，等待管理员审批')
      navigate('/foods')
    } catch (err) {
      console.error(err)
      alert('提交失败')
    }
  }

  return (
    <div className="pb-24">
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

        {/* Base unit and amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">基准数量与单位</label>
          <div className="flex gap-2">
            <input
              type="number"
              value={baseAmount}
              onChange={(e) => setBaseAmount(parseFloat(e.target.value) || 0)}
              min={0.01}
              step="any"
              className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <input
              type="text"
              value={baseUnit}
              onChange={(e) => setBaseUnit(e.target.value)}
              required
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="g / ml / 个"
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">下方营养素对应此数量</p>
        </div>

        {/* Extra units */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">换算单位</label>
            <button
              type="button"
              onClick={addExtraUnit}
              className="text-sm text-emerald-500 font-medium"
            >
              + 添加单位
            </button>
          </div>
          {extraUnits.length === 0 ? (
            <p className="text-xs text-gray-400">可添加额外单位，如 1个 = 50g</p>
          ) : (
            <div className="space-y-2">
              {extraUnits.map((eu, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 shrink-0">1</span>
                  <input
                    type="text"
                    value={eu.name}
                    onChange={(e) => updateExtraUnit(index, 'name', e.target.value)}
                    placeholder="个"
                    className="w-16 px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-sm text-gray-500 shrink-0">=</span>
                  <input
                    type="number"
                    value={eu.grams || ''}
                    onChange={(e) => updateExtraUnit(index, 'grams', e.target.value)}
                    min={0.01}
                    step="any"
                    placeholder="50"
                    className="w-20 px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-sm text-gray-500 shrink-0">{baseUnit}</span>
                  <button
                    type="button"
                    onClick={() => removeExtraUnit(index)}
                    className="text-red-400 p-1"
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

        {/* Macro nutrients */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            每 {baseAmount}{baseUnit} 营养素
          </h3>
          <div className="space-y-2">
            {visibleMacroKeys.map((key) => (
              <div key={key} className="flex items-center gap-2">
                <label className="text-sm text-gray-600 w-24 shrink-0">
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
              <label className="text-sm text-gray-600 w-24 shrink-0">蛋白质</label>
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
                  <label className="text-sm text-gray-600 w-24 shrink-0">
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
          itemType="食物"
          onConfirm={(reason) => {
            setShowDeleteDialog(false)
            handleDelete(reason)
          }}
          onCancel={() => setShowDeleteDialog(false)}
        />
      )}
    </div>
  )
}
