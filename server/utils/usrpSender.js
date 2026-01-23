/**
 * @fileoverview USRP SDR Transmission Utility
 * @description Sends evacuation route data to offline screens via Software Defined Radio (SDR).
 *              Used as a fallback when Socket.IO connections are unavailable.
 * 
 * @requires child_process - For spawning Python USRP script
 * @requires path - Path utilities
 * @requires fs - File system operations
 * @requires dotenv - Environment variable loading
 * 
 * @module utils/usrpSender
 * @author Marcelino Saad
 * @version 1.0.0
 * 
 * @exports sendViaUSRP - Transmits route data via USRP/SDR
 * 
 * @description
 * Architecture Overview:
 * - Backend server always has internet connectivity (via DevTunnels)
 * - USRP/SDR is used ONLY when client screens are offline (no Socket.IO)
 * - Routes are written to results.json with padding for RF transmission
 * - Python script (tx_ofdm.py) handles actual GNU Radio/UHD transmission
 * 
 * Data Flow:
 * ┌─────────────────────────────────────────────────────────────┐
 * │ 1. Route data received from periodicJob                    │
 * │ 2. Create padded results.json (prevents data loss)         │
 * │ 3. Spawn Python script with clean environment              │
 * │ 4. Wait for transmission with timeout protection           │
 * │ 5. Return success/failure status                           │
 * └─────────────────────────────────────────────────────────────┘
 * 
 * Padding Purpose:
 * - RF transmission can lose data at start/end of transmission
 * - Leading padding (80 chars) ensures JSON data is not cut off
 * - Trailing padding (33000 chars) provides buffer for transmission end
 * 
 * Environment Variables:
 * - USRP_PADDING_LENGTH: Leading padding length (default: 80)
 * - USRP_PADDING_LENGTH_EXTRA: Trailing padding length (default: 33000)
 * - USRP_TRANSMISSION_TIMEOUT_MS: Timeout in ms (default: 30000)
 * - USRP_UHD_IMAGES_DIR: UHD images directory (default: /usr/share/uhd/images)
 * - USRP_LD_PRELOAD: Library preload for pthread fix
 * - USRP_TX_DATA_FILE: Output file path (default: ./utils/results.json)
 */

import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

/* ============================================================
 * MODULE PATH RESOLUTION (ES Modules)
 * ============================================================ */

/** @const {string} __filename - Current file path */
const __filename = fileURLToPath(import.meta.url);

/** @const {string} __dirname - Current directory path */
const __dirname = path.dirname(__filename);

/* ============================================================
 * USRP CONFIGURATION
 * ============================================================ */

/** @const {number} USRP_PADDING_LENGTH - Leading padding length (chars) */
const USRP_PADDING_LENGTH = parseInt(process.env.USRP_PADDING_LENGTH || "80", 10);

/** @const {number} USRP_PADDING_LENGTH_EXTRA - Trailing padding length (chars) */
const USRP_PADDING_LENGTH_EXTRA = parseInt(process.env.USRP_PADDING_LENGTH_EXTRA || "33000", 10);

/** @const {number} USRP_TRANSMISSION_TIMEOUT - Timeout in milliseconds */
const USRP_TRANSMISSION_TIMEOUT = parseInt(process.env.USRP_TRANSMISSION_TIMEOUT_MS || "30000", 10);

/** @const {string} USRP_UHD_IMAGES_DIR - UHD firmware images directory */
const USRP_UHD_IMAGES_DIR = process.env.USRP_UHD_IMAGES_DIR || "/usr/share/uhd/images";

/** @const {string} USRP_LD_PRELOAD - Library preload path for pthread fix */
const USRP_LD_PRELOAD = process.env.USRP_LD_PRELOAD || "/usr/lib/x86_64-linux-gnu/libpthread.so.0";

/** @const {string} USRP_TX_DATA_FILE - Path to results.json output file */
const USRP_TX_DATA_FILE = process.env.USRP_TX_DATA_FILE || "./utils/results.json";

