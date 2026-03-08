/**
 * Heart Rate Monitor Example - Entry Point
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { WebBLE } from '@ios-web-bluetooth/react';
import { HeartRateMonitor } from './HeartRateMonitor';
import './index.css';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <WebBLE.Provider config={{
      autoReconnect: true,
      reconnectAttempts: 5,
      reconnectDelay: 1000,
      debugMode: process.env.NODE_ENV === 'development'
    }}>
      <HeartRateMonitor />
    </WebBLE.Provider>
  </React.StrictMode>
);