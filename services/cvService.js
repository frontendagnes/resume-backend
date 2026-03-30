import { getPool } from "../db.js";
import {
  getCourses,
  getCourseSkills,
  getCvCore,
  getCvSkills,
  getEducation,
  getEducationSkills,
  getExperience,
  getExperienceSkills,
} from "../repositories/cvs.read.repository.js";
import {
  clearRelatedTables,
  cloneCourses,
  cloneCv,
  cloneCvLinks,
  cloneCvLanguages,
  cloneCvSkills,
  cloneEducation,
  cloneExperience,
  //cloneCV
  getCvById,
  getCvLanguages,
  getCvLinks,
  saveCourses,
  saveCVHeader,
  saveEducation,
  saveExperience,
  saveLanguages,
  saveLinks,
  //getfullCV
  savePersonalData,
  saveSkillsAll,
} from "../repositories/cvs.repository.js";
export const getCvList = async (userId) => {
  const pool = getPool();

  const query = `
    SELECT
      c.id,
      c.title,
      c.target_position AS targetPosition,
      c.created_at AS createdAt,
      c.first_name AS firstName,
      c.last_name AS lastName,
      i.image_path AS imagePath
    FROM cvs c
    LEFT JOIN images i ON c.image_id = i.id
    WHERE c.user_id = ?
    ORDER BY c.created_at DESC
  `;
  const [rows] = await pool.execute(query, [userId]);
  return rows;
};
export const deleteUserCv = async (cvId, userId) => {
  const pool = getPool();

  // Usuwamy tylko jeśli ID CV zgadza się z ID zalogowanego użytkownika
  const [result] = await pool.execute(
    "DELETE FROM cvs WHERE id = ? AND user_id = ?",
    [cvId, userId],
  );

  // Zwracamy true, jeśli faktycznie usunięto wiersz (affectedRows > 0)
  return result.affectedRows > 0;
};

// Główna funkcja koordynująca
export const getFullCVById = async (cvId, userId) => {
  const pool = getPool();
  const conn = await pool.getConnection();

  try {
    const cv = await getCvCore(conn, cvId, userId);
    if (!cv) return null;

    // 1. Mapujemy główne skille na tablicę stringów
    const skillsAllRaw = await getCvSkills(conn, cvId);
    const skillsAll = skillsAllRaw.map((s) => s.name);

    // 2. Doświadczenie
    const experienceRaw = await getExperience(conn, cvId);
    const experience = await Promise.all(
      experienceRaw.map(async (exp) => {
        const skills = await getExperienceSkills(conn, exp.id);
        return {
          ...exp,
          skills: skills.map((s) => s.name), // Zmieniamy obiekty na stringi
        };
      }),
    );

    // 3. Edukacja
    const educationRaw = await getEducation(conn, cvId);
    const education = await Promise.all(
      educationRaw.map(async (edu) => {
        const skills = await getEducationSkills(conn, edu.id);
        return {
          ...edu,
          skills: skills.map((s) => s.name), // Zmieniamy obiekty na stringi
        };
      }),
    );

    // 4. Kursy
    const coursesRaw = await getCourses(conn, cvId);
    const courses = await Promise.all(
      coursesRaw.map(async (course) => {
        const skills = await getCourseSkills(conn, course.id);
        return {
          ...course,
          skills: skills.map((s) => s.name), // Zmieniamy obiekty na stringi
        };
      }),
    );
    const links = await getCvLinks(conn, cvId);
    const languages = await getCvLanguages(conn, cvId);
    return {
      ...cv,
      selectedImage: cv.imageId
        ? { id: cv.imageId, image_path: cv.imagePath }
        : null,
      links,
      languages,
      skillsAll,
      experience,
      education,
      courses,
    };
  } finally {
    conn.release();
  }
};
export const saveFullCV = async (connection, userId, data) => {
  // 1. Dane osobowe (UPSERT - aktualizuje jeśli user_id już istnieje)
  const personalDataId = await savePersonalData(connection, userId, data);

  // 2. Nagłówek CV (Tworzenie lub Aktualizacja)
  const cvId = await saveCVHeader(connection, userId, personalDataId, data);

  // 3. Jeśli to edycja (mamy data.id), czyścimy stare powiązania przed zapisem nowych
  if (data.id) {
    await clearRelatedTables(connection, cvId);
  }

  // 4. Zapisywanie sekcji powiązanych
  await saveSkillsAll(connection, cvId, data.skillsAll);
  await saveExperience(connection, cvId, data.experience || []);
  await saveEducation(connection, cvId, data.education || []);
  await saveCourses(connection, cvId, data.courses || []);
  await saveLinks(connection, cvId, data.links);
  await saveLanguages(connection, cvId, data.languages);

  return cvId;
};
// Copy CV
export const duplicateCvService = async (cvId, userId) => {
  const connection = await getPool().getConnection();

  try {
    await connection.beginTransaction();

    const originalCv = await getCvById(connection, cvId, userId);
    if (!originalCv) {
      throw { status: 404, message: "Nie znaleziono CV" };
    }

    const newCvId = await cloneCv(connection, originalCv, userId);

    await cloneCvSkills(connection, cvId, newCvId);
    await cloneExperience(connection, cvId, newCvId);
    await cloneEducation(connection, cvId, newCvId);
    await cloneCourses(connection, cvId, newCvId);
    await cloneCvLinks(connection, cvId, newCvId);
    await cloneCvLanguages(connection, cvId, newCvId);

    await connection.commit();
    return newCvId;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};
