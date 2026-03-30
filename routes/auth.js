import express from "express";
import {
  register,
  login,
  getMe,
  googleAuth,
  forgotPassword,
  resetPassword,
  resetEmail,
  refreshToken,
  changePassword,
  deleteAccount
} from "../controllers/authController.js";
import { authLimiter } from "../middleware/rateLimit,js";
import dotenv from "dotenv";
// middleware
import { protect, verifyToken } from "../middleware/auth.js";
import {
  validateRegistration,
  validateLogin,
} from "../middleware/validation.js";
import { setAvatarFromGallery, updateUsersAvatar } from "../controllers/userControler.js";

const router = express.Router();
dotenv.config();

// 1. REJESTRACJA
router.post("/register", authLimiter, validateRegistration, register);

// 2. LOGOWANIE
router.post("/login", authLimiter, validateLogin, login);

// 3. POBIERANIE DANYCH UŻYTKOWNIKA
router.get("/me", protect, getMe);

// 4. LOGOWANIE GOOGLE
router.post("/google", googleAuth);

// 5. ZAPOMNIANE HASŁO
router.post("/forgot-password", authLimiter, forgotPassword);

// 6. RESET HASŁA
router.post("/reset-password", authLimiter, resetPassword);

// 7. ZMIANA EMAIL
router.post("/reset-email", authLimiter, resetEmail);

// 8. ZMIANA HASŁO
router.post("/change-password", authLimiter, verifyToken, changePassword);

// 9. ODŚWIEŻENIE TOKENA
router.post("/refresh-token", verifyToken, refreshToken);

// 10. USÓWANIE KONTA
router.delete("/delete-account", verifyToken, deleteAccount);

// 11. AKTUALIZACJA AVATARA
router.patch("/avatar", verifyToken, updateUsersAvatar);

// 12 USTAWIANIE AVATARA NA DOMYŚLNY
router.post("/set-avatar", verifyToken, setAvatarFromGallery)

export default router;
