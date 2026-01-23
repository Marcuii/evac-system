/**
 * @fileoverview Application Root Component
 * @description Main application component that sets up routing and Redux provider.
 *              Defines the route structure for the EES screens application.
 *
 * @module App
 * @author Marcelino Saad
 * @version 1.0.0
 *
 * @description
 * Route Structure:
 * ┌─────────────────────────────────────────────────────────────┐
 * │  /                : LandingPage (controller & overview)     │
 * │  /screen/:screenId: ScreenPage (individual screen display)  │
 * └─────────────────────────────────────────────────────────────┘
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import store from './store';
import { LandingPage, ScreenPage } from './pages';

/**
 * Root Application Component
 * Wraps the application with Redux Provider and React Router
 *
 * @returns {JSX.Element} The application root element
 */
function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <Routes>
          {/* Landing page - Controller view with all screens/routes */}
          <Route path="/" element={<LandingPage />} />
          
          {/* Individual screen display - Shows route for specific screen */}
          <Route path="/screen/:screenId" element={<ScreenPage />} />
        </Routes>
      </BrowserRouter>
    </Provider>
  );
}

export default App;
