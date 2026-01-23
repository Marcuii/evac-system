/**
 * @fileoverview Records Slice
 * @description Redux slice for managing AI detection records.
 *
 * @module store/slices/recordsSlice
 * @author Marcelino Saad
 * @version 1.0.0
 */

import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import * as recordService from '../../services/recordService';

/* ============================================================
 * INITIAL STATE
 * ============================================================ */

const initialState = {
  /** Array of records */
  list: [],
  /** Total record count (all records matching filter) */
  total: 0,
  /** Current page */
  page: 1,
  /** Items per page */
  pageSize: 20,
  /** Total pages */
  totalPages: 1,
  /** Has next page */
  hasNextPage: false,
  /** Has previous page */
  hasPrevPage: false,
  /** Filter settings */
  filters: {
    floorId: null,
    cameraId: null,
    startDate: null,
    endDate: null,
  },
  /** Loading state */
  loading: false,
  /** Error message */
  error: null,
};

/* ============================================================
 * ASYNC THUNKS
 * ============================================================ */

/**
 * Fetch records with optional filters
 */
export const fetchRecords = createAsyncThunk(
  'records/fetchAll',
  async (params = {}, { rejectWithValue }) => {
    try {
      // floorId is required by the API
      if (!params || !params.floorId) {
        return rejectWithValue('Floor ID is required');
      }
      
      const queryParams = {
        floorId: params.floorId,
        cameraId: params.cameraId,
        startDate: params.startDate,
        endDate: params.endDate,
        page: params.page || 1,
        limit: params.limit || 20,
      };
      
      const result = await recordService.getRecords(queryParams);
      
      if (!result.success) {
        return rejectWithValue(result.error);
      }
      
      // Return full response data including pagination info
      return result.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

/**
 * Fetch a single record by ID
 */
export const fetchRecordById = createAsyncThunk(
  'records/fetchById',
  async (recordId, { rejectWithValue }) => {
    try {
      const result = await recordService.getRecordById(recordId);
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
 * Delete a record
 */
export const deleteRecord = createAsyncThunk(
  'records/delete',
  async (recordId, { rejectWithValue }) => {
    try {
      const result = await recordService.deleteRecord(recordId);
      if (!result.success) {
        return rejectWithValue(result.error);
      }
      return recordId;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

/* ============================================================
 * SLICE DEFINITION
 * ============================================================ */

const recordsSlice = createSlice({
  name: 'records',
  initialState,
  reducers: {
    /**
     * Set page number
     */
    setPage: (state, action) => {
      state.page = action.payload;
    },
    
    /**
     * Set page size
     */
    setPageSize: (state, action) => {
      state.pageSize = action.payload;
      state.page = 1; // Reset to first page
    },
    
    /**
     * Set filters
     */
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
      state.page = 1; // Reset to first page when filters change
    },
    
    /**
     * Clear all filters
     */
    clearFilters: (state) => {
      state.filters = initialState.filters;
      state.page = 1;
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
      // Fetch Records
      .addCase(fetchRecords.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRecords.fulfilled, (state, action) => {
        state.loading = false;
        
        const responseData = action.payload;
        if (Array.isArray(responseData)) {
          // Direct array response (legacy)
          state.list = responseData;
          state.total = responseData.length;
        } else if (responseData?.data) {
          // Paginated response from server
          state.list = responseData.data || [];
          state.total = responseData.totalCount || responseData.recordsCount || 0;
          state.page = responseData.page || 1;
          state.pageSize = responseData.limit || 20;
          state.totalPages = responseData.totalPages || 1;
          state.hasNextPage = responseData.hasNextPage || false;
          state.hasPrevPage = responseData.hasPrevPage || false;
        } else {
          state.list = [];
          state.total = 0;
        }
      })
      .addCase(fetchRecords.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.list = [];
      })
      
      // Delete Record
      .addCase(deleteRecord.fulfilled, (state, action) => {
        state.list = state.list.filter(r => r._id !== action.payload);
        state.total = Math.max(0, state.total - 1);
      });
  },
});

/* ============================================================
 * EXPORTS
 * ============================================================ */

export const { setPage, setPageSize, setFilters, clearFilters, clearError } = recordsSlice.actions;

// Base selectors (primitive values - don't need memoization)
export const selectRecordsList = (state) => state.records.list;
export const selectRecordsTotal = (state) => state.records.total;
export const selectRecordsPage = (state) => state.records.page;
export const selectRecordsPageSize = (state) => state.records.pageSize;
export const selectRecordsTotalPages = (state) => state.records.totalPages;
export const selectRecordsHasNextPage = (state) => state.records.hasNextPage;
export const selectRecordsHasPrevPage = (state) => state.records.hasPrevPage;
export const selectRecordsFilters = (state) => state.records.filters;
export const selectRecordsError = (state) => state.records.error;

// Memoized selectors (return objects - need memoization)
const selectRecordsLoadingRaw = (state) => state.records.loading;
export const selectRecordsLoading = createSelector(
  [selectRecordsLoadingRaw],
  (loading) => ({ list: loading })
);

export const selectRecordsPagination = createSelector(
  [selectRecordsPage, selectRecordsPageSize, selectRecordsTotal, selectRecordsTotalPages, selectRecordsHasNextPage, selectRecordsHasPrevPage],
  (page, limit, total, totalPages, hasNextPage, hasPrevPage) => ({
    page,
    limit,
    total,
    totalPages,
    hasNextPage,
    hasPrevPage,
  })
);

export default recordsSlice.reducer;
