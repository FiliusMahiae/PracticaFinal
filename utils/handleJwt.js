const jwt = require("jsonwebtoken");

const tokenSign = async (user) => {
  const sign = jwt.sign(
    {
      _id: user._id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: "2h" }
  );
  return sign;
};

const verifyToken = async (tokenJwt) => {
  try {
    return jwt.verify(tokenJwt, process.env.JWT_SECRET);
  } catch (err) {
    throw new Error("Token inválido");
  }
};

const tokenSignRecovery = async (user) => {
  const sign = jwt.sign(
    {
      _id: user._id,
      recover: true,
    },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );
  return sign;
};

module.exports = { tokenSign, verifyToken, tokenSignRecovery };
