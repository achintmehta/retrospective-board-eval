// @ts-nocheck

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Handle __dirname for CommonJS context (globals are automatically available)
const dbPath = path.join(__dirname, '../../data/retro.db');

// Ensure data directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize database with WAL mode for better concurrency
const db = new Database(dbPath, {
  verbose: console.log,
});

// Enable foreign keys
db.pragma('foreign_keys = ON');

module.exports = db;
