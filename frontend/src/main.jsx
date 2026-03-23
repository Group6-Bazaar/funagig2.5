import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { WebSocketProvider } from './context/WebSocketContext.jsx';
import { Toaster } from 'react-hot-toast';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <WebSocketProvider>
        <Toaster position="top-right" />
        <App />
      </WebSocketProvider>
    </AuthProvider>
  </React.StrictMode>,
);
