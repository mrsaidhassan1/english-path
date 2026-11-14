import { askToKeepData } from './components/KeepSafe';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

askToKeepData(); // ask the browser to keep learners' progress (see components/KeepSafe.tsx)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
