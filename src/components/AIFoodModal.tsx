import { useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useFoodStore } from '../store/foodStore'
import { useLLMUsageStore } from '../store/llmUsageStore'
import { analyzeFoodPhoto, type LLMFoodResult } from '../lib/llm'
import { uploadPhoto, compressImage } from '../lib/storage'
import { useScrollLock } from '../hooks/useScrollLock'
import { MACRO_KEYS, MICRO_KEYS, NUTRIENT_LABELS, NUTRIENT_UNITS } from '../types'
import type { Nutrients } from '../types'

interface Props {
  onClose: () => void
}

type Stage = 'upload' | 'processing' | 'verify'

export default function AIFoodModal({ onClose }: Props) {
  useScrollLock(true)
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const { addFood } = useFoodStore()
  const { getRemainingUses, recordUsage } = useLLMUsageStore()

  const [stage, setStage] = useState<Stage>('upload')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [description, setDescription] = useState('')
  const [result, setResult] = useState<LLMFoodResult | null>(null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [remaining, setRemaining] = useState<number | null>(null)

  // Editable fields for verification
  const [editName, setEditName] = useState('')
  const [editIsComplete, setEditIsComplete] = useState(false)
  const [editNutrients, setEditNutrients] = useState<Nutrients | null>(null)

  const handlePhoto = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (photoPreview) URL.revokeObjectURL(photoPreview)
      setPhotoFile(file)
      setPhotoPreview(URL.createObjectURL(file))
      setError('')
    }
  }

  const handleAnalyze = async () => {
    if (!user || !photoFile) return

    // Check usage limit
    const rem = await getRemainingUses(user.uid, 'food')
    setRemaining(rem)
    if (rem <= 0) {
      setError('今日AI识别次数已用完（每天5次）')
      return
    }

    setStage('processing')
    setError('')

    try {
      const r = await analyzeFoodPhoto(photoFile, description || undefined)
      setResult(r)
      setEditName(r.name)
      setEditIsComplete(r.isCompleteProtein)
      setEditNutrients({ ...r.nutrients })
      setStage('verify')
      // Record usage only on success
      await recordUsage(user.uid, 'food')
      setRemaining(rem - 1)
    } catch (err) {
      console.error(err)
      setError('识别失败，请重试。' + (err instanceof Error ? err.message : ''))
      setStage('upload')
      // Don't count failed attempts
    }
  }

  const handleNutrient = (key: keyof Nutrients, value: string) => {
    if (!editNutrients) return
    setEditNutrients({ ...editNutrients, [key]: parseFloat(value) || 0 })
  }

  const handleConfirm = async () => {
    if (!user || !editNutrients || !editName.trim()) return
    setSubmitting(true)
    try {
      let photoURL: string | undefined
      if (photoFile) {
        const compressed = await compressImage(photoFile)
        const path = `foods/${Date.now()}_${compressed.name}`
        photoURL = await uploadPhoto(compressed, path)
      }

      // Split protein based on isCompleteProtein
      const protein = editIsComplete
        ? editNutrients.completeProtein + editNutrients.incompleteProtein
        : editNutrients.completeProtein + editNutrients.incompleteProtein
      const finalNutrients: Nutrients = {
        ...editNutrients,
        completeProtein: editIsComplete ? protein : 0,
        incompleteProtein: editIsComplete ? 0 : protein,
      }

      const foodData: Record<string, unknown> = {
        name: editName.trim(),
        unit: 'g',
        defaultQuantity: 100,
        units: [{ name: 'g', grams: 1 }],
        isCompleteProtein: editIsComplete,
        nutrientsPerUnit: finalNutrients,
        createdBy: user.uid,
        createdAt: Date.now(),
      }
      if (photoURL) foodData.photoURL = photoURL

      await addFood(foodData as Parameters<typeof addFood>[0])
      onClose()
      navigate('/foods')
    } catch (err) {
      console.error(err)
      setError('保存失败')
    } finally {
      setSubmitting(false)
    }
  }

  const visibleMacroKeys = MACRO_KEYS.filter(
    (k) => k !== 'completeProtein' && k !== 'incompleteProtein',
  )

  const totalProtein = editNutrients
    ? editNutrients.completeProtein + editNutrients.incompleteProtein
    : 0

  const [showMicro, setShowMicro] = useState(false)

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
      <div className="bg-white w-full max-w-lg rounded-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between shrink-0">
          <h3 className="font-medium">AI识别添加食物</h3>
          <div className="flex items-center gap-3">
            {remaining !== null && (
              <span className="text-xs text-gray-400">今日剩余 {remaining} 次</span>
            )}
            <button onClick={onClose} className="text-gray-400 text-sm">关闭</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {/* Upload stage */}
          {stage === 'upload' && (
            <>
              <div className="flex justify-center">
                <label className="cursor-pointer">
                  {photoPreview ? (
                    <img src={photoPreview} alt="" className="w-32 h-32 rounded-xl object-cover" />
                  ) : (
                    <div className="w-32 h-32 rounded-xl bg-gray-100 flex flex-col items-center justify-center text-gray-400 text-sm gap-1">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      拍照/上传
                    </div>
                  )}
                  <input type="file" accept="image/*" capture="environment" onChange={handlePhoto} className="hidden" />
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述（可选）</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="如：烤鸡胸肉，约200克"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {error && (
                <div className="text-red-500 text-sm bg-red-50 rounded-lg p-3">{error}</div>
              )}

              <button
                onClick={handleAnalyze}
                disabled={!photoFile}
                className="w-full py-2.5 bg-emerald-500 text-white font-medium rounded-lg disabled:opacity-50"
              >
                开始识别
              </button>
            </>
          )}

          {/* Processing stage */}
          {stage === 'processing' && (
            <div className="flex flex-col items-center py-12 gap-4">
              <div className="w-12 h-12 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <div className="text-sm text-gray-500">处理中...</div>
              <div className="text-xs text-gray-400">AI正在分析食物营养成分</div>
            </div>
          )}

          {/* Verify stage */}
          {stage === 'verify' && editNutrients && (
            <>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="text-sm font-medium text-amber-700">待验证</div>
                <div className="text-xs text-amber-600 mt-1">请核实以下每100克营养数据，确认后将添加到食物库</div>
              </div>

              {photoPreview && (
                <div className="flex justify-center">
                  <img src={photoPreview} alt="" className="w-20 h-20 rounded-xl object-cover" />
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">食物名称</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Protein type */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editIsComplete}
                  onChange={(e) => setEditIsComplete(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500"
                />
                <span className="text-xs text-gray-500">完全蛋白来源</span>
              </label>

              {/* Macros */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700">每100g营养素</h4>
                {visibleMacroKeys.map((key) => (
                  <div key={key} className="flex items-center gap-2">
                    <label className="text-sm text-gray-600 w-24 shrink-0">{NUTRIENT_LABELS[key]}</label>
                    <input
                      type="number"
                      value={editNutrients[key] || ''}
                      onChange={(e) => handleNutrient(key, e.target.value)}
                      min={0}
                      step="any"
                      className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="text-xs text-gray-400 w-10">{NUTRIENT_UNITS[key]}</span>
                  </div>
                ))}

                {/* Protein */}
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600 w-24 shrink-0">蛋白质</label>
                  <input
                    type="number"
                    value={totalProtein || ''}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0
                      setEditNutrients({
                        ...editNutrients,
                        completeProtein: editIsComplete ? val : 0,
                        incompleteProtein: editIsComplete ? 0 : val,
                      })
                    }}
                    min={0}
                    step="any"
                    className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-xs text-gray-400 w-10">g</span>
                </div>

                {/* Micros */}
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

                {showMicro && MICRO_KEYS.map((key) => (
                  <div key={key} className="flex items-center gap-2">
                    <label className="text-sm text-gray-600 w-24 shrink-0">{NUTRIENT_LABELS[key]}</label>
                    <input
                      type="number"
                      value={editNutrients[key] || ''}
                      onChange={(e) => handleNutrient(key, e.target.value)}
                      min={0}
                      step="any"
                      className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="text-xs text-gray-400 w-10">{NUTRIENT_UNITS[key]}</span>
                  </div>
                ))}
              </div>

              {error && (
                <div className="text-red-500 text-sm bg-red-50 rounded-lg p-3">{error}</div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => { setStage('upload'); setResult(null); setError('') }}
                  className="flex-1 py-2.5 border border-gray-300 text-gray-600 font-medium rounded-lg"
                >
                  重新识别
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={submitting || !editName.trim()}
                  className="flex-1 py-2.5 bg-emerald-500 text-white font-medium rounded-lg disabled:opacity-50"
                >
                  {submitting ? '保存中...' : '确认添加'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
