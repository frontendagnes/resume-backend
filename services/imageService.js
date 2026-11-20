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

// ============================================================
// SPRAWDZENIE POWIĄZAŃ ZDJĘCIA PRZED USUNIĘCIEM
// ============================================================

export const getImageUsage = async (imageId, userId) => {
  const pool = getPool();

  // Sprawdzamy, czy zdjęcie istnieje i należy do użytkownika.
  const [images] = await pool.execute(
    `SELECT id, image_path
     FROM images
     WHERE id = ? AND user_id = ?`,
    [imageId, userId],
  );

  if (images.length === 0) {
    return null;
  }

  const imagePath = images[0].image_path;

  // Sprawdzamy, czy zdjęcie jest domyślnym zdjęciem użytkownika.
  const [preferences] = await pool.execute(
    `SELECT default_image_id
     FROM user_preferences
     WHERE user_id = ? AND default_image_id = ?`,
    [userId, imageId],
  );

  // Sprawdzamy, czy zdjęcie jest aktualnym avatarem.
  const [users] = await pool.execute(
    `SELECT id
     FROM users
     WHERE id = ? AND avatar_url = ?`,
    [userId, imagePath],
  );

  // Pobieramy CV korzystające z tego zdjęcia.
  const [cvs] = await pool.execute(
    `SELECT id, title
     FROM cvs
     WHERE image_id = ? AND user_id = ?`,
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
      `SELECT image_path
       FROM images
       WHERE id = ? AND user_id = ?
       FOR UPDATE`,
      [imageId, userId],
    );

    if (images.length === 0) {
      await connection.rollback();
      return null;
    }

    const imagePath = images[0].image_path;

    // 2. Ponownie sprawdzamy powiązania wewnątrz transakcji.
    const [preferences] = await connection.execute(
      `SELECT default_image_id
       FROM user_preferences
       WHERE user_id = ? AND default_image_id = ?`,
      [userId, imageId],
    );

    const [users] = await connection.execute(
      `SELECT id
       FROM users
       WHERE id = ? AND avatar_url = ?`,
      [userId, imagePath],
    );

    const [cvs] = await connection.execute(
      `SELECT id, title
       FROM cvs
       WHERE image_id = ? AND user_id = ?`,
      [imageId, userId],
    );

    const wasDefault = preferences.length > 0;
    const wasAvatar = users.length > 0;

    // 3. Usuwamy powiązanie z domyślnym zdjęciem.
    await connection.execute(
      `UPDATE user_preferences
       SET default_image_id = NULL
       WHERE user_id = ? AND default_image_id = ?`,
      [userId, imageId],
    );

    // 4. Czyścimy avatar tylko wtedy, gdy wskazuje
    // dokładnie adres usuwanego zdjęcia.
    await connection.execute(
      `UPDATE users
       SET avatar_url = NULL
       WHERE id = ? AND avatar_url = ?`,
      [userId, imagePath],
    );

    // 5. Usuwamy zdjęcie z galerii.
    // FK ON DELETE SET NULL odłączy je automatycznie od CV.
    const [result] = await connection.execute(
      `DELETE FROM images
       WHERE id = ? AND user_id = ?`,
      [imageId, userId],
    );

    if (result.affectedRows !== 1) {
      throw new Error("Nie udało się usunąć zdjęcia z bazy danych.");
    }

    // 6. Zatwierdzamy wszystkie zmiany.
    await connection.commit();

    return {
      imagePath,
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

// import { getPool } from "../db.js";

// export const addImage = async (userId, imagePath) => {
//   const pool = getPool();
//   const sql = "INSERT INTO images (user_id, image_path) VALUES (?, ?)";
//   const [result] = await pool.execute(sql, [userId, imagePath]);
//   return result || null;
// };

// export const getImageUserId = async (userId) => {
//   const pool = getPool();
//   const sql =
//     "SELECT id, image_path, uploaded_at FROM images WHERE user_id = ? ORDER BY uploaded_at DESC";
//   const [rows] = await pool.execute(sql, [userId]);
//   return rows;
// };

// export const deleteImageFromDb = async (imageId, userId) => {
//   const pool = getPool();
//   const connection = await pool.getConnection();

//   try {
//     await connection.beginTransaction();

//     // 1. Sprawdzamy, czy zdjęcie należy do użytkownika.
//     // Blokada zapobiega równoczesnym zmianom rekordu podczas operacji.
//     const [rows] = await connection.execute(
//       `SELECT image_path
//        FROM images
//        WHERE id = ? AND user_id = ?
//        FOR UPDATE`,
//       [imageId, userId],
//     );

//     if (rows.length === 0) {
//       await connection.rollback();
//       return null;
//     }

//     const imagePath = rows[0].image_path;

//     // 2. Usuwamy powiązanie z domyślnym zdjęciem.
//     // Pozostałe preferencje użytkownika pozostają bez zmian.
//     await connection.execute(
//       `UPDATE user_preferences
//        SET default_image_id = NULL
//        WHERE user_id = ? AND default_image_id = ?`,
//       [userId, imageId],
//     );

//     // 3. Czyścimy avatar tylko wtedy, gdy wskazuje
//     // dokładnie adres usuwanego zdjęcia.
//     await connection.execute(
//       `UPDATE users
//        SET avatar_url = NULL
//        WHERE id = ? AND avatar_url = ?`,
//       [userId, imagePath],
//     );

//     // 4. Usuwamy zdjęcie z galerii.
//     // FK ON DELETE SET NULL odłączy zdjęcie od powiązanych CV.
//     const [result] = await connection.execute(
//       `DELETE FROM images
//        WHERE id = ? AND user_id = ?`,
//       [imageId, userId],
//     );

//     if (result.affectedRows !== 1) {
//       throw new Error("Nie udało się usunąć zdjęcia z bazy danych.");
//     }

//     // 5. Zatwierdzamy wszystkie zmiany.
//     await connection.commit();

//     // Zwracamy ścieżkę, aby kontroler mógł usunąć plik z dysku.
//     return imagePath;
//   } catch (error) {
//     await connection.rollback();
//     throw error;
//   } finally {
//     connection.release();
//   }
// };
