import { useState, type ChangeEvent } from 'react'
import { useAuthStore } from '../store/authStore'
import { useLLMUsageStore } from '../store/llmUsageStore'
import { useAiTaskStore } from '../store/aiTaskStore'
import { useScrollLock } from '../hooks/useScrollLock'

interface Props {
  onClose: () => void
}

export default function AIFoodModal({ onClose }: Props) {
  useScrollLock(true)
  const user = useAuthStore((s) => s.user)
  const { getRemainingUses } = useLLMUsageStore()
  const { startFoodTask } = useAiTaskStore()

  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [starting, setStarting] = useState(false)

  const handlePhoto = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (photoPreview) URL.revokeObjectURL(photoPreview)
      setPhotoFile(file)
      setPhotoPreview(URL.createObjectURL(file))
      setError('')
    }
  }

  const handleStart = async () => {
    if (!user || !photoFile) return
    setStarting(true)
    setError('')
    try {
      const rem = await getRemainingUses(user.uid, 'food')
      if (rem <= 0) {
        setError('今日AI识别次数已用完（每天5次）')
        setStarting(false)
        return
      }
      // Start background task and close immediately
      await startFoodTask(user.uid, photoFile, description || undefined)
      onClose()
    } catch (err) {
      setError('启动失败，请重试')
      setStarting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
      <div className="bg-white w-full max-w-lg rounded-2xl flex flex-col">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between shrink-0">
          <h3 className="font-medium">AI识别添加食物</h3>
          <button onClick={onClose} className="text-gray-400 text-sm">关闭</button>
        </div>

        <div className="px-4 py-4 space-y-3">
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
              <input type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
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

          <p className="text-xs text-gray-400">
            点击开始识别后，窗口将关闭，AI在后台处理中，完成后在食物库顶部显示验证提示。
          </p>

          {error && (
            <div className="text-red-500 text-sm bg-red-50 rounded-lg p-3">{error}</div>
          )}

          <button
            onClick={handleStart}
            disabled={!photoFile || starting}
            className="w-full py-2.5 bg-emerald-500 text-white font-medium rounded-lg disabled:opacity-50"
          >
            {starting ? '启动中...' : '开始识别'}
          </button>
        </div>
      </div>
    </div>
  )
}
