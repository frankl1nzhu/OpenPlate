import { Component } from 'react'
import type { ReactNode, ErrorInfo } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="p-4 m-4 bg-red-50 border border-red-200 rounded-xl">
          <div className="text-red-700 font-medium mb-1 text-sm">页面渲染出错</div>
          <div className="text-red-600 text-xs font-mono break-all">
            {this.state.error.message}
          </div>
          <button
            onClick={() => this.setState({ error: null })}
            className="mt-3 px-3 py-1.5 bg-red-500 text-white text-xs rounded-lg"
          >
            重试
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
