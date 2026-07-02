# 🌐 Resume 1.0 - Backend Server

* 🚀 Technologia: Express.js v5.1.0 (Node.js)
* 🗄️ Baza danych: MySQL (mysql2 v3.15.2)
* 📦 Typ modułów: ES Modules (import/export)
* 📝 Licencja: ISC

## 📝 Opis projektu

Serwer aplikacyjny odpowiedzialny za logikę biznesową, autoryzację użytkowników, zarządzanie plikami oraz komunikację z bazą danych MySQL. Architektura została zaprojektowana w taki sposób, aby aplikacja mogła uruchomić się nawet przy braku wstępnej konfiguracji bazy danych – serwer przechodzi wtedy w bezpieczny tryb oczekiwania (Setup Mode), oferując dedykowane API do zdalnej konfiguracji połączenia.

---

## ✨ Funkcje i moduły systemu

### 1. Dynamiczny Kreator Konfiguracji (Setup Wizard)

* **`/api/status`** – Zwraca aktualny stan połączenia. Jeśli serwer nie jest połączony, informuje o statusie `SETUP_REQUIRED`.
* **`/api/setup`** – Przyjmuje parametry bazy danych (`host`, `user`, `database`, `password`), weryfikuje połączenie w locie i automatycznie zapisuje je do pliku konfiguracyjnego.

### 2. Bezpieczeństwo i Autoryzacja (`/api/auth`)

* Rejestracja i logowanie użytkowników z wykorzystaniem tokenów **JWT (JSON Web Tokens)**.
* Bezpieczne haszowanie haseł algorytmem **bcryptjs**.
* Integracja z **Google Auth Library** do obsługi logowania społecznościowego OAuth.
* Ochrona przed atakami typu Brute-Force dzięki limitowaniu żądań (**express-rate-limit**).

### 3. Moduły Biznesowe i Dane

* **`/api/preferences`** – Zarządzanie spersonalizowanymi preferencjami użytkowników.
* **`/api/personal`** – Obsługa profili i prywatnych danych użytkowników.
* **`/api` (CV Routes)** –Endpointy odpowiedzialne za generowanie i edycję życiorysów zawodowych.

### 4. Magazyn Plików i Wysyłka Maili

* **`/api/images`** – Przesyłanie obrazów przy użyciu biblioteki **multer**.
* **`/uploads`** – Udostępnianie przesłanych plików jako zasobów statycznych.
* **System powiadomień e-mail** – Zintegrowany **Nodemailer** obsługujący szablony HTML przy użyciu silnika renderującego **Handlebars**.

---

## 🛠️ Wymagania i Zależności

### Wymagania systemowe:

* **Node.js** (rekomendowana wersja v18 lub nowsza)
* **MySQL** (lokalnie, w chmurze lub przez Docker)

### Główne produkcyjne zależności:

* `express` – Szkielet aplikacji webowej.
* `mysql2` – Wydajny sterownik do bazy MySQL obsługujący Promise.
* `jsonwebtoken` & `bcryptjs` – Bezpieczeństwo sesji i danych uwierzytelniających.
* `multer` – Obsługa przesyłania plików (multipart/form-data).
* `nodemailer` & `express-handlebars` – Generowanie i wysyłka maili strukturyzowanych.
* `express-rate-limit` – Ochrona anty-DDoS i brute-force.

---

## 🚀 Instalacja i Uruchomienie

### 1. Instalacja pakietów

Przejdź do katalogu serwera i zainstaluj wymagane moduły:
npm install

### 2. Zmienne środowiskowe

Utwórz plik `.env` w głównym katalogu serwera i zdefiniuj klucze konfiguracyjne:
PORT=5000
JWT_SECRET=[wpisz_losowy_bezpieczny_ciag_znakow]

# [Uzupełnij tutaj o inne zmienne np. dane SMTP dla Nodemailera]

### 3. Uruchomienie serwera

* **Tryb deweloperski (z automatycznym restartem przez nodemon):**
  npx nodemon server.js

* **Tryb produkcyjny:**
  node server.js

Serwer uruchomi się na porcie `5000` i zacznie nasłuchiwać żądań.

---

## 💻 Pierwsza Konfiguracja (API Setup)

Jeśli uruchamiasz aplikację po raz pierwszy i nie posiadasz pliku `config.json`, serwer zgłosi gotowość do konfiguracji. Możesz go spiąć z bazą danych, wysyłając żądanie typu **POST** za pomocą narzędzia Postman, cURL lub frontendu:

* **Endpoint:** `http://localhost:5000/api/setup`
* **Nagłówek:** `Content-Type: application/json`
* **Body (JSON):**
  {
    "host": "localhost",
    "user": "root",
    "database": "nazwa_twojej_bazy",
    "password": "twoje_haslo_bazy"
  }

Po poprawnym przetworzeniu żądania serwer utworzy plik konfiguracyjny, zainicjuje pulę połączeń z bazą danych i przejdzie w stan `READY`.

---

## 📂 Struktura Routingów (API Endpoints)

| Metoda   | Endpoint           | Opis                                               |
|:-------- |:------------------ |:-------------------------------------------------- |
| **GET**  | `/api/status`      | Sprawdzenie stanu połączenia z bazą MySQL          |
| **POST** | `/api/setup`       | Zdalna konfiguracja parametrów bazy danych         |
| **POST** | `/api/auth/login`  | Logowanie użytkownika i generowanie tokenu JWT     |
| **USE**  | `/api/preferences` | Pobieranie i aktualizacja preferencji użytkownika  |
| **USE**  | `/api/personal`    | Obsługa danych personalnych profilu                |
| **POST** | `/api/images`      | Wysyłanie plików graficznych na serwer             |
| **GET**  | `/uploads/*`       | Bezpośredni dostęp statyczny do przesłanych plików |
