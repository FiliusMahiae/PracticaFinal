// middlewares/auth.js
const { verifyToken } = require("../utils/handleJwt");

/**
 * Middleware de autenticación JWT
 * -> Extrae el token Bearer del encabezado Authorization
 * -> Verifica y decodifica con verifyToken()
 * -> Adjunta el payload a req.user
 * -> Responde 401 si falta o es inválido
 */
const auth = async (req, res, next) => {
  try {
    // Authorization: Bearer <token>
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Token no proporcionado" });
    }
    const decoded = await verifyToken(token);
    req.user = decoded; // payload disponible para los siguientes handlers
    next();
  } catch (error) {
    return res.status(401).json({ error: "Token inválido" });
  }
};

module.exports = auth;
