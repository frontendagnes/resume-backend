import express from "express";

import {
  generateUploadSignature,
  uploadImage,
  getUserImages,
  getImageUsage,
  deleteImage,
} from "../controllers/imageContoller.js";

import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

// 1. GENEROWANIE PODPISU CLOUDINARY
router.post("/upload-signature", verifyToken, generateUploadSignature);

// 2. ZAPISYWANIE ZDJĘCIA W BAZIE PO UPLOADZIE DO CLOUDINARY
router.post("/upload", verifyToken, uploadImage);

// 3. POBIERANIE ZDJĘĆ
router.get("/user-images", verifyToken, getUserImages);

// 4. SPRAWDZANIE POWIĄZAŃ ZDJĘCIA
router.get("/usage/:id", verifyToken, getImageUsage);

// 5. USUWANIE ZDJĘĆ
router.delete("/delete/:id", verifyToken, deleteImage);

export default router;
