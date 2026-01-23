/**
 * @fileoverview Periodic Job Scheduler - Main Pipeline Orchestrator
 * @description Core scheduler that orchestrates the entire evacuation system pipeline:
 *              Camera capture → AI analysis → Route computation → Socket/USRP broadcast
 * 
 * @requires ../models/ImageRecord.js - Camera frame storage model
 * @requires ../models/FloorMap.js - Floor configuration model
 * @requires ../models/Route.js - Computed route storage model
 * @requires ./rtspCapture.js - RTSP frame capture
 * @requires ./storage/saveLocalImage.js - Local storage utility
 * @requires ./storage/uploadCloudImage.js - Cloud storage utility
 * @requires ./ai/sendToLocalAI.js - Local AI inference
 * @requires ./ai/sendToCloudAI.js - Cloud AI inference
 * @requires ./dijkstra.js - Pathfinding algorithm
 * @requires ./usrpSender.js - USRP SDR transmission
 * @requires ../sockets/routeSocket.js - Socket.IO broadcasting
 * 
 * @module utils/periodicJob
 * @author Marcelino Saad
 * @version 1.0.0
 * 
 * @exports initScheduler - Starts the periodic capture cycle
 * @exports stopScheduler - Stops the periodic capture cycle
 * 
 * @description
 * Status-Aware Processing:
 * - Floor status: Skips entire floor if disabled/maintenance
 * - Camera status: Skips cameras that are disabled/maintenance/error
 * - Screen status: Only computes routes for active screens
 * 
 * Auto-Disable Feature:
 * - Tracks consecutive camera failures
 * - Auto-disables cameras after threshold failures
 * - Requires manual admin re-enable after fixing
 * 
 * USRP Fallback:
 * - Detects when no socket connections exist for a floor
 * - Transmits routes via SDR/USRP for offline screens
 * 
 * Environment Variables:
 * - CAPTURE_INTERVAL_SEC: Interval between capture cycles (default: 30)
 * - CAMERA_FAILURE_THRESHOLD: Failures before auto-disable (default: 3)
 * - CAMERA_FAILURE_RESET_HOURS: Hours to reset failure count (default: 24)
 * - RTSP_TEMPLATE: Template URL for camera RTSP streams
 * 
 * Pipeline Stages (per floor):
 * ┌─────────────────────────────────────────────────────────────┐
 * │ 1. RTSP Capture     → Capture frames from active cameras   │
 * │ 2. Local Storage    → Save frames to disk                  │
 * │ 3. Cloud Upload     → Upload to Cloudinary                 │
 * │ 4. AI Analysis      → Local + Cloud AI (parallel)          │
 * │ 5. Edge Update      → Update graph edge hazard data        │
 * │ 6. Dijkstra         → Compute routes for active screens    │
 * │ 7. Broadcast        → Socket.IO + USRP fallback            │
 * └─────────────────────────────────────────────────────────────┘
 */

import ImageRecord from "../models/ImageRecord.js";
import FloorMap from "../models/FloorMap.js";
import RouteModel from "../models/Route.js";
import Settings from "../models/Settings.js";
import { captureFrameFromRtsp } from "./rtspCapture.js";
import { saveToLocalStorage } from "./storage/saveLocalImage.js";
import { uploadRecordToCloud } from "./storage/uploadCloudImage.js";
import { callLocalAI } from "./ai/sendToLocalAI.js";
import { callCloudAI } from "./ai/sendToCloudAI.js";
import { computeShortestPaths } from "./dijkstra.js";
import { sendViaUSRP } from "./usrpSender.js";
import { ioEmit, ioEmitToFloor, getActiveSocketCount, getActiveFloorIds } from "../sockets/routeSocket.js";

/* ============================================================
 * AUTO-DISABLE CONFIGURATION
 * Settings for automatic camera failure handling
 * ============================================================ */

