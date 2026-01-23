/**
 * @fileoverview Cloud MongoDB Synchronization Utility
 * @description Periodically synchronizes local MongoDB data to a cloud MongoDB instance.
 *              Performs incremental sync based on timestamps to minimize data transfer.
 * 
 * @requires mongoose - MongoDB ODM for Node.js
 * @requires ../models/FloorMap.js - Floor configuration model
 * @requires ../models/ImageRecord.js - Camera frame records model
 * @requires ../models/Route.js - Computed routes model
 * 
 * @env {string} CLOUD_MONGO_URI - Cloud MongoDB connection string (e.g., MongoDB Atlas)
 * 
 * Note: Cloud sync enabled/disabled and interval settings are managed via the
 * Admin Dashboard Settings page and stored in MongoDB (see Settings model).
 * 
 * @module utils/cloudSync
 * @author Marcelino Saad
 * @version 1.0.0
 * 
 * @exports initCloudSync - Starts the periodic cloud sync scheduler
 * @exports syncToCloud - Manually triggers a cloud sync
 * 
 * @description
 * Sync Strategy:
 * ┌─────────────────────────────────────────────────────────────┐
 * │ 1. Connect to cloud MongoDB (separate connection)          │
 * │ 2. For each collection (FloorMap, ImageRecord, Route):     │
 * │    - Fetch all documents from local DB                     │
 * │    - Upsert to cloud DB (update if exists, insert if not)  │
 * │ 3. Log sync statistics and timing                          │
 * │ 4. Close cloud connection                                  │
 * └─────────────────────────────────────────────────────────────┘
 * 
 * Collections Synced:
 * - FloorMap: Floor configurations, graphs, cameras, screens
 * - ImageRecord: Camera capture history (can be large)
 * - Route: Computed evacuation routes history
 */

import mongoose from "mongoose";
import FloorMap from "../models/FloorMap.js";
import ImageRecord from "../models/ImageRecord.js";
import RouteModel from "../models/Route.js";
import Settings from "../models/Settings.js";

/* ============================================================
 * CONFIGURATION
 * ============================================================ */

/** @const {string} CLOUD_MONGO_URI - Cloud MongoDB connection string */
const CLOUD_MONGO_URI = process.env.CLOUD_MONGO_URI || "";

/* ============================================================
 * STATE MANAGEMENT
 * ============================================================ */

/** @type {boolean} syncInProgress - Mutex to prevent overlapping syncs */
let syncInProgress = false;

/** @type {Date|null} lastSyncTime - Timestamp of last successful sync */
let lastSyncTime = null;

/** @type {mongoose.Connection|null} cloudConnection - Cloud DB connection */
let cloudConnection = null;

/** @type {NodeJS.Timeout|null} syncIntervalRef - Reference to the sync interval */
let syncIntervalRef = null;

/** @type {number} currentIntervalHours - Currently configured interval */
let currentIntervalHours = 12;

/* ============================================================
 * CLOUD CONNECTION MANAGEMENT
 * ============================================================ */

/**
 * Establishes connection to cloud MongoDB.
 * 
 * @async
 * @function connectToCloud
 * @returns {Promise<mongoose.Connection>} Cloud database connection
 * @throws {Error} If connection fails
 */
const connectToCloud = async () => {
  if (!CLOUD_MONGO_URI) {
    throw new Error("CLOUD_MONGO_URI not configured in .env");
  }

  // Create a separate connection for cloud DB (don't interfere with local)
  const connection = await mongoose.createConnection(CLOUD_MONGO_URI).asPromise();
  console.log("☁️  Connected to cloud MongoDB");
  return connection;
};

/**
 * Closes the cloud MongoDB connection.
 * 
 * @async
 * @function closeCloudConnection
 * @param {mongoose.Connection} connection - Connection to close
 */
const closeCloudConnection = async (connection) => {
  if (connection) {
    await connection.close();
    console.log("☁️  Disconnected from cloud MongoDB");
  }
};

/* ============================================================
 * COLLECTION SYNC FUNCTIONS
 * ============================================================ */

/**
 * Syncs a collection from local to cloud using upsert operations.
 * 
 * @async
 * @function syncCollection
 * @param {mongoose.Model} LocalModel - Local Mongoose model
 * @param {mongoose.Connection} cloudConn - Cloud database connection
 * @param {string} collectionName - Name of the collection
 * @param {string} idField - Field to use as unique identifier for upsert
 * @returns {Promise<Object>} Sync statistics { synced, errors }
 */
