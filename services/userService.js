// services/userService.js

// 1. Zmiana składni importu
// Import nazwanego eksportu getPool z dodatkiem rozszerzenia .js
import db from "../db.js";
import { getPool } from "../db.js";

export const findUserEmailById = async (userId) => {
  const pool = getPool();
  // Pobieramy tylko email, aby być oszczędnym
  const query = "SELECT email FROM users WHERE id = ?";
  const [rows] = await pool.execute(query, [userId]);

  // Zwróć adres e-mail lub null/undefined
  return rows.length > 0 ? rows[0].email : null;
};
// 2. Jawny eksport funkcji
export const findUserByEmail = async (email) => {
  // Zmienna 'db' jest teraz domyślnym eksportem z db.js, który zawiera getPool
  const pool = db.getPool();
  const cleanEmail = email.trim();
  const query =
    "SELECT id, username, email, password_hash, role FROM users WHERE email = ?";
  const [rows] = await pool.execute(query, [cleanEmail]);
  // return rows[0]; // Zwraca obiekt użytkownika lub undefined
  return rows.length > 0 ? rows[0] : null;
};
export const findUserById = async (userId) => {
  // Zmienna 'db' jest teraz domyślnym eksportem z db.js, który zawiera getPool
  const pool = db.getPool();
  const query =
    "SELECT id, username, email, password_hash, role FROM users WHERE id = ?";
  const [rows] = await pool.execute(query, [userId]);
  // return rows[0]; // Zwraca obiekt użytkownika lub undefined
  return rows.length > 0 ? rows[0] : null;
};
// 3. Jawny eksport funkcji

export const createUser = async (username, email, password_hash, role) => {
  const connection = await db.getPool().getConnection();
  try {
    await connection.beginTransaction();

    const [uResult] = await connection.execute(
      "INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)",
      [username, email, password_hash, role],
    );

    const newUserId = uResult.insertId;

    const [pResult] = await connection.execute(
      "INSERT INTO personal_data (user_id, first_name, last_name, email, phone, city) VALUES (?, ?, ?, ?, ?, ?)",
      [newUserId, username, "", email, "", ""],
    );
    const personalId = pResult.insertId;

    await connection.execute(
      "INSERT INTO user_preferences (user_id, default_personal_id) VALUES (?, ?)",
      [newUserId, personalId],
    );
    await connection.commit();
    return { success: true };
  } catch (error) {
    await connection.rollback();
    throw error; // Rzuć błąd dalej do kontrolera
  } finally {
    connection.release();
  }
};
// 4. Jawny eksport funkcji
export const findUserPublicDataByEmail = async (email) => {
  const pool = db.getPool(); // Jawnie wybieramy pola: email, username, role (jeśli jest potrzebna)
  const query =
    "SELECT id,email, username, avatar_url, role FROM users WHERE email = ?";
  const [rows] = await pool.execute(query, [email]); // Zwraca obiekt danych użytkownika lub undefined/null, jeśli nie znaleziono

  return rows[0] || null;
};

export const updatePassword = async (userId, password_hash) => {
  const pool = getPool();
  // Zaktualizuj hasło na podstawie ID użytkownika
  const query = "UPDATE users SET password_hash = ? WHERE id = ?";
  await pool.execute(query, [password_hash, userId]);
};

export const updateEmail = async (userId, newEmail) => {
  const pool = getPool();
  // Zaktualizuj email na podstawie ID użytkownika
  const query = "UPDATE users SET email = ? WHERE id = ?";
  await pool.execute(query, [newEmail, userId]);
};

// USUNIĘCIE USERA

export const deleteUserWithData = async (connection, userId) => {
  // 1. NAJPIERW pobieramy nazwy plików, póki jeszcze są w bazie
  const [images] = await connection.execute(
    "SELECT image_path FROM images WHERE user_id = ?",
    [userId],
  );

  console.log("Znalezione ścieżki do usunięcia:", images); // Sprawdź to w konsoli!

  // 2. POTEM usuwamy użytkownika (co wywoła kaskadowe usunięcie z tabeli images w SQL)
  await connection.execute("DELETE FROM users WHERE id = ?", [userId]);

  // Zwracamy listę samych ścieżek
  return images.map((img) => img.image_path);
};

// UPODATE AVATARA
// userService.js
export const updateAvatar = async (userId, imageId) => {
  // Najpierw pobieramy URL zdjęcia z tabeli images, żeby mieć pewność co zapisujemy
  const [image] = await db
    .getPool()
    .execute("SELECT image_path FROM images WHERE id = ? AND user_id = ?", [
      imageId,
      userId,
    ]);

  if (image.length === 0) {
    throw new Error("Zdjęcie nie istnieje lub nie należy do użytkownika.");
  }

  const avatarUrl = image[0].image_path;

  // Aktualizujemy tabelę users
  const query = `UPDATE users SET avatar_url = ? WHERE id = ?`;
  await db.getPool().execute(query, [avatarUrl, userId]);

  return avatarUrl;
};

// export const updateAvatarAndCleanup = async (userId, newAvatarUrl) => {
//   const pool = getPool();

//   // 1. Pobierz URL starego avatara zanim go nadpiszesz
//   const [userRows] = await pool.execute(
//     "SELECT avatar_url FROM users WHERE id = ?",
//     [userId]
//   );
//   const oldAvatarUrl = userRows[0]?.avatar_url;

//   // 2. Zaktualizuj bazę na nowy URL
//   await pool.execute(
//     "UPDATE users SET avatar_url = ? WHERE id = ?",
//     [newAvatarUrl, userId]
//   );

//   // 3. Jeśli był stary avatar i jest inny niż nowy - usuń go z dysku
//   if (oldAvatarUrl && oldAvatarUrl !== newAvatarUrl) {
//     deleteFileFromDisk(oldAvatarUrl);
//   }
// };