/** @const {number} CAMERA_FAILURE_THRESHOLD - Failures before auto-disable */
const CAMERA_FAILURE_THRESHOLD = parseInt(process.env.CAMERA_FAILURE_THRESHOLD || "3", 10);

/** @const {number} CAMERA_FAILURE_RESET_HOURS - Hours until failure count resets */
const CAMERA_FAILURE_RESET_HOURS = parseInt(process.env.CAMERA_FAILURE_RESET_HOURS || "24", 10);

/* ============================================================
 * CYCLE STATE MANAGEMENT
 * Prevents overlapping cycles and tracks modifications
 * ============================================================ */

/** @type {boolean} cycleInProgress - Mutex to prevent overlapping cycles */
let cycleInProgress = false;

/** @type {boolean} camerasModified - Track if camera data needs saving */
let camerasModified = false;

/* ============================================================
 * CAMERA FAILURE HANDLING
 * Auto-disable cameras after repeated failures
 * ============================================================ */

/**
 * Handles camera capture failure - tracks failures and auto-disables if threshold reached.
 * 
 * @function handleCameraFailure
 * @param {Object} floor - FloorMap document
 * @param {string} cameraId - ID of the failing camera
 * @param {string} error - Error message describing the failure
 * 
 * @description
 * Failure tracking flow:
 * 1. Increment failure count
 * 2. Record failure timestamp
 * 3. If threshold reached, set status to 'error'
 * 4. Mark cameras array as modified for Mongoose save
 * 
 * Auto-disabled cameras require manual admin intervention to re-enable.
 */
const handleCameraFailure = (floor, cameraId, error) => {
  const camera = floor.cameras?.find(c => c.id === cameraId);
  if (!camera) {
    console.log(`⚠️ Camera ${cameraId} not found in cameras array (legacy format?)`);
    return;
  }
  
  // Increment failure count
  camera.failureCount = (camera.failureCount || 0) + 1;
  camera.lastFailure = new Date();
  camerasModified = true;
  
  console.log(`📷 Camera ${cameraId} failure #${camera.failureCount}/${CAMERA_FAILURE_THRESHOLD}`);
  
  // Auto-disable if threshold reached
  if (camera.failureCount >= CAMERA_FAILURE_THRESHOLD) {
    camera.status = 'error';
    camera.disabledReason = `Auto-disabled after ${camera.failureCount} consecutive failures: ${error}`;
    camera.disabledAt = new Date();
    camera.disabledBy = 'system';
    console.warn(`🚨 Camera ${cameraId} AUTO-DISABLED after ${camera.failureCount} failures`);
  }
  
  // Mark the cameras array as modified so Mongoose saves it
  floor.markModified('cameras');
};

/**
 * Handles camera capture success - resets failure count.
 * 
 * @function handleCameraSuccess
 * @param {Object} floor - FloorMap document
 * @param {Object} camera - Camera object from floor.cameras
 * 
 * @description
 * Note: If camera status is 'error' (auto-disabled), success does NOT
 * auto-enable it. Admin must manually re-enable after fixing the issue.
 */
const handleCameraSuccess = (floor, camera) => {
  if (camera && camera.failureCount > 0) {
    console.log(`📷 Camera ${camera.id} success - resetting failure count from ${camera.failureCount}`);
    camera.failureCount = 0;
    camera.lastSuccess = new Date();
    camerasModified = true;
    
    // Mark the cameras array as modified so Mongoose saves it
    floor.markModified('cameras');
    
    // If it was auto-disabled (error status), don't auto-enable
    // Admin must manually re-enable after fixing the issue
    if (camera.status === 'error') {
      console.log(`📷 Camera ${camera.id} capture succeeded but status is 'error' - admin must re-enable`);
    }
  }
};

/* ============================================================
 * HELPER FUNCTIONS
 * Status-aware data extraction
 * ============================================================ */

