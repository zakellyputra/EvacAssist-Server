import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './auth';
import { OperationsProvider } from './operations';
import './styles/tokens.css';
import './styles/layout.css';
import './styles/components.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <OperationsProvider>
          <App />
        </OperationsProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
