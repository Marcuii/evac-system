/**
 * @fileoverview Settings Model - System Configuration Storage
 * @description MongoDB schema for storing system settings that can be
 *              dynamically controlled via the admin dashboard.
 * 
 * @requires mongoose - MongoDB ODM
 * 
 * @module models/Settings
 * @author Marcelino Saad
 * @version 1.0.0
 * 
 * @description
 * Settings Categories:
 * ┌─────────────────────────────────────────────────────────────┐
 * │  cloudSync       - Cloud MongoDB synchronization settings   │
 * │  cloudProcessing - Cloud upload & AI processing settings    │
 * └─────────────────────────────────────────────────────────────┘
 * 
 * Usage:
 * - Settings are cached in memory and refreshed per capture cycle
 * - Changes take effect on the next capture/sync cycle
 * - Admin dashboard can modify settings via API
 */

import mongoose from "mongoose";

/* ============================================================
 * SETTINGS SCHEMA
 * ============================================================ */

/**
 * @typedef {Object} CloudSyncSettings
 * @property {boolean} enabled - Whether cloud sync is enabled
 * @property {number} intervalHours - Hours between sync operations
 * @property {Date} [lastSyncAt] - Timestamp of last successful sync
 * @property {string} [lastSyncStatus] - Status of last sync (success/failed)
 */

/**
 * @typedef {Object} CloudProcessingSettings
 * @property {boolean} enabled - Whether cloud upload & AI is enabled
 * @property {string} [disabledReason] - Reason for disabling (optional)
 * @property {Date} [disabledAt] - When it was disabled
 * @property {string} [disabledBy] - Who disabled it (admin username or 'system')
 */

const SettingsSchema = new mongoose.Schema({
  // Singleton pattern - only one settings document
  key: { 
    type: String, 
    required: true, 
    unique: true, 
    default: 'system_settings',
    immutable: true
  },
  
  /**
   * Cloud MongoDB Synchronization Settings
   * Controls periodic backup of local MongoDB to cloud Atlas
   */
  cloudSync: {
    enabled: { 
      type: Boolean, 
      default: true 
    },
    intervalHours: { 
      type: Number, 
      default: 12,
      min: 1,
      max: 168 // Max 1 week
    },
    lastSyncAt: { 
      type: Date 
    },
    lastSyncStatus: { 
      type: String, 
      enum: ['success', 'failed', 'in_progress', null],
      default: null
    },
    lastSyncError: {
      type: String
    },
    lastSyncDuration: {
      type: Number // milliseconds
    }
  },
  
  /**
   * Cloud Processing Settings
   * Controls whether frames are uploaded to Cloudinary and processed by cloud AI
   * When disabled, only local AI analysis is performed
   */
  cloudProcessing: {
    enabled: { 
      type: Boolean, 
      default: true 
    },
    disabledReason: { 
      type: String 
    },
    disabledAt: { 
      type: Date 
    },
    disabledBy: { 
      type: String 
    }
  },
  
  /**
   * Metadata
   */
  updatedAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedBy: { 
    type: String,
    default: 'system'
  }
  
}, { 
  timestamps: true,
  collection: 'settings'
});

/* ============================================================
 * STATIC METHODS
 * ============================================================ */

/**
 * Get the singleton settings document, creating it if it doesn't exist.
 * 
 * @static
 * @async
 * @function getSettings
 * @returns {Promise<Object>} Settings document
 * 
 * @example
 * const settings = await Settings.getSettings();
 * if (settings.cloudProcessing.enabled) {
 *   // Upload to cloud
 * }
 */
SettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne({ key: 'system_settings' });
  
  if (!settings) {
    // Create default settings on first access
    settings = await this.create({ 
      key: 'system_settings',
      cloudSync: {
        enabled: false,  // Default disabled - user enables via Admin Dashboard
        intervalHours: 12 // Default 12 hours
      },
      cloudProcessing: {
        enabled: true // Default to enabled
      }
    });
    console.log('📋 Created default system settings');
  }
  
  return settings;
};

/**
 * Update settings with partial data.
 * 
 * @static
 * @async
 * @function updateSettings
 * @param {Object} updates - Partial settings to update
 * @param {string} [updatedBy='admin'] - Who made the change
 * @returns {Promise<Object>} Updated settings document
 * 
 * @example
 * const settings = await Settings.updateSettings({
 *   cloudProcessing: { enabled: false, disabledReason: 'No internet' }
 * }, 'admin');
 */
SettingsSchema.statics.updateSettings = async function(updates, updatedBy = 'admin') {
  // Ensure settings exist
  await this.getSettings();
  
  // Build the update object with dot notation for nested fields
  const updateObj = { 
    updatedAt: new Date(),
    updatedBy
  };
  
  // Handle cloudSync updates
  if (updates.cloudSync) {
    if (typeof updates.cloudSync.enabled === 'boolean') {
      updateObj['cloudSync.enabled'] = updates.cloudSync.enabled;
    }
    if (typeof updates.cloudSync.intervalHours === 'number') {
      updateObj['cloudSync.intervalHours'] = Math.max(1, Math.min(168, updates.cloudSync.intervalHours));
    }
  }
  
  // Handle cloudProcessing updates
  if (updates.cloudProcessing) {
    if (typeof updates.cloudProcessing.enabled === 'boolean') {
      updateObj['cloudProcessing.enabled'] = updates.cloudProcessing.enabled;
      
      // Track when and why it was disabled
      if (!updates.cloudProcessing.enabled) {
        updateObj['cloudProcessing.disabledAt'] = new Date();
        updateObj['cloudProcessing.disabledBy'] = updatedBy;
        if (updates.cloudProcessing.disabledReason) {
          updateObj['cloudProcessing.disabledReason'] = updates.cloudProcessing.disabledReason;
        }
      } else {
        // Clear disabled fields when re-enabled
        updateObj['cloudProcessing.disabledAt'] = null;
        updateObj['cloudProcessing.disabledBy'] = null;
        updateObj['cloudProcessing.disabledReason'] = null;
      }
    }
  }
  
  const settings = await this.findOneAndUpdate(
    { key: 'system_settings' },
    { $set: updateObj },
    { new: true }
  );
  
  return settings;
};

/**
 * Update cloud sync status after a sync operation.
 * 
 * @static
 * @async
 * @function updateSyncStatus
 * @param {string} status - 'success', 'failed', or 'in_progress'
 * @param {number} [duration] - Sync duration in milliseconds
 * @param {string} [error] - Error message if failed
 * @returns {Promise<Object>} Updated settings document
 */
SettingsSchema.statics.updateSyncStatus = async function(status, duration = null, error = null) {
  const updateObj = {
    'cloudSync.lastSyncStatus': status,
    updatedAt: new Date()
  };
  
  if (status === 'success' || status === 'failed') {
    updateObj['cloudSync.lastSyncAt'] = new Date();
  }
  
  if (duration !== null) {
    updateObj['cloudSync.lastSyncDuration'] = duration;
  }
  
  if (error) {
    updateObj['cloudSync.lastSyncError'] = error;
  } else if (status === 'success') {
    updateObj['cloudSync.lastSyncError'] = null;
  }
  
  return this.findOneAndUpdate(
    { key: 'system_settings' },
    { $set: updateObj },
    { new: true, upsert: true }
  );
};

/* ============================================================
 * EXPORT
 * ============================================================ */

const Settings = mongoose.model("Settings", SettingsSchema);

export default Settings;
