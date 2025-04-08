const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { validateDeliveryNote } = require("../validators/deliveryNoteValidator");
const {
  createDeliveryNote,
  getDeliveryNotes,
  getDeliveryNoteById,
  getDeliveryNotePdf,
  deleteDeliveryNote,
} = require("../controllers/deliveryNoteController");

// Crear albarán (simple o múltiple)
router.post("/", auth, validateDeliveryNote, createDeliveryNote);

//Recoger todos los albaranes
router.get("/", auth, getDeliveryNotes);

//Recoger un solo albaran
router.get("/:id", auth, getDeliveryNoteById);

//Crear PDF
router.get("/pdf/:id", auth, getDeliveryNotePdf);

//Borrar albaran
router.delete("/:id", auth, deleteDeliveryNote);

module.exports = router;