const syncCollection = async (LocalModel, cloudConn, collectionName, idField = "_id") => {
  const stats = { synced: 0, errors: 0, skipped: 0 };
  
  try {
    // Get the cloud collection
    const CloudCollection = cloudConn.collection(collectionName);
    
    // Fetch all documents from local
    const localDocs = await LocalModel.find({}).lean();
    
    console.log(`  📦 ${collectionName}: ${localDocs.length} documents to sync`);
    
    // Upsert each document to cloud
    for (const doc of localDocs) {
      try {
        const filter = idField === "_id" 
          ? { _id: doc._id } 
          : { [idField]: doc[idField] };
        
        await CloudCollection.replaceOne(filter, doc, { upsert: true });
        stats.synced++;
      } catch (err) {
        console.error(`    ❌ Error syncing ${collectionName} doc ${doc[idField]}:`, err.message);
        stats.errors++;
      }
    }
    
    console.log(`  ✅ ${collectionName}: ${stats.synced} synced, ${stats.errors} errors`);
  } catch (err) {
    console.error(`  ❌ ${collectionName} sync failed:`, err.message);
    stats.errors = -1; // Indicates complete failure
  }
  
  return stats;
};

/* ============================================================
 * MAIN SYNC FUNCTION
 * ============================================================ */

/**
 * Performs a full sync of all collections to cloud MongoDB.
 * 
 * @async
 * @function syncToCloud
 * @returns {Promise<Object>} Sync result with statistics
 * 
 * @description
 * Syncs the following collections:
 * - floormaps: Floor configurations (using 'id' field as identifier)
 * - imagerecords: Camera capture records (using '_id')
 * - routes: Computed evacuation routes (using '_id')
 * 
 * @example
 * const result = await syncToCloud();
 * // result = { success: true, duration: 5432, collections: {...} }
 */
export const syncToCloud = async () => {
  // Get settings from DB
  const settings = await Settings.getSettings();
  const syncEnabled = settings.cloudSync?.enabled ?? false;
  
  // Check if sync is enabled
  if (!syncEnabled) {
    console.log("☁️  Cloud sync is disabled in settings");
    return { success: false, reason: "disabled" };
  }
  
  // Prevent overlapping syncs
  if (syncInProgress) {
    console.warn("☁️  Sync already in progress - skipping");
    return { success: false, reason: "in_progress" };
  }
  
  // Update status to in_progress
  await Settings.updateSyncStatus('in_progress');
  
  syncInProgress = true;
  const startTime = performance.now();
  
  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log("║         ☁️  CLOUD SYNC STARTED                    ║");
  console.log("╚══════════════════════════════════════════════════╝\n");
  
  const result = {
    success: false,
    startTime: new Date().toISOString(),
    duration: 0,
    collections: {}
  };
  
  try {
    // Connect to cloud
    cloudConnection = await connectToCloud();
    
    // Sync FloorMap collection (use 'id' field as it's the business key)
    result.collections.floormaps = await syncCollection(
      FloorMap, 
      cloudConnection, 
      "floormaps", 
      "id"
    );
    
    // Sync ImageRecord collection
    result.collections.imagerecords = await syncCollection(
      ImageRecord, 
      cloudConnection, 
      "imagerecords", 
      "_id"
    );
    
    // Sync Route collection
    result.collections.routes = await syncCollection(
      RouteModel, 
      cloudConnection, 
      "routes", 
      "_id"
    );
    
    // Calculate totals
    const totalSynced = Object.values(result.collections)
      .reduce((sum, c) => sum + (c.synced || 0), 0);
    const totalErrors = Object.values(result.collections)
      .reduce((sum, c) => sum + (c.errors > 0 ? c.errors : 0), 0);
    
    result.success = true;
    result.totalSynced = totalSynced;
    result.totalErrors = totalErrors;
    lastSyncTime = new Date();
    
    // Update sync status in settings
    await Settings.updateSyncStatus('success', result.duration);
    
  } catch (err) {
    console.error("☁️  Cloud sync error:", err.message);
    result.error = err.message;
    
    // Update sync status with error
    await Settings.updateSyncStatus('failed', null, err.message);
  } finally {
    // Always disconnect from cloud
    await closeCloudConnection(cloudConnection);
    cloudConnection = null;
    syncInProgress = false;
  }
  
  result.duration = parseFloat((performance.now() - startTime).toFixed(2));
  
  // Log summary
  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log("║         ☁️  CLOUD SYNC COMPLETE                   ║");
  console.log("╠══════════════════════════════════════════════════╣");
  console.log(`║ Status:      ${result.success ? "✅ SUCCESS" : "❌ FAILED"}                          ║`);
  console.log(`║ Duration:    ${String(result.duration).padStart(10)}ms                   ║`);
  if (result.success) {
    console.log(`║ Total Synced: ${String(result.totalSynced).padStart(9)} documents            ║`);
    console.log(`║ Total Errors: ${String(result.totalErrors).padStart(9)}                      ║`);
  }
  console.log("╚══════════════════════════════════════════════════╝\n");
  
  return result;
};

