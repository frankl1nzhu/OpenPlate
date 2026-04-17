import { useState } from 'react'
import { useScrollLock } from '../hooks/useScrollLock'

interface DeleteReasonDialogProps {
  open: boolean
  itemName: string
  itemType: '食物' | '套餐'
  onConfirm: (reason: string) => void
  onCancel: () => void
}

export default function DeleteReasonDialog({ open, itemName, itemType, onConfirm, onCancel }: DeleteReasonDialogProps) {
  const [reason, setReason] = useState('')
  useScrollLock(open)

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-5 space-y-4">
        <h3 className="font-bold text-center">申请删除{itemType}</h3>
        <p className="text-sm text-gray-500 text-center">
          将发送删除申请「{itemName}」，管理员审批后才会删除。
        </p>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">删除原因</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="请填写删除原因..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            autoFocus
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 bg-gray-100 text-gray-600 font-medium rounded-lg"
          >
            取消
          </button>
          <button
            onClick={() => reason.trim() && onConfirm(reason.trim())}
            disabled={!reason.trim()}
            className="flex-1 py-2.5 bg-red-500 text-white font-medium rounded-lg disabled:opacity-50"
          >
            确认申请
          </button>
        </div>
      </div>
    </div>
  )
}
