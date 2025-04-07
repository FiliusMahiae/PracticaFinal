const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { validateClient } = require("../validators/clientValidator");
const {
  createClient,
  updateClient,
} = require("../controllers/clientController");

// Crear cliente
router.post("/", auth, validateClient, createClient);

// Actualizar cliente
router.put("/:id", auth, validateClient, updateClient);

module.exports = router;
