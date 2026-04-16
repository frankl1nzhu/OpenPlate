import { useState, useEffect } from 'react'
import { collection, query, where, onSnapshot, updateDoc, doc, deleteDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuthStore } from '../store/authStore'
import type { DeleteRequest } from '../types'

export default function AdminPage() {
  const user = useAuthStore((s) => s.user)
  const isAdmin = useAuthStore((s) => s.isAdmin)
  const [requests, setRequests] = useState<DeleteRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)

  useEffect(() => {
    if (!isAdmin) return
    const q = query(collection(db, 'deleteRequests'), where('status', '==', 'pending'))
    const unsub = onSnapshot(q, (snapshot) => {
      const reqs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as DeleteRequest))
      setRequests(reqs)
      setLoading(false)
    }, () => setLoading(false))
    return () => unsub()
  }, [isAdmin])

  const handleApprove = async (req: DeleteRequest) => {
    if (!user) return
    setProcessing(req.id)
    try {
      // Delete the food
      await deleteDoc(doc(db, 'foods', req.foodId))
      // Update request status
      await updateDoc(doc(db, 'deleteRequests', req.id), {
        status: 'approved',
        reviewedBy: user.uid,
        reviewedAt: Date.now(),
      })
    } catch (err) {
      console.error(err)
      alert('操作失败')
    } finally {
      setProcessing(null)
    }
  }

  const handleReject = async (req: DeleteRequest) => {
    if (!user) return
    setProcessing(req.id)
    try {
      await updateDoc(doc(db, 'deleteRequests', req.id), {
        status: 'rejected',
        reviewedBy: user.uid,
        reviewedAt: Date.now(),
      })
    } catch (err) {
      console.error(err)
      alert('操作失败')
    } finally {
      setProcessing(null)
    }
  }

  if (!isAdmin) {
    return (
      <div className="flex justify-center py-12 text-gray-400 text-sm">
        无管理员权限
      </div>
    )
  }

  return (
    <div className="pb-20 px-4 py-4">
      <h2 className="font-bold mb-4">删除申请管理</h2>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          暂无待审核的删除申请
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <div key={req.id} className="p-4 bg-white rounded-xl border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{req.foodName}</span>
                <span className="text-xs text-gray-400">
                  {new Date(req.requestedAt).toLocaleDateString()}
                </span>
              </div>
              <div className="text-xs text-gray-400 mb-3">
                申请人: {req.requestedBy}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleApprove(req)}
                  disabled={processing === req.id}
                  className="flex-1 py-2 bg-emerald-500 text-white text-sm font-medium rounded-lg disabled:opacity-50"
                >
                  批准删除
                </button>
                <button
                  onClick={() => handleReject(req)}
                  disabled={processing === req.id}
                  className="flex-1 py-2 bg-gray-200 text-gray-600 text-sm font-medium rounded-lg disabled:opacity-50"
                >
                  拒绝
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
