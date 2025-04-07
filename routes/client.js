const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const {
  validateClient,
  validateClientUpdate,
} = require("../validators/clientValidator");

const {
  createClient,
  getClients,
  getClientById,
  updateClient,
  softDeleteClient,
  hardDeleteClient,
  getArchivedClients,
  recoverClient,
} = require("../controllers/clientController");

// Obtener todos los clientes del usuario o su empresa
router.get("/", auth, getClients);

// Crear un cliente
router.post("/", auth, validateClient, createClient);

// Obtener todos los clientes archivados
router.get("/archive", auth, getArchivedClients);

// Obtener un cliente por ID
router.get("/:id", auth, getClientById);

// Actualizar cliente
router.put("/:id", auth, validateClientUpdate, updateClient);

// Eliminar cliente (hard delete)
router.delete("/:id", auth, hardDeleteClient);

// Archivar cliente (soft delete)
router.delete("/archive/:id", auth, softDeleteClient);

// Restaurar cliente archivado
router.patch("/restore/:id", auth, recoverClient);

module.exports = router;
