import React from 'react';
import { AlertTriangle, RefreshCw, Home, ShieldAlert, ServerCrash, FileQuestion } from 'lucide-react';

export interface ErrorScreenProps {
  statusCode?: number | string;
  title?: string;
  message?: string;
  theme?: 'dark' | 'light';
  onRetry?: () => void;
  onGoHome?: () => void;
}

const ERROR_PRESETS: Record<
  string,
  { title: string; message: string; badge: string }
> = {
  '404': {
    title: 'Resource Not Found',
    message:
      'The requested page, release, or endpoint could not be found (HTTP 404).',
    badge: '404 NOT FOUND',
  },
  '401': {
    title: 'Authentication Required',
    message:
      'Your session or API key is missing or expired (HTTP 401). Please sign in again.',
    badge: '401 UNAUTHORIZED',
  },
  '403': {
    title: 'Access Denied',
    message:
      'You do not have permission to access this resource (HTTP 403).',
    badge: '403 FORBIDDEN',
  },
  '500': {
    title: 'Internal Server Error',
    message:
      'The backend encountered an unexpected error while processing your request (HTTP 500).',
    badge: '500 SERVER ERROR',
  },
  '503': {
    title: 'Service Unavailable',
    message:
      'The service is temporarily unavailable (HTTP 503). Please try again shortly.',
    badge: '503 UNAVAILABLE',
  },
};

export const ErrorScreen: React.FC<ErrorScreenProps> = ({
  statusCode = 'ERR',
  title,
  message,
  theme = 'dark',
  onRetry,
  onGoHome,
}) => {
  const isDark = theme === 'dark';
  const codeKey = String(statusCode);
  const preset = ERROR_PRESETS[codeKey];

  const resolvedTitle = title || preset?.title || 'Something Went Wrong';
  const resolvedMessage =
    message ||
    preset?.message ||
    'An unexpected error occurred while loading this view.';
  const resolvedBadge = preset?.badge || `ERROR ${codeKey}`;

  const Icon =
    codeKey === '404'
      ? FileQuestion
      : codeKey === '401' || codeKey === '403'
      ? ShieldAlert
      : codeKey === '500' || codeKey === '503'
      ? ServerCrash
      : AlertTriangle;

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4 animate-fade-in">
      <div
        className={`w-full max-w-lg rounded-3xl border p-8 text-center shadow-2xl backdrop-blur-xl ${
          isDark
            ? 'bg-slate-900/90 border-slate-800 text-white'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-500">
          <Icon className="h-8 w-8" />
        </div>

        <div className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-mono font-bold tracking-wider bg-rose-500/10 text-rose-500 border border-rose-500/20 mb-3">
          {resolvedBadge}
        </div>

        <h2 className="text-2xl font-black tracking-tight mb-2">
          {resolvedTitle}
        </h2>
        <p
          className={`text-sm leading-relaxed mb-6 ${
            isDark ? 'text-slate-400' : 'text-slate-600'
          }`}
        >
          {resolvedMessage}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-bold shadow-lg shadow-cyan-500/25 hover:opacity-95 transition-all cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Retry</span>
            </button>
          )}
          {onGoHome && (
            <button
              type="button"
              onClick={onGoHome}
              className={`inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                isDark
                  ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                  : 'bg-slate-100 border-slate-200 text-slate-800 hover:bg-slate-200'
              }`}
            >
              <Home className="h-3.5 w-3.5" />
              <span>Back to Dashboard</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

interface ErrorBoundaryProps {
  children: React.ReactNode;
  theme?: 'dark' | 'light';
  onGoHome?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || 'Unexpected rendering error.',
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorScreen
          statusCode="ERR"
          title="Application Error"
          message={this.state.errorMessage}
          theme={this.props.theme}
          onRetry={() => this.setState({ hasError: false, errorMessage: '' })}
          onGoHome={() => {
            this.setState({ hasError: false, errorMessage: '' });
            this.props.onGoHome?.();
          }}
        />
      );
    }
    return this.props.children;
  }
}
