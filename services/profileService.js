import { getPool } from "../db.js";

// Pobieranie profilu użytkownika
export const getProfile = async (userId) => {
  const [rows] = await getPool().execute(
    "SELECT * FROM user_profiles WHERE user_id = ?",
    [userId]
  );
  return rows[0] || {};
};

// Zapis/Edycja profilu (stale dane)
export const upsertProfile = async (userId, data) => {
  const { first_name, last_name, email, phone, city, summary } = data;
  const sql = `
        INSERT INTO user_profiles (user_id, first_name, last_name, email, phone, city, summary)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            first_name=VALUES(first_name), last_name=VALUES(last_name),
            email=VALUES(email), phone=VALUES(phone), city=VALUES(city), summary=VALUES(summary)`;
  return await getPool().execute(sql, [
    userId,
    first_name,
    last_name,
    email,
    phone,
    city,
    summary,
  ]);
};

// Powiązanie zdjęcia z galerii z konkretnym CV
export const linkImageToCv = async (cvId, imageId, userId) => {
  const pool = getPool();
  // Najpierw czyścimy stare powiązanie dla tego CV
  await pool.execute(
    "UPDATE images SET cv_id = NULL WHERE cv_id = ? AND user_id = ?",
    [cvId, userId]
  );
  // Potem ustawiamy nowe
  return await pool.execute(
    "UPDATE images SET cv_id = ? WHERE id = ? AND user_id = ?",
    [cvId, imageId, userId]
  );
};
