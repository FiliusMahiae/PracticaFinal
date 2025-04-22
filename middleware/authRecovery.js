// middlewares/authRecovery.js
const { verifyToken } = require("../utils/handleJwt");

/**
 * Middleware para enlaces de recuperación de contraseña
 * -> Requiere un token JWT con la marca recover=true
 * -> Responde 403 si el token no es de recuperación
 */
const authRecovery = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Token no proporcionado" });
    }
    const decoded = await verifyToken(token);
    if (!decoded.recover) {
      return res.status(403).json({ error: "Token no es de recuperación" });
    }
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Token inválido" });
  }
};

module.exports = authRecovery;
