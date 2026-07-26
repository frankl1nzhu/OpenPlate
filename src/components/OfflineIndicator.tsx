import { useState, useEffect } from 'react'

export default function OfflineIndicator() {
  const [online, setOnline] = useState(navigator.onLine)

  useEffect(() => {
    let mounted = true

    const checkPing = async () => {
      if (!navigator.onLine) {
        if (mounted) setOnline(false)
        return
      }
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 4000)
        const res = await fetch('/', { method: 'HEAD', cache: 'no-store', signal: controller.signal })
        clearTimeout(timeoutId)
        if (mounted) setOnline(res.ok || res.status < 500)
      } catch {
        if (mounted) setOnline(false)
      }
    }

    const handleOnline = () => {
      setOnline(true)
      checkPing()
    }
    const handleOffline = () => setOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    const interval = setInterval(checkPing, 20000)
    checkPing()

    return () => {
      mounted = false
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(interval)
    }
  }, [])

  if (online) return null

  return (
    <div className="fixed top-0 left-0 right-0 bg-amber-500 text-white text-center text-xs py-1 z-[100]">
      离线模式 - 网络连线受阻，数据将在恢复后自动同步
    </div>
  )
}
