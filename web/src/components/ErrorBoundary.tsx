import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('CubeRush 3D Uncaught Error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleHardReset = () => {
    try {
      localStorage.clear();
    } catch {
      // ignore
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-[#090D16] text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-500/20 border border-red-500/50 flex items-center justify-center text-red-400 mb-4 shadow-[0_0_20px_rgba(239,68,68,0.3)] animate-pulse">
            <AlertTriangle size={32} />
          </div>

          <h1 className="text-xl font-black text-white mb-2">Display Recovery Mode</h1>
          <p className="text-xs text-gray-400 max-w-sm mb-4 leading-relaxed">
            CubeRush 3D intercepted an interface error and prevented a crash.
          </p>

          {this.state.error && (
            <div className="w-full max-w-sm bg-red-950/40 border border-red-500/30 rounded-xl p-3 text-left mb-5">
              <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider block mb-1">
                Diagnostic Trace
              </span>
              <p className="text-xs font-mono text-red-200 break-words leading-tight">
                {this.state.error.message || 'Unknown runtime error'}
              </p>
            </div>
          )}

          <div className="flex gap-3 w-full max-w-sm">
            <button
              onClick={this.handleRetry}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#00F0FF] to-blue-600 text-black font-black text-xs flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform"
            >
              <RefreshCw size={15} /> Retry
            </button>
            <button
              onClick={this.handleHardReset}
              className="py-3 px-4 rounded-xl bg-[#1A233A] border border-gray-700 text-gray-300 font-bold text-xs flex items-center justify-center gap-1.5 hover:text-white active:scale-95 transition-transform"
            >
              <RotateCcw size={15} /> Reset
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
