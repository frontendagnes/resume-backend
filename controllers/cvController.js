import {
  saveFullCV,
  getCvList,
  deleteUserCv,
  getFullCVById,
  duplicateCvService
} from "../services/cvService.js";
import db from "../db.js";


export const saveCv = async (req, res) => {
  const connection = await db.getPool().getConnection();
  const userId = req.userId;
  const data = req.body;

  try {
    await connection.beginTransaction();

    // Controller wywołuje serwis
    const cvId = await saveFullCV(connection, userId, data);

    await connection.commit();
    res.status(200).json({
      message: data.id ? "CV zaktualizowane!" : "CV utworzone!",
      cvId,
    });
  } catch (error) {
    await connection.rollback();
    console.error("Controller Error:", error);
    res.status(500).json({ message: "Błąd serwera podczas zapisu CV" });
  } finally {
    connection.release();
  }
};

export const listCvs = async (req, res) => {
  try {
    const userId = req.userId;
    const list = await getCvList(userId);
    res.json(list);
  } catch (error) {
    res.status(500).json({ message: "Błąd podczas pobierania listy" });
  }
};

export const deleteCv = async (req, res) => {
  try {
    const success = await deleteUserCv(req.params.id, req.userId);

    if (!success) {
      return res
        .status(404)
        .json({ message: "Nie znaleziono CV lub brak uprawnień." });
    }

    res.json({
      success: true,
      message: "CV oraz powiązane pliki zostały usunięte.",
    });
  } catch (error) {
    console.error("Delete Controller Error:", error);
    res.status(500).json({ message: "Błąd serwera podczas usuwania." });
  }
};

export const getFullCv = async (req, res) => {
  const cvId = req.params.id;
  const userId = req.userId;

  try {
    const cv = await getFullCVById(cvId, userId);

    if (!cv) {
      return res
        .status(404)
        .json({ message: "Nie znaleziono CV lub brak uprawnień." });
    }

    res.json(cv);
  } catch (error) {
    console.error("getFullCv Controller Error:", error);
    res
      .status(500)
      .json({ message: "Błąd serwera podczas pobierania pełnych danych CV." });
  }
};

// cvController.js
export const duplicateCv = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const newCvId = await duplicateCvService(id, userId);

    res.status(201).json({
      message: "CV skopiowane pomyślnie",
      newCvId,
    });
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({
      message: err.message || "Błąd podczas duplikowania CV",
    });
  }
};

// export const duplicateCv = async (req, res) => {
//   const { id } = req.params; // ID źródłowego CV
//   const userId = req.userId;
//   const connection = await getPool().getConnection();

//   try {
//     await connection.beginTransaction();

//     // 1. Pobranie oryginału
//     const [cvRows] = await connection.execute(
//       "SELECT * FROM cvs WHERE id = ? AND user_id = ?",
//       [id, userId],
//     );

//     if (cvRows.length === 0) {
//       connection.release();
//       return res
//         .status(404)
//         .json({ message: "Nie znaleziono CV do skopiowania." });
//     }

//     const original = cvRows[0];

//     // 2. Klonowanie głównego rekordu CV
//     const [cvResult] = await connection.execute(
//       `INSERT INTO cvs (
//                 user_id, personal_data_id, image_id, first_name, last_name,
//                 title, target_position, clause
//             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
//       [
//         userId,
//         original.personal_data_id,
//         original.image_id,
//         original.first_name,
//         original.last_name,
//         `Kopia: ${original.title}`,
//         original.target_position,
//         original.clause,
//       ],
//     );

//     const newCvId = cvResult.insertId;

//     // 3. Klonowanie CV_SKILLS (relacja prosta: CV <-> Skills)
//     await connection.execute(
//       `INSERT INTO cv_skills (cv_id, skill_id, level, order_index)
//              SELECT ?, skill_id, level, order_index FROM cv_skills WHERE cv_id = ?`,
//       [newCvId, id],
//     );

//     // 4. Klonowanie EXPERIENCE oraz powiązanych umiejętności (EXPERIENCE_SKILLS)
//     const [expRows] = await connection.execute(
//       "SELECT id FROM experience WHERE cv_id = ?",
//       [id],
//     );
//     for (const exp of expRows) {
//       const [newExpResult] = await connection.execute(
//         `INSERT INTO experience (cv_id, company, position, start_date, end_date, description)
//                  SELECT ?, company, position, start_date, end_date, description FROM experience WHERE id = ?`,
//         [newCvId, exp.id],
//       );
//       const newExpId = newExpResult.insertId;

//       // Kopiowanie umiejętności przypisanych do tego konkretnego doświadczenia
//       await connection.execute(
//         `INSERT INTO experience_skills (experience_id, skill_id, description)
//                  SELECT ?, skill_id, description FROM experience_skills WHERE experience_id = ?`,
//         [newExpId, exp.id],
//       );
//     }

//     // 5. Klonowanie EDUCATION oraz powiązanych umiejętności (EDUCATION_SKILLS)
//     const [eduRows] = await connection.execute(
//       "SELECT id FROM education WHERE cv_id = ?",
//       [id],
//     );
//     for (const edu of eduRows) {
//       const [newEduResult] = await connection.execute(
//         `INSERT INTO education (cv_id, school, degree, start_date, end_date)
//                  SELECT ?, school, degree, start_date, end_date FROM education WHERE id = ?`,
//         [newCvId, edu.id],
//       );
//       const newEduId = newEduResult.insertId;

//       await connection.execute(
//         `INSERT INTO education_skills (education_id, skill_id, description)
//                  SELECT ?, skill_id, description FROM education_skills WHERE education_id = ?`,
//         [newEduId, edu.id],
//       );
//     }

//     // 6. Klonowanie COURSES oraz powiązanych umiejętności (COURSES_SKILLS)
//     const [courseRows] = await connection.execute(
//       "SELECT id FROM courses WHERE cv_id = ?",
//       [id],
//     );
//     for (const course of courseRows) {
//       const [newCourseResult] = await connection.execute(
//         `INSERT INTO courses (cv_id, title, provider, start_date, end_date, description)
//                  SELECT ?, title, provider, start_date, end_date, description FROM courses WHERE id = ?`,
//         [newCvId, course.id],
//       );
//       const newCourseId = newCourseResult.insertId;

//       await connection.execute(
//         `INSERT INTO courses_skills (courses_id, skill_id, description)
//                  SELECT ?, skill_id, description FROM courses_skills WHERE courses_id = ?`,
//         [newCourseId, course.id],
//       );
//     }

//     await connection.commit();
//     res.status(201).json({ message: "CV skopiowane pomyślnie!", newCvId });
//   } catch (error) {
//     await connection.rollback();
//     console.error("Błąd kopiowania CV:", error);
//     res
//       .status(500)
//       .json({ message: "Wystąpił błąd podczas duplikowania dokumentu." });
//   } finally {
//     connection.release();
//   }
// };