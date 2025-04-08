require("dotenv").config();

const express = require("express");
const cors = require("cors");
const dbConnect = require("./config/db");
const loggerStream = require("./utils/handleLogger");
const morganBody = require("morgan-body");

const app = express();

// Middleware de logs para errores
morganBody(app, {
  noColors: true,
  skip: function (req, res) {
    return res.statusCode < 400;
  },
  stream: loggerStream,
});

// Manejo de CORS
app.use(cors());

// Middleware para parsear JSON
app.use(express.json());

// Montar las rutas dinámicas bajo el prefijo /api
app.use("/api", require("./routes"));

let server;

dbConnect().then(() => {
  const PORT = process.env.PORT || 3000;
  if (process.env.NODE_ENV !== "test") {
    server = app.listen(PORT, () => {
      console.log(`Servidor escuchando en el puerto ${PORT}`);
    });
  }
});

module.exports = { app, server };
