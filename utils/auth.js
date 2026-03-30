// utils/auth.js

// 1. Zmiana składni importu
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();
// 2. Jawny eksport stałej
export const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error(
    "BŁĄD: JWT_SECRET nie jest ustawiony w ENV. UŻYWANIE domyślnego klucza jest NIEBEZPIECZNE!"
  );
  // Możesz tu wymusić zatrzymanie aplikacji: process.exit(1);
}
/**
 * Middleware do weryfikacji tokena JWT.
 */
// 3. Jawny eksport funkcji
export function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (token == null) {
    return res.status(401).json({ message: "Wymagana autoryzacja." });
  }

  // Używamy JWT_SECRET z eksportu
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res
        .status(403)
        .json({ message: "Token jest nieprawidłowy lub wygasł." });
    }
    req.user = user; // { id, username, role }
    next();
  });
}

/**
 * Middleware do sprawdzania, czy użytkownik ma wymaganą rolę.
 * @param {Array<string>} roles - Tablica ról dozwolonych.
 */
// 4. Jawny eksport funkcji
export function authorizeRole(roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ message: "Brak wystarczających uprawnień." });
    }
    next();
  };
}