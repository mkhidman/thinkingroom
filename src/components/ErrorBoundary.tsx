import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Ruang render error', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="fatal-error-shell">
        <section className="fatal-error-card">
          <AlertTriangle size={32} />
          <h1>Ruang tidak dapat menampilkan halaman ini.</h1>
          <p>Data perangkat tidak dihapus. Muat ulang aplikasi; jika masalah tetap terjadi, export backup dari versi terakhir yang masih dapat dibuka.</p>
          <details><summary>Detail teknis</summary><pre>{this.state.error.message}</pre></details>
          <button className="primary-button" onClick={() => window.location.reload()}><RefreshCw size={16} /> Muat ulang</button>
        </section>
      </main>
    );
  }
}
