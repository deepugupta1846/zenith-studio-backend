import express from "express";
import {
  createBackup,
  getBackupStats,
  downloadBackup,
  deleteBackup
} from "../controllers/backupController.js";

const router = express.Router();

// Create a new backup
router.post("/create", createBackup);

// Get backup statistics and list
router.get("/stats", getBackupStats);

// Download a specific backup file
router.get("/download/:filename", downloadBackup);

// Delete a specific backup file
router.delete("/delete/:filename", deleteBackup);

export default router;



