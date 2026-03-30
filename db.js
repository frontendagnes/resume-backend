import fs from "fs/promises";
import mysql from "mysql2/promise";
import {
  createCVsTableSQL,
  createPersonalDataTableSQL,
  createSkillsTableSQL,
  createTableCVSkillsSQL,
  createTableCoursesSQL,
  createTableCoursesSkillsSQL,
  createTableEducationSQL,
  createTableEducationSkillsSQL,
  createTableExperienceSQL,
  createTableExperienceSkillsSQL,
  createTableImagesSQL,
  createUsersTableSQL,
  createTableUserPreferences,
  createTableLinksSQL,
  createTableLanguageSQL,
} from "./sql/createTables.js";
// Używamy export const dla zmiennej, która ma być dostępna w innych plikach
export const CONFIG_FILE = "config.json";

// Zmienna, która będzie przechowywała pulę połączeń
let dbPool = null;

// ====================================================================
// FUNKCJE POMOCNICZE
// ====================================================================

/**
 * Ładuje dane konfiguracyjne z pliku config.json.
 * @returns {Promise<Object|null>} Konfiguracja bazy danych lub null, jeśli plik nie istnieje.
 */
async function loadConfig() {
  try {
    const data = await fs.readFile(CONFIG_FILE, "utf8");
    return JSON.parse(data);
  } catch (error) {
    if (error.code === "ENOENT") {
      return null; // Plik nie istnieje
    }
    throw error; // Inny błąd
  }
}

/**
 * Zapisuje dane konfiguracyjne do pliku config.json.
 * @param {Object} config - Obiekt z danymi do połączenia.
 */
// Zmieniamy na jawny, nazwany export
export async function saveConfig(config) {
  await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
}

// ====================================================================
// FUNKCJE GŁÓWNE
// ====================================================================

/**
 * Sprawdza, czy plik konfiguracyjny istnieje.
 * @returns {Promise<boolean>}
 */
// Zmieniamy na jawny, nazwany export
export async function isConfigured() {
  return (await loadConfig()) !== null;
}

/**
 * Ustanawia połączenie z bazą danych na podstawie podanej (lub załadowanej) konfiguracji.
 * @param {Object|null} config - Konfiguracja bazy danych (opcjonalna, jeśli ma być załadowana z pliku).
 */
// Zmieniamy na jawny, nazwany export
export async function initializeDbConnection(config = null) {
  // 1. Jeśli jest już aktywne połączenie, rozłącz je
  if (dbPool) {
    await dbPool.end();
    dbPool = null;
  }

  // 2. Pobierz konfigurację
  const dbConfig = config || (await loadConfig());

  if (!dbConfig) {
    console.warn(
      "⚠️ Brak pliku konfiguracyjnego. Serwer w trybie konfiguracji.",
    );
    return;
  }

  try {
    // --- KROK A: Utwórz bazę danych, jeśli nie istnieje
    const tempConnection = await mysql.createConnection({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password,
    });

    await tempConnection.execute(
      `CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\`;`,
    );
    await tempConnection.end();
    console.log(`✅ Baza danych '${dbConfig.database}' jest gotowa.`);

    // --- KROK B: Utwórz pulę połączeń z docelową bazą
    dbPool = mysql.createPool({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password,
      database: dbConfig.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
    // --- KROK C: Zainicjuj obowiązkowe tabele w odpowiedniej kolejności
    // 1. Tabele niezależne (Rodzice pierwszego stopnia)
    await initializeTable("users", createUsersTableSQL);
    await initializeTable("skills", createSkillsTableSQL);

    // 2. Tabele zależne od 'users' (Rodzice drugiego stopnia)
    await initializeTable("images", createTableImagesSQL);
    await initializeTable("personal_data", createPersonalDataTableSQL);

    // 3. Główna tabela CV (Zależy od users, personal_data i images)
    await initializeTable("cvs", createCVsTableSQL);

    // 4. Tabele zależne bezpośrednio od 'cvs'
    await initializeTable("experience", createTableExperienceSQL);
    await initializeTable("education", createTableEducationSQL);
    await initializeTable("courses", createTableCoursesSQL);
    await initializeTable("cv_skills", createTableCVSkillsSQL);

    // 5. Tabele łączące (Zależą od experience/education/courses ORAZ skills)
    await initializeTable("experience_skills", createTableExperienceSkillsSQL);
    await initializeTable("education_skills", createTableEducationSkillsSQL);
    await initializeTable("courses_skills", createTableCoursesSkillsSQL);
    await initializeTable("user_preferences", createTableUserPreferences);
    await initializeTable("cv_links", createTableLinksSQL);
    await initializeTable("cv_languages", createTableLanguageSQL);

    console.log("✅ Połączenie z bazą danych ustanowione pomyślnie.");
  } catch (err) {
    console.error("❌ BŁĄD POŁĄCZENIA/INICJALIZACJI BAZY DANYCH:", err.message);
    throw new Error(
      "Nie można połączyć się z bazą danych. Sprawdź konfigurację.",
    );
  }
}

/**
 * Dynamicznie sprawdza i tworzy dowolną tabelę.
 * @param {string} tableName - Nazwa tabeli.
 * @param {string} createTableSQL - SQL dla tworzenia tabeli.
 */
// Zmieniamy na jawny, nazwany export
export async function initializeTable(tableName, createTableSQL) {
  if (!dbPool) {
    throw new Error("Brak aktywnego połączenia z bazą danych.");
  }
  try {
    await dbPool.execute(createTableSQL);
    console.log(`✅ Tabela '${tableName}' jest gotowa.`);
  } catch (error) {
    console.error(`Błąd tworzenia tabeli ${tableName}:`, error);
    throw new Error(`Nie udało się utworzyć tabeli: ${tableName}`);
  }
}

/**
 * Zwraca aktywną pulę połączeń.
 */
// Zmieniamy na jawny, nazwany export
export function getPool() {
  if (!dbPool) {
    throw new Error(
      "Brak aktywnego połączenia z bazą danych. Wymagana konfiguracja.",
    );
  }
  return dbPool;
}
export default {
  initializeDbConnection,
  saveConfig,
  isConfigured,
  initializeTable,
  getPool,
  CONFIG_FILE,
};
