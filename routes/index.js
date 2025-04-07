const express = require("express");
const fs = require("fs");

const router = express.Router();
const removeExtension = (fileName) => fileName.split(".").shift();

// Lee todos los archivos en el directorio de rutas y los monta
fs.readdirSync(__dirname).forEach((file) => {
  const name = removeExtension(file);
  if (name !== "index") {
    // Se monta la ruta con el nombre del archivo, por ejemplo: /user
    router.use("/" + name, require("./" + name));
  }
});

module.exports = router;
