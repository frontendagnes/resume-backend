// clone
export const getCvById = async (conn, cvId, userId) => {
  const [rows] = await conn.execute(
    "SELECT * FROM cvs WHERE id = ? AND user_id = ?",
    [cvId, userId],
  );
  return rows[0];
};

export const cloneCv = async (conn, original, userId) => {
  const [result] = await conn.execute(
    `INSERT INTO cvs (
      user_id, personal_data_id, image_id,
      first_name, last_name, title,
      target_position, clause
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      original.personal_data_id,
      original.image_id,
      original.first_name,
      original.last_name,
      `Kopia: ${original.title}`,
      original.target_position,
      original.clause,
    ],
  );

  return result.insertId;
};

export const cloneCvSkills = async (conn, oldCvId, newCvId) => {
  await conn.execute(
    `INSERT INTO cv_skills (cv_id, skill_id, level, order_index)
     SELECT ?, skill_id, level, order_index
     FROM cv_skills
     WHERE cv_id = ?`,
    [newCvId, oldCvId],
  );
};
export const cloneCvLinks = async (conn, oldCvId, newCvId) => {
  await conn.execute(
    `INSERT INTO cv_links (cv_id, label, url)
     SELECT ?, label, url
     FROM cv_links
     WHERE cv_id = ?`,
    [newCvId, oldCvId],
  );
};

export const cloneCvLanguages = async (conn, oldCvId, newCvId) => {
  await conn.execute(
    `INSERT INTO cv_languages (cv_id, language_name, level)
     SELECT ?, language_name, level
     FROM cv_languages
     WHERE cv_id = ?`,
    [newCvId, oldCvId],
  );
};

export const cloneExperience = async (conn, oldCvId, newCvId) => {
  const [rows] = await conn.execute(
    "SELECT id FROM experience WHERE cv_id = ?",
    [oldCvId],
  );

  for (const row of rows) {
    const [res] = await conn.execute(
      `INSERT INTO experience (
        cv_id, company, position, start_date, end_date, description
      )
      SELECT ?, company, position, start_date, end_date, description
      FROM experience WHERE id = ?`,
      [newCvId, row.id],
    );

    await conn.execute(
      `INSERT INTO experience_skills (experience_id, skill_id, description)
       SELECT ?, skill_id, description
       FROM experience_skills
       WHERE experience_id = ?`,
      [res.insertId, row.id],
    );
  }
};

export const cloneEducation = async (conn, oldCvId, newCvId) => {
  const [rows] = await conn.execute(
    "SELECT id FROM education WHERE cv_id = ?",
    [oldCvId],
  );

  for (const row of rows) {
    const [res] = await conn.execute(
      `INSERT INTO education (
        cv_id, school, degree, start_date, end_date
      )
      SELECT ?, school, degree, start_date, end_date
      FROM education WHERE id = ?`,
      [newCvId, row.id],
    );

    await conn.execute(
      `INSERT INTO education_skills (education_id, skill_id, description)
       SELECT ?, skill_id, description
       FROM education_skills
       WHERE education_id = ?`,
      [res.insertId, row.id],
    );
  }
};

export const cloneCourses = async (conn, oldCvId, newCvId) => {
  const [rows] = await conn.execute("SELECT id FROM courses WHERE cv_id = ?", [
    oldCvId,
  ]);

  for (const row of rows) {
    const [res] = await conn.execute(
      `INSERT INTO courses (
        cv_id, title, provider, start_date, end_date, description
      )
      SELECT ?, title, provider, start_date, end_date, description
      FROM courses WHERE id = ?`,
      [newCvId, row.id],
    );

    await conn.execute(
      `INSERT INTO courses_skills (courses_id, skill_id, description)
       SELECT ?, skill_id, description
       FROM courses_skills
       WHERE courses_id = ?`,
      [res.insertId, row.id],
    );
  }
};

export const savePersonalData = async (connection, userId, data) => {
  const [result] = await connection.execute(
    `INSERT INTO personal_data (user_id, first_name, last_name, email, phone, city)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       id=LAST_INSERT_ID(id),
       first_name=VALUES(first_name),
       last_name=VALUES(last_name),
       phone=VALUES(phone),
       city=VALUES(city)`,
    [userId, data.firstName, data.lastName, data.email, data.phone, data.city],
  );
  return result.insertId;
};

export const saveCVHeader = async (
  connection,
  userId,
  personalDataId,
  data,
) => {
  const imageId = data.selectedImage?.id || null;

  if (data.id) {
    // TRYB EDYCJI
    await connection.execute(
      `UPDATE cvs
       SET title = ?, target_position = ?, image_id = ?, personal_data_id = ?,
           first_name = ?, last_name = ?, clause = ?
       WHERE id = ? AND user_id = ?`,
      [
        data.title,
        data.targetPosition,
        imageId,
        personalDataId,
        data.firstName,
        data.lastName,
        data.clause,
        data.id,
        userId,
      ],
    );
    return data.id;
  } else {
    // TRYB NOWEGO CV
    const [result] = await connection.execute(
      `INSERT INTO cvs (user_id, personal_data_id, image_id, title, target_position, first_name, last_name, clause)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        personalDataId,
        imageId,
        data.title,
        data.targetPosition,
        data.firstName,
        data.lastName,
        data.clause,
      ],
    );
    return result.insertId;
  }
};

