import React, { Component } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './contexts/AuthContextSupabase';
import { LocalizationProvider } from './contexts/LocalizationContext';
import { ThemeProvider } from './contexts/ThemeContext';
import './src/index.css';

class ErrorBoundary extends Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Erreur rendu:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, fontFamily: 'sans-serif', maxWidth: 600 }}>
          <h1 style={{ color: '#b45309' }}>Erreur d&apos;affichage</h1>
          <pre style={{ background: '#f4f4f4', padding: 16, overflow: 'auto' }}>
            {this.state.error.message}
          </pre>
          <p>Ouvrez la console du navigateur (F12) pour plus de détails.</p>
          <button
            type="button"
            style={{ marginTop: 16, padding: '8px 16px', cursor: 'pointer' }}
            onClick={() => this.setState({ error: null })}
          >
            Réessayer
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

declare global {
  interface Window {
    __COYA_APP_ROOT__?: ReactDOM.Root;
  }
}

const root = window.__COYA_APP_ROOT__ || ReactDOM.createRoot(rootElement);
window.__COYA_APP_ROOT__ = root;

// LocalizationProvider doit rester monté même si une erreur survient dans l’app :
// sinon ErrorBoundary remplace tout le sous-arbre et les hooks (useLocalization) perdent leur provider.
root.render(
  <LocalizationProvider>
    <ErrorBoundary>
      <AuthProvider>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  </LocalizationProvider>
);