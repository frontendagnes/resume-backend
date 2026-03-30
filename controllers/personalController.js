import * as personalService from "../services/personalService.js";
import { handleDuplicateEntryErrorPerson } from "../utils/dbErrorParser.js";

export const savePersonalData = async (req, res) => {
  const { firstName, lastName, email, phone, city } = req.body;
  const userId = req.userId;

  if (!firstName || !lastName || !email || !phone) {
    return res.status(400).json({ message: "Wszystkie pola są wymagane" });
  }

  try {
    await personalService.createPersonalData(
      userId,
      firstName,
      lastName,
      email,
      phone,
      city,
    );
    res.status(201).json({
      success: true,
      message: "Dane osobowe zapisane",
    });
  } catch (error) {
    console.error("Błąd dodania danych osobowych:", error);
    if (handleDuplicateEntryErrorPerson(error, res)) return;
    res.status(500).json({ message: "Błąd serwera podczas zapisu danych." });
  }
};

export const getPersonalData = async (req, res) => {
  try {
    const data = await personalService.getPersonalData(req.userId);
    res.json({
      message: "Dane pobrano pomyślnie",
      data: data,
    });
  } catch (error) {
    res.status(500).json({ message: "Błąd odczytu danych personalnych." });
  }
};

export const deletePersonalData = async (req, res) => {
  try {
    const personalId = Number(req.params.id);
    await personalService.deletePersonalData(personalId, req.userId);
    res.json({ message: "Dane personalne zostały poprawnie usunięte" });
  } catch (error) {
    res.status(403).json({
      message: error.message || "Nie udało się usunąć danych.",
    });
  }
};

export const updatePersonalData = async (req, res) => {
  const { firstName, lastName, email, phone, city } = req.body;
  const personalId = req.params.id;

  try {
    await personalService.updatePersonalData(
      personalId,
      req.userId,
      firstName,
      lastName,
      email,
      phone,
      city,
    );
    res.json({ message: "Dane personalne zaktualizowane" });
  } catch (error) {
    // Mapowanie błędów z serwisu na kody HTTP
    if (error.message === "DUPLICATE_PERSONAL_DATA") {
      return res
        .status(409)
        .json({
          message:
            "Profil z tym adresem email lub numerem telefonu już istnieje",
        });
    }
    if (error.message === "NOT_FOUND_OR_NO_ACCESS") {
      return res
        .status(404)
        .json({ message: "Profil nie istnieje lub brak uprawnień" });
    }
    res.status(500).json({ message: "Błąd aktualizacji danych personalnych" });
  }
};
