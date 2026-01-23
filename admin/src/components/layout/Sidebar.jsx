/**
 * @fileoverview Sidebar Component
 * @description Main navigation sidebar for the admin dashboard.
 *
 * @module components/layout/Sidebar
 * @author Marcelino Saad
 * @version 1.0.0
 */

import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Route,
  Camera,
  FileText,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Zap,
} from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { cn } from '../../utils/helpers';
import {
  toggleSidebar,
  selectSidebarCollapsed,
} from '../../store/slices/uiSlice';
import { ROUTES } from '../../config';

/* ============================================================
 * NAVIGATION ITEMS
 * ============================================================ */

const navItems = [
  { path: ROUTES.DASHBOARD, icon: LayoutDashboard, label: 'Dashboard' },
  { path: ROUTES.FLOORS, icon: Building2, label: 'Floors' },
  { path: ROUTES.ROUTES, icon: Route, label: 'Routes' },
  { path: ROUTES.CAMERAS, icon: Camera, label: 'Cameras' },
  { path: ROUTES.RECORDS, icon: FileText, label: 'Records' },
];

const bottomNavItems = [
  { path: ROUTES.SETTINGS, icon: Settings, label: 'Settings' },
];

/* ============================================================
 * NAV LINK COMPONENT
 * ============================================================ */

function SidebarLink({ to, icon: Icon, label, collapsed }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
          'hover:bg-sidebar-hover',
          isActive
            ? 'bg-primary-500/10 text-primary-400 font-medium'
            : 'text-sidebar-text'
        )
      }
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      {!collapsed && (
        <span className="text-sm whitespace-nowrap">{label}</span>
      )}
    </NavLink>
  );
}

/* ============================================================
 * SIDEBAR COMPONENT
 * ============================================================ */

export function Sidebar() {
  const dispatch = useDispatch();
  const collapsed = useSelector(selectSidebarCollapsed);

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-screen bg-sidebar flex flex-col border-r border-gray-800 transition-all duration-300 z-40',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-800">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-primary-500 rounded-lg">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg text-white">EES Admin</span>
          </div>
        )}
        {collapsed && (
          <div className="mx-auto p-1.5 bg-primary-500 rounded-lg">
            <Zap className="w-5 h-5 text-white" />
          </div>
        )}
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <SidebarLink
            key={item.path}
            to={item.path}
            icon={item.icon}
            label={item.label}
            collapsed={collapsed}
          />
        ))}
      </nav>

      {/* Bottom Navigation */}
      <div className="p-3 border-t border-gray-800 space-y-1">
        {bottomNavItems.map((item) => (
          <SidebarLink
            key={item.path}
            to={item.path}
            icon={item.icon}
            label={item.label}
            collapsed={collapsed}
          />
        ))}

        {/* Collapse Toggle */}
        <button
          onClick={() => dispatch(toggleSidebar())}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
            'text-sidebar-text hover:bg-sidebar-hover'
          )}
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5 mx-auto" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm">Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
