/**
 * @fileoverview Authentication Slice
 * @description Redux slice for managing authentication state.
 *              Handles admin token storage and validation.
 *
 * @module store/slices/authSlice
 * @author Marcelino Saad
 * @version 1.0.0
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { STORAGE_KEYS, getApiUrl, getAdminToken } from '../../config';

/* ============================================================
 * INITIAL STATE
 * ============================================================ */

const initialState = {
  /** Admin authentication token */
  token: getAdminToken(),
  /** API base URL */
  apiUrl: getApiUrl(),
  /** Whether user is authenticated */
  isAuthenticated: !!getAdminToken(),
  /** Loading state */
  loading: false,
  /** Error message */
  error: null,
  /** Server health status */
  serverHealth: {
    status: 'unknown',
    lastChecked: null,
  },
};

/* ============================================================
 * ASYNC THUNKS
 * ============================================================ */

/**
 * Verify authentication token by making a test API call
 */
export const verifyAuth = createAsyncThunk(
  'auth/verify',
  async (_, { getState, rejectWithValue }) => {
    const { auth } = getState();
    
    if (!auth.token) {
      return rejectWithValue('No authentication token');
    }
    
    try {
      const response = await fetch(`${auth.apiUrl}/api/floors`, {
        headers: {
          'x-admin-auth': auth.token,
        },
      });
      
      if (response.status === 403) {
        return rejectWithValue('Invalid authentication token');
      }
      
      if (!response.ok) {
        return rejectWithValue('Server error');
      }
      
      return { verified: true };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

/**
 * Check server health status
 */
export const checkServerHealth = createAsyncThunk(
  'auth/checkHealth',
  async (_, { getState, rejectWithValue }) => {
    const { auth } = getState();
    
    try {
      const response = await fetch(`${auth.apiUrl}/health`);
      const data = await response.json();
      
      // Parse server health response
      // Server returns: { success, database: { status: 'connected'|'disconnected' }, ... }
      return {
        status: response.ok ? 'healthy' : 'unhealthy',
        database: data.database?.status === 'connected' ? 'connected' : 'error',
        databaseName: data.database?.name,
        uptime: data.uptime,
        memory: data.memory,
        version: data.version,
        lastChecked: new Date().toISOString(),
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

/* ============================================================
 * SLICE DEFINITION
 * ============================================================ */

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    /**
     * Set authentication credentials
     * @param {Object} state - Current state
     * @param {Object} action - Action with payload { token, apiUrl }
     */
    setCredentials: (state, action) => {
      const { token, apiUrl } = action.payload;
      
      if (token !== undefined) {
        state.token = token;
        state.isAuthenticated = !!token;
        localStorage.setItem(STORAGE_KEYS.ADMIN_TOKEN, token || '');
      }
      
      if (apiUrl !== undefined) {
        state.apiUrl = apiUrl;
        localStorage.setItem(STORAGE_KEYS.API_URL, apiUrl || '');
      }
      
      state.error = null;
    },
    
    /**
     * Clear authentication (logout)
     * @param {Object} state - Current state
     */
    clearAuth: (state) => {
      state.token = '';
      state.isAuthenticated = false;
      state.error = null;
      localStorage.removeItem(STORAGE_KEYS.ADMIN_TOKEN);
    },
    
    /**
     * Clear any authentication errors
     * @param {Object} state - Current state
     */
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Verify Auth
      .addCase(verifyAuth.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verifyAuth.fulfilled, (state) => {
        state.loading = false;
        state.isAuthenticated = true;
      })
      .addCase(verifyAuth.rejected, (state, action) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.error = action.payload;
      })
      // Check Health
      .addCase(checkServerHealth.fulfilled, (state, action) => {
        state.serverHealth = action.payload;
      })
      .addCase(checkServerHealth.rejected, (state) => {
        state.serverHealth = {
          status: 'offline',
          lastChecked: new Date().toISOString(),
        };
      });
  },
});

/* ============================================================
 * EXPORTS
 * ============================================================ */

export const { setCredentials, clearAuth, clearError } = authSlice.actions;

// Alias for logout action
export const logout = clearAuth;

// Selectors
export const selectToken = (state) => state.auth.token;
export const selectApiUrl = (state) => state.auth.apiUrl;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectAuthLoading = (state) => state.auth.loading;
export const selectAuthError = (state) => state.auth.error;
export const selectServerHealth = (state) => state.auth.serverHealth;

export default authSlice.reducer;
