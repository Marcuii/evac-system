/**
 * @fileoverview UI Slice
 * @description Redux slice for managing UI state.
 *              Handles sidebar, modals, toasts, and loading states.
 *
 * @module store/slices/uiSlice
 * @author Marcelino Saad
 * @version 1.0.0
 */

import { createSlice } from '@reduxjs/toolkit';
import { STORAGE_KEYS, APP_CONFIG } from '../../config';

/* ============================================================
 * INITIAL STATE
 * ============================================================ */

const initialState = {
  /** Sidebar collapsed state */
  sidebarCollapsed: localStorage.getItem(STORAGE_KEYS.SIDEBAR_COLLAPSED) === 'true',
  
  /** Toast notifications */
  toasts: [],
  
  /** Global loading state */
  globalLoading: false,
  
  /** Active modal */
  activeModal: null,
  
  /** Modal data */
  modalData: null,
};

/* ============================================================
 * HELPER: Generate unique toast ID
 * ============================================================ */

let toastId = 0;
const generateToastId = () => `toast-${++toastId}`;

/* ============================================================
 * SLICE DEFINITION
 * ============================================================ */

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    /**
     * Toggle sidebar collapsed state
     */
    toggleSidebar: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
      localStorage.setItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, state.sidebarCollapsed);
    },
    
    /**
     * Set sidebar collapsed state
     */
    setSidebarCollapsed: (state, action) => {
      state.sidebarCollapsed = action.payload;
      localStorage.setItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, action.payload);
    },
    
    /**
     * Add a toast notification
     */
    addToast: (state, action) => {
      const toast = {
        id: generateToastId(),
        type: 'info',
        duration: APP_CONFIG.TOAST_DURATION,
        ...action.payload,
      };
      state.toasts.push(toast);
    },
    
    /**
     * Remove a toast notification
     */
    removeToast: (state, action) => {
      state.toasts = state.toasts.filter(t => t.id !== action.payload);
    },
    
    /**
     * Clear all toasts
     */
    clearAllToasts: (state) => {
      state.toasts = [];
    },
    
    /**
     * Set global loading state
     */
    setGlobalLoading: (state, action) => {
      state.globalLoading = action.payload;
    },
    
    /**
     * Open a modal
     */
    openModal: (state, action) => {
      state.activeModal = action.payload.modal;
      state.modalData = action.payload.data || null;
    },
    
    /**
     * Close the active modal
     */
    closeModal: (state) => {
      state.activeModal = null;
      state.modalData = null;
    },
  },
});

/* ============================================================
 * EXPORTS
 * ============================================================ */

export const {
  toggleSidebar,
  setSidebarCollapsed,
  addToast,
  removeToast,
  clearAllToasts,
  setGlobalLoading,
  openModal,
  closeModal,
} = uiSlice.actions;

// Selectors
export const selectSidebarCollapsed = (state) => state.ui.sidebarCollapsed;
export const selectToasts = (state) => state.ui.toasts;
export const selectGlobalLoading = (state) => state.ui.globalLoading;
export const selectActiveModal = (state) => state.ui.activeModal;
export const selectModalData = (state) => state.ui.modalData;

// Helper action creators for toasts
export const showSuccess = (message) => addToast({ type: 'success', message });
export const showError = (message) => addToast({ type: 'error', message });
export const showWarning = (message) => addToast({ type: 'warning', message });
export const showInfo = (message) => addToast({ type: 'info', message });

export default uiSlice.reducer;
