// userController.js
import * as userService from "../services/userService.js";
import db from "../db.js";

export const updateUsersAvatar = async (req, res) => {
  try {
    const { imageId } = req.body; // Odbieramy ID zdjęcia z frontendu

    if (!imageId) {
      return res.status(400).json({ message: "Nie podano ID zdjęcia." });
    }

    const newAvatarUrl = await userService.updateAvatar(req.userId, imageId);

    res.status(200).json({
      message: "Avatar został zaktualizowany.",
      avatarUrl: newAvatarUrl,
    });
  } catch (error) {
    console.error("Błąd aktualizacji avatara:", error);
    res
      .status(500)
      .json({ message: "Błąd serwera podczas aktualizacji avatara." });
  }
};

export const setAvatarFromGallery = async (req, res) => {
  try {
    const { imageId } = req.body;
    const userId = req.userId;

    // 1. Pobierz URL zdjęcia z galerii
    const [image] = await db.getPool().execute(
      "SELECT image_path FROM images WHERE id = ? AND user_id = ?",
      [imageId, userId]
    );

    if (image.length === 0) {
      return res.status(404).json({ message: "Nie znaleziono zdjęcia w Twojej galerii." });
    }

    const newAvatarUrl = image[0].image_path;

    // 2. Zaktualizuj avatar_url w tabeli users
    await db.getPool().execute(
      "UPDATE users SET avatar_url = ? WHERE id = ?",
      [newAvatarUrl, userId]
    );

    res.status(200).json({
      message: "Avatar zaktualizowany!",
      avatarUrl: newAvatarUrl
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Błąd serwera." });
  }
};