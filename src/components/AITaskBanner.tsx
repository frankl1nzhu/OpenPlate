import { useState } from 'react'
import { useAiTaskStore, type AiTask } from '../store/aiTaskStore'
import { useAuthStore } from '../store/authStore'
import { useFoodStore } from '../store/foodStore'
import { useDailyLogStore } from '../store/dailyLogStore'
import { useScrollLock } from '../hooks/useScrollLock'
import { MACRO_KEYS, MICRO_KEYS, NUTRIENT_LABELS, NUTRIENT_UNITS } from '../types'
import type { Nutrients } from '../types'
import { uploadPhoto, compressImage } from '../lib/storage'

// ─── Verify modal ────────────────────────────────────────────────────────────

function VerifyModal({ task, onClose }: { task: AiTask; onClose: () => void }) {
  useScrollLock(true)
  const user = useAuthStore((s) => s.user)
  const addFood = useFoodStore((s) => s.addFood)
  const addEntry = useDailyLogStore((s) => s.addEntry)
  const dismissTask = useAiTaskStore((s) => s.dismissTask)

  const initial = task.result!
  const [editName, setEditName] = useState(initial.name)
  const [editIsComplete, setEditIsComplete] = useState(initial.isCompleteProtein)
  const [editNutrients, setEditNutrients] = useState<Nutrients>({ ...initial.nutrients })
  const [showMicro, setShowMicro] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const totalProtein = editNutrients.completeProtein + editNutrients.incompleteProtein

  const handleNutrient = (key: keyof Nutrients, value: string) => {
    setEditNutrients((prev) => ({ ...prev, [key]: parseFloat(value) || 0 }))
  }

  const visibleMacroKeys = MACRO_KEYS.filter(
    (k) => k !== 'completeProtein' && k !== 'incompleteProtein',
  )

  const handleConfirm = async () => {
    if (!user || !editName.trim()) return
    setSubmitting(true)
    setError('')
    try {
      const protein = editNutrients.completeProtein + editNutrients.incompleteProtein
      const finalNutrients: Nutrients = {
        ...editNutrients,
        completeProtein: editIsComplete ? protein : 0,
        incompleteProtein: editIsComplete ? 0 : protein,
      }

      if (task.type === 'food') {
        // Re-upload photo to permanent foods/ path so all users can see it.
        // The ai-tasks/ file is deleted by dismissTask(), so we must move it first.
        let persistedPhotoURL: string | undefined
        if (task.photoDownloadURL) {
          try {
            const resp = await fetch(task.photoDownloadURL)
            const blob = await resp.blob()
            const rawFile = new File([blob], `${Date.now()}.jpg`, { type: 'image/jpeg' })
            const photoFile = await compressImage(rawFile)
            persistedPhotoURL = await uploadPhoto(photoFile, `foods/${Date.now()}_ai.jpg`)
          } catch {
            persistedPhotoURL = task.photoDownloadURL // fallback: keep original URL
          }
        }
        // Photo is already in Storage — use its download URL directly
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
        if (persistedPhotoURL) foodData.photoURL = persistedPhotoURL
        await addFood(foodData as Parameters<typeof addFood>[0])
      } else {
        // Re-upload photo to permanent quick-records/ path.
        // The ai-tasks/ file is deleted by dismissTask(), so we must move it first.
        let persistedPhotoURL: string | undefined
        if (task.photoDownloadURL) {
          try {
            const resp = await fetch(task.photoDownloadURL)
            const blob = await resp.blob()
            const rawFile = new File([blob], `${Date.now()}.jpg`, { type: 'image/jpeg' })
            const photoFile = await compressImage(rawFile)
            persistedPhotoURL = await uploadPhoto(photoFile, `quick-records/${Date.now()}_ai.jpg`)
          } catch {
            persistedPhotoURL = task.photoDownloadURL // fallback: keep original URL
          }
        }
        await addEntry(user.uid, {
          type: 'quick',
          refId: '',
          name: editName.trim(),
          ...(persistedPhotoURL ? { photoURL: persistedPhotoURL } : {}),
          quantity: 1,
          nutrients: finalNutrients,
          timestamp: Date.now(),
        }, task.targetDate)
      }

      dismissTask(task.id)
      onClose()
    } catch (err) {
      console.error(err)
      setError('保存失败：' + (err instanceof Error ? err.message : ''))
    } finally {
      setSubmitting(false)
    }
  }

  const accentColor = task.type === 'food' ? 'emerald' : 'blue'
  const ringClass = task.type === 'food' ? 'focus:ring-emerald-500' : 'focus:ring-blue-500'
  const btnClass = task.type === 'food'
    ? 'bg-emerald-500 text-white'
    : 'bg-blue-500 text-white'

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
      <div className="bg-white w-full max-w-lg rounded-2xl max-h-[85vh] flex flex-col">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between shrink-0">
          <h3 className="font-medium">
            {task.type === 'food' ? '验证食物信息' : '验证记录营养'}
          </h3>
          <button onClick={onClose} className="text-gray-400 text-sm">关闭</button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          <div className={`bg-amber-50 border border-amber-200 rounded-lg p-3`}>
            <div className="text-sm font-medium text-amber-700">待验证</div>
            <div className="text-xs text-amber-600 mt-1">
              {task.type === 'food'
                ? '请核实每100g营养数据，确认后将添加到食物库'
                : `请核实总营养数据，确认后将添加到 ${task.targetDate} 的记录`}
            </div>
          </div>

          <div className="flex justify-center">
            {task.photoDownloadURL && <img src={task.photoDownloadURL} alt="" className="w-20 h-20 rounded-xl object-cover" />}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {task.type === 'food' ? '食物名称' : '记录名称'}
            </label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 ${ringClass}`}
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={editIsComplete}
              onChange={(e) => setEditIsComplete(e.target.checked)}
              className={`w-4 h-4 rounded text-${accentColor}-500`}
            />
            <span className="text-xs text-gray-500">
              {task.type === 'food' ? '完全蛋白来源' : '主要为完全蛋白来源'}
            </span>
          </label>

          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">
              {task.type === 'food' ? '每100g营养素' : '总营养素'}
            </h4>

            {visibleMacroKeys.map((key) => (
              <div key={key} className="flex items-center gap-2">
                <label className="text-sm text-gray-600 w-24 shrink-0">{NUTRIENT_LABELS[key]}</label>
                <input
                  type="number"
                  value={editNutrients[key] || ''}
                  onChange={(e) => handleNutrient(key, e.target.value)}
                  min={0} step="any"
                  className={`flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 ${ringClass}`}
                />
                <span className="text-xs text-gray-400 w-10">{NUTRIENT_UNITS[key]}</span>
              </div>
            ))}

            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 w-24 shrink-0">蛋白质</label>
              <input
                type="number"
                value={totalProtein || ''}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0
                  setEditNutrients((prev) => ({
                    ...prev,
                    completeProtein: editIsComplete ? val : 0,
                    incompleteProtein: editIsComplete ? 0 : val,
                  }))
                }}
                min={0} step="any"
                className={`flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 ${ringClass}`}
              />
              <span className="text-xs text-gray-400 w-10">g</span>
            </div>

            <button
              type="button"
              onClick={() => setShowMicro(!showMicro)}
              className="flex items-center gap-1 text-sm font-medium text-gray-700"
            >
              微量元素
              <svg className={`w-4 h-4 transition-transform ${showMicro ? 'rotate-180' : ''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  min={0} step="any"
                  className={`flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 ${ringClass}`}
                />
                <span className="text-xs text-gray-400 w-10">{NUTRIENT_UNITS[key]}</span>
              </div>
            ))}
          </div>

          {error && <div className="text-red-500 text-sm bg-red-50 rounded-lg p-3">{error}</div>}

          <button
            onClick={handleConfirm}
            disabled={submitting || !editName.trim()}
            className={`w-full py-2.5 font-medium rounded-lg disabled:opacity-50 ${btnClass}`}
          >
            {submitting ? '保存中...' : '确认添加'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Task banner card ─────────────────────────────────────────────────────────

function TaskCard({ task }: { task: AiTask }) {
  const dismissTask = useAiTaskStore((s) => s.dismissTask)
  const [showVerify, setShowVerify] = useState(false)

  return (
    <>
      <div className={`flex items-center gap-3 px-4 py-3 ${
        task.status === 'ready'
          ? 'bg-amber-50 border-b border-amber-200'
          : task.status === 'failed'
          ? 'bg-red-50 border-b border-red-200'
          : 'bg-blue-50 border-b border-blue-200'
      }`}>
        {task.status === 'processing' ? (
          <div className="w-8 h-8 shrink-0 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <img src={task.photoDownloadURL} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
        )}

        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium">
            {task.status === 'processing' && (
              <span className="text-blue-600">AI识别中...</span>
            )}
            {task.status === 'ready' && (
              <span className="text-amber-700">待验证</span>
            )}
            {task.status === 'failed' && (
              <span className="text-red-600">识别失败</span>
            )}
          </div>
          {task.status === 'ready' && task.result && (
            <div className="text-xs text-gray-500 truncate">{task.result.name}</div>
          )}
          {task.status === 'failed' && task.error && (
            <div className="text-xs text-gray-400 truncate">{task.error}</div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {task.status === 'ready' && (
            <button
              onClick={() => setShowVerify(true)}
              className="text-xs px-3 py-1.5 bg-amber-500 text-white rounded-lg font-medium"
            >
              验证
            </button>
          )}
          <button
            onClick={() => dismissTask(task.id)}
            className="text-gray-400 p-1"
            aria-label="关闭"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {showVerify && task.result && (
        <VerifyModal task={task} onClose={() => setShowVerify(false)} />
      )}
    </>
  )
}

// ─── Public component ─────────────────────────────────────────────────────────

interface Props {
  type: 'food' | 'quick'
}

export default function AITaskBanner({ type }: Props) {
  const allTasks = useAiTaskStore((s) => s.tasks)
  const tasks = allTasks.filter((t) => t.type === type)
  if (tasks.length === 0) return null
  return (
    <div>
      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} />
      ))}
    </div>
  )
}
