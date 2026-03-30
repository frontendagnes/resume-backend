import path from "path";
import fs from "fs";
import { deleteFileFromDisk } from "../utils/fileHelper.js";
import * as imageService from "../services/imageService.js";

export const uploadImage = async (req, res) => {
  try {
    const userId = req.userId;
    if (!req.file) {
      return res.status(400).json({ message: "Nie przesłano pliku." });
    }

    // Budujemy URL dostępny z zewnątrz
    const imageUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;

    // Zapis do bazy
    const result = await imageService.addImage(userId, imageUrl);

    res.status(200).json({
      message: "Zdjęcie zapisane!",
      imageId: result.insertId,
      url: imageUrl,
    });
  } catch (error) {
    // Jeśli baza padnie, usuwamy fizyczny plik, który Multer już zdążył zapisać
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err)
          console.error("Błąd podczas usuwania osieroconego pliku:", err);
      });
    }
    res.status(500).json({ message: "Błąd serwera.", error: error.message });
  }
};

export const getUserImages = async (req, res) => {
  try {
    const rows = await imageService.getImageUserId(req.userId);
    res.status(200).json(rows);
  } catch (error) {
    res.status(500).json({ message: "Błąd pobierania zdjęć." });
  }
};

export const deleteImage = async (req, res) => {
  try {
    const imageId = req.params.id;
    const userId = req.userId;

    // Serwis powinien zwrócić URL, żebyśmy wiedzieli co usunąć z dysku
    const imageUrl = await imageService.deleteImageFromDb(imageId, userId);

    if (!imageUrl) {
      return res
        .status(404)
        .json({ message: "Nie znaleziono zdjęcia lub brak uprawnień." });
    }

    deleteFileFromDisk(imageUrl);

    res.status(200).json({ message: "Zdjęcie usunięte z bazy i z dysku." });
  } catch (error) {
    console.error("Delete Image Error:", error);
    res.status(500).json({ message: "Błąd usuwania." });
  }
};
