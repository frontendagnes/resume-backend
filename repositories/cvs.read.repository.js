export const getCvCore = async (conn, cvId, userId) => {
  const [rows] = await conn.execute(
    `SELECT
      c.id,
      c.title,
      c.target_position AS targetPosition,
      c.clause,
      pd.first_name AS firstName,
      pd.last_name AS lastName,
      pd.email,
      pd.phone,
      pd.city,
      i.id AS imageId,
      i.image_path AS imagePath
     FROM cvs c
     LEFT JOIN personal_data pd ON c.personal_data_id = pd.id
     LEFT JOIN images i ON c.image_id = i.id
     WHERE c.id = ? AND c.user_id = ?`,
    [cvId, userId],
  );
  return rows[0];
};

export const getCvSkills = async (conn, cvId) => {
  const [rows] = await conn.execute(
    `SELECT
      s.id,
      s.name,
      cs.level,
      cs.order_index
     FROM cv_skills cs
     JOIN skills s ON s.id = cs.skill_id
     WHERE cs.cv_id = ?
     ORDER BY cs.order_index`,
    [cvId],
  );
  return rows;
};

export const getExperience = async (conn, cvId) => {
  const [rows] = await conn.execute(
    `SELECT
      id,
      company AS title,
      position,
      start_date AS startDate,
      end_date AS endDate,
      description
     FROM experience
     WHERE cv_id = ?`,
    [cvId],
  );
  return rows;
};

export const getExperienceSkills = async (conn, experienceId) => {
  const [rows] = await conn.execute(
    `SELECT
      s.id,
      s.name,
      es.description
     FROM experience_skills es
     JOIN skills s ON s.id = es.skill_id
     WHERE es.experience_id = ?`,
    [experienceId],
  );
  return rows;
};

export const getEducation = async (conn, cvId) => {
  const [rows] = await conn.execute(
    `SELECT
      id,
      school AS title,
      degree,
      start_date AS startDate,
      end_date AS endDate
     FROM education
     WHERE cv_id = ?`,
    [cvId],
  );
  return rows;
};

export const getEducationSkills = async (conn, educationId) => {
  const [rows] = await conn.execute(
    `SELECT
      s.id,
      s.name,
      es.description
     FROM education_skills es
     JOIN skills s ON s.id = es.skill_id
     WHERE es.education_id = ?`,
    [educationId],
  );
  return rows;
};

export const getCourses = async (conn, cvId) => {
  const [rows] = await conn.execute(
    `SELECT
      id,
      title,
      provider,
      start_date AS startDate,
      end_date AS endDate,
      description
     FROM courses
     WHERE cv_id = ?`,
    [cvId],
  );
  return rows;
};

export const getCourseSkills = async (conn, courseId) => {
  const [rows] = await conn.execute(
    `SELECT
      s.id,
      s.name,
      cs.description
     FROM courses_skills cs
     JOIN skills s ON s.id = cs.skill_id
     WHERE cs.courses_id = ?`,
    [courseId],
  );
  return rows;
};
