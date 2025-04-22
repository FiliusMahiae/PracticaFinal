// Ruteador dinámico -> detecta todos los ficheros de este directorio y los
// expone como sub‑rutas con su nombre de archivo.
//
// Ejemplo:
//   auth.js     -> /auth
//   projects.js -> /projects
//
const express = require("express");
const fs = require("fs");

const router = express.Router();

// removeExtension("users.js") -> "users"
const removeExtension = (fileName) => fileName.split(".").shift();

// Recorre todos los archivos dentro del directorio actual (__dirname)
// y monta aquellos que no sean index.js
fs.readdirSync(__dirname).forEach((file) => {
  const name = removeExtension(file);
  if (name !== "index") {
    // Monta la ruta base '/<nombreArchivo>' y delega en el router correspondiente
    router.use("/" + name, require("./" + name));
  }
});

module.exports = router;
