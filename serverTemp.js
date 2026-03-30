// server.js

const express = require("express");
const fs = require("fs/promises");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs"); // Do haszowania haseł
const jwt = require("jsonwebtoken"); // Do tokenów autoryzacyjnych

const app = express();
const PORT = 3001;
const CONFIG_FILE = "config.json";
const JWT_SECRET = "TWOJ_BARDZO_TAJNY_SEKRET"; // Zmień na coś bezpiecznego w produkcji!

// Middleware (Express.js)
app.use(express.json()); // Umożliwia Expressowi parsowanie JSON-a z zapytań

let dbPool; // Zmienna do przechowywania puli połączeń z bazą danych

// ====================================================================
// FUNKCJA 1: SPRAWDZANIE/TWORZENIE PLIKU KONFIGURACYJNEGO
// ====================================================================

async function loadOrCreateConfig() {
  try {
    // 1. SPRÓBUJ ODCZYTAĆ PLIK
    const data = await fs.readFile(CONFIG_FILE, "utf8");
    console.log(`✅ Plik konfiguracyjny ${CONFIG_FILE} znaleziony.`);
    return JSON.parse(data);
  } catch (error) {
    if (error.code === "ENOENT") {
      // Plik nie istnieje, więc go UTWÓRZ
      console.warn(`⚠️ Plik konfiguracyjny ${CONFIG_FILE} nie znaleziony.`);

      // TUTAJ POPROŚ UŻYTKOWNIKA O DANE W PRAWDZIWEJ APLIKACJI,
      // A NA RAZIE UŻYJEMY PRZYKŁADOWYCH.

      const defaultConfig = {
        host: "localhost", // Zwykle to 'localhost' lub IP
        user: "root", // Użytkownik bazy danych
        password: "", // HASŁO DO BAZY
        database: "resume", // Nazwa bazy danych
      };

      await fs.writeFile(CONFIG_FILE, JSON.stringify(defaultConfig, null, 2));
      console.log(
        `✅ Utworzono nowy plik konfiguracyjny ${CONFIG_FILE}. PAMIĘTAJ, by edytować go poprawnymi danymi!`
      );
      return defaultConfig;
    } else {
      console.error(
        "❌ Błąd podczas operacji na pliku konfiguracyjnym:",
        error.message
      );
      process.exit(1); // Zakończ aplikację, jeśli jest inny błąd
    }
  }
}

// ====================================================================
// FUNKCJA 2: ŁĄCZENIE Z BAZĄ DANYCH I TWORZENIE TABEL
// ====================================================================

async function initializeDatabase(config) {
  try {
    // Połącz się BEZ podania nazwy bazy danych, by móc ją utworzyć,
    // jeśli jeszcze nie istnieje.
    const connection = await mysql.createConnection({
      host: config.host,
      user: config.user,
      password: config.password,
    });

    // 1. Utwórz bazę danych, jeśli nie istnieje
    await connection.execute(
      `CREATE DATABASE IF NOT EXISTS \`${config.database}\`;`
    );
    await connection.end();
    console.log(`✅ Baza danych '${config.database}' jest gotowa.`);

    // 2. Utwórz pulę połączeń z docelową bazą
    dbPool = mysql.createPool({
      host: config.host,
      user: config.user,
      password: config.password,
      database: config.database, // Teraz łączymy się z utworzoną bazą
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

    // 3. Sprawdź i utwórz tabelę users
    const createUsersTable = `
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) NOT NULL UNIQUE,
                email VARCHAR(100) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `;
    await dbPool.execute(createUsersTable);
    console.log("✅ Tabela 'users' jest gotowa.");

    // 4. Sprawdź i utwórz tabelę books
    const createBooksTable = `
            CREATE TABLE IF NOT EXISTS books (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                author VARCHAR(255) NOT NULL,
                user_id INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
        `;
    await dbPool.execute(createBooksTable);
    console.log("✅ Tabela 'books' jest gotowa.");

    console.log("---");
    console.log("🚀 Aplikacja backendowa jest gotowa do działania!");
  } catch (err) {
    console.error("❌ BŁĄD POŁĄCZENIA/INICJALIZACJI BAZY DANYCH:", err.message);
    console.error(
      "Sprawdź, czy Twój serwer MySQL jest uruchomiony i czy dane w 'config.json' są poprawne."
    );
    process.exit(1);
  }
}

// ====================================================================
// FUNKCJA GŁÓWNA STARTUJĄCA SERWER
// ====================================================================

async function startServer() {
  const dbConfig = await loadOrCreateConfig();
  await initializeDatabase(dbConfig);

  app.listen(PORT, () => {
    console.log(`🌐 Serwer Express.js działa na porcie ${PORT}`);
  });
}

// Uruchomienie głównej funkcji
startServer();

// ====================================================================
// DALSZE ROUTY DO UWIERZYTELNIANIA I CRUD BĘDĄ TUTAJ DODANE
// (teraz możesz przetestować, czy łączy się z bazą danych i tworzy tabele)
// ====================================================================
// server.js (DODAJ PONIŻSZY KOD)

// ====================================================================
// FUNKCJA 3: MIDDLEWARE AUTORYZACJI (Sprawdzanie Tokena JWT)
// ====================================================================

function authenticateToken(req, res, next) {
    // Nagłówek 'Authorization' często wygląda tak: 'Bearer <token>'
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
        return res.status(401).json({ message: "Brak tokena autoryzacji." });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            // Token jest nieprawidłowy lub wygasł
            return res.status(403).json({ message: "Token jest nieprawidłowy lub wygasł." });
        }
        req.user = user; // Dodaj dane użytkownika (np. id) do obiektu żądania
        next(); // Przejdź do następnej funkcji (routa)
    });
}