export const clearRelatedTables = async (connection, cvId) => {
  // Czyścimy tabele w odpowiedniej kolejności (najpierw te z kluczami obcymi do exp/courses)
  await connection.execute(
    "DELETE FROM experience_skills WHERE experience_id IN (SELECT id FROM experience WHERE cv_id = ?)",
    [cvId],
  );
  await connection.execute(
    "DELETE FROM courses_skills WHERE courses_id IN (SELECT id FROM courses WHERE cv_id = ?)",
    [cvId],
  );

  const tables = [
    "cv_skills",
    "experience",
    "education",
    "courses",
    "cv_links",
    "cv_languages",
  ];
  for (const table of tables) {
    await connection.execute(`DELETE FROM ${table} WHERE cv_id = ?`, [cvId]);
  }
};

export const saveSkillsAll = async (connection, cvId, skills) => {
  if (!skills?.length) return;
  for (const skillName of skills) {
    const skillId = await getOrCreateSkillId(connection, skillName);
    await connection.execute(
      "INSERT INTO cv_skills (cv_id, skill_id) VALUES (?, ?)",
      [cvId, skillId],
    );
  }
};

export const saveExperience = async (connection, cvId, experience) => {
  if (!experience?.length) return;
  for (const exp of experience) {
    const [res] = await connection.execute(
      `INSERT INTO experience (cv_id, company, position, start_date, end_date, description)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        cvId,
        exp.title,
        exp.position || "Stanowisko",
        exp.startDate || null,
        exp.endDate || null,
        exp.description,
      ],
    );
    if (exp.skills?.length) {
      await saveItemSkills(
        connection,
        "experience_skills",
        "experience_id",
        res.insertId,
        exp.skills,
      );
    }
  }
};

export const saveEducation = async (connection, cvId, education) => {
  if (!education?.length) return;
  for (const edu of education) {
    const [res] = await connection.execute(
      "INSERT INTO education (cv_id, school, degree, start_date, end_date) VALUES (?, ?, ?, ?, ?)",
      [
        cvId,
        edu.title,
        edu.degree || "Stopień",
        edu.startDate || null,
        edu.endDate || null,
      ],
    );
    if (edu.skills?.length) {
      await saveItemSkills(
        connection,
        "education_skills",
        "education_id",
        res.insertId,
        edu.skills,
      );
    }
  }
};

export const saveCourses = async (connection, cvId, courses) => {
  if (!courses?.length) return;
  for (const course of courses) {
    const [res] = await connection.execute(
      "INSERT INTO courses (cv_id, title, provider, start_date, end_date, description) VALUES (?, ?, ?, ?, ?, ?)",
      [
        cvId,
        course.title,
        course.provider,
        course.startDate || null,
        course.endDate || null,
        course.description,
      ],
    );
    if (course.skills?.length) {
      await saveItemSkills(
        connection,
        "courses_skills",
        "courses_id",
        res.insertId,
        course.skills,
      );
    }
  }
};

async function saveItemSkills(connection, table, foreignKey, parentId, skills) {
  for (const skillName of skills) {
    const skillId = await getOrCreateSkillId(connection, skillName);
    await connection.execute(
      `INSERT INTO ${table} (${foreignKey}, skill_id) VALUES (?, ?)`,
      [parentId, skillId],
    );
  }
}

const createSlug = (name) => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // usuń znaki specjalne
    .replace(/[\s_-]+/g, "-") // zamień spacje na myślniki
    .replace(/^-+|-+$/g, ""); // usuń myślniki z końców
};

async function getOrCreateSkillId(connection, skillInput) {
  // 1. Sprawdź czy skillInput w ogóle istnieje
  if (!skillInput) return null;

  // 2. WYDOBĄDŹ TEKST: Jeśli to obiekt, weź .name, jeśli string, użyj go bezpośrednio
  const name = typeof skillInput === "object" ? skillInput.name : skillInput;

  // 3. Dodatkowe zabezpieczenie przed pustym stringiem po wyciągnięciu z obiektu
  if (!name || typeof name !== "string") return null;

  const [rows] = await connection.execute(
    "SELECT id FROM skills WHERE name = ?",
    [name],
  );
  if (rows.length > 0) return rows[0].id;

  const slug = createSlug(name);

  const [result] = await connection.execute(
    "INSERT INTO skills (name, slug) VALUES (?, ?)",
    [name, slug],
  );
  return result.insertId;
}

// --- LINKS ---
export const getCvLinks = async (conn, cvId) => {
  const [rows] = await conn.execute(
    "SELECT id, label, url FROM cv_links WHERE cv_id = ?",
    [cvId],
  );
  return rows;
};

export const saveLinks = async (conn, cvId, links) => {
  if (!links?.length) return;
  for (const link of links) {
    await conn.execute(
      "INSERT INTO cv_links (cv_id, label, url) VALUES (?, ?, ?)",
      [cvId, link.label, link.url],
    );
  }
};

// --- LANGUAGES ---
export const getCvLanguages = async (conn, cvId) => {
  const [rows] = await conn.execute(
    "SELECT id, language_name, level FROM cv_languages WHERE cv_id = ?",
    [cvId],
  );
  return rows;
};

export const saveLanguages = async (conn, cvId, languages) => {
  if (!languages?.length) return;
  for (const lang of languages) {
    // Sprawdzamy oba warianty: lang.name (z frontu) LUB lang.language_name (z bazy)
    const name = lang.name || lang.language_name;

    await conn.execute(
      "INSERT INTO cv_languages (cv_id, language_name, level) VALUES (?, ?, ?)",
      [
        cvId,
        name ?? null, // Jeśli name jest undefined, wstaw null
        lang.level ?? null,
      ],
    );
  }
};
// --- CLONING FUNCTIONS ---
export const cloneLinks = async (conn, oldCvId, newCvId) => {
  await conn.execute(
    "INSERT INTO cv_links (cv_id, label, url) SELECT ?, label, url FROM cv_links WHERE cv_id = ?",
    [newCvId, oldCvId],
  );
};

export const cloneLanguages = async (conn, oldCvId, newCvId) => {
  await conn.execute(
    "INSERT INTO cv_languages (cv_id, language_name, level) SELECT ?, name, level FROM cv_languages WHERE cv_id = ?",
    [newCvId, oldCvId],
  );
};
