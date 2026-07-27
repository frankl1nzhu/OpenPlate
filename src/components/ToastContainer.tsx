import { useToastStore } from '../store/toastStore'

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore()

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[100] flex flex-col-reverse gap-2 w-[90%] max-w-sm pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          onClick={() => removeToast(toast.id)}
          className={`px-4 py-3 rounded-xl shadow-xl text-sm font-medium cursor-pointer animate-slide-up flex justify-between items-center pointer-events-auto ${
            toast.type === 'success'
              ? 'bg-emerald-600 text-white'
              : toast.type === 'error'
              ? 'bg-red-500 text-white'
              : 'bg-gray-800/95 backdrop-blur-md text-white border border-gray-700'
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
              className="ml-4 font-bold text-emerald-400 hover:text-emerald-300 underline shrink-0"
            >
              {toast.actionLabel || 'Action'}
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
