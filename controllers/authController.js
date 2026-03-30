import { getPool } from "../db.js";
import path from "path";
import fs from "fs";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { handleDuplicateEntryError } from "../utils/dbErrorParser.js";
import * as userService from "../services/userService.js";
import * as jwtService from "../services/jwtService.js";
import * as emailService from "../services/emailService.js";

const getGoogleClient = () =>
  new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_SECRET_KEY,
    process.env.FRONTEND_URL,
  );

export const register = async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    await userService.createUser(username, email, password_hash, "buyer");
    emailService.sendRegistrationEmail(
      email,
      username,
      process.env.FRONTEND_URL,
    );

    res.status(201).json({ message: "Rejestracja przebiegła pomyślnie!" });
  } catch (error) {
    if (handleDuplicateEntryError(error, res)) return;
    res.status(500).json({ message: "Błąd serwera podczas rejestracji." });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await userService.findUserByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res
        .status(401)
        .json({ message: "Nieprawidłowy adres e-mail lub hasło" });
    }

    const token = jwtService.generateAuthToken(user);
    res.json({
      message: `Zalogowano pomyślnie ${user.username}!`,
      token,
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    });
  } catch (error) {
    res.status(500).json({ message: "Błąd serwera podczas logowania." });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await userService.findUserPublicDataByEmail(req.userEmail);
    if (!user)
      return res.status(404).json({ message: "Użytkownik nie znaleziony." });
    res.status(200).json({
      message: "Dane użytkownika odzyskane.",
      email: user.email,
      username: user.username,
      avatarUrl: user.avatar_url,
      userId: user.id,
      role: user.role,
    });
  } catch (error) {
    res.status(500).json({ message: "Błąd serwera." });
  }
};

export const googleAuth = async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ message: "Brak kodu." });

  try {
    const client = getGoogleClient();
    const { tokens } = await client.getToken(code);
    const idToken = tokens.id_token;

    if (!idToken) {
      return res.status(401).json({ message: "Google nie zwróciło id_token." });
    }

    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const { email, name: username } = ticket.getPayload();
    let user = await userService.findUserByEmail(email.trim());

    if (!user) {
      await userService.createUser(
        username,
        email.trim(),
        "GOOGLE_AUTHED_HASH",
        "buyer",
      );
      user = await userService.findUserByEmail(email.trim());
    }

    const token = jwtService.generateAuthToken(user);
    res.status(200).json({
      message: `Zalogowano przez Google, ${user.username}`,
      token,
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    });
  } catch (error) {
    console.error("Google auth error:", error);
    return res.status(500).json({ message: "Błąd logowania przez Google." });
  }
};

export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await userService.findUserByEmail(email);
    if (user) {
      const resetToken = jwtService.generateResetToken(user.id);
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
      await emailService.sendResetEmail(email, resetUrl);
    }
    res.status(200).json({
      message:
        "Jeśli użytkownik istnieje, link do resetowania hasła został wysłany na Twój adres e-mail.",
    });
  } catch (error) {
    res.status(500).json({ message: "Błąd serwera." });
  }
};

export const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== "reset")
      return res.status(401).json({ message: "Zły token." });

    const password_hash = await bcrypt.hash(newPassword, 10);
    await userService.updatePassword(decoded.id, password_hash);

    const email = await userService.findUserEmailById(decoded.id);
    if (email)
      await emailService.resetPasswordNotificationEmail(
        email,
        process.env.FRONTEND_URL,
      );

    res.status(200).json({ message: "Hasło zostało zresetowane." });
  } catch (error) {
    const msg =
      error.name === "TokenExpiredError"
        ? "Link resetujący wygasł. Poproś o nowy link."
        : "Nieprawidłowy lub wygasły token.";
    res.status(401).json({ message: msg });
  }
};

