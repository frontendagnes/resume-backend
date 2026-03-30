import db from "../db.js";

export const getPreferencesByUserId = async (userId) => {
  const [rows] = await db.getPool().execute(
    `SELECT
        p.user_id,
        p.default_personal_id,
        p.default_image_id,
        pd.first_name,
        pd.last_name,
        pd.email,
        pd.phone,
        pd.city,
        i.image_path AS default_image_url
     FROM user_preferences p
     LEFT JOIN personal_data pd ON p.default_personal_id = pd.id
     LEFT JOIN images i ON p.default_image_id = i.id
     WHERE p.user_id = ?`,
    [userId],
  );
  return rows[0] || null;
};

export const updatePreferences = async (userId, data) => {
  const { personalId, imageId } = data;

  // Budujemy dynamiczne zapytanie, żeby móc zaktualizować tylko jedną rzecz na raz
  const query = `
      INSERT INTO user_preferences (user_id, default_personal_id, default_image_id)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE
        default_personal_id = IFNULL(VALUES(default_personal_id), default_personal_id),
        default_image_id = IFNULL(VALUES(default_image_id), default_image_id)
    `;

  const [result] = await db
    .getPool()
    .execute(query, [userId, personalId || null, imageId || null]);
  return result;
};

export const removeDefault = async (userId, type) => {
  const column =
    type === "personal" ? "default_personal_id" : "default_image_id";
  const query = `UPDATE user_preferences SET ${column} = NULL WHERE user_id = ?`;
  return await db.getPool().execute(query, [userId]);
};