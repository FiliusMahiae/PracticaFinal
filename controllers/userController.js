/****************************************************************************************
 *  USER CONTROLLER
 *  --------------------------------------------------------------------------------------
 *  Gestiona todo el ciclo de vida del usuario:
 *    -> Registro y validación de email
 *    -> Login y emisión de JWT
 *    -> Perfil (lectura / actualización de datos personales, empresa y logo)
 *    -> Gestión de invitados y roles
 *    -> Recuperación y reseteo de contraseña
 *    -> Eliminación (soft / hard)
 *
 *  Las utilidades externas se encargan de:
 *    encrypt / compare      -> hashing de contraseñas (bcrypt)
 *    tokenSign              -> generación de JWT “normal”
 *    tokenSignRecovery      -> JWT con marca recover=true
 *    handleHttpError        -> respuesta homogénea de errores
 *    uploadToPinata         -> carga de archivos a IPFS vía Pinata
 *    sendEmail              -> envío de correos SMTP (OAuth2 Gmail)
 ****************************************************************************************/

const User = require("../models/User");
const { encrypt, compare } = require("../utils/handlePassword");
const { tokenSign } = require("../utils/handleJwt");
const { handleHttpError } = require("../utils/handleError");
const uploadToPinata = require("../utils/handleUploadIPFS");
const { tokenSignRecovery } = require("../utils/handleJwt");
const { sendEmail } = require("../utils/hanldeMail");
const { matchedData } = require("express-validator");

/* 6‑dígitos aleatorios -> código de verificación / recuperación */
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/* ======================================================================================
 *  REGISTRO
 *  --------------------------------------------------------------------------------------
 *  1) Verifica duplicados
 *  2) Hashea la contraseña
 *  3) Genera verificationCode y lo envía por email
 *  4) Guarda usuario -> user.status = 0 (pendiente)
 *  5) Devuelve JWT para sesión provisional (aun sin validar email)
 * ==================================================================================== */
const register = async (req, res) => {
  const data = matchedData(req);
  const { email, password, autonomo } = data;
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return handleHttpError(res, "El usuario ya existe.", 409);
    }

    const hashedPassword = await encrypt(password);
    const verificationCode = generateVerificationCode();

    const user = new User({
      email,
      password: hashedPassword,
      verificationCode,
      attempts: process.env.MAX_ATTEMPTS || 3,
      isAutonomo: autonomo || false,
    });
    await user.save();

    // Envío de código de verificación
    // await sendEmail({
    //   from: `"PracticaFinal" <${process.env.EMAIL}>`,
    //   to: email,
    //   subject: "Código de verificación",
    //   text: `Tu código de verificación es: ${verificationCode}`,
    //   html: `<p>Tu código de verificación es: <b>${verificationCode}</b></p>`,
    // });

    const token = await tokenSign(user); // SESIÓN ABIERTA
    res.json({
      token,
      user: {
        email: user.email,
      },
    });
  } catch (error) {
    console.error(error);
    return handleHttpError(res, "Error interno del servidor", 500);
  }
};

/* ======================================================================================
 *  VALIDAR EMAIL
 *  --------------------------------------------------------------------------------------
 *  • Compara el código enviado con el almacenado
 *  • Maneja intentos restantes -> user.attempts
 *  • Cambia status = 1 al validar
 * ==================================================================================== */
const validateEmail = async (req, res) => {
  const data = matchedData(req);
  const { code } = data;
  const userId = req.user._id;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return handleHttpError(res, "Usuario no encontrado", 404);
    }

    // Caso exitoso
    if (user.verificationCode === code) {
      user.status = 1; // validado
      user.verificationCode = null; // limpiamos el código
      await user.save();
      res.json({ message: "Email validado correctamente" });
      return;
    }

    // Caso de código inválido: decrementamos intentos y guardamos
    user.attempts = Math.max(user.attempts - 1, 0);
    await user.save();

    // Si ya no quedan intentos, bloqueamos
    if (user.attempts === 0) {
      return handleHttpError(res, "Número máximo de intentos alcanzado", 403);
    }

    // Si quedan intentos, informamos al usuario
    return handleHttpError(
      res,
      `Código inválido. Quedan ${user.attempts} intentos`,
      400
    );
  } catch (error) {
    console.error(error);
    handleHttpError(res, "Error interno del servidor", 500);
  }
};

/* ======================================================================================
 *  LOGIN
 *  --------------------------------------------------------------------------------------
 *  • Comprueba existencia de email
 *  • Hace bcrypt.compare del password
 *  • Devuelve JWT + datos básicos
 * ==================================================================================== */
