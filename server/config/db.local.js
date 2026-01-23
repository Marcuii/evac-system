/**
 * @fileoverview MongoDB Database Connection
 * @description Establishes and manages connection to local MongoDB database.
 *              Handles connection errors and graceful shutdown.
 * 
 * @requires mongoose - MongoDB ODM for Node.js
 * 
 * @env {string} LOCAL_MONGO_URI - MongoDB connection string
 *                                 Format: mongodb://host:port/database_name
 *                                 Default: mongodb://127.0.0.1:27017/evac_local
 * 
 * @example
 * // Usage in server.js:
 * import connectDB from './config/db.local.js';
 * await connectDB();
 * 
 * @module config/database
 * @author Marcelino Saad
 * @version 1.0.0
 */

import mongoose from "mongoose";

/**
 * Connects to MongoDB database using Mongoose.
 * 
 * @async
 * @function connectDB
 * @returns {Promise<void>} Resolves when connection is established
 * @throws {Error} Exits process with code 1 if connection fails
 * 
 * @description
 * - Reads connection URI from environment variables
 * - Establishes connection with default Mongoose settings
 * - Logs success message on successful connection
 * - Terminates application on connection failure (critical dependency)
 */
const connectDB = async () => {
  try {
    const uri = process.env.LOCAL_MONGO_URI;
    await mongoose.connect(uri);
    console.log("🟢 Connected to local MongoDB");
  } catch (err) {
    console.error("MongoDB connect error:", err);
    process.exit(1); // Exit with failure code - DB is required
  }
};

export default connectDB;
