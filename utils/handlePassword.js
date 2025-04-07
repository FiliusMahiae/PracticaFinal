const bcryptjs = require("bcryptjs");

const encrypt = async (clearPassword) => {
  // En criptografía, el "salt" aporta aleatoriedad al hash.
  const hash = await bcryptjs.hash(clearPassword, 10);
  return hash;
};

const compare = async (clearPassword, hashedPassword) => {
  // Compara la password en claro con su hash.
  const result = await bcryptjs.compare(clearPassword, hashedPassword);
  return result;
};

module.exports = { encrypt, compare };