const login = async (req, res) => {
  const data = matchedData(req);
  const { email, password } = data;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return handleHttpError(res, "Credenciales incorrectas", 400);
    }
    const isMatch = await compare(password, user.password);
    if (!isMatch) {
      return handleHttpError(res, "Credenciales incorrectas", 400);
    }
    const token = await tokenSign(user);
    res.json({
      token,
      user: {
        email: user.email,
      },
    });
  } catch (error) {
    console.error(error);
    handleHttpError(res, "Error interno del servidor", 500);
  }
};

/* ======================================================================================
 *  ACTUALIZAR DATOS PERSONALES
 *  --------------------------------------------------------------------------------------
 *  -> Permite modificar nombre, apellidos, nif y dirección
 * ==================================================================================== */
const updatePersonalData = async (req, res) => {
  const data = matchedData(req);
  const { nombre, apellidos, nif, address } = data;
  const userId = req.user._id;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return handleHttpError(res, "Usuario no encontrado", 404);
    }

    user.name = nombre;
    user.surnames = apellidos;
    user.nif = nif;

    if (address) {
      user.address = {
        street: address.street || "",
        number: address.number || null,
        postal: address.postal || null,
        city: address.city || "",
        province: address.province || "",
      };
    }

    await user.save();

    res.json({
      message: "Datos personales actualizados correctamente",
      user: {
        _id: user._id,
        name: user.name,
        surnames: user.surnames,
        nif: user.nif,
        address: user.address,
      },
    });
  } catch (error) {
    console.error(error);
    handleHttpError(res, "Error interno del servidor", 500);
  }
};

/* ======================================================================================
 *  ACTUALIZAR DATOS DE COMPAÑÍA
 *  --------------------------------------------------------------------------------------
 *  • Para autonomo clona los datos personales -> company
 *  • Para otros roles usa los campos proporcionados en el body
 * ==================================================================================== */
const updateCompanyData = async (req, res) => {
  const data = matchedData(req, { locations: ["body"] });
  const { companyName, cif, street, number, postal, city, province } = data;
  const userId = req.user._id;

  try {
    const user = await User.findById(userId);
    if (!user) {
      handleHttpError(res, "Usuario no encontrado", 404);
      return;
    }

    if (user.role === "guest") {
      handleHttpError(
        res,
        "Los usuarios invitados no pueden modificar la compañía",
        403
      );
      return;
    }

    if (user.isAutonomo) {
      user.company = {
        name: [user.name, user.surnames].filter(Boolean).join(" "),
        cif: user.nif,
        street: user.address?.street || "",
        number: user.address?.number || null,
        postal: user.address?.postal || null,
        city: user.address?.city || "",
        province: user.address?.province || "",
      };
    } else {
      user.company = {
        name: companyName,
        cif,
        street,
        number,
        postal,
        city,
        province,
      };
    }

    await user.save();
    res.json({
      message: "Datos de la compañía actualizados correctamente",
      company: user.company,
    });
  } catch (error) {
    console.error(error);
    handleHttpError(res, "Error interno del servidor", 500);
  }
};

/* ======================================================================================
 *  ACTUALIZAR LOGO
 *  --------------------------------------------------------------------------------------
 *  • Recibe un archivo (multer -> req.file.buffer)
 *  • Sube la imagen a IPFS vía Pinata y guarda la URL en user.logo
 *  • Devuelve la URL final
 * ==================================================================================== */
const updateLogo = async (req, res) => {
  try {
    const userId = req.user._id;
    if (!req.file) {
      return handleHttpError(res, "No se ha proporcionado ninguna imagen", 400);
    }

    // 1) Subida a IPFS
    const fileBuffer = req.file.buffer;
    const fileName = req.file.originalname;
    const pinataResponse = await uploadToPinata(fileBuffer, fileName);
    const ipfsFile = pinataResponse.IpfsHash;
    const ipfs = `https://${process.env.PINATA_GATEWAY_URL}/ipfs/${ipfsFile}`;

    // 2) Actualiza documento usuario y devuelve el nuevo logo
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { logo: ipfs },
      { new: true }
    );
    res.json({
      message: "Logo actualizado correctamente",
      logo: updatedUser.logo,
    });
  } catch (err) {
    console.error(err);
    handleHttpError(res, "ERROR_UPLOAD_LOGO", 500);
  }
};

/* ======================================================================================
 *  GET PROFILE -> Devuelve al usuario completo a partir del JWT
 * ==================================================================================== */
