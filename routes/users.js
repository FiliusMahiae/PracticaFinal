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

/**
 * @openapi
 * /api/users/register:
 *   post:
 *     tags:
 *       - User
 *     summary: Registrar un nuevo usuario
 *     description: Crea un nuevo usuario y envía por email un código de verificación.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "sergio.mahiarello@gmail.com"
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "password123"
 *     responses:
 *       '200':
 *         description: Usuario creado correctamente y token devuelto
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: Token JWT de sesión
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 user:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: "6437fc22d3c59af09c16f3e2"
 *                     email:
 *                       type: string
 *                       example: "nuevo@usuario.com"
 *                     status:
 *                       type: number
 *                       example: 0
 *                     role:
 *                       type: string
 *                       example: "user"
 *       '409':
 *         description: El usuario ya existe
 *       '422':
 *         description: Datos de validación incorrectos (email/password inválidos)
 *       '500':
 *         description: Error interno del servidor
 */
router.post("/register", validateUser, register);

/**
 * @openapi
 * /api/users/validation:
 *   put:
 *     tags:
 *       - User
 *     summary: Validar el email del usuario
 *     description: Confirma el email usando el código recibido. Requiere JWT del usuario.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *             properties:
 *               code:
 *                 type: string
 *                 example: "597356"
 *     responses:
 *       '200':
 *         description: Email validado correctamente
 *       '400':
 *         description: Código inválido (quedan intentos)
 *       '403':
 *         description: Número máximo de intentos alcanzado
 *       '404':
 *         description: Usuario no encontrado
 *       '500':
 *         description: Error interno del servidor
 */
router.put("/validation", auth, validateEmailCode, validateEmail);

/**
 * @openapi
 * /api/users/login:
 *   post:
 *     tags:
 *       - User
 *     summary: Iniciar sesión
 *     description: Inicia sesión con un email y contraseña válidos, devolviendo un token JWT.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "test@example.com"
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "password123"
 *     responses:
 *       '200':
 *         description: Inicio de sesión exitoso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 user:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     status:
 *                       type: number
 *                     role:
 *                       type: string
 *       '400':
 *         description: Credenciales incorrectas (email inexistente o contraseña inválida)
 *       '422':
 *         description: Campos de validación inválidos (p.ej., email mal formado)
 *       '500':
 *         description: Error interno del servidor
 */
router.post("/login", validateLogin, login);

/**
 * @openapi
 * /api/users/onboarding/personal:
 *   put:
 *     tags:
 *       - User
 *     summary: Actualizar datos personales
 *     description: Actualiza nombre, apellidos, nif y dirección del usuario. Requiere JWT.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre:
 *                 type: string
 *                 example: "Sergio"
 *               apellidos:
 *                 type: string
 *                 example: "Mahía"
 *               nif:
 *                 type: string
 *                 example: "12345678A"
 *               address:
 *                 type: object
 *                 properties:
 *                   street:
 *                     type: string
 *                     example: "Carlos V"
 *                   number:
 *                     type: integer
 *                     example: 22
 *                   postal:
 *                     type: integer
 *                     example: 28936
 *                   city:
 *                     type: string
 *                     example: "Móstoles"
 *                   province:
 *                     type: string
 *                     example: "Madrid"
 *     responses:
 *       '200':
 *         description: Datos personales actualizados correctamente
 *       '404':
 *         description: Usuario no encontrado
 *       '500':
 *         description: Error interno del servidor
 */
router.put(
  "/onboarding/personal",
  auth,
  validatePersonalData,
  updatePersonalData
);

/**
 * @openapi
 * /api/users/onboarding/company:
 *   patch:
 *     tags:
 *       - User
 *     summary: Actualizar datos de la compañía
 *     description: Actualiza la información de la empresa (companyName, cif, dirección, etc.) o la replica del usuario si es "autonomo". Requiere JWT.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               companyName:
 *                 type: string
 *                 example: "SERVITOP, SL"
 *               cif:
 *                 type: string
 *                 example: "B12345678"
 *               street:
 *                 type: string
 *                 example: "Carlos V"
 *               number:
 *                 type: integer
 *                 example: 22
 *               postal:
 *                 type: integer
 *                 example: 28936
 *               city:
 *                 type: string
 *                 example: "Móstoles"
 *               province:
 *                 type: string
 *                 example: "Madrid"
 *     responses:
 *       '200':
 *         description: Datos de la compañía actualizados correctamente
 *       '404':
 *         description: Usuario no encontrado
 *       '500':
 *         description: Error interno del servidor
 */
