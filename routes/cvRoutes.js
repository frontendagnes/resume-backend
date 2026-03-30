import express from "express";
import { verifyToken } from "../middleware/auth.js";
import {
  saveCv,
  listCvs,
  deleteCv,
  getFullCv,
  duplicateCv,
} from "../controllers/cvController.js";

const router = express.Router();

// ZAPIS CV
router.post("/save-cv", verifyToken, saveCv);
// LISTA CV
router.get("/cv-list", verifyToken, listCvs);
// USUWANIE CV
router.delete("/:id", verifyToken, deleteCv);
//PEŁENE CV
router.get("/cv-full/:id", verifyToken, getFullCv);
// KOPIOWNIE CV
router.post("/duplicate/:id", verifyToken, duplicateCv);

export default router;
