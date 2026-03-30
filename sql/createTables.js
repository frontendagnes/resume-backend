// -- ========================
// -- 1️⃣ USERS
// -- ========================
export const createUsersTableSQL = `
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(50) NOT NULL,
            email VARCHAR(100) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            avatar_url VARCHAR(255),
            role ENUM('buyer', 'admin') NOT NULL DEFAULT 'buyer',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;

export const createTableImagesSQL = `CREATE TABLE IF NOT EXISTS images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    image_path VARCHAR(255) NOT NULL,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;

export const createTableUserPreferences = `
CREATE TABLE IF NOT EXISTS user_preferences (
    user_id INT PRIMARY KEY,
    default_personal_id INT NULL,
    default_image_id INT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (default_personal_id) REFERENCES personal_data(id) ON DELETE SET NULL,
    FOREIGN KEY (default_image_id) REFERENCES images(id) ON DELETE SET NULL
);
`;
// export const createTableUserProfile = `CREATE TABLE IF NOT EXISTS user_profiles (
//     user_id INT PRIMARY KEY,
//     first_name VARCHAR(100),
//     last_name VARCHAR(100),
//     email VARCHAR(255),
//     phone VARCHAR(50),
//     city VARCHAR(100),
//     summary TEXT,
//     FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
// );`;
// -- ========================
// -- 2️⃣ CVS
// -- ========================
export const createCVsTableSQL = `CREATE TABLE IF NOT EXISTS cvs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    personal_data_id INT,
    image_id INT,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    title VARCHAR(255) NOT NULL,
    target_position VARCHAR(255) NOT NULL,
    clause TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (personal_data_id) REFERENCES personal_data(id) ON DELETE CASCADE,
    FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;
// --  ON DELETE RESTRICT lub
// --  ON DELETE CASCADE

// -- ========================
// -- 3️⃣ PERSONAL DATA
// -- ========================
export const createPersonalDataTableSQL = `CREATE TABLE IF NOT EXISTS personal_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(191),
    phone VARCHAR(50),
    city VARCHAR(100),

    UNIQUE KEY unique_user_email (user_id, email),
    UNIQUE KEY unique_user_phone (user_id, phone),

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;
// cv_id INT NOT NULL,
// -- ========================
// -- 4️⃣ SKILLS (słownik globalny)
// -- ========================
export const createSkillsTableSQL = `CREATE TABLE IF NOT EXISTS skills (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;

// -- ========================
// -- 5️⃣ CV_SKILLS (skills ogólne do CV)
// -- ========================
export const createTableCVSkillsSQL = `CREATE TABLE  IF NOT EXISTS cv_skills (
    cv_id INT NOT NULL,
    skill_id INT NOT NULL,
    level INT,
    order_index INT,
    PRIMARY KEY (cv_id, skill_id),
    FOREIGN KEY (cv_id) REFERENCES cvs(id) ON DELETE CASCADE,
    FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;

// -- ========================
// -- 6️⃣ EXPERIENCE
// -- ========================
export const createTableExperienceSQL = `CREATE TABLE  IF NOT EXISTS experience (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cv_id INT NOT NULL,
    company VARCHAR(255),
    position VARCHAR(255),
    start_date DATE,
    end_date DATE,
    description TEXT,
    FOREIGN KEY (cv_id) REFERENCES cvs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;

// -- ========================
// -- 7️⃣ EXPERIENCE_SKILLS
// -- ========================
export const createTableExperienceSkillsSQL = `CREATE TABLE  IF NOT EXISTS experience_skills (
    experience_id INT NOT NULL,
    skill_id INT NOT NULL,
    description TEXT,
    PRIMARY KEY (experience_id, skill_id),
    FOREIGN KEY (experience_id) REFERENCES experience(id) ON DELETE CASCADE,
    FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;


// -- ========================
// -- 8️⃣ EDUCATION
// -- ========================
export const createTableEducationSQL = `CREATE TABLE  IF NOT EXISTS education (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cv_id INT NOT NULL,
    school VARCHAR(255),
    degree VARCHAR(255),
    start_date DATE,
    end_date DATE,
    FOREIGN KEY (cv_id) REFERENCES cvs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;

// -- ========================
// -- 9️⃣ EDUCATION_SKILLS
// -- ========================
export const createTableEducationSkillsSQL = `CREATE TABLE  IF NOT EXISTS education_skills (
    education_id INT NOT NULL,
    skill_id INT NOT NULL,
    description TEXT,
    PRIMARY KEY (education_id, skill_id),
    FOREIGN KEY (education_id) REFERENCES education(id) ON DELETE CASCADE,
    FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;

export const createTableCoursesSQL = `CREATE TABLE  IF NOT EXISTS courses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cv_id INT NOT NULL,
    title VARCHAR(255),
    provider VARCHAR(255),
    start_date DATE,
    end_date DATE,
    description TEXT,
    FOREIGN KEY (cv_id) REFERENCES cvs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;

export const createTableCoursesSkillsSQL = `CREATE TABLE  IF NOT EXISTS courses_skills (
    courses_id INT NOT NULL,
    skill_id INT NOT NULL,
    description TEXT,
    PRIMARY KEY (courses_id, skill_id),
    FOREIGN KEY (courses_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;

export const createTableLinksSQL = `CREATE TABLE IF NOT EXISTS cv_links (
  id INT PRIMARY KEY AUTO_INCREMENT,
  cv_id INT,
  label VARCHAR(50),
  url VARCHAR(255),
  FOREIGN KEY (cv_id) REFERENCES cvs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;

export const createTableLanguageSQL = `CREATE TABLE IF NOT EXISTS cv_languages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  cv_id INT,
  language_name VARCHAR(50),
  level VARCHAR(20),
  FOREIGN KEY (cv_id) REFERENCES cvs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;
