// middlewares/auth.js
const { verifyToken } = require("../utils/handleJwt");

const auth = async (req, res, next) => {
  try {
    // Se espera el token en el header: Authorization: Bearer <token>
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Token no proporcionado" });
    }
    const decoded = await verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Token inválido" });
  }
};

module.exports = auth;
