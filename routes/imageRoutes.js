import express from "express";
import {
  uploadImage,
  getUserImages,
  getImageUsage,
  deleteImage,
} from "../controllers/imageContoller.js";

import { verifyToken } from "../middleware/auth.js";
import { upload } from "../middleware/multerConfig.js";

const router = express.Router();


// 1. DODAWANIE ZDJĘĆ
router.post("/upload", verifyToken, upload.single("image"), uploadImage);

// 2. POBIERANIE ZDJĘĆ
router.get("/user-images", verifyToken, getUserImages);

// 3. SPRAWDZANIE POWIĄZAŃ ZDJĘCIA
router.get("/usage/:id", verifyToken, getImageUsage);

// 4. USUWANIE ZDJĘĆ
router.delete("/delete/:id", verifyToken, deleteImage);

export default router;
