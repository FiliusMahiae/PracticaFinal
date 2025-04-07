const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { validateClient } = require("../validators/clientValidator");
const {
  createClient,
  updateClient,
  getClients,
  getClientById,
} = require("../controllers/clientController");

// Crear cliente
router.post("/", auth, validateClient, createClient);

// Actualizar cliente
router.put("/:id", auth, validateClient, updateClient);

// Obtener todos los clientes del usuario o su empresa
router.get("/", auth, getClients);

// Obtener un cliente por ID
router.get("/:id", auth, getClientById);

module.exports = router;