/**
 * Gets cameras to process (active only, with legacy format fallback).
 * 
 * @function getCamerasToProcess
 * @param {Object} floor - FloorMap document
 * @returns {Array<Object>} Array of camera objects with cameraId, edgeId, camera
 * 
 * @description
 * Supports two floor formats:
 * - New format: floor.cameras array with status field
 * - Legacy format: floor.cameraToEdge Map (all considered active)
 */
const getCamerasToProcess = (floor) => {
  // New cameras array with status
  if (floor.cameras && floor.cameras.length > 0) {
    return floor.cameras
      .filter(c => c.status === 'active')
      .map(c => ({ cameraId: c.id, edgeId: c.edgeId, camera: c }));
  }
  
  // Legacy fallback: cameraToEdge map (all considered active)
  if (floor.cameraToEdge) {
    return Object.entries(Object.fromEntries(floor.cameraToEdge))
      .map(([cameraId, edgeId]) => ({ cameraId, edgeId, camera: null }));
  }
  
  return [];
};

/**
 * Gets active start points (screen node IDs) for route computation.
 * 
 * @function getActiveStartPoints
 * @param {Object} floor - FloorMap document
 * @returns {Array<string>} Array of node IDs for active screens
 * 
 * @description
 * Supports two floor formats:
 * - New format: floor.screens array with status field
 * - Legacy format: floor.startPoints array (all considered active)
 */
const getActiveStartPoints = (floor) => {
  // New screens array with status
  if (floor.screens && floor.screens.length > 0) {
    return floor.screens
      .filter(s => s.status === 'active')
      .map(s => s.nodeId);
  }
  
  // Legacy fallback
  return floor.startPoints || [];
};

/* ============================================================
 * MAIN CAPTURE CYCLE
 * Orchestrates the entire pipeline
 * ============================================================ */

/**
 * Executes one complete capture cycle for all active floors.
 * 
 * @async
 * @function captureCycle
 * @returns {Promise<void>}
 * 
 * @description
 * Cycle stages for each floor:
 * 1. Reset edge hazard data
 * 2. Process active cameras (capture, upload, AI)
 * 3. Update edge data with AI results
 * 4. Build graph for Dijkstra
 * 5. Compute routes for active screens
 * 6. Save route document
 * 7. Broadcast via Socket.IO and/or USRP
 * 
 * Includes comprehensive timing analysis for performance monitoring.
 */