/* ============================================================
 * PLATFORM DETECTION
 * ============================================================ */

/** @const {boolean} isWindows - True if running on Windows */
const isWindows = process.platform === 'win32';

/** @const {string} PYTHON_CMD - Python command for current platform */
const PYTHON_CMD = isWindows ? 'python' : 'python3';

/* ============================================================
 * HELPER FUNCTIONS
 * ============================================================ */

/**
 * Creates a padded results.json file for USRP transmission.
 * 
 * @function createPaddedResultsFile
 * @param {Object} routeData - Route data to transmit
 * @returns {string} Absolute path to created results.json file
 * 
 * @description
 * Padding structure:
 * - Leading: 80 '=' characters + newline
 * - Body: Pretty-printed JSON
 * - Trailing: 33000 '=' characters + newline
 * 
 * This ensures the actual JSON data is not lost during RF transmission,
 * as the beginning and end of transmissions can be corrupted.
 */
const createPaddedResultsFile = (routeData) => {
  // Resolve path (relative to project root or absolute)
  const resultsPath = path.isAbsolute(USRP_TX_DATA_FILE) 
    ? USRP_TX_DATA_FILE 
    : path.join(__dirname, "..", USRP_TX_DATA_FILE);
  
  // Build padded content
  const paddingLine = "=".repeat(USRP_PADDING_LENGTH) + "\n";
  const extraPadding = "=".repeat(USRP_PADDING_LENGTH_EXTRA) + "\n";
  const payload = JSON.stringify(routeData, null, 2);
  const paddedContent = paddingLine + payload + "\n" + extraPadding;
  
  // Write to file
  fs.writeFileSync(resultsPath, paddedContent, "utf8");
  
  // Log creation
  const identifier = routeData.floorId || routeData.screenId || 'broadcast';
  console.log(`✓ Created padded results.json (${paddedContent.length} bytes) for ${identifier}`);
  
  return resultsPath;
};

/* ============================================================
 * MAIN TRANSMISSION FUNCTION
 * ============================================================ */

/**
 * Sends route data via USRP/SDR using a Python script.
 * 
 * @async
 * @function sendViaUSRP
 * @param {Object} routeData - Route data to transmit
 * @param {string} routeData.floorId - Floor identifier
 * @param {string} routeData.floorName - Human-readable floor name
 * @param {Array} routeData.routes - Array of computed routes
 * @param {boolean} routeData.emergency - Emergency flag
 * @param {string} routeData.overallHazardLevel - Overall hazard assessment
 * @param {string} [pythonScript=null] - Custom Python script path (optional)
 * 
 * @returns {Promise<Object>} Transmission result
 * @returns {boolean} .ok - True if transmission succeeded
 * @returns {string} .output - Script stdout output
 * 
 * @throws {Error} If Python script fails or times out
 * 
 * @description
 * Process flow:
 * 1. Create padded results.json file
 * 2. Prepare clean environment (remove conflicting libs on Linux)
 * 3. Spawn Python script (tx_ofdm.py)
 * 4. Monitor stdout/stderr for logging
 * 5. Handle timeout (kill process after USRP_TRANSMISSION_TIMEOUT_MS)
 * 6. Return success/failure with cleanup
 * 
 * Environment preparation (Linux):
 * - Removes LD_LIBRARY_PATH (avoids snap library conflicts)
 * - Removes PYTHONPATH (avoids Python path conflicts)
 * - Sets UHD_IMAGES_DIR for USRP firmware
 * - Sets LD_PRELOAD for pthread fix
 * 
 * @example
 * try {
 *   const result = await sendViaUSRP({
 *     floorId: 'floor_1',
 *     routes: [...],
 *     emergency: false
 *   });
 *   console.log(result.ok ? 'Sent!' : 'Failed');
 * } catch (err) {
 *   console.error('USRP error:', err.message);
 * }
 */
