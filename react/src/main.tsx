import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './modules/initPage/index.css';
import './modules/editing/styles/global.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
