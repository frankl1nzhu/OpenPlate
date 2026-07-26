import { useToastStore } from '../store/toastStore'

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore()

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-[90%] max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          onClick={() => removeToast(toast.id)}
          className={`px-4 py-3 rounded-xl shadow-lg text-sm font-medium cursor-pointer animate-slide-down flex justify-between items-center ${
            toast.type === 'success'
              ? 'bg-emerald-500 text-white'
              : toast.type === 'error'
              ? 'bg-red-500 text-white'
              : 'bg-blue-500 text-white'
          }`}
        >
          <span>{toast.message}</span>
          {toast.action && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                toast.action?.()
                removeToast(toast.id)
              }}
              className="ml-4 font-bold underline shrink-0 hover:opacity-80"
            >
              {toast.actionLabel || 'Action'}
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
