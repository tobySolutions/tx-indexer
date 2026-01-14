"use client";

import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Optional fallback component */
  fallback?: ReactNode;
  /** Section name for better error context */
  section?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to error reporting service in production
    console.error(
      `[ErrorBoundary${this.props.section ? ` - ${this.props.section}` : ""}]`,
      error,
      errorInfo,
    );
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="border border-red-200 rounded-lg bg-red-50 p-6">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-red-100">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-red-800 mb-1">
                {this.props.section
                  ? `Error loading ${this.props.section}`
                  : "Something went wrong"}
              </h3>
              <p className="text-sm text-red-600 mb-3">
                {this.state.error?.message || "An unexpected error occurred"}
              </p>
              <button
                type="button"
                onClick={this.handleRetry}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-md transition-colors cursor-pointer"
              >
                <RefreshCw className="h-4 w-4" />
                Try again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Lightweight error boundary for non-critical sections
 * Shows a minimal fallback without breaking the page
 */
export class SilentErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[SilentErrorBoundary]", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return null; // Silently hide broken component
    }
    return this.props.children;
  }
}
