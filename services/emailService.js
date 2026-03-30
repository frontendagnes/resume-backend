// services/emailService.js

// 1. Zmiana składni importu
import nodemailer from "nodemailer";
import handlebars from "handlebars";
import fs from "fs"; // Zostawiamy synchroniczny fs, jest tu użyty readFileSync
import path from "path";
import dotenv from "dotenv"; // Zamiast require("dotenv").config
import { fileURLToPath } from "url"; // Do definiowania __dirname

// === 2. Definicja __filename i __dirname w ES Modules ===
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// =======================================================

// Zmiana: Zamiast require("dotenv").config, używamy zaimportowanego dotenv
dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const USER = process.env.EMAIL_ADMIN;
const PASS = process.env.EMAIL_PASSWORD;

// 1. Inicjalizacja Transportera (wykonywana raz)
const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: USER,
    pass: PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

// 2. Funkcja do kompilacji szablonu Handlebars
const compileTemplate = (templateName, data) => {
  // Używamy teraz zdefiniowanego __dirname
  const templatePath = path.join(
    __dirname,
    "..",
    "email_templates",
    `${templateName}.hbs`
  );

  // Używamy synchronicznego fs (readFileSync)
  const source = fs.readFileSync(templatePath, "utf-8");
  const template = handlebars.compile(source);
  return template(data);
};

// 3. Główna funkcja wysyłania e-maila
// 4. Jawny eksport funkcji
export const sendRegistrationEmail = async (email, username, loginUrl) => {
  try {
    const htmlContent = compileTemplate("registration", {
      username,
      email,
      loginUrl,
    });

    const mailOptions = {
      from: USER,
      to: email,
      subject:
        "Witaj w aplikacji Curriculum Vitea! - Potwierdzenie rejestracji",
      html: htmlContent,
    };

    await transporter.sendMail(mailOptions);
    console.log(`E-mail rejestracyjny wysłany do: ${email}`);
    return { success: true };
  } catch (error) {
    console.error("Błąd wysyłania e-maila:", error);
    return { success: false, error: error.message };
  }
};

export const sendResetEmail = async (email, resetUrl) => {
  try {
    const htmlContent = compileTemplate("resetPassword", {
      email,
      resetUrl,
    });

    const mailOptions = {
      from: USER,
      to: email,
      subject: "Twój link do resetu hasła - Curriculum Vitea ",
      html: htmlContent,
    };

    await transporter.sendMail(mailOptions);
    console.log(`E-mail resetujacy hasło został wysłany na adres: ${email}`);
    return { success: true };
  } catch (error) {
    console.error("Błąd wysyłania e-maila resetyjącego hasło:", error);
    return { success: false, error: error.message };
  }
};

export const resetPasswordNotificationEmail = async (email, loginUrl) => {
  try {
    const htmlContent = compileTemplate("resetInfo", {
      loginUrl,
    });
    const mailOptions = {
      from: USER,
      to: email,
      subject: "Twoje hasło zostało zresetowane - Curriculum Vitea",
      html: htmlContent,
    };

    await transporter.sendMail(mailOptions);
    console.log(`E-mail resetujacy hasło został wysłany na adres: ${email}`);
    return { success: true };
  } catch (error) {
    console.error("Błąd wysyłania e-maila resetyjącego hasło:", error);
    return { success: false, error: error.message };
  }
};
