// utils/dbErrorParser.js

// Nie wymaga importów zewnętrznych

// Zmieniamy na jawny, nazwany eksport (export const)
export const handleDuplicateEntryError = (error, res) => {
  if (error.code !== "ER_DUP_ENTRY") {
    return false; // Nie jest to błąd duplikatu
  }

  const errorMessage = error.sqlMessage || error.message || "";
  let specificMessage = "Użytkownik o tym emailu lub nazwie już istnieje.";

  if (
    errorMessage.includes("email_UNIQUE") ||
    errorMessage.includes("for key 'users.email'")
  ) {
    specificMessage = "Użytkownik o tym adresie email już istnieje.";
  } else if (
    errorMessage.includes("username_UNIQUE") ||
    errorMessage.includes("for key 'users.username'")
  ) {
    specificMessage = "Użytkownik o tej nazwie użytkownika już istnieje.";
  }

  res.status(409).json({
    message: specificMessage,
    status: "ERROR_DUPLICATE",
  });
  return true; // Obsłużono błąd duplikatu
};

export const handleDuplicateEntryErrorPerson = (error, res) => {
  if (error.code !== "ER_DUP_ENTRY") return false;

  const msg = error.message || "";

  let message = "Profil z tymi danymi już istnieje.";

  if (msg.includes("unique_user_email")) {
    message = "Ten email już istnieje w Twoich profilach.";
  }

  if (msg.includes("unique_user_phone")) {
    message = "Ten numer telefonu już istnieje w Twoich profilach.";
  }

  res.status(409).json({
    status: "ERROR_DUPLICATE",
    message,
  });

  return true;
};
