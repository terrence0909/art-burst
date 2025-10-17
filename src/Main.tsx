import { Amplify } from 'aws-amplify';
import awsConfig from './awsConfig.js';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';

// Configure Amplify
Amplify.configure(awsConfig);

// Handle GitHub Pages repo path
if (window.location.pathname.includes('/art-burst')) {
  // Redirect to hash router with repo path
  const newPath = window.location.pathname.replace('/art-burst', '') + window.location.search + window.location.hash;
  window.history.replaceState(null, '', '/art-burst/#' + newPath);
}

createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
);