export const resetEmail = async (req, res) => {
  const { token, email: newEmail, password } = req.body;

  if (!newEmail || !password || !token) {
    return res.status(400).json({ message: "Wymagany email i hasło." });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await userService.findUserById(decoded.id);

    if (!user) {
      return res.status(404).json({ message: "Użytkownik nie istnieje." });
    }
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Nieprawidłowe hasło." });
    }
    const existingUserWithNewEmail =
      await userService.findUserByEmail(newEmail);

    if (existingUserWithNewEmail) {
      return res
        .status(409)
        .json({ message: "Ten adres e-mail jest już zajęty." });
    }

    await userService.updateEmail(user.id, newEmail);
    const updatedUser = await userService.findUserById(user.id);
    const newToken = jwtService.generateAuthToken(updatedUser);
    return res.status(200).json({
      message: "E-mail został pomyślnie zresetowany.",
      user: updatedUser,
      token: newToken,
    });
  } catch (error) {
    console.error("Błąd resetowania e-maila:", error);
    return res
      .status(500)
      .json({ message: "Błąd serwera podczas resetowania e-maila." });
  }
};

export const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const userId = req.userId;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: "Wymagane stare i nowe hasło" });
  }
  try {
    const user = await userService.findUserById(userId);

    if (!user) {
      return res.status(404).json({ message: "Użytkownik nie znaleziony." });
    }
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password_hash,
    );

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Nieprawidłowe stare hasło." });
    }

    if (currentPassword === newPassword) {
      return res
        .status(400)
        .json({ message: "Nowe hasło musi różnić się od obecnego." });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await userService.updatePassword(user.id, newPasswordHash);

    const updatedUser = await userService.findUserById(userId);
    const newToken = jwtService.generateAuthToken(updatedUser);

    return res.status(200).json({
      message: "Hasło zostało pomyślnie zmienione.",
      user: updatedUser,
      token: newToken,
    });
  } catch (error) {
    console.error("Błąd resetowania hasła:", error);
    return res
      .status(500)
      .json({ message: "Błąd serwera podczas resetowania hasła." });
  }
};

export const refreshToken = async (req, res) => {
  try {
    const user = await userService.findUserById(req.userId);
    if (!user)
      return res
        .status(401)
        .json({ message: "Brak autoryzacji: użytkownik nie istnieje." });
    const newToken = jwtService.generateAuthToken(user);
    res.status(200).json({
      message: "Sesja została pomyślnie przedłużona.",
      token: newToken,
    });
  } catch (error) {
    console.error("Błąd odświeżania tokenu:", error);
    return res
      .status(401)
      .json({ message: "Sesja wygasła. Zaloguj się ponownie." });
  }
};

export const deleteAccount = async (req, res) => {
  const { password } = req.body;
  const userId = req.userId;

  if (!password) {
    return res
      .status(400)
      .json({ message: "Weryfikacja hasła jest wymagana." });
  }

  const connection = await getPool().getConnection();

  try {
    const user = await userService.findUserById(userId);
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      connection.release();
      return res.status(401).json({ message: "Nieprawidłowe hasło." });
    }
    await connection.beginTransaction();

    // 1. Pobieramy zdjęcia ZANIM usuniemy usera
    const imagePaths = await userService.deleteUserWithData(connection, userId);

    await connection.commit();

    // 2. Usuwanie plików z dysku
    if (Array.isArray(imagePaths)) {
      imagePaths.forEach((imageUrl) => {
        // userService zwraca już tablicę stringów dzięki .map()
        try {
          if (!imageUrl) return;

          const fileName = imageUrl.split("/").pop();
          // Budujemy ścieżkę względem pliku server.js
          const localPath = path.resolve("uploads", fileName);

          console.log("Próba usunięcia pliku pod ścieżką:", localPath);

          if (fs.existsSync(localPath)) {
            fs.unlinkSync(localPath);
            console.log("SUKCES: Plik usunięty.");
          } else {
            console.log("BŁĄD: Plik nie istnieje pod wskazaną ścieżką.");
          }
        } catch (fileErr) {
          console.error("Błąd w pętli plików:", fileErr);
        }
      });
    }

    res.status(200).json({ message: "Konto usunięte." });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Błąd kontrolera deleteAccount:", error);
    res.status(500).json({ message: "Błąd serwera.", error: error.message });
  } finally {
    connection.release();
  }
};
