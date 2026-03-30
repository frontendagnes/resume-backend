import express from "express";
import {
  savePersonalData,
  getPersonalData,
  updatePersonalData,
  deletePersonalData,
} from "../controllers/personalController.js";
;
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

// 1. ZAPISZ DANE OSOBOWE
router.post("/save-personal", verifyToken, savePersonalData);

// 2. POBIERZ DANE OSOBOWE
router.get("/personal-data", verifyToken, getPersonalData);

// 3 AKTUALIZUJ DANE OSOBOWE
router.put("/personal-data/:id", verifyToken, updatePersonalData);

// 4. USUN DANE OSOBOWE
router.delete("/delete-personal/:id", verifyToken, deletePersonalData);

export default router;
