import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { RouterProvider } from 'react-router';
import router from './Routes/Routes.jsx';
import { ThemeProvider } from './components/theme-provider';
import { GlobalErrorBoundary } from './components/GlobalErrorBoundary.jsx';

const CHUNK_RELOAD_STATE_KEY = 'app:chunk-reload-state';
const CHUNK_RELOAD_WINDOW_MS = 15000;

function readChunkReloadState() {
  try {
    return JSON.parse(window.sessionStorage.getItem(CHUNK_RELOAD_STATE_KEY) || 'null');
  } catch {
    return null;
  }
}

function writeChunkReloadState(state) {
  window.sessionStorage.setItem(CHUNK_RELOAD_STATE_KEY, JSON.stringify(state));
}

if (typeof window !== 'undefined') {
  const currentTarget = `${window.location.pathname}${window.location.hash}`;
  const pendingState = readChunkReloadState();

  if (pendingState?.target === currentTarget) {
    window.setTimeout(() => {
      const latestState = readChunkReloadState();
      if (latestState?.target === pendingState.target && latestState?.ts === pendingState.ts) {
        window.sessionStorage.removeItem(CHUNK_RELOAD_STATE_KEY);
      }
    }, CHUNK_RELOAD_WINDOW_MS);
  }

  // Recover once from stale Vite chunks after a new deployment replaces old asset hashes.
  window.addEventListener('vite:preloadError', (event) => {
    const activeTarget = `${window.location.pathname}${window.location.hash}`;
    const currentState = readChunkReloadState();
    const now = Date.now();

    if (currentState?.target === activeTarget && now - currentState.ts < CHUNK_RELOAD_WINDOW_MS) {
      return;
    }

    event.preventDefault();
    writeChunkReloadState({ target: activeTarget, ts: now });
    window.location.reload();
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GlobalErrorBoundary>
      <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
        <RouterProvider router={router} />
      </ThemeProvider>
    </GlobalErrorBoundary>
  </StrictMode>
);
