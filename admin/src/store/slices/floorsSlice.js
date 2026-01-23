/**
 * @fileoverview Floors Slice
 * @description Redux slice for managing floor data.
 *              Handles CRUD operations for floor maps.
 *
 * @module store/slices/floorsSlice
 * @author Marcelino Saad
 * @version 1.0.0
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as floorService from '../../services/floorService';

/* ============================================================
 * INITIAL STATE
 * ============================================================ */

const initialState = {
  /** Array of all floors */
  list: [],
  /** Currently selected/viewed floor */
  current: null,
  /** System-wide status summary */
  systemStatus: null,
  /** Loading states */
  loading: {
    list: false,
    current: false,
    create: false,
    update: false,
    delete: false,
    status: false,
  },
  /** Error messages */
  error: null,
  /** Last successful fetch timestamp */
  lastFetch: null,
};

/* ============================================================
 * ASYNC THUNKS
 * ============================================================ */

/**
 * Fetch all floors from the server
 */
export const fetchFloors = createAsyncThunk(
  'floors/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const result = await floorService.getFloors();
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
 * Fetch a single floor by ID
 */
export const fetchFloorById = createAsyncThunk(
  'floors/fetchById',
  async (floorId, { rejectWithValue }) => {
    try {
      const result = await floorService.getFloorById(floorId);
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
 * Create a new floor
 */
export const createFloor = createAsyncThunk(
  'floors/create',
  async (formData, { rejectWithValue }) => {
    try {
      const result = await floorService.createFloor(formData);
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
 * Update an existing floor
 */
export const updateFloor = createAsyncThunk(
  'floors/update',
  async ({ floorId, formData }, { rejectWithValue }) => {
    try {
      const result = await floorService.updateFloor(floorId, formData);
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
 * Delete a floor
 */
export const deleteFloor = createAsyncThunk(
  'floors/delete',
  async (floorId, { rejectWithValue }) => {
    try {
      const result = await floorService.deleteFloor(floorId);
      if (!result.success) {
        return rejectWithValue(result.error);
      }
      return floorId;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

/**
 * Update floor status
 */
export const updateFloorStatus = createAsyncThunk(
  'floors/updateStatus',
  async ({ floorId, status, reason }, { rejectWithValue }) => {
    try {
      const result = await floorService.updateFloorStatus(floorId, status, reason);
      if (!result.success) {
        return rejectWithValue(result.error);
      }
      return { floorId, ...result.data };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

/**
 * Update camera status
 */
export const updateCameraStatus = createAsyncThunk(
  'floors/updateCameraStatus',
  async ({ floorId, cameraId, status, reason }, { rejectWithValue }) => {
    try {
      const result = await floorService.updateCameraStatus(floorId, cameraId, status, reason);
      if (!result.success) {
        return rejectWithValue(result.error);
      }
      return { floorId, cameraId, ...result.data };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

/**
 * Fetch system status
 */
export const fetchSystemStatus = createAsyncThunk(
  'floors/fetchSystemStatus',
  async (_, { rejectWithValue }) => {
    try {
      const result = await floorService.getSystemStatus();
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
 * Reset all cameras on a floor
 */
export const resetFloorCameras = createAsyncThunk(
  'floors/resetCameras',
  async (floorId, { rejectWithValue }) => {
    try {
      const result = await floorService.resetFloorCameras(floorId);
      if (!result.success) {
        return rejectWithValue(result.error);
      }
      return { floorId, ...result.data };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

/* ============================================================
 * SLICE DEFINITION
 * ============================================================ */

const floorsSlice = createSlice({
  name: 'floors',
  initialState,
  reducers: {
    /**
     * Set current floor
     */
    setCurrentFloor: (state, action) => {
      state.current = action.payload;
    },
    
    /**
     * Clear current floor
     */
    clearCurrentFloor: (state) => {
      state.current = null;
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
      // Fetch All Floors
      .addCase(fetchFloors.pending, (state) => {
        state.loading.list = true;
        state.error = null;
      })
      .addCase(fetchFloors.fulfilled, (state, action) => {
        state.loading.list = false;
        state.list = action.payload;
        state.lastFetch = new Date().toISOString();
      })
      .addCase(fetchFloors.rejected, (state, action) => {
        state.loading.list = false;
        state.error = action.payload;
      })
      
      // Fetch Floor By ID
      .addCase(fetchFloorById.pending, (state) => {
        state.loading.current = true;
        state.error = null;
      })
      .addCase(fetchFloorById.fulfilled, (state, action) => {
        state.loading.current = false;
        state.current = action.payload;
      })
      .addCase(fetchFloorById.rejected, (state, action) => {
        state.loading.current = false;
        state.error = action.payload;
      })
      
      // Create Floor
      .addCase(createFloor.pending, (state) => {
        state.loading.create = true;
        state.error = null;
      })
      .addCase(createFloor.fulfilled, (state, action) => {
        state.loading.create = false;
        state.list.push(action.payload);
      })
      .addCase(createFloor.rejected, (state, action) => {
        state.loading.create = false;
        state.error = action.payload;
      })
      
      // Update Floor
      .addCase(updateFloor.pending, (state) => {
        state.loading.update = true;
        state.error = null;
      })
      .addCase(updateFloor.fulfilled, (state, action) => {
        state.loading.update = false;
        const index = state.list.findIndex(f => f.id === action.payload.id);
        if (index !== -1) {
          state.list[index] = action.payload;
        }
        if (state.current?.id === action.payload.id) {
          state.current = action.payload;
        }
      })
      .addCase(updateFloor.rejected, (state, action) => {
        state.loading.update = false;
        state.error = action.payload;
      })
      
      // Delete Floor
      .addCase(deleteFloor.pending, (state) => {
        state.loading.delete = true;
        state.error = null;
      })
      .addCase(deleteFloor.fulfilled, (state, action) => {
        state.loading.delete = false;
        state.list = state.list.filter(f => f.id !== action.payload);
        if (state.current?.id === action.payload) {
          state.current = null;
        }
      })
      .addCase(deleteFloor.rejected, (state, action) => {
        state.loading.delete = false;
        state.error = action.payload;
      })
      
      // Update Floor Status
      .addCase(updateFloorStatus.pending, (state) => {
        state.loading.status = true;
      })
      .addCase(updateFloorStatus.fulfilled, (state, action) => {
        state.loading.status = false;
        const index = state.list.findIndex(f => f.id === action.payload.floorId);
        if (index !== -1) {
          state.list[index].status = action.payload.status;
        }
      })
      .addCase(updateFloorStatus.rejected, (state, action) => {
        state.loading.status = false;
        state.error = action.payload;
      })
      
      // Fetch System Status
      .addCase(fetchSystemStatus.fulfilled, (state, action) => {
        state.systemStatus = action.payload;
      })
      
      // Reset Floor Cameras
      .addCase(resetFloorCameras.fulfilled, (state, action) => {
        // Refresh would be needed to see camera changes
        state.error = null;
      });
  },
});

/* ============================================================
 * EXPORTS
 * ============================================================ */

export const { setCurrentFloor, clearCurrentFloor, clearError } = floorsSlice.actions;

// Selectors
export const selectFloorsList = (state) => state.floors.list;
export const selectCurrentFloor = (state) => state.floors.current;
export const selectFloorsLoading = (state) => state.floors.loading;
export const selectFloorsError = (state) => state.floors.error;
export const selectSystemStatus = (state) => state.floors.systemStatus;

export default floorsSlice.reducer;
