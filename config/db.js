/****************************************************************************************
 *  dbConnect
 *  --------------------------------------------------------------------------------------
 *  -> Conecta a la base de datos MongoDB usando mongoose.connect()
 *  -> Respeta variable de entorno MONGODB_URI
 *  -> En entorno de tests (NODE_ENV==="test") no se conecta, evitando dependencias
 *  -> Usa mongoose.set("strictQuery", false) para permitir filtros no estrictos
 *  -> Sale del proceso con código 1 si la conexión falla (evita app zombie)
 ****************************************************************************************/

const mongoose = require("mongoose");

const dbConnect = async () => {
  if (process.env.NODE_ENV === "test") {
    // Entorno de pruebas -> saltar conexión real
    return;
  }

  const db_uri = process.env.MONGODB_URI;

  // strictQuery=false: habilita consultas con campos no definidos en el esquema
  mongoose.set("strictQuery", false);

  try {
    await mongoose.connect(db_uri); // Conexión principal
    console.log("Conectado a la BBDD");
  } catch (error) {
    console.error(`Error conectando a la BD: ${error}`);
    process.exit(1); // Finaliza la aplicación si no hay DB
  }
};

module.exports = dbConnect;
