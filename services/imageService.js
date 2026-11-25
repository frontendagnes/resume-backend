// backend/services/imageService.js

import { getPool } from "../db.js";

// ============================================================
// DODAWANIE ZDJĘCIA
// ============================================================

export const addImage = async (
  userId,
  imagePath,
  cloudinaryPublicId = null,
) => {
  const pool = getPool();

  const sql = `
    INSERT INTO images (user_id, image_path, cloudinary_public_id)
    VALUES (?, ?, ?)
  `;

  const [result] = await pool.execute(sql, [
    userId,
    imagePath,
    cloudinaryPublicId,
  ]);

  return result || null;
};

// ============================================================
// POBIERANIE ZDJĘĆ UŻYTKOWNIKA
// ============================================================

export const getImageUserId = async (userId) => {
  const pool = getPool();

  const sql = `
    SELECT id, image_path, uploaded_at
    FROM images
    WHERE user_id = ?
    ORDER BY uploaded_at DESC
  `;

  const [rows] = await pool.execute(sql, [userId]);

  return rows;
};

// ============================================================
// SPRAWDZENIE POWIĄZAŃ ZDJĘCIA PRZED USUNIĘCIEM
// ============================================================

export const getImageUsage = async (imageId, userId) => {
  const pool = getPool();

  const [images] = await pool.execute(
    `
      SELECT id, image_path
      FROM images
      WHERE id = ? AND user_id = ?
    `,
    [imageId, userId],
  );

  if (images.length === 0) {
    return null;
  }

  const imagePath = images[0].image_path;

  const [preferences] = await pool.execute(
    `
      SELECT default_image_id
      FROM user_preferences
      WHERE user_id = ? AND default_image_id = ?
    `,
    [userId, imageId],
  );

  const [users] = await pool.execute(
    `
      SELECT id
      FROM users
      WHERE id = ? AND avatar_url = ?
    `,
    [userId, imagePath],
  );

  const [cvs] = await pool.execute(
    `
      SELECT id, title
      FROM cvs
      WHERE image_id = ? AND user_id = ?
    `,
    [imageId, userId],
  );

  return {
    imagePath,
    isDefault: preferences.length > 0,
    isAvatar: users.length > 0,
    cvs,
  };
};

// ============================================================
// USUWANIE ZDJĘCIA Z BAZY DANYCH
// ============================================================

export const deleteImageFromDb = async (imageId, userId) => {
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Sprawdzamy, czy zdjęcie należy do użytkownika.
    const [images] = await connection.execute(
      `
        SELECT image_path, cloudinary_public_id
        FROM images
        WHERE id = ? AND user_id = ?
        FOR UPDATE
      `,
      [imageId, userId],
    );

    if (images.length === 0) {
      await connection.rollback();
      return null;
    }

    const imagePath = images[0].image_path;
    const cloudinaryPublicId = images[0].cloudinary_public_id;

    // 2. Sprawdzamy powiązania zdjęcia.
    const [preferences] = await connection.execute(
      `
        SELECT default_image_id
        FROM user_preferences
        WHERE user_id = ? AND default_image_id = ?
      `,
      [userId, imageId],
    );

    const [users] = await connection.execute(
      `
        SELECT id
        FROM users
        WHERE id = ? AND avatar_url = ?
      `,
      [userId, imagePath],
    );

    const [cvs] = await connection.execute(
      `
        SELECT id, title
        FROM cvs
        WHERE image_id = ? AND user_id = ?
      `,
      [imageId, userId],
    );

    const wasDefault = preferences.length > 0;
    const wasAvatar = users.length > 0;

    // 3. Usuwamy powiązanie z domyślnym zdjęciem.
    await connection.execute(
      `
        UPDATE user_preferences
        SET default_image_id = NULL
        WHERE user_id = ? AND default_image_id = ?
      `,
      [userId, imageId],
    );

    // 4. Czyścimy avatar, jeśli wskazuje usuwane zdjęcie.
    await connection.execute(
      `
        UPDATE users
        SET avatar_url = NULL
        WHERE id = ? AND avatar_url = ?
      `,
      [userId, imagePath],
    );

    // 5. Usuwamy zdjęcie z galerii.
    // FK ON DELETE SET NULL odłączy je od CV.
    const [result] = await connection.execute(
      `
        DELETE FROM images
        WHERE id = ? AND user_id = ?
      `,
      [imageId, userId],
    );

    if (result.affectedRows !== 1) {
      throw new Error("Nie udało się usunąć zdjęcia z bazy danych.");
    }

    // 6. Zatwierdzamy zmiany.
    await connection.commit();

    return {
      imagePath,
      cloudinaryPublicId,
      wasDefault,
      wasAvatar,
      affectedCVs: cvs,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};