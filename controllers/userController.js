// controllers/userController.js
const User = require("../models/User");
const { encrypt, compare } = require("../utils/handlePassword");
const { tokenSign } = require("../utils/handleJwt");
const { handleHttpError } = require("../utils/handleError");
const uploadToPinata = require("../utils/handleUploadIPFS");
const { tokenSignRecovery } = require("../utils/handleJwt");

function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const register = async (req, res) => {
  const { email, password } = req.body;
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
    });
    await user.save();
    const token = await tokenSign(user);
    return res.json({
      token,
      user: {
        _id: user._id,
        email: user.email,
        status: user.status,
        role: user.role,
      },
    });
  } catch (error) {
    console.error(error);
    return handleHttpError(res, "Error interno del servidor", 500);
  }
};

const validateEmail = async (req, res) => {
  const { code } = req.body;
  const userId = req.user._id;
  try {
    const user = await User.findById(userId);
    if (!user) {
      return handleHttpError(res, "Usuario no encontrado", 404);
    }
    if (user.verificationCode === code) {
      user.status = 1; // Usuario validado
      user.verificationCode = null; // Opcional: limpiar el código
      await user.save();
      return res.json({ message: "Email validado correctamente" });
    } else {
      // Código incorrecto: decrementa los intentos
      if (user.attempts > 0) {
        user.attempts = user.attempts - 1;
      }
      await user.save();
      if (user.attempts <= 0) {
        return handleHttpError(res, "Número máximo de intentos alcanzado", 403);
      }
      return handleHttpError(
        res,
        `Código inválido. Quedan ${user.attempts} intentos`,
        400
      );
    }
  } catch (error) {
    console.error(error);
    return handleHttpError(res, "Error interno del servidor", 500);
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;
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
    return res.json({
      token,
      user: {
        _id: user._id,
        email: user.email,
        status: user.status,
        role: user.role,
      },
    });
  } catch (error) {
    console.error(error);
    return handleHttpError(res, "Error interno del servidor", 500);
  }
};

const updatePersonalData = async (req, res) => {
  const { nombre, apellidos, nif, address } = req.body;
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

    return res.json({
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
    return handleHttpError(res, "Error interno del servidor", 500);
  }
};

const updateCompanyData = async (req, res) => {
  const { companyName, cif, street, number, postal, city, province } = req.body;

  const userId = req.user._id;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return handleHttpError(res, "Usuario no encontrado", 404);
    }

    if (user.role === "autonomo") {
      user.company = {
        name: `${user.name || ""} ${user.surnames || ""}`.trim(),
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

    return res.json({
      message: "Datos de la compañía actualizados correctamente",
      company: user.company,
    });
  } catch (error) {
    console.error(error);
    return handleHttpError(res, "Error interno del servidor", 500);
  }
};

const updateLogo = async (req, res) => {
  try {
    const userId = req.user._id; // Obtenemos el usuario del token
    if (!req.file) {
      return handleHttpError(res, "No se ha proporcionado ninguna imagen", 400);
    }
    const fileBuffer = req.file.buffer;
    const fileName = req.file.originalname;
    const pinataResponse = await uploadToPinata(fileBuffer, fileName);
    const ipfsFile = pinataResponse.IpfsHash;
    const ipfs = `https://${process.env.PINATA_GATEWAY_URL}/ipfs/${ipfsFile}`;
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { logo: ipfs },
      { new: true }
    );
    return res.json({
      message: "Logo actualizado correctamente",
      logo: updatedUser.logo,
    });
  } catch (err) {
    console.error(err);
    return handleHttpError(res, "ERROR_UPLOAD_LOGO", 500);
  }
};

// GET: Obtener datos del usuario a partir del token JWT
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return handleHttpError(res, "Usuario no encontrado", 404);
    return res.json({ user });
  } catch (error) {
    console.error(error);
    return handleHttpError(res, "Error interno del servidor", 500);
  }
};

// DELETE: Eliminar usuario (soft por defecto, hard si query soft=false)
const deleteUser = async (req, res) => {
  try {
    const userId = req.user._id;
    // Por defecto se asume soft delete. Si el query "soft" es igual a "false", se hace hard delete.
    const soft = req.query.soft !== "false";
    let result;
    if (soft) {
      // Soft delete usando el método "delete" proporcionado por mongoose-delete
      result = await User.delete({ _id: userId });
      // Si result no es válido, consideramos que no se encontró el usuario
      if (!result) {
        return handleHttpError(res, "Usuario no encontrado", 404);
      }
      return res.json({ message: "Usuario eliminado (soft delete)" });
    } else {
      // Hard delete: borramos físicamente el documento con deleteOne
      result = await User.deleteOne({ _id: userId });
      // result.deletedCount indica si se borró algún documento
      if (!result.deletedCount) {
        return handleHttpError(res, "Usuario no encontrado", 404);
      }
      return res.json({ message: "Usuario eliminado (hard delete)" });
    }
  } catch (error) {
    console.error(error);
    return handleHttpError(res, "Error interno del servidor", 500);
  }
};

// POST: Invitar a otros compañeros (crea usuario con role "guest")
const inviteUser = async (req, res) => {
  const { email } = req.body;
  if (!email) return handleHttpError(res, "El email es obligatorio", 400);
  try {
    const inviter = await User.findById(req.user._id);
    if (!inviter) return handleHttpError(res, "Invitador no encontrado", 404);
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return handleHttpError(res, "El usuario ya existe", 409);
    }
    // Generamos una contraseña temporal
    const tempPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await encrypt(tempPassword);
    const newUser = new User({
      email,
      password: hashedPassword,
      role: "guest",
      // Copiamos los datos de compañía del usuario que invita
      companyName: inviter.companyName,
      cif: inviter.cif,
      direccion: inviter.direccion,
    });
    await newUser.save();
    return res.json({
      message: "Usuario invitado correctamente",
      tempPassword,
    });
  } catch (error) {
    console.error(error);
    return handleHttpError(res, "Error interno del servidor", 500);
  }
};

// Solicitar recuperación de contraseña: se genera un código y se crea un token de recuperación
const requestPasswordRecovery = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return handleHttpError(res, "Usuario no encontrado", 404);
    const recoveryCode = generateVerificationCode();
    user.passwordRecoveryCode = recoveryCode;
    await user.save();
    // Generar token de recuperación usando la función especializada
    const recoveryToken = await tokenSignRecovery(user);
    // En producción se enviaría el código por email; para pruebas lo retornamos en la respuesta
    return res.json({
      message: "Código de recuperación enviado",
      recoveryToken,
    });
  } catch (error) {
    console.error(error);
    return handleHttpError(res, "Error interno del servidor", 500);
  }
};

// Resetear contraseña usando el token de recuperación y el código enviado
const resetPassword = async (req, res) => {
  const { code, newPassword } = req.body;
  try {
    const user = await User.findById(req.user._id); // req.user se establece en authRecovery
    if (!user) return handleHttpError(res, "Usuario no encontrado", 404);
    if (user.passwordRecoveryCode !== code) {
      return handleHttpError(res, "Código incorrecto", 400);
    }
    const hashedPassword = await encrypt(newPassword);
    user.password = hashedPassword;
    user.passwordRecoveryCode = ""; // Limpiar el código de recuperación
    await user.save();
    return res.json({ message: "Contraseña actualizada correctamente" });
  } catch (error) {
    console.error(error);
    return handleHttpError(res, "Error interno del servidor", 500);
  }
};

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
