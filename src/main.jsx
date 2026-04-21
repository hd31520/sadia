
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { RouterProvider } from 'react-router';
import router from './Routes/Routes.jsx';
import { ThemeProvider } from './components/theme-provider';
import { GlobalErrorBoundary } from './components/GlobalErrorBoundary.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GlobalErrorBoundary>
      <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
        <RouterProvider router={router} />
      </ThemeProvider>
    </GlobalErrorBoundary>
  </StrictMode>
);
