import React from "react";

type Props = { children: React.ReactNode };
type State = { hasError: boolean; error?: Error };

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center">
          <h1 className="text-xl font-semibold mb-2">
            Ocorreu um erro inesperado
          </h1>
          <p className="text-sm text-muted-foreground mb-4">
            {this.state.error?.message ?? "Verifique o console e recarregue."}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 border rounded-md hover:bg-accent"
          >
            Recarregar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
export default ErrorBoundary;

