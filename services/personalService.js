import { getPool } from "../db.js";

export const getPersonalData = async (userId) => {
  const pool = getPool();

  const query = `
    SELECT id, first_name, last_name, email, phone, city
    FROM personal_data
    WHERE user_id = ?
  `;

  const [rows] = await pool.execute(query, [userId]);

  return rows; // tablica
};

export const createPersonalData = async (
  userId,
  firstName,
  lastName,
  email,
  phone,
  city,
) => {
  const pool = getPool();
  const query =
    "INSERT INTO personal_data (user_id, first_name, last_name, email, phone, city) VALUES (?, ?, ?, ?,?,?)"; // Używamy execute, ale nie musimy zwracać wyników dla INSERT

  await pool.execute(query, [userId, firstName, lastName, email, phone, city]); // Można opcjonalnie zwrócić status sukcesu lub id utworzonego użytkownika

  return { success: true };
};

export const deletePersonalData = async (personalDataId, userId) => {
  const pool = getPool();
  const sql = "DELETE FROM personal_data WHERE id = ? AND user_id = ?";

  const [result] = await pool.execute(sql, [personalDataId, userId]); // ✅ przypisz wynik

  if (result.affectedRows === 0) {
    throw new Error("Brak uprawnień lub dane nie istnieją");
  }

  return true;
};
export const updatePersonalData = async (
  personalId,
  userId,
  firstName,
  lastName,
  email,
  phone,
  city,
) => {
  const pool = getPool();

  try {
    const sql = `
      UPDATE personal_data
      SET first_name = ?, last_name = ?, email = ?, phone = ?, city = ?
      WHERE id = ? AND user_id = ?
    `;

    const [result] = await pool.execute(sql, [
      firstName,
      lastName,
      email,
      phone,
      city,
      personalId,
      userId,
    ]);

    if (result.affectedRows === 0) {
      throw new Error("NOT_FOUND_OR_NO_ACCESS");
    }
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      throw new Error("DUPLICATE_PERSONAL_DATA");
    }
    throw error;
  }
};
