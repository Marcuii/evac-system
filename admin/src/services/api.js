/**
 * @fileoverview API Client Module
 * @description Centralized API client with authentication, error handling,
 *              and request/response interceptors.
 *
 * @module services/api
 * @author Marcelino Saad
 * @version 1.0.0
 *
 * @description
 * Features:
 * ┌─────────────────────────────────────────────────────────────┐
 * │  - Automatic token injection                                │
 * │  - Centralized error handling                               │
 * │  - Request timeout handling                                 │
 * │  - Response normalization                                   │
 * └─────────────────────────────────────────────────────────────┘
 */

import { API_CONFIG, STORAGE_KEYS, getApiUrl, getAdminToken } from '../config';

/* ============================================================
 * STORE REFERENCE (set dynamically to avoid circular import)
 * ============================================================ */

let storeRef = null;

/**
 * Set the store reference for dispatching actions
 * Call this from main.jsx after store is created
 * @param {Object} store - Redux store
 */
export function setStoreRef(store) {
  storeRef = store;
}

/* ============================================================
 * API CLIENT CLASS
 * ============================================================ */

class ApiClient {
  constructor() {
    this.timeout = API_CONFIG.TIMEOUT;
  }

  /**
   * Get the current API URL from store or localStorage
   * @returns {string} API base URL
   */
  getBaseUrl() {
    if (storeRef) {
      const state = storeRef.getState();
      return state.auth?.apiUrl || getApiUrl();
    }
    return getApiUrl();
  }

  /**
   * Get the current auth token from store or localStorage
   * @returns {string} Auth token
   */
  getToken() {
    if (storeRef) {
      const state = storeRef.getState();
      return state.auth?.token || getAdminToken();
    }
    return getAdminToken();
  }

  /**
   * Build headers for API request
   * @param {Object} customHeaders - Additional headers
   * @param {boolean} isFormData - Whether request is FormData
   * @returns {Object} Headers object
   */
  buildHeaders(customHeaders = {}, isFormData = false) {
    const token = this.getToken();
    
    const headers = {
      'x-admin-auth': token,
      ...customHeaders,
    };

    // Don't set Content-Type for FormData (browser sets it with boundary)
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    return headers;
  }

  /**
   * Handle API response
   * @param {Response} response - Fetch response object
   * @returns {Promise<Object>} Parsed response data
   */
  async handleResponse(response) {
    let data;
    try {
      data = await response.json();
    } catch (e) {
      data = {};
    }

    if (!response.ok) {
      // Handle 403 Forbidden (auth error)
      if (response.status === 403) {
        // Clear token from localStorage
        localStorage.removeItem(STORAGE_KEYS.ADMIN_TOKEN);
        
        return {
          success: false,
          error: 'Authentication failed. Please check your admin token.',
          status: 403,
        };
      }

      // Handle other errors
      const errorMessage = data.data?.message || data.message || `HTTP ${response.status}: ${response.statusText}`;
      return {
        success: false,
        error: errorMessage,
        status: response.status,
        data: data.data?.data || data.data || null,
      };
    }

    // Normalize successful response
    // Preserve full response structure for paginated endpoints (like records)
    // If data.data contains nested data with pagination info, return full structure
    const innerData = data.data;
    let resultData;
    
    if (innerData && typeof innerData === 'object' && !Array.isArray(innerData)) {
      // Check if this is a paginated response (has totalCount/totalPages)
      if (innerData.totalCount !== undefined || innerData.totalPages !== undefined) {
        // Return full pagination structure
        resultData = innerData;
      } else if (innerData.data !== undefined) {
        // Has nested data but no pagination - extract inner data
        resultData = innerData.data;
      } else {
        // Just return as-is
        resultData = innerData;
      }
    } else {
      resultData = innerData || data;
    }
    
    const result = {
      success: true,
      data: resultData,
      message: data.data?.message || data.message || 'Success',
      status: response.status,
    };
    
    return result;
  }

  /**
   * Handle fetch errors
   * @param {Error} error - Fetch error
   * @returns {Object} Error response object
   */
  handleError(error) {
    if (error.name === 'AbortError') {
      return {
        success: false,
        error: 'Request timed out. Please try again.',
        status: 0,
      };
    }

    return {
      success: false,
      error: error.message || 'Network error. Please check your connection.',
      status: 0,
    };
  }

  /**
   * Make a GET request
   * @param {string} endpoint - API endpoint
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Response object
   */
  async get(endpoint, params = {}) {
    const url = new URL(`${this.getBaseUrl()}${endpoint}`);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        url.searchParams.append(key, value);
      }
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: this.buildHeaders(),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return await this.handleResponse(response);
    } catch (error) {
      clearTimeout(timeoutId);
      return this.handleError(error);
    }
  }

  /**
   * Make a POST request
   * @param {string} endpoint - API endpoint
   * @param {Object|FormData} body - Request body
   * @returns {Promise<Object>} Response object
   */
  async post(endpoint, body = {}) {
    const isFormData = body instanceof FormData;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.getBaseUrl()}${endpoint}`, {
        method: 'POST',
        headers: this.buildHeaders({}, isFormData),
        body: isFormData ? body : JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return this.handleResponse(response);
    } catch (error) {
      clearTimeout(timeoutId);
      return this.handleError(error);
    }
  }

  /**
   * Make a PATCH request
   * @param {string} endpoint - API endpoint
   * @param {Object|FormData} body - Request body
   * @returns {Promise<Object>} Response object
   */
  async patch(endpoint, body = {}) {
    const isFormData = body instanceof FormData;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.getBaseUrl()}${endpoint}`, {
        method: 'PATCH',
        headers: this.buildHeaders({}, isFormData),
        body: isFormData ? body : JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return this.handleResponse(response);
    } catch (error) {
      clearTimeout(timeoutId);
      return this.handleError(error);
    }
  }

  /**
   * Make a PUT request
   * @param {string} endpoint - API endpoint
   * @param {Object} body - Request body
   * @returns {Promise<Object>} Response object
   */
  async put(endpoint, body = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.getBaseUrl()}${endpoint}`, {
        method: 'PUT',
        headers: this.buildHeaders(),
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return this.handleResponse(response);
    } catch (error) {
      clearTimeout(timeoutId);
      return this.handleError(error);
    }
  }

  /**
   * Make a DELETE request
   * @param {string} endpoint - API endpoint
   * @returns {Promise<Object>} Response object
   */
  async delete(endpoint) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.getBaseUrl()}${endpoint}`, {
        method: 'DELETE',
        headers: this.buildHeaders(),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return this.handleResponse(response);
    } catch (error) {
      clearTimeout(timeoutId);
      return this.handleError(error);
    }
  }
}

/* ============================================================
 * EXPORT SINGLETON INSTANCE
 * ============================================================ */

export const api = new ApiClient();
export default api;
