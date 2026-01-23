/**
 * @fileoverview Routes Slice
 * @description Redux slice for managing evacuation route data.
 *
 * @module store/slices/routesSlice
 * @author Marcelino Saad
 * @version 1.0.0
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as routeService from '../../services/routeService';

/* ============================================================
 * INITIAL STATE
 * ============================================================ */

const initialState = {
  /** Array of route history */
  list: [],
  /** Latest computed routes */
  latest: null,
  /** Selected floor for route filtering */
  selectedFloorId: null,
  /** Last computed timestamp */
  lastComputed: null,
  /** Loading states */
  loading: {
    list: false,
    latest: false,
    compute: false,
  },
  /** Error message */
  error: null,
};

/* ============================================================
 * ASYNC THUNKS
 * ============================================================ */

/**
 * Fetch route history for a floor
 */
export const fetchRoutes = createAsyncThunk(
  'routes/fetchAll',
  async (floorId, { rejectWithValue }) => {
    try {
      const result = await routeService.getRoutes(floorId);
      if (!result.success) {
        return rejectWithValue(result.error);
      }
      return result.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

/**
 * Fetch latest routes for a floor
 */
export const fetchLatestRoutes = createAsyncThunk(
  'routes/fetchLatest',
  async (floorId, { rejectWithValue }) => {
    try {
      const result = await routeService.getLatestRoutes(floorId);
      if (!result.success) {
        return rejectWithValue(result.error);
      }
      return result.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

/**
 * Manually trigger route computation
 */
export const computeRoutes = createAsyncThunk(
  'routes/compute',
  async (floorId, { rejectWithValue }) => {
    try {
      const result = await routeService.computeRoutes(floorId);
      if (!result.success) {
        return rejectWithValue(result.error);
      }
      return result.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

/* ============================================================
 * SLICE DEFINITION
 * ============================================================ */

const routesSlice = createSlice({
  name: 'routes',
  initialState,
  reducers: {
    /**
     * Set selected floor for filtering
     */
    setSelectedFloor: (state, action) => {
      state.selectedFloorId = action.payload;
    },
    
    /**
     * Clear routes data
     */
    clearRoutes: (state) => {
      state.list = [];
      state.latest = null;
    },
    
    /**
     * Clear error
     */
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Routes - API returns array of Route documents, extract individual routes
      .addCase(fetchRoutes.pending, (state) => {
        state.loading.list = true;
        state.error = null;
      })
      .addCase(fetchRoutes.fulfilled, (state, action) => {
        state.loading.list = false;
        // API returns array of Route documents (history), get routes from the latest one
        const routeDocuments = action.payload;
        if (Array.isArray(routeDocuments) && routeDocuments.length > 0) {
          // Get the latest document (first in sorted array) and extract its routes
          const latestDoc = routeDocuments[0];
          state.list = latestDoc.routes || [];
          state.lastComputed = latestDoc.computedAt;
        } else if (routeDocuments?.routes) {
          // Single document returned
          state.list = routeDocuments.routes || [];
          state.lastComputed = routeDocuments.computedAt;
        } else {
          state.list = [];
        }
      })
      .addCase(fetchRoutes.rejected, (state, action) => {
        state.loading.list = false;
        state.error = action.payload;
      })
      
      // Fetch Latest Routes
      .addCase(fetchLatestRoutes.pending, (state) => {
        state.loading.latest = true;
        state.error = null;
      })
      .addCase(fetchLatestRoutes.fulfilled, (state, action) => {
        state.loading.latest = false;
        state.latest = action.payload;
      })
      .addCase(fetchLatestRoutes.rejected, (state, action) => {
        state.loading.latest = false;
        state.error = action.payload;
      })
      
      // Compute Routes
      .addCase(computeRoutes.pending, (state) => {
        state.loading.compute = true;
        state.error = null;
      })
      .addCase(computeRoutes.fulfilled, (state, action) => {
        state.loading.compute = false;
        state.latest = action.payload;
        state.lastComputed = new Date().toISOString();
      })
      .addCase(computeRoutes.rejected, (state, action) => {
        state.loading.compute = false;
        state.error = action.payload;
      });
  },
});

/* ============================================================
 * EXPORTS
 * ============================================================ */

export const { setSelectedFloor, clearRoutes, clearError } = routesSlice.actions;

// Selectors
export const selectRoutesList = (state) => state.routes.list;
export const selectLatestRoutes = (state) => state.routes.latest;
export const selectRoutesLoading = (state) => state.routes.loading;
export const selectRoutesError = (state) => state.routes.error;
export const selectSelectedFloorId = (state) => state.routes.selectedFloorId;
export const selectRoutesLastComputed = (state) => state.routes.lastComputed;

export default routesSlice.reducer;
