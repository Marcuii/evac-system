/**
 * @fileoverview Main App Component
 * @description Root component with routing and layout configuration.
 *
 * @module App
 * @author Marcelino Saad
 * @version 1.0.0
 */

import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { cn } from './utils/helpers';
import { Sidebar, Header } from './components/layout';
import { ToastContainer } from './components/ui/Toast';
import { LoadingOverlay } from './components/ui';
import {
  Dashboard,
  FloorsPage,
  FloorFormPage,
  FloorDetailPage,
  RoutesPage,
  CamerasPage,
  RecordsPage,
  SettingsPage,
} from './pages';
import {
  selectSidebarCollapsed,
  selectToasts,
  removeToast,
  selectGlobalLoading,
} from './store/slices/uiSlice';
import { checkServerHealth } from './store/slices/authSlice';
import { ROUTES } from './config';

/* ============================================================
 * APP LAYOUT COMPONENT
 * ============================================================ */

function AppLayout({ children }) {
  const sidebarCollapsed = useSelector(selectSidebarCollapsed);

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <Header />
      <main
        className={cn(
          'pt-16 min-h-screen transition-all duration-300',
          sidebarCollapsed ? 'pl-16' : 'pl-64'
        )}
      >
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}

/* ============================================================
 * MAIN APP COMPONENT
 * ============================================================ */

function App() {
  const dispatch = useDispatch();
  const toasts = useSelector(selectToasts);
  const globalLoading = useSelector(selectGlobalLoading);

  // Check server health on app mount
  useEffect(() => {
    dispatch(checkServerHealth());
  }, [dispatch]);

  return (
    <>
      {/* Global Loading Overlay */}
      {globalLoading && <LoadingOverlay />}

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onClose={(id) => dispatch(removeToast(id))} />

      {/* Main App */}
      <AppLayout>
        <Routes>
          {/* Dashboard */}
          <Route path={ROUTES.DASHBOARD} element={<Dashboard />} />

          {/* Floors */}
          <Route path={ROUTES.FLOORS} element={<FloorsPage />} />
          <Route path={ROUTES.FLOOR_NEW} element={<FloorFormPage />} />
          <Route path="/floors/:id" element={<FloorDetailPage />} />
          <Route path="/floors/:id/edit" element={<FloorFormPage />} />

          {/* Routes */}
          <Route path={ROUTES.ROUTES} element={<RoutesPage />} />

          {/* Cameras */}
          <Route path={ROUTES.CAMERAS} element={<CamerasPage />} />

          {/* Records */}
          <Route path={ROUTES.RECORDS} element={<RecordsPage />} />

          {/* Settings */}
          <Route path={ROUTES.SETTINGS} element={<SettingsPage />} />

          {/* Redirect root to dashboard */}
          <Route path="/" element={<Navigate to={ROUTES.DASHBOARD} replace />} />

          {/* 404 - Redirect to dashboard */}
          <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
        </Routes>
      </AppLayout>
    </>
  );
}

export default App;
