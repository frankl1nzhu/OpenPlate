import { useState, useEffect } from 'react'

export default function OfflineIndicator() {
  const [online, setOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setOnline(true)
    const handleOffline = () => setOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (online) return null

  return (
    <div className="fixed top-0 left-0 right-0 bg-amber-500 text-white text-center text-xs py-1 z-[100]">
      离线模式 - 数据将在恢复网络后同步
    </div>
  )
}
