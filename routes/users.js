const express = require("express");
const router = express.Router();
const { validateUser } = require("../validators/userValidator");
const { validateEmailCode } = require("../validators/emailValidator");
const { validateLogin } = require("../validators/loginValidator");
const { validatePersonalData } = require("../validators/personalValidator");
const { validateCompanyData } = require("../validators/companyValidator");
const {
  validateRecoveryRequest,
  validatePasswordReset,
} = require("../validators/passwordRecoveryValidator");

const {
  register,
  validateEmail,
  login,
  updatePersonalData,
  updateCompanyData,
  updateLogo,
  getProfile,
  deleteUser,
  requestPasswordRecovery,
  resetPassword,
  inviteUser,
} = require("../controllers/userController");
const auth = require("../middleware/auth");
const authRecovery = require("../middleware/authRecovery");
const { uploadMiddlewareMemory } = require("../utils/handleStorage");

// Registro de usuario
router.post("/register", validateUser, register);

// Validación de email (requiere token JWT)
router.put("/validation", auth, validateEmailCode, validateEmail);

// Login
router.post("/login", validateLogin, login);

// On boarding: actualización de datos personales
router.put(
  "/onboarding/personal",
  auth,
  validatePersonalData,
  updatePersonalData
);

// On boarding: actualización de datos de la compañía
router.patch(
  "/onboarding/company",
  auth,
  validateCompanyData,
  updateCompanyData
);

// Actualización del logo (PATCH)
// Se espera el campo "image" en el formulario, que se procesa con multer en memoria.
router.patch("/logo", auth, uploadMiddlewareMemory.single("image"), updateLogo);

// GET: Obtener perfil del usuario (a partir del token JWT)
router.get("/me", auth, getProfile);

// DELETE: Eliminar usuario (soft por defecto; para hard delete, usar ?soft=false)
router.delete("/", auth, deleteUser);

// Recuperación de contraseña:
// Paso 1: Solicitar recuperación: se envía el email, se genera un código y se retorna un token de recuperación.
router.post(
  "/recover/request",
  validateRecoveryRequest,
  requestPasswordRecovery
);

// Paso 2: Resetear contraseña: se envía el código recibido y la nueva contraseña, usando el token de recuperación.
router.put(
  "/recover/reset",
  authRecovery,
  validatePasswordReset,
  resetPassword
);

// Invitar a otros compañeros (crea usuario con role "guest" copiando datos de compañía)
router.post("/invite", auth, inviteUser);

module.exports = router;
