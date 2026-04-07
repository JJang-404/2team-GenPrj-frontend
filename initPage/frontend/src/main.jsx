import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { preload } from '@imgly/background-removal'
import App from './App.jsx'
import './index.css'
import { BG_REMOVAL_CONFIG } from './config/backgroundRemoval'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Preload the background removal model at page startup so the first click
// doesn't trigger a model download + ONNX session init.
preload(BG_REMOVAL_CONFIG).catch(console.warn)
