import express from "express";
import {
  getUserPreferences,
  updatePersonalDefault,
  clearDefault,
  updateImageDefault,
} from "../controllers/preferenceController.js";
// middleware
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

// 1. POBIERA DOMYSLNE USTAWIENIA
router.get("/", verifyToken, getUserPreferences);

// 2. AKTUALIZUJE DOMYSLNE USTAWIENIA
router.post("/personal", verifyToken, updatePersonalDefault);

// 3. USÓWA DOMYSLNE USTAWIENIA
router.delete("/:type", verifyToken, clearDefault);

//4. AKTUALZIACJA ZDJĘCIA DOMYŚLNEGO
router.post("/image", verifyToken, updateImageDefault);

export default router;