router.patch(
  "/onboarding/company",
  auth,
  validateCompanyData,
  updateCompanyData
);

/**
 * @openapi
 * /api/users/logo:
 *   patch:
 *     tags:
 *       - User
 *     summary: Actualizar el logo
 *     description: Sube un archivo de imagen a IPFS y guarda la URL resultante como 'logo' del usuario.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       '200':
 *         description: Logo actualizado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Logo actualizado correctamente"
 *                 logo:
 *                   type: string
 *                   example: "https://gateway.pinata.cloud/ipfs/QmFirma123.png"
 *       '400':
 *         description: No se ha proporcionado ninguna imagen
 *       '500':
 *         description: Error interno del servidor
 */
router.patch("/logo", auth, uploadMiddlewareMemory.single("image"), updateLogo);

/**
 * @openapi
 * /api/users/me:
 *   get:
 *     tags:
 *       - User
 *     summary: Obtener perfil del usuario
 *     description: Devuelve los datos completos del usuario a partir de su token JWT.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Perfil del usuario
 *       '404':
 *         description: Usuario no encontrado
 *       '500':
 *         description: Error interno del servidor
 */
router.get("/me", auth, getProfile);

/**
 * @openapi
 * /api/users:
 *   delete:
 *     tags:
 *       - User
 *     summary: Eliminar usuario
 *     description: Elimina al usuario actual (soft-delete por defecto; usa `?soft=false` para hard-delete). Requiere JWT.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: soft
 *         schema:
 *           type: string
 *           example: "false"
 *         description: Si es `"false"`, se realiza un hard delete
 *     responses:
 *       '200':
 *         description: Usuario eliminado (soft o hard)
 *       '404':
 *         description: Usuario no encontrado
 *       '500':
 *         description: Error interno del servidor
 */
router.delete("/", auth, deleteUser);

/**
 * @openapi
 * /api/users/recover/request:
 *   post:
 *     tags:
 *       - User
 *     summary: Solicitar recuperación de contraseña
 *     description: Genera un código y un token de recuperación para el usuario indicado por email.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "test@example.com"
 *     responses:
 *       '200':
 *         description: Código de recuperación generado y token de recuperación retornado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Código de recuperación enviado"
 *                 recoveryToken:
 *                   type: string
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *       '404':
 *         description: Usuario no encontrado
 *       '500':
 *         description: Error interno del servidor
 */
router.post(
  "/recover/request",
  validateRecoveryRequest,
  requestPasswordRecovery
);

/**
 * @openapi
 * /api/users/recover/reset:
 *   put:
 *     tags:
 *       - User
 *     summary: Resetear contraseña
 *     description: Cambia la contraseña usando el token de recuperación y el código recibido.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - newPassword
 *             properties:
 *               code:
 *                 type: string
 *                 example: "117912"
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 example: "newPassword123"
 *     responses:
 *       '200':
 *         description: Contraseña actualizada correctamente
 *       '400':
 *         description: Código incorrecto
 *       '404':
 *         description: Usuario no encontrado
 *       '500':
 *         description: Error interno del servidor
 */
router.put(
  "/recover/reset",
  authRecovery,
  validatePasswordReset,
  resetPassword
);

/**
 * @openapi
 * /api/users/invite:
 *   post:
 *     tags:
 *       - User
 *     summary: Invitar a un nuevo usuario
 *     description: Crea un usuario con rol "guest" copiando los datos de empresa del invitador. Requiere JWT.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "invitee@example.com"
 *     responses:
 *       '200':
 *         description: Usuario invitado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Usuario invitado correctamente"
 *                 tempPassword:
 *                   type: string
 *                   example: "abc123xy"
 *       '400':
 *         description: Email no proporcionado
 *       '404':
 *         description: Invitador no encontrado
 *       '409':
 *         description: El usuario invitado ya existe
 *       '500':
 *         description: Error interno del servidor
 */
router.post("/invite", auth, inviteUser);

module.exports = router;
