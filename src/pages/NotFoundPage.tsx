import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 text-center">
      <h1 className="text-8xl font-bold text-emerald-600 mb-4">404</h1>
      <p className="text-xl text-gray-600 mb-8">页面未找到</p>
      <Link
        to="/"
        className="px-6 py-3 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors"
      >
        返回首页
      </Link>
    </div>
  )
}