export const sendViaUSRP = async (routeData, pythonScript = null) => {
  return new Promise((resolve, reject) => {
    // Default to tx_ofdm.py in same directory
    const scriptPath = pythonScript || path.join(__dirname, "tx_ofdm.py");
    
    // Create padded results.json file
    const resultsPath = createPaddedResultsFile(routeData);
    
    // ─────────────────────────────────────────────
    // ENVIRONMENT PREPARATION
    // Clean environment to avoid library conflicts
    // ─────────────────────────────────────────────
    const cleanEnv = { ...process.env };
    
    if (!isWindows) {
      // Linux-specific: Fix pthread/snap library issues
      // These can interfere with GNURadio/UHD
      delete cleanEnv.LD_LIBRARY_PATH;
      delete cleanEnv.PYTHONPATH;
      cleanEnv.UHD_IMAGES_DIR = USRP_UHD_IMAGES_DIR;
      cleanEnv.LD_PRELOAD = USRP_LD_PRELOAD;
    }
    
    // ─────────────────────────────────────────────
    // SPAWN PYTHON SCRIPT
    // Platform-specific configuration
    // ─────────────────────────────────────────────
    let proc;
    if (isWindows) {
      // Windows: Use shell with quoted path to handle spaces
      const cmd = `${PYTHON_CMD} "${scriptPath}"`;
      proc = spawn(cmd, [], { 
        stdio: ["pipe", "pipe", "pipe"],
        cwd: __dirname,
        env: cleanEnv,
        shell: true
      });
    } else {
      // Linux/macOS: Direct spawn without shell (more secure)
      proc = spawn(PYTHON_CMD, [scriptPath], { 
        stdio: ["pipe", "pipe", "pipe"],
        cwd: __dirname,
        env: cleanEnv,
        shell: false
      });
    }

    // Track output for logging and debugging
    let stdout = "";
    let stderr = "";
    const identifier = routeData.floorId || routeData.screenId || 'broadcast';

    // ─────────────────────────────────────────────
    // OUTPUT HANDLERS
    // ─────────────────────────────────────────────
    proc.stdout.on("data", (d) => { 
      const data = d.toString();
      stdout += data;
      console.log(`[USRP ${identifier}] ${data.trim()}`);
    });
    
    proc.stderr.on("data", (d) => { 
      const data = d.toString();
      stderr += data;
      console.error(`[USRP ${identifier} ERR] ${data.trim()}`);
    });

    // ─────────────────────────────────────────────
    // TIMEOUT PROTECTION
    // Kill process if it takes too long
    // ─────────────────────────────────────────────
    const timeout = setTimeout(() => {
      console.warn(`⚠️ USRP transmission timeout for ${identifier} - killing process`);
      proc.kill("SIGTERM");
      // Force kill after 2 seconds if SIGTERM doesn't work
      setTimeout(() => proc.kill("SIGKILL"), 2000);
    }, USRP_TRANSMISSION_TIMEOUT);

    // ─────────────────────────────────────────────
    // PROCESS COMPLETION HANDLER
    // ─────────────────────────────────────────────
    proc.on("close", (code) => {
      clearTimeout(timeout);
      
      // Ensure process cleanup (belt and suspenders)
      try {
        proc.kill(0); // Check if still running
        proc.kill("SIGKILL"); // Force kill if alive
      } catch (e) {
        // Process already terminated (expected)
      }
      
      if (code === 0) {
        console.log(`✓ USRP transmission successful for ${identifier}`);
        return resolve({ ok: true, output: stdout });
      }
      
      const errorMsg = `USRP TX failed for ${identifier} (exit ${code})`;
      console.error(errorMsg);
      return reject(new Error(errorMsg));
    });

    // ─────────────────────────────────────────────
    // ERROR HANDLER
    // Script spawn failures
    // ─────────────────────────────────────────────
    proc.on("error", (err) => {
      clearTimeout(timeout);
      const errorMsg = `Failed to spawn USRP script: ${err.message}`;
      console.error(errorMsg);
      reject(new Error(errorMsg));
    });
  });
};