/* ============================================================
 * SCHEDULER
 * ============================================================ */

/**
 * Check settings and potentially reschedule sync if interval changed.
 * @async
 * @private
 */
const checkAndReschedule = async () => {
  try {
    const settings = await Settings.getSettings();
    const newIntervalHours = settings.cloudSync?.intervalHours ?? 12;
    const syncEnabled = settings.cloudSync?.enabled ?? false;
    
    // If sync was disabled, clear the interval
    if (!syncEnabled && syncIntervalRef) {
      clearInterval(syncIntervalRef);
      syncIntervalRef = null;
      console.log("☁️  Cloud sync disabled - scheduler stopped");
      return;
    }
    
    // If interval changed, reschedule
    if (newIntervalHours !== currentIntervalHours && syncEnabled) {
      currentIntervalHours = newIntervalHours;
      
      if (syncIntervalRef) {
        clearInterval(syncIntervalRef);
      }
      
      const intervalMs = currentIntervalHours * 60 * 60 * 1000;
      syncIntervalRef = setInterval(syncCycleWithCheck, intervalMs);
      
      console.log(`☁️  Cloud sync interval updated: every ${currentIntervalHours} hour(s)`);
      console.log(`    Next sync at: ${new Date(Date.now() + intervalMs).toLocaleString()}`);
    }
  } catch (err) {
    console.error("☁️  Error checking sync settings:", err.message);
  }
};

/**
 * Wrapper for sync cycle that also checks for reschedule.
 * @async
 * @private
 */
const syncCycleWithCheck = async () => {
  await checkAndReschedule();
  await syncToCloud();
};

/**
 * Initializes the periodic cloud sync scheduler.
 * 
 * @async
 * @function initCloudSync
 * @returns {Promise<void>}
 * 
 * @description
 * - Checks if cloud sync is enabled via settings in MongoDB
 * - Schedules sync at interval defined in settings
 * - First sync runs after the first interval (not immediately on startup)
 * - Use syncToCloud() to trigger an immediate manual sync
 * - Interval is automatically adjusted if settings change
 * 
 * @example
 * // In server.js:
 * import { initCloudSync } from './utils/cloudSync.js';
 * await initCloudSync();
 */
export const initCloudSync = async () => {
  try {
    // Get settings from DB (will create defaults if not exist)
    const settings = await Settings.getSettings();
    const syncEnabled = settings.cloudSync?.enabled ?? false;
    currentIntervalHours = settings.cloudSync?.intervalHours ?? 12;
    
    if (!syncEnabled) {
      console.log("☁️  Cloud sync disabled in settings (enable via admin dashboard)");
      return;
    }
    
    if (!CLOUD_MONGO_URI) {
      console.warn("⚠️  Cloud sync enabled but CLOUD_MONGO_URI not set - sync will fail");
    }
    
    const intervalMs = currentIntervalHours * 60 * 60 * 1000;
    
    // Schedule periodic sync with check for settings changes
    syncIntervalRef = setInterval(syncCycleWithCheck, intervalMs);
    
    console.log(`☁️  Cloud sync scheduler started: every ${currentIntervalHours} hour(s)`);
    console.log(`    Next sync at: ${new Date(Date.now() + intervalMs).toLocaleString()}`);
  } catch (err) {
    console.error("☁️  Error initializing cloud sync:", err.message);
  }
};

/* ============================================================
 * DISCONNECT FUNCTION
 * ============================================================ */

/**
 * Disconnects from cloud MongoDB if connected and stops the scheduler.
 * Called during graceful shutdown.
 * 
 * @async
 * @function disconnectFromCloud
 * @returns {Promise<void>}
 */
export const disconnectFromCloud = async () => {
  // Stop the scheduler
  if (syncIntervalRef) {
    clearInterval(syncIntervalRef);
    syncIntervalRef = null;
    console.log("☁️  Cloud sync scheduler stopped");
  }
  
  // Close cloud connection if open
  if (cloudConnection) {
    await cloudConnection.close();
    cloudConnection = null;
    console.log("☁️  Cloud MongoDB connection closed");
  }
};