// ====================================================================
// ROUTY UWIERZYTELNIANIA (Rejestracja i Logowanie)
// ====================================================================

// 1. REJESTRACJA
app.post('/api/auth/register', async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ message: 'Wymagane pola: username, email, password.' });
    }

    try {
        // Haszowanie hasła (sól o sile 10)
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        // Zapytanie do bazy
        const query = 'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)';
        await dbPool.execute(query, [username, email, password_hash]);

        res.status(201).json({ message: 'Użytkownik zarejestrowany pomyślnie!' });

    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'Użytkownik o tym emailu lub nazwie już istnieje.' });
        }
        console.error('Błąd rejestracji:', error);
        res.status(500).json({ message: 'Błąd serwera podczas rejestracji.' });
    }
});

// 2. LOGOWANIE
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Wymagane pola: email i password.' });
    }

    try {
        // 1. Znajdź użytkownika
        const query = 'SELECT * FROM users WHERE email = ?';
        const [rows] = await dbPool.execute(query, [email]);
        const user = rows[0];

        if (!user) {
            return res.status(401).json({ message: 'Nieprawidłowe dane logowania.' });
        }

        // 2. Porównaj hasło
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            return res.status(401).json({ message: 'Nieprawidłowe dane logowania.' });
        }

        // 3. Generuj Token JWT
        const token = jwt.sign(
            { id: user.id, username: user.username },
            JWT_SECRET,
            { expiresIn: '1h' } // Token wygaśnie po 1 godzinie
        );

        // 4. Zwróć token
        res.json({
            message: 'Zalogowano pomyślnie!',
            token: token,
            userId: user.id,
            username: user.username
        });

    } catch (error) {
        console.error('Błąd logowania:', error);
        res.status(500).json({ message: 'Błąd serwera podczas logowania.' });
    }
});

// server.js (DODAJ PONIŻSZY KOD)

// ====================================================================
// ROUTY CRUD DLA KSIĄŻEK (Wymagana autoryzacja)
// ====================================================================

// 1. CREATE (Dodaj książkę) - POST /api/books
app.post('/api/books', authenticateToken, async (req, res) => {
    const { title, author } = req.body;
    const user_id = req.user.id; // ID użytkownika z tokena JWT

    if (!title || !author) {
        return res.status(400).json({ message: 'Wymagane pola: title i author.' });
    }

    try {
        // Tabela 'books' została utworzona przy starcie serwera, więc po prostu wykonaj INSERT
        const query = 'INSERT INTO books (title, author, user_id) VALUES (?, ?, ?)';
        const [result] = await dbPool.execute(query, [title, author, user_id]);

        res.status(201).json({
            message: 'Książka dodana pomyślnie.',
            id: result.insertId
        });
    } catch (error) {
        console.error('Błąd dodawania książki:', error);
        res.status(500).json({ message: 'Błąd serwera podczas dodawania książki.' });
    }
});

// 2. READ ALL (Pobierz książki użytkownika) - GET /api/books
app.get('/api/books', authenticateToken, async (req, res) => {
    const user_id = req.user.id; // ID użytkownika z tokena JWT

    try {
        const query = 'SELECT id, title, author, created_at FROM books WHERE user_id = ? ORDER BY created_at DESC';
        const [books] = await dbPool.execute(query, [user_id]);

        res.json(books);
    } catch (error) {
        console.error('Błąd pobierania książek:', error);
        res.status(500).json({ message: 'Błąd serwera podczas pobierania książek.' });
    }
});

// 3. UPDATE (Edytuj książkę) - PUT /api/books/:id
app.put('/api/books/:id', authenticateToken, async (req, res) => {
    const { title, author } = req.body;
    const bookId = req.params.id;
    const user_id = req.user.id; // Sprawdzenie, czy użytkownik jest właścicielem

    if (!title || !author) {
        return res.status(400).json({ message: 'Wymagane pola: title i author.' });
    }

    try {
        const query = 'UPDATE books SET title = ?, author = ? WHERE id = ? AND user_id = ?';
        const [result] = await dbPool.execute(query, [title, author, bookId, user_id]);

        if (result.affectedRows === 0) {
            // Albo nie ma książki o tym ID, albo użytkownik nie jest jej właścicielem
            return res.status(404).json({ message: 'Książka nie znaleziona lub brak uprawnień.' });
        }

        res.json({ message: 'Książka zaktualizowana pomyślnie.' });

    } catch (error) {
        console.error('Błąd edycji książki:', error);
        res.status(500).json({ message: 'Błąd serwera podczas edycji książki.' });
    }
});

// 4. DELETE (Usuń książkę) - DELETE /api/books/:id
app.delete('/api/books/:id', authenticateToken, async (req, res) => {
    const bookId = req.params.id;
    const user_id = req.user.id; // Sprawdzenie, czy użytkownik jest właścicielem

    try {
        const query = 'DELETE FROM books WHERE id = ? AND user_id = ?';
        const [result] = await dbPool.execute(query, [bookId, user_id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Książka nie znaleziona lub brak uprawnień.' });
        }

        res.json({ message: 'Książka usunięta pomyślnie.' });

    } catch (error) {
        console.error('Błąd usuwania książki:', error);
        res.status(500).json({ message: 'Błąd serwera podczas usuwania książki.' });
    }
});