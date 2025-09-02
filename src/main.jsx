import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import PasswordGate from './PasswordGate.jsx'

// Detect iPad / iPadOS (incl. iPadOS >= 13 reporting as Mac with touch)
try {
  const ua = navigator.userAgent || "";
  const isOldiPad = /iPad/.test(ua);
  const isModerniPad = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  if (isOldiPad || isModerniPad) {
    document.body.classList.add('ipad');
  }
} catch {}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <PasswordGate>
      <App />
    </PasswordGate>
  </React.StrictMode>,
)
