require("dotenv").config();

const express = require("express");
const dbConnect = require("./config/db");
const loggerStream = require("./utils/handleLogger");
const morganBody = require("morgan-body");

const app = express();

morganBody(app, {
  noColors: true,
  skip: function (req, res) {
    return res.statusCode < 400;
  },
  stream: loggerStream,
});

//Manejo de cors
app.use(cors());

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
