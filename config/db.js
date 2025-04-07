const mongoose = require("mongoose");

const dbConnect = async () => {
  const db_uri = process.env.MONGODB_URI;
  mongoose.set("strictQuery", false);
  try {
    await mongoose.connect(db_uri);
    console.log("Conectado a la BBDD");
  } catch (error) {
    console.error(`Error conectando a la BD: ${error}`);
    process.exit(1);
  }
};

module.exports = dbConnect;
