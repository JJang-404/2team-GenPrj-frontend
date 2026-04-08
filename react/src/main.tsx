import React from 'react';
import ReactDOM from 'react-dom/client';
import { preload } from '@imgly/background-removal';
import App from './App';
import { BG_REMOVAL_CONFIG } from './modules/initPage/config/backgroundRemoval';
import './modules/initPage/index.css';
import './modules/editing/styles/global.css';

preload(BG_REMOVAL_CONFIG as Parameters<typeof preload>[0]).catch(console.warn);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
