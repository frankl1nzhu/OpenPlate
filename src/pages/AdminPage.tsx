import { useState, useEffect } from 'react'
import { collection, query, where, onSnapshot, updateDoc, doc, deleteDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuthStore } from '../store/authStore'
import { fetchUserProfiles } from '../store/userProfileStore'
import type { DeleteRequest, UserProfile } from '../types'

export default function AdminPage() {
  const user = useAuthStore((s) => s.user)
  const isAdmin = useAuthStore((s) => s.isAdmin)
  const [requests, setRequests] = useState<DeleteRequest[]>([])
  const [profiles, setProfiles] = useState<Record<string, UserProfile>>({})
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)

  useEffect(() => {
    if (!isAdmin) return
    const q = query(collection(db, 'deleteRequests'), where('status', '==', 'pending'))
    const unsub = onSnapshot(q, (snapshot) => {
      const reqs = snapshot.docs.map((d) => {
        const data = d.data()
        return {
          id: d.id,
          // Support both old (foodId/foodName) and new (targetId/targetName) field names
          type: data.type || 'food',
          targetId: data.targetId || data.foodId,
          targetName: data.targetName || data.foodName,
          reason: data.reason || '',
          requestedBy: data.requestedBy,
          requestedAt: data.requestedAt,
          status: data.status,
          reviewedBy: data.reviewedBy,
          reviewedAt: data.reviewedAt,
        } as DeleteRequest
      })
      setRequests(reqs)
      setLoading(false)
    }, () => setLoading(false))
    return () => unsub()
  }, [isAdmin])

  // Fetch user profiles for all requesters
  useEffect(() => {
    const uids = [...new Set(requests.map((r) => r.requestedBy))]
    if (uids.length === 0) return
    fetchUserProfiles(uids).then(setProfiles)
  }, [requests])

  const handleApprove = async (req: DeleteRequest) => {
    if (!user) return
    setProcessing(req.id)
    try {
      // Delete the food or meal based on type
      const collectionName = req.type === 'meal' ? 'meals' : 'foods'
      await deleteDoc(doc(db, collectionName, req.targetId))
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
          {requests.map((req) => {
            const profile = profiles[req.requestedBy]
            return (
              <div key={req.id} className="p-4 bg-white rounded-xl border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${req.type === 'meal'
                        ? 'bg-orange-100 text-orange-600'
                        : 'bg-emerald-100 text-emerald-600'
                      }`}>
                      {req.type === 'meal' ? '套餐' : '食物'}
                    </span>
                    <span className="text-sm font-medium">{req.targetName}</span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(req.requestedAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="text-xs text-gray-400 mb-1">
                  申请人: {profile?.nickname || '未设置昵称'} ({profile?.email || req.requestedBy})
                </div>
                {req.reason && (
                  <div className="text-xs text-gray-500 mb-3 bg-gray-50 rounded-lg p-2">
                    原因: {req.reason}
                  </div>
                )}
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
            )
          })}
        </div>
      )}
    </div>
  )
}
