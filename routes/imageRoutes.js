// routes/imageRoutes.js
import express from "express";
import {
  uploadImage,
  getUserImages,
  deleteImage,
} from "../controllers/imageContoller.js";
import { verifyToken } from "../middleware/auth.js";
import { upload } from "../middleware/multerConfig.js";

const router = express.Router();

// 1. DODAWNIE ZDJĘĆ
router.post("/upload", verifyToken, upload.single("image"), uploadImage);

// 2. POBIERANIE ZDJĘĆ
router.get("/user-images", verifyToken, getUserImages);

// 3. USÓWANIE ZDJĘĆ
router.delete("/delete/:id", verifyToken, deleteImage);

export default router;