const captureCycle = async () => {
  // ─────────────────────────────────────────────
  // MUTEX: Prevent overlapping cycles
  // ─────────────────────────────────────────────
  if (cycleInProgress) {
    console.warn("⚠️ Previous cycle still in progress - skipping this cycle");
    return;
  }
  
  cycleInProgress = true;
  camerasModified = false; // Reset for this cycle
  
  // ─────────────────────────────────────────────
  // TIMING: Initialize performance tracking
  // ─────────────────────────────────────────────
  const cycleStartTime = performance.now();
  const cycleTiming = {
    totalMs: 0,
    phases: {},
    floors: []
  };
  
  try {
    console.log("Starting capture cycle...");
    
    // ─────────────────────────────────────────────
    // SETTINGS: Fetch cloud processing setting once per cycle
    // ─────────────────────────────────────────────
    const settings = await Settings.getSettings();
    const cloudProcessingEnabled = settings.cloudProcessing?.enabled ?? true;
    
    if (!cloudProcessingEnabled) {
      console.log("☁️ Cloud processing DISABLED - using local AI only");
    }
    
    // ─────────────────────────────────────────────
    // FLOOR QUERY: Only fetch active floors
    // ─────────────────────────────────────────────
    const floors = await FloorMap.find({ 
      status: { $in: ['active', undefined, null] } // Include floors without status field (legacy)
    });
    
    const skippedFloors = await FloorMap.countDocuments({ 
      status: { $in: ['disabled', 'maintenance'] } 
    });
    
    if (skippedFloors > 0) {
      console.log(`⏭️ Skipping ${skippedFloors} disabled/maintenance floor(s)`);
    }

    cycleTiming.phases.dbQuery = parseFloat((performance.now() - cycleStartTime).toFixed(2));
    
    // ─────────────────────────────────────────────
    // FLOOR PROCESSING LOOP
    // ─────────────────────────────────────────────
    for (const floor of floors) {
      const floorStartTime = performance.now();
      const floorTiming = {
        floorId: floor.id,
        floorName: floor.name,
        phases: {}
      };
      
      // Double-check floor status (in case of race condition)
      if (floor.status === 'disabled' || floor.status === 'maintenance') {
        console.log(`⏭️ Skipping floor ${floor.name} (status: ${floor.status})`);
        continue;
      }
      
      // ─────────────────────────────────────────────
      // RESET: Clear edge hazard data for fresh cycle
      // ─────────────────────────────────────────────
      floor.edges.forEach(edge => {
        edge.currentPeopleCount = 0;
        edge.currentFireProb = 0;
        edge.currentSmokeProb = 0;
      });

      // ─────────────────────────────────────────────
      // CAMERA SELECTION: Get active cameras only
      // ─────────────────────────────────────────────
      const camerasToProcess = getCamerasToProcess(floor);
      const totalCameras = floor.cameras?.length || floor.cameraToEdge?.size || 0;
      const skippedCameras = totalCameras - camerasToProcess.length;
      
      if (skippedCameras > 0) {
        console.log(`📷 Floor ${floor.name}: Processing ${camerasToProcess.length}/${totalCameras} cameras (${skippedCameras} disabled/error)`);
      }

      // ─────────────────────────────────────────────
      // CAMERA PROCESSING: Capture → Upload → AI
      // ─────────────────────────────────────────────
      const captureStartTime = performance.now();
      let captureCount = 0;
      let aiAnalysisTimeMs = 0;
      let cloudUploadTimeMs = 0;
      let rtspCaptureTimeMs = 0;
      let dbWriteTimeMs = 0;
      const cameraTimings = [];
      
      for (const { cameraId, edgeId, camera } of camerasToProcess) {
        const cameraStartTime = performance.now();
        const cameraTiming = { cameraId, phases: {} };
        
        try {
          // Get RTSP URL (camera-specific or from template)
          const rtspUrl = camera?.rtspUrl || process.env.RTSP_TEMPLATE?.replace("{cameraId}", cameraId);
          if (!rtspUrl) {
            console.warn(`No RTSP URL configured for camera ${cameraId}`);
            continue;
          }

          // STAGE 1: Capture frame from RTSP stream
          const rtspStart = performance.now();
          const { localPath } = await captureFrameFromRtsp(rtspUrl, floor.id, cameraId);
          cameraTiming.phases.rtsp = performance.now() - rtspStart;
          rtspCaptureTimeMs += cameraTiming.phases.rtsp;
          
          // Reset failure count on success
          if (camera) {
            handleCameraSuccess(floor, camera);
          }
          
          // STAGE 2: Save to structured local storage
          const { relativePath, absolutePath } = saveToLocalStorage(localPath, floor.id, cameraId);
          
          // STAGE 3: Upload to cloud storage (if cloud processing enabled)
          let cloudUrl = null;
          if (cloudProcessingEnabled) {
            const cloudStart = performance.now();
            cloudUrl = await uploadRecordToCloud(absolutePath, floor.id, cameraId);
            cameraTiming.phases.cloudUpload = performance.now() - cloudStart;
            cloudUploadTimeMs += cameraTiming.phases.cloudUpload;
          } else {
            cameraTiming.phases.cloudUpload = 0;
          }
          
          // STAGE 4: Create image record in database
          const dbStart = performance.now();
          const rec = await ImageRecord.create({ 
            cameraId, 
            edgeId, 
            floorId: floor.id,
            localPath: relativePath, 
            cloudUrl // Will be null if cloud processing is disabled
          });
          cameraTiming.phases.dbWrite = performance.now() - dbStart;
          dbWriteTimeMs += cameraTiming.phases.dbWrite;

          // STAGE 5: Run AI analysis (local + cloud in parallel if enabled)
          const aiStartTime = performance.now();
          const [localRes, cloudRes] = await Promise.allSettled([
            callLocalAI({ localPath: absolutePath, cameraId, edgeId }),
            (cloudProcessingEnabled && cloudUrl) 
              ? callCloudAI({ cloudUrl, cameraId, edgeId }) 
              : Promise.resolve(null)
          ]);
          cameraTiming.phases.ai = performance.now() - aiStartTime;
          aiAnalysisTimeMs += cameraTiming.phases.ai;

          // Extract results (prefer cloud over local when available)
          const localData = localRes.status === 'fulfilled' ? localRes.value : null;
          const cloudData = cloudRes.status === 'fulfilled' ? cloudRes.value : null;

          // Fuse AI results (cloud takes precedence if available)
          const aiResult = {
            peopleCount: cloudData?.peopleCount ?? localData?.peopleCount ?? 0,
            fireProb: cloudData?.fireProb ?? localData?.fireProb ?? 0,
            smokeProb: cloudData?.smokeProb ?? localData?.smokeProb ?? 0
          };

          // STAGE 6: Update image record with AI results
          rec.aiResult = aiResult;
          rec.processed = true;
          await rec.save();

          // STAGE 7: Update edge with current AI data
          const edge = floor.edges.find(e => e.id === edgeId);
          if (edge) {
            edge.currentPeopleCount = aiResult.peopleCount;
            edge.currentFireProb = aiResult.fireProb;
            edge.currentSmokeProb = aiResult.smokeProb;
          }
          
          // Record camera timing
          cameraTiming.totalMs = parseFloat((performance.now() - cameraStartTime).toFixed(2));
          cameraTimings.push(cameraTiming);
          captureCount++;
        } catch (err) {
          console.error(`Error processing camera ${cameraId}:`, err.message);
          
          // Track failure for auto-disable feature
          handleCameraFailure(floor, cameraId, err.message);
        }
      }

      // ─────────────────────────────────────────────
      // SAVE: Persist updated floor data
      // ─────────────────────────────────────────────
      const dbSaveStart = performance.now();
      await floor.save();
      const dbSaveMs = performance.now() - dbSaveStart;
      
      // Record capture phase timings
      floorTiming.phases.capture = parseFloat((performance.now() - captureStartTime).toFixed(2));
      floorTiming.phases.rtspCapture = parseFloat(rtspCaptureTimeMs.toFixed(2));
      floorTiming.phases.cloudUpload = parseFloat(cloudUploadTimeMs.toFixed(2));
      floorTiming.phases.aiAnalysis = parseFloat(aiAnalysisTimeMs.toFixed(2));
      floorTiming.phases.dbWrite = parseFloat(dbWriteTimeMs.toFixed(2));
      floorTiming.phases.dbSave = parseFloat(dbSaveMs.toFixed(2));
      floorTiming.captureCount = captureCount;
      floorTiming.cameraTimings = cameraTimings;

      // ─────────────────────────────────────────────
      // GRAPH BUILD: Prepare data for Dijkstra
      // ─────────────────────────────────────────────
      const graphBuildStart = performance.now();
      const graph = {
        nodes: floor.nodes,
        edges: floor.edges.map(e => ({
          id: e.id,
          from: e.from,
          to: e.to,
          staticWeight: e.staticWeight,
          peopleThreshold: e.peopleThreshold,
          fireThreshold: e.fireThreshold,
          smokeThreshold: e.smokeThreshold,
          currentPeopleCount: e.currentPeopleCount,
          currentFireProb: e.currentFireProb,
          currentSmokeProb: e.currentSmokeProb
        })),
        scale: floor.mapImage ? {
          widthPixels: floor.mapImage.widthPixels,
          heightPixels: floor.mapImage.heightPixels,
          widthMeters: floor.mapImage.widthMeters,
          heightMeters: floor.mapImage.heightMeters
        } : null
      };

      // ─────────────────────────────────────────────
      // SCREEN SELECTION: Get active screens only
      // ─────────────────────────────────────────────
      const activeStartPoints = getActiveStartPoints(floor);
      const totalScreens = floor.screens?.length || floor.startPoints?.length || 0;
      const skippedScreens = totalScreens - activeStartPoints.length;
      
      if (skippedScreens > 0) {
        console.log(`🖥️ Floor ${floor.name}: Computing routes for ${activeStartPoints.length}/${totalScreens} screens (${skippedScreens} disabled)`);
      }
      
      floorTiming.phases.graphBuild = parseFloat((performance.now() - graphBuildStart).toFixed(2));
      
      // Skip routing if no active screens
      if (!activeStartPoints || activeStartPoints.length === 0) {
        console.warn(`Floor ${floor.name} has no active screens/start points`);
        continue;
      }

      // ─────────────────────────────────────────────
      // DIJKSTRA: Compute optimal evacuation routes
      // ─────────────────────────────────────────────
      const dijkstraStart = performance.now();
      const routeResults = computeShortestPaths(graph, activeStartPoints, floor.exitPoints);
      floorTiming.phases.dijkstra = parseFloat((performance.now() - dijkstraStart).toFixed(2));
      floorTiming.dijkstraTiming = routeResults._timing || null;

      // Determine overall hazard level (worst of all routes)
      const overallHazardLevel = routeResults.reduce((max, route) => {
        const levels = ['safe', 'moderate', 'high', 'critical'];
        const maxIdx = levels.indexOf(max);
        const routeIdx = levels.indexOf(route.hazardLevel);
        return routeIdx > maxIdx ? route.hazardLevel : max;
      }, 'safe');

      // Check if emergency (any route exceeds safety thresholds)
      const emergency = routeResults.some(r => r.exceedsThresholds);

      // ─────────────────────────────────────────────
      // SAVE ROUTE: Persist computed routes
      // ─────────────────────────────────────────────
      const routeDoc = await RouteModel.create({ 
        floorId: floor.id, 
        routes: routeResults,
        emergency,
        overallHazardLevel
      });
      routeDoc.save();

      // ─────────────────────────────────────────────
      // BROADCAST: Socket.IO + USRP fallback
      // ─────────────────────────────────────────────
      const activeCount = getActiveSocketCount();
      const activeFloorIds = getActiveFloorIds();
      
      console.log(`📊 Active floors: ${activeCount} | Floor IDs: ${activeFloorIds.join(', ') || 'none'}`);

      // Build the route data payload
      const routePayload = { 
        floorId: floor.id, 
        floorName: floor.name,
        routes: routeDoc.routes,
        emergency,
        overallHazardLevel,
        timestamp: new Date().toISOString(),
        totalRoutes: routeDoc.routes.length
      };

      // Emit to specific floor room (targeted broadcast)
      ioEmitToFloor(floor.id, "floor-routes", routePayload);
      
      // Also broadcast globally for backward compatibility
      ioEmit("route_update", routePayload);

      // ─────────────────────────────────────────────
      // USRP FALLBACK: SDR transmission for offline screens
      // Architecture: Backend always has internet (DevTunnels)
      // USRP triggers ONLY when NO screens are connected for this floor
      // ─────────────────────────────────────────────
      const floorHasActiveConnections = activeFloorIds.includes(floor.id);
      const shouldUseUSRP = !floorHasActiveConnections;
      
      if (shouldUseUSRP) {
        const usrpStartTime = performance.now();
        try {
          console.log(`📡 No active sockets for floor ${floor.id} - transmitting via USRP`);
          
          // Send ALL routes in one transmission
          const combinedData = {
            routes: routeDoc.routes,
            floorId: floor.id,
            floorName: floor.name,
            emergency,
            overallHazardLevel,
            timestamp: new Date().toISOString(),
            totalRoutes: routeDoc.routes.length
          };
          
          const usrpResult = await sendViaUSRP(combinedData);
          floorTiming.phases.usrp = parseFloat((performance.now() - usrpStartTime).toFixed(2));
          floorTiming.usrpStatus = usrpResult.ok ? 'success' : 'failed';
          
          console.log(`📡 USRP: ${usrpResult.ok ? '✅ SUCCESS' : '❌ FAILED'} (${floorTiming.phases.usrp}ms)`);
        } catch (err) {
          floorTiming.phases.usrp = parseFloat((performance.now() - usrpStartTime).toFixed(2));
          floorTiming.usrpStatus = 'error';
          console.error(`📡 USRP: ❌ ERROR - ${err.message}`);
        }
      } else {
        floorTiming.usrpStatus = 'skipped';
        console.log(`📡 USRP: ⏭️ Skipped (${activeCount} active socket(s))`);
      }

      // ─────────────────────────────────────────────
      // FLOOR TIMING: Record and display metrics
      // ─────────────────────────────────────────────
      floorTiming.totalMs = parseFloat((performance.now() - floorStartTime).toFixed(2));
      cycleTiming.floors.push(floorTiming);
      
      // Detailed floor timing output
      console.log(`\n┌─── 🏢 Floor: ${floor.name} ───`);
      console.log(`│ 📊 Routes: ${routeResults.length} | Hazard: ${overallHazardLevel} | Emergency: ${emergency}`);
      console.log(`│ 📷 Cameras: ${captureCount}/${totalCameras} processed`);
      console.log(`│ ⏱️  Total: ${floorTiming.totalMs}ms`);
      console.log(`│    ├─ RTSP Capture: ${floorTiming.phases.rtspCapture || 0}ms`);
      console.log(`│    ├─ Cloud Upload: ${floorTiming.phases.cloudUpload || 0}ms`);
      console.log(`│    ├─ AI Analysis:  ${floorTiming.phases.aiAnalysis || 0}ms`);
      console.log(`│    ├─ DB Write:     ${floorTiming.phases.dbWrite || 0}ms`);
      console.log(`│    ├─ Graph Build:  ${floorTiming.phases.graphBuild || 0}ms`);
      console.log(`│    ├─ Dijkstra:     ${floorTiming.phases.dijkstra || 0}ms`);
      if (floorTiming.phases.usrp) {
        console.log(`│    └─ USRP TX:      ${floorTiming.phases.usrp}ms (${floorTiming.usrpStatus})`);
      }
      console.log(`└────────────────────────────────\n`);
    }
    
    // ─────────────────────────────────────────────
    // CYCLE SUMMARY: Aggregate statistics
    // ─────────────────────────────────────────────
    cycleTiming.totalMs = parseFloat((performance.now() - cycleStartTime).toFixed(2));
    cycleTiming.floorsProcessed = cycleTiming.floors.length;
    
    // Calculate aggregated stats
    const totalCameras = cycleTiming.floors.reduce((sum, f) => sum + (f.captureCount || 0), 0);
    const totalRoutes = cycleTiming.floors.reduce((sum, f) => sum + (f.dijkstraTiming?.graphStats?.startPoints || 0), 0);
    const totalRtspMs = cycleTiming.floors.reduce((sum, f) => sum + (f.phases.rtspCapture || 0), 0);
    const totalCloudMs = cycleTiming.floors.reduce((sum, f) => sum + (f.phases.cloudUpload || 0), 0);
    const totalAiMs = cycleTiming.floors.reduce((sum, f) => sum + (f.phases.aiAnalysis || 0), 0);
    const totalDijkstraMs = cycleTiming.floors.reduce((sum, f) => sum + (f.phases.dijkstra || 0), 0);
    const totalUsrpMs = cycleTiming.floors.reduce((sum, f) => sum + (f.phases.usrp || 0), 0);
    
    // Display detailed cycle summary
    console.log(`\n╔══════════════════════════════════════════════════╗`);
    console.log(`║         📊 CAPTURE CYCLE SUMMARY                 ║`);
    console.log(`╠══════════════════════════════════════════════════╣`);
    console.log(`║ ⏱️  Total Cycle Time:    ${String(cycleTiming.totalMs).padStart(10)}ms           ║`);
    console.log(`║ 🏢 Floors Processed:     ${String(cycleTiming.floorsProcessed).padStart(10)}              ║`);
    console.log(`║ 📷 Cameras Processed:    ${String(totalCameras).padStart(10)}              ║`);
    console.log(`║ 🛤️  Routes Computed:      ${String(totalRoutes).padStart(10)}              ║`);
    console.log(`╠══════════════════════════════════════════════════╣`);
    console.log(`║ ⏱️  TIME BREAKDOWN                               ║`);
    console.log(`║    DB Query:            ${String(cycleTiming.phases.dbQuery).padStart(10)}ms           ║`);
    console.log(`║    RTSP Capture:        ${String(totalRtspMs.toFixed(2)).padStart(10)}ms           ║`);
    console.log(`║    Cloud Upload:        ${String(totalCloudMs.toFixed(2)).padStart(10)}ms           ║`);
    console.log(`║    AI Analysis:         ${String(totalAiMs.toFixed(2)).padStart(10)}ms           ║`);
    console.log(`║    Dijkstra:            ${String(totalDijkstraMs.toFixed(2)).padStart(10)}ms           ║`);
    if (totalUsrpMs > 0) {
      console.log(`║    USRP Transmission:   ${String(totalUsrpMs.toFixed(2)).padStart(10)}ms           ║`);
    }
    console.log(`╠══════════════════════════════════════════════════╣`);
    if (cycleTiming.floors.length > 0) {
      const avgFloorMs = (cycleTiming.floors.reduce((sum, f) => sum + f.totalMs, 0) / cycleTiming.floors.length).toFixed(2);
      const avgDijkstraMs = (totalDijkstraMs / cycleTiming.floors.length).toFixed(2);
      const avgCameraMs = totalCameras > 0 ? (totalRtspMs / totalCameras).toFixed(2) : '0.00';
      console.log(`║ 📈 AVERAGES                                      ║`);
      console.log(`║    Per Floor:           ${String(avgFloorMs).padStart(10)}ms           ║`);
      console.log(`║    Per Dijkstra:        ${String(avgDijkstraMs).padStart(10)}ms           ║`);
      console.log(`║    Per Camera (RTSP):   ${String(avgCameraMs).padStart(10)}ms           ║`);
    }
    console.log(`╚══════════════════════════════════════════════════╝\n`);
    
  } catch (err) {
    console.error("Capture cycle error:", err.message);
  } finally {
    // Always release the mutex
    cycleInProgress = false;
  }
};

/* ============================================================
 * SCHEDULER INITIALIZATION
 * ============================================================ */

/**
 * Initializes the periodic capture scheduler.
 * 
 * @function initScheduler
 * @returns {void}
 * 
 * @description
 * Starts the capture cycle:
 * 1. Runs initial capture immediately on startup
 * 2. Schedules periodic captures at configured interval
 * 
 * Environment Variables:
 * - CAPTURE_INTERVAL_SEC: Seconds between capture cycles (default: 30)
 */

/** @type {NodeJS.Timeout|null} Reference to the scheduler interval */
let schedulerInterval = null;

export const initScheduler = () => {
  const intervalSec = parseInt(process.env.CAPTURE_INTERVAL_SEC || "30", 10);
  
  // Run initial capture immediately
  captureCycle();
  
  // Schedule periodic captures
  schedulerInterval = setInterval(captureCycle, intervalSec * 1000);
  
  console.log(`Scheduler started: capture every ${intervalSec}s`);
};

/**
 * Stop the scheduler.
 * Called during graceful shutdown.
 * @returns {void}
 */
export const stopScheduler = () => {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log("Scheduler stopped");
  }
};
