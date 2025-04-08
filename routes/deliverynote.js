const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { validateDeliveryNote } = require("../validators/deliveryNoteValidator");
const { createDeliveryNote } = require("../controllers/deliveryNoteController");

// Crear albarán (simple o múltiple)
router.post("/", auth, validateDeliveryNote, createDeliveryNote);

module.exports = router;
