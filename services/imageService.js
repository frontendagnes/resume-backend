import { getPool } from "../db.js";

export const addImage = async (userId, imagePath) => {
  const pool = getPool();
  const sql = "INSERT INTO images (user_id, image_path) VALUES (?, ?)";
  const [result] = await pool.execute(sql, [userId, imagePath]);
  return result || null;
};

export const getImageUserId = async (userId) => {
  const pool = getPool();
  const sql =
    "SELECT id, image_path, uploaded_at FROM images WHERE user_id = ? ORDER BY uploaded_at DESC";
  const [rows] = await pool.execute(sql, [userId]);
  return rows;
};

// services/imageService.js
export const deleteImageFromDb = async (imageId, userId) => {
  const pool = getPool();

  // 1. Najpierw pobieramy ścieżkę, żeby wiedzieć co usunąć z dysku
  const [rows] = await pool.execute(
    "SELECT image_path FROM images WHERE id = ? AND user_id = ?",
    [imageId, userId]
  );

  if (rows.length === 0) return null;

  const filePath = rows[0].image_path;

  // 2. Usuwamy rekord z bazy
  await pool.execute("DELETE FROM images WHERE id = ?", [imageId]);

  return filePath;
};