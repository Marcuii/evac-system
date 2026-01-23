/**
 * @fileoverview Application Entry Point
 * @description React DOM entry point that renders the application root.
 *              Uses StrictMode for development warnings and checks.
 *
 * @module main
 * @author Marcelino Saad
 * @version 1.0.0
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

/**
 * Mount the React application to the DOM
 * Uses createRoot for React 18 concurrent features
 */
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
