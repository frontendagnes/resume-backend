// services/jwtService.js

// 1. Zmiana składni importu
import jwt from "jsonwebtoken";
// 2. Import nazwanego eksportu JWT_SECRET z dodatkiem rozszerzenia .js
import { JWT_SECRET } from "../utils/auth.js";

const TOKEN_EXPIRATION = "2h";
const RESET_TOKEN_EXPIRATION = "15m";

export const generateResetToken = (userId) => {
  // Używamy tego samego sekretu, co dla tokena autoryzacji
  return jwt.sign(
    { id: userId, type: "reset" }, // Dodaje 'type', aby odróżnić go od tokena autoryzacji
    JWT_SECRET,
    { expiresIn: RESET_TOKEN_EXPIRATION },
  );
};
// Funkcja przyjmuje obiekt użytkownika i zwraca token
// 3. Jawny, nazwany eksport funkcji
export const generateAuthToken = (user) => {
  // Dane, które trafią do payloadu tokena
  const payload = {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
  }; // Generowanie tokena

  const token = jwt.sign(
    payload,
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRATION }, // Czas ważności tokena
  );

  return token;
};
