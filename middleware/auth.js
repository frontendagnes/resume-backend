// middleware/auth.js

// 1. Zmiana składni importu zewnętrznego
import jwt from "jsonwebtoken";

// 2. Import JWT_SECRET z pliku utils/auth.js z rozszerzeniem .js
import { JWT_SECRET } from "../utils/auth.js";

/**
 * Middleware do ochrony routów. Weryfikuje token JWT.
 */
// 3. Jawny eksport funkcji (używana w routach jako 'protect')
export const protect = (req, res, next) => {
  let token; // 1. Sprawdź, czy token jest w nagłówku 'Authorization'

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      // Token jest w formacie: Bearer <token_string>
      token = req.headers.authorization?.split(" ")[1]; // 2. Weryfikacja tokenu // Używamy zaimportowanego JWT_SECRET

      const decoded = jwt.verify(token, JWT_SECRET); // 3. Dodanie danych użytkownika (np. email) do obiektu żądania (req)

      req.userEmail = decoded.email;

      next();
    } catch (error) {
      console.error("Błąd weryfikacji tokenu:", error);
      return res
        .status(401)
        .json({ message: "Brak autoryzacji: nieprawidłowy token." });
    }
  }

  if (!token) {
    return res.status(401).json({ message: "Brak autoryzacji: brak tokenu." });
  }
};

export const verifyToken = (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, JWT_SECRET);

      // 💡 Dodajemy tylko ID użytkownika do żądania
      req.userId = decoded.id;

      next();
    } catch (error) {
      console.error("Błąd weryfikacji tokenu:", error);
      return res
        .status(401)
        .json({ message: "Brak autoryzacji: nieprawidłowy token." });
    }
  } else {
    return res
      .status(401)
      .json({ message: "Brak autoryzacji: brak tokenu w nagłówku." });
  }
};