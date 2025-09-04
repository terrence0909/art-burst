// src/main.tsx
import { Amplify } from 'aws-amplify';
import awsConfig from './awsConfig.js';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';

// Configure Amplify - now it should work with your updated awsConfig.js
Amplify.configure(awsConfig);

createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);