// middleware/validation.js

// 1. Jawny eksport funkcji
export const validateRegistration = (req, res, next) => {
  const { username, email, password, confirmPassword } = req.body;

  if (!username || !email || !password || !confirmPassword) {
    return res.status(400).json({
      message:
        "Wszystkie pola (nazwa użytkownika, email, hasło, powtórzenie hasła) są wymagane.",
    });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ message: "Hasła nie są zgodne." });
  } // Jeśli wszystko jest OK, przechodzimy dalej

  next();
};

// 2. Jawny eksport funkcji
export const validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  if (!email) {
    return res.status(400).json({ message: "Podanie email jest wymagane" });
  }
  if (!password) {
    return res.status(400).json({ message: "Podanie hasła jest wymagane" });
  }

  next();
};