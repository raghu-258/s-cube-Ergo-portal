import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App.jsx';
import { PortalProvider } from './portal.jsx';
import './styles.css';

createRoot(document.getElementById('app')).render(
  <StrictMode>
    <BrowserRouter>
      <PortalProvider>
        <App />
      </PortalProvider>
    </BrowserRouter>
  </StrictMode>,
);
