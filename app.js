require("dotenv").config();
const express = require("express");
const dbConnect = require("./config/db");

const app = express();

// Middleware para parsear JSON
app.use(express.json());

// Montar las rutas dinámicas bajo el prefijo /api
app.use("/api", require("./routes"));

// Conectar a la BBDD y arrancar el servidor
dbConnect().then(() => {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
  });
});
