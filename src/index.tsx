import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './styles/globals.css';

const THEME_STORAGE_KEY = 'map-dashboard.theme';

function applyInitialTheme() {
  const stored = typeof window !== 'undefined' ? localStorage.getItem(THEME_STORAGE_KEY) : null;
  const prefersDark =
    typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;

  const theme = stored ?? (prefersDark ? 'dark' : 'light');
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

applyInitialTheme();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      suspense: true,
      retry: 1,
      refetchOnWindowFocus: false
    }
  }
});

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <React.Suspense fallback={<div className="p-8 text-center text-slate-500">Loading…</div>}>
        <App themeStorageKey={THEME_STORAGE_KEY} />
      </React.Suspense>
    </QueryClientProvider>
  </React.StrictMode>
);
