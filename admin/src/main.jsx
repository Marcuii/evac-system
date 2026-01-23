/**
 * @fileoverview Application Entry Point
 * @description React application bootstrap file. Mounts the root App component
 *              to the DOM and initializes global styles.
 *
 * @module main
 * @author Marcelino Saad
 * @version 1.0.0
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { store } from './store';
import { setStoreRef } from './services/api';
import App from './App.jsx';
import './index.css';

/* ============================================================
 * INITIALIZE STORE REFERENCE FOR API CLIENT
 * ============================================================ */

setStoreRef(store);

/* ============================================================
 * ROOT RENDER
 * Mount React application with StrictMode for development checks
 * ============================================================ */

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Provider>
  </StrictMode>,
);
