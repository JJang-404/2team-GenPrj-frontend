import React from 'react';
import ReactDOM from 'react-dom/client';
import { preload } from '@imgly/background-removal';
import Root from './Root';
import { BG_REMOVAL_CONFIG } from './config/backgroundRemoval';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);

// Preload the background removal model at page startup so the first click
// doesn't trigger a model download + ONNX session init.
// Fire-and-forget; failure is non-fatal (model will re-init on first use).
preload(BG_REMOVAL_CONFIG).catch(console.warn);