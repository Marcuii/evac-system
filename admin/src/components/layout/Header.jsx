/**
 * @fileoverview Header Component
 * @description Top header bar for the admin dashboard.
 *
 * @module components/layout/Header
 * @author Marcelino Saad
 * @version 1.0.0
 */

import { useSelector, useDispatch } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { cn } from '../../utils/helpers';
import {
  selectSidebarCollapsed,
  toggleSidebar,
} from '../../store/slices/uiSlice';
import { ROUTES } from '../../config';

/* ============================================================
 * PAGE TITLES
 * ============================================================ */

const pageTitles = {
  [ROUTES.DASHBOARD]: 'Dashboard',
  [ROUTES.FLOORS]: 'Floors',
  [ROUTES.FLOOR_NEW]: 'Add New Floor',
  [ROUTES.ROUTES]: 'Routes',
  [ROUTES.CAMERAS]: 'Cameras',
  [ROUTES.RECORDS]: 'Records',
  [ROUTES.SETTINGS]: 'Settings',
};

/* ============================================================
 * HEADER COMPONENT
 * ============================================================ */

export function Header() {
  const dispatch = useDispatch();
  const location = useLocation();
  const sidebarCollapsed = useSelector(selectSidebarCollapsed);

  // Get current page title
  const getPageTitle = () => {
    const path = location.pathname;
    
    // Check exact matches first
    if (pageTitles[path]) return pageTitles[path];
    
    // Check pattern matches
    if (path.startsWith('/floors/') && path.endsWith('/edit')) {
      return 'Edit Floor';
    }
    if (path.startsWith('/floors/')) {
      return 'Floor Details';
    }
    
    return 'Admin';
  };

  return (
    <header
      className={cn(
        'fixed top-0 right-0 h-16 bg-white border-b border-gray-100 flex items-center px-6 z-30 transition-all duration-300',
        sidebarCollapsed ? 'left-16' : 'left-64'
      )}
    >
      {/* Left Side */}
      <div className="flex items-center gap-4">
        {/* Mobile menu toggle */}
        <button
          onClick={() => dispatch(toggleSidebar())}
          className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
        >
          <Menu className="w-5 h-5 text-gray-600" />
        </button>

        {/* Page Title */}
        <h1 className="text-lg font-semibold text-gray-900">
          {getPageTitle()}
        </h1>
      </div>
    </header>
  );
}

export default Header;
