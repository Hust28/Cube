import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error('Fatal: #root element not found in DOM.');
} else {
  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </React.StrictMode>
    );
  } catch (err) {
    console.error('Fatal error during React root mounting:', err);
    rootElement.innerHTML = `
      <div style="min-height:100vh;background:#090D16;color:white;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:sans-serif;padding:24px;text-align:center;">
        <h1 style="color:#00F0FF;font-size:20px;margin-bottom:8px;">CubeRush 3D</h1>
        <p style="color:#aaa;font-size:12px;margin-bottom:16px;">Starting application...</p>
        <button onclick="window.location.reload()" style="background:#00F0FF;color:black;border:none;padding:10px 20px;border-radius:12px;font-weight:bold;font-size:12px;">Reload</button>
      </div>
    `;
  }
}
