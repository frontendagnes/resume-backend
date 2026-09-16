import {
  saveFullCV,
  getCvList,
  deleteUserCv,
  getFullCVById,
  duplicateCvService,
} from "../services/cvService.js";

import db from "../db.js";

// ============================================================
// ZAPIS / EDYCJA CV
// ============================================================

export const saveCv = async (req, res) => {
  const connection = await db.getPool().getConnection();

  const userId = req.userId;
  const data = req.body;

  try {
    await connection.beginTransaction();

    // --------------------------------------------------------
    // CV utworzone offline może mieć lokalne ID:
    //
    // temp_123_abc
    //
    // Takie ID nie istnieje w bazie MySQL.
    //
    // Dlatego traktujemy je jako NOWE CV.
    // --------------------------------------------------------

    const isTemporaryId =
      data.id && typeof data.id === "string" && data.id.startsWith("temp_");

    const dataToSave = isTemporaryId
      ? {
          ...data,
          id: undefined,
        }
      : data;

    // --------------------------------------------------------
    // Zapis całego CV w jednej transakcji.
    // --------------------------------------------------------

    const cvId = await saveFullCV(connection, userId, dataToSave);

    await connection.commit();

    // --------------------------------------------------------
    // Zwracamy prawdziwe ID z bazy.
    //
    // Frontend może dzięki temu zamienić:
    //
    // temp_123_abc
    //
    // na:
    //
    // 456
    // --------------------------------------------------------

    res.status(200).json({
      id: cvId,
      cvId,
      message:
        isTemporaryId || !data.id ? "CV utworzone!" : "CV zaktualizowane!",
    });
  } catch (error) {
    try {
      await connection.rollback();
    } catch (rollbackError) {
      console.error("Rollback Error:", rollbackError);
    }

    console.error("Controller Error:", error);

    res.status(500).json({
      message: "Błąd serwera podczas zapisu CV",
      error: error?.message || "Nieznany błąd",
    });
  } finally {
    connection.release();
  }
};

// ============================================================
// LISTA CV
// ============================================================

export const listCvs = async (req, res) => {
  try {
    const userId = req.userId;

    const list = await getCvList(userId);

    res.json(list);
  } catch (error) {
    console.error("List CV Controller Error:", error);

    res.status(500).json({
      message: "Błąd podczas pobierania listy",
    });
  }
};

// ============================================================
// USUNIĘCIE CV
// ============================================================

export const deleteCv = async (req, res) => {
  try {
    const success = await deleteUserCv(req.params.id, req.userId);

    if (!success) {
      return res.status(404).json({
        message: "Nie znaleziono CV lub brak uprawnień.",
      });
    }

    res.json({
      success: true,
      message: "CV oraz powiązane pliki zostały usunięte.",
    });
  } catch (error) {
    console.error("Delete Controller Error:", error);

    res.status(500).json({
      message: "Błąd serwera podczas usuwania.",
    });
  }
};

// ============================================================
// POBRANIE PEŁNEGO CV
// ============================================================

export const getFullCv = async (req, res) => {
  const cvId = req.params.id;
  const userId = req.userId;

  try {
    const cv = await getFullCVById(cvId, userId);

    if (!cv) {
      return res.status(404).json({
        message: "Nie znaleziono CV lub brak uprawnień.",
      });
    }

    res.json(cv);
  } catch (error) {
    console.error("getFullCv Controller Error:", error);

    res.status(500).json({
      message: "Błąd serwera podczas pobierania pełnych danych CV.",
    });
  }
};

// ============================================================
// DUPLIKOWANIE CV
// ============================================================

export const duplicateCv = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const newCvId = await duplicateCvService(id, userId);

    res.status(201).json({
      id: newCvId,
      newCvId,
      message: "CV skopiowane pomyślnie",
    });
  } catch (err) {
    console.error("Duplicate CV Controller Error:", err);

    res.status(err.status || 500).json({
      message: err.message || "Błąd podczas duplikowania CV",
    });
  }
};

// import {
//   saveFullCV,
//   getCvList,
//   deleteUserCv,
//   getFullCVById,
//   duplicateCvService
// } from "../services/cvService.js";
// import db from "../db.js";

// export const saveCv = async (req, res) => {
//   const connection = await db.getPool().getConnection();
//   const userId = req.userId;
//   const data = req.body;

//   try {
//     await connection.beginTransaction();

//     // Controller wywołuje serwis
//     const cvId = await saveFullCV(connection, userId, data);

//     await connection.commit();
//     res.status(200).json({
//       message: data.id ? "CV zaktualizowane!" : "CV utworzone!",
//       cvId,
//     });
//   } catch (error) {
//     await connection.rollback();
//     console.error("Controller Error:", error);
//     res.status(500).json({ message: "Błąd serwera podczas zapisu CV" });
//   } finally {
//     connection.release();
//   }
// };

// export const listCvs = async (req, res) => {
//   try {
//     const userId = req.userId;
//     const list = await getCvList(userId);
//     res.json(list);
//   } catch (error) {
//     res.status(500).json({ message: "Błąd podczas pobierania listy" });
//   }
// };

// export const deleteCv = async (req, res) => {
//   try {
//     const success = await deleteUserCv(req.params.id, req.userId);

//     if (!success) {
//       return res
//         .status(404)
//         .json({ message: "Nie znaleziono CV lub brak uprawnień." });
//     }

//     res.json({
//       success: true,
//       message: "CV oraz powiązane pliki zostały usunięte.",
//     });
//   } catch (error) {
//     console.error("Delete Controller Error:", error);
//     res.status(500).json({ message: "Błąd serwera podczas usuwania." });
//   }
// };

// export const getFullCv = async (req, res) => {
//   const cvId = req.params.id;
//   const userId = req.userId;

//   try {
//     const cv = await getFullCVById(cvId, userId);

//     if (!cv) {
//       return res
//         .status(404)
//         .json({ message: "Nie znaleziono CV lub brak uprawnień." });
//     }

//     res.json(cv);
//   } catch (error) {
//     console.error("getFullCv Controller Error:", error);
//     res
//       .status(500)
//       .json({ message: "Błąd serwera podczas pobierania pełnych danych CV." });
//   }
// };

// // cvController.js
// export const duplicateCv = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const userId = req.userId;

//     const newCvId = await duplicateCvService(id, userId);

//     res.status(201).json({
//       message: "CV skopiowane pomyślnie",
//       newCvId,
//     });
//   } catch (err) {
//     console.error(err);
//     res.status(err.status || 500).json({
//       message: err.message || "Błąd podczas duplikowania CV",
//     });
//   }
// };
