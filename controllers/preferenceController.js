import {
  getPreferencesByUserId,
  updatePreferences,
  removeDefault,
} from "../services/preferencesService.js";

export const getUserPreferences = async (req, res) => {
  try {
    const prefs = await getPreferencesByUserId(req.userId);
    res.status(200).json(prefs || {});
  } catch (error) {
    console.error("BŁĄD SQL W PREFERENCES:", error);
    res.status(500).json({
      message: "Błąd podczas pobierania preferencji.",
      details: error.message, // Tymczasowo wyślij detal do Frontendu, żeby go zobaczyć w Network
    });
  }
};

export const updatePersonalDefault = async (req, res) => {
  try {
    const { personalId } = req.body;
    await updatePreferences(req.userId, { personalId });
    res
      .status(200)
      .json({ message: "Domyślne dane personalne zostały zaktualizowane." });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Błąd podczas ustawiania domyślnych danych." });
  }
};

export const clearDefault = async (req, res) => {
  try {
    const { type } = req.params; // 'personal' lub 'image'
    await removeDefault(req.userId, type);
    res.status(200).json({ message: "Domyślne ustawienie zostało usunięte." });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Błąd podczas usuwania domyślnego ustawienia." });
  }
};

export const updateImageDefault = async (req, res) => {
  try {
    const { imageId } = req.body;
    await updatePreferences(req.userId, { imageId });
    res
      .status(200)
      .json({ message: "Domyślne zdjęcie zostało zaktualizowane." });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Błąd podczas ustawiania domyślnego zdjęcia." });
  }
};
