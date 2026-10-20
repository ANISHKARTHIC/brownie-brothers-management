import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo)
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null })
    window.location.reload()
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
          <div className="mb-4 rounded-2xl bg-amber-50 p-4 text-[#8b5a2b]">
            <AlertTriangle className="h-10 w-10 text-[#8b5a2b]" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h2>
          <p className="max-w-md text-sm text-gray-500 mb-6">
            {this.state.error?.message || 'An unexpected error occurred while loading this view.'}
          </p>
          <button
            onClick={this.handleReset}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#8b5a2b] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#6b4423] transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
            Reload Page
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