const getProfile = async (req, res) => {
  try {
    const query = User.findById(req.user._id);
    if (req.user.role === "guest") {
      query.populate("companyOwner", "company");
    }
    const user = await query;

    if (!user) {
      handleHttpError(res, "Usuario no encontrado", 404);
      return;
    }

    const companyData =
      user.role === "guest" && user.companyOwner
        ? user.companyOwner.company
        : user.company;

    res.json({
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        surnames: user.surnames,
        nif: user.nif,
        address: user.address,
        company: companyData,
        logo: user.logo,
      },
    });
  } catch (error) {
    console.error(error);
    handleHttpError(res, "Error interno del servidor", 500);
  }
};

/* ======================================================================================
 *  DELETE USER -> Soft o Hard
 *  --------------------------------------------------------------------------------------
 *  • soft=true  (por defecto) -> .delete() (mongoose‑delete) guarda registro
 *  • soft=false               -> remove definitivo con deleteOne()
 * ==================================================================================== */
const deleteUser = async (req, res) => {
  try {
    const userId = req.user._id;
    const soft = req.query.soft !== "false";

    const user = await User.findById(userId);
    if (!user) {
      return handleHttpError(res, "Usuario no encontrado", 404);
    }

    if (soft) {
      await user.delete();
      res.json({ message: "Usuario eliminado (soft delete)" });
    } else {
      const result = await User.deleteOne({ _id: userId });
      if (!result.deletedCount) {
        return handleHttpError(res, "Usuario no encontrado", 404);
      }
      res.json({ message: "Usuario eliminado (hard delete)" });
    }
  } catch (error) {
    console.error(error);
    handleHttpError(res, "Error interno del servidor", 500);
  }
};

/* ======================================================================================
 *  INVITAR USUARIO
 *  --------------------------------------------------------------------------------------
 *  • Crea un usuario con role “guest” que hereda company del invitador
 *  • Genera contraseña temporal para enviar por email (devuelta aquí en claro)
 * ==================================================================================== */
const inviteUser = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    handleHttpError(res, "El email es obligatorio", 400);
    return;
  }

  try {
    const inviter = await User.findById(req.user._id);
    if (!inviter) {
      handleHttpError(res, "Invitador no encontrado", 404);
      return;
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      handleHttpError(res, "El usuario ya existe", 409);
      return;
    }

    const tempPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await encrypt(tempPassword);

    const newUser = new User({
      email,
      password: hashedPassword,
      role: "guest",
      companyOwner: inviter._id,
    });

    await newUser.save();
    res.json({ message: "Usuario invitado correctamente", tempPassword });
  } catch (error) {
    console.error(error);
    handleHttpError(res, "Error interno del servidor", 500);
  }
};

/* ======================================================================================
 *  SOLICITAR RECUPERACIÓN DE CONTRASEÑA
 *  --------------------------------------------------------------------------------------
 *  1) Genera un código de 6 dígitos y lo guarda en passwordRecoveryCode
 *  2) Crea un JWT especial con flag recover y lo devuelve (o se enviaría por email)
 * ==================================================================================== */
const requestPasswordRecovery = async (req, res) => {
  const data = matchedData(req);
  const { email } = data;
  try {
    const user = await User.findOne({ email });
    if (!user) return handleHttpError(res, "Usuario no encontrado", 404);

    const recoveryCode = generateVerificationCode();
    user.passwordRecoveryCode = recoveryCode;
    await user.save();

    const recoveryToken = await tokenSignRecovery(user);
    res.json({
      message: "Código de recuperación enviado",
      recoveryToken,
    });
  } catch (error) {
    console.error(error);
    handleHttpError(res, "Error interno del servidor", 500);
  }
};

/* ======================================================================================
 *  RESETEAR CONTRASEÑA
 *  --------------------------------------------------------------------------------------
 *  • Protegido por middleware authRecovery (token con recover=true)
 *  • Valida el code vs passwordRecoveryCode
 *  • Hashea la nueva contraseña y limpia el código
 * ==================================================================================== */
const resetPassword = async (req, res) => {
  const data = matchedData(req);
  const { code, newPassword } = data;
  try {
    const user = await User.findById(req.user._id);
    if (!user) return handleHttpError(res, "Usuario no encontrado", 404);

    if (user.passwordRecoveryCode !== code) {
      return handleHttpError(res, "Código incorrecto", 400);
    }

    const hashedPassword = await encrypt(newPassword);
    user.password = hashedPassword;
    user.passwordRecoveryCode = ""; // limpia código
    await user.save();
    res.json({ message: "Contraseña actualizada correctamente" });
  } catch (error) {
    console.error(error);
    handleHttpError(res, "Error interno del servidor", 500);
  }
};

/* ======================================================================================
 *  EXPORTS
 * ==================================================================================== */
module.exports = {
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
};
