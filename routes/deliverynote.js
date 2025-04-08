const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { validateDeliveryNote } = require("../validators/deliveryNoteValidator");
const {
  createDeliveryNote,
  getDeliveryNotes,
} = require("../controllers/deliveryNoteController");

// Crear albarán (simple o múltiple)
router.post("/", auth, validateDeliveryNote, createDeliveryNote);

//Recoger todos los albaranes
router.get("/", auth, getDeliveryNotes);

module.exports = router;
