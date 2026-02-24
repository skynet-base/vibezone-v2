import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[ErrorBoundary] Yakalanan hata:', error);
    console.error('[ErrorBoundary] Bilesen yigini:', errorInfo.componentStack);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-vz-surface">
          <div className="text-center max-w-sm px-6 py-8 rounded-xl border border-vz-border bg-vz-bg/80">
            <div className="text-4xl mb-4">&#x26A0;&#xFE0F;</div>
            <h2 className="text-lg font-semibold text-vz-text mb-2">
              Bir hata olustu
            </h2>
            <p className="text-xs text-vz-muted mb-4 leading-relaxed">
              Bu bolumde beklenmedik bir sorun meydana geldi. Tekrar deneyebilirsiniz.
            </p>
            {this.state.error && (
              <pre className="text-[10px] text-vz-muted/60 bg-vz-surface rounded p-2 mb-4 overflow-auto max-h-24 text-left border border-vz-border">
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={this.handleReset}
              className="btn-primary px-6 py-2 text-sm"
            >
              Tekrar Dene
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
