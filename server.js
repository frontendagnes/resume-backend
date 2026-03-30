// server.js

// 1. Zmiana składni importu
import express from "express";
import cors from "cors";

// Pamiętaj o dodaniu rozszerzenia .js do importów lokalnych
import db from "./db.js";
import authRoutes from "./routes/auth.js";
import cvRoutes from "./routes/cvRoutes.js";
import imageRoutes from "./routes/imageRoutes.js";
import personalRoutes from "./routes/personalRoutes.js";
import preferencesRoute from "./routes/preferencesRoute.js";
// Moduł 'fs/promises' wymaga jawnego importu, nawet jeśli jest używany w CommonJS
import fs from "fs/promises";
import * as dotenv from "dotenv";
dotenv.config();
const app = express();
const PORT = 5000;

app.use(
  cors({
    origin: "http://localhost:3500",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
  }),
);

app.use(express.json());

// ====================================================================
// ROUTY KONFIGURACJI (Dostępne tylko, gdy brak config.json)
// ====================================================================

app.get("/api/status", async (req, res) => {
  try {
    const configured = await db.isConfigured();
    res.json({
      status: configured ? "READY" : "SETUP_REQUIRED",
      message: configured
        ? "Serwer jest połączony z bazą danych."
        : `Wymagana konfiguracja bazy danych. Proszę użyć endpointu /api/setup.`,
    });
  } catch (error) {
    console.error("Błąd odczytu konfiguracji:", error);
    res.status(500).json({ status: "ERROR", message: "Błąd serwera." });
  }
});

app.post("/api/setup", async (req, res) => {
  const configData = req.body; // Prosta walidacja

  if (
    !configData.host ||
    String(configData.host).trim() === "" ||
    !configData.user ||
    String(configData.user).trim() === "" ||
    !configData.database ||
    String(configData.database).trim() === ""
  ) {
    return res.status(400).json({
      message:
        "Wymagane pola: host (adres serwera np. localhost), user (nazwa użytkownika), database(nazwa bazy danych).",
    });
  }

  try {
    // 1. Zapisz konfigurację do pliku
    await db.saveConfig(configData);
    console.log(`✅ Otrzymano konfigurację. Zapisano do ${db.CONFIG_FILE}.`); // 2. NATYCHMIAST zainicjuj połączenie z bazą

    await db.initializeDbConnection(configData); // 3. Po pomyślnym połączeniu utwórz domyślnego administratora (pozostawiam zakomentowane)

    res.status(200).json({
      status: "SUCCESS",
      message:
        "Konfiguracja zakończona pomyślnie. Serwer połączony z bazą danych.",
    });
  } catch (error) {
    // Zmiana: Używamy zaimportowanego 'fs' zamiast inline 'require("fs/promises")'
    await fs.unlink(db.CONFIG_FILE).catch(() => {});
    console.error("❌ Błąd konfiguracji/połączenia:", error.message);
    res.status(500).json({
      status: "ERROR",
      message: `Błąd podczas łączenia z bazą: ${error.message}`,
    });
  }
});

// ====================================================================
// GŁÓWNA FUNKCJA STARTUJĄCA SERWER
// ====================================================================

async function startServer() {
  // Spróbuj połączyć się z bazą przy starcie, jeśli config istnieje
  await db.initializeDbConnection().catch(() => {
    console.log(
      "Serwer uruchomiony w trybie oczekiwania na konfigurację bazy danych.",
    );
  }); // Użycie routów

  app.use("/api/auth", authRoutes); // Logowanie/Rejestracja
  app.use("/api", cvRoutes);
  app.use("/api/images", imageRoutes); // Wszystkie ruty obrazów będą pod /api/images/...
  app.use("/api/preferences", preferencesRoute);
  app.use("/uploads", express.static("uploads"));
  app.use("/api/personal", personalRoutes);

  app.listen(PORT, () => {
    console.log(`🌐 Serwer Express.js działa na porcie ${PORT}`);
  });
}

// Uruchomienie głównej funkcji
startServer();
